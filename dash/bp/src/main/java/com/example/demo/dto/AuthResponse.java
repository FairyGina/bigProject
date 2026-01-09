package com.example.demo.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 인증 응답 DTO
 * 로그인/회원가입 성공 시 반환되는 JWT 토큰 정보
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AuthResponse {

    /**
     * JWT 액세스 토큰
     */
    private String accessToken;

    /**
     * 토큰 타입 (Bearer)
     */
    @Builder.Default
    private String tokenType = "Bearer";

    /**
     * 토큰 만료 시간 (밀리초)
     */
    private Long expiresIn;

    /**
     * 사용자 정보
     */
    private UserResponse user;
}
