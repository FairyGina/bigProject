package com.aivle0102.bigproject.repository;

import com.aivle0102.bigproject.domain.Influencer;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface InfluencerRepository extends JpaRepository<Influencer, Long> {
    List<Influencer> findByReport_IdOrderByIdAsc(Long reportId);
    void deleteByReport_Id(Long reportId);
}
