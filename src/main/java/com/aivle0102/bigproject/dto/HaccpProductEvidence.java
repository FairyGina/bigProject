package com.aivle0102.bigproject.dto;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class HaccpProductEvidence {
    private String prdlstReportNo; // 품목보고번호
    private String prdlstNm;       // 제품명
    private String prdkind;        // 유형명
    private String allergyRaw;     // allergy 원문 (비어있을 수 있음)
    private String rawmtrlRaw;     // rawmtrl 원문 (비어있을 수 있음)
}
