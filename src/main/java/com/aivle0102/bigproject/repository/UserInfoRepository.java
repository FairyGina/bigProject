package com.aivle0102.bigproject.repository;

import com.aivle0102.bigproject.domain.UserInfo;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.List;

public interface UserInfoRepository extends JpaRepository<UserInfo, Integer> {

    // userId로 단건 조회 (로그인용)
    Optional<UserInfo> findByUserId(String userId);

    // 회원가입 시 중복 체크
    boolean existsByUserId(String userId);

    Optional<UserInfo> findByUserIdAndUserState(String userId, String userState);

    Optional<UserInfo> findByUserIdAndUserNameAndUserState(String userId, String userName, String userState);

    boolean existsByUserNameAndUserState(String userName, String userState);

    Optional<UserInfo> findByProviderAndProviderId(String provider, String providerId);

    List<UserInfo> findByUserIdIn(List<String> userIds);
}
