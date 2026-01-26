// 알레르기 키워드/토큰을 표준 canonical 값으로 매핑하는 유틸 서비스.
// HACCP 텍스트, 재료명, AI 토큰에서 알레르기 후보를 추출한다.
package com.aivle0102.bigproject.service;

import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

@Component
public class AllergenMatcher {

    private static final int MAX_QUERY_CANDIDATES = 5;

    // prdkind 검색 확장을 위한 동의어 힌트만 관리.
    private static final Map<String, List<String>> QUERY_SYNONYMS = Map.ofEntries(
            Map.entry("우유", List.of("유제품", "유가공", "유청", "유크림")),
            Map.entry("콩", List.of("대두", "두류")),
            Map.entry("밀", List.of("밀가루", "곡류")),
            Map.entry("계란", List.of("달걀")),
            Map.entry("달걀", List.of("계란")),
            Map.entry("땅콩", List.of("낙화생")),
            Map.entry("견과", List.of("견과류"))
    );

    // 재료명 -> 알레르기 canonical 직접 매핑(1차 확정)
    private static final Map<String, String> INGREDIENT_TO_CANONICAL = Map.ofEntries(
            Map.entry("우유", "Milk"),
            Map.entry("유청", "Milk"),
            Map.entry("유크림", "Milk"),
            Map.entry("치즈", "Milk"),
            Map.entry("버터", "Milk"),
            Map.entry("생크림", "Milk"),

            Map.entry("계란", "Egg"),
            Map.entry("달걀", "Egg"),
            Map.entry("난백", "Egg"),
            Map.entry("난황", "Egg"),
            Map.entry("전란", "Egg"),
            Map.entry("수란", "Egg"),

            Map.entry("밀", "Wheat"),
            Map.entry("밀가루", "Wheat"),
            Map.entry("빵가루", "Wheat"),
            Map.entry("면", "Wheat"),
            Map.entry("파스타", "Wheat"),
            Map.entry("보리", "Barley"),
            Map.entry("호밀", "Rye"),
            Map.entry("귀리", "Oats"),
            Map.entry("카무트", "Kamut"),

            Map.entry("대두", "Soybean"),
            Map.entry("콩", "Soybean"),
            Map.entry("두부", "Soybean"),
            Map.entry("낫또", "Soybean"),
            Map.entry("청국장", "Soybean"), 
            Map.entry("두유", "Soybean"),
            Map.entry("푸주", "Soybean"),

            Map.entry("땅콩", "Peanut"), 

            Map.entry("새우", "Crustaceans"),
            Map.entry("게", "Crustaceans"),
            Map.entry("꽃게", "Crustaceans"),
            Map.entry("랍스터", "Crustaceans"),
            Map.entry("킹크랩", "Crustaceans"),

            Map.entry("고등어", "Fish"),
            Map.entry("연어", "Fish"),
            Map.entry("참치", "Fish"),
            Map.entry("명태", "Fish"),
            Map.entry("전갱이", "Fish"),
            Map.entry("멸치", "Fish"),
            Map.entry("대구", "Fish"),
            Map.entry("도미", "Fish"),
            Map.entry("광어", "Fish"),
            Map.entry("삼치", "Fish"),

            Map.entry("피스타치오", "Tree nuts"),
            Map.entry("호두", "Tree nuts"),
            Map.entry("아몬드", "Tree nuts"),
            Map.entry("캐슈넛", "Tree nuts"),
            Map.entry("잣", "Tree nuts"),
            Map.entry("견과", "Tree nuts"),

            Map.entry("참깨", "Sesame"),
            Map.entry("참기름", "Sesame"),
            Map.entry("흑임자", "Sesame")
    );

    // 글루텐 함유 곡물 매핑(원재료 단계 대응)
    private static final Map<String, String> GLUTEN_CEREAL_KO_TO_CANONICAL = Map.ofEntries(
            Map.entry("밀", "Wheat"),
            Map.entry("밀가루", "Wheat"),
            Map.entry("보리", "Barley"),
            Map.entry("보리쌀", "Barley"),
            Map.entry("호밀", "Rye"),
            Map.entry("호밀가루", "Rye"),
            Map.entry("귀리", "Oats"),
            Map.entry("귀리가루", "Oats"),
            Map.entry("카무트", "Kamut")
    );

