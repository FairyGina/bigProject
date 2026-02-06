package com.aivle0102.bigproject.controller;

import com.aivle0102.bigproject.dto.ReportChatMessageResponse;
import com.aivle0102.bigproject.service.ReportChatService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/chat")
public class ReportChatController {

    private final ReportChatService reportChatService;

    @GetMapping("/report/{reportId}/messages")
    public ResponseEntity<List<ReportChatMessageResponse>> getMessages(@PathVariable("reportId") Long reportId) {
        return ResponseEntity.ok(reportChatService.getMessages(reportId));
    }
}
