package com.aivle0102.bigproject.security.oauth;

import com.aivle0102.bigproject.security.JwtTokenProvider;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

import java.io.IOException;
import com.aivle0102.bigproject.security.RedirectValidator;
import lombok.extern.slf4j.Slf4j;

@Component
@RequiredArgsConstructor
@Slf4j
public class OAuth2AuthenticationSuccessHandler implements AuthenticationSuccessHandler {

    private final JwtTokenProvider jwtTokenProvider;

    @Value("${app.oauth2.redirect-uri}")
    private String redirectUri;

    @Override
    public void onAuthenticationSuccess(
            HttpServletRequest request,
            HttpServletResponse response,
            Authentication authentication
    ) throws IOException, ServletException {
        OAuth2User oauthUser = (OAuth2User) authentication.getPrincipal();
        String userId = String.valueOf(oauthUser.getAttributes().get("userId"));
        String userName = String.valueOf(oauthUser.getAttributes().get("userName"));
        String token = jwtTokenProvider.createToken(userId, userName);

        String targetUrl = UriComponentsBuilder.fromUriString(redirectUri)
                .queryParam("token", token)
                .queryParam("userId", userId)
                .build()
                .encode()
                .toUriString();

        try {
            log.info("OAuth2 success redirectUri={}, targetUrl={}", redirectUri, targetUrl);
            String safeTargetUrl = RedirectValidator.sanitizeAndValidateSameOrigin(redirectUri, targetUrl);
            response.sendRedirect(safeTargetUrl);
        } catch (IllegalArgumentException ex) {
            log.warn("OAuth2 redirect blocked: {}", ex.getMessage());
            response.sendError(HttpServletResponse.SC_BAD_REQUEST);
        }
    }
}
