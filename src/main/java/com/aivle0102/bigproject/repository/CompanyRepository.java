package com.aivle0102.bigproject.repository;

import com.aivle0102.bigproject.domain.Company;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface CompanyRepository extends JpaRepository<Company, Long> {
    Optional<Company> findFirstByCompanyNameIgnoreCase(String companyName);
}
