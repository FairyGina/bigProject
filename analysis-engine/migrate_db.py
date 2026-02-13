import os
import pandas as pd
import psycopg2
from psycopg2.extras import execute_values
import json
import numpy as np
import ast
import time
import urllib.parse
import math

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
# Prefer Env Var for DB Name as Azure might pass a different one than URL in some cases
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
            print(f"✅ DB Connection successful (Attempt {attempt+1})")
            return conn
        except psycopg2.OperationalError as e:
            print(f"⚠️ Connection failed (Attempt {attempt+1}/{max_retries}): {e}")
            time.sleep(delay)
    return None

# ==========================================
# [Helpers] Data Cleaning
# ==========================================
def clean_bool(val):
    if pd.isna(val): return None
    if isinstance(val, bool): return val
    if isinstance(val, str): return val.lower() in ('true', '1', 't', 'y', 'yes')
    return bool(val)

def clean_json_field(val):
    """Safely convert value to JSON string for JSONB column."""
    if pd.isna(val) or val == '' or val == '[]': return json.dumps([])
    if isinstance(val, str):
        val = val.strip()
        if not val: return json.dumps([])
        try:
            # Check if it is already valid JSON
            json.loads(val)
            return val
        except:
            try:
                # Handle python string representation of list/dict
                return json.dumps(ast.literal_eval(val))
            except:
                return json.dumps([])
    try:
        return json.dumps(val)
    except:
        return json.dumps([])

def clean_period(val):
    if pd.isna(val): return ''
    parts = str(val).split('.')
    if len(parts) > 1: return f"{parts[0]}-{parts[1].zfill(2)}"
    return f"{parts[0]}-01"

