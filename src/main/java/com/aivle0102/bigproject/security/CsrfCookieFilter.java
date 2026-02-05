package com.aivle0102.bigproject.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * CSRF 토큰을 명시적으로 로드하여 쿠키 생성을 강제하는 필터
 * Spring Security 6에서는 CSRF 토큰이 deferred 방식으로 동작하므로
 * 명시적으로 토큰을 로드해야 쿠키가 생성됨
 */
public class CsrfCookieFilter extends OncePerRequestFilter {

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        CsrfToken csrfToken = (CsrfToken) request.getAttribute(CsrfToken.class.getName());
        if (csrfToken != null) {
            // ?좏겙??紐낆떆?곸쑝濡?濡쒕뱶?섏뿬 荑좏궎 ?앹꽦??媛뺤젣??
            csrfToken.getToken();
        }

        filterChain.doFilter(request, response);
    }
}
