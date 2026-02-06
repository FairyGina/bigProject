package com.aivle0102.bigproject.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserResponse {

    private String userId;

    private String userName;

    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd")
    private LocalDate birthDate;

    private LocalDateTime joinDate;

    private OffsetDateTime passwordChangedAt;

    private boolean passwordExpired;

    private OffsetDateTime passwordExpiryAt;

    private String accessToken;

    private boolean socialAccount;
}
