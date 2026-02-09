from fastapi import FastAPI, HTTPException, Query
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
import numpy as np
import json
import re
import plotly.express as px
import plotly.graph_objects as go
from plotly.subplots import make_subplots
from typing import Optional, List, Dict, Any
from contextlib import asynccontextmanager
import os
from sklearn.feature_extraction.text import CountVectorizer
import psycopg2
import re

# DB Connection Details - Support both Spring format and legacy format
def parse_spring_datasource_url(url):
    """Parse jdbc:postgresql://host:port/database?params format"""
    if not url:
        return None, None, None
    # Pattern: jdbc:postgresql://host:port/database
    match = re.match(r'jdbc:postgresql://([^:]+):(\d+)/([^?]+)', url)
    if match:
        return match.group(1), match.group(2), match.group(3)
    return None, None, None

# Try Spring format first, fall back to legacy format
SPRING_URL = os.environ.get("SPRING_DATASOURCE_URL", "")
_parsed_host, _parsed_port, _parsed_db = parse_spring_datasource_url(SPRING_URL)

DB_HOST = _parsed_host or os.environ.get("DB_HOST", "db")
DB_PORT = _parsed_port or os.environ.get("DB_PORT", "5432")
DB_NAME = _parsed_db or os.environ.get("POSTGRES_DB", "bigproject")
DB_USER = os.environ.get("SPRING_DATASOURCE_USERNAME") or os.environ.get("POSTGRES_USER", "postgres")
DB_PASS = os.environ.get("SPRING_DATASOURCE_PASSWORD") or os.environ.get("POSTGRES_PASSWORD", "postgres")

def get_db_connection():
    try:
        conn = psycopg2.connect(
            host=DB_HOST,
            dbname=DB_NAME,
            user=DB_USER,
            password=DB_PASS,
            port=DB_PORT,
            sslmode=os.environ.get("DB_SSLMODE", "require")
        )
        return conn
    except Exception as e:
        print(f"DB Connection Failed: {e}")
        return None

# 국가 매핑
COUNTRY_MAPPING = {
    '미국': 'US',
    '중국': 'CN',
    '일본': 'JP',
    '베트남': 'VN',
    '독일': 'DE'
}

REVERSE_MAPPING = {v: k for k, v in COUNTRY_MAPPING.items()} # {'US': '미국', ...}

# UI 표시 이름 -> CSV 저장 이름 매핑
UI_TO_CSV_ITEM_MAPPING = {
    "간장": "간장", "감": "감", "건고사리": "고사리", "고추장": "고추장", "국수": "국수",
    "참치 통조림": "기름에 담근 것", "김치": "김치", "깐마늘": "껍질을 깐 것", "김밥류": "냉동김밥",
    "냉면": "냉면", "당면": "당면", "건더덕": "더덕", "된장": "된장", "두부": "두부",
    "들기름": "들기름과 그 분획물", "라면": "라면", "쌀": "멥쌀", "피클 및 절임채소": "밀폐용기에 넣은 것",
    "냉동 밤": "밤", "쿠키 및 크래커": "비스킷, 쿠키와 크래커", "삼계탕": "삼계탕", "소시지": "소시지",
    "소주": "소주", "만두": "속을 채운 파스타(조리한 것인지 또는 그 밖의 방법으로 조제한 것인지에 상관없다)",
    "초코파이류": "스위트 비스킷", "떡볶이 떡": "쌀가루의 것", "전통 한과/약과": "쌀과자", "유자": "유자",
    "인스턴트 커피": "인스턴트 커피의 조제품", "즉석밥": "찌거나 삶은 쌀", "참기름": "참기름과 그 분획물",
    "춘장": "춘장", "막걸리": "탁주", "쌀 튀밥": "튀긴 쌀", "팽이버섯": "팽이버섯", 
    "표고버섯": "표고버섯", "쌈장 및 양념장": "혼합조미료", "홍삼 엑기스": "홍삼 추출물(extract)"
}

CSV_TO_UI_ITEM_MAPPING = {v: k for k, v in UI_TO_CSV_ITEM_MAPPING.items()}

# 아이템별 검색어(Trend Keyword) 매핑
# 트렌드 데이터 컬럼명 예시: {COUNTRY}_{KEYWORD}_mean
ITEM_TO_TREND_MAPPING = {
    "간장": "Gochujang",
    "고추장": "Gochujang",
    "된장": "Doenjang",
    "춘장": "Gochujang",
    "쌈장 및 양념장": "Ssamjang",
    "김치": "Kimchi",
    "라면": "Ramyun",
    "국수": "Ramyun",
    "냉면": "Ramyun",
    "당면": "Ramyun",
    "소주": "Soju",
    "막걸리": "Makgeolli",
    "김밥류": "Gimbap",
    "떡볶이 떡": "Tteokbokki",
    "유자": "Yuja",
    "만두": "KFood",
    "삼계탕": "KFood",
    "참치 통조림": "KFood",
    "초코파이류": "KFood",
    "쿠키 및 크래커": "KFood",
    "전통 한과/약과": "KFood",
    "인스턴트 커피": "KFood",
    "즉석밥": "KFood",
    "쌀": "KFood",
    "두부": "KFood",
    "들기름": "KFood",
    "참기름": "KFood",
    "팽이버섯": "KFood",
    "표고버섯": "KFood",
    "홍삼 엑기스": "KFood"
}

df = None
growth_summary_df = None
df_consumer = None
GLOBAL_MEAN_SENTIMENT = 0.5
GLOBAL_STD_SENTIMENT = 0.3
GLOBAL_MEAN_RATING = 3.0

# =============================================================================
# 헬퍼 함수: 텍스트 전처리 및 분석 지표 계산
# =============================================================================

def remove_pos_tags(text: str) -> str:
    """cleaned_text에서 _NOUN, _ADJ, _VERB 등 품사 태그 제거
    
    Example: 'taste_NOUN good_ADJ' -> 'taste good'
    """
    if not isinstance(text, str):
        return ""
    return re.sub(r'_[A-Z]+', '', text)


