package com.aivle0102.bigproject.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ResetPasswordRequest {

    @NotBlank(message = "userId is required")
    private String userId;

    @NotBlank(message = "userName is required")
    private String userName;

    @NotBlank(message = "newPassword is required")
    @Size(min = 8, max = 100, message = "newPassword must be at least 8 characters")
    private String newPassword;

    @NotBlank(message = "confirmPassword is required")
    private String confirmPassword;
}
