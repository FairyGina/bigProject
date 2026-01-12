package com.aivle0102.bigproject.dto;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ReportResponse {
    private String overview;
    private String ingredientAnalysis;
    private String localFit;
    private String risks;
    private String improvement;
    private String launchDecision;
}

