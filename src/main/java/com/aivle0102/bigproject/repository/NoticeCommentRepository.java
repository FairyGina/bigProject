package com.aivle0102.bigproject.repository;

import com.aivle0102.bigproject.domain.NoticeComment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface NoticeCommentRepository extends JpaRepository<NoticeComment, Long> {
    List<NoticeComment> findAllByNoticeIdOrderByCreatedAtAsc(Long noticeId);
}
