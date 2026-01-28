package com.aivle0102.bigproject.config;

import com.aivle0102.bigproject.security.CsrfCookieFilter;
import com.aivle0102.bigproject.security.JwtAuthenticationFilter;
import com.aivle0102.bigproject.security.oauth.OAuth2AuthenticationFailureHandler;
import com.aivle0102.bigproject.security.oauth.OAuth2AuthenticationSuccessHandler;
import com.aivle0102.bigproject.security.oauth.CustomOAuth2UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;
import org.springframework.security.web.csrf.CsrfFilter;
import org.springframework.security.web.csrf.CsrfTokenRequestAttributeHandler;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.List;

@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
public class SecurityConfig {

        private final JwtAuthenticationFilter jwtAuthenticationFilter;
        private final CsrfCookieFilter csrfCookieFilter;
        private final CustomOAuth2UserService customOAuth2UserService;
        private final OAuth2AuthenticationSuccessHandler oAuth2AuthenticationSuccessHandler;
        private final OAuth2AuthenticationFailureHandler oAuth2AuthenticationFailureHandler;

        @Bean
        @ConditionalOnProperty(name = "app.oauth2.enabled", havingValue = "true")
        public SecurityFilterChain oauthSecurityFilterChain(HttpSecurity http) throws Exception {
                http
                                .csrf(csrf -> {
                                        CookieCsrfTokenRepository csrfTokenRepository = CookieCsrfTokenRepository
                                                        .withHttpOnlyFalse();
                                        csrfTokenRepository.setCookieCustomizer(cookie -> cookie
                                                        .path("/")
                                                        .sameSite("None")
                                                        .secure(true));
                                        csrf.csrfTokenRepository(csrfTokenRepository)
                                                        .csrfTokenRequestHandler(new CsrfTokenRequestAttributeHandler())
                                                        .ignoringRequestMatchers("/api/auth/**", "/api/csrf");
                                })
                                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                                .sessionManagement(session -> session
                                                .sessionCreationPolicy(SessionCreationPolicy.IF_REQUIRED))
                                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class)
                                .addFilterAfter(csrfCookieFilter, JwtAuthenticationFilter.class)
                                .authorizeHttpRequests(auth -> auth
                                                .requestMatchers("/api/auth/**").permitAll()
                                                .requestMatchers("/api/health").permitAll()
                                                .requestMatchers("/oauth2/**", "/login/oauth2/**").permitAll()
                                                .requestMatchers("/error").permitAll()
                                                .anyRequest().permitAll())
                                .oauth2Login(oauth2 -> oauth2
                                                .userInfoEndpoint(userInfo -> userInfo
                                                                .userService(customOAuth2UserService))
                                                .successHandler(oAuth2AuthenticationSuccessHandler)
                                                .failureHandler(oAuth2AuthenticationFailureHandler));

                return http.build();
        }

        @Bean
        @ConditionalOnProperty(name = "app.oauth2.enabled", havingValue = "false", matchIfMissing = true)
        public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
                http
                                .csrf(csrf -> {
                                        CookieCsrfTokenRepository csrfTokenRepository = CookieCsrfTokenRepository
                                                        .withHttpOnlyFalse();
                                        csrfTokenRepository.setCookieCustomizer(cookie -> cookie
                                                        .path("/")
                                                        .sameSite("None")
                                                        .secure(true));
                                        csrf.csrfTokenRepository(csrfTokenRepository)
                                                        .csrfTokenRequestHandler(new CsrfTokenRequestAttributeHandler())
                                                        .ignoringRequestMatchers("/api/auth/**", "/api/csrf");
                                })
                                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                                .sessionManagement(session -> session
                                                .sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class)
                                .addFilterAfter(csrfCookieFilter, JwtAuthenticationFilter.class)
                                .authorizeHttpRequests(auth -> auth
                                                .requestMatchers("/api/auth/**").permitAll()
                                                .requestMatchers("/api/health").permitAll()
                                                .requestMatchers("/error").permitAll()
                                                .anyRequest().permitAll());

                return http.build();
        }

        @Bean
        public CorsConfigurationSource corsConfigurationSource() {
                CorsConfiguration configuration = new CorsConfiguration();
                configuration.setAllowedOrigins(List.of(
                                "http://localhost:5173",
                                "https://bp-frontend-app.wittymushroom-76c80f0d.centralindia.azurecontainerapps.io"));
                configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS"));
                configuration.setAllowedHeaders(List.of("*"));
                configuration.setExposedHeaders(List.of("Authorization", "Content-Type", "X-XSRF-TOKEN"));
                configuration.setAllowCredentials(true);

                UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
                source.registerCorsConfiguration("/**", configuration);
                return source;
        }
}
