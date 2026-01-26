// 가공식품 분류 카탈로그를 로딩해 HACCP 검색 후보 생성에 사용한다.
// 품목명/대표식품명/분류 정보를 메모리로 제공한다.
package com.aivle0102.bigproject.config;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.Getter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Component;

import java.io.InputStream;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.LinkedHashSet;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

@Component
public class ProcessedFoodsCatalogLoader {

    private static final double PRDKIND_THRESHOLD = 0.80;
    private static final double PRDLSTNM_THRESHOLD = 0.75;
    private static final int MAX_CANDIDATES = 5;

    private static final List<String> DAIRY_CATEGORY_HINTS = List.of(
            "유제품",
            "유가공",
            "치즈",
            "버터"
    );

    @Value("${processed-foods.catalog-path:classpath:data/processed_foods_catalog.json}")
    private Resource catalogResource;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Getter
    private List<ProcessedFoodEntry> entries = List.of();

    @jakarta.annotation.PostConstruct
    public void load() {
        List<ProcessedFoodEntry> out = new ArrayList<>();
        try (InputStream is = catalogResource.getInputStream()) {
            JsonNode root = objectMapper.readTree(is);
            if (root != null && root.isArray()) {
                for (JsonNode node : root) {
                    String processedName = text(node, "가공식품품목명");
                    String representativeName = text(node, "대표식품명");
                    String majorCategory = text(node, "식품대분류명");
                    String minorCategory = text(node, "식품소분류명");

                    out.add(new ProcessedFoodEntry(
                            processedName,
                            representativeName,
                            majorCategory,
                            minorCategory
                    ));
                }
            }
        } catch (Exception e) {
            throw new IllegalStateException("Failed to load processed foods catalog from " + catalogResource, e);
        }

        this.entries = out;
    }

    public Optional<String> matchDirectFromCatalog(String ingredientName) {
        if (ingredientName == null || ingredientName.isBlank()) return Optional.empty();
        String normalized = normalizeForCompare(ingredientName);
        if (normalized.isBlank()) return Optional.empty();

        for (ProcessedFoodEntry e : entries) {
            String processed = normalizeForCompare(e.getProcessedName());
            String representative = normalizeForCompare(e.getRepresentativeName());

            if (!normalized.isBlank() &&
                    (normalized.equals(processed) || normalized.equals(representative))) {
                if (isDairyCategory(e)) {
                    return Optional.of("Milk");
                }
            }
        }

        return Optional.empty();
    }

    public CatalogSearchPlan buildSearchPlan(String ingredientName) {
        if (ingredientName == null || ingredientName.isBlank()) {
            return new CatalogSearchPlan(List.of(), List.of());
        }

        String normalized = normalizeForCompare(ingredientName);
        if (normalized.isBlank()) {
            return new CatalogSearchPlan(List.of(), List.of());
        }

        Map<String, Double> prdkindScores = new HashMap<>();
        Map<String, Double> prdlstScores = new HashMap<>();

        for (ProcessedFoodEntry e : entries) {
            String processed = safe(e.getProcessedName());
            String representative = safe(e.getRepresentativeName());

            double processedScore = similarityScore(normalized, normalizeForCompare(processed));
            double repScore = similarityScore(normalized, normalizeForCompare(representative));

            if (!processed.isBlank() && processedScore >= PRDKIND_THRESHOLD) {
                prdkindScores.merge(processed, processedScore, Math::max);
            }
            if (!representative.isBlank() && repScore >= PRDLSTNM_THRESHOLD) {
                prdlstScores.merge(representative, repScore, Math::max);
            }
        }

        List<String> prdkindCandidates = topCandidates(prdkindScores, MAX_CANDIDATES);
        List<String> prdlstNmCandidates = topCandidates(prdlstScores, MAX_CANDIDATES);

        return new CatalogSearchPlan(prdkindCandidates, prdlstNmCandidates);
    }

