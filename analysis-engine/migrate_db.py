import os
import pandas as pd
import psycopg2
from psycopg2.extras import execute_values
import json
import numpy as np
import re
import ast

# DB Connection Details - Support both Spring format and legacy format
def parse_spring_datasource_url(url):
    """Parse jdbc:postgresql://host:port/database?params format"""
    if not url:
        return None, None, None
    
    # Remove jdbc: prefix if present
    if url.startswith("jdbc:"):
        url = url[5:]
        
    # Handle postgresql://host:port/database
    if url.startswith("postgresql://"):
        try:
            # Pattern: postgresql://host:port/database
            # Using simple string splitting to avoid complex regex issues
            without_protocol = url.replace("postgresql://", "")
            
            # Split host:port and path
            if "/" in without_protocol:
                authority, path = without_protocol.split("/", 1)
                db_name = path.split("?")[0] # Remove query params
            else:
                authority = without_protocol
                db_name = "postgres" # Default

            # Split host and port
            if ":" in authority:
                host, port = authority.split(":")
            else:
                host = authority
                port = "5432"
                
            return host, port, db_name
        except Exception as e:
            print(f"⚠️ Failed to parse Spring URL '{url}': {e}")
            return None, None, None
            
    return None, None, None

# Try Spring format first, fall back to legacy format
SPRING_URL = os.environ.get("SPRING_DATASOURCE_URL", "")
_parsed_host, _parsed_port, _parsed_db = parse_spring_datasource_url(SPRING_URL)

DB_HOST = _parsed_host or os.environ.get("DB_HOST", "db")
if DB_HOST.startswith("@"):
    print(f"⚠️ DB_HOST '{DB_HOST}' starts with '@'. Removing it to force TCP connection.", flush=True)
    DB_HOST = DB_HOST.lstrip("@")
DB_PORT = _parsed_port or os.environ.get("DB_PORT", "5432")
DB_NAME = _parsed_db or os.environ.get("POSTGRES_DB", "bigproject")
DB_USER = os.environ.get("SPRING_DATASOURCE_USERNAME") or os.environ.get("POSTGRES_USER", "postgres")
DB_PASS = os.environ.get("SPRING_DATASOURCE_PASSWORD") or os.environ.get("POSTGRES_PASSWORD", "postgres")

def get_db_connection():
    return psycopg2.connect(
        host=DB_HOST,
        dbname=DB_NAME,
        user=DB_USER,
        password=DB_PASS,
        port=DB_PORT,
        sslmode=os.environ.get("DB_SSLMODE", "require")
    )

# ==========================================
# [DIAGNOSTIC] Log Migration Configuration
# ==========================================
print("="*60)
print(f"🚀 [Migration Config] Starting Migration...")
print(f"   DB_HOST: {DB_HOST}")
print(f"   DB_PORT: {DB_PORT}")
print(f"   DB_NAME: {DB_NAME}")
print(f"   DB_USER: {DB_USER}")
# Mask Password
masked_pass = "*" * len(DB_PASS) if DB_PASS else "NONE"
print(f"   DB_PASS: {masked_pass}")
print("="*60)

