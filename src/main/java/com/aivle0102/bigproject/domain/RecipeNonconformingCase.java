package com.aivle0102.bigproject.domain;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "recipe_nonconforming_case")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RecipeNonconformingCase {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long recipeId;
    private String country;
    private String ingredient;
    private String caseId;
    private String announcementDate;
    private String violationReason;
    private String action;
    private String matchedIngredient;

    @CreationTimestamp
    private LocalDateTime createdAt;
}