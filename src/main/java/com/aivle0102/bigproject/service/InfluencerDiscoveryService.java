package com.aivle0102.bigproject.service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import com.aivle0102.bigproject.client.OpenAiClient;
import com.aivle0102.bigproject.client.SerpApiClient;
import com.aivle0102.bigproject.dto.InfluencerProfile;
import com.aivle0102.bigproject.dto.InfluencerRecommendRequest;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import lombok.RequiredArgsConstructor;

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
        String recipe = Optional.ofNullable(req.getRecipe()).orElse("").trim();
        if (recipe.isBlank()) {
            recipe = "Korean food";
        }
        return String.format(
                "%s influencer %s %s recipe",
                recipe, req.getTargetCountry(), platform
        );
    }

    private String buildFallbackQuery(InfluencerRecommendRequest req) {
        String platform = Optional.ofNullable(req.getPlatform()).orElse("TikTok, Instagram");
        String recipe = Optional.ofNullable(req.getRecipe()).orElse("").trim();
        if (recipe.isBlank()) {
            recipe = "Korean food";
        }
        return String.format(
                "\"%s\" influencer %s %s",
                recipe, req.getTargetCountry(), platform
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
                너는 실제 요리/레시피 인플루언서를 엄격히 선별하는 평가자다.
                아래 데이터는 SerpApi 검색 결과(title/link/snippet/thumbnail)다.

                목표:
                1) 실제 인플루언서 3~5명만 추천한다.
                2) 레시피/요리/식음료 콘텐츠와 명확히 관련된 경우만 선택한다.
                   - 제목/스니펫/프로필에 요리/레시피 키워드가 명시되지 않으면 제외한다.
                   - 관련성이 애매하면 제외하고 riskNotes에 "검증 필요"를 적는다.
                3) name/platform/profileUrl/imageUrl/rationale/riskNotes/confidenceNote/source를 채운다.
                4) imageUrl은 프로필/채널 이미지가 명확할 때만 채운다.
                   - 썸네일이 레시피 사진/기사 이미지/랜덤 이미지로 보이면 비워둔다.
                5) 절대 추정하지 말고, 모르면 비우고 "검증 필요"로 표시한다.
                6) 출력은 반드시 JSON 객체만(마크다운 금지) 반환한다.
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
