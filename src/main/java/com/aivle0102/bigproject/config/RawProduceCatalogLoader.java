package com.aivle0102.bigproject.config;

import lombok.Getter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Component;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

@Component
public class RawProduceCatalogLoader {

    // 원재료성 식품 CSV 경로(기본값: resources/data/raw_produce_catalog.csv)
    @Value("${raw-produce.catalog-path:classpath:data/raw_produce_catalog.csv}")
    private Resource catalogResource;

    // 수산물 원재료 CSV 경로(기본값: resources/data/raw_produce_seafood_catalog.csv)
    @Value("${raw-produce.seafood-catalog-path:classpath:data/raw_produce_seafood_catalog.csv}")
    private Resource seafoodCatalogResource;

    // 원재료성 식품 사전(식품명/대표식품명/중분류/소분류 포함)
    @Getter
    private final Set<String> rawProduceNames = new HashSet<>();

    // 수산물 원재료 카테고리 사전(대표식품명/대분류/중분류)
    @Getter
    private final Map<String, SeafoodCategory> seafoodCategoryByName = new HashMap<>();

    @jakarta.annotation.PostConstruct
    public void load() {
        // CSV에서 "원재료성 식품"만 필터링해 사전 구축
        try (BufferedReader reader = new BufferedReader(
                new InputStreamReader(catalogResource.getInputStream(), StandardCharsets.UTF_8))) {
            String header = reader.readLine();
            if (header == null) return;

            List<String> headerCols = splitCsvLine(header);
            int nameIdx = headerCols.indexOf("식품명");
            int typeIdx = headerCols.indexOf("데이터구분명");
            int repIdx = headerCols.indexOf("대표식품명");
            int midIdx = headerCols.indexOf("식품중분류명");
            int subIdx = headerCols.indexOf("식품소분류명");
            if (nameIdx < 0 || typeIdx < 0) return;

            String line;
            while ((line = reader.readLine()) != null) {
                List<String> cols = splitCsvLine(line);
                if (cols.size() <= Math.max(nameIdx, typeIdx)) continue;

                String type = cols.get(typeIdx).trim();
                if (!"원재료성 식품".equals(type)) continue;

                // 관련 컬럼 값들을 모두 사전에 추가
                addIfNotBlank(cols, nameIdx);
                addIfNotBlank(cols, repIdx);
                addIfNotBlank(cols, midIdx);
                addIfNotBlank(cols, subIdx);
            }
        } catch (Exception e) {
            throw new IllegalStateException("Failed to load raw produce catalog from " + catalogResource, e);
        }

        // 수산물 원재료 CSV에서 카테고리 분류 사전 구축
        try (BufferedReader reader = new BufferedReader(
                new InputStreamReader(seafoodCatalogResource.getInputStream(), StandardCharsets.UTF_8))) {
            String header = reader.readLine();
            if (header == null) return;

            List<String> headerCols = splitCsvLine(header);
            int typeIdx = headerCols.indexOf("데이터구분명");
            int repIdx = headerCols.indexOf("대표식품명");
            int majorIdx = headerCols.indexOf("식품대분류명");
            int midIdx = headerCols.indexOf("식품중분류명");
            if (typeIdx < 0) return;

            String line;
            while ((line = reader.readLine()) != null) {
                List<String> cols = splitCsvLine(line);
                if (cols.size() <= typeIdx) continue;

                String type = cols.get(typeIdx).trim();
                if (!"원재료성 식품".equals(type)) continue;

                String rep = safe(cols, repIdx);
                String major = safe(cols, majorIdx);
                String mid = safe(cols, midIdx);
                SeafoodCategory category = classifySeafood(rep, major, mid);
                if (category == null) continue;

                addSeafoodIfNotBlank(rep, category);
                addSeafoodIfNotBlank(major, category);
                addSeafoodIfNotBlank(mid, category);
            }
        } catch (Exception e) {
            throw new IllegalStateException("Failed to load raw seafood catalog from " + seafoodCatalogResource, e);
        }
    }

    public boolean isRawProduce(String ingredientName) {
        if (ingredientName == null || ingredientName.isBlank()) return false;
        return rawProduceNames.contains(ingredientName.trim());
    }

