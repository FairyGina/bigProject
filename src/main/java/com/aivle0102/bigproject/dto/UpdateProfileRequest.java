package com.aivle0102.bigproject.dto;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class UpdateProfileRequest {
    private String birthDate;
    private String currentPassword;
    private String newPassword;
    private String confirmNewPassword;
}
