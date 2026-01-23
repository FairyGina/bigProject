package com.aivle0102.bigproject.config;

import com.aivle0102.bigproject.security.JwtAuthenticationFilter;
import com.aivle0102.bigproject.security.oauth.OAuth2AuthenticationFailureHandler;
import com.aivle0102.bigproject.security.oauth.OAuth2AuthenticationSuccessHandler;
import com.aivle0102.bigproject.security.oauth.CustomOAuth2UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;

@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
public class SecurityConfig {

        private final JwtAuthenticationFilter jwtAuthenticationFilter;
        private final CustomOAuth2UserService customOAuth2UserService;
        private final OAuth2AuthenticationSuccessHandler oAuth2AuthenticationSuccessHandler;
        private final OAuth2AuthenticationFailureHandler oAuth2AuthenticationFailureHandler;

        @Bean
        @ConditionalOnProperty(name = "app.oauth2.enabled", havingValue = "true")
        public SecurityFilterChain oauthSecurityFilterChain(HttpSecurity http) throws Exception {
                http
                                // CORS 설정 - 최상단에 위치
                                .cors(Customizer.withDefaults())
                                .csrf(AbstractHttpConfigurer::disable)
                                .sessionManagement(session -> session
                                                .sessionCreationPolicy(SessionCreationPolicy.IF_REQUIRED))
                                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class)
                                .authorizeHttpRequests(auth -> auth
                                                // OPTIONS 요청 (Preflight) 허용
                                                .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                                                .requestMatchers("/api/auth/**").permitAll()
                                                .requestMatchers("/api/health").permitAll()
                                                .requestMatchers("/actuator/health").permitAll()
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
                                // CORS 설정 - 최상단에 위치
                                .cors(Customizer.withDefaults())
                                .csrf(AbstractHttpConfigurer::disable)
                                .sessionManagement(session -> session
                                                .sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class)
                                .authorizeHttpRequests(auth -> auth
                                                // OPTIONS 요청 (Preflight) 허용
                                                .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                                                .requestMatchers("/api/auth/**").permitAll()
                                                .requestMatchers("/api/health").permitAll()
                                                .requestMatchers("/actuator/health").permitAll()
                                                .requestMatchers("/error").permitAll()
                                                .anyRequest().permitAll());

                return http.build();
        }

        @Bean
        public CorsConfigurationSource corsConfigurationSource() {
                CorsConfiguration configuration = new CorsConfiguration();
                // 프론트엔드 주소 허용 (공인 IP 포함)
                configuration.setAllowedOrigins(Arrays.asList(
                                "http://localhost:3000",
                                "http://localhost:5173",
                                "http://localhost",
                                "http://20.197.14.81",
                                "http://20.197.14.81:80"));
                configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS"));
                configuration.setAllowedHeaders(Arrays.asList("*"));
                configuration.setAllowCredentials(true);

                UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
                source.registerCorsConfiguration("/**", configuration);
                return source;
        }
}
