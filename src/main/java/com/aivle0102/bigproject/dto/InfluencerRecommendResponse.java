package com.aivle0102.bigproject.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;

import java.util.List;

@Getter
@AllArgsConstructor
public class InfluencerRecommendResponse {
    private List<InfluencerProfile> recommendations;
}
