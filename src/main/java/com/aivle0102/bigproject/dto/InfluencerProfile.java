package com.aivle0102.bigproject.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@AllArgsConstructor
@NoArgsConstructor
public class InfluencerProfile {
    private String name;          // 실존 이름 또는 활동명
    private String platform;      // TikTok/Instagram/YouTube etc
    private String profileUrl;    // 링크
    private String imageUrl;      // SerpApi thumbnail/og image 후보
    private String rationale;     // 왜 적합한지
    private String riskNotes;     // 협업 리스크/주의
    private String confidenceNote;// "추정/검증 필요" 등
    private String source;        // "SerpApi(google)" 등
}
