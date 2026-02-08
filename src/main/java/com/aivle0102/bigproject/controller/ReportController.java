package com.aivle0102.bigproject.controller;

import com.aivle0102.bigproject.domain.MarketReport;
import com.aivle0102.bigproject.domain.UserInfo;
import com.aivle0102.bigproject.dto.FinalEvaluationRequest;
import com.aivle0102.bigproject.dto.FinalEvaluationResponse;
import com.aivle0102.bigproject.dto.ReportDetailResponse;
import com.aivle0102.bigproject.dto.ReportListItemResponse;
import com.aivle0102.bigproject.dto.ReportRequest;
import com.aivle0102.bigproject.repository.MarketReportRepository;
import com.aivle0102.bigproject.repository.UserInfoRepository;
import com.aivle0102.bigproject.service.AiReportService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.security.Principal;
import java.util.HashMap;
<<<<<<< HEAD
import java.util.List;
import java.util.Map;
=======
import java.util.Map;
import java.util.List;
>>>>>>> upstream/UI5

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/report")
@Slf4j
public class ReportController {

    private final AiReportService aiReportService;
    private final MarketReportRepository marketReportRepository;
    private final UserInfoRepository userInfoRepository;
    private final com.aivle0102.bigproject.service.RecipeService recipeService;
    private static final String REPORT_TYPE_FINAL = "FINAL_EVALUATION";

    @PostMapping
    public ResponseEntity<Map<String, Object>> generate(@RequestBody ReportRequest request) {
        Map<String, Object> report = aiReportService.generateReport(request);
        return ResponseEntity.ok(report);
    }

    @GetMapping("/list")
    public ResponseEntity<List<ReportListItemResponse>> list(Principal principal) {
        String userId = principal == null ? null : principal.getName();
        Long companyId = userId == null ? null
                : userInfoRepository.findByUserId(userId).map(UserInfo::getCompanyId).orElse(null);
        List<MarketReport> reports = companyId == null
                ? marketReportRepository.findAllByOrderByCreatedAtDesc()
                : marketReportRepository.findByRecipe_CompanyIdOrderByCreatedAtDesc(companyId);
        return ResponseEntity.ok(reports.stream().map(ReportListItemResponse::from).toList());
    }

    @GetMapping("/{id}")
    public ResponseEntity<ReportDetailResponse> detail(@PathVariable("id") Long id, Principal principal) {
        if (id == null) {
            return ResponseEntity.badRequest().build();
        }
        String userId = principal == null ? null : principal.getName();
        Long companyId = userId == null ? null
                : userInfoRepository.findByUserId(userId).map(UserInfo::getCompanyId).orElse(null);
        MarketReport report = marketReportRepository.findWithRecipeById(id).orElse(null);
        if (report == null) {
            return ResponseEntity.notFound().build();
        }
        String existingContent = report.getContent();
        log.info("리포트 상세: id={}, type={}, contentLength={}",
                report.getId(),
                report.getReportType(),
                existingContent == null ? 0 : existingContent.length());
        if (companyId != null && (report.getRecipe() == null || !companyId.equals(report.getRecipe().getCompanyId()))) {
            return ResponseEntity.status(403).build();
        }
        if (REPORT_TYPE_FINAL.equalsIgnoreCase(report.getReportType())
                && (existingContent == null || existingContent.isBlank())) {
            String regenerated = regenerateFinalContent(report, companyId);
            if (regenerated != null && !regenerated.isBlank()) {
                report.setContent(regenerated);
                marketReportRepository.save(report);
                existingContent = regenerated;
                log.info("최종 보고서 재생성 완료: id={}, length={}", report.getId(), regenerated.length());
            } else {
                log.warn("최종 보고서 재생성 실패: id={}", report.getId());
            }
        }
        return ResponseEntity.ok(recipeService.getReportDetail(id, userId));
    }

