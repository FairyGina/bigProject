package com.aivle0102.bigproject.controller;

import java.security.Principal;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.aivle0102.bigproject.dto.LoginRequest;
import com.aivle0102.bigproject.dto.PasswordResetRequest;
import com.aivle0102.bigproject.dto.PasswordResetVerifyRequest;
import com.aivle0102.bigproject.dto.ResetPasswordRequest;
import com.aivle0102.bigproject.dto.SignUpRequest;
import com.aivle0102.bigproject.dto.UpdateProfileRequest;
import com.aivle0102.bigproject.dto.UserResponse;
import com.aivle0102.bigproject.dto.VerifyPasswordRequest;
import com.aivle0102.bigproject.service.AuthService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class AuthController {

    private static final Logger log = LoggerFactory.getLogger(AuthController.class);

    private final AuthService authService;

    @PostMapping("/auth/join")
    public ResponseEntity<UserResponse> join(@Valid @RequestBody SignUpRequest request) {
        UserResponse response = authService.join(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PostMapping("/auth/login")
    public ResponseEntity<UserResponse> login(@Valid @RequestBody LoginRequest request) {
        UserResponse response = authService.login(request);
        log.info("Login response for {} -> passwordChangedAt={}, passwordExpired={}, passwordExpiryAt={}",
                response.getUserId(),
                response.getPasswordChangedAt(),
                response.isPasswordExpired(),
                response.getPasswordExpiryAt()
        );
        return ResponseEntity.ok(response);
    }

    @PostMapping("/auth/logout")
    public ResponseEntity<Map<String, String>> logout() {
        authService.logout();
        return ResponseEntity.ok(Map.of("message", "로그아웃되었습니다."));
    }

    @PostMapping("/auth/reset-password")
    public ResponseEntity<Map<String, String>> resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        authService.resetPassword(request);
        return ResponseEntity.ok(Map.of("message", "비밀번호가 변경되었습니다."));
    }

    @PostMapping("/auth/password-reset/request")
    public ResponseEntity<Map<String, String>> requestPasswordReset(@Valid @RequestBody PasswordResetRequest request) {
        authService.requestPasswordReset(request);
        return ResponseEntity.ok(Map.of("message", "인증 코드가 전송되었습니다."));
    }

    @PostMapping("/auth/password-reset/verify")
    public ResponseEntity<Map<String, String>> verifyPasswordResetCode(@Valid @RequestBody PasswordResetVerifyRequest request) {
        authService.verifyPasswordResetCode(request);
        return ResponseEntity.ok(Map.of("message", "인증 코드가 확인되었습니다."));
    }

    @DeleteMapping("/auth/withdraw")
    public ResponseEntity<Map<String, String>> withdraw(Principal principal) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
            .body(Map.of("error", "로그인이 필요합니다."));
        }
        authService.withdraw(principal.getName());
        return ResponseEntity.ok(Map.of("message", "회원 탈퇴가 완료되었습니다."));
    }

    @GetMapping("/user/me")
    public ResponseEntity<?> getCurrentUser(Principal principal) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
            .body(Map.of("error", "로그인이 필요합니다."));
        }
        UserResponse response = authService.getCurrentUser(principal.getName());
        return ResponseEntity.ok(response);
    }

    @PutMapping("/user/me")
    public ResponseEntity<?> updateProfile(
            Principal principal,
            @RequestBody UpdateProfileRequest request
    ) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
            .body(Map.of("error", "로그인이 필요합니다."));
        }
        UserResponse response = authService.updateProfile(principal.getName(), request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/user/verify-password")
    public ResponseEntity<Map<String, String>> verifyPassword(
            Principal principal,
            @Valid @RequestBody VerifyPasswordRequest request
    ) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
            .body(Map.of("error", "인증이 필요합니다."));
        }
        authService.verifyPassword(principal.getName(), request.getPassword());
        return ResponseEntity.ok(Map.of("message", "비밀번호가 확인되었습니다."));
    }
 
}
