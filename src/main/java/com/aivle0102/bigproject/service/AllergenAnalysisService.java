package com.aivle0102.bigproject.service;

import com.aivle0102.bigproject.client.HaccpCertImgClient;
import com.aivle0102.bigproject.config.AllergenCatalogLoader;
import com.aivle0102.bigproject.config.ProcessedFoodsCatalogLoader;
import com.aivle0102.bigproject.config.RawProduceCatalogLoader;
import com.aivle0102.bigproject.dto.AllergenAnalysisResponse;
import com.aivle0102.bigproject.dto.HaccpProductEvidence;
import com.aivle0102.bigproject.dto.IngredientEvidence;
import com.aivle0102.bigproject.dto.ReportRequest;
import com.aivle0102.bigproject.util.RecipeIngredientExtractor;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.logging.Logger;

@Service
@RequiredArgsConstructor
public class AllergenAnalysisService {

    // 레시피 재료를 알레르기 기준으로 분석하는 서비스.
    // 원재료성 식품 여부를 먼저 확인하고, 알레르기 원재료만 통과시킨다.
    // 이후 HACCP 검색 및 AI 보조로 근거 기반 매칭을 수행한다.
    private static final Logger LOGGER = Logger.getLogger(AllergenAnalysisService.class.getName());
    private static final int MAX_EVIDENCE_ITEMS = 5;
    private static final int PRDKIND_NUM_OF_ROWS = 3;

    private final AllergenCatalogLoader allergenCatalogLoader;
    private final AllergenMatcher allergenMatcher;
    private final HaccpCertImgClient haccpClient;
    private final ProcessedFoodsCatalogLoader processedFoodsCatalogLoader;
    private final RawProduceCatalogLoader rawProduceCatalogLoader;

    @Value("${openai.api-key}")
    private String openAiApiKey;

    @Value("${openai.model:gpt-4.1-mini}")
    private String openAiModel;

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final RestTemplate restTemplate = new RestTemplate();