# ==========================================
# [Task] Load Export Trends
# ==========================================
def load_export_trends():
    csv_path = "cleaned_merged_export_trends.csv"
    if not os.path.exists(csv_path):
        print(f"ℹ️ {csv_path} not found. Skipping Export Trends.")
        return

    print(f"📂 Processing {csv_path}...")
    conn = get_db_connection()
    if not conn: return
    
    try:
        cur = conn.cursor()
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
        """)
        conn.commit()
        
        cur.execute("SELECT COUNT(*) FROM export_trends")
        if cur.fetchone()[0] > 0:
            print("✅ export_trends already has data. Skipping.")
            return

        print("🚀 Loading export_trends data...")
        df = pd.read_csv(csv_path)
        df['period_str'] = df['period'].apply(clean_period)
        
        technical_cols = ['hs_code', 'date', 'month', 'year', 'month_sin', 'month_cos']
        pack_cols = [c for c in df.columns if c not in technical_cols and c not in ['period_str']]
        
        data_to_insert = []
        for _, row in df.iterrows():
            trend_dict = {k: row[k] for k in pack_cols if k in row and pd.notna(row[k])}
            
            # Helper for explicit float conversion for numeric fields
            def to_float(x):
                try: 
                    return float(x) if pd.notna(x) else None
                except: return None

            data_to_insert.append((
                row.get('country_name'), row.get('country_code'), row.get('item_name'),
                str(row.get('period')), row.get('period_str'),
                to_float(row.get('export_value')), to_float(row.get('export_weight')), 
                to_float(row.get('unit_price')), to_float(row.get('exchange_rate')), 
                to_float(row.get('gdp_level')),
                json.dumps(trend_dict)
            ))
            
        insert_query = """
        INSERT INTO export_trends 
        (country_name, country_code, item_name, period, period_str, export_value, export_weight, unit_price, exchange_rate, gdp_level, trend_data)
        VALUES %s
        """
        # JSONB explicit cast
        execute_values(cur, insert_query, data_to_insert, template="(%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s::jsonb)", page_size=1000)
        conn.commit()
        print(f"✅ Successfully loaded {len(data_to_insert)} rows.")
        
    except Exception as e:
        print(f"❌ Failed to load export_trends: {e}")
    finally:
        if conn: conn.close()

# ==========================================
# [Task] Load Amazon Reviews
# ==========================================
def load_amazon_reviews():
    csv_path = "amz_insight_data.csv"
    if not os.path.exists(csv_path):
        print(f"ℹ️ {csv_path} not found. Skipping Amazon Reviews.")
        return

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
            CREATE INDEX IF NOT EXISTS idx_amazon_reviews_asin ON amazon_reviews (asin);
            -- GIN Index for faster text search
            CREATE INDEX IF NOT EXISTS idx_amazon_reviews_text_gin ON amazon_reviews USING gin(to_tsvector('english', coalesce(title, '') || ' ' || coalesce(cleaned_text, '')));
        """)
        conn.commit()

        # Update schema if needed
        try:
            cur.execute("ALTER TABLE amazon_reviews ADD COLUMN IF NOT EXISTS price_sensitive NUMERIC;")
            cur.execute("ALTER TABLE amazon_reviews ADD COLUMN IF NOT EXISTS semantic_top_dimension TEXT;")
            conn.commit()
        except Exception as e:
            print(f"⚠️ Schema update warning: {e}")
            conn.rollback()

        FORCE_MIGRATE = os.environ.get("FORCE_MIGRATE", "false").lower() == "true"
        cur.execute("SELECT COUNT(*) FROM amazon_reviews")
        count = cur.fetchone()[0]
        if count > 0 and not FORCE_MIGRATE:
             print("✅ amazon_reviews already has data. Skipping.")
             return
        
        if FORCE_MIGRATE:
            print("Force Migrating: Truncating amazon_reviews...")
            cur.execute("TRUNCATE TABLE amazon_reviews")
            conn.commit()

        print("🚀 Loading amazon_reviews data (Chunked)...")
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
        
        # Explicit Casting Template for JSONB
        # Columns 7, 8, 9, 10, 11, 12, 13 are JSONB (Indices 6 to 12 in 0-based tuple)
        # Template matches the count of columns (17 cols)
        # Python Indices:
        # 0: asin, 1: title, 2: rating, 3: orig, 4: clean, 5: sent
        # 6: quality (jsonb), 7: pack (jsonb), 8: text (jsonb), 9: ingr (jsonb), 10: health (jsonb), 11: diet (jsonb), 12: deliv (jsonb)
        # 13: repur, 14: recom, 15: price, 16: semantic
        
        tpl = "(%s, %s, %s, %s, %s, %s, %s::jsonb, %s::jsonb, %s::jsonb, %s::jsonb, %s::jsonb, %s::jsonb, %s::jsonb, %s, %s, %s, %s)"

        for i, chunk in enumerate(pd.read_csv(csv_path, chunksize=chunk_size)):
            data_to_insert = []
            for _, row in chunk.iterrows():
                try:
                    rating = pd.to_numeric(row.get('rating'), errors='coerce')
                    sentiment = pd.to_numeric(row.get('sentiment_score'), errors='coerce')
                    price_sens = pd.to_numeric(row.get('price_sensitive'), errors='coerce')
                    
                    # Title fallback
                    title = row.get('title')
                    if pd.isna(title) or str(title).strip() == "":
                        orig = str(row.get('original_text', ""))
                        title = orig[:100] + "..." if len(orig) > 100 else orig

                    data_to_insert.append((
                        row.get('asin'),
                        title,
                        rating if pd.notna(rating) else None,
                        row.get('original_text'),
                        row.get('cleaned_text'),
                        sentiment if pd.notna(sentiment) else None,
                        clean_json_field(row.get('quality_issues_semantic')),
                        clean_json_field(row.get('packaging_keywords')),
                        clean_json_field(row.get('texture_terms')),
                        clean_json_field(row.get('ingredients')),
                        clean_json_field(row.get('health_keywords')),
                        clean_json_field(row.get('dietary_keywords')),
                        clean_json_field(row.get('delivery_issues_semantic')),
                        clean_bool(row.get('repurchase_intent_hybrid')),
                        clean_bool(row.get('recommendation_intent_hybrid')),
                        price_sens if pd.notna(price_sens) else None,
                        row.get('semantic_top_dimension')
                    ))
                except Exception as row_e: 
                    # Consider logging row error if needed, but for bulk speed we might skip or minimal log
                    continue

            if not data_to_insert: continue

            try:
                execute_values(cur, insert_query, data_to_insert, template=tpl)
                conn.commit()
                total_inserted += len(data_to_insert)
                print(f"   Processed Chunk {i+1}: +{len(data_to_insert)} rows (Total: {total_inserted})")
            except Exception as e:
                print(f"❌ Chunk {i+1} failed: {e}")
                conn.rollback()

        print(f"✅ Finished. Total: {total_inserted}")

    except Exception as e:
        print(f"❌ Failed to load amazon_reviews: {e}")
    finally:
        if conn: conn.close()

if __name__ == "__main__":
    print("="*60)
    print("🚀 Starting Data Migration Script v3.0 (Optimized)")
    print("="*60)
    load_export_trends()
    load_amazon_reviews()