    // 복수 알레르기 성분이 명확한 원재료 예외 매핑.
    private static final Map<String, Set<String>> MULTI_INGREDIENT_TO_CANONICAL = Map.ofEntries(
            Map.entry("간장", Set.of("Soybean", "Wheat")),
            Map.entry("된장", Set.of("Soybean")),
            Map.entry("새우", Set.of("Crustaceans", "Shrimp")),
            Map.entry("게", Set.of("Crustaceans", "Crab"))
    );

    // HACCP allergy/rawmtrl 토큰 → 알레르기 canonical 매핑.
    private static final Map<String, String> HACCP_KO_TO_CANONICAL = Map.ofEntries(
            Map.entry("우유", "Milk"),
            Map.entry("유청", "Milk"),
            Map.entry("유크림", "Milk"),
            Map.entry("치즈", "Milk"),
            Map.entry("버터", "Milk"),
            Map.entry("생크림", "Milk"),

            Map.entry("계란", "Egg"),
            Map.entry("달걀", "Egg"),
            Map.entry("난백", "Egg"),
            Map.entry("난황", "Egg"),
            Map.entry("전란", "Egg"),
            Map.entry("난류", "Egg"),

            Map.entry("밀", "Wheat"),
            Map.entry("밀가루", "Wheat"),
            Map.entry("빵가루", "Wheat"),
            Map.entry("면", "Wheat"),
            Map.entry("파스타", "Wheat"),
            Map.entry("밀글루텐", "Wheat"),
            Map.entry("보리", "Barley"),
            Map.entry("호밀", "Rye"),
            Map.entry("귀리", "Oats"),
            Map.entry("카무트", "Kamut"),

            Map.entry("대두", "Soybean"),
            Map.entry("콩", "Soybean"),
            Map.entry("두부", "Soybean"),
            Map.entry("낫또", "Soybean"),

            Map.entry("땅콩", "Peanut"),
            
            Map.entry("새우", "Crustaceans"),
            Map.entry("게", "Crustaceans"),
            Map.entry("갑각류", "Crustaceans"),
            Map.entry("꽃게", "Crustaceans"),
            Map.entry("랍스터", "Crustaceans"),
            Map.entry("킹크랩", "Crustaceans"),

            Map.entry("고등어", "Fish"),
            Map.entry("연어", "Fish"),
            Map.entry("참치", "Fish"),
            Map.entry("명태", "Fish"),
            Map.entry("전갱이", "Fish"),
            Map.entry("멸치", "Fish"),
            Map.entry("대구", "Fish"),
            Map.entry("도미", "Fish"),
            Map.entry("광어", "Fish"),
            Map.entry("삼치", "Fish"),
            Map.entry("어류", "Fish"),

            Map.entry("피스타치오", "Tree nuts"),
            Map.entry("호두", "Tree nuts"),
            Map.entry("아몬드", "Tree nuts"),
            Map.entry("캐슈넛", "Tree nuts"),
            Map.entry("잣", "Tree nuts"),
            Map.entry("견과", "Tree nuts"),
            Map.entry("견과류", "Tree nuts"),

            Map.entry("참깨", "Sesame"),
            Map.entry("참기름", "Sesame"),
            Map.entry("흑임자", "Sesame")
    );

    public List<String> buildPrdkindQueries(String ingredientName) {
        // 재료명에서 쿼리 토큰/동의어를 뽑아 prdkind 검색 후보 생성
        if (ingredientName == null) return List.of();
        String normalized = normalizeIngredientForQuery(ingredientName);
        if (normalized.isBlank()) return List.of();

        Set<String> queries = new LinkedHashSet<>();
        queries.add(normalized);

        List<String> tokens = tokenize(normalized);
        for (String token : tokens) {
            queries.add(token);
            List<String> synonyms = QUERY_SYNONYMS.get(token);
            if (synonyms != null) {
                queries.addAll(synonyms);
            }

        }

        List<String> ordered = new ArrayList<>(queries);
        ordered.sort(Comparator.comparingInt(String::length).reversed());
        if (ordered.size() > MAX_QUERY_CANDIDATES) {
            return ordered.subList(0, MAX_QUERY_CANDIDATES);
        }
        return ordered;
    }

