import os
import pandas as pd
import psycopg2
from psycopg2.extras import execute_values
import json
import numpy as np
import ast
import time
import urllib.parse

# ==========================================
# [Configuration] DB Connection
# ==========================================
def parse_db_url(url):
    if not url: return {}
    info = {}
    try:
        if url.startswith("jdbc:"): url = url[5:]
        parsed = urllib.parse.urlparse(url)
        if parsed.scheme in ('postgresql', 'postgres'):
            info['host'] = parsed.hostname
            info['port'] = parsed.port
            info['dbname'] = parsed.path.lstrip('/')
            info['user'] = parsed.username
            info['password'] = parsed.password
    except Exception as e:
        print(f"⚠️ URL parsing failed: {e}")
    return info

SPRING_URL = os.environ.get("SPRING_DATASOURCE_URL", "")
parsed_info = parse_db_url(SPRING_URL)

DB_HOST = os.environ.get("DB_HOST") or parsed_info.get('host') or "db"
if DB_HOST.startswith("@"): DB_HOST = DB_HOST.lstrip("@")
DB_PORT = os.environ.get("DB_PORT") or parsed_info.get('port') or "5432"
DB_NAME = os.environ.get("POSTGRES_DB") or parsed_info.get('dbname') or "bigproject"
DB_USER = os.environ.get("SPRING_DATASOURCE_USERNAME") or os.environ.get("POSTGRES_USER") or parsed_info.get('user') or "postgres"
DB_PASS = os.environ.get("SPRING_DATASOURCE_PASSWORD") or os.environ.get("POSTGRES_PASSWORD") or parsed_info.get('password') or "postgres"

def get_db_connection(max_retries=5, delay=5):
    for attempt in range(max_retries):
        try:
            conn = psycopg2.connect(
                host=DB_HOST, dbname=DB_NAME, user=DB_USER, password=DB_PASS, port=DB_PORT,
                sslmode=os.environ.get("DB_SSLMODE", "require")
            )
            return conn
        except Exception as e:
            print(f"⚠️ Connection failed ({attempt+1}/{max_retries}): {e}")
            time.sleep(delay)
    return None

# ==========================================
# [Helpers] Data Cleaning (강화됨)
# ==========================================
def clean_bool(val):
    if pd.isna(val): return None
    if isinstance(val, bool): return val
    if isinstance(val, str): return val.lower() in ('true', '1', 't', 'y', 'yes')
    return bool(val)

def to_float(val):
    """숫자형 변환 강화: 불리언(True/False)도 숫자로 변환"""
    if pd.isna(val): return None
    if isinstance(val, bool): return 1.0 if val else 0.0
    try:
        return float(val)
    except:
        return None

def clean_json_field(val):
    if pd.isna(val) or val == '' or val == '[]': return json.dumps([])
    if isinstance(val, str):
        val = val.strip()
        if not val: return json.dumps([])
        try: return json.dumps(json.loads(val))
        except:
            try: return json.dumps(ast.literal_eval(val))
            except: return json.dumps([])
    try: return json.dumps(val)
    except: return json.dumps([])

# ==========================================
# [Task] Load Amazon Reviews
# ==========================================
def load_amazon_reviews():
    csv_path = "amz_insight_data.csv"
    if not os.path.exists(csv_path): return

    print(f"📂 Processing {csv_path}...")
    conn = get_db_connection()
    if not conn: return

    try:
        cur = conn.cursor()
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
        """)
        conn.commit()

        # 데이터 초기화 (에러 수정 후 재적재를 위해 필수)
        FORCE_MIGRATE = os.environ.get("FORCE_MIGRATE", "false").lower() == "true"
        if FORCE_MIGRATE:
            print("Force Migrating: Truncating table...")
            cur.execute("TRUNCATE TABLE amazon_reviews")
            conn.commit()
        else:
            cur.execute("SELECT COUNT(*) FROM amazon_reviews")
            if cur.fetchone()[0] > 0:
                print("✅ Already has data. Skip.")
                return

        print("🚀 Loading data with strict type casting...")
        chunk_size = 1000
        total_inserted = 0
        
        insert_query = """
        INSERT INTO amazon_reviews 
        (asin, title, rating, original_text, cleaned_text, sentiment_score, 
         quality_issues_semantic, packaging_keywords, texture_terms, ingredients, 
         health_keywords, dietary_keywords, delivery_issues_semantic, 
         repurchase_intent_hybrid, recommendation_intent_hybrid,
         price_sensitive, semantic_top_dimension)
        VALUES %s
        """
        
        # [핵심] SQL 템플릿에 명시적 타입 캐스팅 추가 (::numeric, ::jsonb)
        tpl = "(%s, %s, %s::numeric, %s, %s, %s::numeric, %s::jsonb, %s::jsonb, %s::jsonb, %s::jsonb, %s::jsonb, %s::jsonb, %s::jsonb, %s, %s, %s::numeric, %s)"

        for i, chunk in enumerate(pd.read_csv(csv_path, chunksize=chunk_size)):
            data_to_insert = []
            for _, row in chunk.iterrows():
                try:
                    data_to_insert.append((
                        row.get('asin'),
                        str(row.get('title'))[:500] if pd.notna(row.get('title')) else "",
                        to_float(row.get('rating')),
                        row.get('original_text'),
                        row.get('cleaned_text'),
                        to_float(row.get('sentiment_score')),
                        clean_json_field(row.get('quality_issues_semantic')),
                        clean_json_field(row.get('packaging_keywords')),
                        clean_json_field(row.get('texture_terms')),
                        clean_json_field(row.get('ingredients')),
                        clean_json_field(row.get('health_keywords')),
                        clean_json_field(row.get('dietary_keywords')),
                        clean_json_field(row.get('delivery_issues_semantic')),
                        clean_bool(row.get('repurchase_intent_hybrid')),
                        clean_bool(row.get('recommendation_intent_hybrid')),
                        to_float(row.get('price_sensitive')),  # 여기서 불리언을 숫자로 변환
                        str(row.get('semantic_top_dimension')) if pd.notna(row.get('semantic_top_dimension')) else None
                    ))
                except: continue

            if data_to_insert:
                execute_values(cur, insert_query, data_to_insert, template=tpl)
                conn.commit()
                total_inserted += len(data_to_insert)
                print(f"   Chunk {i+1} success. Total: {total_inserted}")

        print(f"✅ Finished. Total: {total_inserted}")
    finally:
        if conn: conn.close()

if __name__ == "__main__":
    load_amazon_reviews()
