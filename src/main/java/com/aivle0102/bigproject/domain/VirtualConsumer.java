package com.aivle0102.bigproject.domain;

import com.fasterxml.jackson.annotation.JsonIgnore;
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
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.util.List;

@Entity
@Table(name = "virtual_consumer")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class VirtualConsumer {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "consumerid")
    private Long id;

    @ManyToOne
    @JoinColumn(name = "report_id", nullable = false)
    @JsonIgnore
    private MarketReport report;

    @Column(name = "personaname", length = 100, nullable = false)
    private String personaName;

    @Column(name = "country", length = 50, nullable = false)
    private String country;

    @Column(name = "agegroup", length = 20, nullable = false)
    private String ageGroup;

    @Column(name = "reason", columnDefinition = "TEXT", nullable = false)
    private String reason;

    @Column(name = "lifestyle", length = 200)
    private String lifestyle;

    @Column(name = "foodpreference", columnDefinition = "TEXT", nullable = false)
    private String foodPreference;

    @Column(name = "purchasecriteria", columnDefinition = "JSONB")
    @JdbcTypeCode(SqlTypes.JSON)
    private List<String> purchaseCriteria;

    @Column(name = "attitudetokfood", columnDefinition = "TEXT")
    private String attitudeToKFood;

    @Column(name = "evaluationperspective", columnDefinition = "TEXT")
    private String evaluationPerspective;

}