    private boolean isDairyCategory(ProcessedFoodEntry e) {
        String major = safe(e.getMajorCategory());
        String minor = safe(e.getMinorCategory());
        for (String hint : DAIRY_CATEGORY_HINTS) {
            if (major.contains(hint) || minor.contains(hint)) return true;
        }
        return false;
    }

    private List<String> topCandidates(Map<String, Double> scores, int max) {
        return scores.entrySet().stream()
                .sorted((a, b) -> Double.compare(b.getValue(), a.getValue()))
                .limit(max)
                .map(Map.Entry::getKey)
                .toList();
    }

    private double similarityScore(String a, String b) {
        if (a.isBlank() || b.isBlank()) return 0.0;
        if (a.equals(b)) return 1.0;

        double containsScore = (a.contains(b) || b.contains(a)) ? 0.9 : 0.0;
        double jaccard = jaccardScore(a, b);
        double edit = normalizedEditScore(a, b);
        return Math.max(containsScore, Math.max(jaccard, edit));
    }

    private double jaccardScore(String a, String b) {
        Set<String> at = tokenize(a);
        Set<String> bt = tokenize(b);
        if (at.isEmpty() || bt.isEmpty()) return 0.0;

        Set<String> inter = new HashSet<>(at);
        inter.retainAll(bt);
        Set<String> union = new HashSet<>(at);
        union.addAll(bt);
        return union.isEmpty() ? 0.0 : ((double) inter.size() / (double) union.size());
    }

    private double normalizedEditScore(String a, String b) {
        int maxLen = Math.max(a.length(), b.length());
        if (maxLen == 0) return 0.0;
        int dist = levenshtein(a, b);
        return 1.0 - ((double) dist / (double) maxLen);
    }

    private int levenshtein(String a, String b) {
        int[] prev = new int[b.length() + 1];
        int[] curr = new int[b.length() + 1];

        for (int j = 0; j <= b.length(); j++) {
            prev[j] = j;
        }

        for (int i = 1; i <= a.length(); i++) {
            curr[0] = i;
            for (int j = 1; j <= b.length(); j++) {
                int cost = (a.charAt(i - 1) == b.charAt(j - 1)) ? 0 : 1;
                curr[j] = Math.min(
                        Math.min(curr[j - 1] + 1, prev[j] + 1),
                        prev[j - 1] + cost
                );
            }
            int[] tmp = prev;
            prev = curr;
            curr = tmp;
        }
        return prev[b.length()];
    }

    private Set<String> tokenize(String text) {
        String normalized = text.replaceAll("[^\\p{L}\\p{Nd}]+", " ").trim();
        if (normalized.isBlank()) return Set.of();
        return new LinkedHashSet<>(Arrays.asList(normalized.split("\\s+")));
    }

    private String normalizeForCompare(String text) {
        if (text == null) return "";
        String cleaned = text.toLowerCase(Locale.ROOT)
                .replaceAll("[^\\p{L}\\p{Nd}]+", "")
                .trim();
        return cleaned;
    }

    private String safe(String text) {
        return text == null ? "" : text.trim();
    }

    private String text(JsonNode node, String key) {
        if (node == null) return null;
        JsonNode v = node.get(key);
        return (v == null || v.isNull()) ? null : v.asText();
    }

    public static class ProcessedFoodEntry {
        private final String processedName;
        private final String representativeName;
        private final String majorCategory;
        private final String minorCategory;

        public ProcessedFoodEntry(String processedName, String representativeName, String majorCategory, String minorCategory) {
            this.processedName = processedName;
            this.representativeName = representativeName;
            this.majorCategory = majorCategory;
            this.minorCategory = minorCategory;
        }

        public String getProcessedName() {
            return processedName;
        }

        public String getRepresentativeName() {
            return representativeName;
        }

        public String getMajorCategory() {
            return majorCategory;
        }

        public String getMinorCategory() {
            return minorCategory;
        }
    }

    public record CatalogSearchPlan(List<String> prdkindCandidates, List<String> prdlstNmCandidates) {}
}