-- =============================================
-- BigProject PostgreSQL 초기화 스크립트
-- =============================================

-- 사용자 정보 테이블
CREATE TABLE userinfo (
  userSeq     INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  userId      VARCHAR(50)  NOT NULL UNIQUE,
  userPwHash  VARCHAR(255) NOT NULL,
  salt        VARCHAR(60)  NOT NULL,
  userName    VARCHAR(50)  NOT NULL,
  userState   CHAR(1)      NOT NULL DEFAULT '1',
  joinDate    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 인덱스 생성 (로그인 성능 최적화)
CREATE INDEX idx_userinfo_userid ON userinfo(userId);
CREATE INDEX idx_userinfo_state ON userinfo(userState);

-- 테스트용 더미 데이터 (선택사항 - 필요시 주석 해제)
-- INSERT INTO userinfo (userId, userPwHash, salt, userName)
-- VALUES ('testuser', 'hashed_password_here', 'salt_value_here', '테스트유저');

COMMENT ON TABLE userinfo IS '사용자 정보 테이블';
COMMENT ON COLUMN userinfo.userSeq IS '사용자 일련번호 (자동 증가)';
COMMENT ON COLUMN userinfo.userId IS '사용자 아이디 (고유)';
COMMENT ON COLUMN userinfo.userPwHash IS '비밀번호 해시값';
COMMENT ON COLUMN userinfo.salt IS '비밀번호 솔트';
COMMENT ON COLUMN userinfo.userName IS '사용자 이름';
COMMENT ON COLUMN userinfo.userState IS '사용자 상태 (1: 활성, 0: 비활성)';
COMMENT ON COLUMN userinfo.joinDate IS '가입일시';
