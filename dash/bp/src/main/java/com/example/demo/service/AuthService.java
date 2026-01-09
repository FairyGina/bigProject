package com.example.demo.service;

import com.example.demo.dto.*;
import com.example.demo.entity.UserInfo;
import com.example.demo.exception.CustomException;
import com.example.demo.repository.UserInfoRepository;
import com.example.demo.security.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 인증 서비스 (JWT 기반)
 * 회원가입, 로그인, 로그아웃, 회원탈퇴 비즈니스 로직
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AuthService {

    private final UserInfoRepository userInfoRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;

    /**
     * 회원가입
     * 
     * @param request 회원가입 요청 DTO
     * @return 사용자 정보 응답
     */
    @Transactional
    public UserResponse join(SignUpRequest request) {
        log.debug("Attempting to join user: {}", request.getUserId());

        // 비밀번호 일치 확인
        if (!request.getPassword().equals(request.getConfirmPassword())) {
            throw new CustomException("비밀번호가 일치하지 않습니다", HttpStatus.BAD_REQUEST, "PASSWORD_MISMATCH");
        }

        // 비밀번호 정책 확인 (8자 이상, 영문+숫자+특수문자)
        String passwordPattern = "^(?=.*[A-Za-z])(?=.*\\d)(?=.*[@$!%*#?&])[A-Za-z\\d@$!%*#?&]{8,}$";
        if (!request.getPassword().matches(passwordPattern)) {
            throw new CustomException("비밀번호는 8자 이상이어야 하며, 영문, 숫자, 특수문자를 포함해야 합니다",
                    HttpStatus.BAD_REQUEST, "INVALID_PASSWORD_POLICY");
        }

        // 아이디 중복 체크
        if (userInfoRepository.existsByUserId(request.getUserId())) {
            throw new CustomException("이미 사용 중인 아이디입니다", HttpStatus.CONFLICT, "DUPLICATE_USER_ID");
        }

        // BCrypt로 비밀번호 해싱 (솔트 자동 포함)
        String hashedPassword = passwordEncoder.encode(request.getPassword());

        // BCrypt 해시에서 솔트 부분 추출 (처음 29자가 버전/라운드/솔트)
        String salt = hashedPassword.substring(0, 29);

        // 생년월일 파싱
        java.time.LocalDate birthDate = java.time.LocalDate.parse(request.getBirthDate());

        // 사용자 엔티티 생성
        UserInfo userInfo = UserInfo.builder()
                .userId(request.getUserId())
                .userPwHash(hashedPassword)
                .salt(salt)
                .userName(request.getUserName())
                .birthDate(birthDate)
                .userState("1") // 활성 상태
                .build();

        userInfoRepository.save(userInfo);

        // 회원가입 직후 자동 등 여부는 기획에 따라 다르지만 여기선 토큰 미발급 (로그인 유도)
        return toUserResponse(userInfo, null);
    }

    /**
     * 로그인
     * 
     * @param request 로그인 요청 DTO
     * @return 사용자 정보 응답 (토큰 포함)
     */
    public UserResponse login(LoginRequest request) {
        log.debug("Attempting to login user: {}", request.getUserId());
        // 활성 사용자만 조회
        UserInfo userInfo = userInfoRepository.findByUserIdAndUserState(request.getUserId(), "1")
                .orElseThrow(() -> new CustomException("아이디 또는 비밀번호가 올바르지 않습니다",
                        HttpStatus.UNAUTHORIZED, "INVALID_CREDENTIALS"));

        // 비밀번호 검증
        if (!passwordEncoder.matches(request.getPassword(), userInfo.getUserPwHash())) {
            throw new CustomException("아이디 또는 비밀번호가 올바르지 않습니다",
                    HttpStatus.UNAUTHORIZED, "INVALID_CREDENTIALS");
        }

        // 토큰 생성
        String accessToken = jwtTokenProvider.createToken(userInfo.getUserId(), userInfo.getUserName());

        return toUserResponse(userInfo, accessToken);
    }

    /**
     * 로그아웃
     * JWT는 서버 상태가 없으므로 서버측 로직 없음 (클라이언트에서 토큰 삭제)
     */
    public void logout() {
        // 필요 시 블랙리스트 처리 등 가능
    }

    /**
     * 회원 탈퇴 (Soft Delete)
     * 
     * @param userId 사용자 아이디
     */
    @Transactional
    public void withdraw(String userId) {
        log.debug("Attempting to withdraw user: {}", userId);
        UserInfo userInfo = userInfoRepository.findByUserIdAndUserState(userId, "1")
                .orElseThrow(() -> new CustomException("사용자를 찾을 수 없습니다",
                        HttpStatus.NOT_FOUND, "USER_NOT_FOUND"));

        // userState를 '0'으로 변경 (Soft Delete)
        userInfo.setUserState("0");
        userInfoRepository.save(userInfo);
    }

    /**
     * 현재 사용자 정보 조회
     * 
     * @param userId 사용자 아이디
     * @return 사용자 응답 DTO
     */
    public UserResponse getCurrentUser(String userId) {
        UserInfo userInfo = userInfoRepository.findByUserIdAndUserState(userId, "1")
                .orElseThrow(() -> new CustomException("사용자를 찾을 수 없습니다",
                        HttpStatus.NOT_FOUND, "USER_NOT_FOUND"));

        return toUserResponse(userInfo, null);
    }

    /**
     * UserInfo -> UserResponse 변환 헬퍼
     */
    private UserResponse toUserResponse(UserInfo userInfo, String accessToken) {
        return UserResponse.builder()
                .userId(userInfo.getUserId())
                .userName(userInfo.getUserName())
                .joinDate(userInfo.getJoinDate())
                .accessToken(accessToken)
                .build();
    }
}