def extract_bigrams_with_metrics(
    texts: pd.Series, 
    ratings: pd.Series, 
    original_texts: pd.Series,
    top_n: int = 15,
    adj_priority: bool = True,
    min_df: int = 5
) -> List[Dict[str, Any]]:
    """
    Bigram 추출 후 Impact Score, Positivity Rate 계산.
    형용사(_ADJ) 포함 조합을 우선순위로 제안.
    
    Args:
        texts: cleaned_text 컬럼 (품사 태그 포함)
        ratings: rating 컬럼
        original_texts: original_text 컬럼 (Drill-down용)
        top_n: 반환할 상위 키워드 수
        adj_priority: 형용사 포함 Bigram만 노출할지 여부 (False면 모든 Bigram 노출)
        min_df: CountVectorizer의 최소 등장 빈도
    
    Returns:
        List of keyword analysis dicts with impact_score, positivity_rate, sample_reviews
    """
    if texts.empty:
        return []
    
    # 1. Bigram 추출
    try:
        # 품사 태그 제거된 텍스트로 Bigram 추출
        cleaned_texts_no_tags = texts.apply(remove_pos_tags).fillna('')
        
        vectorizer = CountVectorizer(
            ngram_range=(2, 2),
            min_df=min_df,
            max_features=500,
            stop_words='english',
            token_pattern=r'\b[a-zA-Z]{3,}\b'
        )
        
        bigram_matrix = vectorizer.fit_transform(cleaned_texts_no_tags)
        bigram_names = vectorizer.get_feature_names_out()
        bigram_counts = bigram_matrix.sum(axis=0).A1
        
    except Exception as e:
        print(f"Bigram 추출 오류: {e}")
        return []
    
    # 2. 형용사 포함 Bigram 필터링 (원본 텍스트에서 _ADJ 태그 확인)
    adj_bigrams = set()
    if adj_priority:
        # 주석: texts는 태그가 포함된 cleaned_text 컬럼임
        try:
            all_text = " ".join(texts.dropna().astype(str))
            for bigram in bigram_names:
                words = bigram.split()
                if len(words) == 2:
                    if f"{words[0]}_ADJ" in all_text or f"{words[1]}_ADJ" in all_text:
                        adj_bigrams.add(bigram)
        except Exception as e:
            print(f"형용사 필터링 오류: {e}")

    # 3. 각 Bigram에 대해 Impact Score, Positivity Rate 계산
    results = []
    
    for idx, bigram in enumerate(bigram_names):
        count = int(bigram_counts[idx])
        if count < min_df: # min_df보다 적으면 pass (CountVectorizer에서 이미 걸러졌겠지만 안전장치)
            continue
            
        # 해당 Bigram을 포함하는 리뷰 필터링
        # cleaned_texts_no_tags를 사용해야 함
        mask = cleaned_texts_no_tags.str.contains(bigram, case=False, na=False, regex=False)
        matching_ratings = ratings[mask]
        matching_originals = original_texts[mask]
        
        if len(matching_ratings) == 0:
            continue
        
        # Impact Score = 해당 키워드 포함 평균 - 전체 평균(3.0)
        avg_rating = matching_ratings.mean()
        impact_score = round(avg_rating - 3.0, 2)
        
        # Positivity Rate = 4-5점 비율 (%)
        positive_count = (matching_ratings >= 4).sum()
        positivity_rate = round((positive_count / len(matching_ratings)) * 100, 1)
        
        # Satisfaction Index = (5점 리뷰 비율) / 0.2 (전체 5점 확률)
        five_star_ratio = (matching_ratings == 5).mean()
        satisfaction_index = round(five_star_ratio / 0.2, 2)
        
        # Sample Reviews (최대 3개)
        sample_reviews = matching_originals.dropna().head(3).tolist()
        
        # 형용사 포함 여부
        has_adj = bigram in adj_bigrams
        
        results.append({
            "keyword": bigram,
            "impact_score": impact_score,
            "positivity_rate": positivity_rate, # 하위 호환성 유지 (API 쓰는 다른 곳이 있을 수 있음)
            "satisfaction_index": satisfaction_index,
            "mention_count": count,
            "sample_reviews": sample_reviews,
            "has_adjective": has_adj
        })
    
    # 4. 정렬: 형용사 포함 우선, 그 다음 언급 횟수
    if adj_priority:
        # 형용사 포함 조합이 있다면 그것들만 필터링해서 상위권에 배치
        adj_results = [r for r in results if r["has_adjective"]]
        if adj_results:
            results = sorted(adj_results, key=lambda x: -x["mention_count"])
        else:
            results = sorted(results, key=lambda x: -x["mention_count"])
    else:
        results = sorted(results, key=lambda x: -x["mention_count"])
    
    return results[:top_n]


def get_diverging_keywords(keywords_analysis: List[Dict], top_n: int = 10, threshold: float = 0.3) -> Dict[str, List[Dict]]:
    """
    Impact Score 기준으로 부정/긍정 키워드 분리
    
    Args:
        keywords_analysis: 분석 결과 리스트
        top_n: 결과당 최대 개수
        threshold: 필터링할 Impact Score의 절대값 문턱 (데이터 적으면 0.0)
    
    Returns:
        {"negative": [...], "positive": [...]}
    """
    # 부정 키워드: impact_score < -threshold
    negative = sorted(
        [k for k in keywords_analysis if k["impact_score"] < -threshold],
        key=lambda x: x["impact_score"]
    )[:top_n]
    
    # 긍정 키워드: impact_score > threshold
    positive = sorted(
        [k for k in keywords_analysis if k["impact_score"] > threshold],
        key=lambda x: -x["impact_score"]
    )[:top_n]
    
    return {"negative": negative, "positive": positive}

import threading
import time

