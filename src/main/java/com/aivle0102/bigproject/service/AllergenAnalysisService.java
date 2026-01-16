package com.aivle0102.bigproject.service;

import com.aivle0102.bigproject.client.HaccpCertImgClient;
import com.aivle0102.bigproject.config.AllergenCatalogLoader;
import com.aivle0102.bigproject.dto.*;
import com.aivle0102.bigproject.util.RecipeIngredientExtractor;
import com.fasterxml.jackson.databind.JsonNode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.*;

@Service
@RequiredArgsConstructor
public class AllergenAnalysisService {

    private final AllergenCatalogLoader allergenCatalogLoader;
    private final AllergenMatcher allergenMatcher;
    private final HaccpCertImgClient haccpClient;

    // HACCP 근거로 사용할 item 최대 개수(너무 많으면 응답이 과대해짐)
    private static final int MAX_EVIDENCE_ITEMS = 5;

    public AllergenAnalysisResponse analyze(ReportRequest request) {
        String recipe = request.getRecipe();
        String targetCountry = (request.getTargetCountry() == null) ? "" : request.getTargetCountry().toUpperCase(Locale.ROOT);

        List<String> obligation = allergenCatalogLoader.getCountryToAllergens().getOrDefault(targetCountry, List.of());

        // 1) 레시피 -> 재료 추출
        List<String> ingredients = RecipeIngredientExtractor.extractIngredients(recipe);

        // 2) (1) 직접 매칭
        Map<String, String> directMatched = new LinkedHashMap<>();
        List<String> remaining = new ArrayList<>();

        for (String ing : ingredients) {
            Optional<String> canonicalOpt = allergenMatcher.directMatchIngredientToCanonical(ing);
            if (canonicalOpt.isPresent()) {
                String canonical = canonicalOpt.get();
                // 타겟국가 의무 항목에 있는 경우만 확정
                if (obligation.contains(canonical) || isCompatibleCanonical(canonical, obligation)) {
                    directMatched.put(normalizeCanonicalForCountry(canonical, obligation), ing);
                } else {
                    // 다른 국가에서는 의무가 아닐 수 있으니 남겨둠
                    remaining.add(ing);
                }
            } else {
                remaining.add(ing);
            }
        }

        // 3) (2) 남은 재료들 HACCP prdkind 탐색 검색
        List<IngredientEvidence> evidences = new ArrayList<>();
        Set<String> finalAllergens = new LinkedHashSet<>(directMatched.keySet());

        for (String ing : remaining) {
            IngredientEvidence ev = analyzeIngredientViaHaccp(ing, obligation);
            evidences.add(ev);
            if (ev.getMatchedAllergensForTargetCountry() != null) {
                finalAllergens.addAll(ev.getMatchedAllergensForTargetCountry());
            }
        }

        return AllergenAnalysisResponse.builder()
                .targetCountry(targetCountry)
                .extractedIngredients(ingredients)
                .directMatchedAllergens(directMatched)
                .haccpSearchEvidences(evidences)
                .finalMatchedAllergens(new ArrayList<>(finalAllergens))
                .note("본 결과는 HACCP OpenAPI를 prdkind(식품유형명)로 '탐색 기반 검색'하여 얻은 제품 라벨 정보(allergy/rawmtrl)를 근거로, 타겟 국가의 알레르기 의무표기 목록과 '매칭'한 것입니다. 추론은 수행하지 않으며, 검색 결과가 없으면 NOT_FOUND로 종료합니다.")
                .build();
    }

