package com.aivle0102.bigproject.dto;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;
import java.util.Map;

@Getter
@Setter
@NoArgsConstructor
public class RecipePublishRequest {
    private List<Map<String, Object>> influencers;
    private String influencerImageBase64;
}
