package com.aivle0102.bigproject.service;

import com.aivle0102.bigproject.dto.LoginRequest;
import com.aivle0102.bigproject.dto.PasswordResetRequest;
import com.aivle0102.bigproject.dto.PasswordResetVerifyRequest;
import com.aivle0102.bigproject.dto.ResetPasswordRequest;
import com.aivle0102.bigproject.dto.SignUpRequest;
import com.aivle0102.bigproject.dto.UpdateProfileRequest;
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
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;

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
    private static final int SEQUENTIAL_LENGTH = 3;
    private static final int PASSWORD_EXPIRY_MONTHS = 6;

    @Transactional
    public UserResponse join(SignUpRequest request) {
        log.debug("join user: {}", request.getUserId());

        

        LocalDate birthDate = LocalDate.parse(request.getBirthDate());
        validatePasswordPolicy(request.getPassword(), request.getUserId(), birthDate);

        

        if (userInfoRepository.existsByUserId(request.getUserId())) {
            throw new CustomException("이미 존재하는 아이디입니다.", HttpStatus.CONFLICT, "DUPLICATE_USER_ID");
        }

        String hashedPassword = passwordEncoder.encode(request.getPassword());
        UserInfo userInfo = UserInfo.builder()
                .userId(request.getUserId())
                .userPw(hashedPassword)
                .userName(request.getUserName())
                .birthDate(birthDate)
                .userState("1")
                .joinDate(LocalDateTime.now())
                .loginFailCount(0)
                .passwordChangedAt(OffsetDateTime.now())
                .build();

        userInfoRepository.save(userInfo);

        return toUserResponse(userInfo, null);
    }

    @Transactional(noRollbackFor = CustomException.class)
    public UserResponse login(LoginRequest request) {
        log.debug("login user: {}", request.getUserId());

        UserInfo userInfo = userInfoRepository.findByUserIdAndUserState(request.getUserId(), "1")
                .orElseThrow(() -> new CustomException("아이디를 다시 확인해주세요.", HttpStatus.UNAUTHORIZED, "INVALID_USER_ID"));

        log.info("Login attempt userId={} loginFailCount={}", userInfo.getUserId(), userInfo.getLoginFailCount());

        if (userInfo.getLoginFailCount() >= MAX_LOGIN_FAILURES) {
            log.warn("Login blocked (failCount>=max) userId={} failCount={}", userInfo.getUserId(), userInfo.getLoginFailCount());
            throw new CustomException("비밀번호 재설정이 필요합니다.", HttpStatus.FORBIDDEN, "PASSWORD_RESET_REQUIRED");
        }

        if (!passwordEncoder.matches(request.getPassword(), userInfo.getUserPw())) {
            int nextFailCount = userInfo.getLoginFailCount() + 1;
            userInfo.setLoginFailCount(nextFailCount);
            userInfoRepository.save(userInfo);
            log.warn("Login failed userId={} nextFailCount={}", userInfo.getUserId(), nextFailCount);
            if (nextFailCount >= MAX_LOGIN_FAILURES) {
                throw new CustomException("비밀번호 재설정이 필요합니다.", HttpStatus.FORBIDDEN, "PASSWORD_RESET_REQUIRED");
            }
            if (nextFailCount == MAX_LOGIN_FAILURES - 1) {
                throw new CustomException("로그인 시도 횟수가 얼마 남지 않았습니다.", HttpStatus.UNAUTHORIZED, "PASSWORD_RESET_WARNING_4");
            }
            if (nextFailCount == MAX_LOGIN_FAILURES - 2) {
                throw new CustomException("로그인 시도 횟수가 얼마 남지 않았습니다.", HttpStatus.UNAUTHORIZED, "PASSWORD_RESET_WARNING_3");
            }
            throw new CustomException("비밀번호를 다시 확인해주세요.", HttpStatus.UNAUTHORIZED, "INVALID_PASSWORD");
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

    public void verifyPassword(String userId, String password) {
        UserInfo userInfo = userInfoRepository.findByUserIdAndUserState(userId, "1")
                .orElseThrow(() -> new CustomException("사용자를 찾을 수 없습니다.", HttpStatus.NOT_FOUND, "USER_NOT_FOUND"));

        if (userInfo.getProvider() != null && !userInfo.getProvider().isBlank()) {
            return;
        }

        if (!passwordEncoder.matches(password, userInfo.getUserPw())) {
            throw new CustomException("비밀번호가 일치하지 않습니다.", HttpStatus.UNAUTHORIZED, "PASSWORD_MISMATCH");
        }
    }

    @Transactional
    public void resetPassword(ResetPasswordRequest request) {
        log.debug("resetPassword userId : {}", request.getUserId());

        passwordResetCodeService.assertVerified(request.getUserId());

        if (!request.getNewPassword().equals(request.getConfirmPassword())) {
            throw new CustomException("비밀번호가 일치하지 않습니다.", HttpStatus.BAD_REQUEST, "PASSWORD_MISMATCH");
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


        validatePasswordPolicy(request.getNewPassword(), userInfo.getUserId(), userInfo.getBirthDate());
        if (passwordEncoder.matches(request.getNewPassword(), userInfo.getUserPw())) {
            throw new CustomException("이전 비밀번호와 동일합니다.", HttpStatus.BAD_REQUEST, "PASSWORD_SAME_AS_BEFORE");
        }

        String hashedPassword = passwordEncoder.encode(request.getNewPassword());
        userInfo.setUserPw(hashedPassword);
        userInfo.setPasswordChangedAt(OffsetDateTime.now());
        userInfo.setLoginFailCount(0);
        userInfoRepository.saveAndFlush(userInfo);
    }

    @Transactional
    public void requestPasswordReset(PasswordResetRequest request) {
        log.debug("requestPasswordReset userId: {}", request.getUserId());
        passwordResetCodeService.sendResetCode(request.getUserId(), request.getUserName());
    }

    @Transactional
    public void verifyPasswordResetCode(PasswordResetVerifyRequest request) {
        log.debug("verifyPasswordResetCode userId: {}", request.getUserId());
        passwordResetCodeService.verifyResetCode(request.getUserId(), request.getCode());
    }

    @Transactional
    public void withdraw(String userId) {
        log.debug("회원탈퇴 userId : {}", userId);
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

    @Transactional
    public UserResponse updateProfile(String userId, UpdateProfileRequest request) {
        UserInfo userInfo = userInfoRepository.findByUserIdAndUserState(userId, "1")
                .orElseThrow(() -> new CustomException("사용자를 찾을 수 없습니다.", HttpStatus.NOT_FOUND, "USER_NOT_FOUND"));

        boolean hasBirthDate = request.getBirthDate() != null && !request.getBirthDate().isBlank();
        boolean hasNewPassword = request.getNewPassword() != null && !request.getNewPassword().isBlank();
        boolean hasConfirmPassword = request.getConfirmNewPassword() != null && !request.getConfirmNewPassword().isBlank();

        if (!hasBirthDate && !hasNewPassword && !hasConfirmPassword) {
            throw new CustomException("변경할 값이 없습니다.", HttpStatus.BAD_REQUEST, "NO_CHANGES");
        }

        boolean isSocialAccount = userInfo.getProvider() != null && !userInfo.getProvider().isBlank();
        if (isSocialAccount && (hasNewPassword || hasConfirmPassword)) {
            throw new CustomException("SNS 계정은 비밀번호를 변경할 수 없습니다.", HttpStatus.BAD_REQUEST, "SOCIAL_PASSWORD_BLOCKED");
        }

        if (hasNewPassword || hasConfirmPassword) {
            if (!isSocialAccount) {
                String currentPassword = request.getCurrentPassword();
                if (currentPassword == null || currentPassword.isBlank()) {
                    throw new CustomException("현재 비밀번호를 입력해주세요.", HttpStatus.BAD_REQUEST, "CURRENT_PASSWORD_REQUIRED");
                }
                if (!passwordEncoder.matches(currentPassword, userInfo.getUserPw())) {
                    throw new CustomException("비밀번호가 일치하지 않습니다.", HttpStatus.UNAUTHORIZED, "PASSWORD_MISMATCH");
                }
            }
            if (!hasNewPassword || !hasConfirmPassword) {
                throw new CustomException("새 비밀번호 확인이 필요합니다.", HttpStatus.BAD_REQUEST, "CONFIRM_PASSWORD_REQUIRED");
            }
            

            validatePasswordPolicy(request.getNewPassword(), userInfo.getUserId(), userInfo.getBirthDate());

            

            if (!isSocialAccount && passwordEncoder.matches(request.getNewPassword(), userInfo.getUserPw())) {
                throw new CustomException("이전 비밀번호와 동일합니다.", HttpStatus.BAD_REQUEST, "PASSWORD_SAME_AS_BEFORE");
            }

            String hashedPassword = passwordEncoder.encode(request.getNewPassword());
            userInfo.setUserPw(hashedPassword);
            userInfo.setPasswordChangedAt(OffsetDateTime.now());
            userInfo.setLoginFailCount(0);
        }

        if (hasBirthDate) {
            LocalDate birthDate = LocalDate.parse(request.getBirthDate());
            userInfo.setBirthDate(birthDate);
        }

        userInfoRepository.save(userInfo);
        return toUserResponse(userInfo, null);
    }

    
    private void validatePasswordPolicy(String password, String userId, LocalDate birthDate) {
        String passwordPattern = "^(?=.*[A-Za-z])(?=.*\\d)(?=.*[@$!%*#?&])[A-Za-z\\d@$!%*#?&]{8,}$";
        if (!password.matches(passwordPattern)) {
            throw new CustomException("비밀번호 정책을 만족하지 않습니다.", HttpStatus.BAD_REQUEST, "INVALID_PASSWORD_POLICY");
        }
        if (isGuessablePassword(password, userId, birthDate)) {
            throw new CustomException("연속된 문자열이나 아이디/생년월일 등 추측 가능한 정보는 사용할 수 없습니다.", HttpStatus.BAD_REQUEST, "INVALID_PASSWORD_POLICY");
        }
    }

    private boolean isGuessablePassword(String password, String userId, LocalDate birthDate) {
        String lower = password.toLowerCase();
        if (userId != null && !userId.isBlank()) {
            String localPart = userId.split("@")[0].replaceAll("[^a-zA-Z0-9]", "").toLowerCase();
            if (localPart.length() >= 3 && lower.contains(localPart)) {
                return true;
            }
        }
        if (birthDate != null) {
            String yyyymmdd = birthDate.format(DateTimeFormatter.BASIC_ISO_DATE);
            String yymmdd = yyyymmdd.substring(2);
            String mmdd = yyyymmdd.substring(4);
            if (lower.contains(yyyymmdd) || lower.contains(yymmdd) || lower.contains(mmdd)) {
                return true;
            }
        }
        return hasSequentialDigits(lower, SEQUENTIAL_LENGTH)
                || hasSequentialLetters(lower, SEQUENTIAL_LENGTH)
                || hasKeyboardSequence(lower, SEQUENTIAL_LENGTH);
    }

    private boolean hasSequentialDigits(String value, int length) {
        int inc = 1;
        int dec = 1;
        for (int i = 1; i < value.length(); i += 1) {
            char prev = value.charAt(i - 1);
            char curr = value.charAt(i);
            boolean isDigitSeq = Character.isDigit(prev) && Character.isDigit(curr);
            if (isDigitSeq && curr - prev == 1) {
                inc += 1;
            } else {
                inc = 1;
            }
            if (isDigitSeq && prev - curr == 1) {
                dec += 1;
            } else {
                dec = 1;
            }
            if (inc >= length || dec >= length) {
                return true;
            }
        }
        return false;
    }

    private boolean hasSequentialLetters(String value, int length) {
        int inc = 1;
        int dec = 1;
        for (int i = 1; i < value.length(); i += 1) {
            char prev = value.charAt(i - 1);
            char curr = value.charAt(i);
            boolean isAlphaSeq = Character.isLetter(prev) && Character.isLetter(curr);
            if (isAlphaSeq && curr - prev == 1) {
                inc += 1;
            } else {
                inc = 1;
            }
            if (isAlphaSeq && prev - curr == 1) {
                dec += 1;
            } else {
                dec = 1;
            }
            if (inc >= length || dec >= length) {
                return true;
            }
        }
        return false;
    }

    private boolean hasKeyboardSequence(String value, int length) {
        if (value == null || value.isBlank()) {
            return false;
        }
        String lower = value.toLowerCase();
        String[] rows = { "qwertyuiop", "asdfghjkl", "zxcvbnm" };
        for (String row : rows) {
            if (containsKeyboardRun(lower, row, length)) {
                return true;
            }
            String reversed = new StringBuilder(row).reverse().toString();
            if (containsKeyboardRun(lower, reversed, length)) {
                return true;
            }
        }
        return false;
    }

    private boolean containsKeyboardRun(String value, String row, int length) {
        for (int i = 0; i <= row.length() - length; i += 1) {
            String seq = row.substring(i, i + length);
            if (value.contains(seq)) {
                return true;
            }
        }
        return false;
    }

    private UserResponse toUserResponse(UserInfo userInfo, String accessToken) {
        OffsetDateTime changedAt = userInfo.getPasswordChangedAt();
        if (changedAt == null && userInfo.getJoinDate() != null) {
            changedAt = userInfo.getJoinDate().atOffset(ZoneOffset.UTC);
        }
        OffsetDateTime expiryAt = changedAt == null ? null : changedAt.plusMonths(PASSWORD_EXPIRY_MONTHS);
        boolean expired = expiryAt != null && OffsetDateTime.now().isAfter(expiryAt);
        return UserResponse.builder()
                .userId(userInfo.getUserId())
                .userName(userInfo.getUserName())
                .birthDate(userInfo.getBirthDate())
                .joinDate(userInfo.getJoinDate())
                .passwordChangedAt(changedAt)
                .passwordExpiryAt(expiryAt)
                .passwordExpired(expired)
                .accessToken(accessToken)
                .socialAccount(userInfo.getProvider() != null && !userInfo.getProvider().isBlank())
                .build();
    }
}












