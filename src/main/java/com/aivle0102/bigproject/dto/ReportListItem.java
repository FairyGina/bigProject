package com.aivle0102.bigproject.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@AllArgsConstructor
public class ReportListItem {
    private Long id;
    private String reportType;
    private String summary;
    private String openYn;
    private LocalDateTime createdAt;
}
