import os
import pandas as pd
import psycopg2
from psycopg2.extras import execute_values
import json
import numpy as np
import re
import ast
import time
import urllib.parse

# ==========================================
# [Configuration] DB Connection
# ==========================================
def parse_db_url(url):
    """Safely parse Spring Datasource URL or Standard Postgres URL"""
    if not url:
        return {}
    
    info = {}
    try:
        # Handle jdbc:postgresql:// prefix
        if url.startswith("jdbc:"):
            url = url[5:]
        
        # Use urllib for safe parsing
        parsed = urllib.parse.urlparse(url)
        
        # Only process if scheme is valid
        if parsed.scheme in ('postgresql', 'postgres'):
            info['host'] = parsed.hostname
            info['port'] = parsed.port
            info['dbname'] = parsed.path.lstrip('/')
            info['user'] = parsed.username
            info['password'] = parsed.password
            
            # Query params for SSL etc
            # qs = urllib.parse.parse_qs(parsed.query)
            
    except Exception as e:
        print(f"⚠️ URL parsing failed: {e}")
        
    return info

SPRING_URL = os.environ.get("SPRING_DATASOURCE_URL", "")
parsed_info = parse_db_url(SPRING_URL)

# Priority: Env Var > Parsed URL > Default
DB_HOST = os.environ.get("DB_HOST") or parsed_info.get('host') or "db"
# Clean up host if needed (remove @ prefix if present)
if DB_HOST.startswith("@"): DB_HOST = DB_HOST.lstrip("@")

DB_PORT = os.environ.get("DB_PORT") or parsed_info.get('port') or "5432"
# Priority for DB Name: Env Var (override) > Parsed URL > Default
DB_NAME = os.environ.get("POSTGRES_DB") or parsed_info.get('dbname') or "bigproject"

DB_USER = os.environ.get("SPRING_DATASOURCE_USERNAME") or os.environ.get("POSTGRES_USER") or parsed_info.get('user') or "postgres"
DB_PASS = os.environ.get("SPRING_DATASOURCE_PASSWORD") or os.environ.get("POSTGRES_PASSWORD") or parsed_info.get('password') or "postgres"

def get_db_connection(max_retries=5, delay=5):
    """Get DB connection with retry logic"""
    for attempt in range(max_retries):
        try:
            conn = psycopg2.connect(
                host=DB_HOST,
                dbname=DB_NAME,
                user=DB_USER,
                password=DB_PASS,
                port=DB_PORT,
                sslmode=os.environ.get("DB_SSLMODE", "require")
            )
            print(f"✅ DB Connection successful (Attempt {attempt+1})")
            return conn
        except psycopg2.OperationalError as e:
            print(f"⚠️ Connection failed (Attempt {attempt+1}/{max_retries}): {e}")
            if attempt < max_retries - 1:
                print(f"   Retrying in {delay} seconds...")
                time.sleep(delay)
            else:
                raise e
        except Exception as e:
            print(f"❌ Unexpected connection error: {e}")
            raise e

# ==========================================
# [Helpers] Data Cleaning
# ==========================================
def clean_bool(val):
    if pd.isna(val): return None # Use None for SQL NULL
    if isinstance(val, bool): return val
    if isinstance(val, str): return val.lower() in ('true', '1', 't', 'y', 'yes')
    return bool(val)

def clean_json_field(val):
    """Safely convert value to JSON string. Handles various input formats."""
    if pd.isna(val) or val == '' or val == '[]': 
        return json.dumps([])
    
    if isinstance(val, str):
        # Determine if it's already a JSON string or a Python literal string
        val = val.strip()
        if not val: return json.dumps([])
        
        try:
            # 1. Try standard JSON load first (standard format)
            parsed = json.loads(val)
            return json.dumps(parsed)
        except json.JSONDecodeError:
            try:
                # 2. Try ast.literal_eval (Python literal format with single quotes, True/False)
                parsed = ast.literal_eval(val)
                return json.dumps(parsed)
            except (ValueError, SyntaxError) as e:
                # Log bad data but don't crash
                # print(f"⚠️ JSON Parse Error for value: {val[:50]}... -> {e}")
                return json.dumps([]) # Fallback to empty list/object
            
    # Already a list or dict
    try:
        return json.dumps(val)
    except TypeError:
        return json.dumps([])