def load_data_background():
    global df, growth_summary_df
    global GLOBAL_MEAN_SENTIMENT, GLOBAL_STD_SENTIMENT, GLOBAL_MEAN_RATING

    print("🚀 [Background] Starting Data Loading...", flush=True)
    
    # Retry mechanism: Wait for DB migration if needed (Up to 5 minutes)
    max_retries = 60 
    for i in range(max_retries):
        conn = get_db_connection()
        if conn:
            try:
                # 1. Load Export Trends
                print(f"Loading export_trends from DB (Attempt {i+1}/{max_retries})...", flush=True)
                query = "SELECT * FROM export_trends"
                
                # [Fix] Use cursor directly to avoid Pandas/SQLAlchemy warning and potential hang
                with conn.cursor() as cur:
                    cur.execute(query)
                    if cur.description:
                        cols = [desc[0] for desc in cur.description]
                        rows = cur.fetchall()
                        temp_df = pd.DataFrame(rows, columns=cols)
                    else:
                        temp_df = pd.DataFrame()

                print(f"Loaded {len(temp_df)} rows. Processing...", flush=True)
                
                if not temp_df.empty:
                    # [Optimization] Do NOT expand JSONB trend_data globally at startup.
                    df = temp_df

                    # Ensure trend_data is parsed as dict (if it comes as string)
                    if 'trend_data' in df.columns:
                        print("Processing trend_data column...", flush=True)
                        def ensure_dict(x):
                            if isinstance(x, dict): return x
                            if isinstance(x, str):
                                try: return json.loads(x)
                                except: return {}
                            return {}
                        df['trend_data'] = df['trend_data'].apply(ensure_dict)

                    # Numeric Cleanups
                    print("Performing numeric cleanup...", flush=True)
                    
                    # Explicit type conversion for critical columns to avoid object dtype issues
                    numeric_targets = ['export_value', 'export_weight', 'unit_price', 'exchange_rate', 'gdp_level', 'cpi']
                    for col in numeric_targets:
                        if col in df.columns:
                            df[col] = pd.to_numeric(df[col], errors='coerce').fillna(0)

                    numeric_cols = df.select_dtypes(include=[np.number]).columns
                    df[numeric_cols] = df[numeric_cols].fillna(0)
                    
                    # Growth Matrix Calculation
                    print("Calculating Growth Matrix...", flush=True)
                    summaries = []
                    group_cols = ['country_code', 'item_name']
                    if 'country_code' not in df.columns:
                            group_cols = ['country_name', 'item_name']
                            
                    grouped = df.groupby(group_cols)
                    for name, group in grouped:
                        if len(group) < 24: continue
                        group = group.sort_values('period_str')
                        recent_12 = group.tail(12)
                        prev_12 = group.iloc[-24:-12]
                        
                        weight_col = 'export_weight' if 'export_weight' in group.columns else None
                        if weight_col:
                            w_curr = recent_12[weight_col].sum()
                            w_prev = prev_12[weight_col].sum()
                        else: 
                                w_curr = recent_12['export_value'].sum()
                                w_prev = prev_12['export_value'].sum()
        
                        weight_growth = ((w_curr - w_prev) / w_prev * 100) if w_prev > 0 else 0
                        
                        p_curr = recent_12['unit_price'].mean()
                        p_prev = prev_12['unit_price'].mean()
                        price_growth = ((p_curr - p_prev) / p_prev * 100) if p_prev > 0 else 0
                        
                        total_value = recent_12['export_value'].sum()
                        
                        summaries.append({
                            'country': name[0] if 'country_code' in df.columns else COUNTRY_MAPPING.get(name[0], name[0]),
                            'item_csv_name': name[1],
                            'weight_growth': round(weight_growth, 1),
                            'price_growth': round(price_growth, 1),
                            'total_value': total_value
                        })
                    growth_summary_df = pd.DataFrame(summaries)
                    print("Export Trends Loaded & Matrix Calculated.", flush=True)
                    
                    # 2. Global Consumer Stats (Only if step 1 success)
                    print("Calculating Global Consumer Stats from DB...", flush=True)
                    with conn.cursor() as cur:
                        cur.execute("SELECT AVG(sentiment_score), STDDEV(sentiment_score), AVG(rating) FROM amazon_reviews")
                        row = cur.fetchone()
                        if row and row[0] is not None:
                                GLOBAL_MEAN_SENTIMENT = float(row[0])
                                GLOBAL_STD_SENTIMENT = float(row[1]) if row[1] is not None else 0.3
                                GLOBAL_MEAN_RATING = float(row[2])
                                print(f"Global Stats: Sent={GLOBAL_MEAN_SENTIMENT:.2f}, Std={GLOBAL_STD_SENTIMENT:.2f}, Rating={GLOBAL_MEAN_RATING:.2f}", flush=True)
                        else:
                                print("⚠️ amazon_reviews table empty or stats unavailable.", flush=True)
                    
                    conn.close()
                    break # Success, exit retry loop
                    
                else:
                    print(f"⚠️ export_trends table is empty. Migration might be in progress... (Attempt {i+1}/{max_retries})", flush=True)
                    conn.close()
                    time.sleep(5) # Wait for migration

            except Exception as e:
                print(f"DB Load Failed (Attempt {i+1}/{max_retries}): {e}", flush=True)
                if conn: conn.close()
                time.sleep(5) # Wait before retry
        else:
            print(f"DB Connection Failed (Attempt {i+1}/{max_retries}). Retrying in 5s...", flush=True)
            time.sleep(5)
    
    if df is None or df.empty: 
        print("❌ Final: Could not load data after retries. App will run with empty state.", flush=True)
        df = pd.DataFrame()
        growth_summary_df = pd.DataFrame()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize empty first to prevent errors if requests come in before load
    global df, growth_summary_df
    df = pd.DataFrame()
    growth_summary_df = pd.DataFrame()

    print("🚀 Server Starting... Triggering Background Data Load.", flush=True)
    
    # Start background thread for data loading
    # This prevents blocking the startup, so Readiness Probe can pass immediately.
    loader_thread = threading.Thread(target=load_data_background, daemon=True)
    loader_thread.start()

    yield
    print("Shutting down...", flush=True)

app = FastAPI(title="K-Food Export Analysis Engine", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"]
)

@app.get("/")
async def root():
    return {"message": "K-Food Analysis Engine (Visual Analytics Mode)", "status": "Ready"}

@app.get("/health/data")
async def health_data():
    """Check if data is loaded"""
    return {
        "data_loaded": not (df is None or df.empty),
        "rows": len(df) if df is not None else 0,
        "growth_matrix_rows": len(growth_summary_df) if growth_summary_df is not None else 0,
        "global_stats": {
            "sentiment": GLOBAL_MEAN_SENTIMENT,
            "rating": GLOBAL_MEAN_RATING
        }
    }

@app.get("/items")
async def get_items():
    if df is None or df.empty: return {"items": []}
    try:
        csv_items = df['item_name'].dropna().unique().tolist()
        ui_items = sorted(list(set([CSV_TO_UI_ITEM_MAPPING.get(i, i) for i in csv_items])))
        return {"items": ui_items}
    except: return {"items": []}

