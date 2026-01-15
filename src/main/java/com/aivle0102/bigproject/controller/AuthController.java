package com.aivle0102.bigproject.controller;

import com.aivle0102.bigproject.dto.LoginRequest;
import com.aivle0102.bigproject.dto.ResetPasswordRequest;
import com.aivle0102.bigproject.dto.SignUpRequest;
import com.aivle0102.bigproject.dto.UserResponse;
import com.aivle0102.bigproject.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.Map;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/auth/join")
    public ResponseEntity<UserResponse> join(@Valid @RequestBody SignUpRequest request) {
        UserResponse response = authService.join(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PostMapping("/auth/login")
    public ResponseEntity<UserResponse> login(@Valid @RequestBody LoginRequest request) {
        UserResponse response = authService.login(request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/auth/logout")
    public ResponseEntity<Map<String, String>> logout() {
        authService.logout();
        return ResponseEntity.ok(Map.of("message", "Logged out"));
    }

    @PostMapping("/auth/reset-password")
    public ResponseEntity<Map<String, String>> resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        authService.resetPassword(request);
        return ResponseEntity.ok(Map.of("message", "Password updated"));
    }

    @DeleteMapping("/auth/withdraw")
    public ResponseEntity<Map<String, String>> withdraw(Principal principal) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Authentication required"));
        }
        authService.withdraw(principal.getName());
        return ResponseEntity.ok(Map.of("message", "Account withdrawn"));
    }

    @GetMapping("/user/me")
    public ResponseEntity<?> getCurrentUser(Principal principal) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Authentication required"));
        }
        UserResponse response = authService.getCurrentUser(principal.getName());
        return ResponseEntity.ok(response);
    }

    @GetMapping("/health")
    public ResponseEntity<Map<String, String>> healthCheck() {
        return ResponseEntity.ok(Map.of(
                "status", "UP",
                "message", "Auth service is running"));
    }
}
