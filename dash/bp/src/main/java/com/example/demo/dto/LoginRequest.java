package com.example.demo.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 로그인 요청 DTO
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class LoginRequest {

    /**
     * 사용자 아이디
     */
    @NotBlank(message = "아이디는 필수입니다")
    private String userId;

    /**
     * 비밀번호 (평문)
     */
    @NotBlank(message = "비밀번호는 필수입니다")
    private String password;
}
