package com.aivle0102.bigproject.service;

import org.springframework.stereotype.Component;

import java.util.*;

@Component
public class AllergenMatcher {

    /**
     * "직접 매칭"용: 재료명이 곧 알레르기 재료인 경우에만 확정
     * - 대신 "참깨", "땅콩", "우유", "계란" 같은 명시 재료만 확정
     */
    private static final Map<String, String> INGREDIENT_TO_CANONICAL = Map.ofEntries(
            Map.entry("참깨", "Sesame"),
            Map.entry("깨", "Sesame"),
            Map.entry("땅콩", "Peanut"),
            Map.entry("우유", "Milk"),
            Map.entry("달걀", "Egg"),
            Map.entry("계란", "Egg"),
            Map.entry("밀", "Wheat"),
            Map.entry("대두", "Soybean"),
            Map.entry("콩", "Soybean"),
            Map.entry("새우", "Shrimp"),
            Map.entry("게", "Crab"),
            Map.entry("호두", "Walnut")
    );

    /**
     * HACCP allergy(원문) -> canonical allergen
     * - 이 매핑은 "표준 번역/동의어" 수준만 허용(추론 금지)
     */
    private static final Map<String, String> HACCP_KO_TO_CANONICAL = Map.ofEntries(
            Map.entry("우유", "Milk"),
            Map.entry("계란", "Egg"),
            Map.entry("달걀", "Egg"),
            Map.entry("난류", "Egg"),
            Map.entry("밀", "Wheat"),
            Map.entry("대두", "Soybean"),
            Map.entry("콩", "Soybean"),
            Map.entry("땅콩", "Peanut"),
            Map.entry("참깨", "Sesame"),
            Map.entry("깨", "Sesame"),
            Map.entry("새우", "Crustaceans"), // 국가별로 Shrimp/Crustaceans 다를 수 있어 후처리 가능
            Map.entry("게", "Crab"),
            Map.entry("호두", "Tree nuts"),
            Map.entry("견과", "Tree nuts"),
            Map.entry("아몬드", "Tree nuts"),
            Map.entry("캐슈넛", "Tree nuts"),
            Map.entry("피스타치오", "Tree nuts"),
            Map.entry("잣", "Tree nuts"),
            Map.entry("생선", "Fish")
    );

    public Optional<String> directMatchIngredientToCanonical(String ingredientName) {
        if (ingredientName == null) return Optional.empty();
        String key = ingredientName.trim();
        if (key.isEmpty()) return Optional.empty();
        return Optional.ofNullable(INGREDIENT_TO_CANONICAL.get(key));
    }

    public Set<String> extractCanonicalFromHaccpAllergyText(String allergyRaw) {
        if (allergyRaw == null || allergyRaw.isBlank()) return Set.of();

        // "대두,계란,밀" / "돼지고기, 밀 함유" 등 케이스를 최대한 단순 처리
        String normalized = allergyRaw.replace("함유", " ")
                .replace("/", " ")
                .replace("·", ",")
                .replace(";", ",")
                .trim();

        // 콤마/공백 분리
        String[] parts = normalized.split("[,\\s]+");

        Set<String> out = new LinkedHashSet<>();
        for (String p : parts) {
            String token = p.trim();
            if (token.isEmpty()) continue;

            String canonical = HACCP_KO_TO_CANONICAL.get(token);
            if (canonical != null) out.add(canonical);
        }
        return out;
    }

    /**
     * canonical 후보들 중에서 "타겟 국가의 의무 알레르기 목록"에 포함되는 것만 남긴다.
     */
    public List<String> filterByCountryObligation(Set<String> canonicalCandidates, List<String> countryObligation) {
        if (canonicalCandidates == null || canonicalCandidates.isEmpty()) return List.of();
        if (countryObligation == null || countryObligation.isEmpty()) return List.of();

        Set<String> obligationSet = new HashSet<>(countryObligation);

        List<String> out = new ArrayList<>();
        for (String c : canonicalCandidates) {
            // 국가마다 표기 방식이 달라서, 최소한의 호환 처리
            // 예: US는 "Crustacean shellfish", CN은 "Crustaceans"
            // -> 여기서는 아주 보수적으로 "완전 일치" 우선, 일부 키워드 호환만 허용
            if (obligationSet.contains(c)) {
                out.add(c);
                continue;
            }
            // 제한적 호환(추론 아님: 용어 차이만 흡수)
            if (c.equals("Crustaceans") && obligationSet.contains("Crustacean shellfish")) {
                out.add("Crustacean shellfish");
            }
        }
        return out;
    }
}
