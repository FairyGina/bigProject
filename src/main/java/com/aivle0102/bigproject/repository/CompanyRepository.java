package com.aivle0102.bigproject.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.aivle0102.bigproject.domain.Company;

public interface CompanyRepository extends JpaRepository<Company, Long> {
    Optional<Company> findFirstByCompanyNameIgnoreCase(String companyName);
}
