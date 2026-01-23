package com.aivle0102.bigproject.security.oauth;

import com.aivle0102.bigproject.security.RedirectValidator;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.authentication.AuthenticationFailureHandler;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

import java.io.IOException;

@Component
@Slf4j
public class OAuth2AuthenticationFailureHandler implements AuthenticationFailureHandler {

    @Value("${app.oauth2.authorized-redirect-uri}")
    private String redirectUri;

    @Override
    public void onAuthenticationFailure(
            HttpServletRequest request,
            HttpServletResponse response,
            AuthenticationException exception) throws IOException, ServletException {
        String targetUrl = UriComponentsBuilder.fromUriString(redirectUri)
                .queryParam("error", "oauth_failed")
                .build()
                .toUriString();

        try {
            log.info("OAuth2 failure redirectUri={}, targetUrl={}", redirectUri, targetUrl);
            String safeTargetUrl = RedirectValidator.sanitizeAndValidateSameOrigin(redirectUri, targetUrl);
            response.sendRedirect(safeTargetUrl);
        } catch (IllegalArgumentException ex) {
            log.warn("OAuth2 redirect blocked: {}", ex.getMessage());
            response.sendError(HttpServletResponse.SC_BAD_REQUEST);
        }
    }
}