    public Optional<SeafoodCategory> matchSeafoodCategory(String ingredientName) {
        if (ingredientName == null || ingredientName.isBlank()) return Optional.empty();
        SeafoodCategory category = seafoodCategoryByName.get(ingredientName.trim());
        return Optional.ofNullable(category);
    }

    // 컬럼 인덱스가 유효하고 값이 비어있지 않으면 사전에 추가
    private void addIfNotBlank(List<String> cols, int idx) {
        if (idx < 0 || idx >= cols.size()) return;
        String value = cols.get(idx).trim();
        if (!value.isEmpty()) {
            rawProduceNames.add(value);
        }
    }

    private void addSeafoodIfNotBlank(String value, SeafoodCategory category) {
        if (value == null) return;
        String key = value.trim();
        if (key.isEmpty()) return;
        SeafoodCategory existing = seafoodCategoryByName.get(key);
        if (existing == null || category.priority() < existing.priority()) {
            seafoodCategoryByName.put(key, category);
        }
    }

    private String safe(List<String> cols, int idx) {
        if (idx < 0 || idx >= cols.size()) return "";
        return cols.get(idx).trim();
    }

    private SeafoodCategory classifySeafood(String rep, String major, String mid) {
        String text = String.join(" ", rep, major, mid).toLowerCase(Locale.ROOT);

        if (containsAny(text, SHRIMP_KEYWORDS)) return SeafoodCategory.SHRIMP;
        if (containsAny(text, CRAB_KEYWORDS)) return SeafoodCategory.CRAB;
        if (containsAny(text, CRUSTACEAN_KEYWORDS)) return SeafoodCategory.CRUSTACEAN;
        if (containsAny(text, FISH_KEYWORDS)) return SeafoodCategory.FISH;
        if (containsAny(text, MOLLUSC_KEYWORDS)) return SeafoodCategory.MOLLUSC;
        if (containsAny(text, SEAWEED_KEYWORDS)) return SeafoodCategory.SEAWEED;

        return null;
    }

    private boolean containsAny(String text, List<String> keywords) {
        for (String k : keywords) {
            if (text.contains(k)) return true;
        }
        return false;
    }

    // 따옴표 포함 CSV 한 줄을 안전하게 분리
    private List<String> splitCsvLine(String line) {
        List<String> out = new ArrayList<>();
        StringBuilder current = new StringBuilder();
        boolean inQuotes = false;

        for (int i = 0; i < line.length(); i++) {
            char c = line.charAt(i);
            if (c == '"') {
                if (inQuotes && i + 1 < line.length() && line.charAt(i + 1) == '"') {
                    current.append('"');
                    i++;
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (c == ',' && !inQuotes) {
                out.add(current.toString());
                current.setLength(0);
            } else {
                current.append(c);
            }
        }
        out.add(current.toString());
        return out;
    }

    private static final List<String> SHRIMP_KEYWORDS = List.of("새우");
    private static final List<String> CRAB_KEYWORDS = List.of("게", "크랩");
    private static final List<String> CRUSTACEAN_KEYWORDS = List.of("갑각", "가재", "랍스터", "바닷가재", "킹크랩", "꽃게");
    private static final List<String> FISH_KEYWORDS = List.of(
            "어류", "생선", "연어", "참치", "고등어", "명태", "대구", "도미", "광어", "삼치", "전갱이", "멸치"
    );
    private static final List<String> MOLLUSC_KEYWORDS = List.of(
            "연체", "조개", "패류", "가리비", "굴", "전복", "오징어", "낙지", "문어", "주꾸미"
    );
    private static final List<String> SEAWEED_KEYWORDS = List.of(
            "해조", "해조류", "해초", "김", "미역", "다시마", "파래"
    );

    public enum SeafoodCategory {
        SHRIMP(1),
        CRAB(1),
        CRUSTACEAN(2),
        FISH(3),
        MOLLUSC(4),
        SEAWEED(5);

        private final int priority;

        SeafoodCategory(int priority) {
            this.priority = priority;
        }

        public int priority() {
            return priority;
        }
    }
}
