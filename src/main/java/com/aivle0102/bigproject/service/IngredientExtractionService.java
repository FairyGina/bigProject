package com.aivle0102.bigproject.service;

import com.aivle0102.bigproject.client.OpenAiClient;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class IngredientExtractionService {

    private final OpenAiClient openAiClient;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Value("${openai.model:gpt-4.1-mini}")
    private String model;

    public List<String> extractFromSteps(List<String> steps) {
        String stepsText = (steps == null || steps.isEmpty()) ? "" : String.join("\n", steps);
        if (stepsText.isBlank()) {
            return List.of();
        }

        String prompt = buildPrompt(stepsText);

        Map<String, Object> body = Map.of(
                "model", model,
                "messages", List.of(
                        Map.of("role", "system", "content",
                                "당신은 요리 레시피에서 재료를 추출하는 도우미입니다."),
                        Map.of("role", "user", "content", prompt)
                ),
                "temperature", 0.2
        );

        String content = openAiClient.chatCompletion(body);
        return postProcess(parseJsonArray(content));
    }

    private String buildPrompt(String stepsText) {
        return """
조리 단계에서 실제로 사용된 재료와 용량을 추출하세요.
반환 형식은 JSON 배열이며, 각 항목은 문자열입니다.
한국어로 작성하세요. 설명, 마크다운, 추가 텍스트 없이 배열만 반환하세요.

조리 단계:
%s
"""
                .formatted(stepsText);
    }

    private List<String> parseJsonArray(String content) {
        if (content == null || content.isBlank()) {
            return List.of();
        }
        String trimmed = content.trim();
        String json = trimmed;
        if (trimmed.startsWith("```")) {
            json = trimmed.replaceFirst("^```[a-zA-Z]*\\s*", "");
            json = json.replaceFirst("\\s*```$", "");
        }
        int start = json.indexOf('[');
        int end = json.lastIndexOf(']');
        if (start >= 0 && end > start) {
            json = json.substring(start, end + 1);
        }
        try {
            JsonNode node = objectMapper.readTree(json);
            if (!node.isArray()) {
                return List.of();
            }
            List<String> out = new ArrayList<>();
            for (JsonNode n : node) {
                if (n.isTextual()) {
                    String v = n.asText().trim();
                    if (!v.isEmpty()) {
                        out.add(v);
                    }
                }
            }
            return out;
        } catch (Exception e) {
            return List.of();
        }
    }

    private List<String> postProcess(List<String> raw) {
        if (raw == null || raw.isEmpty()) {
            return List.of();
        }
        Set<String> seen = new LinkedHashSet<>();
        List<String> out = new ArrayList<>();
        for (String v : raw) {
            if (v == null) {
                continue;
            }
            String cleaned = v.trim();
            if (cleaned.isEmpty()) {
                continue;
            }
            String key = cleaned.toLowerCase(Locale.ROOT);
            if (seen.add(key)) {
                out.add(cleaned);
            }
        }
        return out;
    }
}
