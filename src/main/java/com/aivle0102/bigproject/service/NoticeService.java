package com.aivle0102.bigproject.service;

import com.aivle0102.bigproject.domain.Notice;
import com.aivle0102.bigproject.domain.NoticeComment;
import com.aivle0102.bigproject.domain.UserInfo;
import com.aivle0102.bigproject.dto.NoticeCommentRequest;
import com.aivle0102.bigproject.dto.NoticeCommentResponse;
import com.aivle0102.bigproject.dto.NoticeRequest;
import com.aivle0102.bigproject.dto.NoticeResponse;
import com.aivle0102.bigproject.exception.CustomException;
import com.aivle0102.bigproject.repository.NoticeCommentRepository;
import com.aivle0102.bigproject.repository.NoticeRepository;
import com.aivle0102.bigproject.repository.UserInfoRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class NoticeService {

    private final NoticeRepository noticeRepository;
    private final NoticeCommentRepository noticeCommentRepository;
    private final UserInfoRepository userInfoRepository;

    @Transactional(readOnly = true)
    public List<NoticeResponse> getNotices(String userId) {
        Long companyId = userId == null ? null : resolveCompanyId(userId);
        List<Notice> notices = companyId == null
                ? noticeRepository.findAllByOrderByCreatedAtDesc()
                : noticeRepository.findByCompanyIdOrCompanyIdIsNullOrderByCreatedAtDesc(companyId);
        return notices
                .stream()
                .map(notice -> {
                    notice.setAuthorName(resolveUserName(notice.getAuthorId()));
                    return NoticeResponse.from(notice);
                })
                .toList();
    }

    @Transactional(readOnly = true)
    public NoticeResponse getNotice(Long noticeId) {
        Notice notice = findNotice(noticeId);
        notice.setAuthorName(resolveUserName(notice.getAuthorId()));
        return NoticeResponse.from(notice);
    }

    @Transactional
    public NoticeResponse createNotice(String userId, NoticeRequest request) {
        UserInfo userInfo = findUser(userId);
        Notice notice = Notice.builder()
                .title(request.getTitle())
                .content(request.getContent())
                .authorId(userInfo.getUserId())
                .authorName(userInfo.getUserName())
                .companyId(userInfo.getCompanyId())
                .build();
        return NoticeResponse.from(noticeRepository.save(notice));
    }

    @Transactional
    public NoticeResponse updateNotice(String userId, Long noticeId, NoticeRequest request) {
        Notice notice = findNotice(noticeId);
        validateOwner(userId, notice.getAuthorId());
        notice.update(request.getTitle(), request.getContent());
        return NoticeResponse.from(notice);
    }

    @Transactional
    public void deleteNotice(String userId, Long noticeId) {
        Notice notice = findNotice(noticeId);
        validateOwner(userId, notice.getAuthorId());
        noticeRepository.delete(notice);
    }

    @Transactional(readOnly = true)
    public List<NoticeCommentResponse> getComments(Long noticeId) {
        findNotice(noticeId);
        return noticeCommentRepository.findAllByNoticeIdOrderByCreatedAtAsc(noticeId)
                .stream()
                .map(comment -> {
                    comment.setAuthorName(resolveUserName(comment.getAuthorId()));
                    return NoticeCommentResponse.from(comment);
                })
                .toList();
    }

    @Transactional
    public NoticeCommentResponse addComment(String userId, Long noticeId, NoticeCommentRequest request) {
        UserInfo userInfo = findUser(userId);
        Notice notice = findNotice(noticeId);
        NoticeComment comment = NoticeComment.builder()
                .notice(notice)
                .content(request.getContent())
                .authorId(userInfo.getUserId())
                .authorName(userInfo.getUserName())
                .build();
        return NoticeCommentResponse.from(noticeCommentRepository.save(comment));
    }

    @Transactional
    public NoticeCommentResponse updateComment(String userId, Long noticeId, Long commentId, NoticeCommentRequest request) {
        NoticeComment comment = findComment(noticeId, commentId);
        validateOwner(userId, comment.getAuthorId());
        comment.update(request.getContent());
        return NoticeCommentResponse.from(comment);
    }

    @Transactional
    public void deleteComment(String userId, Long noticeId, Long commentId) {
        NoticeComment comment = findComment(noticeId, commentId);
        validateOwner(userId, comment.getAuthorId());
        noticeCommentRepository.delete(comment);
    }

    private Notice findNotice(Long noticeId) {
        return noticeRepository.findById(noticeId)
                .orElseThrow(() -> new CustomException("공지사항을 찾을 수 없습니다.", HttpStatus.NOT_FOUND, "NOTICE_NOT_FOUND"));
    }

    private NoticeComment findComment(Long noticeId, Long commentId) {
        NoticeComment comment = noticeCommentRepository.findById(commentId)
                .orElseThrow(() -> new CustomException("댓글을 찾을 수 없습니다.", HttpStatus.NOT_FOUND, "COMMENT_NOT_FOUND"));
        if (!comment.getNotice().getId().equals(noticeId)) {
            throw new CustomException("댓글이 해당 공지사항에 속하지 않습니다.", HttpStatus.BAD_REQUEST, "COMMENT_MISMATCH");
        }
        return comment;
    }

    private UserInfo findUser(String userId) {
        return userInfoRepository.findByUserId(userId)
                .orElseThrow(() -> new CustomException("사용자를 찾을 수 없습니다.", HttpStatus.NOT_FOUND, "USER_NOT_FOUND"));
    }

    private void validateOwner(String userId, String authorId) {
        if (!authorId.equals(userId)) {
            throw new CustomException("권한이 없습니다.", HttpStatus.FORBIDDEN, "FORBIDDEN");
        }
    }

    private String resolveUserName(String userId) {
        return userInfoRepository.findByUserId(userId)
                .map(UserInfo::getUserName)
                .orElse(userId);
    }

    private Long resolveCompanyId(String userId) {
        return userInfoRepository.findByUserId(userId)
                .map(UserInfo::getCompanyId)
                .orElse(null);
    }
}
