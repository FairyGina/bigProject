package com.aivle0102.bigproject.repository;

import com.aivle0102.bigproject.domain.MarketReport;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface MarketReportRepository extends JpaRepository<MarketReport, Long> {
    Optional<MarketReport> findTopByRecipe_IdOrderByCreatedAtDesc(Long recipeId);
    List<MarketReport> findByRecipe_IdOrderByCreatedAtDesc(Long recipeId);
}
