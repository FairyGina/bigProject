package com.aivle0102.bigproject.domain;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;

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
    private Integer userSeq;

    @Column(name = "userid", nullable = false, length = 50, unique = true)
    private String userId;

    @Column(name = "userpw", nullable = false, length = 200)
    private String userPw;

    @Column(name = "userpwhash", nullable = false, length = 255)
    private String userPwHash;

    @Column(name = "salt", nullable = false, length = 60)
    private String salt;

    @Column(name = "username", nullable = false, length = 50)
    private String userName;

    @Column(name = "userstate", nullable = false)
    @JdbcTypeCode(SqlTypes.CHAR)
    private String userState;

    @Column(name = "joindate", nullable = false, updatable = false)
    private LocalDateTime joinDate;

    public void setUserState(String userState) {
        this.userState = userState;
    }
}