    public AllergenAnalysisResponse analyze(ReportRequest request) {
        // 입력 레시피에서 재료를 추출하고 국가별 의무 알레르기 목록 로드
        String recipe = request.getRecipe();
        String targetCountry = (request.getTargetCountry() == null) ? "" : request.getTargetCountry().toUpperCase(Locale.ROOT);

        List<String> obligation = allergenCatalogLoader.getCountryToAllergens().getOrDefault(targetCountry, List.of());
        List<String> ingredients = RecipeIngredientExtractor.extractIngredients(recipe);

        Map<String, String> directMatched = new LinkedHashMap<>();
        List<String> remaining = new ArrayList<>();
        List<IngredientEvidence> skippedEvidences = new ArrayList<>();

        for (String ing : ingredients) {
            // 0) 다중 알레르기 성분이 명확한 재료는 우선 확정
            Set<String> multiCanonicals = allergenMatcher.directMultiMatchIngredientToCanonical(ing);
            if (!multiCanonicals.isEmpty()) {
                for (String canonical : multiCanonicals) {
                    addDirectIfObligated(canonical, ing, obligation, directMatched);
                }
                continue;
            }

            // 0-1) 수산물 원재료 카탈로그 분류(생선/갑각류/연체/해조 등)
            RawProduceCatalogLoader.SeafoodCategory seafoodCategory =
                    rawProduceCatalogLoader.matchSeafoodCategory(ing).orElse(null);
            if (seafoodCategory != null) {
                LOGGER.info(() -> "RAW_PRODUCE_SEAFOOD 판단: ingredient=" + ing + " category=" + seafoodCategory);
                if (addSeafoodDirectMatches(seafoodCategory, ing, obligation, directMatched)) {
                    continue;
                }
                skippedEvidences.add(IngredientEvidence.builder()
                        .ingredient(ing)
                        .searchStrategy("RAW_PRODUCE_SEAFOOD_NON_ALLERGEN:" + seafoodCategory)
                        .evidences(List.of())
                        .matchedAllergensForTargetCountry(List.of())
                        .status("SKIPPED_RAW_PRODUCE_NON_ALLERGEN")
                        .build());
                continue;
            }

            // 1) 원재료성 식품 여부를 먼저 판단
            boolean isRawProduce = rawProduceCatalogLoader.isRawProduce(ing);
            if (isRawProduce) {
                LOGGER.info(() -> "RAW_PRODUCE 판단: ingredient=" + ing);
                // 원재료성 식품 중 알레르기 원재료만 통과
                Optional<String> canonicalOpt = allergenMatcher.directMatchIngredientToCanonical(ing);
                if (canonicalOpt.isPresent()) {
                    String canonical = canonicalOpt.get();
                    if (addDirectIfObligated(canonical, ing, obligation, directMatched)) {
                        continue;
                    }
                }
                skippedEvidences.add(IngredientEvidence.builder()
                        .ingredient(ing)
                        .searchStrategy("RAW_PRODUCE_CATALOG_NON_ALLERGEN")
                        .evidences(List.of())
                        .matchedAllergensForTargetCountry(List.of())
                        .status("SKIPPED_RAW_PRODUCE_NON_ALLERGEN")
                        .build());
                continue;
            }

            // 2) 원재료성 식품이 아니라면 직접 매핑/가공식품 카탈로그 매칭 시도
            Optional<String> canonicalOpt = allergenMatcher.directMatchIngredientToCanonical(ing);
            if (canonicalOpt.isEmpty()) {
                canonicalOpt = processedFoodsCatalogLoader.matchDirectFromCatalog(ing);
            }
            if (canonicalOpt.isPresent()) {
                String canonical = canonicalOpt.get();
                if (!addDirectIfObligated(canonical, ing, obligation, directMatched)) {
                    remaining.add(ing);
                }
            } else {
                remaining.add(ing);
            }
        }

        List<IngredientEvidence> evidences = new ArrayList<>(skippedEvidences);
        Set<String> finalAllergens = new LinkedHashSet<>(directMatched.keySet());

        for (String ing : remaining) {
            // 3) HACCP 기반 근거 매칭
            IngredientEvidence ev = analyzeIngredientViaHaccp(ing, obligation);
            if (ev.getMatchedAllergensForTargetCountry() == null || ev.getMatchedAllergensForTargetCountry().isEmpty()) {
                IngredientEvidence fallback = analyzeIngredientViaCatalogFallback(ing, obligation);
                if ((fallback.getMatchedAllergensForTargetCountry() != null && !fallback.getMatchedAllergensForTargetCountry().isEmpty())
                        || (fallback.getEvidences() != null && !fallback.getEvidences().isEmpty())) {
                    ev = fallback;
                }
            }
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
                .note("HACCP prdkind/prdlstNm 검색과 allergy/rawmtrl 기반 매칭 결과입니다. 추론은 하지 않으며, 검색 결과가 없으면 NOT_FOUND로 종료합니다.")
                .build();
    }

    private IngredientEvidence analyzeIngredientViaHaccp(String ingredient, List<String> obligation) {
        // prdkind 기본 검색 -> 실패 시 동의어 확장
        List<JsonNode> items = searchItemsByQueries(List.of(ingredient));
        boolean expanded = false;

        if (items.isEmpty()) {
            List<String> expandedQueries = allergenMatcher.buildPrdkindQueries(ingredient);
            if (!expandedQueries.isEmpty()) {
                items = searchItemsByQueries(expandedQueries);
                expanded = true;
            }
        }

        return buildEvidenceFromItems(
                ingredient,
                items,
                obligation,
                expanded ? "HACCP_PRDKIND_QUERY_EXPANDED" : "HACCP_PRDKIND_EXPLORATORY"
        );
    }

    private IngredientEvidence analyzeIngredientViaCatalogFallback(String ingredient, List<String> obligation) {
        // prdlstNm 정확 일치 -> catalog 후보 -> AI 후보 순으로 탐색
        List<JsonNode> items = searchItemsByPrdlstNmQueries(List.of(ingredient));
        items = filterExactPrdlstNmMatches(items, List.of(ingredient), true);
        String strategy = "PRDLSTNM_INGREDIENT_EXACT";

        if (items.isEmpty()) {
            ProcessedFoodsCatalogLoader.CatalogSearchPlan plan = processedFoodsCatalogLoader.buildSearchPlan(ingredient);

            List<String> prdkindCandidates = plan.prdkindCandidates();
            List<String> prdlstNmCandidates = plan.prdlstNmCandidates();

            LOGGER.info(() -> "STEP3 catalog fallback for ingredient=" + ingredient
                    + " prdkindCandidates=" + prdkindCandidates
                    + " prdlstNmCandidates=" + prdlstNmCandidates);

            items = searchItemsByQueries(prdkindCandidates);
            strategy = "CATALOG_PRDKIND_SIMILARITY";

            if (items.isEmpty()) {
                LOGGER.info(() -> "STEP3 prdkind search empty; switching to prdlstNm for ingredient=" + ingredient);
                items = searchItemsByPrdlstNmQueries(prdlstNmCandidates);
                strategy = "CATALOG_PRDLSTNM_SIMILARITY";
                items = filterExactPrdlstNmMatches(items, prdlstNmCandidates, true);
            }
        }

        if (items.isEmpty()) {
            List<String> aiCandidates = expandPrdlstNmCandidates(
                    ingredient,
                    List.of(),
                    List.of()
            );
            if (!aiCandidates.isEmpty()) {
                LOGGER.info(() -> "STEP3 AI fallback for ingredient=" + ingredient + " prdlstNmCandidates=" + aiCandidates);
                items = searchItemsByPrdlstNmQueries(aiCandidates);
                strategy = "AI_PRDLSTNM_EXPANSION";
                items = filterExactPrdlstNmMatches(items, aiCandidates, true);
            }
        }

        return buildEvidenceFromItems(ingredient, items, obligation, strategy);
    }

    private IngredientEvidence buildEvidenceFromItems(String ingredient, List<JsonNode> items, List<String> obligation, String strategy) {
        // HACCP 결과에서 allergy/rawmtrl 근거 기반 매칭
        if (items == null || items.isEmpty()) {
            return IngredientEvidence.builder()
                    .ingredient(ingredient)
                    .searchStrategy(strategy)
                    .evidences(List.of())
                    .matchedAllergensForTargetCountry(List.of())
                    .status("NOT_FOUND")
                    .build();
        }

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

            boolean exactProductMatch = isExactProductMatch(ingredient, prdlstNm);
            boolean unknownAllergy = isUnknownAllergy(allergyRaw);
            if (!unknownAllergy && exactProductMatch) {
                canonicalCandidates.addAll(allergenMatcher.extractCanonicalFromHaccpAllergyText(allergyRaw));
            } else if (rawmtrlRaw != null && !rawmtrlRaw.isBlank()) {
                List<String> related = extractRelatedRawmtrlTokens(ingredient, rawmtrlRaw);
                if (!related.isEmpty()) {
                    canonicalCandidates.addAll(allergenMatcher.extractCanonicalFromTokens(related));
                } else if (exactProductMatch && !unknownAllergy) {
                    canonicalCandidates.addAll(allergenMatcher.extractCanonicalFromHaccpAllergyText(allergyRaw));
                } else {
                    // Avoid over-matching for non-exact products.
                }
            }

            count++;
        }

        List<String> matched = allergenMatcher.filterByCountryObligation(canonicalCandidates, obligation);

        return IngredientEvidence.builder()
                .ingredient(ingredient)
                .searchStrategy(strategy)
                .evidences(productEvidences)
                .matchedAllergensForTargetCountry(matched)
                .status("FOUND")
                .build();
    }

