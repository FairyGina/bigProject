package com.aivle0102.bigproject.controller;

import com.aivle0102.bigproject.domain.ConsumerFeedback;
import com.aivle0102.bigproject.dto.ConsumerFeedbackResponse;
import com.aivle0102.bigproject.dto.EvaluationRequest;
import com.aivle0102.bigproject.service.EvaluationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/evaluation")
public class EvaluationController {

    private final EvaluationService evaluationService;

    // 각 AI 심사위원에게 생성한 보고서를 토대로 평가 진행
    @PostMapping
    public ResponseEntity<List<ConsumerFeedbackResponse>> evaluateByPersonas(@RequestBody EvaluationRequest request) {
        List<ConsumerFeedback> results = evaluationService.evaluate(request.getPersonas(), request.getReport());
        List<ConsumerFeedbackResponse> response = results.stream()
                .map(ConsumerFeedbackResponse::from)
                .toList();
        return ResponseEntity.ok(response);
    }
}

