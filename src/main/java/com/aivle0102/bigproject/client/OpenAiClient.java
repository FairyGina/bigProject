package com.aivle0102.bigproject.client;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.util.List;
import java.util.Map;

// OpenAI 호출 전용 클래스

@Component
public class OpenAiClient {

    private final WebClient openAiWebClient;

    public OpenAiClient(@Qualifier("openAiWebClient") WebClient openAiWebClient) {
        this.openAiWebClient = openAiWebClient;
    }

    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(OpenAiClient.class);

    @SuppressWarnings("unchecked")
    public String chatCompletion(Map<String, Object> body) {
        // log.debug("Calling OpenAI API with body: {}", body);

        return openAiWebClient.post()
                .uri("/chat/completions")
                .bodyValue(body)
                .retrieve()
                .onStatus(
                        status -> status.isError(),
                        response -> response.bodyToMono(String.class)
                                .flatMap(errorBody -> {
                                    log.error("OpenAI API Error: Status={}, Body={}", response.statusCode(), errorBody);
                                    return Mono
                                            .error(new RuntimeException("OpenAI API 호출 실패: " + response.statusCode()));
                                }))
                .bodyToMono(Map.class)
                .map(res -> {
                    List<Map<String, Object>> choices = (List<Map<String, Object>>) res.get("choices");

                    if (choices == null || choices.isEmpty()) {
                        log.error("OpenAI response choices are empty. Response: {}", res);
                        throw new RuntimeException("OpenAI 응답 choices 비어있음");
                    }

                    Map<String, Object> message = (Map<String, Object>) choices.get(0).get("message");

                    String content = message.get("content").toString();
                    // log.debug("OpenAI API Response content received (length: {})",
                    // content.length());
                    return content;
                })
                .block();
    }
}
