package com.aivle0102.bigproject.util;

import java.util.Arrays;
import java.util.List;

public final class ReportSummaryUtils {

    private ReportSummaryUtils() {}

    public static String joinIds(List<Long> ids) {
        if (ids == null || ids.isEmpty()) {
            return "";
        }
        return ids.stream().map(String::valueOf).collect(java.util.stream.Collectors.joining(","));
    }

    public static List<Long> parseReportIds(String summary) {
        if (summary == null || summary.isBlank()) {
            return List.of();
        }
        int metaIndex = summary.indexOf("||");
        if (metaIndex < 0) {
            return List.of();
        }
        String meta = summary.substring(metaIndex + 2);
        for (String token : meta.split(";")) {
            if (token.startsWith("reports=")) {
                String ids = token.substring("reports=".length());
                if (ids.isBlank()) {
                    return List.of();
                }
                return Arrays.stream(ids.split(","))
                        .map(String::trim)
                        .filter(v -> !v.isEmpty())
                        .map(Long::valueOf)
                        .toList();
            }
        }
        return List.of();
    }
}
