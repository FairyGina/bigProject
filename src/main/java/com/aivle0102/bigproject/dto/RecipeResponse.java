package com.aivle0102.bigproject.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Getter;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Getter
@AllArgsConstructor
public class RecipeResponse {
    private Long id;
    private String title;
    private String description;
    private List<String> ingredients;
    private List<String> steps;
    private String imageBase64;
    private Map<String, Object> report;
    private Map<String, Object> allergen;
    private String summary;
    private List<Map<String, Object>> influencers;
    private String influencerImageBase64;
    private String status;
    private String openYn;
    @JsonProperty("user_id")
    private String userId;
    @JsonProperty("user_name")
    private String userName;
    private LocalDateTime createdAt;
}
