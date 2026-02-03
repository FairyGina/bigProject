package com.aivle0102.bigproject.dto;

import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class InfluencerRecommendRequest {
    private String recipe;
    private String targetCountry;
    private String targetPersona;
    private String priceRange;
 
    private String platform;   // "TikTok" / "Instagram" / "YouTube" 등
    private String tone;       // "프로페셔널" / "트렌디" / "유머러스"
    private String constraints; // 브랜드 안전성, 알코올 제외 등
}
