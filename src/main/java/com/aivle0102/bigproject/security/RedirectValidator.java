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
            throw new IllegalArgumentException("Invalid redirect value");
        }
        return value.replace("\r", "").replace("\n", "");
    }

    public static String sanitizeAndValidateSameOrigin(String baseUrl, String targetUrl) {
        String sanitizedBase = sanitize(baseUrl);
        String sanitizedTarget = sanitize(targetUrl);

        URI base = URI.create(sanitizedBase);
        URI target = URI.create(sanitizedTarget);

        if (!Objects.equals(base.getScheme(), target.getScheme())) {
            throw new IllegalArgumentException("Invalid redirect scheme");
        }
        if (!Objects.equals(base.getHost(), target.getHost())) {
            throw new IllegalArgumentException("Invalid redirect host");
        }
        if (normalizePort(base) != normalizePort(target)) {
            throw new IllegalArgumentException("Invalid redirect port");
        }
        if (target.getUserInfo() != null) {
            throw new IllegalArgumentException("Invalid redirect user info");
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
