package com.aivle0102.bigproject.repository;

import com.aivle0102.bigproject.domain.VirtualConsumer;
import org.springframework.data.jpa.repository.JpaRepository;

public interface VirtualConsumerRepository extends JpaRepository<VirtualConsumer, Long> {
    void deleteByReport_Id(Long reportId);
}
