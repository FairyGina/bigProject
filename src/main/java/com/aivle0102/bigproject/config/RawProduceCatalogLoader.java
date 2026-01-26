// 원재료성 식품/수산물 카탈로그를 로딩해 빠른 매칭용 사전을 구성한다.
// 원재료성 식품은 JSON, 수산물은 분류 JSON으로 카테고리를 매칭한다.
package com.aivle0102.bigproject.config;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.Getter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

@Component
public class RawProduceCatalogLoader {

    // 원재료성 식품 JSON 경로(기본값: resources/data/raw_produce_catalog.json)
    @Value("${raw-produce.catalog-path:classpath:data/raw_produce_catalog.json}")
    private Resource catalogResource;

    // 수산물 분류 JSON 경로(기본값: resources/data/raw_produce_seafood_category.json)
    @Value("${raw-produce.seafood-category-path:classpath:data/raw_produce_seafood_category.json}")
    private Resource seafoodCategoryResource;

    // 원재료성 식품 사전(식품명/대표식품명/중분류/소분류 포함)
    @Getter
    private final Set<String> rawProduceNames = new HashSet<>();

    // 수산물 분류 사전(식품명 -> 카테고리)
    @Getter
    private final Map<String, SeafoodCategory> seafoodCategoryByName = new HashMap<>();

    private final ObjectMapper objectMapper = new ObjectMapper();

    @jakarta.annotation.PostConstruct
    public void load() {
        loadRawProduceJson();
        loadSeafoodCategoryJson();
    }

    private void loadRawProduceJson() {
        try {
            JsonNode root = objectMapper.readTree(catalogResource.getInputStream());
            if (root == null || !root.isArray()) return;

            for (JsonNode node : root) {
                String type = normalizeKey(text(node, "식품기원명"));
                if (type.isEmpty()) continue;
                if (!type.contains("식물성") && !type.contains("동물성") && !type.contains("원재료성")) {
                    continue;
                }

                addIfNotBlank(text(node, "식품대분류명"));
                addIfNotBlank(text(node, "대표식품명"));
                addIfNotBlank(text(node, "식품중분류명"));
                addIfNotBlank(text(node, "식품소분류명"));
            }
        } catch (Exception e) {
            throw new IllegalStateException("Failed to load raw produce catalog from " + catalogResource, e);
        }
    }

    private void loadSeafoodCategoryJson() {
        try {
            JsonNode root = objectMapper.readTree(seafoodCategoryResource.getInputStream());
            JsonNode seafood = root.path("seafood");
            if (seafood.isMissingNode() || seafood.isNull()) return;

            List<String> shrimp = splitCommaList(seafood.path("crustaceans").path("shrimp").asText(""));
            List<String> crabs = splitCommaList(seafood.path("crustaceans").path("crabs").asText(""));
            List<String> crustaceanOther = splitCommaList(seafood.path("crustaceans").path("other").asText(""));
            List<String> mollusks = splitCommaList(seafood.path("mollusks").asText(""));
            List<String> fish = splitCommaList(seafood.path("fish").asText(""));
            List<String> others = splitCommaList(seafood.path("others").asText(""));

            addSeafoodCategoryNames(shrimp, SeafoodCategory.SHRIMP);
            addSeafoodCategoryNames(crabs, SeafoodCategory.CRAB);
            addSeafoodCategoryNames(crustaceanOther, SeafoodCategory.CRUSTACEAN);
            addSeafoodCategoryNames(mollusks, SeafoodCategory.MOLLUSC);
            addSeafoodCategoryNames(fish, SeafoodCategory.FISH);
            addSeafoodCategoryNames(others, SeafoodCategory.OTHER);
        } catch (Exception e) {
            throw new IllegalStateException("Failed to load raw seafood categories from " + seafoodCategoryResource, e);
        }
    }

    public boolean isRawProduce(String ingredientName) {
        if (ingredientName == null || ingredientName.isBlank()) return false;
        String key = normalizeKey(ingredientName);
        if (key.isEmpty()) return false;
        return rawProduceNames.contains(key);
    }

    public Optional<SeafoodCategory> matchSeafoodCategory(String ingredientName) {
        if (ingredientName == null || ingredientName.isBlank()) return Optional.empty();
        String key = normalizeKey(ingredientName);
        if (key.isEmpty()) return Optional.empty();
        SeafoodCategory category = seafoodCategoryByName.get(key);
        return category == null ? Optional.empty() : Optional.of(category);
    }

    private void addIfNotBlank(String value) {
        String normalized = normalizeKey(value);
        if (!normalized.isEmpty()) {
            rawProduceNames.add(normalized);
        }
    }

    private void addSeafoodCategoryNames(List<String> names, SeafoodCategory category) {
        for (String value : names) {
            String key = normalizeKey(value);
            if (key.isEmpty()) continue;
            seafoodCategoryByName.putIfAbsent(key, category);
        }
    }

    private String normalizeKey(String value) {
        if (value == null) return "";
        String cleaned = value.replace("\uFEFF", "")
                .replace("_", " ")
                .trim();
        cleaned = cleaned.replaceAll("\\([^)]*\\)", " ");
        cleaned = cleaned.replaceAll("\\s+", " ").trim();
        return cleaned;
    }

    private List<String> splitCommaList(String value) {
        if (value == null || value.isBlank()) return List.of();
        String[] parts = value.split("\\s*,\\s*");
        List<String> out = new ArrayList<>();
        for (String p : parts) {
            String trimmed = p.trim();
            if (!trimmed.isEmpty()) out.add(trimmed);
        }
        return out;
    }

    private String text(JsonNode node, String field) {
        JsonNode v = node.get(field);
        return (v == null || v.isNull()) ? "" : v.asText();
    }

    public enum SeafoodCategory {
        SHRIMP,
        CRAB,
        CRUSTACEAN,
        FISH,
        MOLLUSC,
        OTHER
    }
}