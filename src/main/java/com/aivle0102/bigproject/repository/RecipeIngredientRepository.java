package com.aivle0102.bigproject.repository;

import com.aivle0102.bigproject.domain.RecipeIngredient;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface RecipeIngredientRepository extends JpaRepository<RecipeIngredient, Long> {
    List<RecipeIngredient> findByRecipe_IdOrderByIdAsc(Long recipeId);
    void deleteByRecipe_Id(Long recipeId);
}
