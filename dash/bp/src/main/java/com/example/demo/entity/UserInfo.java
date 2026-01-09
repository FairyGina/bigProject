package com.example.demo.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * 사용자 정보 엔티티
 * userinfo 테이블과 매핑됩니다.
 */
@Entity
@Table(name = "userinfo")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserInfo {

    /**
     * 사용자 아이디 (Primary Key)
     */
    @Id
    @Column(name = "userid", nullable = false, length = 50)
    private String userId;

    /**
     * 비밀번호 해시값 (BCrypt 암호화)
     */
    @Column(name = "userpwhash", nullable = false, length = 255)
    private String userPwHash;

    /**
     * 비밀번호 솔트값
     * BCrypt 사용 시 해시에 포함되므로 별도 저장용
     */
    @Column(name = "salt", nullable = false, length = 60)
    private String salt;

    /**
     * 사용자 이름
     */
    @Column(name = "username", nullable = false, length = 50)
    private String userName;

    /**
     * 생년월일
     */
    @Column(name = "birthdate")
    private LocalDate birthDate;

    /**
     * 사용자 상태
     * '1': 활성 (기본값)
     * '0': 비활성 (탈퇴)
     */
    @Column(name = "userstate", nullable = false, length = 1)
    @Builder.Default
    private String userState = "1";

    /**
     * 가입일시
     */
    @Column(name = "joindate", nullable = false)
    @Builder.Default
    private LocalDateTime joinDate = LocalDateTime.now();
}
