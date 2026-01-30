package com.aivle0102.bigproject.service;

import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import com.aivle0102.bigproject.client.OpenAiClient;
import com.aivle0102.bigproject.dto.ReportRequest;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class AiReportService {

    @Value("${openai.model}")
    private String model;
    private final OpenAiClient openAiClient;
    private final ObjectMapper objectMapper = new ObjectMapper();
    private static final List<String> REPORT_SECTION_ORDER = List.of(
            "executiveSummary",
            "marketSnapshot",
            "riskAssessment",
            "swot",
            "conceptIdeas",
            "kpis",
            "nextSteps"
    );

    public Map<String, Object> generateReport(ReportRequest req) {
        String prompt = buildPrompt(req);

        Map<String, Object> body = Map.of(
                "model", model,
                "messages", List.of(
                        Map.of("role", "system", "content",
                                "You are a global food/recipe business analyst. Respond only in Korean."),
                        Map.of("role", "user", "content", prompt)
                ),
                "temperature", 0.4
        );

        String content = openAiClient.chatCompletion(body);
        return parseJson(content);
    }

    public String generateSummary(String fullReport) {
        String prompt = buildSummaryPrompt(fullReport);

        Map<String, Object> body = Map.of(
                "model", model,
                "messages", List.of(
                        Map.of("role", "system", "content",
                                "You are a global food/recipe business analyst. Respond only in Korean."),
                        Map.of("role", "user", "content", prompt)
                ),
                "temperature", 0.4
        );

        return openAiClient.chatCompletion(body);
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
            throw new IllegalStateException("AI가 반환한 리포트 JSON이 유효하지 않습니다: " + content, e);
        }
    }

    private String buildPrompt(ReportRequest r) {
        String schema = buildSchema(r.getSections());
        return """
        ??? ??? ?? ?? ?? ??????.
        ?? ??? ???? ?? ?? ?? ???? JSON?? ?????.
        ?? ???? ???? ?????.
        ??? JSON? ?????. ?????? ??? ???? ???.

        ??? ???:
        %s

        ?? ??:
        - targetCountry: %s
        - targetPersona: %s
        - priceRange: %s

        JSON ???(?? ?? ??, ??? ? ??? ?? ? ?? ??):
        {
%s
        }
        """
        .formatted(
                r.getRecipe(),
                r.getTargetCountry(),
                r.getTargetPersona(),
                r.getPriceRange(),
                schema
        );
    }

    private String buildSchema(List<String> sections) {
        List<String> requested = sections == null || sections.isEmpty()
                ? REPORT_SECTION_ORDER
                : sections.stream()
                    .map(String::trim)
                    .filter(s -> !s.isBlank())
                    .filter(REPORT_SECTION_ORDER::contains)
                    .toList();
        if (requested.isEmpty()) {
            requested = REPORT_SECTION_ORDER;
        }
        return requested.stream()
                .map(this::schemaForSection)
                .filter(v -> v != null && !v.isBlank())
                .collect(java.util.stream.Collectors.joining(",\n"));
    }

    private String schemaForSection(String key) {
        return switch (key) {
            case "executiveSummary" -> """
          "executiveSummary": {
            "decision": "?? | ?? | ??? ??",
            "marketFitScore": "0-100",
            "keyPros": ["..."],
            "topRisks": ["..."],
            "successProbability": "0-100%%? ??? ??",
            "recommendation": "..."
          }""";
            case "marketSnapshot" -> """
          "marketSnapshot": {
            "personaNeeds": {
              "needs": "...",
              "purchaseDrivers": "...",
              "barriers": "..."
            },
            "trendSignals": {
              "trendNotes": ["..."],
              "priceRangeNotes": "...",
              "channelSignals": "..."
            },
            "competition": {
              "localCompetitors": "...",
              "differentiation": "..."
            }
          }""";
            case "riskAssessment" -> """
          "riskAssessment": {
            "riskList": ["..."],
            "mitigations": ["..."]
          }""";
            case "swot" -> """
          "swot": {
            "strengths": ["..."],
            "weaknesses": ["..."],
            "opportunities": ["..."],
            "threats": ["..."]
          }""";
            case "conceptIdeas" -> """
          "conceptIdeas": [
            {
              "name": "...",
              "scamperFocus": "...",
              "positioning": "...",
              "expectedEffect": "...",
              "risks": "..."
            }
          ]""";
            case "kpis" -> """
          "kpis": [
            {
              "name": "...",
              "target": "...",
              "method": "...",
              "insight": "..."
            }
          ]""";
            case "nextSteps" -> """
          "nextSteps": ["..."]""";
            default -> null;
        };
    }

    private String buildSummaryPrompt(String fullReport) {
        return """
        Write a one-page executive summary in Korean based on the report JSON below.
        Include market opportunity, key risks, expected impact, and recommended next steps.
        Output only Korean prose or bullet points. Do NOT include JSON, keys, code fences, or arrays.

        Report JSON:
        %s

        """
        .formatted(fullReport);
    }
}
