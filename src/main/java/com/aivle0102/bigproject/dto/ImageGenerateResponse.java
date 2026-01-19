package com.aivle0102.bigproject.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class ImageGenerateResponse {
    private String imageBase64; // 프론트에서 data:image/png;base64, ... 로 렌더링
    private String note;        // "참고용, 검증 필요" 등
}