    private IngredientEvidence analyzeIngredientViaHaccp(String ingredient, List<String> obligation) {
        // HACCP 호출
        JsonNode root = haccpClient.searchByPrdkind(ingredient, 1, 20);

        // ===
        // 디버깅용 코드
        System.out.println("[DEBUG] HACCP ROOT = " + root);
        System.out.println("[DEBUG] HACCP ROOT keys = " + root.fieldNames().toString());
        // ===

        // 응답 구조는 기관별로 wrapper가 달라질 수 있어 JsonNode로 방어적으로 접근
        List<JsonNode> items = extractItems(root);

        if (items.isEmpty()) {
            // (3) NOT_FOUND
            return IngredientEvidence.builder()
                    .ingredient(ingredient)
                    .searchStrategy("HACCP_PRDKIND_EXPLORATORY")
                    .evidences(List.of())
                    .matchedAllergensForTargetCountry(List.of())
                    .status("NOT_FOUND")
                    .build();
        }

        // item들 중 상위 N개만 근거로 남김
        List<HaccpProductEvidence> productEvidences = new ArrayList<>();
        Set<String> canonicalCandidates = new LinkedHashSet<>();

        int count = 0;
        for (JsonNode item : items) {
            if (count >= MAX_EVIDENCE_ITEMS) break;

            String prdlstReportNo = text(item, "prdlstReportNo");
            String prdlstNm = text(item, "prdlstNm");
            String prdkind = text(item, "prdkind");
            String allergyRaw = text(item, "allergy");
            String rawmtrlRaw = text(item, "rawmtrl");

            productEvidences.add(HaccpProductEvidence.builder()
                    .prdlstReportNo(prdlstReportNo)
                    .prdlstNm(prdlstNm)
                    .prdkind(prdkind)
                    .allergyRaw(allergyRaw)
                    .rawmtrlRaw(rawmtrlRaw)
                    .build());

            // (2) allergy가 있으면 그걸 우선으로 canonical 후보 추출
            if (allergyRaw != null && !allergyRaw.isBlank()) {
                canonicalCandidates.addAll(allergenMatcher.extractCanonicalFromHaccpAllergyText(allergyRaw));
            } else {
                // allergy 비어있으면 rawmtrl도 "근거 텍스트"로만 가져오지만,
                // 여기서 rawmtrl을 파싱해 알레르기 추론하면 안 됨.
                // => canonicalCandidates는 늘리지 않음(추론 금지).
            }

            count++;
        }

        // 타겟국가 의무 알레르기 목록으로 필터
        List<String> matched = allergenMatcher.filterByCountryObligation(canonicalCandidates, obligation);

        return IngredientEvidence.builder()
                .ingredient(ingredient)
                .searchStrategy("HACCP_PRDKIND_EXPLORATORY")
                .evidences(productEvidences)
                .matchedAllergensForTargetCountry(matched)
                .status("FOUND")
                .build();
    }

    private List<JsonNode> extractItems(JsonNode root) {
        List<JsonNode> candidates = new ArrayList<>();

        /*
         * HACCP XML -> JsonNode 구조 정리
         *
         * <response>
         *   <header>...</header>
         *   <body>
         *     <items>
         *       <item>...</item>
         *       <item>...</item>
         *     </items>
         *   </body>
         * </response>
         */

        // 1️⃣ response → body 안전 접근
        JsonNode body = root.path("response").isMissingNode()
                ? root.path("body")
                : root.path("response").path("body");

        if (body.isMissingNode() || body.isNull()) {
            return candidates;
        }

        // 2️⃣ items
        JsonNode itemsNode = body.path("items");
        if (itemsNode.isMissingNode() || itemsNode.isNull()) {
            return candidates;
        }

        // 3️⃣ items.item (배열 or 단일 객체)
        JsonNode itemNode = itemsNode.path("item");

        if (itemNode.isArray()) {
            itemNode.forEach(candidates::add);
        } else if (itemNode.isObject()) {
            candidates.add(itemNode);
        }

        return candidates;
    }


    private String text(JsonNode node, String field) {
        JsonNode v = node.get(field);
        return (v == null || v.isNull()) ? null : v.asText();
    }

    private boolean isCompatibleCanonical(String canonical, List<String> obligation) {
        // 제한적 호환(용어차이 흡수)
        if (canonical.equals("Crustaceans") && obligation.contains("Crustacean shellfish")) return true;
        return false;
    }

    private String normalizeCanonicalForCountry(String canonical, List<String> obligation) {
        if (canonical.equals("Crustaceans") && obligation.contains("Crustacean shellfish")) return "Crustacean shellfish";
        return canonical;
    }
}
