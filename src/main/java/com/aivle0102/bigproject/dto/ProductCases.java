package com.aivle0102.bigproject.dto;

import lombok.Builder;
import lombok.Getter;

import java.util.List;

@Getter
@Builder
public class ProductCases {
    private String product;
    private List<RegulatoryCase> cases;
}
