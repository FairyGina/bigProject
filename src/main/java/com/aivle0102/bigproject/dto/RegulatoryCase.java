package com.aivle0102.bigproject.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Builder;
import lombok.Getter;

// RegulatoryCase 응답 dto: 실제 케이스 1건의 상세 필드들을 담는 DTO. JSON 필드명이 snake_case라서 @JsonProperty로 맞춤.

@Getter
@Builder
public class RegulatoryCase {
    @JsonProperty("case_id")
    private String caseId;
    private String country;
    @JsonProperty("announcement_date")
    private String announcementDate;
    private String ingredient;
    @JsonProperty("violation_reason")
    private String violationReason;
    private String action;
    @JsonProperty("matched_ingredient")
    private String matchedIngredient;
}
