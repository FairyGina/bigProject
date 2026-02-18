export const COUNTRY_LABELS = {
    KR: '한국',
    US: '미국',
    JP: '일본',
    CN: '중국',
    FR: '프랑스',
    DE: '독일',
    PL: '폴란드',
    IN: '인도',
    VN: '베트남',
    TH: '태국',
    UK: '영국',
    CA: '캐나다',
    AU: '호주',
};

export const buildCountryOptions = (values) =>
    values.map((value) => ({ value, label: COUNTRY_LABELS[value] || value }));

export const PERSONAS = {
    WORKER_20S_30S_SIMPLE: '20~30대 직장인, 간편식 선호',
    FAMILY_30S_40S: '30~40대 가족 중심',
    HEALTH_20S_30S: '20~30대 건강식 관심',
    TRADITION_40S_50S: '40~50대 전통식 선호',
    DUAL_INCOME_30S_40S: '30~40대 맞벌이 가정, 건강 중시',
    STUDENT_10S_20S_TREND: '10대/20대 학생, 트렌디한 맛 선호',
    FAMILY_40S_50S_VALUE: '40~50대 가족, 가성비 중시',
    OVERSEAS_BEGINNER: '해외 한식 입문자, 한국 맛 경험',
    FITNESS_HIGH_PROTEIN: '건강/피트니스 관심층, 고단백/저당',
};

export const PRICE_RANGES = {
    USD_3_5: 'USD 3~5',
    USD_6_9: 'USD 6~9',
    USD_10_15: 'USD 10~15',
    USD_15_20: 'USD 15~20',
    USD_20_PLUS: 'USD 20+',
};

export const REPORT_SECTION_LABELS = {
    executiveSummary: '핵심 요약',
    marketSnapshot: '시장 스냅샷',
    riskAssessment: '리스크 & 대응',
    swot: 'SWOT',
    conceptIdeas: '컨셉 아이디어',
    kpis: 'KPI 제안',
    nextSteps: '다음 단계',
    summary: '최종 보고서 요약',
    allergenNote: '알레르기 성분 노트',
    influencer: '인플루언서 추천',
    influencerImage: '인플루언서 이미지',
    globalMarketMap: 'Global Market Map',
    RecipeCase: '국가 수출 부적합 사례',
};

export const buildReportSections = (keys, requiredKeys = [], labelOverrides = {}) => {
    const requiredSet = new Set(requiredKeys);
    return keys.map((key) => ({
        key,
        label: labelOverrides[key] || REPORT_SECTION_LABELS[key] || key,
        required: requiredSet.has(key),
    }));
};
