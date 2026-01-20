package com.aivle0102.bigproject.service;

import com.aivle0102.bigproject.domain.UserInfo;
import com.aivle0102.bigproject.exception.CustomException;
import com.aivle0102.bigproject.repository.UserInfoRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.HttpStatus;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Service
@RequiredArgsConstructor
public class PasswordResetCodeService {

    private static final Duration CODE_TTL = Duration.ofMinutes(3);
    private static final Duration VERIFIED_TTL = Duration.ofMinutes(15);
    private static final int CODE_LENGTH = 6;

    private final UserInfoRepository userInfoRepository;
    @Qualifier("gmailMailSender")
    private final JavaMailSender gmailMailSender;
    @Qualifier("naverMailSender")
    private final JavaMailSender naverMailSender;
    private final SecureRandom random = new SecureRandom();
    private final Map<String, CodeEntry> codeStore = new ConcurrentHashMap<>();
    private final Map<String, Instant> verifiedStore = new ConcurrentHashMap<>();

    public void sendResetCode(String userId, String userName) {
        UserInfo userInfo = userInfoRepository.findByUserIdAndUserNameAndUserState(userId, userName, "1")
                .orElseThrow(() -> new CustomException("계정 정보를 다시 확인해주세요.", HttpStatus.BAD_REQUEST, "INVALID_ACCOUNT"));

        String code = generateCode();
        codeStore.put(userId, new CodeEntry(code, Instant.now().plus(CODE_TTL)));

        JavaMailSender mailSender = resolveMailSender(userInfo.getUserId());
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setTo(userInfo.getUserId());
            message.setFrom(resolveFromAddress(mailSender));
            message.setSubject("[BeanRecipe] 비밀번호 재설정 인증번호를 확인해주세요.");
            message.setText("인증번호: " + code + "\n3분 이내에 입력해 주세요.");
            mailSender.send(message);
        } catch (Exception ex) {
            log.warn("Failed to send reset code email for userId={}. Code={}", userId, code, ex);
        }
    }

    public void verifyResetCode(String userId, String code) {
        CodeEntry entry = codeStore.get(userId);
        if (entry == null) {
            throw new CustomException("인증번호를 다시 요청해 주세요.", HttpStatus.BAD_REQUEST, "VERIFICATION_CODE_NOT_FOUND");
        }
        if (Instant.now().isAfter(entry.expiresAt())) {
            codeStore.remove(userId);
            throw new CustomException("인증번호가 만료되었습니다.", HttpStatus.BAD_REQUEST, "VERIFICATION_CODE_EXPIRED");
        }
        if (!entry.code().equals(code)) {
            throw new CustomException("인증번호가 일치하지 않습니다.", HttpStatus.BAD_REQUEST, "INVALID_VERIFICATION_CODE");
        }

        verifiedStore.put(userId, Instant.now().plus(VERIFIED_TTL));
    }

    public void assertVerified(String userId) {
        Instant expiresAt = verifiedStore.get(userId);
        if (expiresAt == null || Instant.now().isAfter(expiresAt)) {
            throw new CustomException("인증이 필요합니다.", HttpStatus.FORBIDDEN, "VERIFICATION_REQUIRED");
        }
    }

    private String generateCode() {
        int bound = (int) Math.pow(10, CODE_LENGTH);
        int value = random.nextInt(bound);
        return String.format("%0" + CODE_LENGTH + "d", value);
    }

    private JavaMailSender resolveMailSender(String userId) {
        String domain = extractDomain(userId);
        if ("gmail.com".equalsIgnoreCase(domain)) {
            return gmailMailSender;
        }
        if ("naver.com".equalsIgnoreCase(domain)) {
            return naverMailSender;
        }
        return gmailMailSender;
    }

    private String resolveFromAddress(JavaMailSender sender) {
        if (sender instanceof org.springframework.mail.javamail.JavaMailSenderImpl impl) {
            return impl.getUsername();
        }
        return null;
    }

    private String extractDomain(String email) {
        int at = email.lastIndexOf('@');
        if (at < 0 || at == email.length() - 1) {
            throw new CustomException("이메일 형식이 올바르지 않습니다.", HttpStatus.BAD_REQUEST, "INVALID_EMAIL_FORMAT");
        }
        return email.substring(at + 1);
    }

    private record CodeEntry(String code, Instant expiresAt) {
    }
}