def load_export_trends():
    csv_path = "cleaned_merged_export_trends.csv"
    if not os.path.exists(csv_path):
        print(f"Skipping {csv_path}: File not found")
        return

    conn = get_db_connection()
    cur = conn.cursor()
    
    # Ensure Table Exists
    cur.execute("""
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
        CREATE INDEX IF NOT EXISTS idx_export_trends_search ON export_trends (country_name, item_name);
        CREATE INDEX IF NOT EXISTS idx_export_trends_period ON export_trends (period_str);
    """)
    conn.commit()
    
    # Check existing data
    cur.execute("SELECT COUNT(*) FROM export_trends")
    count = cur.fetchone()[0]
    if count > 0:
        print(f"export_trends already has {count} rows. Skipping.")
        cur.close()
        conn.close()
        return

    print("Loading export_trends...")
    df = pd.read_csv(csv_path)
    
    # Define columns that go into standard fields
    std_cols = ['period', 'item_name', 'country_code', 'country_name', 'export_value', 
                'export_weight', 'unit_price', 'exchange_rate', 'gdp_level']
    
    # Fix 'period' and create 'period_str'
    # Based on main.py logic:
    # We want strict period string. The main.py fills NaNs.
    # We will replicate basic period cleaning logic here or just save what is in CSV.
    # main.py does complex period cleaning. We should try to use the raw value if possible.
    # But schema has 'period' (varchar) and 'period_str' (varchar).
    # Let's save the raw 'period' column to database 'period'.
    # And create 'period_str' as a clean version.
    
    def clean_period(val):
        if pd.isna(val) or val == '': return ''
        s = str(val).strip()
        parts = s.split('.')
        year = parts[0]
        if len(parts) > 1:
            month_part = parts[1]
            if len(month_part) == 2: month = month_part
            elif len(month_part) == 1: month = str(int(month_part) + 9).zfill(2)  # 1->10, 2->11, 3->12
            else: month = str(month_part)[:2].zfill(2)
        else:
            month = '01'
        return f"{year}-{month}"

    df['period_str'] = df['period'].apply(clean_period)
    
    # Identify trend columns (columns not in std_cols and not technical ones)
    technical_cols = ['hs_code', 'date', 'month', 'year', 'month_sin', 'month_cos', 
                      'export_value_ma3', 'export_value_ema3', 'exchange_rate_ma3', 'exchange_rate_ema3', 
                      'cpi_monthly_idx_ma3', 'cpi_monthly_idx_ema3', 'gdp_growth_ma3', 'gdp_growth_ema3', 
                      'gdp_level_ma3', 'gdp_level_ema3', 'year_month']
    
    # Collect all other columns into JSON
    db_cols = ['country_name', 'country_code', 'item_name', 'period', 'period_str', 
               'export_value', 'export_weight', 'unit_price', 'exchange_rate', 'gdp_level', 'trend_data']
    
    data_to_insert = []
    
    # Optimizing: Calculate JSON trend data
    # Filter columns to pack
    all_cols = df.columns.tolist()
    pack_cols = [c for c in all_cols if c not in std_cols and c not in technical_cols and c != 'period_str']
    
    # It is faster to convert to dict records
    # But we have 200k rows? User said "20만+ 행" for amazon reviews. Export trends is smaller (9.7MB).
    # 9.7MB is fine for memory.
    
    # Prepare list of tuples
    for _, row in df.iterrows():
        trend_dict = {k: row[k] for k in pack_cols if k in row and pd.notna(row[k])}
        
        data_to_insert.append((
            row.get('country_name'),
            row.get('country_code'),
            row.get('item_name'),
            str(row.get('period')),
            row.get('period_str'),
            row.get('export_value'),
            row.get('export_weight'),
            row.get('unit_price'),
            row.get('exchange_rate'),
            row.get('gdp_level'),
            json.dumps(trend_dict)
        ))
        
    insert_query = """
    INSERT INTO export_trends 
    (country_name, country_code, item_name, period, period_str, export_value, export_weight, unit_price, exchange_rate, gdp_level, trend_data)
    VALUES %s
    """
    
    execute_values(cur, insert_query, data_to_insert, page_size=1000)
    conn.commit()
    print("Loaded export_trends.")
    cur.close()
    conn.close()

