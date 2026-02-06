package com.aivle0102.bigproject.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class RecipeTargetRecommendResponse {
    private String targetCountry;
    private String targetPersona;
    private String priceRange;
}
