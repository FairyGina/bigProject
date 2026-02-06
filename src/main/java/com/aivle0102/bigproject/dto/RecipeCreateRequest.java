package com.aivle0102.bigproject.dto;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
public class RecipeCreateRequest {
    private String title;
    private String description;
    private List<String> ingredients;
    private List<String> steps;
    private String imageBase64;
    private String targetCountry;
    private String targetPersona;
    private String priceRange;
    private List<String> reportSections;
    private boolean draft;
    private boolean regenerateReport;
    private String openYn;
}