@app.get("/analyze")
async def analyze(country: str = Query(...), item: str = Query(...)):
    
    # [Debug] Log incoming request
    print(f"[Analyze] Request: country={country}, item={item}", flush=True)
    
    # 1. 매핑 및 유효성 검사
    country_name = REVERSE_MAPPING.get(country, country) # 코드(US) -> 이름(미국)
    if country in COUNTRY_MAPPING: # 입력이 한글(미국)이면 코드로 변환
         country_code = COUNTRY_MAPPING[country]
         country_name = country
    else:
         country_code = country # 입력이 코드(US)면 그대로
         
    csv_item_name = UI_TO_CSV_ITEM_MAPPING.get(item, item)
    print(f"[Analyze] Mapped: country_name={country_name}, country_code={country_code}, csv_item={csv_item_name}", flush=True)
    
    # 데이터 필터링
    filtered = df[
        (df['country_name'] == country_name) & 
        (df['item_name'] == csv_item_name)
    ].copy()
    
    print(f"[Analyze] Filtered rows: {len(filtered)}", flush=True)
    
    if filtered.empty or (filtered['export_value'].sum() == 0):
        print(f"[Analyze] No data found for {country_name} - {csv_item_name}", flush=True)
        return {"has_data": False}

    # 날짜순 정렬
    filtered = filtered.sort_values('period_str')

    # ---------------------------------------------------------
    # Chart 1: Trend Stack (수출액 + 환율 + GDP/Econ)
    # ---------------------------------------------------------
    rows = 2
    titles = ["수출액 Trend", f"{country_name} 현지 환율"]
    if 'gdp_level' in filtered.columns:
        rows = 3
        titles.append(f"{country_name} GDP 지표")
        
    fig_stack = make_subplots(rows=rows, cols=1, shared_xaxes=True, 
                              vertical_spacing=0.1, subplot_titles=titles)
                              
    # Row 1: Export Value (Bar + Color Gradient)
    fig_stack.add_trace(go.Bar(
        x=filtered['period_str'], y=filtered['export_value'], name="수출액 ($)",
        marker=dict(color=filtered['export_value'], colorscale='Purples')
    ), row=1, col=1)
    
    # Row 2: Exchange Rate (Line with Fill)
    fig_stack.add_trace(go.Scatter(
        x=filtered['period_str'], y=filtered['exchange_rate'], name="환율",
        line=dict(color='#f59e0b', width=2), fill='tozeroy', fillcolor='rgba(245, 158, 11, 0.1)'
    ), row=2, col=1)
    
    # Row 3: GDP (if exists)
    if rows == 3:
        fig_stack.add_trace(go.Scatter(
            x=filtered['period_str'], y=filtered['gdp_level'], name="GDP",
            line=dict(color='#10b981', width=2, dash='dot')
        ), row=3, col=1)

    fig_stack.update_layout(
        height=600 if rows == 3 else 450, 
        template="plotly_white", 
        showlegend=False,
        margin=dict(l=40, r=20, t=60, b=40)
    )

    # ---------------------------------------------------------
    # Chart 2: Signal Map (Leading-Lagging)
    # ---------------------------------------------------------
    fig_signal = make_subplots(specs=[[{"secondary_y": True}]])
    
    # ---------------------------------------------------------
    # Chart 2: Signal Map (Leading-Lagging)
    # ---------------------------------------------------------
    fig_signal = make_subplots(specs=[[{"secondary_y": True}]])
    
    # [Optimization] Extract Trend Data on-the-fly for filtered rows
    # filtered['trend_data'] is a Series of dicts
    
    common_trend_key = f"{country_code}_KFood_mean"
    
    # Helper to safely get value from dict
    def get_trend_val(row, key):
        td = row.get('trend_data', {})
        if not isinstance(td, dict): return None
        return td.get(key)

    # 1. 공통 선행 지표: 전체 K-Food 관심도 (Baseline)
    # Check if we have data for this key in the first row (as a sample)
    has_common = False
    first_trend_data = filtered.iloc[0].get('trend_data', {}) if not filtered.empty else {}
    if isinstance(first_trend_data, dict) and common_trend_key in first_trend_data:
        has_common = True
        
    if has_common:
        # Extract series
        y_common = filtered.apply(lambda r: get_trend_val(r, common_trend_key), axis=1)
        fig_signal.add_trace(go.Scatter(
            x=filtered['period_str'], y=y_common, 
            name="K-Food 전체 관심도",
            line=dict(color='#fda4af', width=2, dash='dot'), # 연한 핑크 점선
            opacity=0.6
        ), secondary_y=True)

    # 2. 개별 선행 지표: 1:1 매핑된 품목 관심도
    trend_kw = ITEM_TO_TREND_MAPPING.get(item)
    # KFood와 중복되지 않는 경우에만 추가로 그림
    if trend_kw and trend_kw != "KFood":
        specific_trend_key = f"{country_code}_{trend_kw}_mean"
        
        # Check existence
        has_specific = False
        if isinstance(first_trend_data, dict) and specific_trend_key in first_trend_data:
             has_specific = True
             
        if has_specific:
            y_specific = filtered.apply(lambda r: get_trend_val(r, specific_trend_key), axis=1)
            fig_signal.add_trace(go.Scatter(
                x=filtered['period_str'], y=y_specific, 
                name=f"품목 관심도 ({trend_kw})",
                line=dict(color='#f43f5e', width=4), # 진한 장미색 실선
                mode='lines+markers'
            ), secondary_y=True)
            
    elif not has_common:
        # KFood도 없고 매핑도 없을 때만 아무 트렌드나 하나 찾아서 표시 (폴백)
        # Find any key ending in _mean inside the first row's trend_data
        fallback_key = None
        if isinstance(first_trend_data, dict):
            for k in first_trend_data.keys():
                if k.startswith(f"{country_code}_") and k.endswith("_mean"):
                    fallback_key = k
                    break
        
        if fallback_key:
            y_fallback = filtered.apply(lambda r: get_trend_val(r, fallback_key), axis=1)
            fig_signal.add_trace(go.Scatter(
                x=filtered['period_str'], y=y_fallback, 
                name="관심도 (관련 데이터)",
                line=dict(color='#f43f5e', width=3)
            ), secondary_y=True)

    # 3. 후행 지표: 실적(수출액) - Area
    fig_signal.add_trace(go.Scatter(
        x=filtered['period_str'], y=filtered['export_value'], name="수출 실적 ($)",
        fill='tozeroy', line=dict(color='#6366f1', width=0), opacity=0.3
    ), secondary_y=False)
        
    fig_signal.update_layout(
        title="Signal Map (관심도 vs 실적 시차 분석)",
        template="plotly_white",
        height=400,
        legend=dict(orientation="h", y=1.1, x=0.5, xanchor='center'),
        margin=dict(l=40, r=40, t=60, b=40)
    )
    fig_signal.update_yaxes(title_text="수출액 ($)", secondary_y=False, showgrid=False)
    fig_signal.update_yaxes(title_text="관심도 Index", secondary_y=True, showgrid=False)

    # ---------------------------------------------------------
    # Chart 3: Growth Matrix (Scatter Plot)
    # ---------------------------------------------------------
    country_matrix = growth_summary_df[growth_summary_df['country'] == country_code].copy()
    fig_scatter = go.Figure()
    
    if not country_matrix.empty and not country_matrix[country_matrix['item_csv_name'] == csv_item_name].empty:
        country_matrix['ui_name'] = country_matrix['item_csv_name'].apply(lambda x: CSV_TO_UI_ITEM_MAPPING.get(x, x))
        
        curr = country_matrix[country_matrix['item_csv_name'] == csv_item_name]
        others = country_matrix[country_matrix['item_csv_name'] != csv_item_name]
        
        # Others
        fig_scatter.add_trace(go.Scatter(
            x=others['weight_growth'], y=others['price_growth'],
            mode='markers',
            marker=dict(size=10, color='#94a3b8', opacity=0.4),
            text=others['ui_name'], name="타 품목",
            hovertemplate="<b>%{text}</b><br>양적: %{x}%<br>질적: %{y}%"
        ))
        
        # Current
        fig_scatter.add_trace(go.Scatter(
            x=curr['weight_growth'], y=curr['price_growth'],
            mode='markers+text',
            marker=dict(size=25, color='#f43f5e', line=dict(width=2, color='white')),
            text=curr['ui_name'], textposition="top center",
            textfont=dict(size=15, color='#f43f5e', family="Arial Black"),
            name=item,
            hovertemplate="<b>%{text}</b> (현재)<br>양적: %{x}%<br>질적: %{y}%"
        ))
        
        # Quadrant Lines
        fig_scatter.add_hline(y=0, line_dash="solid", line_color="#e2e8f0")
        fig_scatter.add_vline(x=0, line_dash="solid", line_color="#e2e8f0")
        
        # Annotations (1~4사분면)
        # 1사분면 (우상향): Premium Expansion
        fig_scatter.add_annotation(x=10, y=10, text="Premium (고부가가치 성장)", showarrow=False, font=dict(color="#10b981", size=12), xanchor="left")
        # 4사분면 (우하향): Volume Driven
        fig_scatter.add_annotation(x=10, y=-10, text="Volume (박리다매)", showarrow=False, font=dict(color="#3b82f6", size=12), xanchor="left")
        
        fig_scatter.update_layout(
            title="성장의 질 (Growth Matrix)",
            xaxis_title="양적 성장 (물량 증가율 %)",
            yaxis_title="질적 성장 (단가 증가율 %)",
            template="plotly_white",
            height=500,
            showlegend=False,
            margin=dict(l=40, r=20, t=60, b=40)
        )
    else:
        # 데이터가 부족해서 매트릭스를 그릴 수 없을 때 빈 차트
        fig_scatter.update_layout(
            title="성장의 질 (데이터 부족)",
            template="plotly_white", height=500
        )

    return {
        "country": country,
        "country_name": country_name,
        "item": item,
        "has_data": True,
        "charts": {
            "trend_stack": json.loads(fig_stack.to_json()),
            "signal_map": json.loads(fig_signal.to_json()),
            "growth_matrix": json.loads(fig_scatter.to_json())
        }
    }

