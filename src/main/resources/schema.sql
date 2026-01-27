CREATE TABLE IF NOT EXISTS notice (
    id BIGSERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    author_id VARCHAR(50) NOT NULL,
    author_name VARCHAR(50) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

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

CREATE TABLE IF NOT EXISTS recipe
(
    recipe_id      BIGSERIAL PRIMARY KEY,
    company_id     BIGINT,
    recipe_name    VARCHAR(255) NOT NULL,
    base_recipe_id BIGINT,
    target_country VARCHAR(50),
    created_at     TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMP
);

CREATE TABLE IF NOT EXISTS recipe_ingredient
(
    ingredient_id         BIGSERIAL PRIMARY KEY,
    recipe_id             BIGINT       NOT NULL,
    ingredient_name       VARCHAR(255) NOT NULL,
    is_imported           BOOLEAN,
    substitute_ingredient VARCHAR(255),
    cost                  NUMERIC(10, 2)
);

CREATE TABLE IF NOT EXISTS recipe_nonconforming_case
(
    id                 BIGSERIAL PRIMARY KEY,
    recipe_id          BIGINT       NOT NULL,
    country            VARCHAR(50)  NOT NULL,
    ingredient         VARCHAR(255) NOT NULL,
    case_id            VARCHAR(50),
    announcement_date  VARCHAR(50),
    violation_reason   TEXT,
    action             TEXT,
    matched_ingredient VARCHAR(255),
    created_at         TIMESTAMP    NOT NULL DEFAULT NOW()
);