    @PostMapping("/final-evaluation")
    public ResponseEntity<FinalEvaluationResponse> finalEvaluation(
            @RequestBody FinalEvaluationRequest request,
            Principal principal
    ) {
        if (request == null || request.getReportIds() == null || request.getReportIds().isEmpty()) {
            return ResponseEntity.badRequest().build();
        }
        String userId = principal == null ? null : principal.getName();
        Long companyId = userId == null ? null
                : userInfoRepository.findByUserId(userId).map(UserInfo::getCompanyId).orElse(null);

        List<MarketReport> reports = marketReportRepository.findAllById(request.getReportIds());
        if (companyId != null) {
            reports = reports.stream()
                    .filter(report -> report.getRecipe() != null && companyId.equals(report.getRecipe().getCompanyId()))
                    .toList();
        }
        if (reports.isEmpty()) {
            return ResponseEntity.status(403).build();
        }

        recipeService.ensureEvaluationForReports(reports);

        List<Map<String, Object>> reportInputs = reports.stream()
                .map(report -> {
                    Map<String, Object> item = new HashMap<>();
                    item.put("reportId", report.getId());
                    item.put("recipeId", report.getRecipe() == null ? "" : report.getRecipe().getId());
                    item.put("recipeTitle", report.getRecipe() == null ? "" : report.getRecipe().getRecipeName());
                    item.put("summary", safeTrim(report.getSummary(), 1200));
                    item.put("content", safeTrim(report.getContent(), 2000));
                    return item;
                })
                .toList();

        String content = aiReportService.generateFinalEvaluation(reportInputs);
        String summary = buildFinalSummary(reports);
        MarketReport targetReport = selectFinalReportTarget(reports, content);
        if (targetReport != null && targetReport.getRecipe() != null) {
            marketReportRepository.save(MarketReport.builder()
                    .recipe(targetReport.getRecipe())
                    .reportType(REPORT_TYPE_FINAL)
                    .content(content)
                    .summary(summary)
                    .openYn("Y")
                    .build());
        }
        return ResponseEntity.ok(new FinalEvaluationResponse(content));
    }

    private String countSectionMarkers(String content) {
        if (content == null || content.isBlank()) {
            return "none";
        }
        int[] counts = new int[8];
        for (int i = 1; i <= 7; i += 1) {
            String marker = i + ")";
            int idx = 0;
            int found = 0;
            while (idx >= 0) {
                idx = content.indexOf(marker, idx);
                if (idx >= 0) {
                    found += 1;
                    idx += marker.length();
                }
            }
            counts[i] = found;
        }
        return String.format("1)=%d,2)=%d,3)=%d,4)=%d,5)=%d,6)=%d,7)=%d",
                counts[1], counts[2], counts[3], counts[4], counts[5], counts[6], counts[7]);
    }

    private String safeTrim(String value, int maxLength) {
        if (value == null) {
            return "";
        }
        String trimmed = value.trim();
        if (trimmed.length() <= maxLength) {
            return trimmed;
        }
        return trimmed.substring(0, maxLength) + "...";
    }

    private MarketReport selectFinalReportTarget(List<MarketReport> reports, String content) {
        if (reports == null || reports.isEmpty()) {
            return null;
        }
        String haystack = content == null ? "" : content.toLowerCase();
        for (MarketReport report : reports) {
            if (report == null || report.getRecipe() == null) {
                continue;
            }
            String title = report.getRecipe().getRecipeName();
            if (title != null && !title.isBlank() && haystack.contains(title.toLowerCase())) {
                return report;
            }
        }
        return reports.stream()
                .filter(r -> r != null && r.getRecipe() != null)
                .findFirst()
                .orElse(null);
    }

