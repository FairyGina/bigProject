CREATE TABLE IF NOT EXISTS notice (
    id BIGSERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    author_id VARCHAR(50) NOT NULL,
    author_name VARCHAR(50) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS userinfo (
    userSeq INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    userId VARCHAR(50) NOT NULL,
    userPw VARCHAR(200) NOT NULL,
    userPwHash VARCHAR(255) NOT NULL,
    salt VARCHAR(60) NOT NULL,
    userName VARCHAR(50) NOT NULL,
    userState CHAR(1) NOT NULL DEFAULT '1',
    joinDate TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    loginfailcount INTEGER NOT NULL DEFAULT 0,
    provider VARCHAR(20),
    providerid VARCHAR(100),
    birthdate DATE,
    password_changed_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_userinfo_userid ON userinfo (userId);

COMMENT ON TABLE userinfo IS '유저 정보 테이블';
COMMENT ON COLUMN userinfo.userSeq IS '유저 Seq';
COMMENT ON COLUMN userinfo.userId IS '유저 Id';
COMMENT ON COLUMN userinfo.userPw IS '유저 Pw';
COMMENT ON COLUMN userinfo.userPwHash IS '유저 암호화 Pw';
COMMENT ON COLUMN userinfo.salt IS '무작위 난수';
COMMENT ON COLUMN userinfo.userName IS '유저 Name';
COMMENT ON COLUMN userinfo.userState IS '유저 상태 0 정지 1 활동';
COMMENT ON COLUMN userinfo.joinDate IS '가입일자';

CREATE TABLE IF NOT EXISTS notice_comment (
    id BIGSERIAL PRIMARY KEY,
    notice_id BIGINT NOT NULL REFERENCES notice(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    author_id VARCHAR(50) NOT NULL,
    author_name VARCHAR(50) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notice_created_at ON notice(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notice_comment_notice_id ON notice_comment(notice_id);

CREATE TABLE IF NOT EXISTS recipe (
    id BIGSERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    ingredients_json TEXT,
    steps_json TEXT,
    report_json TEXT,
    summary TEXT,
    image_base64 TEXT,
    influencer_json TEXT,
    influencer_image_base64 TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'PUBLISHED',
    author_id VARCHAR(50) NOT NULL,
    author_name VARCHAR(50),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_recipe_created_at ON recipe(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_recipe_author_id ON recipe(author_id);

-- Migration: add influencer storage columns for existing databases
ALTER TABLE recipe
    ADD COLUMN IF NOT EXISTS influencer_json TEXT,
    ADD COLUMN IF NOT EXISTS influencer_image_base64 TEXT;
