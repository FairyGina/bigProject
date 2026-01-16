package com.aivle0102.bigproject.client;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.dataformat.xml.XmlMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;
import org.springframework.web.util.UriUtils;

import java.nio.charset.StandardCharsets;
@Component
@RequiredArgsConstructor
public class HaccpCertImgClient {

    // host까지만 url 입력
    @Value("http://apis.data.go.kr/B553748")
    private String baseUrl;

    @Value("${haccp.service-key}")
    private String serviceKey;

    private final RestTemplate restTemplate = new RestTemplate();
    private final XmlMapper xmlMapper = new XmlMapper();

    public JsonNode searchByPrdkind(String prdkindKeyword, int pageNo, int numOfRows) {

        String url = UriComponentsBuilder
                .fromUriString(baseUrl + "/CertImgListServiceV3/getCertImgListServiceV3")
                .queryParam("returnType", "xml")
                .queryParam("pageNo", pageNo)
                .queryParam("numOfRows", numOfRows)
                .queryParam("prdkind", prdkindKeyword) //prdkind = 식품유형으로 우선 검색 진행
                .build(false)
                .toUriString()
                + "&ServiceKey=" + serviceKey; // raw key 그대로 입력해야 함

        System.out.println("[HACCP URL] " + url);

        ResponseEntity<String> resp =
                restTemplate.getForEntity(url, String.class);

        /*
        디버깅용 출력, 필요 시 주석 해제 후 사용
        System.out.println("========== HACCP RAW RESPONSE ==========");
        System.out.println(resp.getBody());
        System.out.println("========================================");
        */

        try {
            return xmlMapper.readTree(resp.getBody().getBytes(StandardCharsets.UTF_8));
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }
}