@app.get("/analyze/consumer")
async def analyze_consumer(item_id: str = Query(None, description="ASIN"), item_name: str = Query(None, description="제품명/키워드")):
    
    # 0. 키워드 치환 (검색량 부족 이슈 해결)
    if item_name:
        # Gochujang 관련 키워드가 들어오면 Kimchi로 우회하여 풍부한 데이터 제공
        target_keywords = ['gochujang', 'red pepper paste', 'hot pepper paste', 'korean paste']
        if any(k in item_name.lower() for k in target_keywords):
            print(f"[Consumer] Remapping '{item_name}' to 'Kimchi' for sufficient data analysis.", flush=True)
            item_name = 'Kimchi'
    
    conn = get_db_connection()
    if not conn:
         return JSONResponse(status_code=500, content={"has_data": False, "message": "Database Connection Error"})

    try:
        # DB에서 직접 조회 (Memory Efficient)
        if item_name:
            query = """
                SELECT * FROM amazon_reviews 
                WHERE title ILIKE %s OR cleaned_text ILIKE %s
            """
            search_pattern = f"%{item_name}%"
            filtered = pd.read_sql(query, conn, params=(search_pattern, search_pattern))
            
        elif item_id:
            query = "SELECT * FROM amazon_reviews WHERE asin = %s"
            filtered = pd.read_sql(query, conn, params=(item_id,))
        else:
            filtered = pd.DataFrame()
            
    except Exception as e:
        print(f"[Consumer] Data Fetch Error: {e}", flush=True)
        filtered = pd.DataFrame()
    finally:
        conn.close()

    if filtered.empty:
        print(f"[Consumer] No data found for conditions: item_id={item_id}, item_name={item_name}", flush=True)
        return {"has_data": False, "message": "해당 조건의 데이터가 없습니다."}
    
    print(f"[Consumer] Found {len(filtered)} rows", flush=True)

    try:
        # === [중요] 데이터 결측치 처리 및 대체 로직 ===
        # 평점 데이터 숫자 변환
        if 'rating' in filtered.columns:
            filtered['rating'] = pd.to_numeric(filtered['rating'], errors='coerce').fillna(3.0)

        # 1. 감성 점수 (sentiment_score 없을 경우 평점 기반 생성)
        if 'sentiment_score' not in filtered.columns:
            if 'rating' in filtered.columns:
                # 1->0.0, 5->1.0 형태로 매핑
                filtered['sentiment_score'] = (filtered['rating'] - 1) / 4
            else:
                filtered['sentiment_score'] = 0.5
    except Exception as e:
        print(f"필터링/전처리 오류: {e}")
        import traceback
        traceback.print_exc()
        return {"has_data": False, "message": f"서버 오류: {str(e)}"}

    # 2. 구매/추천 의도 (데이터 없을 경우 고평점 기반 추론)
    if 'repurchase_intent_hybrid' not in filtered.columns:
         filtered['repurchase_intent_hybrid'] = filtered['rating'] >= 4
    if 'recommendation_intent_hybrid' not in filtered.columns:
         filtered['recommendation_intent_hybrid'] = filtered['rating'] >= 4
         
    # 3. 키워드 컬럼 (데이터 없을 경우 빈 값 생성)
    for col in ['review_text_keywords', 'title_keywords', 'flavor_terms', 'price', 'quality_issues_semantic', 'delivery_issues_semantic']:
        if col not in filtered.columns:
            filtered[col] = None
            
    # 4. 파생 변수 초기화 (DB에 없거나 계산되지 않은 경우)
    required_cols = ['value_perception_hybrid', 'price_sensitive', 'sensory_conflict']
    for col in required_cols:
         if col not in filtered.columns:
             filtered[col] = 0.5 if col == 'value_perception_hybrid' else (0.0 if col == 'price_sensitive' else False)

    total_count = filtered.shape[0]
    
    # =========================================================
    # 2. 시장 감성 및 주요 점수 (상대적 지표로 전면 교체)
    # =========================================================
    try:
        # 1. Impact Score (Rating Lift)
        avg_rating = filtered['rating'].mean()
        if pd.isna(avg_rating): avg_rating = 3.0
        item_impact_score = round(avg_rating - 3.0, 2)
        
        # 2. Relative Sentiment Z-Score
        target_mean_sent = filtered['sentiment_score'].mean()
        if pd.isna(target_mean_sent): target_mean_sent = 0.5
        
        if GLOBAL_STD_SENTIMENT > 0:
            sentiment_z_score = round((target_mean_sent - GLOBAL_MEAN_SENTIMENT) / GLOBAL_STD_SENTIMENT, 2)
        else:
            sentiment_z_score = 0.0
            
        # 3. Satisfaction Index (Likelihood Ratio)
        target_five_star_ratio = (filtered['rating'] == 5).mean()
        if pd.isna(target_five_star_ratio): target_five_star_ratio = 0.0
        satisfaction_index = round(target_five_star_ratio / 0.2, 2)
        
        # 요약 메트릭 업데이트
        metrics = {
            "impact_score": item_impact_score,
            "sentiment_z_score": sentiment_z_score,
            "satisfaction_index": satisfaction_index,
            "total_reviews": total_count
        }
    except Exception as e:
        print(f"메트릭 계산 오류: {e}")
        metrics = {
            "impact_score": 0, "sentiment_z_score": 0, "satisfaction_index": 0, "total_reviews": total_count
        }
    
    # =========================================================
    # 3. 상세 분석: Bigram 기반 키워드 분석 (가변 임계값 적용)
    # =========================================================
    
    # 데이터 규모에 따른 가변 파라미터 결정
    is_small_sample = total_count < 50
    adj_priority_val = not is_small_sample # 50개 미만이면 False (모든 키워드 허용)
    min_df_val = 1 if is_small_sample else 2 # 50개 미만이면 1번만 나와도 추출
    impact_threshold_val = 0.0 if is_small_sample else 0.1 # 50개 미만이면 모든 차이 노출, 그 외엔 0.1로 완화
    
    # Bigram 추출 및 Impact Score, Positivity Rate 계산
    keywords_analysis = []
    diverging_keywords = {"negative": [], "positive": []}
    
    try:
        if 'cleaned_text' in filtered.columns and 'original_text' in filtered.columns:
            keywords_analysis = extract_bigrams_with_metrics(
                texts=filtered['cleaned_text'],
                ratings=filtered['rating'],
                original_texts=filtered['original_text'],
                top_n=20,
                adj_priority=adj_priority_val,
                min_df=min_df_val
            )
        
        # 긍정/부정 키워드 분리 (가변 임계값 기준)
        diverging_keywords = get_diverging_keywords(
            keywords_analysis, 
            top_n=8, 
            threshold=impact_threshold_val
        )
    except Exception as e:
        print(f"키워드 분석 오류: {e}")
    
    # =========================================================
    # =========================================================
    # 4. Diverging Bar Chart (감성 영향도 시각화)
    # =========================================================
    
    # 부정 키워드 (Impact Score < 0)
    neg_keywords = diverging_keywords["negative"]
    pos_keywords = diverging_keywords["positive"]
    
    # Diverging Bar Chart 생성 (x축 기준 0)
    fig_diverging = go.Figure()
    
    # 부정 영향 키워드 (왼쪽, 빨간색)
    if neg_keywords:
        fig_diverging.add_trace(go.Bar(
            y=[k["keyword"] for k in neg_keywords],
            x=[k["impact_score"] for k in neg_keywords],
            orientation='h',
            name='부정 영향',
            marker_color='#ef4444',
            text=[f'SI: {k["satisfaction_index"]}' for k in neg_keywords],
            textposition='inside',
            hovertemplate='<b>%{y}</b><br>감성 영향도: %{x}<br>만족도 지수: %{text}<extra></extra>'
        ))
    
    # 긍정 영향 키워드 (오른쪽, 녹색)
    if pos_keywords:
        fig_diverging.add_trace(go.Bar(
            y=[k["keyword"] for k in pos_keywords],
            x=[k["impact_score"] for k in pos_keywords],
            orientation='h',
            name='긍정 영향',
            marker_color='#22c55e',
            text=[f'SI: {k["satisfaction_index"]}' for k in pos_keywords],
            textposition='inside',
            hovertemplate='<b>%{y}</b><br>감성 영향도: %{x}<br>만족도 지수: %{text}<extra></extra>'
        ))
    
    fig_diverging.update_layout(
        title="키워드별 감성 영향도 (Impact Score)",
        xaxis_title="감성 영향도 (Impact Score: 0 = 평균)",
        yaxis_title="키워드 (Bigram)",
        template="plotly_white",
        height=500,
        showlegend=True,
        legend=dict(orientation="h", yanchor="bottom", y=1.02, xanchor="right", x=1),
        xaxis=dict(zeroline=True, zerolinewidth=2, zerolinecolor='#64748b'),
        barmode='relative'
    )
    
    # =========================================================
    # 5. Satisfaction Index Chart (만족도 확률 지수 시각화)
    # =========================================================
    
    # 상위 10개 키워드
    top_keywords_for_si = sorted(keywords_analysis, key=lambda x: -x["mention_count"])[:10]
    
    fig_positivity = go.Figure()
    if top_keywords_for_si:
        fig_positivity.add_trace(go.Bar(
            x=[k["keyword"] for k in top_keywords_for_si],
            y=[k["satisfaction_index"] for k in top_keywords_for_si],
            marker_color=[
                '#22c55e' if k["satisfaction_index"] >= 1.2 else '#f59e0b' if k["satisfaction_index"] >= 0.8 else '#ef4444'
                for k in top_keywords_for_si
            ],
            text=[f'{k["satisfaction_index"]}' for k in top_keywords_for_si],
            textposition='outside',
            hovertemplate='<b>%{x}</b><br>만족도 지수: %{y}<br>언급 횟수: %{customdata}<extra></extra>',
            customdata=[k["mention_count"] for k in top_keywords_for_si]
        ))
        
        # 기준선 1.0 추가
        fig_positivity.add_shape(
            type="line",
            x0=-0.5, y0=1.0, x1=len(top_keywords_for_si)-0.5, y1=1.0,
            line=dict(color="Red", width=2, dash="dash"),
        )
    
    fig_positivity.update_layout(
        title="키워드별 만족도 확률 지수 (Satisfaction Index)",
        xaxis_title="키워드 (Bigram)",
        yaxis_title="Index (기준 1.0)",
        template="plotly_white",
        height=400,
        yaxis=dict(rangemode='tozero') 
    )

    # =========================================================
    # 6. Advanced Consumer Experience Metrics
    # =========================================================

    # NSS (Net Sentiment Score) 계산
    pos_count = filtered[filtered['sentiment_score'] >= 0.75].shape[0]
    neg_count = filtered[filtered['sentiment_score'] <= 0.25].shape[0]
    nss_score = ((pos_count - neg_count) / total_count * 100) if total_count > 0 else 0
    
    # CAS (Customer Advocacy Score)
    advocates = filtered[
        (filtered['repurchase_intent_hybrid'] == True) & 
        (filtered['recommendation_intent_hybrid'] == True)
    ].shape[0]
    cas_score = (advocates / total_count) if total_count > 0 else 0
    
    # NSS 게이지 차트
    fig_nss = go.Figure(go.Indicator(
        mode = "gauge+number",
        value = nss_score,
        title = {'text': "NSS (순 정서 점수)"},
        gauge = {
            'axis': {'range': [-100, 100]},
            'bar': {'color': "darkblue"},
            'steps' : [
                {'range': [-100, -30], 'color': "#ff4d4f"},
                {'range': [-30, 30], 'color': "#faad14"},
                {'range': [30, 100], 'color': "#52c41a"}
            ],
            'threshold' : {'line': {'color': "black", 'width': 4}, 'thickness': 0.75, 'value': nss_score}
        }
    ))
    fig_nss.update_layout(height=300, margin=dict(l=20, r=20, t=50, b=20))

    # ASIN별 NSS vs CAS 산점도
    # ASIN별 NSS vs CAS 산점도 (Global Comparative Analysis)
    # 메모리 문제로 전체 데이터(df_consumer) 로딩을 안하므로, 
    # 비교 분석 대신 현재 검색된 상품들의 분포만 보여주거나, DB 집계가 필요함.
    # 여기서는 검색된 데이터(filtered) 내의 ASIN들만 비교하는 것으로 축소.
    try:
        asin_stats = filtered.groupby('asin').agg(
            total=('sentiment_score', 'count'),
            pos_count=('sentiment_score', lambda x: (x >= 0.75).sum()),
            neg_count=('sentiment_score', lambda x: (x <= 0.25).sum())
        ).reset_index()
        
        cas_counts = filtered[
            (filtered['repurchase_intent_hybrid'] == True) & 
            (filtered['recommendation_intent_hybrid'] == True)
        ].groupby('asin').size().reset_index(name='adv_count')
        
        asin_stats = pd.merge(asin_stats, cas_counts, on='asin', how='left').fillna(0)
        asin_stats['nss'] = (asin_stats['pos_count'] - asin_stats['neg_count']) / asin_stats['total'] * 100
        asin_stats['cas'] = asin_stats['adv_count'] / asin_stats['total']
    except Exception as e:
        print(f"ASIN Stats Error: {e}")
        asin_stats = pd.DataFrame(columns=['asin', 'nss', 'cas', 'total']) # Empty fallback
    
    current_asins = filtered['asin'].unique()
    fig_scatter_nss = go.Figure()
    fig_scatter_nss.add_trace(go.Scatter(
        x=asin_stats['nss'], y=asin_stats['cas'],
        mode='markers',
        marker=dict(color='lightgray', size=8, opacity=0.5),
        name='타사 제품'
    ))
    curr_stats = asin_stats[asin_stats['asin'].isin(current_asins)]
    fig_scatter_nss.add_trace(go.Scatter(
        x=curr_stats['nss'], y=curr_stats['cas'],
        mode='markers',
        marker=dict(color='red', size=12, symbol='star'),
        name='현재 분석 제품'
    ))
    fig_scatter_nss.update_layout(
        title="브랜드 포지셔닝 (NSS vs CAS)",
        xaxis_title="NSS (순 정서 점수)",
        yaxis_title="CAS (고객 옹호 점수)",
        template="plotly_white",
        height=400
    )

    # PQI (Product Quality Index)
    quality_exploded = filtered.explode('quality_issues_semantic')
    quality_issues_count = quality_exploded['quality_issues_semantic'].dropna().value_counts()
    total_issues = quality_issues_count.sum()
    pqi_score = max(0, 100 - (total_issues / total_count * 20)) if total_count > 0 else 100
    
    fig_treemap = go.Figure()
    if not quality_issues_count.empty:
        fig_treemap = px.treemap(
            names=quality_issues_count.index,
            parents=["Quality Issues"] * len(quality_issues_count),
            values=quality_issues_count.values,
            title="주요 품질 불만 (Quality Issues)"
        )

    # LFI (Logistics Friction Index)
    lfi_keywords = ['dent', 'leak', 'broken', 'damage', 'crush', 'open']
    lfi_count = 0
    for col in ['delivery_issues_semantic', 'packaging_keywords']:
        if col in filtered.columns:
            exploded = filtered.explode(col)
            mask = exploded[col].astype(str).str.contains('|'.join(lfi_keywords), case=False, na=False)
            lfi_count += mask.sum()
    lfi_rate = (lfi_count / total_count * 100) if total_count > 0 else 0
    
    # SPI (Sensory Performance Index)
    spi_score = (filtered[filtered['sensory_conflict'] == False].shape[0] / total_count * 100) if total_count > 0 else 0
    
    texture_exploded = filtered.explode('texture_terms')
    texture_sentiment = texture_exploded.groupby('texture_terms')['sentiment_score'].mean().sort_values(ascending=False).head(8)
    
    fig_radar = go.Figure()
    if not texture_sentiment.empty:
        categories = texture_sentiment.index.tolist()
        values = texture_sentiment.values.tolist()
        fig_radar = go.Figure(data=go.Scatterpolar(
            r=values + [values[0]],
            theta=categories + [categories[0]],
            fill='toself',
            name='Texture Sentiment'
        ))
        fig_radar.update_layout(
            polar=dict(radialaxis=dict(visible=True, range=[0, 1])),
            title="식감별 선호도 (Textural Preference)",
            height=400
        )

    # Value & Price
    value_score = filtered['value_perception_hybrid'].mean()
    price_sensitive_ratio = filtered['price_sensitive'].mean() if 'price_sensitive' in filtered.columns else 0
    
    marketing_stats = filtered.groupby('asin').agg(
        avg_value=('value_perception_hybrid', 'mean'),
        price_sens=('price_sensitive', 'mean')
    ).reset_index()
    if 'title' in filtered.columns:
        titles = filtered.groupby('asin')['title'].first().reset_index()
        marketing_stats = pd.merge(marketing_stats, titles, on='asin', how='left')
    else:
        marketing_stats['title'] = marketing_stats['asin']
    
    fig_marketing = go.Figure()
    fig_marketing.add_trace(go.Scatter(
        x=marketing_stats['price_sens'], y=marketing_stats['avg_value'],
        mode='markers', text=marketing_stats['title'],
        marker=dict(color='#8884d8', opacity=0.5), name='타사 제품'
    ))
    curr_mk = marketing_stats[marketing_stats['asin'].isin(current_asins)]
    fig_marketing.add_trace(go.Scatter(
        x=curr_mk['price_sens'], y=curr_mk['avg_value'],
        mode='markers', text=curr_mk['title'],
        marker=dict(color='#ff7300', size=15, symbol='diamond'), name='현재 제품'
    ))
    fig_marketing.add_hline(y=0, line_dash="dash", line_color="gray")
    fig_marketing.add_vline(x=0.5, line_dash="dash", line_color="gray")
    fig_marketing.update_layout(title="가치-가격 포지셔닝 맵", xaxis_title="가격 민감도", yaxis_title="가치 인식", template="plotly_white")

    return {
        "has_data": True,
        "search_term": item_name if item_name else item_id,
        "metrics": {
            # Frontend expected metrics
            "total_reviews": total_count,
            "impact_score": metrics.get("impact_score", 0),
            "sentiment_z_score": metrics.get("sentiment_z_score", 0),
            "satisfaction_index": metrics.get("satisfaction_index", 0),
            # Additional metrics
            "nss": round(nss_score, 2),
            "cas": round(cas_score, 2),
            "pqi": round(pqi_score, 2),
            "lfi": round(lfi_rate, 2),
            "spi": round(spi_score, 2),
            "value_score": round(value_score, 2),
            "price_sensitivity": round(price_sensitive_ratio, 2)
        },
        "keywords_analysis": keywords_analysis[:50],
        "diverging_summary": {
            "negative_keywords": [{"keyword": k["keyword"], "impact_score": k["impact_score"], "satisfaction_index": k.get("satisfaction_index", 0)} for k in neg_keywords],
            "positive_keywords": [{"keyword": k["keyword"], "impact_score": k["impact_score"], "satisfaction_index": k.get("satisfaction_index", 0)} for k in pos_keywords]
        },
        "charts": {
            "impact_diverging_bar": json.loads(fig_diverging.to_json()),
            "positivity_bar": json.loads(fig_positivity.to_json()),
            "value_radar": json.loads(fig_radar.to_json()),  # Renamed from sensory_radar
            "nss_gauge": json.loads(fig_nss.to_json()),
            "nss_cas_scatter": json.loads(fig_scatter_nss.to_json()),
            "quality_treemap": json.loads(fig_treemap.to_json()),
            "marketing_matrix": json.loads(fig_marketing.to_json())
        }
    }

