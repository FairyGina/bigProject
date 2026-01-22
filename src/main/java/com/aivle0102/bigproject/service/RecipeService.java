package com.aivle0102.bigproject.service;

import com.aivle0102.bigproject.domain.Recipe;
import com.aivle0102.bigproject.domain.UserInfo;
import com.aivle0102.bigproject.dto.RecipeCreateRequest;
import com.aivle0102.bigproject.dto.RecipePublishRequest;
import com.aivle0102.bigproject.dto.RecipeResponse;
import com.aivle0102.bigproject.dto.ReportRequest;
import com.aivle0102.bigproject.repository.RecipeRepository;
import com.aivle0102.bigproject.repository.UserInfoRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;

@Service
@RequiredArgsConstructor
public class RecipeService {

    private final RecipeRepository recipeRepository;
    private final UserInfoRepository userInfoRepository;
    private final AiReportService aiReportService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Transactional
    public RecipeResponse create(String authorId, RecipeCreateRequest request) {
        String authorName = userInfoRepository.findByUserIdAndUserState(authorId, "1")
                .map(UserInfo::getUserName)
                .orElse(authorId);

        ReportRequest reportRequest = new ReportRequest();
        reportRequest.setRecipe(buildReportRecipe(request));
        reportRequest.setTargetCountry(defaultIfBlank(request.getTargetCountry(), "미국"));
        reportRequest.setTargetPersona(defaultIfBlank(request.getTargetPersona(), "20~30대 바쁜 직장인"));
        reportRequest.setPriceRange(defaultIfBlank(request.getPriceRange(), "USD 6~9"));

        String reportJson;
        String summary;
        try {
            var report = aiReportService.generateReport(reportRequest);
            reportJson = writeJsonMap(report);
            summary = aiReportService.generateSummary(reportJson);
        } catch (Exception e) {
            throw new IllegalStateException("Failed to generate report for recipe", e);
        }

        Recipe recipe = Recipe.builder()
                .title(request.getTitle())
                .description(request.getDescription())
                .ingredientsJson(writeJson(request.getIngredients()))
                .stepsJson(writeJson(request.getSteps()))
                .reportJson(reportJson)
                .summary(summary)
                .imageBase64(request.getImageBase64())
                .status(request.isDraft() ? "DRAFT" : "PUBLISHED")
                .authorId(authorId)
                .authorName(authorName)
                .createdAt(LocalDateTime.now())
                .build();

        Recipe saved = recipeRepository.save(recipe);
        return toResponse(saved);
    }

    @Transactional
    public RecipeResponse update(Long id, String authorId, RecipeCreateRequest request) {
        Recipe recipe = recipeRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Recipe not found"));
        if (!recipe.getAuthorId().equals(authorId)) {
            throw new IllegalArgumentException("Recipe not found");
        }

        recipe.setTitle(request.getTitle());
        recipe.setDescription(request.getDescription());
        recipe.setIngredientsJson(writeJson(request.getIngredients()));
        recipe.setStepsJson(writeJson(request.getSteps()));
        recipe.setImageBase64(request.getImageBase64());

        Recipe saved = recipeRepository.save(recipe);
        return toResponse(saved);
    }

