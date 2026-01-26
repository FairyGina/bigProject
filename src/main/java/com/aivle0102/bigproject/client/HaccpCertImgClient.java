// HACCP 제품 이미지/표기 정보 API를 호출하는 클라이언트.
// prdkind/prdlstNm 검색 결과를 파싱해 반환한다.

package com.aivle0102.bigproject.client;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.dataformat.xml.XmlMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.nio.charset.StandardCharsets;
import java.util.Optional;

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
                .queryParam("prdkind", prdkindKeyword)
                .queryParam("ServiceKey", serviceKey)
                .build()
                .toUriString();

        System.out.println("[HACCP URL] " + maskServiceKey(url));

        ResponseEntity<String> resp = restTemplate.getForEntity(url, String.class);

        String body = Optional.ofNullable(resp.getBody()).orElse("");
        if (!body.trim().startsWith("<")) {
            throw new IllegalStateException("HACCP API returned non-XML response: " + body);
        }

        try {
            return xmlMapper.readTree(body.getBytes(StandardCharsets.UTF_8));
        } catch (Exception e) {
            throw new IllegalStateException("Failed to parse HACCP XML response", e);
        }
    }

    public JsonNode searchByPrdlstNm(String prdlstNmKeyword, int pageNo, int numOfRows) {
        String url = UriComponentsBuilder
                .fromUriString(baseUrl + "/CertImgListServiceV3/getCertImgListServiceV3")
                .queryParam("returnType", "xml")
                .queryParam("pageNo", pageNo)
                .queryParam("numOfRows", numOfRows)
                .queryParam("prdlstNm", prdlstNmKeyword)
                .queryParam("ServiceKey", serviceKey)
                .build()
                .toUriString();

        System.out.println("[HACCP URL] " + maskServiceKey(url));

        ResponseEntity<String> resp = restTemplate.getForEntity(url, String.class);

        String body = Optional.ofNullable(resp.getBody()).orElse("");
        if (!body.trim().startsWith("<")) {
            throw new IllegalStateException("HACCP API returned non-XML response: " + body);
        }

        try {
            return xmlMapper.readTree(body.getBytes(StandardCharsets.UTF_8));
        } catch (Exception e) {
            throw new IllegalStateException("Failed to parse HACCP XML response", e);
        }
    }

    private String maskServiceKey(String url) {
        int idx = url.indexOf("ServiceKey=");
        if (idx < 0) return url;
        return url.substring(0, idx + "ServiceKey=".length()) + "***";
    }
}
