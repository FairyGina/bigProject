package com.aivle0102.bigproject.domain;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;

@Entity
@Table(name = "userinfo", schema = "public")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class UserInfo {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "userseq")
    private Long userSeq;

    @Column(name = "userid", nullable = false, length = 50, unique = true)
    private String userId;

    @Column(name = "userpw", nullable = false, length = 255)
    private String userPw;

    @Column(name = "username", nullable = false, length = 50)
    private String userName;

    @Column(name = "birthdate")
    private LocalDate birthDate;

    @Column(name = "userstate", nullable = false)
    @JdbcTypeCode(SqlTypes.CHAR)
    private String userState;

    @Column(name = "joindate", nullable = false, updatable = false)
    private LocalDateTime joinDate;

    @Column(name = "loginfailcount", nullable = false)
    private int loginFailCount;

    @Column(name = "password_changed_at", nullable = false)
    private OffsetDateTime passwordChangedAt;

    @Column(name = "provider", length = 20)
    private String provider;

    @Column(name = "providerid", length = 100)
    private String providerId;

    @Column(name = "company_id")
    private Long companyId;

    public void setUserState(String userState) {
        this.userState = userState;
    }

    public void setUserPw(String userPw) {
        this.userPw = userPw;
    }


    public void setLoginFailCount(int loginFailCount) {
        this.loginFailCount = loginFailCount;
    }

    public void setPasswordChangedAt(OffsetDateTime passwordChangedAt) {
        this.passwordChangedAt = passwordChangedAt;
    }

    public void setBirthDate(LocalDate birthDate) {
        this.birthDate = birthDate;
    }

    public void setProvider(String provider) {
        this.provider = provider;
    }

    public void setProviderId(String providerId) {
        this.providerId = providerId;
    }
}
