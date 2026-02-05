package com.aivle0102.bigproject.service;

import com.aivle0102.bigproject.domain.RecipeNonconformingCase;
import com.aivle0102.bigproject.dto.IngredientCases;
<<<<<<< HEAD

=======
import com.aivle0102.bigproject.dto.ProductCases;
>>>>>>> upstream/UI5
import com.aivle0102.bigproject.dto.RecipeCaseRequest;
import com.aivle0102.bigproject.dto.RecipeCaseResponse;
import com.aivle0102.bigproject.dto.RegulatoryCase;
import com.aivle0102.bigproject.repository.RecipeNonconformingCaseRepository;
<<<<<<< HEAD
=======
import com.aivle0102.bigproject.util.RecipeIngredientExtractor;
>>>>>>> upstream/UI5
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
<<<<<<< HEAD
=======
        System.out.println("========== EXPORT RISK DEBUG ==========");
        System.out.println("[RAW REQUEST RECIPE] = " + request.getRecipe());
        System.out.println("[RECIPE ID] = " + request.getRecipeId());

>>>>>>> upstream/UI5
        List<SearchRow> searchRows = getSearchRows();
        Map<String, InfoRow> infoByCaseId = getInfoByCaseId();

        ParsedRecipe parsed = parseRecipe(request.getRecipe());

        List<RecipeNonconformingCase> toSave = new ArrayList<>();

        // 1) 완제품(제품명) 기준 매칭
        List<RegulatoryCase> productCases = new ArrayList<>();
        if (parsed.productName != null && !parsed.productName.isBlank()) {
            for (SearchRow row : searchRows) {
<<<<<<< HEAD
                if (row.ingredientKeyword == null)
                    continue;
                if (!isFinishedOrProcessed(row.ingredientType))
                    continue;
                if (!hasTokenOverlap(parsed.productName, row.ingredientKeyword))
                    continue;

                InfoRow info = infoByCaseId.get(row.caseId);
                if (info == null)
                    continue;

=======
                if (row.ingredientKeyword == null) continue;
                if (!isFinishedOrProcessed(row.ingredientType)) continue;
                if (!hasTokenOverlap(parsed.productName, row.ingredientKeyword)) {
                    continue;
                }

                InfoRow info = infoByCaseId.get(row.caseId);
                if (info == null) continue;

                System.out.println("[MATCH - PRODUCT] product="
                        + parsed.productName + " / keyword=" + row.ingredientKeyword
                        + " / caseId=" + info.caseId);
>>>>>>> upstream/UI5
                addCase(productCases, toSave, request.getRecipeId(), info, row.ingredientKeyword);
            }
        }

        // 2) 재료 기준 매칭 (ingredient_type 제한 없음)
        List<IngredientCases> ingredientCasesList = new ArrayList<>();
        for (String ingredient : parsed.ingredients) {
            List<RegulatoryCase> cases = new ArrayList<>();

            for (SearchRow row : searchRows) {
<<<<<<< HEAD
                if (row.ingredientKeyword == null)
                    continue;
                if (!hasExactTokenMatch(row.ingredientKeyword, ingredient))
                    continue;

                InfoRow info = infoByCaseId.get(row.caseId);
                if (info == null)
                    continue;

=======
                if (row.ingredientKeyword == null) continue;
                if (!hasExactTokenMatch(row.ingredientKeyword, ingredient)) {
                    continue;
                }

                InfoRow info = infoByCaseId.get(row.caseId);
                if (info == null) continue;

                System.out.println("[MATCH - INGREDIENT] ingredient="
                        + ingredient + " / keyword=" + row.ingredientKeyword
                        + " / caseId=" + info.caseId);
>>>>>>> upstream/UI5
                addCase(cases, toSave, request.getRecipeId(), info, row.ingredientKeyword);
            }

            ingredientCasesList.add(IngredientCases.builder()
                    .ingredient(ingredient)
                    .cases(cases)
                    .build());
        }

<<<<<<< HEAD
        if (!toSave.isEmpty()) {
            recipeNonconformingCaseRepository.saveAll(toSave);
        }

        return RecipeCaseResponse.builder()
                .productCases(productCases)
