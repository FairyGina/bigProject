package com.aivle0102.bigproject.repository;

import com.aivle0102.bigproject.domain.Recipe;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface RecipeRepository extends JpaRepository<Recipe, Long> {
    List<Recipe> findAllByOrderByCreatedAtDesc();
    List<Recipe> findByStatusOrderByCreatedAtDesc(String status);

    List<Recipe> findByAuthorIdOrderByCreatedAtDesc(String authorId);
    List<Recipe> findByAuthorIdAndStatusOrderByCreatedAtDesc(String authorId, String status);
}
