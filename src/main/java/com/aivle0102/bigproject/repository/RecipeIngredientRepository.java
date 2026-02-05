package com.aivle0102.bigproject.repository;

import com.aivle0102.bigproject.domain.RecipeIngredient;
import org.springframework.data.jpa.repository.JpaRepository;
<<<<<<< HEAD
=======
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.transaction.annotation.Transactional;
>>>>>>> upstream/UI5

import java.util.List;

public interface RecipeIngredientRepository extends JpaRepository<RecipeIngredient, Long> {
    List<RecipeIngredient> findByRecipe_IdOrderByIdAsc(Long recipeId);
<<<<<<< HEAD
=======
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Transactional
    @Query("delete from RecipeIngredient r where r.recipe.id = :recipeId")
>>>>>>> upstream/UI5
    void deleteByRecipe_Id(Long recipeId);
}