=======
//        if (!toSave.isEmpty()) {
//            recipeNonconformingCaseRepository.saveAll(toSave);
//        }

        return RecipeCaseResponse.builder()
                .productCases(ProductCases.builder()
                        .product(parsed.productName)
                        .cases(productCases)
                        .build())
>>>>>>> upstream/UI5
                .ingredientCases(ingredientCasesList)
                .build();
    }

    private void addCase(List<RegulatoryCase> cases,
<<<<<<< HEAD
            List<RecipeNonconformingCase> toSave,
            Long recipeId,
            InfoRow info,
            String matchedKeyword) {
=======
                         List<RecipeNonconformingCase> toSave,
                         Long recipeId,
                         InfoRow info,
                         String matchedKeyword) {
>>>>>>> upstream/UI5

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
<<<<<<< HEAD
        if (type == null)
            return false;
=======
        if (type == null) return false;
>>>>>>> upstream/UI5
        String upper = type.toUpperCase(Locale.ROOT);
        return TYPE_FINISHED.equals(upper) || TYPE_PROCESSED.equals(upper);
    }

    private ParsedRecipe parseRecipe(String recipe) {
        if (recipe == null) {
            return new ParsedRecipe(null, List.of());
        }
<<<<<<< HEAD
        int idx = recipe.indexOf(':');
        if (idx == -1) {
=======

        int idx = recipe.indexOf(':');
        if (idx == -1) {
            // 제품명만 있고 재료가 없는 경우
>>>>>>> upstream/UI5
            return new ParsedRecipe(recipe.trim(), List.of());
        }

        String product = recipe.substring(0, idx).trim();
        String right = recipe.substring(idx + 1).trim();

<<<<<<< HEAD
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
=======
        // 🔥 재료 정제 유틸 사용
        List<String> ingredients =
                RecipeIngredientExtractor.extractIngredients(right);

        System.out.println("[EXPORT RISK] product = " + product);
        System.out.println("[EXPORT RISK] ingredients = " + ingredients);
>>>>>>> upstream/UI5

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
<<<<<<< HEAD
                        .getInputStream(),
                StandardCharsets.UTF_8)) {
=======
                        .getInputStream(), StandardCharsets.UTF_8)) {
>>>>>>> upstream/UI5

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
<<<<<<< HEAD
            throw new IllegalStateException("search CSV load failed", e);
=======
            throw new IllegalStateException("search CSV 로드에 실패했습니다.", e);
>>>>>>> upstream/UI5
        }
        return rows;
    }

    private boolean hasTokenOverlap(String productName, String keyword) {
<<<<<<< HEAD
        if (productName == null || keyword == null)
            return false;
=======
        if (productName == null || keyword == null) return false;
>>>>>>> upstream/UI5

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
<<<<<<< HEAD
        if (normalized.isBlank())
            return List.of();
=======
        if (normalized.isBlank()) return List.of();
>>>>>>> upstream/UI5

        String[] parts = normalized.split("\\s+");
        List<String> tokens = new ArrayList<>();
        for (String p : parts) {
            String t = p.trim();
<<<<<<< HEAD
            if (t.isEmpty())
                continue;
=======
            if (t.isEmpty()) continue;
>>>>>>> upstream/UI5
            tokens.add(t);
        }
        return tokens;
    }

    private boolean hasExactTokenMatch(String keyword, String ingredient) {
<<<<<<< HEAD
        if (keyword == null || ingredient == null)
            return false;

        List<String> keywordTokens = tokenize(keyword);
        List<String> ingredientTokens = tokenize(ingredient);
        if (ingredientTokens.isEmpty() || keywordTokens.isEmpty())
            return false;
=======
        if (keyword == null || ingredient == null) return false;

        List<String> keywordTokens = tokenize(keyword);
        List<String> ingredientTokens = tokenize(ingredient);
        if (ingredientTokens.isEmpty() || keywordTokens.isEmpty()) return false;
>>>>>>> upstream/UI5

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
<<<<<<< HEAD
                        .getInputStream(),
                StandardCharsets.UTF_8)) {
=======
                        .getInputStream(), StandardCharsets.UTF_8)) {
>>>>>>> upstream/UI5

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
<<<<<<< HEAD
            throw new IllegalStateException("info CSV load failed", e);
=======
            throw new IllegalStateException("info CSV 로드에 실패했습니다.", e);
>>>>>>> upstream/UI5
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
