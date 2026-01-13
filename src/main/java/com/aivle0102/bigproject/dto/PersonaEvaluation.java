package com.aivle0102.bigproject.dto;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class PersonaEvaluation {

    private String country;
    private String ageGroup;
    private String personaName;

    private int totalScore; //종합 점수 0~100
    private int tasteScore; //맛 평가 0~100
    private int priceScore;  //가격 평가 0~100
    private int healthScore; //영양/건강 평가 0~100

    private String positiveFeedback; //장점 피드백
    private String negativeFeedback; //단점 피드백

    private String purchaseIntent; //구매여부 (YES / NO / MAYBE)
}
