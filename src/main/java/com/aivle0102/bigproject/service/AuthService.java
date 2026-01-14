package com.aivle0102.bigproject.service;

import com.aivle0102.bigproject.dto.LoginRequest;
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

    @Transactional
    public UserResponse join(SignUpRequest request) {
        log.debug("Attempting to join user: {}", request.getUserId());

        if (!request.getPassword().equals(request.getConfirmPassword())) {
            throw new CustomException("Passwords do not match", HttpStatus.BAD_REQUEST, "PASSWORD_MISMATCH");
        }

        String passwordPattern = "^(?=.*[A-Za-z])(?=.*\\d)(?=.*[@$!%*#?&])[A-Za-z\\d@$!%*#?&]{8,}$";
        if (!request.getPassword().matches(passwordPattern)) {
            throw new CustomException("Password policy not satisfied", HttpStatus.BAD_REQUEST, "INVALID_PASSWORD_POLICY");
        }

        if (userInfoRepository.existsByUserId(request.getUserId())) {
            throw new CustomException("User ID already exists", HttpStatus.CONFLICT, "DUPLICATE_USER_ID");
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
                .build();

        userInfoRepository.save(userInfo);

        return toUserResponse(userInfo, null);
    }

    public UserResponse login(LoginRequest request) {
        log.debug("Attempting to login user: {}", request.getUserId());

        UserInfo userInfo = userInfoRepository.findByUserIdAndUserState(request.getUserId(), "1")
                .orElseThrow(() -> new CustomException("Invalid credentials", HttpStatus.UNAUTHORIZED, "INVALID_CREDENTIALS"));

        if (!passwordEncoder.matches(request.getPassword(), userInfo.getUserPwHash())) {
            throw new CustomException("Invalid credentials", HttpStatus.UNAUTHORIZED, "INVALID_CREDENTIALS");
        }

        String accessToken = jwtTokenProvider.createToken(userInfo.getUserId(), userInfo.getUserName());

        return toUserResponse(userInfo, accessToken);
    }

    public void logout() {
        // No server-side state to clear.
    }

    @Transactional
    public void withdraw(String userId) {
        log.debug("Attempting to withdraw user: {}", userId);
        UserInfo userInfo = userInfoRepository.findByUserIdAndUserState(userId, "1")
                .orElseThrow(() -> new CustomException("User not found", HttpStatus.NOT_FOUND, "USER_NOT_FOUND"));

        userInfo.setUserState("0");
        userInfoRepository.save(userInfo);
    }

    public UserResponse getCurrentUser(String userId) {
        UserInfo userInfo = userInfoRepository.findByUserIdAndUserState(userId, "1")
                .orElseThrow(() -> new CustomException("User not found", HttpStatus.NOT_FOUND, "USER_NOT_FOUND"));

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
