package com.aivle0102.bigproject.repository;

import com.aivle0102.bigproject.domain.ReportChatRoom;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ReportChatRoomRepository extends JpaRepository<ReportChatRoom, Long> {
    Optional<ReportChatRoom> findByReport_Id(Long reportId);
}
