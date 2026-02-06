package com.aivle0102.bigproject.service;

import com.aivle0102.bigproject.client.OpenAiClient;
import com.aivle0102.bigproject.dto.AgeGroupResult;
import com.aivle0102.bigproject.domain.VirtualConsumer;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import tools.jackson.databind.ObjectMapper;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Map;


@Service
@RequiredArgsConstructor
public class PersonaService {

    private final OpenAiClient openAiClient;
    private final ObjectMapper objectMapper;


    //1. 레시피에 맞는 국가별 연령대 Top1 뽑기
    public List<AgeGroupResult> selectTopAgeGroups(String recipe, List<String> countries) {
        String prompt = buildMultiCountryAgeGroupPrompt(recipe, countries);

        Map<String, Object> body = Map.of(
                "model", "gpt-4o-mini",
                "messages", List.of(
                        Map.of("role", "user", "content", prompt)
                ),
                "temperature", 0.2
        );

        String response = openAiClient.chatCompletion(body);

        System.out.println("파싱이 이상하다 뭐지..." + response);

        return parseMultiCountryResult(response);
    }


    //2. 국가별 Top1 연령대의 AI 페르소나 각각 생성 배치
    public List<VirtualConsumer> generatePersonas(String recipeSummary, List<AgeGroupResult> targets) {

        List<VirtualConsumer> personas = new ArrayList<>();
        if (targets == null || targets.isEmpty()) return personas;

        for (AgeGroupResult t : targets) {
            try {
                VirtualConsumer persona = generatePersonaOne(recipeSummary, t.getCountry(), t.getAgeGroup());
                personas.add(persona);

            } catch (Exception e) {
                // 한 국가 실패해도 전체 중단하지 않기
                System.err.println("[페르소나 생성 실패] country=" + t.getCountry() + " / " + e.getMessage());
            }
        }

        return personas;
    }


    // 단일 국가 1명 생성
    private VirtualConsumer generatePersonaOne(String recipeSummary, String country, String ageGroup) throws Exception {

        String prompt = buildPersonaPrompt(recipeSummary, country, ageGroup);

        Map<String, Object> body = Map.of(
                "model", "gpt-4o-mini",
                "messages", List.of(
                        Map.of("role", "user", "content", prompt)
                ),
                "temperature", 0.2
        );

        String content = openAiClient.chatCompletion(body);

        // JSON 파싱
        return objectMapper.readValue(content, VirtualConsumer.class);
    }


    // 응답 데이터 파싱
    private List<AgeGroupResult> parseMultiCountryResult(String response) {

        List<AgeGroupResult> results = new ArrayList<>();
        String[] blocks = response.split("- ");

        for (String block : blocks) {
            if (block.isBlank()) continue;

            String country = extract(block, "국가:");
            String ageGroup = extract(block, "연령대:");
            String reason = extract(block, "선정 이유:");

            results.add(new AgeGroupResult(country, ageGroup, reason));
        }

        return results;
    }


    // 문자열 파서
    private String extract(String text, String key) {
        return Arrays.stream(text.split("\n"))
                .filter(line -> line.contains(key))
                .findFirst()
                .map(line -> line.replace(key, "").trim())
                .orElse("");
    }


    //국가별 연령대 선정 프롬프트
    private String buildMultiCountryAgeGroupPrompt(String recipe, List<String> countries) {
        return """
        당신은 글로벌 식품 기업의 시장 분석을 담당하는 AI 컨설턴트다.
    
        아래 레시피를 기준으로,
        각 국가별로 이 레시피에 가장 적합한
        소비자 연령대 Top 1을 선정하라.
    
        ===============================
        [레시피]
        %s
    
        [평가 대상 국가 목록]
        %s
        ===============================
    
        [분석 기준]
        - 각 국가의 일반적인 식문화
        - HMR 및 간편식 소비 성향
        - 건강, 저당, 고단백 식품 선호도
        - 구매력 및 주요 소비 연령대
    
        [연령대 선택 범위]
        - 0-10
        - 11-20
        - 21-30
        - 31-40
        - 41-50
        - 51-60
        - 61-70
        - 71-80
        - 81-90
        
    
        [출력 형식]
        국가별로 아래 형식을 반복 출력하라.
    
        - 국가: 국가명
          연령대: 선택한 연령대
          선정 이유: 2~3문장 요약
    
        모든 판단은 추정 및 가설 기반임을 전제로 작성하라.
        """
        .formatted(
                recipe,
                String.join(", ", countries)
        );
    }


    // AI 페르소나 1명을 생성하는 프롬프트
    private String buildPersonaPrompt(String recipeSummary, String country, String ageGroup) {
        return """
        당신은 글로벌 식품 기업에서 활용하는 소비자 페르소나 시뮬레이션 AI다.

        아래 정보를 바탕으로, 해당 국가와 연령대를 대표하는
        현실적인 소비자 AI 페르소나 1명을 생성하라.
        이 페르소나는 이후 신메뉴 평가 시 "AI 심사위원" 역할을 수행한다.

        [입력]
        - 국가: %s
        - 연령대: %s
        - 레시피 요약: %s

        [출력 형식]
        아래 JSON만 출력하라. (설명 문장, 마크다운, 불릿 금지)

        {
          "country": "%s",
          "ageGroup": "%s",
          "personaName": "",
          "lifestyle": "",
          "foodPreference": "",
          "purchaseCriteria": ["", "", ""],
          "HMRUsageContext": "",
          "attitudeToKFood": "",
          "evaluationPerspective": ""
        }

        [작성 가이드]
        - 과장 금지, 마케팅 문구 금지
        - 해당 국가의 문화/식습관/구매행동을 반영
        - 문장 어미는 "~니다" 대신 단어로 끝나는 보고서 메모 톤
        """

        .formatted(country, ageGroup, recipeSummary, country, ageGroup);
    }
}
