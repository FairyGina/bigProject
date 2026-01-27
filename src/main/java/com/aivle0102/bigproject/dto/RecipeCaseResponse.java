package com.aivle0102.bigproject.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Builder;
import lombok.Getter;

import java.util.List;

@Getter
@Builder
public class RecipeCaseResponse {
    @JsonProperty("product_cases")
    private ProductCases productCases;

    @JsonProperty("ingredient_cases")
    private List<IngredientCases> ingredientCases;
}