package com.aivle0102.bigproject.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
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
    private Long id;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "ingredients_json", columnDefinition = "TEXT")
    private String ingredientsJson;

    @Column(name = "steps_json", columnDefinition = "TEXT")
    private String stepsJson;

    @Column(name = "report_json", columnDefinition = "TEXT")
    private String reportJson;

    @Column(name = "summary", columnDefinition = "TEXT")
    private String summary;

    @Column(name = "image_base64", columnDefinition = "TEXT")
    private String imageBase64;

    @Column(name = "influencer_json", columnDefinition = "TEXT")
    private String influencerJson;

    @Column(name = "influencer_image_base64", columnDefinition = "TEXT")
    private String influencerImageBase64;
    @Column(name = "status", nullable = false, length = 20)
    private String status;

    @Column(name = "author_id", nullable = false, length = 50)
    private String authorId;

    @Column(name = "author_name", length = 50)
    private String authorName;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;
}