@app.get("/dashboard")
async def dashboard():
    if df is None or df.empty:
        return {"has_data": False}
        
    try:
        # 1. Top 5 국가 수출 추세 (Line)
        # 국가별, 월별 합산
        country_trend = df.groupby(['period_str', 'country_name'])['export_value'].sum().reset_index()
        # 총 수출액 기준 Top 5 국가 선정
        top_countries = df.groupby('country_name')['export_value'].sum().nlargest(5).index.tolist()
        country_trend_top = country_trend[country_trend['country_name'].isin(top_countries)]
        
        fig1 = px.line(country_trend_top, x='period_str', y='export_value', color='country_name',
                       title="1. Top 5 국가 수출 추세 (Market Trend)")
        fig1.update_layout(template="plotly_white", margin=dict(l=20, r=20, t=40, b=20), xaxis_title="기간", yaxis_title="수출액 ($)")

        # 2. Top 5 품목 수출 추세 (Line)
        item_trend = df.groupby(['period_str', 'item_name'])['export_value'].sum().reset_index()
        top_items = df.groupby('item_name')['export_value'].sum().nlargest(5).index.tolist()
        item_trend_top = item_trend[item_trend['item_name'].isin(top_items)]
        
        # UI 이름으로 매핑
        item_trend_top['ui_name'] = item_trend_top['item_name'].apply(lambda x: CSV_TO_UI_ITEM_MAPPING.get(x, x))
        
        fig2 = px.line(item_trend_top, x='period_str', y='export_value', color='ui_name',
                       title="2. Top 5 품목 수출 추세 (Product Lifecycle)")
        fig2.update_layout(template="plotly_white", margin=dict(l=20, r=20, t=40, b=20), xaxis_title="기간", yaxis_title="수출액 ($)")

        # 3. 국가별 평균 단가 비교 (Bar - Profitability)
        # 단가 = 총 수출액 / 총 중량 (중량 없으면 unit_price 평균 대용)
        # 여기서는 간단히 unit_price의 평균을 국가별로 비교
        profitability = df.groupby('country_name')['unit_price'].mean().sort_values(ascending=False).reset_index()
        
        fig3 = px.bar(profitability, x='country_name', y='unit_price', color='unit_price',
                      title="3. 국가별 평균 단가 (Profitability Check)", color_continuous_scale='Viridis')
        fig3.update_layout(template="plotly_white", margin=dict(l=20, r=20, t=40, b=20), xaxis_title="국가", yaxis_title="평균 단가 ($/kg)")

        # 4. 시장 포지셔닝 맵 (Scatter - Volume vs Value)
        # 국가별 총 수출액(Value) vs 총 중량(Volume)
        positioning = df.groupby('country_name').agg({
            'export_value': 'sum',
            'export_weight': 'sum'
        }).reset_index()
        
        fig4 = px.scatter(positioning, x='export_weight', y='export_value', text='country_name',
                          size='export_value', color='country_name',
                          title="4. 시장 포지셔닝 (Volume vs Value)")
        fig4.update_traces(textposition='top center')
        fig4.update_layout(template="plotly_white", margin=dict(l=20, r=20, t=40, b=20), 
                           xaxis_title="총 물량 (Volume)", yaxis_title="총 금액 (Value)")

        # 5. 품목별 월별 계절성 (Heatmap)
        # 월(Month) 추출
        df['month'] = df['period_str'].apply(lambda x: x.split('-')[1] if '-' in str(x) else '00')
        seasonality = df[df['item_name'].isin(top_items)].groupby(['item_name', 'month'])['export_value'].sum().reset_index()
        
        # UI 이름 매핑
        seasonality['ui_name'] = seasonality['item_name'].apply(lambda x: CSV_TO_UI_ITEM_MAPPING.get(x, x))
        
        # Pivot for Heatmap: Index=Item, Columns=Month, Values=ExportValue
        heatmap_data = seasonality.pivot(index='ui_name', columns='month', values='export_value').fillna(0)
        # 월 순서 정렬
        sorted_months = sorted(heatmap_data.columns)
        heatmap_data = heatmap_data[sorted_months]
        
        fig5 = px.imshow(heatmap_data, labels=dict(x="월 (Month)", y="품목", color="수출액"),
                         title="5. 계절성 분석 (Seasonality Heatmap)", aspect="auto", color_continuous_scale='OrRd')
        fig5.update_layout(template="plotly_white", margin=dict(l=20, r=20, t=40, b=20))

        return {
            "has_data": True,
            "charts": {
                "top_countries": json.loads(fig1.to_json()),
                "top_items": json.loads(fig2.to_json()),
                "profitability": json.loads(fig3.to_json()),
                "positioning": json.loads(fig4.to_json()),
                "seasonality": json.loads(fig5.to_json())
            }
        }
    except Exception as e:
        print(f"Dashboard Error: {e}")
        return {"has_data": False, "error": str(e)}

if __name__ == "__main__":
    import uvicorn
    for route in app.routes:
        print(f"Route: {route.path} {route.name}")
    uvicorn.run(app, host="0.0.0.0", port=8000)
