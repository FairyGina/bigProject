package com.aivle0102.bigproject.dto;

import lombok.Getter;
import lombok.Setter;
import java.util.List;

@Getter
@Setter
public class EvaluationRequest {

    private String report; // 신메뉴 보고서 전체
    private List<AiPersona> personas; // 페르소나
}
