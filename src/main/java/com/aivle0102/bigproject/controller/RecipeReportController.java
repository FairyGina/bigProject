package com.aivle0102.bigproject.controller;

import com.aivle0102.bigproject.dto.ReportCreateRequest;
import com.aivle0102.bigproject.dto.ReportDetailResponse;
import com.aivle0102.bigproject.dto.ReportListItem;
import com.aivle0102.bigproject.dto.VisibilityUpdateRequest;
import com.aivle0102.bigproject.service.RecipeService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.security.Principal;
import java.util.List;

@RestController
@RequiredArgsConstructor
public class RecipeReportController {

    private final RecipeService recipeService;

    @GetMapping("/api/recipes/{id}/reports")
    public ResponseEntity<List<ReportListItem>> getReports(@PathVariable("id") Long id, Principal principal) {
        String requester = principal == null ? null : principal.getName();
        return ResponseEntity.ok(recipeService.getReports(id, requester));
    }

    @PostMapping("/api/recipes/{id}/reports")
    public ResponseEntity<ReportDetailResponse> createReport(
            @PathVariable("id") Long id,
            @RequestBody(required = false) ReportCreateRequest request,
            Principal principal
    ) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        return ResponseEntity.ok(recipeService.createReport(id, principal.getName(), request));
    }

    @GetMapping("/api/reports/{reportId}")
    public ResponseEntity<ReportDetailResponse> getReportDetail(@PathVariable("reportId") Long reportId, Principal principal) {
        String requester = principal == null ? null : principal.getName();
        return ResponseEntity.ok(recipeService.getReportDetail(reportId, requester));
    }

    @PutMapping("/api/reports/{reportId}/visibility")
    public ResponseEntity<ReportDetailResponse> updateReportVisibility(
            @PathVariable("reportId") Long reportId,
            @RequestBody(required = false) VisibilityUpdateRequest request,
            Principal principal
    ) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        return ResponseEntity.ok(recipeService.updateReportVisibility(reportId, principal.getName(), request));
    }
}
