package com.aivle0102.bigproject.controller;

import com.aivle0102.bigproject.service.ReportProgressTracker;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@RestController
@RequiredArgsConstructor
public class ReportProgressController {

    private final ReportProgressTracker reportProgressTracker;

    @GetMapping("/api/reports/progress/{jobId}")
    public SseEmitter subscribe(@PathVariable("jobId") String jobId) {
        return reportProgressTracker.subscribe(jobId);
    }
}
