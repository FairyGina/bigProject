package com.aivle0102.bigproject.util;

public final class OpenAiJsonUtils {

    private OpenAiJsonUtils() {}

    public static String extractJsonBlock(String content, char open, char close) {
        String trimmed = content == null ? "" : content.trim();
        String json = trimmed;
        if (trimmed.startsWith("```")) {
            json = trimmed.replaceFirst("^```[a-zA-Z]*\\s*", "");
            json = json.replaceFirst("\\s*```$", "");
        }
        int start = json.indexOf(open);
        int end = json.lastIndexOf(close);
        if (start >= 0 && end > start) {
            json = json.substring(start, end + 1);
        }
        return json;
    }
}
