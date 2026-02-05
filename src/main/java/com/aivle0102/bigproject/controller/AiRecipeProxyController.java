package com.aivle0102.bigproject.controller;

// 파일 설명: Gradio 서버(/ai/recipe/**)로 요청을 프록시하는 컨트롤러

import jakarta.servlet.http.HttpServletRequest;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

@RestController
public class AiRecipeProxyController {

    private static final String PROXY_PREFIX = "/ai/recipe";

    private final WebClient webClient;
    private final String gradioBaseUrl;

    public AiRecipeProxyController(WebClient.Builder webClientBuilder,
            @Value("${ai.gradio.base-url}") String gradioBaseUrl) {
        this.webClient = webClientBuilder.build();
        this.gradioBaseUrl = gradioBaseUrl;
    }

    // /ai/recipe/** 로 들어오는 요청을 Gradio 서버로 그대로 전달
    @RequestMapping(value = {PROXY_PREFIX, PROXY_PREFIX + "/**"})
    public Mono<ResponseEntity<byte[]>> proxy(
            HttpServletRequest request,
            @RequestHeader HttpHeaders headers,
            @RequestBody(required = false) byte[] body,
            HttpMethod method) {
        String targetUrl = buildTargetUrl(request);

        WebClient.RequestBodySpec requestSpec = webClient.method(method).uri(targetUrl);
        requestSpec.headers(httpHeaders -> {
            httpHeaders.addAll(filterRequestHeaders(headers));
        });

        if (body != null && body.length > 0 && method != HttpMethod.GET && method != HttpMethod.HEAD) {
            requestSpec.bodyValue(body);
        }

        return requestSpec.exchangeToMono(response -> {
            HttpHeaders responseHeaders = new HttpHeaders();
            response.headers().asHttpHeaders().forEach((key, values) -> responseHeaders.put(key, values));
            return response.bodyToMono(byte[].class)
                    .defaultIfEmpty(new byte[0])
                    .map(bytes -> ResponseEntity.status(response.statusCode())
                            .headers(responseHeaders)
                            .body(bytes));
        });
    }

    // 프록시 접두어(/ai/recipe)를 제거하고 Gradio base-url과 결합
    private String buildTargetUrl(HttpServletRequest request) {
        String requestUri = request.getRequestURI();
        String suffix = requestUri.startsWith(PROXY_PREFIX)
                ? requestUri.substring(PROXY_PREFIX.length())
                : "";
        String normalizedBase = gradioBaseUrl.endsWith("/")
                ? gradioBaseUrl.substring(0, gradioBaseUrl.length() - 1)
                : gradioBaseUrl;
        StringBuilder target = new StringBuilder(normalizedBase);
        if (suffix.isEmpty()) {
            target.append("/");
        } else {
            target.append(suffix);
        }
        if (request.getQueryString() != null) {
            target.append("?").append(request.getQueryString());
        }
        return target.toString();
    }

    // 전달하면 안 되는 헤더(Host 등)를 제거해서 프록시 요청을 정리
    private HttpHeaders filterRequestHeaders(HttpHeaders headers) {
        HttpHeaders filtered = new HttpHeaders();
        headers.forEach((key, values) -> {
            if (HttpHeaders.HOST.equalsIgnoreCase(key)
                    || HttpHeaders.CONTENT_LENGTH.equalsIgnoreCase(key)
                    || HttpHeaders.CONNECTION.equalsIgnoreCase(key)) {
                return;
            }
            filtered.put(key, values);
        });
        return filtered;
    }
}
