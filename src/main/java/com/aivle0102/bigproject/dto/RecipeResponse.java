package com.aivle0102.bigproject.dto;

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
    private String summary;
    private String status;
    private String authorId;
    private String authorName;
    private LocalDateTime createdAt;
}
