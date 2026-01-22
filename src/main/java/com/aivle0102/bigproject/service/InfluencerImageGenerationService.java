package com.aivle0102.bigproject.service;

import com.aivle0102.bigproject.dto.ImageGenerateRequest;
import com.aivle0102.bigproject.dto.ImageGenerateResponse;
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

import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.List;
import java.util.Map;

@Service
public class InfluencerImageGenerationService {

    private final WebClient openAiImageWebClient;

    @Value("${openai.image-model}")
    private String imageModel;

    public InfluencerImageGenerationService(
            @Qualifier("openAiImageWebClient") WebClient openAiImageWebClient
    ) {
        this.openAiImageWebClient = openAiImageWebClient;
    }

    public ImageGenerateResponse generate(ImageGenerateRequest req) {
        byte[] baseImage = downloadAndValidateImage(req.getInfluencerImageUrl());

        MultiValueMap<String, Object> form = new LinkedMultiValueMap<>();
        form.add("model", imageModel);
        form.add("prompt", buildPrompt(req));

        form.add("image", new ByteArrayResource(baseImage) {
            @Override public String getFilename() { return "influencer.png"; }
        });

        // size: GPT 이미지 모델은 1024x1024/1536x1024/1024x1536/auto 지원 :contentReference[oaicite:3]{index=3}
        form.add("size", "1024x1024");

        // GPT 이미지 모델이면 response_format을 보내면 안 됨 (항상 b64_json 반환) :contentReference[oaicite:4]{index=4}
        boolean isGptImageModel = imageModel != null && imageModel.startsWith("gpt-image-");
        if (!isGptImageModel) {
            // dall-e-2를 쓴다면 아래는 가능 :contentReference[oaicite:5]{index=5}
            form.add("response_format", "b64_json");
        } else {
            // GPT 모델 전용: output_format 사용 가능(png/jpeg/webp) :contentReference[oaicite:6]{index=6}
            form.add("output_format", "png");
        }

        Map<String, Object> res;
        try {
            res = openAiImageWebClient.post()
                    .uri("/images/edits")
                    .contentType(MediaType.MULTIPART_FORM_DATA)
                    .body(BodyInserters.fromMultipartData(form))
                    .retrieve()
                    .bodyToMono(Map.class)
                    .block();
        } catch (WebClientResponseException e) {
            String body = e.getResponseBodyAsString();
            throw new RuntimeException("OpenAI images/edits failed: " + e.getStatusCode() + " body=" + body, e);
        }

        // OpenAI Images 응답: { data: [ { b64_json: "..." } ], ... } :contentReference[oaicite:7]{index=7}
        String b64 = extractB64(res);
        return new ImageGenerateResponse(
                b64,
                "참고용 이미지입니다. 실제 인플루언서 초상권, 저작권 및 상업적 사용 가능 여부는 별도 검증이 필요합니다."
        );

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

    private String buildPrompt(ImageGenerateRequest req) {
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

    private String safe(String s) {
        return s == null ? "" : s;
    }

    private byte[] downloadAndValidateImage(String url) {
        byte[] bytes = downloadImage(url);

        if (bytes == null || bytes.length < 2000) {
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
}
