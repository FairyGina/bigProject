package com.aivle0102.bigproject.controller;

import com.aivle0102.bigproject.dto.ImageGenerateRequest;
import com.aivle0102.bigproject.dto.ImageGenerateResponse;
import com.aivle0102.bigproject.service.InfluencerImageGenerationService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/images")
public class ImageController {
    private final InfluencerImageGenerationService influencerImageGenerationService;

    @PostMapping("/generate")
    public ImageGenerateResponse generate(@RequestBody ImageGenerateRequest req) {
        return influencerImageGenerationService.generate(req);
    }
}
