package com.aivle0102.bigproject.controller;

import com.aivle0102.bigproject.dto.RecipeCaseRequest;
import com.aivle0102.bigproject.dto.RecipeCaseResponse;
import com.aivle0102.bigproject.service.RecipeCaseService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/recipe-cases")
@RequiredArgsConstructor
public class RecipeCaseController {

    private final RecipeCaseService recipeCaseService;

    @PostMapping
    public RecipeCaseResponse findRecipeCases(@RequestBody RecipeCaseRequest request) {
        return recipeCaseService.findCases(request);
    }
}
