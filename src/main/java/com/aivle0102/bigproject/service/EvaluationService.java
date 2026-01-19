package com.aivle0102.bigproject.service;

import com.aivle0102.bigproject.client.OpenAiClient;
import com.aivle0102.bigproject.dto.AiPersona;
import com.aivle0102.bigproject.dto.PersonaEvaluation;
import tools.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.*;

@Service
@RequiredArgsConstructor
public class EvaluationService {

    private final OpenAiClient openAiClient;
    private final ObjectMapper objectMapper;

    // 각 AI 심사위원에게 생성한 보고서를 토대로 평가 진행
    public List<PersonaEvaluation> evaluate(List<AiPersona> personas, String report) {

        List<PersonaEvaluation> results = new ArrayList<>();

        for (AiPersona persona : personas) {
            try {
                PersonaEvaluation evaluation = evaluateOnePersona(persona, report);

                results.add(evaluation);

            } catch (Exception e) {
                System.err.println("[평가 실패] " + persona.getCountry() + " / " + persona.getPersonaName());
            }
        }

        return results;
    }

    // 한명의 심사의원 평가
    private PersonaEvaluation evaluateOnePersona(AiPersona persona, String report) throws Exception {

        String prompt = buildEvaluationPrompt(persona, report);

        Map<String, Object> body = Map.of(
                "model", "gpt-4o-mini",
                "messages", List.of(
                        Map.of("role", "user", "content", prompt)
                ),
                "temperature", 0.2
        );

        String raw = openAiClient.chatCompletion(body);
        String json = extractJson(raw);

        return objectMapper.readValue(json, PersonaEvaluation.class);
    }


    // 생성한 보고서를 토대로 평가 진행 프롬프트
    private String buildEvaluationPrompt(AiPersona persona, String report) {

        return """
        당신은 다음과 같은 소비자 AI 페르소나다.

        [페르소나 정보]
        %s

        당신의 관점에서 아래 신메뉴 기획 보고서를 읽고
        소비자 심사위원으로서 평가하라.

        [신메뉴 기획 보고서]
        %s

        [출력 형식]
        아래 JSON 형식으로만 출력하라.

        {
          "country": "%s",
          "ageGroup": "%s",
          "personaName": "%s",

          "totalScore": 0,
          "tasteScore": 0,
          "priceScore": 0,
          "healthScore": 0,

          "positiveFeedback": "",
          "negativeFeedback": "",

          "purchaseIntent": "YES | NO | MAYBE"
        }

        [평가 기준]
        - 소비자 관점에서 현실적으로 판단
        - 과장 금지
        - 점수는 0~100 사이 정수
        - 보고서에 근거한 평가만 작성
        """

        .formatted(
                personaToText(persona),
                report,
                persona.getCountry(),
                persona.getAgeGroup(),
                persona.getPersonaName()
        );
    }

    // 페르소나 정보 -> 프롬프트화
    private String personaToText(AiPersona p) {
        return """
        국가: %s
        연령대: %s
        라이프스타일: %s
        식품 선호: %s
        구매 기준: %s
        K-Food 태도: %s
        평가 관점: %s
        """
        .formatted(
                p.getCountry(),
                p.getAgeGroup(),
                p.getLifestyle(),
                p.getFoodPreference(),
                String.join(", ", p.getPurchaseCriteria()),
                p.getAttitudeToKFood(),
                p.getEvaluationPerspective()
        );
    }

    // JSON만 추출
    private String extractJson(String text) {
        int start = text.indexOf("{");
        int end = text.lastIndexOf("}");
        if (start == -1 || end == -1) {
            throw new RuntimeException("JSON 응답 아님");
        }
        return text.substring(start, end + 1);
    }
}
