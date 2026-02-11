import os
import psycopg2
import pandas as pd

def get_db_connection():
    try:
        conn = psycopg2.connect(
            host=os.environ.get("DB_HOST", "db"),
            database=os.environ.get("POSTGRES_DB", "postgres"),
            user=os.environ.get("POSTGRES_USER", "postgres"),
            password=os.environ.get("POSTGRES_PASSWORD", "postgres"),
            port=os.environ.get("DB_PORT", "5432")
        )
        return conn
    except Exception as e:
        print(f"DB Connection Failed: {e}")
        return None

conn = get_db_connection()
if conn:
    print("Rating Distribution:")
    df = pd.read_sql("SELECT rating, COUNT(*) FROM amazon_reviews GROUP BY rating ORDER BY rating DESC", conn)
    print(df)
    print("\nRating Column Type:", df['rating'].dtype)
    
    print("\nSample 5-star reviews:")
    df_sample = pd.read_sql("SELECT rating, cleaned_text FROM amazon_reviews WHERE rating >= 4.9 LIMIT 5", conn)
    for i, row in df_sample.iterrows():
        print(f"{i+1} [Rating {row['rating']}]: {row['cleaned_text']}")
    
    conn.close()
else:
    print("Could not connect to DB")
