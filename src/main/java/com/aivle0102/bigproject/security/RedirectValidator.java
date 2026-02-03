package com.aivle0102.bigproject.security;

import java.net.URI;
import java.util.Objects;

public final class RedirectValidator {

    private RedirectValidator() {
    }

    public static String sanitize(String value) {
        if (value == null) {
            return null;
        }
        String lower = value.toLowerCase();
        if (lower.contains("%0d") || lower.contains("%0a")) {
            throw new IllegalArgumentException("잘못된 리다이렉트 값입니다.");
        }
        return value.replace("\r", "").replace("\n", "");
    }

    public static String sanitizeAndValidateSameOrigin(String baseUrl, String targetUrl) {
        String sanitizedBase = sanitize(baseUrl);
        String sanitizedTarget = sanitize(targetUrl);

        URI base = URI.create(sanitizedBase);
        URI target = URI.create(sanitizedTarget);

        if (!Objects.equals(base.getScheme(), target.getScheme())) {
            throw new IllegalArgumentException("잘못된 리다이렉트 스킴입니다.");
        }
        if (!Objects.equals(base.getHost(), target.getHost())) {
            throw new IllegalArgumentException("잘못된 리다이렉트 호스트입니다.");
        }
        if (normalizePort(base) != normalizePort(target)) {
            throw new IllegalArgumentException("잘못된 리다이렉트 포트입니다.");
        }
        if (target.getUserInfo() != null) {
            throw new IllegalArgumentException("잘못된 리다이렉트 사용자 정보입니다.");
        }

        return sanitizedTarget;
    }

    private static int normalizePort(URI uri) {
        int port = uri.getPort();
        if (port != -1) {
            return port;
        }
        return "https".equalsIgnoreCase(uri.getScheme()) ? 443 : 80;
    }
}
