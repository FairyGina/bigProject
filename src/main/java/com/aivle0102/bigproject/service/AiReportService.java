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
                                "당신은 글로벌 식품/레시피 비즈니스 분석가입니다. 한국어로만 답변하세요."),
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
                                "당신은 글로벌 식품/레시피 비즈니스 분석가입니다. 한국어로만 답변하세요."),
                        Map.of("role", "user", "content", prompt)
                ),
                "temperature", 0.4
        );

        return openAiClient.chatCompletion(body);
    }

    public String generateFinalEvaluation(List<Map<String, Object>> reportInputs) {
        String prompt = buildFinalEvaluationPrompt(reportInputs);
        Map<String, Object> body = Map.of(
                "model", model,
                "messages", List.of(
                        Map.of("role", "system", "content",
                                "당신은 글로벌 식품/레시피 비즈니스 분석가입니다. 한국어로만 답변하세요."),
                        Map.of("role", "user", "content", prompt)
                ),
                "temperature", 0.2
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
        아래 레시피를 기반으로 시장/소비자 분석 리포트를 작성해줘.
        각 섹션은 아래 스키마를 따르는 JSON으로 작성해줘.
        응답은 오직 JSON으로만 작성해줘.
        마크다운, 코드펜스, 설명 문장은 포함하지 마.

        레시피 정보:
        %s

        타겟 정보:
        - targetCountry: %s
        - targetPersona: %s
        - priceRange: %s

        JSON 스키마(키/형식 유지, 값은 실제 내용으로 채워서 작성):
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
            "decision": "GO | HOLD | NO-GO",
            "marketFitScore": "0-100",
            "keyPros": ["..."],
            "topRisks": ["..."],
            "successProbability": "0-100% 예상 성공확률",
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
        아래 리포트 JSON을 바탕으로 한글 요약(1페이지 분량)을 작성해 주세요.
        시장 기회, 핵심 리스크, 기대 효과, 권장 다음 단계를 포함해 주세요.
        출력은 한국어 문장 또는 불릿만 사용하세요. JSON/키/코드펜스/배열은 포함하지 마세요.

        리포트 JSON:
        %s

        """
        .formatted(fullReport);
    }

    private String buildFinalEvaluationPrompt(List<Map<String, Object>> reportInputs) {
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < reportInputs.size(); i += 1) {
            Map<String, Object> item = reportInputs.get(i);
            sb.append("[").append(i + 1).append("]\n");
            sb.append("- reportId: ").append(item.getOrDefault("reportId", "")).append("\n");
            sb.append("- recipeId: ").append(item.getOrDefault("recipeId", "")).append("\n");
            sb.append("- recipeTitle: ").append(item.getOrDefault("recipeTitle", "")).append("\n");
            sb.append("- summary: ").append(item.getOrDefault("summary", "")).append("\n");
            sb.append("- reportContent: ").append(item.getOrDefault("content", "")).append("\n\n");
        }

        return """
        아래 보고서들을 서로 비교해 최종적으로 어떤 레시피를 선택하는 것이 가장 좋은지 평가해 주세요.
        반드시 하나의 레시피를 최종 추천으로 선택하고, 이유를 명확히 설명해 주세요.
        출력 형식은 다음과 같이 작성해 주세요(마크다운 허용).
        반드시 1)~7) 항목을 모두 포함하고, 누락하면 안 됩니다.
        내용이 부족한 항목은 "N/A"로 채워도 됩니다.

        1) 최종 추천 레시피: [recipeTitle] (레시피 ID/번호 표기 금지)
        2) 선택 이유 (핵심 근거 3~5개 불릿)
        3) 비교 요약(표 금지, 텍스트로 작성)
           - 항목: 장점, 리스크, 시장성, 차별성
           - 각 항목마다 레시피별 비교를 bullet 형태로 작성
           - 예시:
             장점:
             - 레시피A: ...
             - 레시피B: ...
        4) KPI 분석 요약 (항목: 목표/측정/인사이트, 레시피별 비교)
        5) SWOT 분석 요약 (Strengths/Weaknesses/Opportunities/Threats 레시피별 비교)
        6) 리스크 및 보완 제안
        7) 다음 실행 단계(3개)

        출력 템플릿(형식 유지):
        1) ...
        2) ...
        3) ...
        4) ...
        5) ...
        6) ...
        7) ...

        추가 규칙:
        - 표(테이블) 형식 사용 금지.
        - HTML 태그(<br> 등) 사용 금지.
        - 레시피 제목에 괄호/번호/ID 표기 금지.

        보고서 목록:
        %s
        """.formatted(sb.toString());
    }
}




