package com.aivle0102.bigproject.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Collections;

@Slf4j
@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtTokenProvider jwtTokenProvider;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        String requestUri = request.getRequestURI();
        String authHeader = request.getHeader("Authorization");

        // 디버그 로그: Authorization 헤더 수신 여부
        log.debug("[JWT Filter] URI: {}, Authorization Header Present: {}", requestUri, authHeader != null);

        if (authHeader != null) {
            log.debug("[JWT Filter] Authorization Header Value: {}",
                    authHeader.length() > 20 ? authHeader.substring(0, 20) + "..." : authHeader);
        }

        String token = resolveToken(request);

        if (token != null) {
            log.debug("[JWT Filter] Token extracted successfully, length: {}", token.length());

            try {
                if (jwtTokenProvider.validateToken(token)) {
                    String userId = jwtTokenProvider.getUserId(token);
                    log.info("[JWT Filter] Token validated successfully for user: {}", userId);

                    UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
                            userId,
                            null,
                            Collections.emptyList());

                    authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                    SecurityContextHolder.getContext().setAuthentication(authentication);
                } else {
                    log.warn("[JWT Filter] Token validation failed for URI: {}", requestUri);
                }
            } catch (Exception e) {
                log.error("[JWT Filter] Token parsing/validation error: {}", e.getMessage());
            }
        } else {
            log.debug("[JWT Filter] No token found in request for URI: {}", requestUri);
        }

        filterChain.doFilter(request, response);
    }

    private String resolveToken(HttpServletRequest request) {
        String bearerToken = request.getHeader("Authorization");
        if (StringUtils.hasText(bearerToken) && bearerToken.startsWith("Bearer ")) {
            return bearerToken.substring(7);
        }
        return null;
    }
}
