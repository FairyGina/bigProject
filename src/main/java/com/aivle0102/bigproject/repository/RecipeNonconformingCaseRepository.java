package com.aivle0102.bigproject.repository;

import com.aivle0102.bigproject.domain.RecipeNonconformingCase;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RecipeNonconformingCaseRepository
        extends JpaRepository<RecipeNonconformingCase, Long> {
}