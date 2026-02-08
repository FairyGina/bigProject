package com.aivle0102.bigproject.service;

import com.aivle0102.bigproject.domain.MarketReport;
import com.aivle0102.bigproject.domain.ReportChatMessage;
import com.aivle0102.bigproject.domain.ReportChatRoom;
import com.aivle0102.bigproject.domain.UserInfo;
import com.aivle0102.bigproject.dto.ReportChatMessageResponse;
import com.aivle0102.bigproject.repository.MarketReportRepository;
import com.aivle0102.bigproject.repository.ReportChatMessageRepository;
import com.aivle0102.bigproject.repository.ReportChatRoomRepository;
import com.aivle0102.bigproject.repository.UserInfoRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ReportChatService {

    private final MarketReportRepository marketReportRepository;
    private final ReportChatRoomRepository reportChatRoomRepository;
    private final ReportChatMessageRepository reportChatMessageRepository;
    private final UserInfoRepository userInfoRepository;

    @Transactional
    public ReportChatMessageResponse saveMessage(Long reportId, String userId, String content) {
        if (reportId == null) {
            throw new IllegalArgumentException("보고서 ID가 필요합니다.");
        }
        String cleaned = content == null ? "" : content.trim();
        if (cleaned.isEmpty()) {
            throw new IllegalArgumentException("메시지 내용이 비어 있습니다.");
        }
        MarketReport report = marketReportRepository.findWithRecipeById(reportId)
                .orElseThrow(() -> new IllegalArgumentException("보고서를 찾을 수 없습니다."));
        ReportChatRoom room = reportChatRoomRepository.findByReport_Id(reportId)
                .orElseGet(() -> reportChatRoomRepository.save(ReportChatRoom.builder()
                        .report(report)
                        .companyId(report.getRecipe() == null ? null : report.getRecipe().getCompanyId())
                        .build()));
        String senderId = (userId == null || userId.isBlank()) ? "anonymous" : userId;
        ReportChatMessage message = reportChatMessageRepository.save(ReportChatMessage.builder()
                .room(room)
                .userId(senderId)
                .content(cleaned)
                .build());
        String userName = userInfoRepository.findByUserId(senderId).map(UserInfo::getUserName).orElse(senderId);
        return ReportChatMessageResponse.from(message, userName);
    }

    @Transactional(readOnly = true)
    public List<ReportChatMessageResponse> getMessages(Long reportId) {
        if (reportId == null) {
            return List.of();
        }
        ReportChatRoom room = reportChatRoomRepository.findByReport_Id(reportId).orElse(null);
        if (room == null) {
            return List.of();
        }
        List<ReportChatMessage> messages = reportChatMessageRepository.findByRoom_IdOrderByCreatedAtAsc(room.getId());
        if (messages.isEmpty()) {
            return List.of();
        }
        List<String> userIds = messages.stream()
                .map(ReportChatMessage::getUserId)
                .distinct()
                .toList();
        Map<String, String> nameMap = userInfoRepository.findByUserIdIn(userIds).stream()
                .collect(Collectors.toMap(UserInfo::getUserId, UserInfo::getUserName, (a, b) -> a));
        return messages.stream()
                .map(msg -> ReportChatMessageResponse.from(msg, nameMap.getOrDefault(msg.getUserId(), msg.getUserId())))
                .toList();
    }
}
