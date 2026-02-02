package com.aivle0102.bigproject.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;

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
    private List<Map<String, Object>> influencers;
    private String influencerImageBase64;
    private String reportType;
    private String reportOpenYn;
    private String recipeOpenYn;
    private String recipeStatus;
    private String recipeUserId;
    private LocalDateTime createdAt;
}