    @Transactional(readOnly = true)
    public List<RecipeResponse> getAll() {
        return recipeRepository.findByStatusOrderByCreatedAtDesc("PUBLISHED")
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<RecipeResponse> getByAuthor(String authorId) {
        return recipeRepository.findByAuthorIdAndStatusOrderByCreatedAtDesc(authorId, "PUBLISHED")
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public RecipeResponse getOne(Long id, String requesterId) {
        Recipe recipe = recipeRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Recipe not found"));
        if ("DRAFT".equalsIgnoreCase(recipe.getStatus())
                && (requesterId == null || !requesterId.equals(recipe.getAuthorId()))) {
            throw new IllegalArgumentException("Recipe not found");
        }
        return toResponse(recipe);
    }

    @Transactional
    public RecipeResponse publish(Long id, String requesterId, RecipePublishRequest request) {
        Recipe recipe = recipeRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Recipe not found"));
        if (!recipe.getAuthorId().equals(requesterId)) {
            throw new IllegalArgumentException("Recipe not found");
        }
        if (request != null) {
            if (request.getInfluencers() != null) {
                recipe.setInfluencerJson(writeJsonMapList(request.getInfluencers()));
            }
            if (request.getInfluencerImageBase64() != null) {
                recipe.setInfluencerImageBase64(request.getInfluencerImageBase64());
            }
        }
        recipe.setStatus("PUBLISHED");
        Recipe saved = recipeRepository.save(recipe);
        return toResponse(saved);
    }

    @Transactional
    public void delete(Long id, String requesterId) {
        Recipe recipe = recipeRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Recipe not found"));
        if (!recipe.getAuthorId().equals(requesterId)) {
            throw new IllegalArgumentException("Recipe not found");
        }
        recipeRepository.delete(recipe);
    }

    private RecipeResponse toResponse(Recipe recipe) {
        return new RecipeResponse(
                recipe.getId(),
                recipe.getTitle(),
                recipe.getDescription(),
                readJson(recipe.getIngredientsJson()),
                readJson(recipe.getStepsJson()),
                recipe.getImageBase64(),
                readJsonMap(recipe.getReportJson()),
                recipe.getSummary(),
                readJsonMapList(recipe.getInfluencerJson()),
                recipe.getInfluencerImageBase64(),
                recipe.getStatus(),
                recipe.getAuthorId(),
                recipe.getAuthorName(),
                recipe.getCreatedAt()
        );
    }

    private String writeJson(List<String> values) {
        try {
            return objectMapper.writeValueAsString(values == null ? Collections.emptyList() : values);
        } catch (Exception e) {
            throw new IllegalStateException("Failed to serialize recipe data", e);
        }
    }

    private String writeJsonMapList(List<java.util.Map<String, Object>> value) {
        try {
            return objectMapper.writeValueAsString(value == null ? Collections.emptyList() : value);
        } catch (Exception e) {
            throw new IllegalStateException("Failed to serialize influencer data", e);
        }
    }

    private List<String> readJson(String value) {
        if (value == null || value.isBlank()) {
            return Collections.emptyList();
        }
        try {
            return objectMapper.readValue(value, new TypeReference<>() {});
        } catch (Exception e) {
            return Collections.emptyList();
        }
    }

    private String writeJsonMap(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (Exception e) {
            throw new IllegalStateException("Failed to serialize report", e);
        }
    }

    private List<java.util.Map<String, Object>> readJsonMapList(String value) {
        if (value == null || value.isBlank()) {
            return Collections.emptyList();
        }
        try {
            return objectMapper.readValue(value, new TypeReference<>() {});
        } catch (Exception e) {
            return Collections.emptyList();
        }
    }

    private java.util.Map<String, Object> readJsonMap(String value) {
        if (value == null || value.isBlank()) {
            return Collections.emptyMap();
        }
        try {
            return objectMapper.readValue(value, new TypeReference<>() {});
        } catch (Exception e) {
            return Collections.emptyMap();
        }
    }

    private String buildReportRecipe(RecipeCreateRequest request) {
        String ingredientsText = request.getIngredients() == null ? "" : String.join(", ", request.getIngredients());
        String stepsText = request.getSteps() == null ? "" : String.join("\n", request.getSteps());
        return String.format(
                "%s\n%s\n재료: %s\n조리 단계:\n%s",
                defaultIfBlank(request.getTitle(), ""),
                defaultIfBlank(request.getDescription(), ""),
                ingredientsText,
                stepsText
        );
    }

    private String defaultIfBlank(String value, String fallback) {
        if (value == null || value.isBlank()) {
            return fallback;
        }
        return value;
    }
}
