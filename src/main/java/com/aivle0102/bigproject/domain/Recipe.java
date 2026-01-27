package com.aivle0102.bigproject.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Transient;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "recipe")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Recipe {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "recipe_id")
    private Long id;

    @Column(name = "recipe_name", nullable = false, length = 200)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Transient
    private String ingredientsJson;

    @Column(name = "steps", columnDefinition = "TEXT")
    private String stepsJson;

    @Transient
    private String reportJson;

    @Transient
    private String allergenJson;

    @Transient
    private String summary;

    @Column(name = "image_base64", columnDefinition = "TEXT")
    private String imageBase64;

    @Transient
    private String influencerJson;

    @Transient
    private String influencerImageBase64;

    @Column(name = "status", nullable = false, length = 20)
    private String status;

    @Column(name = "user_id", nullable = false, length = 50)
    private String authorId;

    @Transient
    private String authorName;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
