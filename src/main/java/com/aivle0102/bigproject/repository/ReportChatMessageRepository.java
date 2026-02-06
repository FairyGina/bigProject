package com.aivle0102.bigproject.repository;

import com.aivle0102.bigproject.domain.ReportChatMessage;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ReportChatMessageRepository extends JpaRepository<ReportChatMessage, Long> {
    List<ReportChatMessage> findByRoom_IdOrderByCreatedAtAsc(Long roomId);
}
