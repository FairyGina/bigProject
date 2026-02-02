package com.aivle0102.bigproject.dto;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
public class ReportCreateRequest {
    private String targetCountry;
    private String targetPersona;
    private String priceRange;
    private List<String> reportSections;
    private String openYn;
}