    public Optional<String> directMatchIngredientToCanonical(String ingredientName) {
        // 단일 알레르기 성분 매핑
        if (ingredientName == null) return Optional.empty();
        String key = ingredientName.trim();
        if (key.isEmpty()) return Optional.empty();
        return Optional.ofNullable(INGREDIENT_TO_CANONICAL.get(key));
    }

    public Optional<String> matchGlutenCerealCanonical(String ingredientName) {
        // 글루텐 함유 곡물 여부 확인(원재료 단계 대응)
        if (ingredientName == null || ingredientName.isBlank()) return Optional.empty();
        String key = ingredientName.trim();
        for (Map.Entry<String, String> entry : GLUTEN_CEREAL_KO_TO_CANONICAL.entrySet()) {
            if (key.contains(entry.getKey())) {
                return Optional.of(entry.getValue());
            }
        }
        return Optional.empty();
    }

    public Set<String> directMultiMatchIngredientToCanonical(String ingredientName) {
        // 복수 알레르기 성분 매핑(간장/된장 등)
        if (ingredientName == null || ingredientName.isBlank()) return Set.of();
        String key = ingredientName.trim();
        Set<String> mapped = MULTI_INGREDIENT_TO_CANONICAL.get(key);
        if (mapped == null || mapped.isEmpty()) return Set.of();
        return new LinkedHashSet<>(mapped);
    }

    public Set<String> extractCanonicalFromHaccpAllergyText(String allergyRaw) {
        // allergy 필드에서 알레르기 canonical 추출
        if (allergyRaw == null || allergyRaw.isBlank()) return Set.of();

        String normalized = allergyRaw.replace("함유", " ")
                .replace("/", " ")
                .replace("·", ",")
                .replace(";", ",")
                .trim();

        String[] parts = normalized.split("[,\\s]+");

        Set<String> out = new LinkedHashSet<>();
        for (String p : parts) {
            String token = p.trim();
            if (token.isEmpty()) continue;

            Set<String> multi = MULTI_INGREDIENT_TO_CANONICAL.get(token);
            if (multi != null && !multi.isEmpty()) {
                out.addAll(multi);
            }

            String canonical = HACCP_KO_TO_CANONICAL.get(token);
            if (canonical != null) out.add(canonical);
        }
        return out;
    }

    public Set<String> extractCanonicalFromRawmtrl(String rawmtrlRaw) {
        // rawmtrl 텍스트에서 알레르기 canonical 추출(부분 매칭 포함)
        if (rawmtrlRaw == null || rawmtrlRaw.isBlank()) return Set.of();

        String normalized = rawmtrlRaw.replace("/", " ")
                .replace("·", ",")
                .replace(";", ",")
                .replace("|", ",")
                .trim();

        String[] parts = normalized.split("[,\\n\\r]+");
        Set<String> out = new LinkedHashSet<>();
        for (String p : parts) {
            String token = normalizeToken(p);
            if (token.isEmpty()) continue;

            String direct = HACCP_KO_TO_CANONICAL.get(token);
            if (direct != null) out.add(direct);
            direct = INGREDIENT_TO_CANONICAL.get(token);
            if (direct != null) out.add(direct);

            out.addAll(matchByContains(token, HACCP_KO_TO_CANONICAL));
            out.addAll(matchByContains(token, INGREDIENT_TO_CANONICAL));
            out.addAll(matchByContainsMulti(token, MULTI_INGREDIENT_TO_CANONICAL));
        }
        return out;
    }

