--company(기업 정보) 테이블
CREATE TABLE IF NOT EXISTS company
(
	company_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY, -- 기업 ID
	company_name VARCHAR(255) NOT NULL, -- 기업명
	industry VARCHAR(100), -- 식품/프랜차이즈 등
	target_country VARCHAR(100), -- 주요 타겟 국가
	created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, -- 가입일
	updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP -- 수정일
);

--userinfo(회원) 테이블
CREATE TABLE IF NOT EXISTS userinfo (
    userSeq BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    userId VARCHAR(50) NOT NULL,
    userPw VARCHAR(255) NOT NULL,
    userName VARCHAR(50) NOT NULL,
    userState CHAR(1) NOT NULL DEFAULT '1',
    joinDate TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    loginfailcount INTEGER NOT NULL DEFAULT 0,
    provider VARCHAR(20),
    providerid VARCHAR(100),
    birthdate DATE,
    password_changed_at TIMESTAMP NOT NULL DEFAULT NOW(),
    company_id BIGINT REFERENCES company(company_id)
    );

CREATE UNIQUE INDEX IF NOT EXISTS ux_userinfo_userid ON userinfo (userId);

--notice(공지사항) 테이블
CREATE TABLE IF NOT EXISTS notice (
    notice_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    user_id VARCHAR(50) NOT NULL REFERENCES userinfo(userId),
    company_id BIGINT REFERENCES company(company_id),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_notice_company_id ON notice(company_id);

--notice_comment(공지사항 댓글) 테이블
CREATE TABLE IF NOT EXISTS notice_comment (
    notice_comment_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    notice_id BIGINT NOT NULL REFERENCES notice(notice_id) ON DELETE CASCADE,
    user_id VARCHAR(50) NOT NULL REFERENCES userinfo(userId),
    content TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

--recipe(레시피 & 메뉴 개발) 테이블
CREATE TABLE IF NOT EXISTS recipe (
    recipe_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    recipe_name VARCHAR(200) NOT NULL,
    description TEXT,
    image_base64 TEXT,
    steps TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    open_yn VARCHAR(1) NOT NULL DEFAULT 'Y' CHECK (open_yn IN ('Y','N')),
    user_id VARCHAR(50) NOT NULL REFERENCES userinfo(userId),
    company_id BIGINT REFERENCES company(company_id),

    base_recipe_id BIGINT REFERENCES recipe(recipe_id),
    target_country VARCHAR(50),

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

--recipe_ingredient(레시피 재료) 테이블
CREATE TABLE IF NOT EXISTS recipe_ingredient
(
    ingredient_id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    recipe_id             BIGINT       NOT NULL REFERENCES recipe(recipe_id),
    ingredient_name       VARCHAR(255) NOT NULL,
    is_imported           BOOLEAN,
    substitute_ingredient VARCHAR(255),
    cost                  NUMERIC(10, 2)
);

--recipe_nonconforming_case(수출 부적합) 테이블
CREATE TABLE IF NOT EXISTS recipe_nonconforming_case
(
    recipe_case_id     BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    recipe_id          BIGINT       NOT NULL REFERENCES recipe(recipe_id),
    country            VARCHAR(50)  NOT NULL,
    ingredient         VARCHAR(255) NOT NULL,
    case_id            VARCHAR(50),
    announcement_date  VARCHAR(50),
    violation_reason   TEXT,
    action             TEXT,
    matched_ingredient VARCHAR(255),
    created_at         TIMESTAMP    NOT NULL DEFAULT NOW()
);

--recipe_allergen 테이블: 알레르기 성분 검출 기능 관련 사용
CREATE TABLE IF NOT EXISTS recipe_allergen (
    recipe_allergen_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY, -- 알레르기 검출 결과 고유 ID
    recipe_id BIGINT NOT NULL REFERENCES recipe(recipe_id) ON DELETE CASCADE,
    -- 레시피 삭제 시 해당 레시피의 알레르기 결과도 자동 삭제
    ingredient_id BIGINT NOT NULL REFERENCES recipe_ingredient(ingredient_id) ON DELETE CASCADE,
    -- 재료 삭제 시 해당 재료의 알레르기 결과도 자동 삭제
    target_country VARCHAR(5) NOT NULL, -- 국가 코드 (US, JP 등)
    matched_allergen VARCHAR(100) NOT NULL, -- 검출된 알레르기 성분(문자열)
    analysis_ref VARCHAR(100), -- 분석에 사용한 방법 (예: HACCP+AI)
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, -- 생성 시각
    UNIQUE (recipe_id, ingredient_id, target_country, matched_allergen)
    -- 같은 레시피/재료/국가 조합에서 동일 알레르기 성분이 중복 저장되지 않도록 제약
);

-- market_report(보고서) 테이블
CREATE TABLE IF NOT EXISTS market_report (
    report_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    recipe_id BIGINT NOT NULL REFERENCES recipe (recipe_id) ON DELETE CASCADE,
    report_type VARCHAR(20) NOT NULL, -- SWOT / KPI 등
    content TEXT NOT NULL,
    summary TEXT,
    open_yn VARCHAR(1) NOT NULL DEFAULT 'Y' CHECK (open_yn IN ('Y','N')),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_market_report_recipe
    ON market_report (recipe_id);

CREATE INDEX IF NOT EXISTS idx_market_report_type
    ON market_report (report_type);

--influencer(인플루언서) 테이블
CREATE TABLE IF NOT EXISTS influencer (
    influencer_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    report_id BIGINT REFERENCES market_report(report_id) ON DELETE SET NULL,
    influencer_info TEXT,
    influencer_image TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

--virtual_consumer 가상 소비자(AI 페르소나 심사위원) 테이블
CREATE TABLE IF NOT EXISTS virtual_consumer (
    consumerId BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    report_id BIGINT NOT NULL REFERENCES market_report (report_id) ON DELETE CASCADE,
    personaName VARCHAR(100) NOT NULL,
    country VARCHAR(50) NOT NULL,
    ageGroup VARCHAR(20) NOT NULL,
    reason TEXT NOT NULL,
    lifestyle VARCHAR(200),
    foodPreference TEXT NOT NULL,
    purchaseCriteria JSONB,
    attitudeToKFood TEXT,
    evaluationPerspective TEXT
 );

-- 중복 방지 유니크 인덱스
CREATE UNIQUE INDEX IF NOT EXISTS ux_virtual_consumer_report_persona
ON virtual_consumer (report_id, personaName, country, ageGroup);

-- 조회 성능용 인덱스
CREATE INDEX IF NOT EXISTS ix_virtual_consumer_report
ON virtual_consumer (report_id);

-- consumer_feedback (AI 심사위원 피드백) 테이블
CREATE TABLE IF NOT EXISTS consumer_feedback (
    feedbackId BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    report_id BIGINT NOT NULL REFERENCES market_report (report_id) ON DELETE CASCADE,
    consumerId BIGINT NOT NULL,

    totalScore INT NOT NULL,
    tasteScore INT NOT NULL,
    priceScore INT NOT NULL,
    healthScore INT NOT NULL,
    positiveFeedback TEXT,
    negativeFeedback TEXT,
    purchaseIntent VARCHAR(10),
    createdAt TIMESTAMP NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_consumer_feedback_consumer
        FOREIGN KEY (consumerId) REFERENCES virtual_consumer (consumerid) ON DELETE CASCADE
);

-- report_id + consumerId 중복 방지
CREATE UNIQUE INDEX IF NOT EXISTS ux_consumer_feedback_report_consumer
ON consumer_feedback (report_id, consumerId);

-- 리포트별 조회 성능
CREATE INDEX IF NOT EXISTS ix_consumer_feedback_report
ON consumer_feedback (report_id);
