package com.aivle0102.bigproject.dto;

import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
public class FinalEvaluationRequest {
    private List<Long> reportIds;
}
