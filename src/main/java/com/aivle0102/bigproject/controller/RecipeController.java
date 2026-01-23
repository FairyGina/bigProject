package com.aivle0102.bigproject.controller;

import com.aivle0102.bigproject.dto.RecipeCreateRequest;
import com.aivle0102.bigproject.dto.RecipePublishRequest;
import com.aivle0102.bigproject.dto.RecipeResponse;
import com.aivle0102.bigproject.service.RecipeService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.DeleteMapping;

import java.security.Principal;
import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/recipes")
public class RecipeController {

    private final RecipeService recipeService;

    @PostMapping
    public ResponseEntity<RecipeResponse> create(@RequestBody RecipeCreateRequest request, Principal principal) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        RecipeResponse response = recipeService.create(principal.getName(), request);
        return ResponseEntity.ok(response);
    }

    @GetMapping
    public ResponseEntity<List<RecipeResponse>> getAll() {
        return ResponseEntity.ok(recipeService.getAll());
    }

    @GetMapping("/me")
    public ResponseEntity<List<RecipeResponse>> getMine(Principal principal) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        return ResponseEntity.ok(recipeService.getByAuthor(principal.getName()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<RecipeResponse> getOne(@PathVariable Long id, Principal principal) {
        String requester = principal == null ? null : principal.getName();
        return ResponseEntity.ok(recipeService.getOne(id, requester));
    }

    @PutMapping("/{id}/publish")
    public ResponseEntity<RecipeResponse> publish(
            @PathVariable Long id,
            @RequestBody(required = false) RecipePublishRequest request,
            Principal principal) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        return ResponseEntity.ok(recipeService.publish(id, principal.getName(), request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<RecipeResponse> update(@PathVariable Long id, @RequestBody RecipeCreateRequest request,
            Principal principal) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        return ResponseEntity.ok(recipeService.update(id, principal.getName(), request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id, Principal principal) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        recipeService.delete(id, principal.getName());
        return ResponseEntity.noContent().build();
    }
}
