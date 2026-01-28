package com.aivle0102.bigproject.controller;

import com.aivle0102.bigproject.dto.IngredientExtractRequest;
import com.aivle0102.bigproject.dto.IngredientExtractResponse;
import com.aivle0102.bigproject.service.IngredientExtractionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/ingredients")
public class IngredientController {

    private final IngredientExtractionService ingredientExtractionService;

    @PostMapping("/extract")
    public ResponseEntity<IngredientExtractResponse> extract(@RequestBody IngredientExtractRequest request) {
        List<String> steps = request == null ? List.of() : request.getSteps();
        List<String> ingredients = ingredientExtractionService.extractFromSteps(steps);
        return ResponseEntity.ok(new IngredientExtractResponse(ingredients));
    }
}
