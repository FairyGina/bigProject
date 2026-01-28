package com.aivle0102.bigproject.repository;

import com.aivle0102.bigproject.domain.ConsumerFeedback;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ConsumerFeedbackRepository extends JpaRepository<ConsumerFeedback, Long> {
    void deleteByReport_Id(Long reportId);
    List<ConsumerFeedback> findByReport_IdOrderByIdAsc(Long reportId);
}
