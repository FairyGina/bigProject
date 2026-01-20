package com.aivle0102.bigproject.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class PasswordResetRequest {

    @NotBlank(message = "userId is required")
    private String userId;

    @NotBlank(message = "userName is required")
    private String userName;
}
