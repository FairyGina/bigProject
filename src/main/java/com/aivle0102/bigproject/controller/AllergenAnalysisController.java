// 알레르기 성분 분석 요청을 수신하는 REST 컨트롤러.
// 분석 서비스 호출 후 결과 DTO를 반환한다.
package com.aivle0102.bigproject.controller;

import com.aivle0102.bigproject.dto.AllergenAnalysisResponse;
import com.aivle0102.bigproject.dto.ReportRequest;
import com.aivle0102.bigproject.service.AllergenAnalysisService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/allergen")
@RequiredArgsConstructor
public class AllergenAnalysisController {

    private final AllergenAnalysisService allergenAnalysisService;

    @PostMapping("/analyze")
    public ResponseEntity<AllergenAnalysisResponse> analyze(@RequestBody ReportRequest request) {
        // recipe, targetCountry만 사용 (나머지는 무시)
        AllergenAnalysisResponse resp = allergenAnalysisService.analyze(request);
        return ResponseEntity.ok(resp);
    }
}