    private List<JsonNode> searchItemsByQueries(List<String> queries) {
        // prdkind 검색(결과 수 제한 적용)
        List<JsonNode> items = new ArrayList<>();
        Set<String> seenReportNos = new HashSet<>();

        for (String query : queries) {
            if (query == null || query.isBlank()) continue;
            JsonNode root = haccpClient.searchByPrdkind(query, 1, PRDKIND_NUM_OF_ROWS);
            for (JsonNode item : extractItems(root)) {
                String reportNo = text(item, "prdlstReportNo");
                if (reportNo != null && !reportNo.isBlank()) {
                    if (!seenReportNos.add(reportNo)) continue;
                }
                items.add(item);
            }
        }

        return items;
    }

    private List<JsonNode> searchItemsByPrdlstNmQueries(List<String> queries) {
        // prdlstNm 검색(정확 일치 필터와 함께 사용)
        List<JsonNode> items = new ArrayList<>();
        Set<String> seenReportNos = new HashSet<>();

        for (String query : queries) {
            if (query == null || query.isBlank()) continue;
            JsonNode root = haccpClient.searchByPrdlstNm(query, 1, 20);
            for (JsonNode item : extractItems(root)) {
                String reportNo = text(item, "prdlstReportNo");
                if (reportNo != null && !reportNo.isBlank()) {
                    if (!seenReportNos.add(reportNo)) continue;
                }
                items.add(item);
            }
        }

        return items;
    }

