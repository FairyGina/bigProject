package com.aivle0102.bigproject.service;

import com.aivle0102.bigproject.client.OpenAiClient;
import com.aivle0102.bigproject.dto.RecipeTargetRecommendRequest;
import com.aivle0102.bigproject.dto.RecipeTargetRecommendResponse;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class RecipeTargetRecommendationService {

    private static final List<String> COUNTRY_OPTIONS = List.of(
            "US", "JP", "CN", "FR", "DE", "PL", "IN", "VN", "TH"
    );
    private static final List<String> PERSONA_OPTIONS = List.of(
            "20~30대 직장인, 간편식 선호",
            "30~40대 맞벌이 가정, 건강 중시",
            "10대/20대 학생, 트렌디한 맛 선호",
            "40~50대 가족, 가성비 중시",
            "해외 한식 입문자, 한국 맛 경험",
            "건강/피트니스 관심층, 고단백/저당"
    );
    private static final List<String> PRICE_OPTIONS = List.of(
            "USD 3~5",
            "USD 6~9",
            "USD 10~15",
            "USD 15~20"
    );

    private static final String DEFAULT_COUNTRY = "US";
    private static final String DEFAULT_PERSONA = "20~30대 직장인, 간편식 선호";
    private static final String DEFAULT_PRICE = "USD 6~9";

    private final OpenAiClient openAiClient;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Value("${openai.model:gpt-4.1-mini}")
    private String model;

    public RecipeTargetRecommendResponse recommend(RecipeTargetRecommendRequest request) {
        String prompt = buildPrompt(request);

        Map<String, Object> body = Map.of(
                "model", model,
                "messages", List.of(
                        Map.of("role", "system", "content",
                                "You are a product strategist for global food launches."),
                        Map.of("role", "user", "content", prompt)
                ),
                "temperature", 0.2
        );

        String content = openAiClient.chatCompletion(body);
        Map<String, Object> parsed = parseJson(content);

        String country = normalizeOption(parsed.get("targetCountry"), COUNTRY_OPTIONS, DEFAULT_COUNTRY);
        String persona = normalizeOption(parsed.get("targetPersona"), PERSONA_OPTIONS, DEFAULT_PERSONA);
        String price = normalizeOption(parsed.get("priceRange"), PRICE_OPTIONS, DEFAULT_PRICE);

        return new RecipeTargetRecommendResponse(country, persona, price);
    }

    private String buildPrompt(RecipeTargetRecommendRequest request) {
        String title = safe(request.getTitle());
        String description = safe(request.getDescription());
        String ingredients = (request.getIngredients() == null || request.getIngredients().isEmpty())
                ? ""
                : String.join(", ", request.getIngredients());
        String steps = (request.getSteps() == null || request.getSteps().isEmpty())
                ? ""
                : String.join("\n", request.getSteps());

        return """
다음 레시피 정보를 보고, 아래 선택지에서 가장 적합한 국가/페르소나/가격대를 골라주세요.
반드시 선택지 중 하나만 고르고, JSON만 반환하세요.

[레시피]
제목: %s
소개: %s
재료: %s
조리 단계:
%s

[선택지]
- targetCountry: %s
- targetPersona: %s
- priceRange: %s

[출력 형식]
{
  "targetCountry": "US",
  "targetPersona": "...",
  "priceRange": "USD 6~9"
}
"""
                .formatted(
                        title,
                        description,
                        ingredients,
                        steps,
                        COUNTRY_OPTIONS,
                        PERSONA_OPTIONS,
                        PRICE_OPTIONS
                );
    }

    private Map<String, Object> parseJson(String content) {
        String trimmed = content == null ? "" : content.trim();
        String json = trimmed;
        if (trimmed.startsWith("```")) {
            json = trimmed.replaceFirst("^```[a-zA-Z]*\\s*", "");
            json = json.replaceFirst("\\s*```$", "");
        }
        int start = json.indexOf('{');
        int end = json.lastIndexOf('}');
        if (start >= 0 && end > start) {
            json = json.substring(start, end + 1);
        }
        try {
            return objectMapper.readValue(json, new TypeReference<>() {});
        } catch (Exception e) {
            return Map.of();
        }
    }

    private String normalizeOption(Object raw, List<String> options, String fallback) {
        if (raw == null) {
            return fallback;
        }
        String value = raw.toString().trim();
        if (options.contains(value)) {
            return value;
        }
        return fallback;
    }

    private String safe(String value) {
        return value == null ? "" : value.trim();
    }
}
