package com.aivle0102.bigproject.controller;

import com.aivle0102.bigproject.domain.UserInfo;
import com.aivle0102.bigproject.repository.UserInfoRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequiredArgsConstructor
public class TestController {

    private final UserInfoRepository userInfoRepository;

    @GetMapping("/db-test")
    public List<UserInfo> test() {
        return userInfoRepository.findAll();
    }
}
