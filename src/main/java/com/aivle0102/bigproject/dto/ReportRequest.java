package com.aivle0102.bigproject.dto;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ReportRequest {
    private String recipe;        // 레시피 텍스트
    private String targetCountry; // 국가
    private String targetPersona; // 소비자
    private String priceRange;    // 가격대
}

