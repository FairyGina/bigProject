package com.aivle0102.bigproject.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class PasswordResetVerifyRequest {

    @NotBlank(message = "아이디는 필수입니다.")
    private String userId;

    @NotBlank(message = "인증 코드는 필수입니다.")
    @Size(min = 4, max = 8, message = "인증 코드는 4~8자여야 합니다.")
    private String code;
}
