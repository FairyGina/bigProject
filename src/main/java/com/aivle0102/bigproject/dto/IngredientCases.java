package com.aivle0102.bigproject.dto;

import lombok.Builder;
import lombok.Getter;

import java.util.List;

// 특정 원재료(ingredient)별로 매칭된 케이스 목록을 묶는 중간 DTO.

@Getter
@Builder
public class IngredientCases {
    private String ingredient;
    private List<RegulatoryCase> cases;
}