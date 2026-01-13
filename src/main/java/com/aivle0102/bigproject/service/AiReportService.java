package com.aivle0102.bigproject.service;

import com.aivle0102.bigproject.client.OpenAiClient;
import com.aivle0102.bigproject.dto.ReportRequest;
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


    public String generateReport(ReportRequest req) {

        String prompt = buildPrompt(req);

        Map<String, Object> body = Map.of(
                "model", model,
                "messages", List.of(
                        Map.of("role", "system", "content",
                                "너는 글로벌 식품기업의 신메뉴 개발 기획자다."),
                        Map.of("role", "user", "content", prompt)
                ),
                "temperature", 0.4
        );

        return openAiClient.chatCompletion(body);
    }


    public String generateSummary(String fullReport) {

        String prompt = buildSummaryPrompt(fullReport);

        Map<String, Object> body = Map.of(
                "model", model,
                "messages", List.of(
                        Map.of("role", "system", "content",
                                "너는 글로벌 식품기업의 신메뉴 개발 기획자다."),
                        Map.of("role", "user", "content", prompt)
                ),
                "temperature", 0.4
        );

        return openAiClient.chatCompletion(body);
    }

    //보고서 생성 prompt
    private String buildPrompt(ReportRequest r) {
            return    """
            [프로젝트 목적]
            아래 레시피(또는 메뉴 컨셉)를 시장에 출시할지 검토하기 위한 '시장 분석 요약 리포트(참고용)'를 작성하라.
            보고서는 기업 전략/PM 관점의 전문 보고서 톤으로 작성한다.
            
            [입력 레시피/컨셉]
            %s
            
            [타겟 조건]
            - 타겟 국가: %s
            - 타겟 소비자: %s
            - 가격대 포지션: %s
            
            [중요 지침 - 반드시 준수]
            1) 외부 실데이터를 조회할 수 없으므로, 모든 수치(성공확률, 점수, KPI 목표치 등)는 "가정/추정치"로 표기한다.
            2) 각 가정/추정치에는 최소 2개 이상의 '근거 신호(Reasoning Signals)'를 붙인다.
            - 예: K-food 인지도 추세(일반적 현상), HMR/간편식 선호(일반적 현상), 매운맛 수용성 편차(일반적 현상) 등
            3) 보고서는 1~2장 분량의 요약 보고서처럼 "짧고 구조화"된 문장/불릿 중심으로 작성한다.
            4) 마지막에 '다음 단계(리서치/실험 계획)'를 포함한다.
            
            [출력 형식 - 그대로 따를 것]
            # 0. Executive Summary (1페이지 요약)
            - 결론(Go / No-Go / Conditional Go):
            - K-food 시장 적합성 점수(★1~★5): 
            - 핵심 가정 3가지:
            - Top 리스크 3가지:
            - 성공 확률 추정치(%%): (※가정/추정치) + 근거 신호 2~3개
            - 추천 전략(한 줄):
            
            # 1. Market Snapshot (수요 조사 기반 시장 분석 요약)
            ## 1.1 Target Persona Needs & JTBD
            - 소비자 니즈/상황:
            - 구매 트리거:
            - 거부 요인:
            
            ## 1.2 Category & Trend Signals (정성 신호 기반)
            - HMR/간편식, 건강/저당, 아시안 푸드 수요 등 신호:
            - 가격 민감도/프리미엄 허용 범위(정성):
            - 채널 가설(리테일/온라인/편의점/코스트코형 등):
            
            ## 1.3 Competitive Landscape (가정 기반)
            - 대표 로컬/유사 카테고리 경쟁자 유형:
            - 차별화 포인트 가설(USP):
            
            # 2. Risk Assessment
            - 리스크(맵기/가격/알레르겐/규제/브랜딩 등)와 완화 방안:
            - 실패 시나리오 2개 + 조기 경보 지표:
            
            # 3. SWOT (자동 생성)
            - Strengths:
            - Weaknesses:
            - Opportunities:
            - Threats:
            
            # 4. SCAMPER 기반 콘셉트 3안 (각 안별로 4줄)
            각 안은 아래 형식을 따른다:
            - 콘셉트명:
            - 핵심 변경점(SCAMPER 요소 명시):
            - 타겟/포지셔닝:
            - 기대효과(가정) & 리스크:
            
            # 5. KPI 후보(가정치) + 측정 방법 제안
            - KPI 1:
                - 목표치(가정):
                - 측정 방법:
                - 왜 중요한가:
            - KPI 2:
            - KPI 3:
            
            # 6. Next Steps (리서치/실험 계획: 2주 플랜)
            - 반드시 포함: 빠른 수요검증(설문/콘셉트테스트), 샘플링/시식, 가격 테스트, 채널 파일럿
            - 산출물: 무엇을 만들고 무엇을 의사결정하는지
            
            [출력 규칙]
            - 모든 제목(#, ##)과 각 불릿(-)은 반드시 줄바꿈으로 분리한다.
            - 섹션 사이에는 빈 줄(한 줄 공백)을 넣는다.
            """

            .formatted(
            r.getRecipe(),
            r.getTargetCountry(),
            r.getTargetPersona(),
            r.getPriceRange()
        );
    }

    //보고서 요약 prompt
    private String buildSummaryPrompt(String fullReport) {
        return """
        당신은 글로벌 식품 기업의 임원 보고용 문서를 작성하는
        시니어 전략 컨설턴트다.
    
        아래는 신메뉴 기획 및 시장 분석에 대한
        내부 검토용 전체 보고서다.
    
        이 문서를 바탕으로,
        임원이 1분 이내에 읽고 판단할 수 있는
        요약 보고서를 작성하라.
    
        ===============================
        [전체 보고서]
        %s
        ===============================
    
        [요약 작성 기준]
        - 분량은 1페이지 이내
        - 시장 기회, 핵심 리스크, 수익성, 권장 전략 중심
        - 세부 설명은 제거하고 판단에 필요한 내용만 유지
        - 마케팅 문구 사용 금지
        - 기업 내부 보고서 톤 유지
        - 말투는 문장형 어미가 아닌 단어로 끝내는 형식
        """
        .formatted(fullReport);
    }
}
