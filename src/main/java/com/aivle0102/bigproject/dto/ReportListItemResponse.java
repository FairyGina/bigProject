package com.aivle0102.bigproject.dto;

import com.aivle0102.bigproject.domain.MarketReport;
import com.aivle0102.bigproject.domain.Recipe;
import lombok.AllArgsConstructor;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@AllArgsConstructor
public class ReportListItemResponse {
    private Long reportId;
    private Long recipeId;
    private String recipeTitle;
    private String recipeImageBase64;
    private String summary;
    private String reportType;
    private String reportOpenYn;
    private LocalDateTime createdAt;

    public static ReportListItemResponse from(MarketReport report) {
        Recipe recipe = report == null ? null : report.getRecipe();
        return new ReportListItemResponse(
                report == null ? null : report.getId(),
                recipe == null ? null : recipe.getId(),
                recipe == null ? null : recipe.getRecipeName(),
                recipe == null ? null : recipe.getImageBase64(),
                report == null ? null : report.getSummary(),
                report == null ? null : report.getReportType(),
                report == null ? null : report.getOpenYn(),
                report == null ? null : report.getCreatedAt()
        );
    }
}
