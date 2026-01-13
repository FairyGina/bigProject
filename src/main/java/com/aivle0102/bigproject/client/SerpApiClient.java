package com.aivle0102.bigproject.client;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.util.UriComponentsBuilder;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.net.URI;

@Component
@RequiredArgsConstructor
public class SerpApiClient {
    private final WebClient serpApiWebClient;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Value("${serpapi.api-key}")
    private String apiKey;

    public JsonNode googleSearch(String query) {
        String raw = serpApiWebClient.get()
                .uri(uriBuilder -> uriBuilder
                        .path("/search.json")
                        .queryParam("engine", "google")
                        .queryParam("q", query)
                        .queryParam("num", 10)
                        .queryParam("api_key", apiKey)
                        .build()
                )
                .retrieve()
                .bodyToMono(String.class)
                .block();

        try {
            return objectMapper.readTree(raw);
        } catch (Exception e) {
            throw new RuntimeException("Failed to parse SerpApi response", e);
        }
    }
}
