package com.example.demo.repository;

import com.example.demo.entity.UserInfo;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

/**
 * 사용자 정보 Repository
 * Spring Data JPA를 사용한 데이터 액세스 계층
 */
@Repository
public interface UserInfoRepository extends JpaRepository<UserInfo, String> {

    /**
     * 사용자 ID로 사용자 조회
     * 
     * @param userId 사용자 아이디
     * @return Optional<UserInfo>
     */
    Optional<UserInfo> findByUserId(String userId);

    /**
     * 사용자 ID와 상태로 사용자 조회 (활성 사용자만)
     * 
     * @param userId    사용자 아이디
     * @param userState 사용자 상태 ('1': 활성)
     * @return Optional<UserInfo>
     */
    Optional<UserInfo> findByUserIdAndUserState(String userId, String userState);

    /**
     * 사용자 ID 존재 여부 확인 (중복 체크)
     * 
     * @param userId 사용자 아이디
     * @return 존재 여부
     */
    boolean existsByUserId(String userId);
}
