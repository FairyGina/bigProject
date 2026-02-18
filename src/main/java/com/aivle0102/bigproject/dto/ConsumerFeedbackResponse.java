package com.aivle0102.bigproject.dto;

import com.aivle0102.bigproject.domain.ConsumerFeedback;
import lombok.AllArgsConstructor;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@AllArgsConstructor
public class ConsumerFeedbackResponse {
    private Long id;
    private Integer totalScore;
    private Integer tasteScore;
    private Integer priceScore;
    private Integer healthScore;
    private String positiveFeedback;
    private String negativeFeedback;
    private String purchaseIntent;
    private String country;
    private String ageGroup;
    private String personaName;
    private LocalDateTime createdAt;

    public static ConsumerFeedbackResponse from(ConsumerFeedback feedback) {
        if (feedback == null) {
            return null;
        }
        return new ConsumerFeedbackResponse(
                feedback.getId(),
                feedback.getTotalScore(),
                feedback.getTasteScore(),
                feedback.getPriceScore(),
                feedback.getHealthScore(),
                feedback.getPositiveFeedback(),
                feedback.getNegativeFeedback(),
                feedback.getPurchaseIntent(),
                feedback.getCountry(),
                feedback.getAgeGroup(),
                feedback.getPersonaName(),
                feedback.getCreatedAt()
        );
    }
}
