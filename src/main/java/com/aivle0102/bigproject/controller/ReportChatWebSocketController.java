package com.aivle0102.bigproject.controller;

import com.aivle0102.bigproject.dto.ReportChatMessageRequest;
import com.aivle0102.bigproject.dto.ReportChatMessageResponse;
import com.aivle0102.bigproject.service.ReportChatService;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.security.Principal;

@Controller
@RequiredArgsConstructor
public class ReportChatWebSocketController {

    private final ReportChatService reportChatService;
    private final SimpMessagingTemplate messagingTemplate;

    @MessageMapping("/chat.send")
    public void sendMessage(ReportChatMessageRequest request, Principal principal) {
        if (request == null || request.getReportId() == null) {
            return;
        }
        String userId = principal == null ? null : principal.getName();
        ReportChatMessageResponse saved = reportChatService.saveMessage(
                request.getReportId(),
                userId,
                request.getContent()
        );
        messagingTemplate.convertAndSend("/topic/report/" + request.getReportId(), saved);
    }
}
