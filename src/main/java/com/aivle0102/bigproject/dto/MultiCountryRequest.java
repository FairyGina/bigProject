package com.aivle0102.bigproject.dto;

import lombok.Getter;

import java.util.List;

@Getter
public class MultiCountryRequest {
    private String recipe;
    private List<String> countries;
}
