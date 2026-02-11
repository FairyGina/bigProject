package com.aivle0102.bigproject.client;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.util.UriComponentsBuilder;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.net.URI;

@Component
public class SerpApiClient {
    private final WebClient serpApiWebClient;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Value("${serpapi.api-key}")
    private String apiKey;

    public SerpApiClient(@Qualifier("serpApiWebClient") WebClient serpApiWebClient) {
        this.serpApiWebClient = serpApiWebClient;
    }

    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(SerpApiClient.class);

    public JsonNode googleSearch(String query) {
        log.debug("Calling SerpApi Google Search with query: {}", query);
        String raw = serpApiWebClient.get()
                .uri(uriBuilder -> uriBuilder
                        .path("/search.json")
                        .queryParam("engine", "google")
                        .queryParam("q", query)
                        .queryParam("num", 10)
                        .queryParam("api_key", apiKey)
                        .build())
                .retrieve()
                .onStatus(
                        status -> status.isError(),
                        response -> response.bodyToMono(String.class)
                                .flatMap(errorBody -> {
                                    log.error("SerpApi Error: Status={}, Body={}", response.statusCode(), errorBody);
                                    return Mono.error(new RuntimeException("SerpApi 호출 실패: " + response.statusCode()));
                                }))
                .bodyToMono(String.class)
                .block();

        try {
            JsonNode node = objectMapper.readTree(raw);
            log.debug("SerpApi response received and parsed");
            return node;
        } catch (Exception e) {
            log.error("Failed to parse SerpApi response: {}", raw);
            throw new RuntimeException("SerpApi 응답 파싱에 실패했습니다.", e);
        }
    }
}
