package com.aivle0102.bigproject.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Getter;

import java.time.LocalDateTime;

import java.util.List;

@Getter
@AllArgsConstructor
public class RecipeListResponse {
    private Long id;
    private String title;
    private String imageBase64;
    private String description;
    @JsonProperty("user_id")
    private String userId;
    @JsonProperty("user_name")
    private String userName;
    private LocalDateTime createdAt;
    private String status;
    private String openYn;
    private List<String> ingredients;
    private List<String> steps;
}
