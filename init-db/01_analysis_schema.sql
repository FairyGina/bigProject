-- 수출 트렌드 테이블
CREATE TABLE IF NOT EXISTS export_trends (
    id SERIAL PRIMARY KEY,
    country_name VARCHAR(100),
    country_code VARCHAR(10),
    item_name VARCHAR(100),
    period VARCHAR(20),
    period_str VARCHAR(20),
    export_value NUMERIC,
    export_weight NUMERIC,
    unit_price NUMERIC,
    exchange_rate NUMERIC,
    gdp_level NUMERIC,
    trend_data JSONB
);

CREATE INDEX IF NOT EXISTS idx_export_trends_search 
    ON export_trends (country_name, item_name);

CREATE INDEX IF NOT EXISTS idx_export_trends_period 
    ON export_trends (period_str);


-- 아마존 리뷰 테이블
CREATE TABLE IF NOT EXISTS amazon_reviews (
    id SERIAL PRIMARY KEY,
    asin VARCHAR(20),
    title TEXT,
    rating NUMERIC,
    original_text TEXT,
    cleaned_text TEXT,
    sentiment_score NUMERIC,
    quality_issues_semantic JSONB,
    packaging_keywords JSONB,
    texture_terms JSONB,
    ingredients JSONB,
    health_keywords JSONB,
    dietary_keywords JSONB,
    delivery_issues_semantic JSONB,
    repurchase_intent_hybrid BOOLEAN,
    recommendation_intent_hybrid BOOLEAN
);

CREATE INDEX IF NOT EXISTS idx_amazon_reviews_asin 
    ON amazon_reviews (asin);
