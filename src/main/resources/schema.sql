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

CREATE TABLE IF NOT EXISTS recipe (
    id BIGSERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    ingredients_json TEXT,
    steps_json TEXT,
    report_json TEXT,
    summary TEXT,
    image_base64 TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'PUBLISHED',
    author_id VARCHAR(50) NOT NULL,
    author_name VARCHAR(50),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_recipe_created_at ON recipe(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_recipe_author_id ON recipe(author_id);
