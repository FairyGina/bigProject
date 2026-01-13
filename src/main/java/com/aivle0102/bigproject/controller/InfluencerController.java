package com.aivle0102.bigproject.controller;

import com.aivle0102.bigproject.dto.InfluencerRecommendRequest;
import com.aivle0102.bigproject.dto.InfluencerRecommendResponse;
import com.aivle0102.bigproject.service.InfluencerDiscoveryService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/influencers")
public class InfluencerController {
    private final InfluencerDiscoveryService influencerDiscoveryService;

    @PostMapping("/recommend")
    public InfluencerRecommendResponse recommend(@RequestBody InfluencerRecommendRequest req) {
        return new InfluencerRecommendResponse(influencerDiscoveryService.recommend(req));
    }
}
