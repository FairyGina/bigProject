package com.aivle0102.bigproject.dto;

import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class ImageGenerateRequest {
    private String recipe;
    private String influencerName;
    private String influencerImageUrl; // 추천 결과에서 받은 imageUrl
    private String additionalStyle;    // optional: "clean studio, natural"
}
