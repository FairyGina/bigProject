package com.aivle0102.bigproject.dto;

import com.aivle0102.bigproject.domain.VirtualConsumer;
import lombok.AllArgsConstructor;
import lombok.Getter;

import java.util.List;

@Getter
@AllArgsConstructor
public class VirtualConsumerResponse {
    private Long id;
    private String personaName;
    private String country;
    private String ageGroup;
    private String reason;
    private String lifestyle;
    private String foodPreference;
    private List<String> purchaseCriteria;
    private String attitudeToKFood;
    private String evaluationPerspective;

    public static VirtualConsumerResponse from(VirtualConsumer consumer) {
        if (consumer == null) {
            return null;
        }
        return new VirtualConsumerResponse(
                consumer.getId(),
                consumer.getPersonaName(),
                consumer.getCountry(),
                consumer.getAgeGroup(),
                consumer.getReason(),
                consumer.getLifestyle(),
                consumer.getFoodPreference(),
                consumer.getPurchaseCriteria(),
                consumer.getAttitudeToKFood(),
                consumer.getEvaluationPerspective()
        );
    }
}