    private String buildFinalSummary(List<MarketReport> reports) {
        if (reports == null || reports.isEmpty()) {
            return "비교 보고서 정보가 없습니다.";
        }
        List<String> titles = reports.stream()
                .map(report -> report.getRecipe() == null ? null : report.getRecipe().getRecipeName())
                .filter(title -> title != null && !title.isBlank())
                .distinct()
                .toList();
        if (titles.isEmpty()) {
            return "비교 보고서 정보가 없습니다.";
        }
        List<Long> reportIds = reports.stream()
                .map(MarketReport::getId)
                .filter(id -> id != null)
                .distinct()
                .toList();
        List<Long> recipeIds = reports.stream()
                .map(report -> report.getRecipe() == null ? null : report.getRecipe().getId())
                .filter(id -> id != null)
                .distinct()
                .toList();
        String meta = String.format("||reports=%s;recipes=%s",
                joinIds(reportIds),
                joinIds(recipeIds)
        );
        return "비교 보고서: " + String.join(" · ", titles) + " " + meta;
    }

    private String joinIds(List<Long> ids) {
        if (ids == null || ids.isEmpty()) {
            return "";
        }
        return ids.stream().map(String::valueOf).collect(java.util.stream.Collectors.joining(","));
    }

    private List<Long> parseReportIdsFromSummary(String summary) {
        if (summary == null || summary.isBlank()) {
            return List.of();
        }
        int metaIndex = summary.indexOf("||");
        if (metaIndex < 0) {
            return List.of();
        }
        String meta = summary.substring(metaIndex + 2);
        for (String token : meta.split(";")) {
            if (token.startsWith("reports=")) {
                String ids = token.substring("reports=".length());
                if (ids.isBlank()) {
                    return List.of();
                }
                return java.util.Arrays.stream(ids.split(","))
                        .map(String::trim)
                        .filter(v -> !v.isEmpty())
                        .map(Long::valueOf)
                        .toList();
            }
        }
        return List.of();
    }

    private String regenerateFinalContent(MarketReport report, Long companyId) {
        List<Long> reportIds = parseReportIdsFromSummary(report == null ? null : report.getSummary());
        if (reportIds.isEmpty()) {
            log.warn("최종 보고서 요약에 보고서 ID 없음: id={}, summary={}",
                    report == null ? null : report.getId(),
                    report == null ? null : safeTrim(report.getSummary(), 400));
            return null;
        }
        List<MarketReport> reports = marketReportRepository.findAllById(reportIds);
        if (companyId != null) {
            reports = reports.stream()
                    .filter(r -> r.getRecipe() != null && companyId.equals(r.getRecipe().getCompanyId()))
                    .toList();
        }
        if (reports.isEmpty()) {
            log.warn("최종 보고서 재생성: 원본 보고서 못찾음. id={}, reportIds={}",
                    report == null ? null : report.getId(),
                    reportIds);
            return null;
        }
        List<Map<String, Object>> reportInputs = reports.stream()
                .map(r -> {
                    Map<String, Object> item = new HashMap<>();
                    item.put("reportId", r.getId());
                    item.put("recipeId", r.getRecipe() == null ? "" : r.getRecipe().getId());
                    item.put("recipeTitle", r.getRecipe() == null ? "" : r.getRecipe().getRecipeName());
                    item.put("summary", safeTrim(r.getSummary(), 1200));
                    item.put("content", safeTrim(r.getContent(), 2000));
                    return item;
                })
                .toList();
        try {
            return aiReportService.generateFinalEvaluation(reportInputs);
        } catch (Exception e) {
            log.error("최종 보고서 생성 실패: id={}", report == null ? null : report.getId(), e);
            return null;
        }
    }

    @PostMapping("/summary")
    public ResponseEntity<String> summary(@RequestBody Object fullReport) {
        try {
            String serialized = new com.fasterxml.jackson.databind.ObjectMapper().writeValueAsString(fullReport);
            String report = aiReportService.generateSummary(serialized);
            return ResponseEntity.ok(report);
        } catch (Exception e) {
            throw new IllegalStateException("요약용 보고서 직렬화 실패", e);
        }
    }
}





