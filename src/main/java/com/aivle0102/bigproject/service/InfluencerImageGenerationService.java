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
            return new ImageGenerateResponse("", "요청이 비어있습니다");
        }
        byte[] baseImage = null;
        String baseImageError = null;
        try {
            baseImage = downloadAndValidateImage(req.getInfluencerImageUrl());
        } catch (RuntimeException e) {
            baseImageError = e.getMessage();
            log.warn("기본 이미지 다운로드/검증에 실패했습니다: {}", baseImageError);
        }

        if (baseImage != null) {
            try {
                return generateWithEdit(baseImage, req);
            } catch (RuntimeException e) {
                log.warn("OpenAI 이미지 편집에 실패해 프롬프트 기반 생성으로 전환합니다: {}", e.getMessage());
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

        // size: GPT 이미지 모델 지원 크기 1024x1024/1536x1024/1024x1536/auto
        form.add("size", "1024x1024");

        // GPT 이미지 모델은 response_format 미지원 (b64_json 대신 output_format 사용)
        boolean isGptImageModel = imageModel != null && imageModel.startsWith("gpt-image-");
        if (!isGptImageModel) {
            // dall-e-2는 response_format=b64_json 필요
            form.add("response_format", "b64_json");
        } else {
            // GPT 이미지 모델: output_format 사용(png/jpeg/webp)
            form.add("output_format", "png");
        }

        Map<String, Object> res = openAiImageWebClient.post()
                .uri("/images/edits")
                .contentType(MediaType.MULTIPART_FORM_DATA)
                .body(BodyInserters.fromMultipartData(form))
                .retrieve()
                .bodyToMono(Map.class)
                .block();

        // OpenAI Images 응답: { data: [ { b64_json: "..." } ], ... }
        String b64 = extractB64(res);
        return new ImageGenerateResponse(
                b64,
                "이미지 생성 완료(기본 이미지 사용)"
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
                    "OpenAI 이미지 생성 요청에 실패했습니다: " + e.getStatusCode() + " body=" + bodyText
            );
        } catch (RuntimeException e) {
            return new ImageGenerateResponse(
                    "",
                    "OpenAI 이미지 생성 요청에 실패했습니다: " + e.getMessage()
            );
        }

        String b64;
        try {
            b64 = extractB64(res);
        } catch (RuntimeException e) {
            return new ImageGenerateResponse(
                    "",
                    "OpenAI 응답이 올바르지 않습니다: " + e.getMessage()
            );
        }
        String note = baseImageError == null || baseImageError.isBlank()
                ? "기본 이미지 없이 생성했습니다."
                : "기본 이미지 없이 생성했습니다(대체 경로). 이유=" + baseImageError;
        return new ImageGenerateResponse(b64, note);
    }

    private String extractB64(Map<String, Object> res) {
        if (res == null) throw new RuntimeException("OpenAI 응답이 null입니다.");
        Object dataObj = res.get("data");
        if (!(dataObj instanceof List<?> data) || data.isEmpty()) {
            throw new RuntimeException("OpenAI 응답에 data가 없습니다: " + res);
        }
        Object first = data.get(0);
        if (!(first instanceof Map<?, ?> firstMap)) {
            throw new RuntimeException("OpenAI 응답 data[0] 형식이 올바르지 않습니다: " + first);
        }
        Object b64 = firstMap.get("b64_json");
        if (!(b64 instanceof String s) || s.isBlank()) {
            throw new RuntimeException("OpenAI 응답에 b64_json이 없습니다: " + firstMap);
        }
        return s;
    }

    private String buildEditPrompt(ImageGenerateRequest req) {
        String style = (req.getAdditionalStyle() == null || req.getAdditionalStyle().isBlank())
                ? "깔끔하고, 자연스럽게, 밝고 따뜻한 톤, 사실적인 스타일"
                : req.getAdditionalStyle();

        return """
                제공된 사진을 편집해 주세요.
                인물의 정체성과 얼굴을 자연스럽고 사실적으로 유지해 주세요.
                다음 레시피와 어울리는 갓 완성된 요리를 추가해 주세요: %s.
                인물(%s)은 완성된 요리를 두 손으로 자연스럽게 들고, 살짝 미소를 짓는 모습으로 해 주세요.
                텍스트, 로고, 워터마크는 넣지 마세요.
                스타일: %s.
                """.formatted(
                safe(req.getRecipe()),
                safe(req.getInfluencerName()),
                style
        );
    }

    private String buildGenerationPrompt(ImageGenerateRequest req) {
        String style = (req.getAdditionalStyle() == null || req.getAdditionalStyle().isBlank())
                ? "깔끔하고, 자연스럽게, 밝고 따뜻한 톤, 사실적인 스타일"
                : req.getAdditionalStyle();

        return """
                푸드 인플루언서의 사실적인 인물 사진을 생성해 주세요.
                인물은 다음 레시피와 어울리는 갓 완성된 요리를 들고 있어야 합니다: %s.
                이미지는 자연스럽고 프로페셔널하게, 텍스트/로고/워터마크 없이 생성해 주세요.
                인플루언서 이름 참고: %s.
                스타일: %s.
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
            throw new RuntimeException("다운로드한 이미지가 비어있거나 너무 작습니다. len=" + (bytes == null ? 0 : bytes.length));
        }

        boolean isJpeg = (bytes[0] & 0xFF) == 0xFF && (bytes[1] & 0xFF) == 0xD8;
        boolean isPng  = (bytes[0] & 0xFF) == 0x89 && bytes[1] == 0x50 && bytes[2] == 0x4E && bytes[3] == 0x47;
        boolean isWebp = bytes.length > 12 && bytes[0] == 'R' && bytes[1] == 'I' && bytes[2] == 'F' && bytes[3] == 'F'
                && bytes[8] == 'W' && bytes[9] == 'E' && bytes[10] == 'B' && bytes[11] == 'P';

        // GPT image edits 지원 포맷: png/webp/jpg
        if (!isJpeg && !isPng && !isWebp) {
            String head = new String(bytes, 0, Math.min(200, bytes.length), StandardCharsets.UTF_8);
            throw new RuntimeException("다운로드한 파일이 JPG/PNG/WEBP 형식이 아닙니다. head=" + head);
        }

        return bytes;
    }

    private byte[] downloadImage(String url) {
        if (url == null || url.isBlank()) {
            throw new IllegalArgumentException("influencerImageUrl이 비어있습니다");
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
            throw new IllegalArgumentException("잘못된 data URL입니다");
        }
        String meta = url.substring(0, commaIdx);
        String data = url.substring(commaIdx + 1);
        if (!meta.contains(";base64")) {
            throw new IllegalArgumentException("Data URL이 base64 형식이 아닙니다");
        }
        return Base64.getDecoder().decode(data);
    }
}


