package com.aivle0102.bigproject.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class PasswordResetVerifyRequest {

    @NotBlank(message = "userId is required")
    private String userId;

    @NotBlank(message = "code is required")
    @Size(min = 4, max = 8, message = "code must be 4-8 characters")
    private String code;
}
