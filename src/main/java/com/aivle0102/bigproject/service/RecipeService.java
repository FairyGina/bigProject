package com.aivle0102.bigproject.service;

import com.aivle0102.bigproject.domain.Influencer;
import com.aivle0102.bigproject.domain.MarketReport;
import com.aivle0102.bigproject.domain.Recipe;
import com.aivle0102.bigproject.domain.RecipeAllergen;
import com.aivle0102.bigproject.domain.RecipeIngredient;
import com.aivle0102.bigproject.domain.UserInfo;
import com.aivle0102.bigproject.dto.AllergenAnalysisResponse;
import com.aivle0102.bigproject.dto.IngredientEvidence;
import com.aivle0102.bigproject.dto.RecipeCreateRequest;
import com.aivle0102.bigproject.dto.RecipePublishRequest;
import com.aivle0102.bigproject.dto.RecipeResponse;
import com.aivle0102.bigproject.dto.ReportRequest;
import com.aivle0102.bigproject.repository.InfluencerRepository;
import com.aivle0102.bigproject.repository.MarketReportRepository;
import com.aivle0102.bigproject.repository.RecipeAllergenRepository;
import com.aivle0102.bigproject.repository.RecipeIngredientRepository;
import com.aivle0102.bigproject.repository.RecipeRepository;
import com.aivle0102.bigproject.repository.UserInfoRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class RecipeService {

    private static final String STATUS_DRAFT = "DRAFT";
    private static final String STATUS_PUBLISHED = "PUBLISHED";
    private static final String REPORT_TYPE_AI = "AI";
    private static final String ANALYSIS_REF_DIRECT = "DIRECT_MATCH";

    private final RecipeRepository recipeRepository;
    private final RecipeIngredientRepository recipeIngredientRepository;
    private final MarketReportRepository marketReportRepository;
    private final RecipeAllergenRepository recipeAllergenRepository;
    private final InfluencerRepository influencerRepository;
    private final UserInfoRepository userInfoRepository;
    private final AiReportService aiReportService;
    private final AllergenAnalysisService allergenAnalysisService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Transactional
    public RecipeResponse create(String authorId, RecipeCreateRequest request) {
        String authorName = resolveUserName(authorId);
        String rawTargetCountry = defaultIfBlank(request.getTargetCountry(), "US");
        String normalizedTargetCountry = normalizeCountryCode(rawTargetCountry);

        ReportRequest reportRequest = buildReportRequest(
                request,
                request.getIngredients(),
                request.getSteps(),
                rawTargetCountry
        );

        String reportJson;
        String summary;
        AllergenAnalysisResponse allergenResponse;
        try {
            var report = aiReportService.generateReport(reportRequest);
            reportJson = writeJsonMap(report);
            summary = aiReportService.generateSummary(reportJson);
            allergenResponse = allergenAnalysisService.analyzeIngredients(request.getIngredients(), normalizedTargetCountry);
        } catch (Exception e) {
            throw new IllegalStateException("Failed to generate report for recipe", e);
        }

        Recipe recipe = Recipe.builder()
                .recipeName(request.getTitle())
                .description(request.getDescription())
                .imageBase64(request.getImageBase64())
                .steps(joinSteps(request.getSteps()))
                .status(request.isDraft() ? STATUS_DRAFT : STATUS_PUBLISHED)
                .userId(authorId)
                .targetCountry(rawTargetCountry)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        Recipe saved = recipeRepository.save(recipe);

        List<RecipeIngredient> ingredients = saveIngredients(saved, request.getIngredients());
        MarketReport marketReport = marketReportRepository.save(MarketReport.builder()
                .recipe(saved)
                .reportType(REPORT_TYPE_AI)
                .content(reportJson)
                .summary(summary)
                .build());

        saveAllergens(saved, ingredients, allergenResponse);

        return toResponse(saved, ingredients, marketReport, authorName);
    }

    @Transactional
    public RecipeResponse update(Long id, String authorId, RecipeCreateRequest request) {
        Recipe recipe = recipeRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Recipe not found"));
        if (!recipe.getUserId().equals(authorId)) {
            throw new IllegalArgumentException("Recipe not found");
        }

        boolean ingredientsChanged = request.getIngredients() != null;

        recipe.setRecipeName(request.getTitle());
        recipe.setDescription(request.getDescription());
        recipe.setImageBase64(request.getImageBase64());
        recipe.setSteps(joinSteps(request.getSteps()));
        String rawTargetCountry = defaultIfBlank(request.getTargetCountry(), recipe.getTargetCountry());
        String normalizedTargetCountry = normalizeCountryCode(rawTargetCountry);
        recipe.setTargetCountry(rawTargetCountry);
        recipe.setUpdatedAt(LocalDateTime.now());

        Recipe saved = recipeRepository.save(recipe);

        List<RecipeIngredient> ingredients = ingredientsChanged
                ? replaceIngredients(saved, request.getIngredients())
                : recipeIngredientRepository.findByRecipe_IdOrderByIdAsc(saved.getId());

        List<String> ingredientsForAnalysis = ingredientsChanged
                ? request.getIngredients()
                : ingredients.stream().map(RecipeIngredient::getIngredientName).toList();
        String targetCountry = rawTargetCountry;

        if (request.isRegenerateReport()) {
            List<String> stepsForAnalysis = request.getSteps() != null ? request.getSteps() : splitSteps(recipe.getSteps());
            ReportRequest reportRequest = buildReportRequest(
                    request,
                    ingredientsForAnalysis,
                    stepsForAnalysis,
                    targetCountry
            );
            String reportJson;
            String summary;
            try {
                var report = aiReportService.generateReport(reportRequest);
                reportJson = writeJsonMap(report);
                summary = aiReportService.generateSummary(reportJson);
            } catch (Exception e) {
                throw new IllegalStateException("Failed to generate report for recipe", e);
            }

            MarketReport marketReport = marketReportRepository.findTopByRecipe_IdOrderByCreatedAtDesc(saved.getId())
                    .orElseGet(() -> MarketReport.builder().recipe(saved).reportType(REPORT_TYPE_AI).build());
            marketReport.setContent(reportJson);
            marketReport.setSummary(summary);
            marketReportRepository.save(marketReport);
            if (marketReport.getId() != null) {
                influencerRepository.deleteByReport_Id(marketReport.getId());
            }
        }

        if (ingredientsChanged) {
            AllergenAnalysisResponse allergenResponse = allergenAnalysisService.analyzeIngredients(
                    ingredientsForAnalysis,
                    normalizedTargetCountry
            );
            recipeAllergenRepository.deleteByRecipe_Id(saved.getId());
            saveAllergens(saved, ingredients, allergenResponse);
        }

        String authorName = resolveUserName(authorId);
        MarketReport latestReport = marketReportRepository.findTopByRecipe_IdOrderByCreatedAtDesc(saved.getId()).orElse(null);
        return toResponse(saved, ingredients, latestReport, authorName);
    }

    @Transactional(readOnly = true)
    public List<RecipeResponse> getAll() {
        return recipeRepository.findByStatusOrderByCreatedAtDesc(STATUS_PUBLISHED)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<RecipeResponse> getByAuthor(String authorId) {
        return recipeRepository.findByUserIdAndStatusOrderByCreatedAtDesc(authorId, STATUS_PUBLISHED)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public RecipeResponse getOne(Long id, String requesterId) {
        Recipe recipe = recipeRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Recipe not found"));
        if (STATUS_DRAFT.equalsIgnoreCase(recipe.getStatus())
                && (requesterId == null || !requesterId.equals(recipe.getUserId()))) {
            throw new IllegalArgumentException("Recipe not found");
        }
        return toResponse(recipe);
    }

    @Transactional
    public RecipeResponse publish(Long id, String requesterId, RecipePublishRequest request) {
        Recipe recipe = recipeRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Recipe not found"));
        if (!recipe.getUserId().equals(requesterId)) {
            throw new IllegalArgumentException("Recipe not found");
        }

        if (request != null) {
            MarketReport latestReport = marketReportRepository.findTopByRecipe_IdOrderByCreatedAtDesc(recipe.getId()).orElse(null);
            Long reportId = latestReport == null ? null : latestReport.getId();
            if (reportId != null) {
                influencerRepository.deleteByReport_Id(reportId);
            }

            if (request.getInfluencers() != null && !request.getInfluencers().isEmpty()) {
                MarketReport reportRef = latestReport;
                for (Map<String, Object> influencer : request.getInfluencers()) {
                    influencerRepository.save(Influencer.builder()
                            .report(reportRef)
                            .influencerInfo(writeJsonMap(influencer))
                            .influencerImage(request.getInfluencerImageBase64())
                            .build());
                }
            } else if (request.getInfluencerImageBase64() != null && reportId != null) {
                influencerRepository.save(Influencer.builder()
                        .report(latestReport)
                        .influencerImage(request.getInfluencerImageBase64())
                        .build());
            }
        }

        recipe.setStatus(STATUS_PUBLISHED);
        recipe.setUpdatedAt(LocalDateTime.now());
        Recipe saved = recipeRepository.save(recipe);
        return toResponse(saved);
    }

    @Transactional
    public void delete(Long id, String requesterId) {
        Recipe recipe = recipeRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Recipe not found"));
        if (!recipe.getUserId().equals(requesterId)) {
            throw new IllegalArgumentException("Recipe not found");
        }
        recipeRepository.delete(recipe);
    }

    private RecipeResponse toResponse(Recipe recipe) {
        List<RecipeIngredient> ingredients = recipeIngredientRepository.findByRecipe_IdOrderByIdAsc(recipe.getId());
        MarketReport latestReport = marketReportRepository.findTopByRecipe_IdOrderByCreatedAtDesc(recipe.getId()).orElse(null);
        String authorName = resolveUserName(recipe.getUserId());
        return toResponse(recipe, ingredients, latestReport, authorName);
    }

    private RecipeResponse toResponse(Recipe recipe, List<RecipeIngredient> ingredients, MarketReport report, String authorName) {
        List<String> ingredientNames = ingredients == null ? List.of()
                : ingredients.stream().map(RecipeIngredient::getIngredientName).toList();
        Map<String, Object> reportMap = report == null ? Collections.emptyMap() : readJsonMap(report.getContent());
        Map<String, Object> allergenMap = buildAllergenResponse(recipe.getId());
        List<Map<String, Object>> influencers = readInfluencers(report);
        String influencerImage = influencers.isEmpty() ? null : readInfluencerImage(report);
        if (STATUS_DRAFT.equalsIgnoreCase(recipe.getStatus())) {
            influencers = List.of();
            influencerImage = null;
        }

        return new RecipeResponse(
                recipe.getId(),
                recipe.getRecipeName(),
                recipe.getDescription(),
                ingredientNames,
                splitSteps(recipe.getSteps()),
                recipe.getImageBase64(),
                reportMap,
                allergenMap,
                report == null ? null : report.getSummary(),
                influencers,
                influencerImage,
                recipe.getStatus(),
                recipe.getUserId(),
                authorName,
                recipe.getCreatedAt()
        );
    }

    private String readInfluencerImage(MarketReport report) {
        if (report == null) return null;
        return influencerRepository.findByReport_IdOrderByIdAsc(report.getId())
                .stream()
                .map(Influencer::getInfluencerImage)
                .filter(v -> v != null && !v.isBlank())
                .findFirst()
                .orElse(null);
    }

    private List<Map<String, Object>> readInfluencers(MarketReport report) {
        if (report == null) return List.of();
        return influencerRepository.findByReport_IdOrderByIdAsc(report.getId())
                .stream()
                .map(Influencer::getInfluencerInfo)
                .filter(v -> v != null && !v.isBlank())
                .map(this::readJsonMap)
                .toList();
    }

    private Map<String, Object> buildAllergenResponse(Long recipeId) {
        List<RecipeAllergen> items = recipeAllergenRepository.findByRecipe_IdOrderByIdAsc(recipeId);
        Set<String> matched = items.stream()
                .map(RecipeAllergen::getMatchedAllergen)
                .collect(Collectors.toCollection(LinkedHashSet::new));
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("matchedAllergens", matched);
        if (matched.isEmpty()) {
            out.put("note", "알레르기 성분 요약이 없습니다.");
        } else {
            String list = String.join(", ", matched);
            out.put("note", "알레르기 성분 요약: " + list);
        }
        return out;
    }

    private ReportRequest buildReportRequest(
            RecipeCreateRequest request,
            List<String> ingredients,
            List<String> steps,
            String targetCountry
    ) {
        ReportRequest reportRequest = new ReportRequest();
        reportRequest.setRecipe(buildReportRecipe(request, ingredients, steps));
        reportRequest.setTargetCountry(defaultIfBlank(targetCountry, "US"));
        reportRequest.setTargetPersona(defaultIfBlank(request.getTargetPersona(), "20~30s office workers"));
        reportRequest.setPriceRange(defaultIfBlank(request.getPriceRange(), "USD 6~9"));
        return reportRequest;
    }

    private String buildReportRecipe(RecipeCreateRequest request, List<String> ingredients, List<String> steps) {
        String ingredientsText = ingredients == null ? "" : String.join(", ", ingredients);
        String stepsText = steps == null ? "" : String.join("\n", steps);
        return String.format(
                "%s\n%s\n재료: %s\n조리 순서:\n%s",
                defaultIfBlank(request.getTitle(), ""),
                defaultIfBlank(request.getDescription(), ""),
                ingredientsText,
                stepsText
        );
    }

    private List<RecipeIngredient> saveIngredients(Recipe recipe, List<String> ingredients) {
        if (ingredients == null || ingredients.isEmpty()) {
            return List.of();
        }
        List<RecipeIngredient> rows = ingredients.stream()
                .filter(v -> v != null && !v.isBlank())
                .map(name -> RecipeIngredient.builder()
                        .recipe(recipe)
                        .ingredientName(name.trim())
                        .build())
                .toList();
        return recipeIngredientRepository.saveAll(rows);
    }

    private List<RecipeIngredient> replaceIngredients(Recipe recipe, List<String> ingredients) {
        recipeIngredientRepository.deleteByRecipe_Id(recipe.getId());
        return saveIngredients(recipe, ingredients);
    }

    private void saveAllergens(Recipe recipe, List<RecipeIngredient> ingredients, AllergenAnalysisResponse allergenResponse) {
        if (allergenResponse == null || ingredients == null || ingredients.isEmpty()) {
            return;
        }

        Map<String, RecipeIngredient> byName = ingredients.stream()
                .collect(Collectors.toMap(
                        v -> normalizeIngredientKey(v.getIngredientName()),
                        v -> v,
                        (a, b) -> a,
                        LinkedHashMap::new
                ));

        Map<String, Map<String, String>> ingredientToAllergens = new LinkedHashMap<>();

        if (allergenResponse.getDirectMatchedAllergens() != null) {
            for (Map.Entry<String, String> entry : allergenResponse.getDirectMatchedAllergens().entrySet()) {
                String allergen = entry.getKey();
                String ingredientsText = entry.getValue();
                if (ingredientsText == null) continue;
                for (String token : ingredientsText.split(",")) {
                    String name = token.trim();
                    if (name.isEmpty()) continue;
                    ingredientToAllergens
                            .computeIfAbsent(name, k -> new LinkedHashMap<>())
                            .putIfAbsent(allergen, ANALYSIS_REF_DIRECT);
                }
            }
        }

        if (allergenResponse.getHaccpSearchEvidences() != null) {
            for (IngredientEvidence ev : allergenResponse.getHaccpSearchEvidences()) {
                if (ev.getMatchedAllergensForTargetCountry() == null || ev.getMatchedAllergensForTargetCountry().isEmpty()) {
                    continue;
                }
                Map<String, String> mapped = ingredientToAllergens
                        .computeIfAbsent(ev.getIngredient(), k -> new LinkedHashMap<>());
                for (String allergen : ev.getMatchedAllergensForTargetCountry()) {
                    mapped.putIfAbsent(allergen, ev.getSearchStrategy());
                }
            }
        }

        String targetCountry = allergenResponse.getTargetCountry();
        for (Map.Entry<String, Map<String, String>> entry : ingredientToAllergens.entrySet()) {
            RecipeIngredient ingredient = byName.get(normalizeIngredientKey(entry.getKey()));
            if (ingredient == null) {
                continue;
            }
            for (Map.Entry<String, String> allergenEntry : entry.getValue().entrySet()) {
                recipeAllergenRepository.save(RecipeAllergen.builder()
                        .recipe(recipe)
                        .ingredient(ingredient)
                        .targetCountry(targetCountry)
                        .matchedAllergen(allergenEntry.getKey())
                        .analysisRef(allergenEntry.getValue())
                        .build());
            }
        }
    }

    private String normalizeIngredientKey(String name) {
        return name == null ? "" : name.trim().toLowerCase();
    }

    private String joinSteps(List<String> steps) {
        if (steps == null || steps.isEmpty()) {
            return null;
        }
        return steps.stream()
                .filter(v -> v != null && !v.isBlank())
                .collect(Collectors.joining("\n"));
    }

    private List<String> splitSteps(String steps) {
        if (steps == null || steps.isBlank()) {
            return List.of();
        }
        return List.of(steps.split("\\n"));
    }

    private String writeJsonMap(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (Exception e) {
            throw new IllegalStateException("Failed to serialize report", e);
        }
    }

    private Map<String, Object> readJsonMap(String value) {
        if (value == null || value.isBlank()) {
            return Collections.emptyMap();
        }
        try {
            return objectMapper.readValue(value, new TypeReference<>() {});
        } catch (Exception e) {
            return Collections.emptyMap();
        }
    }

    private String defaultIfBlank(String value, String fallback) {
        if (value == null || value.isBlank()) {
            return fallback;
        }
        return value;
    }

    private String normalizeCountryCode(String raw) {
        if (raw == null || raw.isBlank()) {
            return "";
        }
        String trimmed = raw.trim();
        String upper = trimmed.toUpperCase();
        switch (upper) {
            case "US", "JP", "CN", "FR", "DE", "PL", "IN", "VN", "TH":
                return upper;
            default:
                break;
        }
        return switch (trimmed) {
            case "미국" -> "US";
            case "일본" -> "JP";
            case "중국" -> "CN";
            case "프랑스" -> "FR";
            case "독일" -> "DE";
            case "폴란드" -> "PL";
            case "인도" -> "IN";
            case "베트남" -> "VN";
            case "태국" -> "TH";
            default -> upper;
        };
    }

    private String resolveUserName(String userId) {
        return userInfoRepository.findByUserId(userId)
                .map(UserInfo::getUserName)
                .orElse(userId);
    }
}
