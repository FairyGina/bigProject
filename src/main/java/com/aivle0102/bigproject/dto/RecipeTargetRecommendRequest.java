package com.aivle0102.bigproject.dto;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
public class RecipeTargetRecommendRequest {
    private String title;
    private String description;
    private List<String> ingredients;
    private List<String> steps;
}