def load_amazon_reviews():
    csv_path = "amz_insight_data.csv"
    if not os.path.exists(csv_path):
        print(f"Skipping {csv_path}: File not found")
        return

    conn = get_db_connection()
    cur = conn.cursor()
    
    # Ensure Table Exists
    cur.execute("""
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
            recommendation_intent_hybrid BOOLEAN,
            price_sensitive NUMERIC,
            semantic_top_dimension TEXT
        );
        CREATE INDEX IF NOT EXISTS idx_amazon_reviews_asin ON amazon_reviews (asin);
        CREATE INDEX IF NOT EXISTS idx_amazon_reviews_sentiment ON amazon_reviews (sentiment_score);
        CREATE INDEX IF NOT EXISTS idx_amazon_reviews_rating ON amazon_reviews (rating);
    """)
    conn.commit()
    
    # [Retest after deleting existing data] Logic
    FORCE_MIGRATE = os.environ.get("FORCE_MIGRATE", "false").lower() == "true"
    if FORCE_MIGRATE:
        print("FORCE_MIGRATE is true. Truncating amazon_reviews...")
        cur.execute("TRUNCATE TABLE amazon_reviews")
        conn.commit()
    else:
        cur.execute("SELECT COUNT(*) FROM amazon_reviews")
        count = cur.fetchone()[0]
        if count > 0:
            print(f"amazon_reviews already has {count} rows. Skipping. (Set FORCE_MIGRATE=true to reload)")
            cur.close()
            conn.close()
            return

    # Boolean 변환을 안전하게 처리하기 위한 헬퍼 함수
    def clean_bool(val):
        if pd.isna(val):
            return False # 혹은 None
        if isinstance(val, bool):
            return val
        if isinstance(val, str):
            return val.lower() in ('true', '1', 't', 'y', 'yes')
        return bool(val)

    # JSON 클리닝 함수 (ast.literal_eval 안전성 강화)
    def clean_json_field(val):
        if pd.isna(val) or val == '' or val == '[]': 
            return json.dumps([])
        if isinstance(val, str):
            try:
                # 싱글 쿼트가 포함된 리스트 형태의 문자열 처리
                return json.dumps(ast.literal_eval(val))
            except (ValueError, SyntaxError):
                return json.dumps([])
        return json.dumps(val)

    print("Loading amazon_reviews...")
    chunk_size = 5000
    
    for chunk in pd.read_csv(csv_path, chunksize=chunk_size):
        data_to_insert = []
        for _, row in chunk.iterrows():
            # 1. 긍정/부정 판단에 중요한 데이터 정제
            repurchase = clean_bool(row.get('repurchase_intent_hybrid'))
            recommend = clean_bool(row.get('recommendation_intent_hybrid'))
            
            # [Safe Conversion] 평점과 감성 점수를 수치형으로 변환 (오류 시 NaN)
            rating = pd.to_numeric(row.get('rating'), errors='coerce')
            sentiment = pd.to_numeric(row.get('sentiment_score'), errors='coerce')

            # 2. 제목이 없을 경우 본문의 일부를 제목으로 사용 (검색 최적화)
            title = row.get('title')
            if pd.isna(title) or str(title).strip() == "":
                original_text = str(row.get('original_text', ""))
                title = original_text[:100] + "..." if len(original_text) > 100 else original_text

            data_to_insert.append((
                row.get('asin'),
                title,
                rating, # Safe numeric or NaN (DB will store as NULL)
                row.get('original_text'),
                row.get('cleaned_text'),
                sentiment, # Safe numeric or NaN
                clean_json_field(row.get('quality_issues_semantic')),
                clean_json_field(row.get('packaging_keywords')),
                clean_json_field(row.get('texture_terms')),
                clean_json_field(row.get('ingredients')),
                clean_json_field(row.get('health_keywords')),
                clean_json_field(row.get('dietary_keywords')),
                clean_json_field(row.get('delivery_issues_semantic')),
                repurchase,
                recommend,
                pd.to_numeric(row.get('price_sensitive'), errors='coerce'),
                row.get('semantic_top_dimension')
            ))
            
        # [Diagnostic Log] 현재 청크의 데이터 분포 확인
        ratings_in_chunk = [x[2] for x in data_to_insert if pd.notna(x[2])]
        if ratings_in_chunk:
            avg_r = sum(ratings_in_chunk) / len(ratings_in_chunk)
            print(f"Chunk stats ({len(data_to_insert)} rows): Avg Rating={avg_r:.2f}, Valid Ratings={len(ratings_in_chunk)}")
        else:
            print(f"Chunk stats ({len(data_to_insert)} rows): NO VALID RATINGS FOUND")
            
        insert_query = """
        INSERT INTO amazon_reviews 
        (asin, title, rating, original_text, cleaned_text, sentiment_score, 
         quality_issues_semantic, packaging_keywords, texture_terms, ingredients, 
         health_keywords, dietary_keywords, delivery_issues_semantic, 
         repurchase_intent_hybrid, recommendation_intent_hybrid,
         price_sensitive, semantic_top_dimension)
        VALUES %s
        """
        execute_values(cur, insert_query, data_to_insert)
        conn.commit()
        print(f"Inserted chunk of {len(data_to_insert)}")
        
    print("Loaded amazon_reviews.")
    cur.close()
    conn.close()

if __name__ == "__main__":
    try:
        load_export_trends()
        load_amazon_reviews()
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        print(f"   Connection Details: host={DB_HOST}, port={DB_PORT}, db={DB_NAME}, user={DB_USER}")
