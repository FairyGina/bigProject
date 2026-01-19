package com.aivle0102.bigproject.dto;

import lombok.Getter;
import lombok.Setter;
import java.util.List;

@Getter @Setter
public class PersonaBatchRequest {
    private String recipeSummary; // 레시피 요약(또는 레시피 전체)
    private List<AgeGroupResult> targets; // 국가별 Top1 결과 10개
}

