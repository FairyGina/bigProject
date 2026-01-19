package com.aivle0102.bigproject.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SignUpRequest {

    @NotBlank(message = "userId is required")
    @Size(min = 4, max = 50, message = "userId must be 4-50 characters")
    private String userId;

    @NotBlank(message = "password is required")
    @Size(min = 8, max = 100, message = "password must be at least 8 characters")
    private String password;

    @NotBlank(message = "userName is required")
    @Size(max = 50, message = "userName must be at most 50 characters")
    private String userName;

    @NotBlank(message = "birthDate is required")
    private String birthDate;

    @NotBlank(message = "confirmPassword is required")
    private String confirmPassword;
}
