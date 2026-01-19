package com.aivle0102.bigproject.service;

import com.aivle0102.bigproject.client.OpenAiClient;
import com.aivle0102.bigproject.client.SerpApiClient;
import com.aivle0102.bigproject.dto.InfluencerProfile;
import com.aivle0102.bigproject.dto.InfluencerRecommendRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.*;

@Service
@RequiredArgsConstructor
public class InfluencerDiscoveryService {

    private static final Logger log = LoggerFactory.getLogger(InfluencerDiscoveryService.class);

    private final SerpApiClient serpApiClient;
    private final OpenAiClient openAiClient;   // ✅ WebClient 대신 이걸 주입

    @Value("${openai.model}")
    private String textModel;

    private final ObjectMapper objectMapper = new ObjectMapper();

    public List<InfluencerProfile> recommend(InfluencerRecommendRequest req) {
        String q = buildSerpQuery(req);
        JsonNode serp = serpApiClient.googleSearch(q);

        List<Map<String, String>> candidates = extractCandidates(serp);

        if (candidates.size() < 5) {
            JsonNode serp2 = serpApiClient.googleSearch(buildFallbackQuery(req));
            candidates.addAll(extractCandidates(serp2));
            candidates = dedupeByLink(candidates);
        }

        if (candidates.isEmpty()) {
            return List.of(new InfluencerProfile(
                    "N/A", "N/A", "",
                    "",
                    "SerpApi 검색 결과가 충분하지 않아 실존 인플루언서를 특정하지 못했습니다.",
                    "검색 쿼리 조정 필요",
                    "검증 필요",
                    "SerpApi(google)"
            ));
        }

        return llmSelectAndFormat(req, candidates);
    }

    private String buildSerpQuery(InfluencerRecommendRequest req) {
        String platform = Optional.ofNullable(req.getPlatform()).orElse("TikTok, Instagram");
        return String.format(
                "kimchi fried rice Korean food influencer %s %s recipe",
                req.getTargetCountry(), platform
        );
    }

    private String buildFallbackQuery(InfluencerRecommendRequest req) {
        String platform = Optional.ofNullable(req.getPlatform()).orElse("TikTok, Instagram");
        return String.format(
                "\"kimchi fried rice\" influencer %s %s",
                req.getTargetCountry(), platform
        );
    }

    private List<Map<String, String>> extractCandidates(JsonNode serp) {
        List<Map<String, String>> out = new ArrayList<>();
        JsonNode organic = serp.get("organic_results");
        if (organic == null || !organic.isArray()) return out;

        for (JsonNode r : organic) {
            String title = safeText(r, "title");
            String link = safeText(r, "link");
            String snippet = safeText(r, "snippet");
            String thumbnail = safeText(r, "thumbnail");

            if (link == null || link.isBlank()) continue;

            Map<String, String> c = new HashMap<>();
            c.put("title", nn(title));
            c.put("link", link);
            c.put("snippet", nn(snippet));
            c.put("thumbnail", nn(thumbnail));
            out.add(c);
        }
        return out;
    }

    private List<Map<String, String>> dedupeByLink(List<Map<String, String>> in) {
        Map<String, Map<String, String>> map = new LinkedHashMap<>();
        for (Map<String, String> c : in) {
            map.putIfAbsent(c.get("link"), c);
        }
        return new ArrayList<>(map.values());
    }

    private List<InfluencerProfile> llmSelectAndFormat(InfluencerRecommendRequest req, List<Map<String, String>> candidates) {
        String instructions = """
                너는 글로벌 식품기업의 마케팅/브랜드 PM이다.
                아래 후보들은 SerpApi(구글) 검색 결과에서 추출한 링크/요약이다.

                목표:
                1) '실존' 인플루언서를 3~5명 추천하라.
                2) 각 추천은 name/platform/profileUrl/imageUrl(가능하면 thumbnail)/rationale/riskNotes/confidenceNote/source 를 채워라.
                3) 외부 실데이터(팔로워 수 등)는 확정할 수 없으니 "검증 필요"로 표기하고, 과장하지 마라.
                4) 출력은 반드시 JSON 객체로 반환하라. (마크다운 금지)
                   예시:
                   {
                     "recommendations": [
                       {
                         "name": "...",
                         "platform": "...",
                         "profileUrl": "...",
                         "imageUrl": "...",
                         "rationale": "...",
                         "riskNotes": "...",
                         "confidenceNote": "...",
                         "source": "OpenAI + SerpApi"
                       }
                     ]
                   }

                타겟:
                - 국가: %s
                - 페르소나: %s
                - 가격대: %s
                - 플랫폼 선호: %s
                - 제약/주의: %s

                후보 데이터:
                %s
                """.formatted(
                nn(req.getTargetCountry()),
                nn(req.getTargetPersona()),
                nn(req.getPriceRange()),
                nn(req.getPlatform()),
                nn(req.getConstraints()),
                safeJson(candidates)
        );

        Map<String, Object> body = Map.of(
                "model", textModel,
                "messages", List.of(
                        Map.of("role", "system", "content", "You are a precise assistant that outputs strict JSON only."),
                        Map.of("role", "user", "content", instructions)
                ),
                "response_format", Map.of("type", "json_object"),
                "temperature", 0.2
        );

        // ✅ 여기만 핵심 변경: WebClient 직접 호출 제거
        String json = openAiClient.chatCompletion(body);
        String cleaned = sanitizeJson(json);

        try {
            JsonNode root = objectMapper.readTree(cleaned);
            if (root != null && root.isObject() && root.has("error")) {
                log.warn("OpenAI error response: {}", root.get("error"));
                throw new IllegalStateException("OpenAI error response");
            }
            JsonNode arr = root;
            if (root != null && root.isObject()) {
                arr = root.get("recommendations");
            }
            if (arr != null && arr.isArray()) {
                return objectMapper.convertValue(arr, new TypeReference<List<InfluencerProfile>>() {});
            }
            throw new IllegalArgumentException("Unexpected JSON shape: " + cleaned);
        } catch (Exception e) {
            log.warn("LLM parse failed. raw={}", json);
            return List.of(new InfluencerProfile(
                    "N/A", nn(req.getPlatform()), "",
                    "",
                    "LLM 출력 파싱 실패: 모델이 JSON 포맷을 준수하지 않았습니다.",
                    "프롬프트/후처리 강화 필요",
                    "검증 필요",
                    "OpenAI + SerpApi"
            ));
        }
    }

    private String safeJson(Object obj) {
        try { return objectMapper.writeValueAsString(obj); }
        catch (Exception e) { return "[]"; }
    }

    private String sanitizeJson(String raw) {
        if (raw == null) return "";
        String s = raw.trim();
        if (s.startsWith("```")) {
            int firstNewline = s.indexOf('\n');
            int lastFence = s.lastIndexOf("```");
            if (firstNewline >= 0 && lastFence > firstNewline) {
                s = s.substring(firstNewline + 1, lastFence).trim();
            }
        }
        return s;
    }

    private String safeText(JsonNode node, String field) {
        JsonNode v = node.get(field);
        if (v == null || v.isNull()) return "";
        return v.asText("");
    }

    private String nn(String s) { return s == null ? "" : s; }
}
