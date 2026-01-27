package com.aivle0102.bigproject.service;

import com.aivle0102.bigproject.domain.RecipeNonconformingCase;
import com.aivle0102.bigproject.dto.IngredientCases;
import com.aivle0102.bigproject.dto.ProductCases;
import com.aivle0102.bigproject.dto.RecipeCaseRequest;
import com.aivle0102.bigproject.dto.RecipeCaseResponse;
import com.aivle0102.bigproject.dto.RegulatoryCase;
import com.aivle0102.bigproject.repository.RecipeNonconformingCaseRepository;
import lombok.RequiredArgsConstructor;
import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVRecord;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.io.InputStreamReader;
import java.io.Reader;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class RecipeCaseServiceImpl implements RecipeCaseService {

    private final RecipeNonconformingCaseRepository recipeNonconformingCaseRepository;
    private volatile List<SearchRow> cachedSearchRows;
    private volatile Map<String, InfoRow> cachedInfoByCaseId;

    private static final String TYPE_FINISHED = "FINISHED_PRODUCT";
    private static final String TYPE_PROCESSED = "PROCESSED_INGREDIENT";

    @Override
    public RecipeCaseResponse findCases(RecipeCaseRequest request) {
        List<SearchRow> searchRows = getSearchRows();
        Map<String, InfoRow> infoByCaseId = getInfoByCaseId();

        ParsedRecipe parsed = parseRecipe(request.getRecipe());

        List<RecipeNonconformingCase> toSave = new ArrayList<>();

        // 1) 완제품(제품명) 기준 매칭
        List<RegulatoryCase> productCases = new ArrayList<>();
        if (parsed.productName != null && !parsed.productName.isBlank()) {
            for (SearchRow row : searchRows) {
                if (row.ingredientKeyword == null) continue;
                if (!isFinishedOrProcessed(row.ingredientType)) continue;
                if (!hasTokenOverlap(parsed.productName, row.ingredientKeyword)) continue;

                InfoRow info = infoByCaseId.get(row.caseId);
                if (info == null) continue;

                addCase(productCases, toSave, request.getRecipeId(), info, row.ingredientKeyword);
            }
        }

        // 2) 재료 기준 매칭 (ingredient_type 제한 없음)
        List<IngredientCases> ingredientCasesList = new ArrayList<>();
        for (String ingredient : parsed.ingredients) {
            List<RegulatoryCase> cases = new ArrayList<>();

            for (SearchRow row : searchRows) {
                if (row.ingredientKeyword == null) continue;
                if (!hasExactTokenMatch(row.ingredientKeyword, ingredient)) continue;

                InfoRow info = infoByCaseId.get(row.caseId);
                if (info == null) continue;

                addCase(cases, toSave, request.getRecipeId(), info, row.ingredientKeyword);
            }

            ingredientCasesList.add(IngredientCases.builder()
                    .ingredient(ingredient)
                    .cases(cases)
                    .build());
        }

        if (!toSave.isEmpty()) {
            recipeNonconformingCaseRepository.saveAll(toSave);
        }

        return RecipeCaseResponse.builder()
                .productCases(ProductCases.builder()
                        .product(parsed.productName)
                        .cases(productCases)
                        .build())
                .ingredientCases(ingredientCasesList)
                .build();
    }

    private void addCase(List<RegulatoryCase> cases,
                         List<RecipeNonconformingCase> toSave,
                         Long recipeId,
                         InfoRow info,
                         String matchedKeyword) {

        cases.add(RegulatoryCase.builder()
                .caseId(info.caseId)
                .country(info.country)
                .announcementDate(info.announcementDate)
                .ingredient(info.ingredient)
                .violationReason(info.violationReason)
                .action(info.action)
                .matchedIngredient(matchedKeyword)
                .build());

        toSave.add(RecipeNonconformingCase.builder()
                .recipeId(recipeId)
                .country(info.country)
                .ingredient(info.ingredient)
                .caseId(info.caseId)
                .announcementDate(info.announcementDate)
                .violationReason(info.violationReason)
                .action(info.action)
                .matchedIngredient(matchedKeyword)
                .build());
    }

    private boolean isFinishedOrProcessed(String type) {
        if (type == null) return false;
        String upper = type.toUpperCase(Locale.ROOT);
        return TYPE_FINISHED.equals(upper) || TYPE_PROCESSED.equals(upper);
    }

    private ParsedRecipe parseRecipe(String recipe) {
        if (recipe == null) {
            return new ParsedRecipe(null, List.of());
        }
        int idx = recipe.indexOf(':');
        if (idx == -1) {
            return new ParsedRecipe(recipe.trim(), List.of());
        }

        String product = recipe.substring(0, idx).trim();
        String right = recipe.substring(idx + 1).trim();

        List<String> ingredients = new ArrayList<>();
        if (!right.isBlank()) {
            String[] parts = right.split(",");
            for (String p : parts) {
                String t = p.trim();
                if (!t.isBlank()) {
                    ingredients.add(t);
                }
            }
        }

        return new ParsedRecipe(product, ingredients);
    }

    private List<SearchRow> getSearchRows() {
        if (cachedSearchRows != null) {
            return cachedSearchRows;
        }
        synchronized (this) {
            if (cachedSearchRows == null) {
                cachedSearchRows = loadSearchCsv();
            }
        }
        return cachedSearchRows;
    }

    private Map<String, InfoRow> getInfoByCaseId() {
        if (cachedInfoByCaseId != null) {
            return cachedInfoByCaseId;
        }
        synchronized (this) {
            if (cachedInfoByCaseId == null) {
                cachedInfoByCaseId = loadInfoCsv();
            }
        }
        return cachedInfoByCaseId;
    }

    private List<SearchRow> loadSearchCsv() {
        List<SearchRow> rows = new ArrayList<>();
        try (Reader reader = new InputStreamReader(
                new ClassPathResource("data/recipe_inspection_basis_search.csv")
                        .getInputStream(), StandardCharsets.UTF_8)) {

            CSVFormat format = CSVFormat.DEFAULT.builder()
                    .setHeader()
                    .setSkipHeaderRecord(true)
                    .build();

            Iterable<CSVRecord> records = format.parse(reader);

            for (CSVRecord r : records) {
                SearchRow row = new SearchRow();
                row.caseId = r.get("case_id");
                row.country = r.get("country");
                row.ingredientKeyword = r.get("ingredient_keyword");
                row.ingredientType = r.get("ingredient_type");
                rows.add(row);
            }
        } catch (IOException e) {
            throw new IllegalStateException("search CSV load failed", e);
        }
        return rows;
    }

    private boolean hasTokenOverlap(String productName, String keyword) {
        if (productName == null || keyword == null) return false;

        List<String> productTokens = tokenize(productName);
        List<String> keywordTokens = tokenize(keyword);

        for (String p : productTokens) {
            for (String k : keywordTokens) {
                if (p.equals(k)) {
                    return true;
                }
            }
        }
        return false;
    }

    private List<String> tokenize(String text) {
        String normalized = text.replaceAll("[^\\p{IsAlphabetic}\\p{IsDigit}]+", " ").trim();
        if (normalized.isBlank()) return List.of();

        String[] parts = normalized.split("\\s+");
        List<String> tokens = new ArrayList<>();
        for (String p : parts) {
            String t = p.trim();
            if (t.isEmpty()) continue;
            tokens.add(t);
        }
        return tokens;
    }

    private boolean hasExactTokenMatch(String keyword, String ingredient) {
        if (keyword == null || ingredient == null) return false;

        List<String> keywordTokens = tokenize(keyword);
        List<String> ingredientTokens = tokenize(ingredient);
        if (ingredientTokens.isEmpty() || keywordTokens.isEmpty()) return false;

        if (ingredientTokens.size() == 1) {
            return keywordTokens.contains(ingredientTokens.get(0));
        }

        for (int i = 0; i <= keywordTokens.size() - ingredientTokens.size(); i++) {
            boolean match = true;
            for (int j = 0; j < ingredientTokens.size(); j++) {
                if (!keywordTokens.get(i + j).equals(ingredientTokens.get(j))) {
                    match = false;
                    break;
                }
            }
            if (match) {
                return true;
            }
        }
        return false;
    }

    private Map<String, InfoRow> loadInfoCsv() {
        Map<String, InfoRow> rows = new HashMap<>();
        try (Reader reader = new InputStreamReader(
                new ClassPathResource("data/regulatory_cases.csv")
                        .getInputStream(), StandardCharsets.UTF_8)) {

            CSVFormat format = CSVFormat.DEFAULT.builder()
                    .setHeader()
                    .setSkipHeaderRecord(true)
                    .build();

            Iterable<CSVRecord> records = format.parse(reader);

            for (CSVRecord r : records) {
                InfoRow row = new InfoRow();
                row.caseId = r.get("case_id");
                row.country = r.get("country");
                row.announcementDate = r.get("announcement_date");
                row.ingredient = r.get("ingredient");
                row.violationReason = r.get("violation_reason");
                row.action = r.get("action");
                rows.put(row.caseId, row);
            }
        } catch (IOException e) {
            throw new IllegalStateException("info CSV load failed", e);
        }
        return rows;
    }

    private static class SearchRow {
        String caseId;
        String country;
        String ingredientKeyword;
        String ingredientType;
    }

    private static class InfoRow {
        String caseId;
        String country;
        String announcementDate;
        String ingredient;
        String violationReason;
        String action;
    }

    private static class ParsedRecipe {
        final String productName;
        final List<String> ingredients;

        ParsedRecipe(String productName, List<String> ingredients) {
            this.productName = productName;
            this.ingredients = ingredients;
        }
    }

}
