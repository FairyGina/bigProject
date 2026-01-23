package com.aivle0102.bigproject.security.oauth;

import com.aivle0102.bigproject.domain.UserInfo;
import com.aivle0102.bigproject.repository.UserInfoRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.client.userinfo.DefaultOAuth2UserService;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserRequest;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.user.DefaultOAuth2User;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.util.*;

@Service
@RequiredArgsConstructor
public class CustomOAuth2UserService extends DefaultOAuth2UserService {

    private final UserInfoRepository userInfoRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public OAuth2User loadUser(OAuth2UserRequest userRequest) throws OAuth2AuthenticationException {
        OAuth2User oauthUser = super.loadUser(userRequest);
        String registrationId = userRequest.getClientRegistration().getRegistrationId();
        Map<String, Object> attributes = oauthUser.getAttributes();

        String provider = registrationId.toLowerCase(Locale.ROOT);
        OAuth2UserProfile profile = extractProfile(provider, attributes);

        UserInfo userInfo = userInfoRepository.findByProviderAndProviderId(provider, profile.providerId())
                .orElseGet(() -> createUser(provider, profile));

        Map<String, Object> mapped = new HashMap<>(attributes);
        mapped.put("userId", userInfo.getUserId());
        mapped.put("userName", userInfo.getUserName());
        mapped.put("provider", provider);
        mapped.put("providerId", profile.providerId());

        return new DefaultOAuth2User(
                Collections.singleton(new SimpleGrantedAuthority("ROLE_USER")),
                mapped,
                "userId");
    }

    private OAuth2UserProfile extractProfile(String provider, Map<String, Object> attributes) {
        if ("naver".equals(provider)) {
            Map<String, Object> response = castMap(attributes.get("response"));
            String id = Objects.toString(response.get("id"), null);
            String name = Objects.toString(response.get("name"), null);
            String nickname = Objects.toString(response.get("nickname"), null);
            String displayName = firstNonBlank(name, nickname, "사용자");
            return new OAuth2UserProfile(id, displayName);
        }
        if ("kakao".equals(provider)) {
            String id = Objects.toString(attributes.get("id"), null);
            Map<String, Object> account = castMap(attributes.get("kakao_account"));
            Map<String, Object> profile = account != null ? castMap(account.get("profile")) : null;
            String nickname = profile != null ? Objects.toString(profile.get("nickname"), null) : null;
            String displayName = firstNonBlank(nickname, "사용자");
            return new OAuth2UserProfile(id, displayName);
        }
        throw new OAuth2AuthenticationException("지원하지 않는 제공자입니다: " + provider);
    }

    private UserInfo createUser(String provider, OAuth2UserProfile profile) {
        String userId = provider + "_" + profile.providerId();
        String randomPassword = UUID.randomUUID().toString();
        String hashedPassword = passwordEncoder.encode(randomPassword);
        String salt = hashedPassword.substring(0, 29);

        UserInfo userInfo = UserInfo.builder()
                .userId(userId)
                .userPw(hashedPassword)
                .userPwHash(hashedPassword)
                .salt(salt)
                .userName(profile.displayName())
                .userState("1")
                .joinDate(LocalDateTime.now())
                .loginFailCount(0)
                .passwordChangedAt(OffsetDateTime.now())
                .provider(provider)
                .providerId(profile.providerId())
                .build();

        return userInfoRepository.save(userInfo);
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> castMap(Object value) {
        if (value instanceof Map<?, ?> map) {
            return (Map<String, Object>) map;
        }
        return Collections.emptyMap();
    }

    private String firstNonBlank(String... values) {
        for (String value : values) {
            if (value != null && !value.isBlank()) {
                return value;
            }
        }
        return "사용자";
    }

    private record OAuth2UserProfile(String providerId, String displayName) {
    }
}
