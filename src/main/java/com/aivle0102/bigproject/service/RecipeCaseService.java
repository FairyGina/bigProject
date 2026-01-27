package com.aivle0102.bigproject.service;

import com.aivle0102.bigproject.dto.RecipeCaseRequest;
import com.aivle0102.bigproject.dto.RecipeCaseResponse;

public interface RecipeCaseService {
    RecipeCaseResponse findCases(RecipeCaseRequest request);
}