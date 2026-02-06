package com.aivle0102.bigproject.config;

// 파일 설명: 프록시용 WebClient.Builder 빈을 제공하는 설정 클래스.

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.reactive.function.client.WebClient;

@Configuration
public class WebClientConfig {

    @Bean
    public WebClient.Builder webClientBuilder() {
        return WebClient.builder();
    }
}
