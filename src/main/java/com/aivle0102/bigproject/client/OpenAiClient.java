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

    @SuppressWarnings("unchecked")
    public String chatCompletion(Map<String, Object> body) {

        return openAiWebClient.post()
                .uri("/chat/completions")
                .bodyValue(body)
                .retrieve()
                .onStatus(
                        status -> status.value() == 429,
                        response -> Mono.error(new RuntimeException("OpenAI Rate Limit 초과"))
                )
                .bodyToMono(Map.class)
                .map(res -> {
                    List<Map<String, Object>> choices =
                            (List<Map<String, Object>>) res.get("choices");

                    if (choices == null || choices.isEmpty()) {
                        throw new RuntimeException("OpenAI 응답 choices 비어있음");
                    }

                    Map<String, Object> message =
                            (Map<String, Object>) choices.get(0).get("message");

                    return message.get("content").toString();
                })
                .block();
    }
}
