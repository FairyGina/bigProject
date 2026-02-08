package com.aivle0102.bigproject.dto;

import com.aivle0102.bigproject.domain.ReportChatMessage;
import lombok.AllArgsConstructor;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@AllArgsConstructor
public class ReportChatMessageResponse {
    private Long messageId;
    private Long reportId;
    private Long roomId;
    private String userId;
    private String userName;
    private String content;
    private LocalDateTime createdAt;

    public static ReportChatMessageResponse from(ReportChatMessage message, String userName) {
        return new ReportChatMessageResponse(
                message == null ? null : message.getId(),
                message == null || message.getRoom() == null || message.getRoom().getReport() == null
                        ? null
                        : message.getRoom().getReport().getId(),
                message == null || message.getRoom() == null ? null : message.getRoom().getId(),
                message == null ? null : message.getUserId(),
                userName,
                message == null ? null : message.getContent(),
                message == null ? null : message.getCreatedAt()
        );
    }
}
