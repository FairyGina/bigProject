package com.aivle0102.bigproject.service;

import com.aivle0102.bigproject.dto.ImageGenerateRequest;
import com.aivle0102.bigproject.dto.ImageGenerateResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.MediaType;
import org.springframework.http.client.reactive.ReactorClientHttpConnector;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.reactive.function.BodyInserters;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;
import reactor.netty.http.client.HttpClient;

import java.util.Base64;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class InfluencerImageGenerationService {

    private static final Logger log = LoggerFactory.getLogger(InfluencerImageGenerationService.class);

    private final WebClient openAiImageWebClient;

    @Value("${openai.image-model}")
    private String imageModel;

    public InfluencerImageGenerationService(
            @Qualifier("openAiImageWebClient") WebClient openAiImageWebClient
    ) {
        this.openAiImageWebClient = openAiImageWebClient;
    }

    public ImageGenerateResponse generate(ImageGenerateRequest req) {
        if (req == null) {
            return new ImageGenerateResponse("", "Request is empty");
        }
        byte[] baseImage = null;
        String baseImageError = null;
        try {
            baseImage = downloadAndValidateImage(req.getInfluencerImageUrl());
        } catch (RuntimeException e) {
            baseImageError = e.getMessage();
            log.warn("Base image download/validation failed: {}", baseImageError);
        }

        if (baseImage != null) {
            try {
                return generateWithEdit(baseImage, req);
            } catch (RuntimeException e) {
                log.warn("OpenAI images/edits failed, falling back to prompt-only generation: {}", e.getMessage());
            }
        }

        return generateFromPrompt(req, baseImageError);
    }

    private ImageGenerateResponse generateWithEdit(byte[] baseImage, ImageGenerateRequest req) {
        MultiValueMap<String, Object> form = new LinkedMultiValueMap<>();
        form.add("model", imageModel);
        form.add("prompt", buildEditPrompt(req));

        form.add("image", new ByteArrayResource(baseImage) {
            @Override public String getFilename() { return "influencer.png"; }
        });

        // size: GPT ????? ????? 1024x1024/1536x1024/1024x1536/auto ????:contentReference[oaicite:3]{index=3}
        form.add("size", "1024x1024");

        // GPT ????? ?????? response_format???????????(??? b64_json ???) :contentReference[oaicite:4]{index=4}
        boolean isGptImageModel = imageModel != null && imageModel.startsWith("gpt-image-");
        if (!isGptImageModel) {
            // dall-e-2????????????????:contentReference[oaicite:5]{index=5}
            form.add("response_format", "b64_json");
        } else {
            // GPT ??? ???: output_format ??? ????png/jpeg/webp) :contentReference[oaicite:6]{index=6}
            form.add("output_format", "png");
        }

        Map<String, Object> res = openAiImageWebClient.post()
                .uri("/images/edits")
                .contentType(MediaType.MULTIPART_FORM_DATA)
                .body(BodyInserters.fromMultipartData(form))
                .retrieve()
                .bodyToMono(Map.class)
                .block();

        // OpenAI Images ???: { data: [ { b64_json: "..." } ], ... } :contentReference[oaicite:7]{index=7}
        String b64 = extractB64(res);
        return new ImageGenerateResponse(
                b64,
                "??????????????? ??? ????????????? ????? ?????????? ???????????? ????? ????????"
        );
    }

    private ImageGenerateResponse generateFromPrompt(ImageGenerateRequest req, String baseImageError) {
        boolean isGptImageModel = imageModel != null && imageModel.startsWith("gpt-image-");
        Map<String, Object> body = new HashMap<>();
        body.put("model", imageModel);
        body.put("prompt", buildGenerationPrompt(req));
        body.put("size", "1024x1024");
        if (!isGptImageModel) {
            body.put("response_format", "b64_json");
        } else {
            body.put("output_format", "png");
        }

        Map<String, Object> res;
        try {
            res = openAiImageWebClient.post()
                    .uri("/images/generations")
                    .contentType(MediaType.APPLICATION_JSON)
                    .bodyValue(body)
                    .retrieve()
                    .bodyToMono(Map.class)
                    .block();
        } catch (WebClientResponseException e) {
            String bodyText = e.getResponseBodyAsString();
            return new ImageGenerateResponse(
                    "",
                    "OpenAI images/generations failed: " + e.getStatusCode() + " body=" + bodyText
            );
        } catch (RuntimeException e) {
            return new ImageGenerateResponse(
                    "",
                    "OpenAI images/generations failed: " + e.getMessage()
            );
        }

        String b64;
        try {
            b64 = extractB64(res);
        } catch (RuntimeException e) {
            return new ImageGenerateResponse(
                    "",
                    "OpenAI response invalid: " + e.getMessage()
            );
        }
        String note = baseImageError == null || baseImageError.isBlank()
                ? "Generated without base image."
                : "Generated without base image (fallback). reason=" + baseImageError;
        return new ImageGenerateResponse(b64, note);
    }

    private String extractB64(Map<String, Object> res) {
        if (res == null) throw new RuntimeException("OpenAI response is null");
        Object dataObj = res.get("data");
        if (!(dataObj instanceof List<?> data) || data.isEmpty()) {
            throw new RuntimeException("OpenAI response missing data: " + res);
        }
        Object first = data.get(0);
        if (!(first instanceof Map<?, ?> firstMap)) {
            throw new RuntimeException("OpenAI response data[0] invalid: " + first);
        }
        Object b64 = firstMap.get("b64_json");
        if (!(b64 instanceof String s) || s.isBlank()) {
            throw new RuntimeException("OpenAI response missing b64_json: " + firstMap);
        }
        return s;
    }

    private String buildEditPrompt(ImageGenerateRequest req) {
        String style = (req.getAdditionalStyle() == null || req.getAdditionalStyle().isBlank())
                ? "clean, natural lighting, realistic"
                : req.getAdditionalStyle();

        return """
                Edit the provided photo.
                Keep the person's identity and face consistent, natural, and photorealistic.
                Add a freshly prepared dish that matches this recipe: %s.
                The person (%s) is holding the finished dish naturally with both hands, smiling slightly.
                Do not add text, logos, or watermarks.
                Style: %s.
                """.formatted(
                safe(req.getRecipe()),
                safe(req.getInfluencerName()),
                style
        );
    }

    private String buildGenerationPrompt(ImageGenerateRequest req) {
        String style = (req.getAdditionalStyle() == null || req.getAdditionalStyle().isBlank())
                ? "clean, natural lighting, realistic"
                : req.getAdditionalStyle();

        return """
                Create a photorealistic portrait of a food influencer.
                The person is holding a freshly prepared dish that matches this recipe: %s.
                Keep the image natural and professional, no text, logos, or watermarks.
                Influencer name reference: %s.
                Style: %s.
                """.formatted(
                safe(req.getRecipe()),
                safe(req.getInfluencerName()),
                style
        );
    }

    private String safe(String s) {
        return s == null ? "" : s;
    }

    private byte[] downloadAndValidateImage(String url) {
        byte[] bytes = downloadImage(url);

        if (bytes == null || bytes.length < 16) {
            throw new RuntimeException("Downloaded image is too small or empty. len=" + (bytes == null ? 0 : bytes.length));
        }

        boolean isJpeg = (bytes[0] & 0xFF) == 0xFF && (bytes[1] & 0xFF) == 0xD8;
        boolean isPng  = (bytes[0] & 0xFF) == 0x89 && bytes[1] == 0x50 && bytes[2] == 0x4E && bytes[3] == 0x47;
        boolean isWebp = bytes.length > 12 && bytes[0] == 'R' && bytes[1] == 'I' && bytes[2] == 'F' && bytes[3] == 'F'
                && bytes[8] == 'W' && bytes[9] == 'E' && bytes[10] == 'B' && bytes[11] == 'P';

        // GPT image edits는 png/webp/jpg 허용 :contentReference[oaicite:8]{index=8}
        if (!isJpeg && !isPng && !isWebp) {
            String head = new String(bytes, 0, Math.min(200, bytes.length), StandardCharsets.UTF_8);
            throw new RuntimeException("Downloaded bytes are not JPG/PNG/WEBP. head=" + head);
        }

        return bytes;
    }

    private byte[] downloadImage(String url) {
        if (url == null || url.isBlank()) {
            throw new IllegalArgumentException("influencerImageUrl is empty");
        }
        if (url.startsWith("data:image/")) {
            return decodeDataUrl(url);
        }

        WebClient dl = WebClient.builder()
                .clientConnector(new ReactorClientHttpConnector(
                        HttpClient.create()
                                .followRedirect(true)
                                .responseTimeout(Duration.ofSeconds(30))
                ))
                .build();

        return dl.get()
                .uri(url)
                .header("User-Agent", "Mozilla/5.0")
                .accept(MediaType.ALL)
                .retrieve()
                .bodyToMono(byte[].class)
                .block();
    }

    private byte[] decodeDataUrl(String url) {
        int commaIdx = url.indexOf(",");
        if (commaIdx < 0) {
            throw new IllegalArgumentException("Invalid data URL");
        }
        String meta = url.substring(0, commaIdx);
        String data = url.substring(commaIdx + 1);
        if (!meta.contains(";base64")) {
            throw new IllegalArgumentException("Data URL is not base64");
        }
        return Base64.getDecoder().decode(data);
    }
}
