package com.aivle0102.bigproject.service;

import com.aivle0102.bigproject.domain.Influencer;
import com.aivle0102.bigproject.domain.MarketReport;
import com.aivle0102.bigproject.domain.Recipe;
import com.aivle0102.bigproject.domain.RecipeAllergen;
import com.aivle0102.bigproject.domain.RecipeIngredient;
import com.aivle0102.bigproject.domain.UserInfo;
import com.aivle0102.bigproject.domain.ConsumerFeedback;
import com.aivle0102.bigproject.dto.*;
import com.aivle0102.bigproject.domain.VirtualConsumer;
import com.aivle0102.bigproject.repository.InfluencerRepository;
import com.aivle0102.bigproject.repository.MarketReportRepository;
import com.aivle0102.bigproject.repository.RecipeAllergenRepository;
import com.aivle0102.bigproject.repository.RecipeIngredientRepository;
import com.aivle0102.bigproject.repository.RecipeRepository;
import com.aivle0102.bigproject.repository.UserInfoRepository;
import com.aivle0102.bigproject.repository.ConsumerFeedbackRepository;
import com.aivle0102.bigproject.repository.VirtualConsumerRepository;
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
import java.util.ArrayList;
import java.util.HashMap;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class RecipeService {

    private static final String STATUS_DRAFT = "DRAFT";
    private static final String STATUS_PUBLISHED = "PUBLISHED";
    private static final String OPEN_YN_Y = "Y";
    private static final String OPEN_YN_N = "N";
    private static final String REPORT_TYPE_AI = "AI";
    private static final String ANALYSIS_REF_DIRECT = "DIRECT_MATCH";
    private static final List<String> VIRTUAL_CONSUMER_COUNTRIES = List.of(
            "미국", "한국", "일본", "중국", "영국", "프랑스", "독일", "캐나다", "호주", "인도"
    );
    private static final List<String> REPORT_JSON_SECTION_KEYS = List.of(
            "executiveSummary",
            "marketSnapshot",
            "riskAssessment",
            "swot",
            "conceptIdeas",
            "kpis",
            "nextSteps"
    );
    private static final String SECTION_SUMMARY = "summary";
    private static final String SECTION_ALLERGEN = "allergenNote";
    private static final String SECTION_INFLUENCER = "influencer";
    private static final String SECTION_INFLUENCER_IMAGE = "influencerImage";
    private static final String SECTION_GLOBAL_MAP = "globalMarketMap";


    private final RecipeRepository recipeRepository;
    private final RecipeIngredientRepository recipeIngredientRepository;
    private final MarketReportRepository marketReportRepository;
    private final RecipeAllergenRepository recipeAllergenRepository;
    private final InfluencerRepository influencerRepository;
    private final UserInfoRepository userInfoRepository;
    private final AiReportService aiReportService;
    private final AllergenAnalysisService allergenAnalysisService;
    private final PersonaService personaService;
    private final VirtualConsumerRepository virtualConsumerRepository;
    private final ConsumerFeedbackRepository consumerFeedbackRepository;
    private final EvaluationService evaluationService;
    private final RecipeCaseService recipeCaseService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Transactional
    public RecipeResponse create(String authorId, RecipeCreateRequest request) {
        String authorName = resolveUserName(authorId);
        Long companyId = resolveCompanyId(authorId);
        String rawTargetCountry = defaultIfBlank(request.getTargetCountry(), "US");
        String normalizedTargetCountry = normalizeCountryCode(rawTargetCountry);

        List<String> reportSections = normalizeReportSections(request.getReportSections());
        boolean hasSelection = request.getReportSections() != null;
        boolean includeReportJson = hasSelection
                ? hasAnyReportJsonSection(reportSections)
                : true;
        boolean includeSummary = hasSelection
                ? reportSections.contains(SECTION_SUMMARY)
                : true;
        boolean includeAllergen = hasSelection
                ? reportSections.contains(SECTION_ALLERGEN)
                : true;
        boolean includeEvaluation = hasSelection
                ? reportSections.contains(SECTION_GLOBAL_MAP)
                : true;
        if (!includeReportJson) {
            includeSummary = false;
            includeAllergen = false;
            includeEvaluation = false;
        }

        ReportRequest reportRequest = null;
        String reportJson = null;
        String summary = null;
        AllergenAnalysisResponse allergenResponse = null;
        if (includeReportJson) {
            reportRequest = buildReportRequest(
                    request,
                    request.getIngredients(),
                    request.getSteps(),
                    rawTargetCountry
            );
            reportRequest.setSections(filterReportSectionsForPrompt(reportSections));
            try {
                var report = aiReportService.generateReport(reportRequest);
                Map<String, Object> filtered = filterReportContent(report, reportSections);
                reportJson = writeJsonMap(filtered);
                if (includeSummary) {
                    summary = aiReportService.generateSummary(reportJson);
                }
                if (includeAllergen) {
                    allergenResponse = allergenAnalysisService.analyzeIngredients(request.getIngredients(), normalizedTargetCountry);
                }
            } catch (Exception e) {
                throw new IllegalStateException("레시피 보고서 생성에 실패했습니다.", e);
            }
        } else if (includeAllergen) {
            allergenResponse = allergenAnalysisService.analyzeIngredients(request.getIngredients(), normalizedTargetCountry);
        }

        String openYn = normalizeOpenYn(request.getOpenYn());
        if (openYn == null) {
            openYn = OPEN_YN_N;
        }

        Recipe recipe = Recipe.builder()
                .recipeName(request.getTitle())
                .description(request.getDescription())
                .imageBase64(request.getImageBase64())
                .steps(joinSteps(request.getSteps()))
                .status(request.isDraft() ? STATUS_DRAFT : STATUS_PUBLISHED)
                .openYn(openYn)
                .userId(authorId)
                .companyId(companyId)
                .targetCountry(rawTargetCountry)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        Recipe saved = recipeRepository.save(recipe);

        List<RecipeIngredient> ingredients = saveIngredients(saved, request.getIngredients());
        MarketReport marketReport = null;
        if (includeReportJson) {
            marketReport = marketReportRepository.save(MarketReport.builder()
                    .recipe(saved)
                    .reportType(REPORT_TYPE_AI)
                    .content(reportJson)
                    .summary(summary)
                    .openYn(OPEN_YN_N)
                    .build());
        }

        if (includeAllergen && allergenResponse != null) {
            saveAllergens(saved, ingredients, allergenResponse);
        }
        if (includeEvaluation && includeReportJson && marketReport != null && reportRequest != null) {
            List<VirtualConsumer> consumers = saveVirtualConsumers(marketReport, reportRequest.getRecipe(), summary, reportJson);
            evaluationService.evaluateAndSave(marketReport, consumers, reportJson);
        }

        return toResponse(saved, ingredients, marketReport, authorName);
    }

    @Transactional
    public RecipeResponse update(Long id, String authorId, RecipeCreateRequest request) {
        Recipe recipe = recipeRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("레시피를 찾을 수 없습니다."));
        if (!recipe.getUserId().equals(authorId)) {
            throw new IllegalArgumentException("레시피를 찾을 수 없습니다.");
        }

        boolean ingredientsChanged = request.getIngredients() != null;

        recipe.setRecipeName(request.getTitle());
        recipe.setDescription(request.getDescription());
        recipe.setImageBase64(request.getImageBase64());
        recipe.setSteps(joinSteps(request.getSteps()));
        String rawTargetCountry = defaultIfBlank(request.getTargetCountry(), recipe.getTargetCountry());
        String normalizedTargetCountry = normalizeCountryCode(rawTargetCountry);
        recipe.setTargetCountry(rawTargetCountry);
        String openYn = normalizeOpenYn(request.getOpenYn());
        if (openYn != null) {
            recipe.setOpenYn(openYn);
        }
        recipe.setUpdatedAt(LocalDateTime.now());

        Recipe saved = recipeRepository.save(recipe);

        List<RecipeIngredient> ingredients;
        List<String> ingredientsForAnalysis;
        if (ingredientsChanged) {
            // 레퍼가 끊기지 않도록 재료 삭제 전에 알레르겐 행을 먼저 삭제
            recipeAllergenRepository.deleteByRecipe_Id(saved.getId());
            ingredients = replaceIngredients(saved, request.getIngredients());
            ingredientsForAnalysis = request.getIngredients();
        } else {
            ingredients = recipeIngredientRepository.findByRecipe_IdOrderByIdAsc(saved.getId());
            ingredientsForAnalysis = ingredients.stream().map(RecipeIngredient::getIngredientName).toList();
        }
        String targetCountry = rawTargetCountry;

        List<String> reportSections = normalizeReportSections(request.getReportSections());
        boolean hasSelection = request.getReportSections() != null;
        boolean includeReportJson = hasSelection
                ? hasAnyReportJsonSection(reportSections)
                : request.isRegenerateReport();
        boolean includeSummary = hasSelection
                ? reportSections.contains(SECTION_SUMMARY)
                : request.isRegenerateReport();
        boolean includeAllergen = hasSelection
                ? reportSections.contains(SECTION_ALLERGEN)
                : ingredientsChanged;
        boolean includeEvaluation = hasSelection
                ? reportSections.contains(SECTION_GLOBAL_MAP)
                : request.isRegenerateReport();
        if (!includeReportJson) {
            includeSummary = false;
            includeEvaluation = false;
        }

        if (hasSelection && !includeReportJson) {
            List<MarketReport> reports = marketReportRepository.findByRecipe_IdOrderByCreatedAtDesc(saved.getId());
            for (MarketReport report : reports) {
                if (report.getId() != null) {
                    influencerRepository.deleteByReport_Id(report.getId());
                    consumerFeedbackRepository.deleteByReport_Id(report.getId());
                    virtualConsumerRepository.deleteByReport_Id(report.getId());
                }
            }
            marketReportRepository.deleteAll(reports);
        } else if (includeReportJson && request.isRegenerateReport()) {
            List<String> stepsForAnalysis = request.getSteps() != null ? request.getSteps() : splitSteps(recipe.getSteps());
            ReportRequest reportRequest = buildReportRequest(
                    request,
                    ingredientsForAnalysis,
                    stepsForAnalysis,
                    targetCountry
            );
            reportRequest.setSections(filterReportSectionsForPrompt(reportSections));
            String reportJson;
            String summary = null;
            try {
                var report = aiReportService.generateReport(reportRequest);
                Map<String, Object> filtered = filterReportContent(report, reportSections);
                reportJson = writeJsonMap(filtered);
                if (includeSummary) {
                    summary = aiReportService.generateSummary(reportJson);
                }
            } catch (Exception e) {
                throw new IllegalStateException("레시피 보고서 생성에 실패했습니다.", e);
            }

            MarketReport marketReport = marketReportRepository.findTopByRecipe_IdOrderByCreatedAtDesc(saved.getId())
                    .orElseGet(() -> MarketReport.builder().recipe(saved).reportType(REPORT_TYPE_AI).build());
            marketReport.setContent(reportJson);
            marketReport.setSummary(summary);
            if (marketReport.getOpenYn() == null || marketReport.getOpenYn().isBlank()) {
                marketReport.setOpenYn(OPEN_YN_N);
            }
            marketReportRepository.save(marketReport);
            if (marketReport.getId() != null) {
                influencerRepository.deleteByReport_Id(marketReport.getId());
                consumerFeedbackRepository.deleteByReport_Id(marketReport.getId());
                virtualConsumerRepository.deleteByReport_Id(marketReport.getId());
            }
            if (includeEvaluation) {
                List<VirtualConsumer> consumers = saveVirtualConsumers(marketReport, reportRequest.getRecipe(), summary, reportJson);
                evaluationService.evaluateAndSave(marketReport, consumers, reportJson);
            }
        } else if (hasSelection && includeReportJson && !includeEvaluation) {
            MarketReport latestReport = marketReportRepository.findTopByRecipe_IdOrderByCreatedAtDesc(saved.getId()).orElse(null);
            if (latestReport != null && latestReport.getId() != null) {
                consumerFeedbackRepository.deleteByReport_Id(latestReport.getId());
                virtualConsumerRepository.deleteByReport_Id(latestReport.getId());
            }
        }

        if (hasSelection && !includeAllergen) {
            recipeAllergenRepository.deleteByRecipe_Id(saved.getId());
        } else if (includeAllergen) {
            boolean hasExistingAllergens =
                    !recipeAllergenRepository.findByRecipe_IdOrderByIdAsc(saved.getId()).isEmpty();
            if (ingredientsChanged || !hasExistingAllergens) {
                AllergenAnalysisResponse allergenResponse = allergenAnalysisService.analyzeIngredients(
                        ingredientsForAnalysis,
                        normalizedTargetCountry
                );
                saveAllergens(saved, ingredients, allergenResponse);
            }
        }

        String authorName = resolveUserName(authorId);
        MarketReport latestReport = marketReportRepository.findTopByRecipe_IdOrderByCreatedAtDesc(saved.getId()).orElse(null);
        return toResponse(saved, ingredients, latestReport, authorName);
    }


    @Transactional(readOnly = true)
    public List<RecipeResponse> getAll(String requesterId) {
        Long companyId = requesterId == null ? null : resolveCompanyId(requesterId);
        List<Recipe> recipes = companyId == null
                ? recipeRepository.findAllByOrderByCreatedAtDesc()
                : recipeRepository.findByCompanyIdOrderByCreatedAtDesc(companyId);
        return recipes.stream()
                .filter(this::isRecipeVisibleForHub)
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<RecipeResponse> getByAuthor(String authorId) {
        return recipeRepository.findByUserIdOrderByCreatedAtDesc(authorId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public RecipeResponse getOne(Long id, String requesterId) {
        Recipe recipe = recipeRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("레시피를 찾을 수 없습니다."));
        boolean isOwner = requesterId != null && requesterId.equals(recipe.getUserId());
        if (STATUS_DRAFT.equalsIgnoreCase(recipe.getStatus()) && !isOwner) {
            throw new IllegalArgumentException("레시피를 찾을 수 없습니다.");
        }
        if (!isOwner && !isRecipeVisibleForHub(recipe)) {
            throw new IllegalArgumentException("레시피를 찾을 수 없습니다.");
        }
        return toResponse(recipe);
    }

    @Transactional(readOnly = true)
    public List<ReportListItem> getReports(Long recipeId, String requesterId) {
        Recipe recipe = recipeRepository.findById(recipeId)
                .orElseThrow(() -> new IllegalArgumentException("레시피를 찾을 수 없습니다."));
        boolean isOwner = requesterId != null && requesterId.equals(recipe.getUserId());
        if (!isOwner && !isRecipeVisibleForHub(recipe)) {
            throw new IllegalArgumentException("레시피를 찾을 수 없습니다.");
        }
        List<MarketReport> reports = isOwner
                ? marketReportRepository.findByRecipe_IdOrderByCreatedAtDesc(recipeId)
                : marketReportRepository.findByRecipe_IdAndOpenYnOrderByCreatedAtDesc(recipeId, OPEN_YN_Y);
        return reports.stream()
                .filter(report -> REPORT_TYPE_AI.equalsIgnoreCase(defaultIfBlank(report.getReportType(), "")))
                .map(report -> new ReportListItem(
                        report.getId(),
                        report.getReportType(),
                        report.getSummary(),
                        defaultIfBlank(report.getOpenYn(), OPEN_YN_N),
                        report.getCreatedAt()
                ))
                .toList();
    }

    @Transactional
    public void ensureEvaluationForReports(List<MarketReport> reports) {
        if (reports == null || reports.isEmpty()) {
            return;
        }
        for (MarketReport report : reports) {
            ensureEvaluationForReport(report);
        }
    }

    private void ensureEvaluationForReport(MarketReport report) {
        if (report == null) {
            return;
        }
        Recipe recipe = report.getRecipe();
        if (recipe == null || recipe.getId() == null) {
            return;
        }
        MarketReport evalReport = resolveEvaluationReport(report, recipe.getId());
        if (evalReport == null || evalReport.getId() == null) {
            return;
        }
        if (evalReport.getContent() == null || evalReport.getContent().isBlank()) {
            return;
        }
        List<ConsumerFeedback> existing = consumerFeedbackRepository.findByReport_IdOrderByIdAsc(evalReport.getId());
        if (existing != null && !existing.isEmpty()) {
            return;
        }
        List<RecipeIngredient> ingredients = recipeIngredientRepository.findByRecipe_IdOrderByIdAsc(recipe.getId());
        List<String> ingredientNames = ingredients == null
                ? List.of()
                : ingredients.stream().map(RecipeIngredient::getIngredientName).toList();
        String recipeText = buildReportRecipeFromRecipe(recipe, ingredientNames, splitSteps(recipe.getSteps()));
        List<VirtualConsumer> consumers = saveVirtualConsumers(
                evalReport,
                recipeText,
                evalReport.getSummary(),
                evalReport.getContent()
        );
        if (consumers == null || consumers.isEmpty()) {
            return;
        }
        evaluationService.evaluateAndSave(evalReport, consumers, evalReport.getContent());
    }

    @Transactional
    public ReportDetailResponse createReport(Long recipeId, String requesterId, ReportCreateRequest request) {
        Recipe recipe = recipeRepository.findById(recipeId)
                .orElseThrow(() -> new IllegalArgumentException("레시피를 찾을 수 없습니다."));
        if (!recipe.getUserId().equals(requesterId)) {
            throw new IllegalArgumentException("레시피를 찾을 수 없습니다.");
        }

        List<RecipeIngredient> ingredients = recipeIngredientRepository.findByRecipe_IdOrderByIdAsc(recipe.getId());
        List<String> ingredientNames = ingredients.stream()
                .map(RecipeIngredient::getIngredientName)
                .toList();
        List<String> steps = splitSteps(recipe.getSteps());

        List<String> reportSections = normalizeReportSections(request == null ? null : request.getReportSections());
        boolean hasSelection = request != null && request.getReportSections() != null;
        boolean includeReportJson = hasSelection ? hasAnyReportJsonSection(reportSections) : true;
        boolean includeSummary = hasSelection ? reportSections.contains(SECTION_SUMMARY) : true;
        boolean includeAllergen = hasSelection ? reportSections.contains(SECTION_ALLERGEN) : true;
        boolean includeEvaluation = hasSelection ? reportSections.contains(SECTION_GLOBAL_MAP) : true;
        if (!includeReportJson) {
            includeSummary = false;
            includeEvaluation = false;
        }

        ReportRequest reportRequest = null;
        String reportJson = null;
        String summary = null;
        if (includeReportJson) {
            reportRequest = buildReportRequestFromRecipe(recipe, ingredientNames, steps, request);
            reportRequest.setSections(filterReportSectionsForPrompt(reportSections));
            try {
                var report = aiReportService.generateReport(reportRequest);
                Map<String, Object> filtered = filterReportContent(report, reportSections);
                reportJson = writeJsonMap(filtered);
                if (includeSummary) {
                    summary = aiReportService.generateSummary(reportJson);
                }
            } catch (Exception e) {
                throw new IllegalStateException("레시피 보고서 생성에 실패했습니다.", e);
            }
        }

        String openYn = normalizeOpenYn(request == null ? null : request.getOpenYn());
        if (openYn == null) {
            openYn = OPEN_YN_N;
        }

        MarketReport marketReport = null;
        if (includeReportJson) {
            marketReport = marketReportRepository.save(MarketReport.builder()
                    .recipe(recipe)
                    .reportType(REPORT_TYPE_AI)
                    .content(reportJson)
                    .summary(summary)
                    .openYn(openYn)
                    .build());
        }

        if (includeAllergen) {
            boolean hasExistingAllergens =
                    !recipeAllergenRepository.findByRecipe_IdOrderByIdAsc(recipe.getId()).isEmpty();
            if (!hasExistingAllergens) {
                String targetCountry = defaultIfBlank(
                        request == null ? null : request.getTargetCountry(),
                        recipe.getTargetCountry()
                );
                String normalizedTargetCountry = normalizeCountryCode(targetCountry);
                AllergenAnalysisResponse allergenResponse = allergenAnalysisService.analyzeIngredients(
                        ingredientNames,
                        normalizedTargetCountry
                );
                saveAllergens(recipe, ingredients, allergenResponse);
            }
        }

        if (includeEvaluation && includeReportJson && marketReport != null && reportRequest != null) {
            List<VirtualConsumer> consumers = saveVirtualConsumers(marketReport, reportRequest.getRecipe(), summary, reportJson);
            evaluationService.evaluateAndSave(marketReport, consumers, reportJson);
        }

        if (OPEN_YN_Y.equalsIgnoreCase(openYn) && !OPEN_YN_Y.equalsIgnoreCase(resolveRecipeOpenYn(recipe))) {
            recipe.setOpenYn(OPEN_YN_Y);
            recipe.setUpdatedAt(LocalDateTime.now());
            recipeRepository.save(recipe);
        }

        if (marketReport == null) {
            throw new IllegalStateException("보고서가 생성되지 않았습니다.");
        }
        return toReportDetailResponse(recipe, marketReport);
    }

    @Transactional(readOnly = true)
    public ReportDetailResponse getReportDetail(Long reportId, String requesterId) {
        MarketReport report = marketReportRepository.findById(reportId)
                .orElseThrow(() -> new IllegalArgumentException("보고서를 찾을 수 없습니다."));
        Recipe recipe = report.getRecipe();
        boolean isOwner = requesterId != null && requesterId.equals(recipe.getUserId());
        boolean reportPublic = OPEN_YN_Y.equalsIgnoreCase(report.getOpenYn());
        if (STATUS_DRAFT.equalsIgnoreCase(recipe.getStatus()) && !isOwner) {
            throw new IllegalArgumentException("보고서를 찾을 수 없습니다.");
        }
        if (!isOwner && !reportPublic) {
            throw new IllegalArgumentException("보고서를 찾을 수 없습니다.");
        }
        return toReportDetailResponse(recipe, report);
    }

    @Transactional
    public ReportDetailResponse updateReportVisibility(Long reportId, String requesterId, VisibilityUpdateRequest request) {
        MarketReport report = marketReportRepository.findById(reportId)
                .orElseThrow(() -> new IllegalArgumentException("보고서를 찾을 수 없습니다."));
        Recipe recipe = report.getRecipe();
        if (!recipe.getUserId().equals(requesterId)) {
            throw new IllegalArgumentException("보고서를 찾을 수 없습니다.");
        }
        String openYn = normalizeOpenYn(request == null ? null : request.getOpenYn());
        if (openYn == null) {
            openYn = OPEN_YN_N;
        }
        report.setOpenYn(openYn);
        marketReportRepository.save(report);
        if (OPEN_YN_Y.equalsIgnoreCase(openYn) && !OPEN_YN_Y.equalsIgnoreCase(resolveRecipeOpenYn(recipe))) {
            recipe.setOpenYn(OPEN_YN_Y);
            recipe.setUpdatedAt(LocalDateTime.now());
            recipeRepository.save(recipe);
        }
        return toReportDetailResponse(recipe, report);
    }

    @Transactional
    public ReportDetailResponse saveReportInfluencers(Long reportId, String requesterId, RecipePublishRequest request) {
        MarketReport report = marketReportRepository.findById(reportId)
                .orElseThrow(() -> new IllegalArgumentException("Report not found"));
        Recipe recipe = report.getRecipe();
        if (!recipe.getUserId().equals(requesterId)) {
            throw new IllegalArgumentException("Report not found");
        }
        if (request == null) {
            return toReportDetailResponse(recipe, report);
        }

        influencerRepository.deleteByReport_Id(reportId);
        if (request.getInfluencers() != null && !request.getInfluencers().isEmpty()) {
            for (Map<String, Object> influencer : request.getInfluencers()) {
                influencerRepository.save(Influencer.builder()
                        .report(report)
                        .influencerInfo(writeJsonMap(influencer))
                        .influencerImage(request.getInfluencerImageBase64())
                        .build());
            }
        } else if (request.getInfluencerImageBase64() != null && !request.getInfluencerImageBase64().isBlank()) {
            influencerRepository.save(Influencer.builder()
                    .report(report)
                    .influencerImage(request.getInfluencerImageBase64())
                    .build());
        }

        return toReportDetailResponse(recipe, report);
    }

    @Transactional
    public RecipeResponse updateRecipeVisibility(Long recipeId, String requesterId, VisibilityUpdateRequest request) {
        Recipe recipe = recipeRepository.findById(recipeId)
                .orElseThrow(() -> new IllegalArgumentException("레시피를 찾을 수 없습니다."));
        if (!recipe.getUserId().equals(requesterId)) {
            throw new IllegalArgumentException("레시피를 찾을 수 없습니다.");
        }
        String openYn = normalizeOpenYn(request == null ? null : request.getOpenYn());
        if (openYn != null) {
        if (OPEN_YN_N.equalsIgnoreCase(openYn)
                    && marketReportRepository.existsByRecipe_IdAndReportTypeAndOpenYn(
                            recipe.getId(),
                            REPORT_TYPE_AI,
                            OPEN_YN_Y
                    )) {
                openYn = OPEN_YN_Y;
            }
            recipe.setOpenYn(openYn);
            recipe.setUpdatedAt(LocalDateTime.now());
            recipe = recipeRepository.save(recipe);
        }
        return toResponse(recipe);
    }

    @Transactional
    public RecipeResponse publish(Long id, String requesterId, RecipePublishRequest request) {
        Recipe recipe = recipeRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("레시피를 찾을 수 없습니다."));
        if (!recipe.getUserId().equals(requesterId)) {
            throw new IllegalArgumentException("레시피를 찾을 수 없습니다.");
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
    public RecipeResponse saveInfluencers(Long id, String requesterId, RecipePublishRequest request) {
        Recipe recipe = recipeRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("레시피를 찾을 수 없습니다."));
        if (!recipe.getUserId().equals(requesterId)) {
            throw new IllegalArgumentException("레시피를 찾을 수 없습니다.");
        }
        if (request == null) {
            return toResponse(recipe);
        }

        MarketReport latestReport = marketReportRepository.findTopByRecipe_IdOrderByCreatedAtDesc(recipe.getId()).orElse(null);
        Long reportId = latestReport == null ? null : latestReport.getId();
        if (reportId == null) {
            return toResponse(recipe);
        }

        influencerRepository.deleteByReport_Id(reportId);
        if (request.getInfluencers() != null && !request.getInfluencers().isEmpty()) {
            for (Map<String, Object> influencer : request.getInfluencers()) {
                influencerRepository.save(Influencer.builder()
                        .report(latestReport)
                        .influencerInfo(writeJsonMap(influencer))
                        .influencerImage(request.getInfluencerImageBase64())
                        .build());
            }
        } else if (request.getInfluencerImageBase64() != null) {
            influencerRepository.save(Influencer.builder()
                    .report(latestReport)
                    .influencerImage(request.getInfluencerImageBase64())
                    .build());
        }

        return toResponse(recipe);
    }

    @Transactional
    public void delete(Long id, String requesterId) {
        Recipe recipe = recipeRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("레시피를 찾을 수 없습니다."));
        if (!recipe.getUserId().equals(requesterId)) {
            throw new IllegalArgumentException("레시피를 찾을 수 없습니다.");
        }
        // FK 제약 위반 => 연관되는 행 안전하게 삭제
        recipeAllergenRepository.deleteByRecipe_Id(id);
        recipeIngredientRepository.deleteByRecipe_Id(id);

        List<MarketReport> reports = marketReportRepository.findByRecipe_IdOrderByCreatedAtDesc(id);
        for (MarketReport report : reports) {
            if (report.getId() != null) {
                influencerRepository.deleteByReport_Id(report.getId());
            }
        }
        marketReportRepository.deleteAll(reports);
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
        Map<String, Object> reportMap = report == null ? new LinkedHashMap<>() : new LinkedHashMap<>(readJsonMap(report.getContent()));
        MarketReport evalReport = resolveEvaluationReport(report, recipe.getId());
        if (evalReport != null) {
            reportMap.put("evaluationResults", readEvaluationResults(evalReport));
        }
        System.out.println("🔥 [EXPORT] recipeId = " + recipe.getId());
        System.out.println("🔥 [EXPORT] ingredients = " + ingredientNames);

        RecipeCaseRequest req = new RecipeCaseRequest();
        req.setRecipeId(recipe.getId());
        req.setRecipe(
                recipe.getRecipeName() + ": " + String.join(", ", ingredientNames)
        );

        System.out.println("🔥 [EXPORT] recipeText = " + req.getRecipe());

        RecipeCaseResponse exportRisks = recipeCaseService.findCases(req);

        System.out.println("🔥 [EXPORT] exportRisks = " + exportRisks);

        reportMap.put("exportRisks", exportRisks);

        Map<String, Object> allergenMap = buildAllergenResponse(recipe);
        List<Map<String, Object>> influencers = readInfluencers(report);
        String influencerImage = influencers.isEmpty() ? null : readInfluencerImage(report);
        if (STATUS_DRAFT.equalsIgnoreCase(recipe.getStatus())) {
            List<String> sections = reportMap.get("_sections") instanceof List<?> list
                    ? list.stream().filter(String.class::isInstance).map(String.class::cast).toList()
                    : List.of();
            boolean allowInfluencer = sections.contains(SECTION_INFLUENCER) || sections.contains(SECTION_INFLUENCER_IMAGE);
            if (!allowInfluencer) {
                influencers = List.of();
                influencerImage = null;
            }
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
                resolveRecipeOpenYn(recipe),
                recipe.getUserId(),
                authorName,
                recipe.getCreatedAt()
        );
    }

    private ReportDetailResponse toReportDetailResponse(Recipe recipe, MarketReport report) {
        List<RecipeIngredient> ingredients = recipeIngredientRepository.findByRecipe_IdOrderByIdAsc(recipe.getId());
        List<String> ingredientNames = ingredients == null ? List.of()
                : ingredients.stream().map(RecipeIngredient::getIngredientName).toList();
        Map<String, Object> reportMap = report == null ? new LinkedHashMap<>() : new LinkedHashMap<>(readJsonMap(report.getContent()));
        MarketReport evalReport = resolveEvaluationReport(report, recipe.getId());
        if (evalReport != null) {
            reportMap.put("evaluationResults", readEvaluationResults(evalReport));
        }

        RecipeCaseRequest req = new RecipeCaseRequest();
        req.setRecipeId(recipe.getId());
        req.setRecipe(
                recipe.getRecipeName() + ": " + String.join(", ", ingredientNames)
        );
        RecipeCaseResponse exportRisks = recipeCaseService.findCases(req);
        reportMap.put("exportRisks", exportRisks);

        Map<String, Object> allergenMap = buildAllergenResponse(recipe);
        List<Map<String, Object>> influencers = readInfluencers(report);
        String influencerImage = influencers.isEmpty() ? null : readInfluencerImage(report);
        List<String> sections = reportMap.get("_sections") instanceof List<?> list
                ? list.stream().filter(String.class::isInstance).map(String.class::cast).toList()
                : List.of();
        if (!sections.isEmpty()) {
            boolean allowInfluencer = sections.contains(SECTION_INFLUENCER) || sections.contains(SECTION_INFLUENCER_IMAGE);
            if (!allowInfluencer) {
                influencers = List.of();
                influencerImage = null;
            }
        }

        return new ReportDetailResponse(
                report == null ? null : report.getId(),
                recipe.getId(),
                recipe.getRecipeName(),
                recipe.getDescription(),
                ingredientNames,
                splitSteps(recipe.getSteps()),
                recipe.getImageBase64(),
                reportMap,
                allergenMap,
                report == null ? null : report.getSummary(),
                report == null ? null : report.getContent(),
                influencers,
                influencerImage,
                report == null ? null : report.getReportType(),
                report == null ? OPEN_YN_N : defaultIfBlank(report.getOpenYn(), OPEN_YN_N),
                resolveRecipeOpenYn(recipe),
                recipe.getStatus(),
                recipe.getUserId(),
                report == null ? null : report.getCreatedAt()
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

    private MarketReport resolveEvaluationReport(MarketReport currentReport, Long recipeId) {
        if (currentReport != null && REPORT_TYPE_AI.equalsIgnoreCase(defaultIfBlank(currentReport.getReportType(), ""))) {
            return currentReport;
        }
        if (recipeId == null) {
            return null;
        }
        return marketReportRepository
                .findTopByRecipe_IdAndReportTypeOrderByCreatedAtDesc(recipeId, REPORT_TYPE_AI)
                .orElse(null);
    }

    private Map<String, Object> buildAllergenResponse(Recipe recipe) {
        String targetCountry = normalizeCountryCode(recipe.getTargetCountry());
        List<RecipeAllergen> items = (targetCountry == null || targetCountry.isBlank())
                ? recipeAllergenRepository.findByRecipe_IdOrderByIdAsc(recipe.getId())
                : recipeAllergenRepository.findByRecipe_IdAndTargetCountryOrderByIdAsc(recipe.getId(), targetCountry);
        if ((items == null || items.isEmpty()) && targetCountry != null && !targetCountry.isBlank()) {
            items = recipeAllergenRepository.findByRecipe_IdOrderByIdAsc(recipe.getId());
        }
        if (items == null || items.isEmpty()) {
            return Collections.emptyMap();
        }

        Set<String> matched = items.stream()
                .map(RecipeAllergen::getMatchedAllergen)
                .collect(Collectors.toCollection(LinkedHashSet::new));

        Map<String, Set<String>> ingredientToAllergens = new LinkedHashMap<>();
        boolean usedHaccp = false;
        boolean usedAi = false;
        for (RecipeAllergen item : items) {
            if (item.getIngredient() == null || item.getIngredient().getIngredientName() == null) {
                continue;
            }
            String ingredient = item.getIngredient().getIngredientName();
            ingredientToAllergens
                    .computeIfAbsent(ingredient, k -> new LinkedHashSet<>())
                    .add(item.getMatchedAllergen());
            String analysisRef = item.getAnalysisRef();
            if (analysisRef != null) {
                if (analysisRef.contains("HACCP")) usedHaccp = true;
                if (analysisRef.contains("AI_AGENT_USED") || analysisRef.startsWith("AI_")) usedAi = true;
            }
        }

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("matchedAllergens", matched);
        out.put("note", allergenAnalysisService.buildAllergenNoteFromDetected(
                targetCountry,
                ingredientToAllergens,
                usedHaccp,
                usedAi
        ));
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
        reportRequest.setTargetPersona(defaultIfBlank(request.getTargetPersona(), "20~30대 직장인"));
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

    private ReportRequest buildReportRequestFromRecipe(
            Recipe recipe,
            List<String> ingredients,
            List<String> steps,
            ReportCreateRequest request
    ) {
        ReportRequest reportRequest = new ReportRequest();
        reportRequest.setRecipe(buildReportRecipeFromRecipe(recipe, ingredients, steps));
        reportRequest.setTargetCountry(defaultIfBlank(
                request == null ? null : request.getTargetCountry(),
                defaultIfBlank(recipe.getTargetCountry(), "US")
        ));
        reportRequest.setTargetPersona(defaultIfBlank(
                request == null ? null : request.getTargetPersona(),
                "20~30대 직장인"
        ));
        reportRequest.setPriceRange(defaultIfBlank(
                request == null ? null : request.getPriceRange(),
                "USD 6~9"
        ));
        return reportRequest;
    }

    private String buildReportRecipeFromRecipe(Recipe recipe, List<String> ingredients, List<String> steps) {
        String ingredientsText = ingredients == null ? "" : String.join(", ", ingredients);
        String stepsText = steps == null ? "" : String.join("\n", steps);
        return String.format(
                "%s\n%s\n재료: %s\n조리 순서:\n%s",
                defaultIfBlank(recipe == null ? null : recipe.getRecipeName(), ""),
                defaultIfBlank(recipe == null ? null : recipe.getDescription(), ""),
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

    private List<VirtualConsumer> saveVirtualConsumers(MarketReport report, String recipeText, String summary, String reportJson) {
        if (report == null || report.getId() == null) {
            return List.of();
        }
        // 유니크 제약(report_id, personaName, country, ageGroup)이 충돌하지 않도록
        virtualConsumerRepository.deleteByReport_Id(report.getId());
        if (recipeText == null || recipeText.isBlank()) {
            return List.of();
        }
        String personaSource = (summary != null && !summary.isBlank()) ? summary : reportJson;
        if (personaSource == null || personaSource.isBlank()) {
            return List.of();
        }
        try {
            List<AgeGroupResult> targets = personaService.selectTopAgeGroups(recipeText, VIRTUAL_CONSUMER_COUNTRIES);
            if (targets == null || targets.isEmpty()) {
                return List.of();
            }
            List<VirtualConsumer> personas = personaService.generatePersonas(personaSource, targets);
            if (personas == null || personas.isEmpty()) {
                return List.of();
            }
            Map<String, String> reasonByKey = new HashMap<>();
            for (AgeGroupResult target : targets) {
                String key = personaKey(target.getCountry(), target.getAgeGroup());
                reasonByKey.putIfAbsent(key, target.getReason());
            }
            List<VirtualConsumer> rows = new ArrayList<>();
            for (VirtualConsumer persona : personas) {
                if (persona == null) {
                    continue;
                }
                String key = personaKey(persona.getCountry(), persona.getAgeGroup());
                String reason = reasonByKey.getOrDefault(key, "");
                rows.add(VirtualConsumer.builder()
                        .report(report)
                        .personaName(defaultIfBlank(persona.getPersonaName(), ""))
                        .country(defaultIfBlank(persona.getCountry(), ""))
                        .ageGroup(defaultIfBlank(persona.getAgeGroup(), ""))
                        .reason(defaultIfBlank(reason, ""))
                        .lifestyle(persona.getLifestyle())
                        .foodPreference(defaultIfBlank(persona.getFoodPreference(), ""))
                        .purchaseCriteria(persona.getPurchaseCriteria())
                        .attitudeToKFood(persona.getAttitudeToKFood())
                        .evaluationPerspective(persona.getEvaluationPerspective())
                        .build());
            }
            if (!rows.isEmpty()) {
                return virtualConsumerRepository.saveAll(rows);
            }
        } catch (Exception e) {
            System.err.println("보고서 가상 소비자 저장에 실패했습니다: " + report.getId() + " - " + e.getMessage());
        }
        return List.of();
    }

    private String personaKey(String country, String ageGroup) {
        return String.format(
                "%s|%s",
                country == null ? "" : country.trim(),
                ageGroup == null ? "" : ageGroup.trim()
        );
    }

    private List<Map<String, Object>> readEvaluationResults(MarketReport report) {
        if (report == null || report.getId() == null) {
            return List.of();
        }
        List<ConsumerFeedback> feedbacks = consumerFeedbackRepository.findByReport_IdOrderByIdAsc(report.getId());
        if ((feedbacks == null || feedbacks.isEmpty()) && report.getRecipe() != null && report.getRecipe().getId() != null) {
            Long recipeId = report.getRecipe().getId();
            List<MarketReport> candidates = marketReportRepository
                    .findByRecipe_IdAndReportTypeOrderByCreatedAtDesc(recipeId, REPORT_TYPE_AI);
            for (MarketReport candidate : candidates) {
                if (candidate == null || candidate.getId() == null || candidate.getId().equals(report.getId())) {
                    continue;
                }
                feedbacks = consumerFeedbackRepository.findByReport_IdOrderByIdAsc(candidate.getId());
                if (feedbacks != null && !feedbacks.isEmpty()) {
                    break;
                }
            }
        }
        if (feedbacks == null || feedbacks.isEmpty()) {
            return List.of();
        }
        Map<String, FeedbackAggregate> aggregates = new LinkedHashMap<>();
        for (ConsumerFeedback feedback : feedbacks) {
            String country = feedback.getCountry();
            if (country == null || country.isBlank()) {
                continue;
            }
            FeedbackAggregate agg = aggregates.computeIfAbsent(country, k -> new FeedbackAggregate());
            if (feedback.getTotalScore() != null) {
                agg.totalScoreSum += feedback.getTotalScore();
                agg.totalScoreCount += 1;
            }
            if (feedback.getTasteScore() != null) {
                agg.tasteScoreSum += feedback.getTasteScore();
                agg.tasteScoreCount += 1;
            }
            if (feedback.getPriceScore() != null) {
                agg.priceScoreSum += feedback.getPriceScore();
                agg.priceScoreCount += 1;
            }
            if (feedback.getHealthScore() != null) {
                agg.healthScoreSum += feedback.getHealthScore();
                agg.healthScoreCount += 1;
            }
            if (agg.feedbacks.size() < 10) {
                Map<String, Object> item = new LinkedHashMap<>();
                item.put("personaName", feedback.getPersonaName());
                item.put("positiveFeedback", feedback.getPositiveFeedback());
                item.put("negativeFeedback", feedback.getNegativeFeedback());
                agg.feedbacks.add(item);
            }
        }
        return aggregates.entrySet().stream()
                .map(entry -> {
                    FeedbackAggregate agg = entry.getValue();
                    int avgScore = agg.totalScoreCount == 0 ? 0
                            : (int) Math.round((double) agg.totalScoreSum / agg.totalScoreCount);
                    int avgTaste = agg.tasteScoreCount == 0 ? 0
                            : (int) Math.round((double) agg.tasteScoreSum / agg.tasteScoreCount);
                    int avgPrice = agg.priceScoreCount == 0 ? 0
                            : (int) Math.round((double) agg.priceScoreSum / agg.priceScoreCount);
                    int avgHealth = agg.healthScoreCount == 0 ? 0
                            : (int) Math.round((double) agg.healthScoreSum / agg.healthScoreCount);
                    return Map.<String, Object>of(
                            "country", entry.getKey(),
                            "totalScore", avgScore,
                            "tasteScore", avgTaste,
                            "priceScore", avgPrice,
                            "healthScore", avgHealth,
                            "feedbacks", agg.feedbacks
                    );
                })
                .toList();
    }

    private static final class FeedbackAggregate {
        private int totalScoreSum;
        private int totalScoreCount;
        private int tasteScoreSum;
        private int tasteScoreCount;
        private int priceScoreSum;
        private int priceScoreCount;
        private int healthScoreSum;
        private int healthScoreCount;
        private final List<Map<String, Object>> feedbacks = new ArrayList<>();
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
            throw new IllegalStateException("보고서 직렬화에 실패했습니다.", e);
        }
    }

    private List<String> normalizeReportSections(List<String> sections) {
        if (sections == null) {
            return List.of();
        }
        return sections.stream()
                .filter(v -> v != null && !v.isBlank())
                .map(String::trim)
                .toList();
    }

    private boolean hasAnyReportJsonSection(List<String> sections) {
        if (sections == null || sections.isEmpty()) {
            return false;
        }
        return sections.stream().anyMatch(REPORT_JSON_SECTION_KEYS::contains);
    }

    private List<String> filterReportSectionsForPrompt(List<String> sections) {
        if (sections == null || sections.isEmpty()) {
            return REPORT_JSON_SECTION_KEYS;
        }
        List<String> filtered = sections.stream()
                .filter(REPORT_JSON_SECTION_KEYS::contains)
                .toList();
        return filtered.isEmpty() ? REPORT_JSON_SECTION_KEYS : filtered;
    }

    private Map<String, Object> filterReportContent(Map<String, Object> report, List<String> sections) {
        if (report == null || report.isEmpty()) {
            return Collections.emptyMap();
        }
        if (sections == null || sections.isEmpty()) {
            return report;
        }
        List<String> allowed = filterReportSectionsForPrompt(sections);
        List<String> selected = sections;
        Map<String, Object> out = new LinkedHashMap<>();
        for (String key : allowed) {
            if (report.containsKey(key)) {
                out.put(key, report.get(key));
            }
        }
        out.put("_sections", selected);
        return out;
    }

    private Map<String, Object> readJsonMap(String value) {
        if (value == null || value.isBlank()) {
            return new LinkedHashMap<>();
        }
        try {
            return objectMapper.readValue(value, new TypeReference<>() {});
        } catch (Exception e) {
            return new LinkedHashMap<>();
        }
    }

    private String defaultIfBlank(String value, String fallback) {
        if (value == null || value.isBlank()) {
            return fallback;
        }
        return value;
    }

    private String normalizeOpenYn(String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        String upper = raw.trim().toUpperCase();
        if (OPEN_YN_Y.equals(upper)) {
            return OPEN_YN_Y;
        }
        if (OPEN_YN_N.equals(upper)) {
            return OPEN_YN_N;
        }
        return OPEN_YN_N;
    }

    private String resolveRecipeOpenYn(Recipe recipe) {
        if (recipe == null) {
            return OPEN_YN_N;
        }
        String normalized = normalizeOpenYn(recipe.getOpenYn());
        if (normalized != null) {
            return normalized;
        }
        if (STATUS_PUBLISHED.equalsIgnoreCase(recipe.getStatus())) {
            return OPEN_YN_Y;
        }
        return OPEN_YN_N;
    }

    private boolean isRecipeVisibleForHub(Recipe recipe) {
        if (recipe == null) {
            return false;
        }
        return marketReportRepository.existsByRecipe_IdAndReportTypeAndOpenYn(
                recipe.getId(),
                REPORT_TYPE_AI,
                OPEN_YN_Y
        );
    }

    private String normalizeCountryCode(String raw) {
        if (raw == null || raw.isBlank()) {
            return "";
        }
        String trimmed = raw.trim();
        String upper = trimmed.toUpperCase();
        switch (upper) {
            case "US", "JP", "CN", "FR", "DE", "PL", "IN", "VN", "TH", "KR":
                return upper;
            default:
                break;
        }
        switch (trimmed) {
            case "미국": return "US";
            case "일본": return "JP";
            case "중국": return "CN";
            case "프랑스": return "FR";
            case "독일": return "DE";
            case "폴란드": return "PL";
            case "인도": return "IN";
            case "베트남": return "VN";
            case "태국": return "TH";
            case "한국": return "KR";
            case "대한민국": return "KR";
            default: return upper;
        }
    }

    private String resolveUserName(String userId) {
        return userInfoRepository.findByUserId(userId)
                .map(UserInfo::getUserName)
                .orElse(userId);
    }

    private Long resolveCompanyId(String userId) {
        return userInfoRepository.findByUserId(userId)
                .map(UserInfo::getCompanyId)
                .orElse(null);
    }
}



