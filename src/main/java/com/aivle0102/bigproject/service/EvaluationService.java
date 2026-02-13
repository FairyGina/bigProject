package com.aivle0102.bigproject.service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import com.aivle0102.bigproject.client.OpenAiClient;
import com.aivle0102.bigproject.domain.ConsumerFeedback;
import com.aivle0102.bigproject.domain.MarketReport;
import com.aivle0102.bigproject.domain.VirtualConsumer;
import com.aivle0102.bigproject.repository.ConsumerFeedbackRepository;
import com.fasterxml.jackson.databind.ObjectMapper;

import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class EvaluationService {

    private final OpenAiClient openAiClient;
    private final ObjectMapper objectMapper;
    private final ConsumerFeedbackRepository consumerFeedbackRepository;
    private static final Logger log = LoggerFactory.getLogger(EvaluationService.class);

    @Value("${google.maps.api-key:dummy-google-maps-key}")
    private String googleMapsApiKey;

    @PostConstruct
    public void init() {
        if (googleMapsApiKey == null || googleMapsApiKey.isEmpty() || googleMapsApiKey.contains("dummy")) {
            log.warn(
                    "🚨 [CONFIG] Google Maps API Key is MISSING or set to DUMMY value. Map features in frontend may not work.");
        } else {
            log.info("✅ [CONFIG] Google Maps API Key is LOADED (length: {})", googleMapsApiKey.length());
        }
    }

    public Map<String, Object> getMapsConfigStatus() {
        boolean isSet = googleMapsApiKey != null && !googleMapsApiKey.isEmpty() && !googleMapsApiKey.contains("dummy");
        return Map.of(
                "isSet", isSet,
                "length", isSet ? googleMapsApiKey.length() : 0,
                "propertyValue",
                googleMapsApiKey == null ? "null" : (googleMapsApiKey.contains("dummy") ? "dummy-value" : "set"));
    }

    public String getMapsKey() {
        if (googleMapsApiKey != null && !googleMapsApiKey.contains("dummy")) {
            log.info("📡 [MAP] Providing Google Maps API Key to frontend (length: {})", googleMapsApiKey.length());
            return googleMapsApiKey;
        }
        log.warn("📡 [MAP] Google Maps API Key requested by frontend but it is MISSING or DUMMY.");
        return null;
    }

    // 각 AI 심사위원에게 생성한 보고서를 토대로 평가 진행
    public List<ConsumerFeedback> evaluate(List<VirtualConsumer> personas, String report) {

        List<ConsumerFeedback> results = new ArrayList<>();

        for (VirtualConsumer persona : personas) {
            try {
                ConsumerFeedback evaluation = evaluateOnePersona(persona, report);
                evaluation.setConsumer(persona);

                results.add(evaluation);

            } catch (Exception e) {
                log.error("[평가 실패] 국가: {}, 페르소나: {}, 원인: {}",
                        persona.getCountry(), persona.getPersonaName(), e.getMessage());
            }
        }

        return results;
    }

    // 심사의원 평가 저장
    public List<ConsumerFeedback> evaluateAndSave(MarketReport report, List<VirtualConsumer> personas,
            String reportText) {
        if (report == null || report.getId() == null || personas == null || personas.isEmpty()) {
            return List.of();
        }
        List<ConsumerFeedback> results = new ArrayList<>();
        for (VirtualConsumer persona : personas) {
            try {
                ConsumerFeedback evaluation = evaluateOnePersona(persona, reportText);
                evaluation.setReport(report);
                evaluation.setConsumer(persona);
                results.add(evaluation);
            } catch (Exception e) {
                log.error("[평가 및 저장 실패] 국가: {}, 페르소나: {}, 에러: {}",
                        persona.getCountry(), persona.getPersonaName(), e.getMessage());
            }
        }
        if (!results.isEmpty()) {
            consumerFeedbackRepository.saveAll(results);
        }
        return results;
    }

    // 한명의 심사의원 평가 prompt
    private ConsumerFeedback evaluateOnePersona(VirtualConsumer persona, String report) throws Exception {

        String prompt = buildEvaluationPrompt(persona, report);

        Map<String, Object> body = Map.of(
                "model", "gpt-4o-mini",
                "messages", List.of(
                        Map.of("role", "user", "content", prompt)),
                "temperature", 0.2);

        String raw = openAiClient.chatCompletion(body);
        String json = extractJson(raw);

        return objectMapper.readValue(json, ConsumerFeedback.class);
    }

    // 생성한 보고서를 토대로 평가 진행 프롬프트
    private String buildEvaluationPrompt(VirtualConsumer persona, String report) {

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
                - 중요: 모든 국가에 대해 동일한 totalScore를 반환하지 마세요.
                - 국가/연령대 차이를 반영해 점수를 다르게 주세요(가능하면 최소 5~15점 차이).
                - 중요: 국가/페르소나별 점수 차이가 뚜렷하게 나도록 하세요. 60~80 구간에 몰리지 않게 합니다.
                - 정당한 경우 넓은 범위를 사용하세요(예: 30~90). 적합도가 낮으면 20~40도 허용하고, 매우 높으면 80~95도 허용합니다.
                - 네 가지 점수가 5점 이내로 다 비슷하게 나오지 않도록 하고, 페르소나의 우선순위에 따라 항목별 점수를 차등하세요.
                - totalScore는 페르소나별 가중치를 반영해야 합니다(예: 가격 민감형이면 priceScore 비중을 더 크게, 건강 중시형이면 healthScore 비중을 더 크게).
                """

                .formatted(
                        personaToText(persona),
                        report,
                        persona.getCountry(),
                        persona.getAgeGroup(),
                        persona.getPersonaName());
    }

    // 페르소나 정보 -> 프롬프트화
    private String personaToText(VirtualConsumer p) {
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
                        (p.getPurchaseCriteria() == null || p.getPurchaseCriteria().isEmpty())
                                ? ""
                                : String.join(", ", p.getPurchaseCriteria()),
                        p.getAttitudeToKFood(),
                        p.getEvaluationPerspective());
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
