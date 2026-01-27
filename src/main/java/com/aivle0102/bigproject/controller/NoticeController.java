package com.aivle0102.bigproject.controller;

import com.aivle0102.bigproject.dto.NoticeCommentRequest;
import com.aivle0102.bigproject.dto.NoticeCommentResponse;
import com.aivle0102.bigproject.dto.NoticeRequest;
import com.aivle0102.bigproject.dto.NoticeResponse;
import com.aivle0102.bigproject.exception.CustomException;
import com.aivle0102.bigproject.service.NoticeService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;

@RestController
@RequestMapping("/api/notices")
@RequiredArgsConstructor
public class NoticeController {

    private final NoticeService noticeService;

    @GetMapping
    public ResponseEntity<List<NoticeResponse>> getNotices() {
        return ResponseEntity.ok(noticeService.getNotices());
    }

    @GetMapping("/{noticeId}")
    public ResponseEntity<NoticeResponse> getNotice(@PathVariable("noticeId") Long noticeId) {
        return ResponseEntity.ok(noticeService.getNotice(noticeId));
    }

    @PostMapping
    public ResponseEntity<NoticeResponse> createNotice(@Valid @RequestBody NoticeRequest request, Principal principal) {
        String userId = requireUser(principal);
        NoticeResponse response = noticeService.createNotice(userId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PutMapping("/{noticeId}")
    public ResponseEntity<NoticeResponse> updateNotice(
            @PathVariable("noticeId") Long noticeId,
            @Valid @RequestBody NoticeRequest request,
            Principal principal
    ) {
        String userId = requireUser(principal);
        return ResponseEntity.ok(noticeService.updateNotice(userId, noticeId, request));
    }

    @DeleteMapping("/{noticeId}")
    public ResponseEntity<Void> deleteNotice(@PathVariable("noticeId") Long noticeId, Principal principal) {
        String userId = requireUser(principal);
        noticeService.deleteNotice(userId, noticeId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{noticeId}/comments")
    public ResponseEntity<List<NoticeCommentResponse>> getComments(@PathVariable("noticeId") Long noticeId) {
        return ResponseEntity.ok(noticeService.getComments(noticeId));
    }

    @PostMapping("/{noticeId}/comments")
    public ResponseEntity<NoticeCommentResponse> addComment(
            @PathVariable("noticeId") Long noticeId,
            @Valid @RequestBody NoticeCommentRequest request,
            Principal principal
    ) {
        String userId = requireUser(principal);
        NoticeCommentResponse response = noticeService.addComment(userId, noticeId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PutMapping("/{noticeId}/comments/{commentId}")
    public ResponseEntity<NoticeCommentResponse> updateComment(
            @PathVariable("noticeId") Long noticeId,
            @PathVariable("commentId") Long commentId,
            @Valid @RequestBody NoticeCommentRequest request,
            Principal principal
    ) {
        String userId = requireUser(principal);
        return ResponseEntity.ok(noticeService.updateComment(userId, noticeId, commentId, request));
    }

    @DeleteMapping("/{noticeId}/comments/{commentId}")
    public ResponseEntity<Void> deleteComment(
            @PathVariable("noticeId") Long noticeId,
            @PathVariable("commentId") Long commentId,
            Principal principal
    ) {
        String userId = requireUser(principal);
        noticeService.deleteComment(userId, noticeId, commentId);
        return ResponseEntity.noContent().build();
    }

    private String requireUser(Principal principal) {
        if (principal == null || principal.getName() == null || principal.getName().isBlank()) {
            throw new CustomException("로그인이 필요합니다.", HttpStatus.UNAUTHORIZED, "UNAUTHORIZED");
        }
        return principal.getName();
    }
}
