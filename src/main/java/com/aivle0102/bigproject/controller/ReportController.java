package com.aivle0102.bigproject.controller;

import com.aivle0102.bigproject.dto.ReportRequest;
import com.aivle0102.bigproject.service.AiReportService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/report")
public class ReportController {

    private final AiReportService aiReportService;

    @PostMapping
    public ResponseEntity<String> generate(@RequestBody ReportRequest request) {
        String report = aiReportService.generateReport(request);
        return ResponseEntity.ok(report);
    }

    @PostMapping("/summary")
    public ResponseEntity<String> summary(@RequestBody String fullReport) {
        String report = aiReportService.generateSummary(fullReport);
        return ResponseEntity.ok(report);
    }
}
