package com.aivle0102.bigproject.repository;

import com.aivle0102.bigproject.domain.RecipeAllergen;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface RecipeAllergenRepository extends JpaRepository<RecipeAllergen, Long> {
    List<RecipeAllergen> findByRecipe_IdOrderByIdAsc(Long recipeId);
    void deleteByRecipe_Id(Long recipeId);
}
