package com.aivle0102.bigproject.dto;

import lombok.Builder;
import lombok.Getter;

import java.util.List;
import java.util.Map;

@Getter
@Builder
public class AllergenAnalysisResponse {
    private String targetCountry;

    // 입력 레시피에서 추출된 재료(정규화된 이름)
    private List<String> extractedIngredients;

    // (1) 직접 매칭으로 "확정"된 알레르기
    // key: allergenCanonicalName (e.g., Sesame), value: why (ingredient)
    private Map<String, String> directMatchedAllergens;

    // (2) HACCP 탐색 기반 검색 결과
    private List<IngredientEvidence> haccpSearchEvidences;

    // 최종적으로 타겟 국가 기준으로 매칭된 알레르기(합집합)
    private List<String> finalMatchedAllergens;

    // 탐색 기반 검색임을 명시
    private String note;
}