# ==========================================
# [Task] Load Export Trends
# ==========================================
def load_export_trends():
    csv_path = "cleaned_merged_export_trends.csv"
    if not os.path.exists(csv_path):
        print(f"ℹ️ {csv_path} not found. Skipping Export Trends.")
        return

    print(f"📂 Processing {csv_path}...")
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        # Schema definition
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
            print(f"✅ export_trends already has {count} rows. Skipping.")
            cur.close()
            conn.close()
            return

        print("🚀 Loading export_trends data...")
        df = pd.read_csv(csv_path)
        
        # Define processing logic
        std_cols = ['period', 'item_name', 'country_code', 'country_name', 'export_value', 
                    'export_weight', 'unit_price', 'exchange_rate', 'gdp_level']
        technical_cols = ['hs_code', 'date', 'month', 'year', 'month_sin', 'month_cos', 
                          'export_value_ma3', 'export_value_ema3', 'exchange_rate_ma3', 
                          'exchange_rate_ema3', 'cpi_monthly_idx_ma3', 'cpi_monthly_idx_ema3', 
                          'gdp_growth_ma3', 'gdp_growth_ema3', 'gdp_level_ma3', 'gdp_level_ema3', 'year_month']
        
        all_cols = df.columns.tolist()
        pack_cols = [c for c in all_cols if c not in std_cols and c not in technical_cols and c != 'period_str']

        # Period cleaner
        def clean_period(val):
            if pd.isna(val) or val == '': return ''
            s = str(val).strip()
            parts = s.split('.')
            year = parts[0]
            if len(parts) > 1:
                month = parts[1].zfill(2)
                if len(month) == 1: month = f"0{month}" # simple fix
            else:
                month = '01'
            return f"{year}-{month}"

        df['period_str'] = df['period'].apply(clean_period)
        
        data_to_insert = []
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
        print(f"✅ Successfully loaded {len(data_to_insert)} rows into export_trends.")
        
    except Exception as e:
        print(f"❌ Failed to load export_trends: {e}")
    finally:
        if 'conn' in locals() and conn: conn.close()

# ==========================================
# [Task] Load Amazon Reviews
# ==========================================
def load_amazon_reviews():
    csv_path = "amz_insight_data.csv"
    if not os.path.exists(csv_path):
        print(f"ℹ️ {csv_path} not found. Skipping Amazon Reviews.")
        return

    print(f"📂 Processing {csv_path}...")
    conn = None
    try:
        conn = get_db_connection()
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
            CREATE INDEX IF NOT EXISTS idx_amazon_reviews_sentiment ON amazon_reviews (sentiment_score);
            CREATE INDEX IF NOT EXISTS idx_amazon_reviews_rating ON amazon_reviews (rating);
        """)
        conn.commit()
        
        # Check Force Migrate
        FORCE_MIGRATE = os.environ.get("FORCE_MIGRATE", "false").lower() == "true"
        cur.execute("SELECT COUNT(*) FROM amazon_reviews")
        count = cur.fetchone()[0]
        
        if count > 0 and not FORCE_MIGRATE:
             print(f"✅ amazon_reviews already has {count} rows. Skipping. (Set FORCE_MIGRATE=true to reload)")
             return
        
        if FORCE_MIGRATE and count > 0:
            print(f"♻️ FORCE_MIGRATE=true: Truncating amazon_reviews ({count} rows found)...")
            cur.execute("TRUNCATE TABLE amazon_reviews")
            conn.commit()

        print("🚀 Loading amazon_reviews data (Chunked)...")
        chunk_size = 1000 # Reduced from 5000 for safety
        total_inserted = 0
        
        # Read CSV in chunks
        for i, chunk in enumerate(pd.read_csv(csv_path, chunksize=chunk_size)):
            data_to_insert = []
            for _, row in chunk.iterrows():
                try:
                    # Safe handling for numeric
                    rating = pd.to_numeric(row.get('rating'), errors='coerce')
                    sentiment = pd.to_numeric(row.get('sentiment_score'), errors='coerce')
                    price_sens = pd.to_numeric(row.get('price_sensitive'), errors='coerce')
                    
                    # Safe boolean
                    repurchase = clean_bool(row.get('repurchase_intent_hybrid'))
                    recommend = clean_bool(row.get('recommendation_intent_hybrid'))
                    
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
                        repurchase,
                        recommend,
                        price_sens if pd.notna(price_sens) else None,
                        row.get('semantic_top_dimension')
                    ))
                except Exception as row_e:
                    print(f"⚠️ Row error (Skipping row): {row_e}")
                    continue

            # Skip empty chunks
            if not data_to_insert:
                print(f"⚠️ Chunk {i+1} was empty after processing.")
                continue

            # Insert chunk
            try:
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
                total_inserted += len(data_to_insert)
                print(f"   Processed Chunk {i+1}: +{len(data_to_insert)} rows (Total: {total_inserted})")
            except Exception as chunk_e:
                print(f"❌ Chunk {i+1} insertion failed: {chunk_e}")
                conn.rollback() 
                # Optional: try simple loop fallback if bulk fails? 
                # For now just log.
        
        print(f"✅ Finished loading amazon_reviews. Total rows: {total_inserted}")
                
    except Exception as e:
        print(f"❌ Failed to load amazon_reviews top-level error: {e}")
    finally:
        if conn: conn.close()

if __name__ == "__main__":
    print("="*60)
    print("🏁 Starting Data Migration Script v2.0")
    print(f"   DB Target: {DB_HOST}:{DB_PORT}/{DB_NAME}")
    print("="*60)
    
    try:
        load_export_trends()
        load_amazon_reviews()
        print("🎉 Migration Completed Successfully.")
    except Exception as e:
        print(f"💥 Migration Script Crashed: {e}")
    
    # End of script
