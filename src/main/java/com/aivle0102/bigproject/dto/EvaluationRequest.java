package com.aivle0102.bigproject.dto;

import java.util.List;

import com.aivle0102.bigproject.domain.VirtualConsumer;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class EvaluationRequest {

    private String report; // 신메뉴 보고서 전체
    private List<VirtualConsumer> personas; // 페르소나
}
