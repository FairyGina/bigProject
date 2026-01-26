// 재료별 HACCP 근거 정보를 담는 DTO.
// 검색 전략, 매칭 알레르기, 상세 증거 목록을 포함한다.
package com.aivle0102.bigproject.dto;

import lombok.Builder;
import lombok.Getter;

import java.util.List;

@Getter
@Builder
public class IngredientEvidence {
    private String ingredient;

    // 검색 전략 고정: prdkind 탐색
    private String searchStrategy; // "HACCP_PRDKIND_EXPLORATORY"

    // HACCP에서 찾은 제품 근거(상위 N개만)
    private List<HaccpProductEvidence> evidences;

    // HACCP allergy/rawmtrl 원문에서 "타겟 국가 의무 알레르기"로 매칭된 것
    private List<String> matchedAllergensForTargetCountry;

    // 검색 결과 없음 등 상태
    private String status; // "FOUND", "NOT_FOUND"
}
