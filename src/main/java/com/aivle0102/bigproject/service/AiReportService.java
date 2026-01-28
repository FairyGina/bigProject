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

    public Map<String, Object> generateReport(ReportRequest req) {
        String prompt = buildPrompt(req);

        Map<String, Object> body = Map.of(
                "model", model,
                "messages", List.of(
                        Map.of("role", "system", "content",
                                "당신은 글로벌 식품 제품 전략 분석가입니다."),
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
                                "당신은 글로벌 식품 제품 전략 분석가입니다."),
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
        return """
        당신은 글로벌 식품 제품 전략 분석가입니다.
        아래 레시피 콘셉트에 대한 시장 분석 리포트를 JSON으로 작성하세요.
        모든 텍스트는 한국어로 작성하세요.
        유효한 JSON만 반환하세요. 마크다운이나 설명은 포함하지 마세요.

        레시피 콘셉트:
        %s

        타깃 조건:
        - targetCountry: %s
        - targetPersona: %s
        - priceRange: %s

        JSON 스키마(모든 키는 필수, 모르면 빈 문자열 또는 빈 배열 사용):
        {
          "executiveSummary": {
            "decision": "Go | No-Go | Conditional Go",
            "marketFitScore": "0-100",
            "keyPros": ["..."],
            "topRisks": ["..."],
            "successProbability": "0-100%% with brief rationale",
            "recommendation": "..."
          },
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
          },
          "riskAssessment": {
            "riskList": ["..."],
            "mitigations": ["..."]
          },
          "swot": {
            "strengths": ["..."],
            "weaknesses": ["..."],
            "opportunities": ["..."],
            "threats": ["..."]
          },
          "conceptIdeas": [
            {
              "name": "...",
              "scamperFocus": "...",
              "positioning": "...",
              "expectedEffect": "...",
              "risks": "..."
            }
          ],
          "kpis": [
            {
              "name": "...",
              "target": "...",
              "method": "...",
              "insight": "..."
            }
          ],
          "nextSteps": ["..."]
        }
        """
        .formatted(
                r.getRecipe(),
                r.getTargetCountry(),
                r.getTargetPersona(),
                r.getPriceRange()
        );
    }

    private String buildSummaryPrompt(String fullReport) {
        return """
        다음 리포트 JSON을 1페이지 분량의 간결한 한국어 실행 요약으로 작성하세요.
        시장 기회, 핵심 리스크, 기대 효과, 추천 후속 조치에 집중하세요.
        짧은 문장을 사용하세요.

        Report JSON:
        %s
        """
        .formatted(fullReport);
    }
}
