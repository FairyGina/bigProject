package com.aivle0102.bigproject.config;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.JavaMailSenderImpl;

import java.util.Properties;

@Configuration
public class MailSenderConfig {

    @Bean
    @Qualifier("gmailMailSender")
    public JavaMailSender gmailMailSender(
            @Value("${mail.gmail.host}") String host,
            @Value("${mail.gmail.port}") int port,
            @Value("${mail.gmail.username}") String username,
            @Value("${mail.gmail.password}") String password,
            @Value("${mail.gmail.smtp.auth:true}") boolean auth,
            @Value("${mail.gmail.smtp.starttls.enable:true}") boolean startTls,
            @Value("${mail.gmail.smtp.starttls.required:true}") boolean startTlsRequired,
            @Value("${mail.gmail.default-encoding:UTF-8}") String encoding
    ) {
        JavaMailSenderImpl sender = new JavaMailSenderImpl();
        sender.setHost(host);
        sender.setPort(port);
        sender.setUsername(username);
        sender.setPassword(password);
        sender.setDefaultEncoding(encoding);

        Properties props = sender.getJavaMailProperties();
        props.put("mail.smtp.auth", String.valueOf(auth));
        props.put("mail.smtp.starttls.enable", String.valueOf(startTls));
        props.put("mail.smtp.starttls.required", String.valueOf(startTlsRequired));
        return sender;
    }

    @Bean
    @Qualifier("naverMailSender")
    public JavaMailSender naverMailSender(
            @Value("${mail.naver.host}") String host,
            @Value("${mail.naver.port}") int port,
            @Value("${mail.naver.username}") String username,
            @Value("${mail.naver.password}") String password,
            @Value("${mail.naver.smtp.auth:true}") boolean auth,
            @Value("${mail.naver.smtp.starttls.enable:true}") boolean startTls,
            @Value("${mail.naver.smtp.starttls.required:true}") boolean startTlsRequired,
            @Value("${mail.naver.default-encoding:UTF-8}") String encoding
    ) {
        JavaMailSenderImpl sender = new JavaMailSenderImpl();
        sender.setHost(host);
        sender.setPort(port);
        sender.setUsername(username);
        sender.setPassword(password);
        sender.setDefaultEncoding(encoding);

        Properties props = sender.getJavaMailProperties();
        props.put("mail.smtp.auth", String.valueOf(auth));
        props.put("mail.smtp.starttls.enable", String.valueOf(startTls));
        props.put("mail.smtp.starttls.required", String.valueOf(startTlsRequired));
        return sender;
    }

    // Kakao/Daum/Hanmail recipients can be served by Gmail sender as well.
}
