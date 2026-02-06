package com.aivle0102.bigproject.dto;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ReportChatMessageRequest {
    private Long reportId;
    private String content;
}
