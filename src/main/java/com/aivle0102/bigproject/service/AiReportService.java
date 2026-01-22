package com.aivle0102.bigproject.service;

import com.aivle0102.bigproject.client.OpenAiClient;
import com.aivle0102.bigproject.dto.ReportRequest;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

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
                                "You are a global food product strategy analyst."),
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
                                "You are a global food product strategy analyst."),
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
            throw new IllegalStateException("Invalid report JSON from AI: " + content, e);
        }
    }

    private String buildPrompt(ReportRequest r) {
        return """
You are a global food product strategy analyst.
Create a market analysis report in JSON for the recipe concept below.
Write all text in Korean.
Return ONLY valid JSON. No markdown, no commentary.

Recipe concept:
%s

Target conditions:
- targetCountry: %s
- targetPersona: %s
- priceRange: %s

JSON schema (all keys required, use empty strings or empty arrays if unknown):
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
Summarize the following report JSON into a concise 1-page Korean executive summary.
Focus on market opportunity, key risks, expected impact, and recommended next actions.
Use short sentences.

Report JSON:
%s
"""
                .formatted(fullReport);
    }
}
