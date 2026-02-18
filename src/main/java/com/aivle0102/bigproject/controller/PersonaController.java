package com.aivle0102.bigproject.controller;

import com.aivle0102.bigproject.dto.AgeGroupResult;
import com.aivle0102.bigproject.dto.MultiCountryRequest;
import com.aivle0102.bigproject.dto.PersonaBatchRequest;
import com.aivle0102.bigproject.dto.VirtualConsumerResponse;
import com.aivle0102.bigproject.domain.VirtualConsumer;
import com.aivle0102.bigproject.service.PersonaService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/persona")
public class PersonaController {

    private final PersonaService personaService;

    //1. 레시피에 맞는 국가별 연령대 Top1 뽑기
    @PostMapping("/age-group")
    public ResponseEntity<List<AgeGroupResult>> getTopAgeGroups(@RequestBody MultiCountryRequest request) {
        return ResponseEntity.ok(personaService.selectTopAgeGroups(request.getRecipe(), request.getCountries()));
    }

    //2. 국가별 Top1 연령대의 AI 페르소나 각각 생성 배치
    @PostMapping("/batch")
    public ResponseEntity<List<VirtualConsumerResponse>> generatePersonas(@RequestBody PersonaBatchRequest request) {
        List<VirtualConsumer> consumers = personaService.generatePersonas(request.getRecipeSummary(), request.getTargets());
        List<VirtualConsumerResponse> response = consumers.stream()
                .map(VirtualConsumerResponse::from)
                .toList();
        return ResponseEntity.ok(response);
    }
}

