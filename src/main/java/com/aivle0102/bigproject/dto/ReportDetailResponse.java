package com.aivle0102.bigproject.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;

import com.aivle0102.bigproject.domain.MarketReport;
import com.aivle0102.bigproject.domain.Recipe;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Getter
@AllArgsConstructor
public class ReportDetailResponse {
    private Long reportId;
    private Long recipeId;
    private String recipeTitle;
    private String recipeDescription;
    private List<String> ingredients;
    private List<String> steps;
    private String imageBase64;
    private Map<String, Object> report;
    private Map<String, Object> allergen;
    private String summary;
    private String content;
    private List<Map<String, Object>> influencers;
    private String influencerImageBase64;
    private String reportType;
    private String reportOpenYn;
    private String recipeOpenYn;
    private String recipeStatus;
    private String recipeUserId;
    private LocalDateTime createdAt;

    public static ReportDetailResponse from(MarketReport report) {
        Recipe recipe = report == null ? null : report.getRecipe();
        return new ReportDetailResponse(
                report == null ? null : report.getId(),
                recipe == null ? null : recipe.getId(),
                recipe == null ? null : recipe.getRecipeName(),
                recipe == null ? null : recipe.getDescription(),
                null,
                null,
                recipe == null ? null : recipe.getImageBase64(),
                null,
                null,
                report == null ? null : report.getSummary(),
                report == null ? null : report.getContent(),
                null,
                null,
                report == null ? null : report.getReportType(),
                report == null ? null : report.getOpenYn(),
                recipe == null ? null : recipe.getOpenYn(),
                recipe == null ? null : recipe.getStatus(),
                recipe == null ? null : recipe.getUserId(),
                report == null ? null : report.getCreatedAt()
        );
    }
}
