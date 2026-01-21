package com.aivle0102.bigproject.controller;

import com.aivle0102.bigproject.dto.ReportRequest;
import com.aivle0102.bigproject.service.AiReportService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/report")
public class ReportController {

    private final AiReportService aiReportService;

    @PostMapping
    public ResponseEntity<Map<String, Object>> generate(@RequestBody ReportRequest request) {
        Map<String, Object> report = aiReportService.generateReport(request);
        return ResponseEntity.ok(report);
    }

    @PostMapping("/summary")
    public ResponseEntity<String> summary(@RequestBody Object fullReport) {
        try {
            String serialized = new com.fasterxml.jackson.databind.ObjectMapper().writeValueAsString(fullReport);
            String report = aiReportService.generateSummary(serialized);
            return ResponseEntity.ok(report);
        } catch (Exception e) {
            throw new IllegalStateException("Failed to serialize report for summary", e);
        }
    }
}
