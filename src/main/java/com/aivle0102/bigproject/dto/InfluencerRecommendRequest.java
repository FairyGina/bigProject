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

    // optional
    private String platform;   // "TikTok" / "Instagram" / "YouTube" etc
    private String tone;       // "Professional" / "Trendy" / "Humorous"
    private String constraints; // brand safety, avoid alcohol, etc
}
