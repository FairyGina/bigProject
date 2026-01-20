package com.aivle0102.bigproject.service;

import com.aivle0102.bigproject.dto.LoginRequest;
import com.aivle0102.bigproject.dto.PasswordResetRequest;
import com.aivle0102.bigproject.dto.PasswordResetVerifyRequest;
import com.aivle0102.bigproject.dto.ResetPasswordRequest;
import com.aivle0102.bigproject.dto.SignUpRequest;
import com.aivle0102.bigproject.dto.UserResponse;
import com.aivle0102.bigproject.domain.UserInfo;
import com.aivle0102.bigproject.exception.CustomException;
import com.aivle0102.bigproject.repository.UserInfoRepository;
import com.aivle0102.bigproject.security.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AuthService {

    private final UserInfoRepository userInfoRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;
    private final PasswordResetCodeService passwordResetCodeService;
    private static final int MAX_LOGIN_FAILURES = 5;

    @Transactional
    public UserResponse join(SignUpRequest request) {
        log.debug("join user: {}", request.getUserId());

        if (!request.getPassword().equals(request.getConfirmPassword())) {
            throw new CustomException("비밀번호가 일치하지 않습니다.", HttpStatus.BAD_REQUEST, "PASSWORD_MISMATCH");
        }

        String passwordPattern = "^(?=.*[A-Za-z])(?=.*\\d)(?=.*[@$!%*#?&])[A-Za-z\\d@$!%*#?&]{8,}$";
        if (!request.getPassword().matches(passwordPattern)) {
            throw new CustomException("비밀번호 정책을 만족하지 않습니다.", HttpStatus.BAD_REQUEST, "INVALID_PASSWORD_POLICY");
        }

        if (userInfoRepository.existsByUserId(request.getUserId())) {
            throw new CustomException("이미 존재하는 아이디입니다.", HttpStatus.CONFLICT, "DUPLICATE_USER_ID");
        }

        String hashedPassword = passwordEncoder.encode(request.getPassword());
        String salt = hashedPassword.substring(0, 29);

        LocalDate.parse(request.getBirthDate());

        UserInfo userInfo = UserInfo.builder()
                .userId(request.getUserId())
                .userPw(hashedPassword)
                .userPwHash(hashedPassword)
                .salt(salt)
                .userName(request.getUserName())
                .userState("1")
                .joinDate(LocalDateTime.now())
                .loginFailCount(0)
                .build();

        userInfoRepository.save(userInfo);

        return toUserResponse(userInfo, null);
    }

    @Transactional(noRollbackFor = CustomException.class)
    public UserResponse login(LoginRequest request) {
        log.debug("login user: {}", request.getUserId());

        UserInfo userInfo = userInfoRepository.findByUserIdAndUserState(request.getUserId(), "1")
                .orElseThrow(() -> new CustomException("ID를 다시 확인해주세요.", HttpStatus.UNAUTHORIZED, "INVALID_USER_ID"));

        if (userInfo.getLoginFailCount() >= MAX_LOGIN_FAILURES) {
            throw new CustomException("비밀번호 재설정이 필요합니다.", HttpStatus.FORBIDDEN, "PASSWORD_RESET_REQUIRED");
        }

        if (!passwordEncoder.matches(request.getPassword(), userInfo.getUserPwHash())) {
            int nextFailCount = userInfo.getLoginFailCount() + 1;
            userInfo.setLoginFailCount(nextFailCount);
            userInfoRepository.save(userInfo);
            if (nextFailCount >= MAX_LOGIN_FAILURES) {
                throw new CustomException("비밀번호 재설정이 필요합니다.", HttpStatus.FORBIDDEN, "PASSWORD_RESET_REQUIRED");
            }
            if (nextFailCount == MAX_LOGIN_FAILURES - 1) {
                throw new CustomException("로그인 시도 횟수가 얼마 남지 않았습니다.", HttpStatus.UNAUTHORIZED, "PASSWORD_RESET_WARNING_4");
            }
            if (nextFailCount == MAX_LOGIN_FAILURES - 2) {
                throw new CustomException("로그인 시도 횟수가 얼마 남지 않았습니다.", HttpStatus.UNAUTHORIZED, "PASSWORD_RESET_WARNING_3");
            }
            throw new CustomException("PW를 다시 확인해주세요.", HttpStatus.UNAUTHORIZED, "INVALID_PASSWORD");
        }

        if (userInfo.getLoginFailCount() > 0) {
            userInfo.setLoginFailCount(0);
            userInfoRepository.save(userInfo);
        }

        String accessToken = jwtTokenProvider.createToken(userInfo.getUserId(), userInfo.getUserName());

        return toUserResponse(userInfo, accessToken);
    }

    public void logout() {
        // No server-side state to clear.
    }

    @Transactional
    public void resetPassword(ResetPasswordRequest request) {
        log.debug("비밀번호 변경 userId : {}", request.getUserId());

        passwordResetCodeService.assertVerified(request.getUserId());

        if (!request.getNewPassword().equals(request.getConfirmPassword())) {
            throw new CustomException("비밀번호가 일치하지 않습니다.", HttpStatus.BAD_REQUEST, "PASSWORD_MISMATCH");
        }

        String passwordPattern = "^(?=.*[A-Za-z])(?=.*\\d)(?=.*[@$!%*#?&])[A-Za-z\\d@$!%*#?&]{8,}$";
        if (!request.getNewPassword().matches(passwordPattern)) {
            throw new CustomException("비밀번호 정책을 만족하지 않습니다.", HttpStatus.BAD_REQUEST, "INVALID_PASSWORD_POLICY");
        }

        boolean nameExists = userInfoRepository.existsByUserNameAndUserState(request.getUserName(), "1");
        if (!nameExists) {
            throw new CustomException("이름을 다시 확인해주세요.", HttpStatus.BAD_REQUEST, "USER_NAME_NOT_FOUND");
        }

        UserInfo userInfo = userInfoRepository.findByUserIdAndUserNameAndUserState(
                request.getUserId(),
                request.getUserName(),
                "1"
        ).orElseThrow(() -> new CustomException("아이디와 이름이 일치하지 않습니다.", HttpStatus.BAD_REQUEST, "USER_EMAIL_MISMATCH"));

        if (passwordEncoder.matches(request.getNewPassword(), userInfo.getUserPwHash())) {
            throw new CustomException("이전 비밀번호와 동일합니다.", HttpStatus.BAD_REQUEST, "PASSWORD_SAME_AS_BEFORE");
        }

        String hashedPassword = passwordEncoder.encode(request.getNewPassword());
        String salt = hashedPassword.substring(0, 29);
        userInfo.setUserPw(hashedPassword);
        userInfo.setUserPwHash(hashedPassword);
        userInfo.setSalt(salt);
        userInfo.setLoginFailCount(0);
        userInfoRepository.saveAndFlush(userInfo);
    }

    @Transactional
    public void requestPasswordReset(PasswordResetRequest request) {
        log.debug("비밀번호 재설정 인증 요청 userId: {}", request.getUserId());
        passwordResetCodeService.sendResetCode(request.getUserId(), request.getUserName());
    }

    @Transactional
    public void verifyPasswordResetCode(PasswordResetVerifyRequest request) {
        log.debug("비밀번호 재설정 인증 확인 userId: {}", request.getUserId());
        passwordResetCodeService.verifyResetCode(request.getUserId(), request.getCode());
    }

    @Transactional
    public void withdraw(String userId) {
        log.debug("탈퇴 유저 userId : {}", userId);
        UserInfo userInfo = userInfoRepository.findByUserIdAndUserState(userId, "1")
                .orElseThrow(() -> new CustomException("사용자를 찾을 수 없습니다.", HttpStatus.NOT_FOUND, "USER_NOT_FOUND"));

        userInfo.setUserState("0");
        userInfoRepository.save(userInfo);
    }

    public UserResponse getCurrentUser(String userId) {
        UserInfo userInfo = userInfoRepository.findByUserIdAndUserState(userId, "1")
                .orElseThrow(() -> new CustomException("사용자를 찾을 수 없습니다.", HttpStatus.NOT_FOUND, "USER_NOT_FOUND"));

        return toUserResponse(userInfo, null);
    }

    private UserResponse toUserResponse(UserInfo userInfo, String accessToken) {
        return UserResponse.builder()
                .userId(userInfo.getUserId())
                .userName(userInfo.getUserName())
                .joinDate(userInfo.getJoinDate())
                .accessToken(accessToken)
                .build();
    }
}
