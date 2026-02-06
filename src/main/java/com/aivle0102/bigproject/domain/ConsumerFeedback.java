package com.aivle0102.bigproject.domain;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "consumer_feedback")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonIgnoreProperties(ignoreUnknown = true)
public class ConsumerFeedback {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "feedbackid")
    private Long id;

    @ManyToOne
    @JoinColumn(name = "report_id", nullable = false)
    @JsonIgnore
    private MarketReport report;

    @ManyToOne
    @JoinColumn(name = "consumerid", nullable = false)
    @JsonIgnore
    private VirtualConsumer consumer;

    @Column(name = "totalscore", nullable = false)
    private Integer totalScore;

    @Column(name = "tastescore", nullable = false)
    private Integer tasteScore;

    @Column(name = "pricescore", nullable = false)
    private Integer priceScore;

    @Column(name = "healthscore", nullable = false)
    private Integer healthScore;

    @Column(name = "positivefeedback", columnDefinition = "TEXT")
    private String positiveFeedback;

    @Column(name = "negativefeedback", columnDefinition = "TEXT")
    private String negativeFeedback;

    @Column(name = "purchaseintent", length = 10)
    private String purchaseIntent;

    @Column(name = "createdat", insertable = false, updatable = false)
    private LocalDateTime createdAt;

    @JsonProperty("country")
    public String getCountry() {
        return consumer == null ? null : consumer.getCountry();
    }

    @JsonProperty("ageGroup")
    public String getAgeGroup() {
        return consumer == null ? null : consumer.getAgeGroup();
    }

    @JsonProperty("personaName")
    public String getPersonaName() {
        return consumer == null ? null : consumer.getPersonaName();
    }
}