    public Set<String> extractCanonicalFromTokens(Collection<String> tokens) {
        // AI가 추출한 토큰에서 알레르기 canonical 변환
        if (tokens == null || tokens.isEmpty()) return Set.of();

        Set<String> out = new LinkedHashSet<>();
        for (String t : tokens) {
            if (t == null || t.isBlank()) continue;
            String token = normalizeToken(t);
            if (token.isEmpty()) continue;

            String direct = HACCP_KO_TO_CANONICAL.get(token);
            if (direct != null) out.add(direct);
            direct = INGREDIENT_TO_CANONICAL.get(token);
            if (direct != null) out.add(direct);

            out.addAll(matchByContains(token, HACCP_KO_TO_CANONICAL));
            out.addAll(matchByContains(token, INGREDIENT_TO_CANONICAL));
            out.addAll(matchByContainsMulti(token, MULTI_INGREDIENT_TO_CANONICAL));
        }
        return out;
    }

    public List<String> filterByCountryObligation(Set<String> canonicalCandidates, List<String> countryObligation) {
        // 국가별 의무 목록에 해당하는 canonical만 필터링
        if (canonicalCandidates == null || canonicalCandidates.isEmpty()) return List.of();
        if (countryObligation == null || countryObligation.isEmpty()) return List.of();

        Set<String> obligationSet = new HashSet<>(countryObligation);

        List<String> out = new ArrayList<>();
        for (String c : canonicalCandidates) {
            if (obligationSet.contains(c)) {
                out.add(c);
                continue;
            }
            if (c.equals("Crustaceans") && obligationSet.contains("Crustacean shellfish")) {
                out.add("Crustacean shellfish");
            }
        }
        return out;
    }
    
    private String normalizeIngredientForQuery(String raw) {
        // 괄호/수치 제거 후 의미 있는 단어만 남김
        String noParen = raw.replaceAll("\\([^)]*\\)", " ");
        String noNumbers = noParen.replaceAll("\\d+(?:\\.\\d+)?", " ");
        String cleaned = noNumbers.replaceAll("[^\\p{L}\\s]", " ").trim();
        List<String> tokens = tokenize(cleaned);
        if (tokens.isEmpty()) return "";

        List<String> filtered = new ArrayList<>();
        for (String t : tokens) {
            if (isStopword(t)) continue;
            filtered.add(t);
        }
        return String.join(" ", filtered).trim();
    }

    private String normalizeToken(String token) {
        // 단일 토큰 정규화
        String noParen = token.replaceAll("\\([^)]*\\)", " ");
        String noNumbers = noParen.replaceAll("\\d+(?:\\.\\d+)?", " ");
        String cleaned = noNumbers.replaceAll("[^\\p{L}\\s]", " ").trim();
        List<String> tokens = tokenize(cleaned);
        if (tokens.isEmpty()) return "";
        return String.join(" ", tokens).trim();
    }

    private List<String> tokenize(String text) {
        // 공백 기준 토큰 분리
        if (text == null || text.isBlank()) return List.of();
        String[] parts = text.trim().split("\\s+");
        List<String> out = new ArrayList<>();
        for (String p : parts) {
            if (!p.isBlank()) out.add(p);
        }
        return out;
    }

    private Set<String> matchByContainsMulti(String token, Map<String, Set<String>> mapping) {
        // 부분 일치 키워드에 대한 복수 canonical 매핑
        if (token == null || token.isBlank()) return Set.of();
        Set<String> out = new LinkedHashSet<>();
        for (Map.Entry<String, Set<String>> entry : mapping.entrySet()) {
            if (token.contains(entry.getKey())) {
                out.addAll(entry.getValue());
            }
        }
        return out;
    }

    private boolean isStopword(String token) {
        // 단위/원산지/형태 등 의미 없는 토큰 제거
        return switch (token) {
            case "g", "kg", "ml", "l", "mg", "oz", "lb",
                 "그램", "킬로그램", "밀리리터", "리터",
                 "분말", "가루", "엑기스", "추출물", "시럽", "농축액",
                 "국산", "수입산", "무첨가" -> true;
            default -> false;
        };
    }

    private Set<String> matchByContains(String token, Map<String, String> map) {
        // 포함 여부 기반 매칭(부분 문자열)
        Set<String> out = new LinkedHashSet<>();
        for (Map.Entry<String, String> entry : map.entrySet()) {
            String key = entry.getKey();
            if (key == null || key.isBlank()) continue;
            if (token.contains(key)) out.add(entry.getValue());
        }
        return out;
    }
}