package com.aivle0102.bigproject.config;

import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;

@Configuration
public class JacksonConfig {

    @Bean
    @Primary
    public ObjectMapper objectMapper() {
        ObjectMapper mapper = new ObjectMapper();
        // 타임스탬프 대신 ISO-8601 형식 사용
        mapper.disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
        // 새로운 속성이 있어도 에러 내지 않음
        mapper.configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);
        // Java 8 날짜/시간 모듈 등록
        mapper.registerModule(new JavaTimeModule());
        return mapper;
    }
}
