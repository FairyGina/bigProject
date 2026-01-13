package com.aivle0102.bigproject.dto;

import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
public class AiPersona {

    private String country;
    private String ageGroup; //ex."21-30"
    private String personaName;

    private String lifestyle; //라이프스타일
    private String foodPreference; //선호음식

    private List<String> purchaseCriteria; //구매기준(구매결정 시 보는 항목들) ex.가격, 영양성분 등
    private String attitudeToKFood; //K-food 에 대해 얼마나 관심있는지, 좋아하는지...
    private String evaluationPerspective; //해당 페르소나의 심사 평가 기준
}
