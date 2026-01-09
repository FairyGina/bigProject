package com.example.demo.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 사용자 정보 응답 DTO
 * 민감한 정보(비밀번호, 솔트)를 제외한 사용자 정보
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserResponse {

    /**
     * 사용자 아이디
     */
    private String userId;

    /**
     * 사용자 이름
     */
    private String userName;

    /**
     * 가입일시
     */
    /**
     * 가입일시
     */
    private LocalDateTime joinDate;

    /**
     * JWT 액세스 토큰
     */
    private String accessToken;
}