    private List<JsonNode> filterExactPrdlstNmMatches(List<JsonNode> items, List<String> queries, boolean requireExact) {
        // prdlstNm 정확 일치만 남기거나(필수 옵션), 아니면 원본 유지
        if (items == null || items.isEmpty()) return items;
        if (queries == null || queries.isEmpty()) return items;

        Set<String> querySet = new HashSet<>();
        for (String q : queries) {
            if (q != null && !q.isBlank()) querySet.add(q.trim());
        }
        if (querySet.isEmpty()) return items;

        List<JsonNode> exact = new ArrayList<>();
        for (JsonNode item : items) {
            String name = text(item, "prdlstNm");
            if (name != null && querySet.contains(name.trim())) {
                exact.add(item);
            }
        }
        if (!exact.isEmpty()) {
            LOGGER.info(() -> "STEP3 prdlstNm exact matches=" + exact.size());
            return exact;
        }
        return requireExact ? List.of() : items;
    }

    private List<JsonNode> extractItems(JsonNode root) {
        // HACCP 응답에서 items 배열/객체를 안전하게 추출
        List<JsonNode> candidates = new ArrayList<>();

        JsonNode body = root.path("response").isMissingNode()
                ? root.path("body")
                : root.path("response").path("body");

        if (body.isMissingNode() || body.isNull()) {
            return candidates;
        }

        JsonNode itemsNode = body.path("items");
        if (itemsNode.isMissingNode() || itemsNode.isNull()) {
            return candidates;
        }

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

    private boolean isUnknownAllergy(String allergyRaw) {
        // 알수없음/공백 처리
        if (allergyRaw == null) return true;
        String trimmed = allergyRaw.trim();
        if (trimmed.isEmpty()) return true;
        String normalized = trimmed.replace(" ", "");
        return normalized.contains("알수없음") || normalized.contains("알수없");
    }

    private boolean isExactProductMatch(String ingredient, String prdlstNm) {
        // 재료명과 제품명이 완전히 동일한 경우만 true
        if (ingredient == null || prdlstNm == null) return false;
        String a = ingredient.trim();
        String b = prdlstNm.trim();
        if (a.isEmpty() || b.isEmpty()) return false;
        return a.equals(b);
    }

    private List<String> expandPrdlstNmCandidates(String ingredient, List<String> prdkindHints, List<String> prdlstNmHints) {
        // AI로 prdlstNm 후보 생성
        if (ingredient == null || ingredient.isBlank()) return List.of();

        String prompt = "재료: " + ingredient + "\n"
                + "기존 prdkind 힌트: " + safeList(prdkindHints) + "\n"
                + "기존 prdlstNm 힌트: " + safeList(prdlstNmHints) + "\n"
                + "HACCP prdlstNm 검색에 사용할 실제 제품명/식품명을 3~5개 생성해줘.\n"
                + "규칙:\n"
                + "- 짧은 명사형 제품명만 반환\n"
                + "- 기존 재료명에 덧붙이는 식이 아닌 다른 유의어, 동의어로 생성할 것 (예: 달걀, 계란, 반숙란과 같이 변형되었으나 동일한 의미를 가지는 형태)"
                + "- HACCP, 인증, 기준, 관리, 적용, 제품, 식품, 안전 같은 단어 포함 금지\n"
                + "- 결과는 JSON 배열만 반환";

        return callOpenAiForJsonArray(prompt);
    }

    private List<String> extractRelatedRawmtrlTokens(String ingredient, String rawmtrlRaw) {
        // AI로 재료와 직접 관련된 rawmtrl 키워드만 추출
        if (ingredient == null || ingredient.isBlank()) return List.of();
        if (rawmtrlRaw == null || rawmtrlRaw.isBlank()) return List.of();

        String prompt = "재료: " + ingredient + "\n"
                + "원재료: " + rawmtrlRaw + "\n"
                + "재료와 직접 관련된 원재료/알레르기 키워드만 추출해줘.\n"
                + "- 재료와 무관한 부재료는 제외\n"
                + "- 재료와 관련된 알레르기 키워드의 경우 재료(구성성분) 또는, 재료[구성성분] 과 같은 형태로 존재함."
                + "- 복합 제품이면 재료(예: 고추장) 구성 성분만 선택\n"
                + "결과는 JSON 배열만 반환";

        return callOpenAiForJsonArray(prompt);
    }

    private List<String> callOpenAiForJsonArray(String prompt) {
        // OpenAI 호출 후 JSON 배열 형태로 파싱
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(openAiApiKey);

        Map<String, Object> body = Map.of(
                "model", openAiModel,
                "temperature", 0.2,
                "max_tokens", 200,
                "messages", List.of(
                        Map.of("role", "system", "content",
                                "한국어로 JSON 배열만 반환하세요. 설명 금지."),
                        Map.of("role", "user", "content", prompt)
                )
        );

        HttpEntity<Map<String, Object>> req = new HttpEntity<>(body, headers);
        ResponseEntity<String> resp = restTemplate.postForEntity(
                "https://api.openai.com/v1/chat/completions",
                req,
                String.class
        );

        String content = extractContent(resp.getBody());
        return postProcessCandidates(parseJsonArray(content));
    }

    private String extractContent(String body) {
        if (body == null || body.isBlank()) return "[]";
        try {
            JsonNode root = objectMapper.readTree(body);
            return root.path("choices").path(0).path("message").path("content").asText("[]");
        } catch (Exception e) {
            return "[]";
        }
    }

    private List<String> parseJsonArray(String content) {
        if (content == null || content.isBlank()) return List.of();
        try {
            JsonNode node = objectMapper.readTree(content);
            if (node.isArray()) {
                List<String> out = new ArrayList<>();
                for (JsonNode n : node) {
                    if (n.isTextual()) {
                        String v = n.asText().trim();
                        if (!v.isEmpty()) out.add(v);
                    }
                }
                return out;
            }
        } catch (Exception ignored) {
        }
        return List.of();
    }

    private List<String> postProcessCandidates(List<String> raw) {
        // 금지어/길이 기준 후처리
        if (raw == null || raw.isEmpty()) return List.of();
        List<String> banned = List.of("HACCP", "인증", "기준", "관리", "적용", "제품", "식품", "안전");
        List<String> out = new ArrayList<>();
        for (String v : raw) {
            String cleaned = v.trim();
            if (cleaned.isEmpty()) continue;
            boolean bannedHit = false;
            for (String b : banned) {
                if (cleaned.contains(b)) {
                    bannedHit = true;
                    break;
                }
            }
            if (bannedHit) continue;
            cleaned = cleaned.replaceAll("\\s+", "");
            if (cleaned.length() < 2 || cleaned.length() > 12) continue;
            if (!out.contains(cleaned)) out.add(cleaned);
        }
        return out;
    }

    private String safeList(List<String> items) {
        if (items == null || items.isEmpty()) return "[]";
        return items.toString();
    }

    private boolean isCompatibleCanonical(String canonical, List<String> obligation) {
        if (canonical.equals("Crustaceans") && obligation.contains("Crustacean shellfish")) return true;
        return false;
    }

    private String normalizeCanonicalForCountry(String canonical, List<String> obligation) {
        if (canonical.equals("Crustaceans") && obligation.contains("Crustacean shellfish")) return "Crustacean shellfish";
        return canonical;
    }

    private boolean addDirectIfObligated(String canonical, String ingredient, List<String> obligation, Map<String, String> directMatched) {
        // 국가 의무 알레르기 목록에 해당하면 directMatched에 추가
        if (obligation.contains(canonical) || isCompatibleCanonical(canonical, obligation)) {
            directMatched.put(normalizeCanonicalForCountry(canonical, obligation), ingredient);
            return true;
        }
        return false;
    }

    private boolean addSeafoodDirectMatches(
            RawProduceCatalogLoader.SeafoodCategory category,
            String ingredient,
            List<String> obligation,
            Map<String, String> directMatched
    ) {
        return switch (category) {
            case FISH -> addDirectIfObligated("Fish", ingredient, obligation, directMatched);
            case CRUSTACEAN -> addDirectIfObligated("Crustaceans", ingredient, obligation, directMatched);
            case SHRIMP -> {
                boolean matched = addDirectIfObligated("Crustaceans", ingredient, obligation, directMatched);
                if (obligation.contains("Shrimp")) {
                    directMatched.put("Shrimp", ingredient);
                    matched = true;
                }
                yield matched;
            }
            case CRAB -> {
                boolean matched = addDirectIfObligated("Crustaceans", ingredient, obligation, directMatched);
                if (obligation.contains("Crab")) {
                    directMatched.put("Crab", ingredient);
                    matched = true;
                }
                yield matched;
            }
            case MOLLUSC, SEAWEED -> false;
        };
    }
}
