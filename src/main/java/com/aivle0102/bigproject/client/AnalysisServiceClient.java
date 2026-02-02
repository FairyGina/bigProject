package com.aivle0102.bigproject.client;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;
import io.netty.channel.ChannelOption;
import io.netty.handler.timeout.ReadTimeoutHandler;
import io.netty.handler.timeout.WriteTimeoutHandler;
import org.springframework.http.client.reactive.ReactorClientHttpConnector;
import reactor.netty.http.client.HttpClient;

import java.time.Duration;
import java.util.concurrent.TimeUnit;

@Component
public class AnalysisServiceClient {

        private final WebClient webClient;

        public AnalysisServiceClient(@Value("${analysis.engine.url}") String baseUrl) {
                HttpClient httpClient = HttpClient.create()
                                .option(ChannelOption.CONNECT_TIMEOUT_MILLIS, 2000) // ConnectTimeout 2초
                                .responseTimeout(Duration.ofSeconds(5)) // ReadTimeout 5초 (Response)
                                .doOnConnected(conn -> conn.addHandlerLast(new ReadTimeoutHandler(5, TimeUnit.SECONDS))
                                                .addHandlerLast(new WriteTimeoutHandler(5, TimeUnit.SECONDS)));

                this.webClient = WebClient.builder()
                                .baseUrl(baseUrl)
                                .clientConnector(new ReactorClientHttpConnector(httpClient))
                                .build();
        }

        public Mono<String> analyze(String country, String item) {
                return webClient.get()
                                .uri(uriBuilder -> uriBuilder
                                                .path("/analyze")
                                                .queryParam("country", country)
                                                .queryParam("item", item)
                                                .build())
                                .retrieve()
                                .bodyToMono(String.class);
        }

        public Mono<String> getAvailableItems() {
                return webClient.get()
                                .uri("/items")
                                .retrieve()
                                .bodyToMono(String.class);
        }
}
