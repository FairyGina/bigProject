package com.aivle0102.bigproject.repository;

import com.aivle0102.bigproject.domain.MarketReport;
<<<<<<< HEAD
=======
import org.springframework.data.jpa.repository.EntityGraph;
>>>>>>> upstream/UI5
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface MarketReportRepository extends JpaRepository<MarketReport, Long> {
<<<<<<< HEAD
    Optional<MarketReport> findTopByRecipe_IdOrderByCreatedAtDesc(Long recipeId);
    List<MarketReport> findByRecipe_IdOrderByCreatedAtDesc(Long recipeId);
=======
    @EntityGraph(attributePaths = "recipe")
    Optional<MarketReport> findWithRecipeById(Long id);
    Optional<MarketReport> findTopByRecipe_IdOrderByCreatedAtDesc(Long recipeId);
    Optional<MarketReport> findTopByRecipe_IdAndReportTypeOrderByCreatedAtDesc(Long recipeId, String reportType);
    List<MarketReport> findByRecipe_IdAndReportTypeOrderByCreatedAtDesc(Long recipeId, String reportType);
    List<MarketReport> findByRecipe_IdOrderByCreatedAtDesc(Long recipeId);
    List<MarketReport> findByRecipe_IdAndOpenYnOrderByCreatedAtDesc(Long recipeId, String openYn);
    boolean existsByRecipe_IdAndOpenYn(Long recipeId, String openYn);
    boolean existsByRecipe_IdAndReportTypeAndOpenYn(Long recipeId, String reportType, String openYn);
    List<MarketReport> findAllByOrderByCreatedAtDesc();
    List<MarketReport> findByRecipe_CompanyIdOrderByCreatedAtDesc(Long companyId);
>>>>>>> upstream/UI5
}
