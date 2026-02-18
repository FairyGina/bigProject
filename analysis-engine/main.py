from fastapi import FastAPI, HTTPException, Query
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
import pandas as pd
import numpy as np
import json
import re
import ast
import gc
from collections import Counter, OrderedDict
import plotly.express as px
import plotly.graph_objects as go
from plotly.subplots import make_subplots
from typing import Optional, List, Dict, Any
from contextlib import asynccontextmanager
import os
from sklearn.feature_extraction.text import CountVectorizer, ENGLISH_STOP_WORDS
import psycopg2
from sqlalchemy import create_engine, text
from urllib.parse import quote_plus


# =========================================================
# 인사이트 필터링 상수
# =========================================================

# 기존 범용 불용어 (구매/사용 행위 관련)
GENERIC_INSIGHT_STOPWORDS = {
    'good', 'great', 'nice', 'excellent', 'better', 'perfect', 'best', 'like', 'love',
    'really', 'much', 'get', 'well', 'buy', 'purchased', 'recommend', 'recommended',
    'happy', 'satisfied', 'product', 'item', 'bought', 'try', 'tried', 'use', 'used',
    'using', 'add', 'added', 'adding', 'recipe', 'highly', 'food', 'definitely',
    'amazing', 'awesome', 'wonderful', 'bit', 'lot', 'little',
    'ordered', 'received', 'came', 'made', 'make', 'makes', 'everything', 'everyone',
    'anyone', 'anything', 'would', 'could', 'should', 'first', 'second', 'ever', 'never'
}

# [신규] 감각/감정 관련 불용어 — "뻔한 칭찬"을 분석 대상에서 제거
SENSORY_STOPWORDS = {
    'taste', 'tastes', 'tasted', 'flavor', 'flavour', 'smell', 'smells', 'scent',
    'delicious', 'yummy', 'tasty', 'good', 'great', 'bad', 'horrible', 'best',
    'amazing', 'awesome', 'love', 'like', 'really', 'much', 'perfect', 'nice',
    'better', 'excellent', 'favorite', 'quality', 'product', 'item', 'buy', 'buying',
    'bought', 'order', 'ordered', 'definitely', 'highly', 'recommend', 'worth'
}

# 통합 불용어 (CountVectorizer 전달용) — sklearn 기본 + 커스텀
COMBINED_STOP_WORDS = list(ENGLISH_STOP_WORDS | GENERIC_INSIGHT_STOPWORDS | SENSORY_STOPWORDS)

# 순수 식감 형용사 (가중치 대상 — 평가성 단어 제거)
SENSORY_KEYWORDS = {
    'spicy', 'hot', 'sweet', 'savory', 'crunchy', 'crispy', 'salty', 'bitter', 'sour',
    'tangy', 'garlicky', 'smoky', 'smooth', 'creamy', 'chewy', 'tender', 'fresh', 'mild',
    'strong', 'rich', 'bold', 'dark', 'light', 'kick', 'burn', 'acid'
}

# 식감 전용 키워드 사전 (extract_specific_insights에서 사용)
TEXTURE_KEYWORDS = {
    'crunchy', 'crispy', 'chewy', 'soft', 'spicy', 'salty', 'sweet', 'sour',
    'thick', 'thin', 'rich', 'creamy', 'juicy', 'dry', 'moist', 'greasy'
}

# 페어링 재료 키워드
PAIRING_KEYWORDS = {
    'rice', 'noodle', 'noodles', 'chicken', 'meat', 'beef', 'pork', 'pizza', 'sandwich',
    'salad', 'soup', 'topping', 'toppings', 'dip', 'sauce', 'stew', 'fried', 'grilled',
    'bread', 'vegetable', 'vegetables', 'eggs', 'steak', 'burger', 'taco', 'tacos'
}

# 페어링 문맥 마커 (전치사/동사)
PAIRING_MARKERS = {'with', 'add', 'on', 'mix', 'top', 'serve'}


def is_generic_term(term):
    """키워드가 단일 범용 단어이거나, Bigram의 모든 단어가 범용+감각 불용어인 경우 True 반환"""
    words = term.lower().split()
    all_stopwords = GENERIC_INSIGHT_STOPWORDS | SENSORY_STOPWORDS
    return all(w in all_stopwords for w in words)


def calculate_relevance_score(keyword, mention_count, impact_score):
    """키워드의 의미적 가치를 기반으로 점수 계산 (Impact Score 반영 고도화)"""
    words = keyword.lower().split()

    frequency_score = np.log1p(float(mention_count))
    impact_weight = 1.0 + (abs(impact_score) * 1.5)

    has_sensory = any(w in SENSORY_KEYWORDS for w in words)  # 순수 식감만
    has_pairing = any(w in PAIRING_KEYWORDS for w in words)

    multiplier = 1.0
    if has_sensory: multiplier *= 1.8
    if has_pairing: multiplier *= 1.4

    # 범용 단어 페널티 (감각/재료 키워드가 포함되지 않은 경우)
    all_stop = GENERIC_INSIGHT_STOPWORDS | SENSORY_STOPWORDS
    has_generic = any(w in all_stop for w in words)
    if has_generic and not (has_sensory or has_pairing):
        multiplier *= 0.3  # 더 강한 페널티

    return frequency_score * impact_weight * multiplier


def analyze_features(df_filtered):
    """DB 컬럼(texture_terms, ingredients)을 활용한 식감/페어링 분석
    
    CountVectorizer 대신 이미 정제된 컬럼 데이터를 집계하여 정확한 결과를 제공
    """
    result = {"top_textures": [], "top_pairings": []}

    # 1. 식감 (Texture) 분석 — texture_terms 컬럼 활용
    if 'texture_terms' in df_filtered.columns:
        all_textures = []
        for terms in df_filtered['texture_terms'].dropna():
            try:
                parsed = terms if isinstance(terms, list) else ast.literal_eval(str(terms))
                # _ADJ 등 태그 제거, 빈 문자열 스킵
                cleaned = [t.split('_')[0].lower() for t in parsed if t and isinstance(t, str)]
                all_textures.extend(cleaned)
            except (ValueError, SyntaxError):
                pass
        if all_textures:
            result["top_textures"] = [{'term': t, 'count': c} for t, c in Counter(all_textures).most_common(8)]

    # 2. 재료/페어링 (Ingredients) 분석 — ingredients 컬럼 활용
    if 'ingredients' in df_filtered.columns:
        all_ingredients = []
        for ing_list in df_filtered['ingredients'].dropna():
            try:
                parsed = ing_list if isinstance(ing_list, list) else ast.literal_eval(str(ing_list))
                for item in parsed:
                    if isinstance(item, str) and len(item) > 2:
                        clean_item = item.split('_')[0].lower()
                        # NOT_ 접두어 제거, 불용어 제외
                        if clean_item.startswith('not_'):
                            continue
                        if clean_item not in SENSORY_STOPWORDS and clean_item not in GENERIC_INSIGHT_STOPWORDS:
                            all_ingredients.append(clean_item)
            except (ValueError, SyntaxError):
                pass
        if all_ingredients:
            result["top_pairings"] = [{'term': t, 'count': c} for t, c in Counter(all_ingredients).most_common(8)]

    return result


def extract_specific_insights(texts, mode='pairing'):
    """텍스트 패턴 매칭으로 식감/페어링 인사이트 추출 (DB 컬럼 보완용)
    
    mode='pairing': 'with', 'add', 'mix' 뒤에 나오는 명사(재료) 추출
    mode='texture': 식감 형용사가 포함된 문구 추출
    """
    extracted = []

    for text in texts:
        text = str(text).lower()
        words = text.split()

        if mode == 'pairing':
            for i, word in enumerate(words[:-1]):
                if word in PAIRING_MARKERS:
                    target = words[i + 1]
                    if len(target) > 2 and target not in SENSORY_STOPWORDS:
                        extracted.append(f"{word} {target}")

        elif mode == 'texture':
            for i, word in enumerate(words):
                if word in TEXTURE_KEYWORDS:
                    prev = words[i - 1] if i > 0 else ""
                    phrase = f"{prev} {word}".strip()
                    extracted.append(phrase)

    return [{'term': t, 'count': c} for t, c in Counter(extracted).most_common(5)]

# DB 연결 
def parse_spring_datasource_url(url):
    """jdbc:postgresql://host:port/database?params 형식 파싱"""
    if not url:
        return None, None, None
    
    # jdbc: 접두어가 있으면 제거
    if url.startswith("jdbc:"):
        url = url[5:]
        
    # postgresql://host:port/database 처리
    if url.startswith("postgresql://"):
        try:
            # Pattern: postgresql://host:port/database
            # 복잡한 정규식 문제를 피하기 위해 단순 문자열 분할 사용
            without_protocol = url.replace("postgresql://", "")
            
            # host:port 와 path 분리
            if "/" in without_protocol:
                authority, path = without_protocol.split("/", 1)
                db_name = path.split("?")[0] # 쿼리 파라미터 제거
            else:
                authority = without_protocol
                db_name = "postgres" # 기본값

            # host 와 port 분리
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

# Spring 형식을 먼저 시도하고, 레거시 형식으로 폴백
SPRING_URL = os.environ.get("SPRING_DATASOURCE_URL", "")
_parsed_host, _parsed_port, _parsed_db = parse_spring_datasource_url(SPRING_URL)

DB_HOST = _parsed_host or os.environ.get("DB_HOST", "db")
# [Azure Fix] 유닉스 소켓 혼동을 방지하기 위해 '@' 접두어가 있으면 제거
if DB_HOST.startswith("@"):
    print(f"⚠️ DB_HOST '{DB_HOST}' starts with '@'. Removing it to force TCP connection.", flush=True)
    DB_HOST = DB_HOST.lstrip("@")

DB_PORT = _parsed_port or os.environ.get("DB_PORT", "5432")


# [Azure Fix] Prefer parsed DB name directly to respect Azure configuration
# (사용자가 이전 설정이 작동함을 확인했으므로 강제 오버라이드 로직은 되돌림)
DB_NAME = _parsed_db or os.environ.get("POSTGRES_DB", "bigproject")

DB_USER = os.environ.get("SPRING_DATASOURCE_USERNAME") or os.environ.get("POSTGRES_USER", "postgres")
DB_PASS = os.environ.get("SPRING_DATASOURCE_PASSWORD") or os.environ.get("POSTGRES_PASSWORD", "postgres")

# ==========================================
# [진단] 시작 구성 로그
# ==========================================
print("="*60)
print(f"🚀 [Startup Config] Analysis Engine Starting...")
print(f"   DB_HOST: {DB_HOST}")
print(f"   DB_PORT: {DB_PORT}")
print(f"   DB_NAME: {DB_NAME}")
print(f"   DB_USER: {DB_USER}")
# 비밀번호 마스킹
masked_pass = "*" * len(DB_PASS) if DB_PASS else "NONE"
print(f"   DB_PASS: {masked_pass}")
print(f"   SSL_MODE: {os.environ.get('DB_SSLMODE', 'require')}")
print("="*60)

# 풀링된 안정적인 연결을 위한 SQLAlchemy 엔진
def create_db_engine():
    try:
        # SQLAlchemy URL 구성
        # 형식: postgresql://user:password@host:port/dbname
        # [Fix] 특수 문자(예: '@')를 처리하기 위해 자격 증명을 URL 인코드
        encoded_user = quote_plus(DB_USER)
        encoded_pass = quote_plus(DB_PASS)
        conn_str = f"postgresql://{encoded_user}:{encoded_pass}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
        
        # [최적화] Azure DB 슬롯 고갈을 피하기 위해 인스턴스당 작은 풀 사이즈 사용
        # 기본값: pool_size=5, max_overflow=10 (레플리카당 총 15개)
        # 엄격 모드: 스케일링을 지원하기 위해 pool_size=1, max_overflow=2 (레플리카당 총 3개)
        pool_size = int(os.environ.get("DB_POOL_SIZE", 1))
        max_overflow = int(os.environ.get("DB_MAX_OVERFLOW", 2))
        
        engine = create_engine(
            conn_str,
            pool_size=pool_size,
            max_overflow=max_overflow,
            pool_timeout=30,
            pool_pre_ping=True,
            pool_recycle=300,
            connect_args={
                "sslmode": os.environ.get("DB_SSLMODE", "require"),
                "connect_timeout": 10
            }
        )
        return engine
    except Exception as e:
        print(f"❌ Failed to create DB engine: {e}")
        print(f"   Params: host={DB_HOST}, port={DB_PORT}, db={DB_NAME}, user={DB_USER}")
        return None

db_engine = create_db_engine()

# [리팩토링] 불필요한 raw psycopg2 연결 로직 제거 (get_db_connection)
# 모든 DB 액세스는 공유 SQLAlchemy 엔진 'db_engine'을 사용해야 함


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
    "막걸리": "탁주", "쌀 튀밥": "튀긴 쌀", "팽이버섯": "팽이버섯", 
    "표고버섯": "표고버섯", "쌈장 및 양념장": "혼합조미료", "홍삼 엑기스": "홍삼 추출물(extract)"
}

CSV_TO_UI_ITEM_MAPPING = {v: k for k, v in UI_TO_CSV_ITEM_MAPPING.items()}

# 아이템별 검색어(Trend Keyword) 매핑
# 트렌드 데이터 컬럼명 예시: {COUNTRY}_{KEYWORD}_mean
ITEM_TO_TREND_MAPPING = {
    # [Level 3] 핵심 소스 및 장류
    "간장": "SoySauce",          # (수정) Gochujang -> SoySauce (직접 매핑 가능)
    "고추장": "Gochujang",
    "된장": "Doenjang",
    "쌈장 및 양념장": "Ssamjang",
    "김치": "Kimchi",
    "참기름": "SesameOil",       # (추가) 새 트렌드 키 SesameOil 반영
    
    "라면": "Ramen",             # (수정) Ramyun -> Ramen (트렌드 키 이름 일치)
    "국수": "Ramen",             # 면류 트렌드 대푯값으로 Ramen 활용
    "냉면": "Ramen",
    "당면": "GlassNoodles",      # (수정) Ramen -> GlassNoodles (정확한 매핑)
    "만두": "Mandu",             # (추가) KFood -> Mandu 반영
    "즉석밥": "InstantRice",     # (추가) KFood -> InstantRice 반영
    "떡볶이 떡": "RiceCake",      # (수정) Tteokbokki(요리) 대신 RiceCake(재료) 매핑
    "팽이버섯": "Enoki",         # (추가) KFood -> Enoki 반영
    
    # [Level 2] 바이럴 메뉴 (Viral Menu)
    "김밥류": "Kimbap",          # (수정) Gimbap -> Kimbap (트렌드 키 이름 일치)
    
    # [Level 5] 고부가가치 및 건강식품
    "유자": "Yuja",
    "홍삼 엑기스": "Ginseng",    # (추가) KFood -> Ginseng 반영
    "들기름": "PerillaOil",      # (추가) KFood -> PerillaOil 반영

    # [Level 1] 트렌드 키가 없는 경우 상위 범주(KFood)로 매핑
    "소주": "KFood",             # (참고) Soju 트렌드 분석 제외됨
    "막걸리": "KFood",           # (참고) Makgeolli 트렌드 분석 제외됨
    "삼계탕": "KFood",
    "참치 통조림": "KFood",
    "초코파이류": "KFood",
    "쿠키 및 크래커": "KFood",
    "전통 한과/약과": "KFood",
    "인스턴트 커피": "KFood",
    "쌀": "KFood",
    "두부": "KFood",
    "표고버섯": "KFood"
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
        분석된 키워드 딕셔너리 리스트 (impact_score, positivity_rate, sample_reviews 포함)
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
            max_features=1000, # 필터링을 위해 더 많이 추출
            stop_words=COMBINED_STOP_WORDS,
            token_pattern=r'\b[a-zA-Z]{3,}\b'
        )
        
        bigram_matrix = vectorizer.fit_transform(cleaned_texts_no_tags)
        raw_bigram_names = vectorizer.get_feature_names_out()
        raw_bigram_counts = bigram_matrix.sum(axis=0).A1
        
        # 범용 단어 필터링 적용
        bigram_names = []
        bigram_counts = []
        for i, name in enumerate(raw_bigram_names):
            if not is_generic_term(name):
                bigram_names.append(name)
                bigram_counts.append(raw_bigram_counts[i])
        
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
        if count < min_df: # min_df보다 적으면 패스 (CountVectorizer에서 이미 걸러졌겠지만 안전장치)
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
        # FLOAT 오차 방지를 위해 4.9 이상으로 체크
        five_star_ratio = (matching_ratings >= 4.9).mean()
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
    
    # 4. 가중치 기반 정렬: Relevance Score 계산 및 정렬
    for r in results:
        r["relevance_score"] = calculate_relevance_score(r["keyword"], r["mention_count"], r["impact_score"])
    
    # 1차 정렬: Relevance Score (높은 순), 2차 정렬: 언급 횟수
    results = sorted(results, key=lambda x: (-x["relevance_score"], -x["mention_count"]))
    
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

def calculate_growth_matrix(target_df):
    """
    Calculate Growth Matrix Summary from DataFrame
    Returns a DataFrame with columns: ['country', 'item_csv_name', 'weight_growth', 'price_growth', 'total_value']
    """
    if target_df is None or target_df.empty:
        return pd.DataFrame(columns=['country', 'item_csv_name', 'weight_growth', 'price_growth', 'total_value'])

    print("Calculating Growth Matrix...", flush=True)
    summaries = []
    group_cols = ['country_code', 'item_name']
    if 'country_code' not in target_df.columns:
            group_cols = ['country_name', 'item_name']
            
    try:
        grouped = target_df.groupby(group_cols)
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
            
            country_val = name[0]
            # Try to map country code to name if possible for consistency, or vice versa
            # The original code logic was a bit mixed. Let's standardize on storing what we have.
            
            summaries.append({
                'country': country_val,
                'item_csv_name': name[1],
                'weight_growth': round(weight_growth, 1),
                'price_growth': round(price_growth, 1),
                'total_value': total_value
            })
        
        return pd.DataFrame(summaries)
    except Exception as e:
        print(f"❌ Growth Matrix Calculation Failed: {e}", flush=True)
        return pd.DataFrame(columns=['country', 'item_csv_name', 'weight_growth', 'price_growth', 'total_value'])

import threading
import time

def load_data_background(max_retries=3):
    global df, growth_summary_df
    global GLOBAL_MEAN_SENTIMENT, GLOBAL_STD_SENTIMENT, GLOBAL_MEAN_RATING

    print(f"🚀 [백그라운드] 데이터 로딩 시작 (재시도: {max_retries})...", flush=True)
    
    if not db_engine:
        print("❌ DB 엔진이 초기화되지 않았습니다. 데이터 로드를 건너뜁니다.", flush=True)
        return

    # 재시도 메커니즘: 필요한 경우 DB 마이그레이션 대기
    for i in range(max_retries):
        try:
            # SQLAlchemy 연결 관리 사용
            with db_engine.connect() as conn:
                # 1. Load Export Trends
                print(f"DB에서 export_trends 로딩 중 (시도 {i+1}/{max_retries})...", flush=True)
                query = text("SELECT * FROM export_trends")
                
                try:
                    temp_df = pd.read_sql(query, conn)
                except Exception as e:
                    # [지연 로딩] DB가 가득 찬 경우 시작 시 로딩 중단
                    if "remaining connection slots" in str(e) or "too many clients" in str(e):
                        print("⚠️ DB 연결 가득 참 (슬롯 예약됨). 지연 로딩을 위해 초기 데이터 로드를 건너뜁니다.", flush=True)
                        return # 함수 종료, 서버는 빈 데이터로 시작
                    raise e 

                print(f"Loaded {len(temp_df)} rows. Processing...", flush=True)
                
                if not temp_df.empty:
                    # [최적화] 시작 시 trend_data JSONB를 전체적으로 확장하지 않음
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

                    # Numeric Cleanups (메모리 최적화: float64 -> float32)
                    print("Performing numeric cleanup (float32 downcast)...", flush=True)
                    
                    # Explicit type conversion for critical columns to avoid object dtype issues
                    numeric_targets = ['export_value', 'export_weight', 'unit_price', 'exchange_rate', 'gdp_level', 'cpi']
                    for col in numeric_targets:
                        if col in df.columns:
                            df[col] = pd.to_numeric(df[col], errors='coerce').fillna(0).astype(np.float32)

                    numeric_cols = df.select_dtypes(include=[np.number]).columns
                    df[numeric_cols] = df[numeric_cols].fillna(0)
                    
                    # Growth Matrix Calculation
                    growth_summary_df = calculate_growth_matrix(df)
                    print("Export Trends Loaded & Matrix Calculated.", flush=True)
                    
                    # 2. 글로벌 소비자 통계 (1단계 성공 시에만)
                    print("Calculating Global Consumer Stats from DB...", flush=True)
                    try:
                        result = conn.execute(text("SELECT AVG(sentiment_score), STDDEV(sentiment_score), AVG(rating) FROM amazon_reviews")).fetchone()
                        if result and result[0] is not None:
                                GLOBAL_MEAN_SENTIMENT = float(result[0])
                                GLOBAL_STD_SENTIMENT = float(result[1]) if result[1] is not None else 0.3
                                GLOBAL_MEAN_RATING = float(result[2])
                                print(f"Global Stats: Sent={GLOBAL_MEAN_SENTIMENT:.2f}, Std={GLOBAL_STD_SENTIMENT:.2f}, Rating={GLOBAL_MEAN_RATING:.2f}", flush=True)
                        else:
                                print("⚠️ amazon_reviews table empty or stats unavailable.", flush=True)
                    except Exception as ex:
                        print(f"Global Stats calculation failed: {ex}", flush=True)
                    
                    break # 성공, 재시도 루프 종료
                    
                else:
                    print(f"⚠️ export_trends table is empty. Migration might be in progress... (Attempt {i+1}/{max_retries})", flush=True)
                    time.sleep(5) # 마이그레이션 대기

        except Exception as e:
            print(f"DB Load Failed (Attempt {i+1}/{max_retries}): {e}", flush=True)
            time.sleep(5) # 재시도 전 대기
    
    # [Fallback] If DB failed, try loading from local CSV
    if df is None or df.empty: 
        print("❌ 최종: 재시도 후에도 데이터를 로드할 수 없습니다. 앱이 빈 상태로 실행됩니다.", flush=True)
        df = pd.DataFrame()
        growth_summary_df = pd.DataFrame()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # 데이터 로드 전 요청이 들어올 경우 오류를 방지하기 위해 먼저 빈 데이터로 초기화
    global df, growth_summary_df
    df = pd.DataFrame()
    growth_summary_df = pd.DataFrame()

    print("🚀 서버 시작 중... 백그라운드 데이터 로드 트리거.", flush=True)
    
    # 데이터 로딩을 위한 백그라운드 스레드 시작 (지연 로딩 모드)
    # 서버 기동을 방해하지 않으므로 Readiness Probe가 즉시 통과될 수 있음.
    loader_thread = threading.Thread(target=load_data_background, args=(3,), daemon=True)
    loader_thread.start()

    yield
    print("서버 종료 중...", flush=True)

app = FastAPI(title="K-Food Export Analysis Engine", lifespan=lifespan)

# [Phase 1] GZip 압축 미들웨어 — 응답 데이터 1KB 이상이면 자동 gzip 압축
app.add_middleware(GZipMiddleware, minimum_size=1000)

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
    
    # [디버그] 들어오는 요청 로그
    # print(f"[Analyze] Request: country={country}, item={item}", flush=True)
    
    # 1. 매핑 및 유효성 검사
    country_name = REVERSE_MAPPING.get(country, country) # 코드(US) -> 이름(미국)
    if country in COUNTRY_MAPPING: # 입력이 한글(미국)이면 코드로 변환
         country_code = COUNTRY_MAPPING[country]
         country_name = country
    else:
         country_code = country # 입력이 코드(US)면 그대로
         
    csv_item_name = UI_TO_CSV_ITEM_MAPPING.get(item, item)
    # print(f"[Analyze] Mapped: country_name={country_name}, country_code={country_code}, csv_item={csv_item_name}", flush=True)

    # [강건성] 데이터 로드 여부 확인
    if df is None or df.empty:
         print("❌ [Analyze] Error: Data not loaded (df is empty or None).", flush=True)
         raise HTTPException(status_code=503, detail="Analysis data is not available yet. System is retrying connection.")

    # [진단] 필수 컬럼 확인
    if 'country_name' not in df.columns or 'item_name' not in df.columns:
        print(f"❌ [Analyze] Error: Missing required columns in df. Columns: {list(df.columns)}", flush=True)
        raise HTTPException(status_code=500, detail="Server Data Error: Invalid Data Schema")
    
    # 데이터 필터링
    filtered = df[
        (df['country_name'] == country_name) & 
        (df['item_name'] == csv_item_name)
    ].copy()
    
    # print(f"[Analyze] Filtered rows: {len(filtered)}", flush=True)
    
    if filtered.empty or (filtered['export_value'].sum() == 0):
        # print(f"[Analyze] No data found for {country_name} - {csv_item_name}", flush=True)
        return {"has_data": False}

    # 날짜순 정렬 (period_str: 2022.01, 2022.1 등 혼용 대응)
    if not filtered.empty:
        # 2022.1 -> 2022.01 변환 및 정규화
        def normalize_period(p):
            if not isinstance(p, str): return p
            parts = p.split('.')
            if len(parts) == 2:
                return f"{parts[0]}.{parts[1].zfill(2)}"
            return p
            
        filtered['period_str'] = filtered['period_str'].apply(normalize_period)
        filtered = filtered.sort_values('period_str')

    # ---------------------------------------------------------
    # Chart 1: Trend Stack (수출액 + 환율 증감률 + GDP 증감률)
    # ---------------------------------------------------------
    rows = 2
    titles = [f"📊 {country_name} {item} 수출액 추이", f"💱 {country_name} 환율 증감률 (%)"]
    if 'gdp_level' in filtered.columns:
        rows = 3
        titles.append(f"📈 {country_name} GDP 증감률 (MoM %)")
        
    fig_stack = make_subplots(rows=rows, cols=1, shared_xaxes=True, 
                              vertical_spacing=0.12, subplot_titles=titles)
                              
    # Row 1: Export Value (Bar + Color Gradient)
    export_values = filtered['export_value']
    fig_stack.add_trace(go.Bar(
        x=filtered['period_str'], y=export_values, name="수출액 ($)",
        marker=dict(color=export_values, colorscale='Purples'),
        hovertemplate='%{x}<br>수출액: $%{y:,.0f}<extra></extra>'
    ), row=1, col=1)
    
    # ★ 최고점/최저점 주석(Annotation)
    if len(filtered) >= 3:
        max_idx = export_values.idxmax()
        min_idx = export_values[export_values > 0].idxmin() if (export_values > 0).any() else export_values.idxmin()
        max_val = export_values[max_idx]
        min_val = export_values[min_idx]
        max_period = filtered.loc[max_idx, 'period_str']
        min_period = filtered.loc[min_idx, 'period_str']
        
        fig_stack.add_annotation(
            x=max_period, y=max_val, text=f"<b>최고</b> ${max_val:,.0f}",
            showarrow=True, arrowhead=2, arrowcolor="#7c3aed",
            font=dict(color="#7c3aed", size=12, family="Arial Black"),
            bgcolor="rgba(124,58,237,0.1)", bordercolor="#7c3aed", borderwidth=1,
            borderpad=4, row=1, col=1
        )
        fig_stack.add_annotation(
            x=min_period, y=min_val, text=f"<b>최저</b> ${min_val:,.0f}",
            showarrow=True, arrowhead=2, arrowcolor="#ef4444",
            font=dict(color="#ef4444", size=11),
            bgcolor="rgba(239,68,68,0.1)", bordercolor="#ef4444", borderwidth=1,
            borderpad=4, row=1, col=1
        )
    
    # ★ 평균선 추가
    avg_export = export_values.mean()
    fig_stack.add_hline(y=avg_export, line_dash="dash", line_color="#94a3b8", line_width=1,
                        annotation_text=f"평균 ${avg_export:,.0f}", annotation_position="top right",
                        annotation_font=dict(size=10, color="#94a3b8"), row=1, col=1)
    
    # ★ YoY 성장률 계산 (인사이트용)
    trend_summary_parts = []
    if len(filtered) >= 12:
        recent_6m = export_values.tail(6).sum()
        prev_6m = export_values.iloc[-12:-6].sum()
        if prev_6m > 0:
            yoy_growth = ((recent_6m - prev_6m) / prev_6m) * 100
            if yoy_growth > 0:
                trend_summary_parts.append(f"최근 6개월 수출액이 전기 대비 +{yoy_growth:.1f}% 성장했습니다 📈")
            else:
                trend_summary_parts.append(f"최근 6개월 수출액이 전기 대비 {yoy_growth:.1f}% 감소했습니다 📉")
    elif len(filtered) >= 2:
        last_val = export_values.iloc[-1]
        first_val = export_values.iloc[0]
        if first_val > 0:
            total_growth = ((last_val - first_val) / first_val) * 100
            trend_summary_parts.append(f"전체 기간 수출액이 {total_growth:+.1f}% 변동했습니다")
    
    # Row 2: Exchange Rate 증감률 (Bar with red/green)
    exchange_rate_pct = filtered['exchange_rate'].pct_change().fillna(0) * 100
    exchange_colors = ['#ef4444' if v < 0 else '#22c55e' for v in exchange_rate_pct]
    fig_stack.add_trace(go.Bar(
        x=filtered['period_str'], y=exchange_rate_pct.round(2), name="환율 증감률",
        marker=dict(color=exchange_colors),
        hovertemplate='%{x}<br>증감률: %{y:.2f}%<extra></extra>'
    ), row=2, col=1)
    
    # ★ 환율-수출 상관관계 분석
    try:
        corr_exchange = export_values.corr(filtered['exchange_rate'])
        if not np.isnan(corr_exchange):
            corr_label = "강한 양의 상관" if corr_exchange > 0.5 else "강한 음의 상관" if corr_exchange < -0.5 else "약한 상관"
            if abs(corr_exchange) > 0.3:
                trend_summary_parts.append(f"환율과 수출액의 상관계수: {corr_exchange:.2f} ({corr_label})")
    except:
        pass
    
    # Row 3: GDP 증감률 수정
    if rows == 3:
        # [수정] 품목 필터링과 무관하게 해당 국가의 전체 GDP 시계열 확보 (2025년 끊김 방지)
        gdp_full = df[df['country_name'] == country_name][['period_str', 'gdp_level']].drop_duplicates('period_str').sort_values('period_str')
        
        # 1. 중복 값(계단)을 NaN으로 마스킹하여 "점"으로 만듦
        # 0 제거 및 정규화된 period_str 기반 정렬
        gdp_full['period_str'] = gdp_full['period_str'].apply(normalize_period)
        gdp_full = gdp_full.sort_values('period_str')
        
        gdp_series = gdp_full['gdp_level'].replace(to_replace=0, method='ffill')
        mask = gdp_series != gdp_series.shift(1)
        gdp_masked = gdp_series.where(mask)
        
        # 2. 선형 보간 (Linear Interpolation)으로 "선"으로 이음 -> 월별 부드러운 성장
        gdp_interpolated = gdp_masked.interpolate(method='linear', limit_direction='both')

        fig_stack.add_trace(go.Scatter(
            x=gdp_full['period_str'], 
            y=gdp_interpolated, 
            name="GDP",
            line=dict(color='#10b981', width=2, dash='dot'),
            hovertemplate='%{x}<br>GDP: %{y:,.0f}<extra></extra>'
        ), row=3, col=1)

    fig_stack.update_layout(
        height=600 if rows == 3 else 450, 
        template="plotly_white", 
        showlegend=False,
        margin=dict(l=40, r=20, t=60, b=40)
    )
    
    trend_insight = " | ".join(trend_summary_parts) if trend_summary_parts else f"{country_name} {item} 수출 추이를 확인하세요"

    # ---------------------------------------------------------
    # Chart 2: Signal Map (Leading-Lagging)
    # ---------------------------------------------------------
    fig_signal = make_subplots(specs=[[{"secondary_y": True}]])
    
    common_trend_key = f"{country_code}_KFood_mean"
    
    # 딕셔너리에서 값을 안전하게 가져오기 위한 헬퍼
    def get_trend_val(row, key):
        td = row.get('trend_data', {})
        if not isinstance(td, dict): return None
        return td.get(key)

    # 1. 공통 선행 지표: 전체 K-Food 관심도 (기준점)
    # 첫 번째 행에 이 키의 데이터가 있는지 확인 (샘플로서)
    has_common = False
    first_trend_data = filtered.iloc[0].get('trend_data', {}) if not filtered.empty else {}
    if isinstance(first_trend_data, dict) and common_trend_key in first_trend_data:
        has_common = True
        
    if has_common:
        # 시계열 추출
        y_common = filtered.apply(lambda r: get_trend_val(r, common_trend_key), axis=1)
        fig_signal.add_trace(go.Scatter(
            x=filtered['period_str'], y=y_common, 
            name="K-Food 전체 관심도",
            line=dict(color='#94a3b8', width=2, dash='dot'), # 차분한 회색 점선 (가독성 향상)
            opacity=0.8
        ), secondary_y=True)

    # 2. 개별 선행 지표: 1:1 매핑된 품목 관심도
    trend_kw = ITEM_TO_TREND_MAPPING.get(item)
    # KFood와 중복되지 않는 경우에만 추가로 그림
    if trend_kw and trend_kw != "KFood":
        specific_trend_key = f"{country_code}_{trend_kw}_mean"
        
        # 존재 여부 확인
        has_specific = False
        if isinstance(first_trend_data, dict) and specific_trend_key in first_trend_data:
             has_specific = True
             
        if has_specific:
            y_specific = filtered.apply(lambda r: get_trend_val(r, specific_trend_key), axis=1)
            fig_signal.add_trace(go.Scatter(
                x=filtered['period_str'], y=y_specific, 
                name=f"품목 관심도 ({trend_kw})",
                line=dict(color='#6366f1', width=3), # 인디고 색상으로 변경 (너무 튀지 않게)
                mode='lines+markers'
            ), secondary_y=True)
            
        # KFood도 없고 매핑도 없을 때만 아무 트렌드나 하나 찾아서 표시 (폴백)
        # 첫 번째 행의 trend_data 내부에서 _mean으로 끝나는 키를 하나 찾음
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

    # 3. 후행 지표: 실적(수출액) - Bar Chart (배경 역할)
    fig_signal.add_trace(go.Bar(
        x=filtered['period_str'], y=filtered['export_value'], name="수출 실적 ($)",
        marker=dict(color='rgba(99, 102, 241, 0.3)'),
        hovertemplate='%{x}<br>수출액: $%{y:,.0f}<extra></extra>'
    ), secondary_y=False)
    
    # ★ 관심도-수출 상관계수 계산 & 피크 주석(Annotation)
    signal_summary_parts = []
    signal_corr_text = ""
    
    # 관심도 데이터 추출 (가장 적합한 데이터로)
    trend_series = None
    trend_label = ""
    if trend_kw and trend_kw != "KFood":
        specific_key = f"{country_code}_{trend_kw}_mean"
        if isinstance(first_trend_data, dict) and specific_key in first_trend_data:
            trend_series = filtered.apply(lambda r: get_trend_val(r, specific_key), axis=1)
            trend_label = trend_kw
    if trend_series is None and has_common:
        trend_series = filtered.apply(lambda r: get_trend_val(r, common_trend_key), axis=1)
        trend_label = "K-Food"
    
    if trend_series is not None:
        trend_clean = trend_series.dropna()
        export_clean = filtered.loc[trend_clean.index, 'export_value']
        
        try:
            corr_val = trend_clean.astype(float).corr(export_clean.astype(float))
            if not np.isnan(corr_val):
                corr_strength = "강한" if abs(corr_val) > 0.5 else "중간" if abs(corr_val) > 0.3 else "약한"
                corr_direction = "양의" if corr_val > 0 else "음의"
                signal_corr_text = f" (r={corr_val:.2f})"
                signal_summary_parts.append(f"관심도와 수출 실적의 {corr_strength} {corr_direction} 상관관계 (r={corr_val:.2f})")
        except:
            pass
        
        # ★ 관심도 피크 자동 주석(Annotation)
        try:
            trend_numeric = trend_clean.astype(float)
            if len(trend_numeric) >= 4:
                mean_trend = trend_numeric.mean()
                std_trend = trend_numeric.std()
                threshold = mean_trend + std_trend * 1.2
                
                peaks = trend_numeric[trend_numeric > threshold]
                for peak_idx in peaks.index[:3]:  # 최대 3개 피크만
                    peak_val = trend_numeric[peak_idx]
                    peak_period = filtered.loc[peak_idx, 'period_str']
                    fig_signal.add_annotation(
                        x=peak_period, y=float(peak_val), text="🔥 관심 급등",
                        showarrow=True, arrowhead=2, arrowcolor="#f43f5e",
                        font=dict(color="#f43f5e", size=10),
                        bgcolor="rgba(244,63,94,0.1)", bordercolor="#f43f5e", borderwidth=1,
                        borderpad=3, secondary_y=True
                    )
        except:
            pass
    
    if not signal_summary_parts:
        signal_summary_parts.append(f"{country_name}에서의 {item} 관심도와 수출 실적 시차를 비교합니다")
    
    signal_insight = " | ".join(signal_summary_parts)
    
    fig_signal.update_layout(
        template="plotly_white",
        height=420,
        legend=dict(orientation="h", y=1.12, x=0.5, xanchor='center'),
        margin=dict(l=50, r=50, t=30, b=40) # 제목 제거에 따른 여백 조정
    )
    fig_signal.update_yaxes(title_text="수출액 ($)", secondary_y=False, showgrid=False)
    fig_signal.update_yaxes(title_text="관심도 Index", secondary_y=True, showgrid=False)

    # ---------------------------------------------------------
    # Chart 3: Growth Matrix (Scatter Plot)
    # ---------------------------------------------------------
    country_matrix = growth_summary_df[growth_summary_df['country'] == country_code].copy()
    fig_scatter = go.Figure()
    growth_diagnosis = ""
    
    if not country_matrix.empty and not country_matrix[country_matrix['item_csv_name'] == csv_item_name].empty:
        country_matrix['ui_name'] = country_matrix['item_csv_name'].apply(lambda x: CSV_TO_UI_ITEM_MAPPING.get(x, x))
        
        curr = country_matrix[country_matrix['item_csv_name'] == csv_item_name]
        others = country_matrix[country_matrix['item_csv_name'] != csv_item_name]
        
        # ★ 기타 품목 — 상위 5개에만 라벨 표시
        others_sorted = others.sort_values('weight_growth', ascending=False)
        top_others = others_sorted.head(5)
        rest_others = others_sorted.iloc[5:]
        
        # 나머지 품목 (라벨 없음)
        if not rest_others.empty:
            fig_scatter.add_trace(go.Scatter(
                x=np.clip(rest_others['weight_growth'], -150, 150), 
                y=np.clip(rest_others['price_growth'], -50, 50),
                mode='markers',
                marker=dict(size=8, color='#cbd5e1', opacity=0.3),
                text=rest_others['ui_name'], name="타 품목",
                hovertemplate="<b>%{text}</b><br>양적: %{x}%<br>질적: %{y}%"
            ))
        
        # 상위 5개 품목 (라벨 표시)
        if not top_others.empty:
            fig_scatter.add_trace(go.Scatter(
                x=np.clip(top_others['weight_growth'], -150, 150), 
                y=np.clip(top_others['price_growth'], -50, 50),
                mode='markers+text',
                marker=dict(size=11, color='#94a3b8', opacity=0.6),
                text=top_others['ui_name'], textposition="top center",
                textfont=dict(size=10, color='#64748b'),
                name="주요 품목",
                hovertemplate="<b>%{text}</b><br>양적: %{x}%<br>질적: %{y}%"
            ))
        
        # ★ 현재 품목 — 링 마커 효과 (외곽 큰 원 + 내부 원)
        curr_x_clamped = np.clip(curr['weight_growth'], -150, 150)
        curr_y_clamped = np.clip(curr['price_growth'], -50, 50)
        
        fig_scatter.add_trace(go.Scatter(
            x=curr_x_clamped, y=curr_y_clamped,
            mode='markers',
            marker=dict(size=35, color='rgba(244,63,94,0.15)', line=dict(width=3, color='#f43f5e')),
            showlegend=False, hoverinfo='skip'
        ))
        fig_scatter.add_trace(go.Scatter(
            x=curr_x_clamped, y=curr_y_clamped,
            mode='markers+text',
            marker=dict(size=20, color='#f43f5e', line=dict(width=2, color='white')),
            text=curr['ui_name'], textposition="top center",
            textfont=dict(size=15, color='#f43f5e', family="Arial Black"),
            name=item,
            hovertemplate="<b>%{text}</b> (현재)<br>양적: %{x}%<br>질적: %{y}%"
        ))
        
        # 사분면 진단 메시지 생성
        curr_wg = curr['weight_growth'].values[0]
        curr_pg = curr['price_growth'].values[0]
        
        if curr_wg >= 0 and curr_pg >= 0:
            growth_diagnosis = f"🌟 {item}: 고부가가치 성장 중! 물량(+{curr_wg:.1f}%)과 단가(+{curr_pg:.1f}%)가 모두 상승하고 있습니다"
        elif curr_wg < 0 and curr_pg >= 0:
            growth_diagnosis = f"⚠️ {item}: 단가는 +{curr_pg:.1f}% 상승했지만 물량이 {curr_wg:.1f}% 감소 중. 시장 축소 주의"
        elif curr_wg < 0 and curr_pg < 0:
            growth_diagnosis = f"🔻 {item}: 물량({curr_wg:.1f}%)과 단가({curr_pg:.1f}%) 모두 하락. 시장 재진입 전략 필요"
        else:
            growth_diagnosis = f"📦 {item}: 물량은 +{curr_wg:.1f}% 증가하지만 단가가 {curr_pg:.1f}% 하락. 가격 경쟁력 전략 확인 필요"
        
        # Quadrant Lines
        fig_scatter.add_hline(y=0, line_dash="solid", line_color="#94a3b8", line_width=2)
        fig_scatter.add_vline(x=0, line_dash="solid", line_color="#94a3b8", line_width=2)
        
        # 사분면 배경 쉐이딩 - 고정 스케일 기반 (150%, 50%)
        x_limit = 150
        y_limit = 50
        
        fig_scatter.add_shape(type="rect", x0=0, y0=0, x1=x_limit, y1=y_limit, fillcolor="rgba(16, 185, 129, 0.06)", line_width=0, layer="below")
        fig_scatter.add_shape(type="rect", x0=-x_limit, y0=0, x1=0, y1=y_limit, fillcolor="rgba(245, 158, 11, 0.06)", line_width=0, layer="below")
        fig_scatter.add_shape(type="rect", x0=-x_limit, y0=-y_limit, x1=0, y1=0, fillcolor="rgba(239, 68, 68, 0.06)", line_width=0, layer="below")
        fig_scatter.add_shape(type="rect", x0=0, y0=-y_limit, x1=x_limit, y1=0, fillcolor="rgba(59, 130, 246, 0.06)", line_width=0, layer="below")
        
        # 4사분면 라벨 — 고정 위치
        fig_scatter.add_annotation(x=x_limit*0.7, y=y_limit*0.85, text="🌟 Premium<br>(고부가가치 성장)", showarrow=False, font=dict(color="#10b981", size=14, family="Arial Black"), xanchor="center", opacity=0.9)
        fig_scatter.add_annotation(x=-x_limit*0.7, y=y_limit*0.85, text="⚠️ 단가 상승<br>(물량 감소 주의)", showarrow=False, font=dict(color="#f59e0b", size=14, family="Arial Black"), xanchor="center", opacity=0.9)
        fig_scatter.add_annotation(x=-x_limit*0.7, y=-y_limit*0.85, text="🔻 전면 위축<br>(재진입 전략 필요)", showarrow=False, font=dict(color="#ef4444", size=14, family="Arial Black"), xanchor="center", opacity=0.9)
        fig_scatter.add_annotation(x=x_limit*0.7, y=-y_limit*0.85, text="📦 Volume Driven<br>(박리다매 경쟁)", showarrow=False, font=dict(color="#3b82f6", size=14, family="Arial Black"), xanchor="center", opacity=0.9)
        
        fig_scatter.update_layout(
            title=f"성장의 질 — {item} in {country_name}",
            xaxis_title="양적 성장 (물량 증가율 %)",
            yaxis_title="질적 성장 (단가 증가율 %)",
            template="plotly_white",
            height=520,
            showlegend=False,
            margin=dict(l=50, r=30, t=70, b=40),
            xaxis=dict(range=[-x_limit, x_limit], zeroline=False),
            yaxis=dict(range=[-y_limit, y_limit], zeroline=False)
        )
    else:
        # 데이터가 부족해서 매트릭스를 그릴 수 없을 때 빈 차트
        growth_diagnosis = f"⚪ {item}의 성장 매트릭스 데이터가 충분하지 않습니다"
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
        },
        "insights": {
            "trend_summary": trend_insight,
            "signal_summary": signal_insight,
            "growth_diagnosis": growth_diagnosis
        }
    }

def generate_business_insights(df):
    """
    검색된 데이터(df)를 기반으로 비즈니스 의사결정용 심화 차트 4종을 생성합니다.
    """
    charts = {}

    # [차트 1] 평점 vs 실제 감성 점수 비교 (Review Reliability)
    if 'sentiment_score' in df.columns and 'rating' in df.columns:
        try:
            sentiment_by_rating = df.groupby('rating')['sentiment_score'].mean().round(2).reset_index()
            fig1 = px.bar(sentiment_by_rating, x='rating', y='sentiment_score',
                          title="평점 대비 실제 감성 점수 (진정성 분석)",
                          labels={'rating': '별점', 'sentiment_score': '평균 감성 점수'},
                          color='sentiment_score', color_continuous_scale='Blues')
            fig1.update_layout(template="plotly_white")
            charts['sentiment_analysis'] = json.loads(fig1.to_json())
        except Exception as e:
            print(f"[Insights] Chart 1 Error: {e}")

    # [차트 2] 재구매 의도 저해 요인 분석 (Churn Drivers)
    metrics = ['quality_issues_semantic', 'delivery_issues_semantic', 'price_sensitive']
    metric_labels = {'quality_issues_semantic': '품질 이슈', 
                     'delivery_issues_semantic': '배송 이슈', 
                     'price_sensitive': '가격 민감도'}
    
    repurchase_data = []
    for m in metrics:
        if m in df.columns:
            try:
                # 리스트 컬럼(이슈 등)은 "이슈 유무"로 변환하여 그룹화
                if m in ['quality_issues_semantic', 'delivery_issues_semantic']:
                    def has_issue(x):
                        # 1. 결측치(None, NaN) 체크
                        if x is None or pd.isna(x): return False
                        
                        # 2. 리스트 타입 체크 (빈 리스트면 False)
                        if isinstance(x, list): return len(x) > 0
                        
                        # 3. 문자열 타입 체크 ('False'라는 텍스트면 False)
                        if isinstance(x, str):
                            if x.lower() == 'false': return False
                            return bool(x)
                            
                        # 4. 그 외(Boolean, Numpy Bool, Int 등)는 파이썬 기본 로직으로 판별
                        return bool(x)
                    condition = df[m].apply(has_issue)
                else:
                    condition = df[m].fillna(0).astype(bool)
                
                temp_df = pd.DataFrame({
                    'Condition': condition,
                    'repurchase_intent_hybrid': df['repurchase_intent_hybrid']
                })
                
                group = temp_df.groupby('Condition')['repurchase_intent_hybrid'].mean().round(2).reset_index()
                group.columns = ['Condition', 'Rate']
                group['Factor'] = metric_labels[m]
                
                # True/False 매핑
                group['Condition'] = group['Condition'].map({True: '이슈 있음', False: '이슈 없음'})
                repurchase_data.append(group)
            except Exception as e:
                print(f"[Insights] Chart 2 Loop Error ({m}): {e}")
    
    if repurchase_data:
        try:
            rep_df = pd.concat(repurchase_data)
            fig2 = px.bar(rep_df, x='Factor', y='Rate', color='Condition', barmode='group',
                          title="이슈별 재구매 의도 변화 (이탈 요인 분석)",
                          labels={'Rate': '재구매 의도 확률', 'Factor': '주요 요인'},
                          color_discrete_map={'이슈 있음': '#EF553B', '이슈 없음': '#636EFA'})
            fig2.update_layout(template="plotly_white")
            charts['repurchase_drivers'] = json.loads(fig2.to_json())
        except Exception as e:
            print(f"[Insights] Chart 2 Build Error: {e}")


    # [차트 3] 주요 불만 유형별 평점 타격 (Rating Impact)
    if 'semantic_top_dimension' in df.columns and 'rating' in df.columns:
        try:
            # None 제거
            valid_df = df.dropna(subset=['semantic_top_dimension'])
            if not valid_df.empty:
                top_issues = valid_df['semantic_top_dimension'].value_counts().head(5).index
                issue_ratings = valid_df[valid_df['semantic_top_dimension'].isin(top_issues)].groupby('semantic_top_dimension')['rating'].mean().round(2).reset_index().sort_values('rating')
                
                fig3 = px.bar(issue_ratings, x='rating', y='semantic_top_dimension', orientation='h',
                              title="주요 이슈 유형별 평균 평점 (리스크 요인)",
                              labels={'rating': '평균 별점', 'semantic_top_dimension': '이슈 유형'},
                              color='rating', color_continuous_scale='Reds_r')
                fig3.update_layout(template="plotly_white")
                charts['issue_impact'] = json.loads(fig3.to_json())
        except Exception as e:
            print(f"[Insights] Chart 3 Error: {e}")

    # [차트 4] 긍정적 식감 키워드 TOP 10 (Texture Analysis)
    def safe_parse(x):
        try: 
            if isinstance(x, list): return x
            return ast.literal_eval(x)
        except: return []

    if 'texture_terms' in df.columns:
        try:
            temp_df = df.copy()
            temp_df['texture_list'] = temp_df['texture_terms'].apply(safe_parse)
            exploded = temp_df.explode('texture_list').dropna(subset=['texture_list'])
            
            if not exploded.empty:
                texture_stats = exploded.groupby('texture_list').agg(
                    count=('sentiment_score', 'count'),
                    avg_sentiment=('sentiment_score', 'mean')
                ).reset_index()
                
                # 빈도수 3회 이상인 것 중 (데이터 적을 수 있으므로 5->3 완화)
                top_textures = texture_stats[texture_stats['count'] >= 3].sort_values('avg_sentiment', ascending=False).head(10).round(2)
                
                if not top_textures.empty:
                    fig4 = px.bar(top_textures, x='avg_sentiment', y='texture_list', orientation='h',
                                  title="고객이 선호하는 식감 키워드 Top 10",
                                  labels={'avg_sentiment': '감성 점수', 'texture_list': '식감 표현'},
                                  color='avg_sentiment', color_continuous_scale='Greens')
                    fig4.update_layout(template="plotly_white")
                    charts['texture_keywords'] = json.loads(fig4.to_json())
        except Exception as e:
            print(f"[Insights] Chart 4 Error: {e}")

    return charts


def extract_improvement_priorities(df):
    """부정 리뷰(Rating <= 3)에서 주요 키워드 추출하여 개선 우선순위 제안"""
    # 3점 이하를 부정으로 간주
    negative_df = df[df['rating'] <= 3]
    if negative_df.empty:
        return []
    
    # quality_issues_semantic 컬럼 활용
    issues = []
    if 'quality_issues_semantic' in negative_df.columns:
        for items in negative_df['quality_issues_semantic']:
            try:
                # items는 JSON string 형태일 수 있음
                if isinstance(items, str):
                    parsed = json.loads(items)
                    if isinstance(parsed, list):
                        issues.extend(parsed)
                elif isinstance(items, list):
                    issues.extend(items)
            except:
                pass
            
    if not issues:
        # 컬럼 데이터가 없으면 cleaned_text에서 간단한 빈도 분석 (폴백)
        # 하지만 여기서는 간단히 빈 리스트 반환하거나, 추후 확장
        return []

    # 빈도수 상위 5개 추출
    counter = Counter(issues)
    top_issues = counter.most_common(5)

    return [{"issue": issue, "count": count, "priority": "High" if i < 2 else "Medium"}
            for i, (issue, count) in enumerate(top_issues)]

# [Phase 1] LRU 캠시 도입 — 무한 성장 방지 (OrderedDict 기반, 최대 50개)
MAX_CACHE_SIZE = 50
CONSUMER_CACHE = OrderedDict()
CACHE_TTL = 300  # 5 minutes

def set_cache(key, value):
    """LRU 캠시 설정: 최대 크기 초과 시 가장 오래된 항목 삭제"""
    if key in CONSUMER_CACHE:
        CONSUMER_CACHE.move_to_end(key)
    elif len(CONSUMER_CACHE) >= MAX_CACHE_SIZE:
        CONSUMER_CACHE.popitem(last=False)  # 가장 오래된 항목 삭제
    CONSUMER_CACHE[key] = (value, time.time())

def get_cache(key):
    """캠시 조회: TTL 만료 시 None 반환 및 자동 삭제"""
    if key in CONSUMER_CACHE:
        cached_val, timestamp = CONSUMER_CACHE[key]
        if time.time() - timestamp < CACHE_TTL:
            CONSUMER_CACHE.move_to_end(key)  # LRU 갱신
            return cached_val
        else:
            del CONSUMER_CACHE[key]  # TTL 만료 삭제
    return None

@app.get("/analyze/consumer")
async def analyze_consumer(item_id: str = Query(None, description="ASIN"), item_name: str = Query(None, description="제품명/키워드")):

    # 0. LRU 캐시 조회
    cache_key = f"{item_id}_{item_name}"
    
    cached_result = get_cache(cache_key)
    if cached_result is not None:
        return cached_result
    
    # 0. 키워드 치환 (검색량 부족 이슈 해결)
    if item_name:
        # Gochujang 관련 키워드가 들어오면 Kimchi로 우회하여 풍부한 데이터 제공
        target_keywords = ['gochujang', 'red pepper paste', 'hot pepper paste', 'korean paste']
        if any(k in item_name.lower() for k in target_keywords):
            print(f"[Consumer] Remapping '{item_name}' to 'Kimchi' for sufficient data analysis.", flush=True)
            item_name = 'Kimchi'
    
    # [Fix] 클라우드에서의 안정적인 검색을 위해 SQLAlchemy 엔진 사용
    try:
        # [Phase 2] SELECT * 대신 분석에 필요한 컬럼만 명시적으로 요청하여 메모리 절감
        SELECTED_COLUMNS = "asin, title, rating, sentiment_score, cleaned_text, original_text, texture_terms, ingredients, quality_issues_semantic, delivery_issues_semantic, packaging_keywords, repurchase_intent_hybrid, recommendation_intent_hybrid, value_perception_hybrid, price_sensitive, sensory_conflict, review_text_keywords, title_keywords, flavor_terms, price"
        if db_engine:
            if item_name:
                query = text(f"""
                    SELECT {SELECTED_COLUMNS} FROM amazon_reviews 
                    WHERE COALESCE(title, '') ILIKE :search 
                       OR COALESCE(cleaned_text, '') ILIKE :search 
                       OR COALESCE(original_text, '') ILIKE :search
                    LIMIT 3000
                """)
                filtered = pd.read_sql(query, db_engine, params={"search": f"%{item_name}%"})
            elif item_id:
                query = text(f"SELECT {SELECTED_COLUMNS} FROM amazon_reviews WHERE asin = :asin")
                filtered = pd.read_sql(query, db_engine, params={"asin": item_id})
            else:
                filtered = pd.DataFrame()
        else:
            # [리팩토링] get_db_connection이 사용 중단되었으므로 레거시 폴백 제거
            print("❌ DB Engine not initialized in consumer analysis.", flush=True)
            return JSONResponse(status_code=500, content={"has_data": False, "message": "Database Connection Error (Engine Not Init)"})
            
    except Exception as e:
        print(f"[Consumer] Data Fetch Error: {e}", flush=True)
        # 더 나은 사용자 피드백을 위해 "Connection slots reserved" 오류를 구체적으로 처리
        error_msg = str(e)
        if "remaining connection slots" in error_msg.lower():
            error_msg = "실시간 분석 세션이 너무 많습니다. 잠시 후 다시 시도해주세요. (DB Connection Full)"
            
        return {"has_data": False, "message": f"데이터 조회 중 오류가 발생했습니다: {error_msg}"}

    if filtered.empty:
        print(f"[Consumer] No data found for conditions: item_id={item_id}, item_name={item_name}", flush=True)
        res = {"has_data": False, "message": "해당 조건의 데이터가 없습니다."}
        set_cache(cache_key, res)  # 빈 결과도 캐시
        return res
    
    # print(f"[Consumer] Found {len(filtered)} rows", flush=True)

    try:
        # === [중요] 데이터 결측치 처리 및 대체 로직 ===
        # 평점 데이터 숫자 변환
        if 'rating' in filtered.columns:
            filtered['rating'] = pd.to_numeric(filtered['rating'], errors='coerce').fillna(3.0).astype(np.float32)

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
        # [진단] 평점 및 감성 분포 로그
        r_mean = filtered['rating'].mean()
        r_std = filtered['rating'].std()
        r_min = filtered['rating'].min()
        r_max = filtered['rating'].max()
        s_mean = filtered['sentiment_score'].mean()
        s_std = filtered['sentiment_score'].std()
        
        # print(f"[Consumer-Diag] Total: {total_count}, Rating: mean={r_mean:.2f}, std={r_std:.2f}, min={r_min}, max={r_max}", flush=True)
        # print(f"[Consumer-Diag] Sentiment: mean={s_mean:.2f}, std={s_std:.2f}", flush=True)

        # [자가 치유] 유효하지 않은 평점 감지 (예: 감성 변동에도 불구하고 모든 평점이 3.0이거나 분산이 0인 경우)
        # 평점 분산이 0에 가깝지만 감성 분산이 정상인 경우, 감성 점수로부터 평점을 역산하여 채움.
        is_rating_flat = (pd.isna(r_std) or r_std < 0.1) and (abs(r_mean - 3.0) < 0.1)
        is_sentiment_active = (not pd.isna(s_std) and s_std > 0.1)
        
        if is_rating_flat and is_sentiment_active:
            print("[Consumer] 🚨 비정상적 평점 감지 (모두 ~3.0). sentiment_score로부터 자가 치유를 시도합니다...", flush=True)
            # 공식: 평점 = 감성 * 4 + 1 (근사 매핑)
            # 0.0 -> 1.0, 0.5 -> 3.0, 1.0 -> 5.0
            filtered['rating'] = filtered['sentiment_score'] * 4 + 1
            # 통계 재계산
            r_mean = filtered['rating'].mean()
            print(f"[Consumer] 복구된 평점 평균: {r_mean:.2f}", flush=True)

        # 1. Impact Score (Rating Lift)
        avg_rating = r_mean
        if pd.isna(avg_rating): avg_rating = 3.0
        item_impact_score = round(avg_rating - 3.0, 2)
        
        # 2. Relative Sentiment Z-Score
        target_mean_sent = s_mean
        if pd.isna(target_mean_sent): target_mean_sent = 0.5
        
        if GLOBAL_STD_SENTIMENT > 0:
            sentiment_z_score = round((target_mean_sent - GLOBAL_MEAN_SENTIMENT) / GLOBAL_STD_SENTIMENT, 2)
        else:
            sentiment_z_score = 0.0
            
        # 3. Satisfaction Index (Likelihood Ratio)
        target_five_star_ratio = (filtered['rating'] >= 4.5).mean() # 4.5 이상을 5점으로 간주 (Healed data may be float)
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

        # [로직 수정] 긍정 키워드가 없지만 분석된 키워드 중 Impact Score가 양수인 것이 있다면 "소프트 폴백"
        if not diverging_keywords["positive"] and keywords_analysis:
            # 0.02 이상인 것들을 찾아서 추가 (Impact Score가 아주 미세하게라도 양수인 것)
            soft_positives = [k for k in keywords_analysis if k['impact_score'] > 0.02]
            if soft_positives:
                print(f"[Consumer] Soft Fallback: Found {len(soft_positives)} positive keywords (0.02 < score < {impact_threshold_val})", flush=True)
                diverging_keywords["positive"] = sorted(
                    soft_positives[:8],
                    key=lambda x: -x["impact_score"]
                )
        
        # ★ 긍정 키워드 보완: impact_score 방식으로 긍정이 안 나올 때
        #   -> 4-5점 리뷰에서만 별도 Bigram 추출하여 채움
        if not diverging_keywords["positive"] and 'cleaned_text' in filtered.columns and 'original_text' in filtered.columns:
            print(f"[Consumer] No positive keywords from impact_score. Extracting from high-rated reviews (4-5★)...", flush=True)
            pos_reviews = filtered[filtered['rating'] >= 4]
            
            if len(pos_reviews) >= 1:  # 긍정 리뷰가 1개라도 있으면 추출 시도 (기존 3개 -> 1개 완화)
                pos_min_df = 1 if len(pos_reviews) < 30 else 2
                pos_keywords_analysis = extract_bigrams_with_metrics(
                    texts=pos_reviews['cleaned_text'],
                    ratings=pos_reviews['rating'],
                    original_texts=pos_reviews['original_text'],
                    top_n=10,
                    adj_priority=False,  # 긍정에서는 형용사 필터 해제
                    min_df=pos_min_df
                )
                
                # 부정에 이미 나온 키워드는 제외 (중복 방지)
                neg_keyword_set = {k["keyword"] for k in diverging_keywords["negative"]}
                pos_unique = [k for k in pos_keywords_analysis if k["keyword"] not in neg_keyword_set]
                
                # 상위 8개를 긍정 키워드로 설정
                diverging_keywords["positive"] = sorted(
                    pos_unique[:8],
                    key=lambda x: -x["impact_score"]
                )
                print(f"[Consumer] Found {len(diverging_keywords['positive'])} positive keywords from high-rated reviews.", flush=True)
            
    except Exception as e:
        print(f"키워드 분석 오류: {e}")
    
    # =========================================================
    # 3-1. 전략 인사이트 자동 생성 (Critical Issue / Winning Point / Niche Opportunity)
    # [Phase 2] 중복 CountVectorizer 제거 — neg_cleaned 1회 계산 후 재사용
    # =========================================================
    insights_data = {"critical_issue": None, "winning_point": None, "niche_opportunity": None}
    try:
        neg_reviews = filtered[filtered['rating'] <= 2]
        pos_reviews = filtered[filtered['rating'] >= 4]
        
        # [Phase 2] 부정 리뷰 텍스트 전처리 및 벡터화를 1회만 수행 (Critical Issue + Winning Point 공유)
        neg_cleaned = pd.Series(dtype=str)
        neg_freq_map = {}  # Winning Point에서 재사용
        
        if not neg_reviews.empty and 'cleaned_text' in filtered.columns:
            neg_cleaned = neg_reviews['cleaned_text'].apply(remove_pos_tags).fillna('')
        
        # --- 🚨 Critical Issue: 부정 리뷰에서 가장 많이 언급되는 Pain Point ---
        if not neg_cleaned.empty:
            try:
                neg_vec = CountVectorizer(ngram_range=(1, 2), min_df=1, max_features=500, stop_words='english', token_pattern=r'\b[a-zA-Z]{3,}\b')
                neg_matrix = neg_vec.fit_transform(neg_cleaned)
                neg_words_raw = neg_vec.get_feature_names_out()
                neg_counts_raw = neg_matrix.sum(axis=0).A1
                
                # [Phase 2] Winning Point에서 재사용할 빈도 맵 생성 (중복 벡터화 방지)
                neg_freq_map = dict(zip(neg_words_raw, [int(c) for c in neg_counts_raw]))
                
                # 범용 단어 필터링
                neg_terms_filtered = []
                for i, word in enumerate(neg_words_raw):
                    if not is_generic_term(word):
                        neg_terms_filtered.append((word, int(neg_counts_raw[i])))
                
                neg_terms_filtered.sort(key=lambda x: -x[1])
                top_neg_terms = neg_terms_filtered[:5]
                
                neg_pct = round(len(neg_reviews) / total_count * 100, 1) if total_count > 0 else 0
                top_term = top_neg_terms[0][0] if top_neg_terms else "N/A"
                top_term_count = top_neg_terms[0][1] if top_neg_terms else 0
                
                # quality_issues_semantic 분석 추가
                quality_context = ""
                if 'quality_issues_semantic' in neg_reviews.columns:
                    qi_exploded = neg_reviews.explode('quality_issues_semantic')
                    qi_counts = qi_exploded['quality_issues_semantic'].dropna().value_counts()
                    if not qi_counts.empty:
                        top_qi = qi_counts.head(3).index.tolist()
                        quality_context = f" 주요 품질 이슈: {', '.join(top_qi)}"
                
                insights_data["critical_issue"] = {
                    "title": f"'{top_term}' 관련 불만이 가장 심각합니다",
                    "description": f"부정 리뷰(1-2점)의 {neg_pct}%에서 해당 키워드가 발견되었습니다.",
                    "data_evidence": f"부정 리뷰 {len(neg_reviews)}건 중 '{top_term}' {top_term_count}회 언급.{quality_context}",
                    "action_item": f"'{top_term}' 문제 해결이 최우선 과제입니다. 상세페이지에 개선 사항을 명시하세요.",
                    "top_terms": [{'term': t, 'count': c} for t, c in top_neg_terms]
                }
                
                # 메모리 해제
                del neg_matrix, neg_vec
            except Exception as e:
                print(f"[Insight] Critical Issue extraction error: {e}", flush=True)
        
        # --- 👍 Winning Point: 긍정 리뷰에서만 두드러지는 키워드 ---
        # [Phase 2] neg_freq_map을 Critical Issue에서 이미 계산한 것을 재사용 (중복 CountVectorizer 제거)
        if not pos_reviews.empty and 'cleaned_text' in filtered.columns:
            pos_cleaned = pos_reviews['cleaned_text'].apply(remove_pos_tags).fillna('')
            try:
                pos_vec = CountVectorizer(ngram_range=(1, 2), min_df=1, max_features=500, stop_words='english', token_pattern=r'\b[a-zA-Z]{3,}\b')
                pos_matrix = pos_vec.fit_transform(pos_cleaned)
                pos_words = pos_vec.get_feature_names_out()
                pos_counts_arr = pos_matrix.sum(axis=0).A1
                
                # 긍정 전용 gap이 큰 키워드 찾기 (neg_freq_map은 위에서 이미 계산됨)
                gap_scores = []
                for i, word in enumerate(pos_words):
                    if is_generic_term(word):
                        continue
                    pos_freq = int(pos_counts_arr[i])
                    neg_freq = neg_freq_map.get(word, 0)
                    # 긍정에서의 비율 - 부정에서의 비율
                    pos_rate = pos_freq / len(pos_reviews) if len(pos_reviews) > 0 else 0
                    neg_rate = neg_freq / len(neg_reviews) if len(neg_reviews) > 0 else 0
                    gap = pos_rate - neg_rate
                    if pos_freq >= 2 and gap > 0:
                        gap_scores.append({'term': word, 'pos_freq': pos_freq, 'neg_freq': int(neg_freq), 'gap': round(gap, 3)})
                
                gap_scores.sort(key=lambda x: -x['gap'])
                top_winning = gap_scores[:5]
                
                if top_winning:
                    best = top_winning[0]
                    insights_data["winning_point"] = {
                        "title": f"소비자는 '{best['term']}'에 열광하고 있습니다",
                        "description": f"긍정 리뷰에서 '{best['term']}'의 언급 비율이 부정 리뷰 대비 압도적으로 높습니다.",
                        "data_evidence": f"긍정 리뷰 {best['pos_freq']}회 vs 부정 리뷰 {best['neg_freq']}회 언급.",
                        "marketing_msg": f"'{best['term']}'을(를) 메인 카피로 활용하세요.",
                        "top_terms": top_winning
                    }
                
                # 메모리 해제
                del pos_matrix, pos_vec
            except Exception as e:
                print(f"[Insight] Winning Point extraction error: {e}", flush=True)
        
        # --- 💡 Niche Opportunity: 언급량 적지만 만족도 높은 키워드 ---
        if keywords_analysis:
            median_mention = np.median([k['mention_count'] for k in keywords_analysis]) if keywords_analysis else 5
            niche_candidates = [
                k for k in keywords_analysis 
                if k['mention_count'] <= median_mention and k['impact_score'] > 0.3
            ]
            niche_candidates.sort(key=lambda x: -x['impact_score'])
            
            if niche_candidates:
                # 범용 단어 제외 필터링 (이미 keywords_analysis에서 걸렸을 수 있지만 한 번 더 확인)
                niche_candidates = [n for n in niche_candidates if not is_generic_term(n['keyword'])]
                
                if niche_candidates:
                    best_niche = niche_candidates[0]
                    avg_rating_niche = round(best_niche['impact_score'] + 3.0, 1)
                    insights_data["niche_opportunity"] = {
                        "title": f"'{best_niche['keyword']}' 관련 잠재 수요가 감지됩니다",
                        "description": f"언급량은 {best_niche['mention_count']}회로 적지만, 언급 시 평균 별점이 {avg_rating_niche}점으로 매우 높습니다.",
                        "data_evidence": f"Impact Score: +{best_niche['impact_score']}, 만족도 지수: {best_niche.get('satisfaction_index', 'N/A')}",
                        "top_terms": [{'term': k['keyword'], 'impact': k['impact_score'], 'mentions': k['mention_count']} for k in niche_candidates[:5]]
                    }
    except Exception as e:
        print(f"[Insight] Insight generation error: {e}", flush=True)
    
    # =========================================================
    # 3-2. Sentiment Gap Analysis Chart (긍정 vs 부정 빈도 비교)
    # =========================================================
    fig_sentiment_gap = go.Figure()
    try:
        # 상위 키워드에 대해 긍정/부정 리뷰별 빈도 계산
        gap_keywords = sorted(keywords_analysis, key=lambda x: -x['mention_count'])[:12]
        if gap_keywords and 'cleaned_text' in filtered.columns:
            pos_reviews_text = filtered[filtered['rating'] >= 4]['cleaned_text'].apply(remove_pos_tags).fillna('')
            neg_reviews_text = filtered[filtered['rating'] <= 2]['cleaned_text'].apply(remove_pos_tags).fillna('')
            
            kw_names = []
            pos_freqs = []
            neg_freqs = []
            
            for kw in gap_keywords:
                keyword = kw['keyword']
                p_count = pos_reviews_text.str.contains(keyword, case=False, na=False, regex=False).sum() if not pos_reviews_text.empty else 0
                n_count = neg_reviews_text.str.contains(keyword, case=False, na=False, regex=False).sum() if not neg_reviews_text.empty else 0
                kw_names.append(keyword)
                pos_freqs.append(int(p_count))
                neg_freqs.append(int(n_count))
            
            fig_sentiment_gap.add_trace(go.Bar(
                name='긍정 리뷰 (4-5점)', x=kw_names, y=pos_freqs,
                marker_color='#22c55e',
                hovertemplate='<b>%{x}</b><br>긍정 리뷰 언급: %{y}회<extra></extra>'
            ))
            fig_sentiment_gap.add_trace(go.Bar(
                name='부정 리뷰 (1-2점)', x=kw_names, y=neg_freqs,
                marker_color='#ef4444',
                hovertemplate='<b>%{x}</b><br>부정 리뷰 언급: %{y}회<extra></extra>'
            ))
    except Exception as e:
        print(f"[Chart] Sentiment Gap error: {e}", flush=True)
    
    fig_sentiment_gap.update_layout(
        title="키워드 감성 차이 분석 (Sentiment Gap)",
        xaxis_title="키워드",
        yaxis_title="언급 빈도",
        barmode='group',
        template='plotly_white',
        height=450,
        legend=dict(orientation='h', yanchor='bottom', y=1.02, xanchor='right', x=1)
    )
    
    # =========================================================
    # 3-3. Keyword-Rating Correlation Chart (키워드별 평균 별점)
    # =========================================================
    fig_keyword_rating = go.Figure()
    try:
        rating_kw_data = sorted(keywords_analysis, key=lambda x: -x['mention_count'])[:15]
        if rating_kw_data:
            kw_labels = [k['keyword'] for k in rating_kw_data]
            kw_avg_ratings = [round(k['impact_score'] + 3.0, 2) for k in rating_kw_data]  # impact_score = avg - 3.0
            kw_colors = ['#22c55e' if r >= 4.0 else '#f59e0b' if r >= 3.0 else '#ef4444' for r in kw_avg_ratings]
            
            fig_keyword_rating.add_trace(go.Bar(
                y=kw_labels[::-1],
                x=kw_avg_ratings[::-1],
                orientation='h',
                marker_color=kw_colors[::-1],
                text=[f'{r:.1f}점' for r in kw_avg_ratings[::-1]],
                textposition='outside',
                hovertemplate='<b>%{y}</b><br>평균 별점: %{x}점<extra></extra>'
            ))
            
            # 전체 평균 기준선
            overall_avg = round(filtered['rating'].mean(), 2) if 'rating' in filtered.columns else 3.0
            fig_keyword_rating.add_vline(
                x=overall_avg, line_dash='dash', line_color='#6366f1', line_width=2,
                annotation_text=f'전체 평균: {overall_avg}점', annotation_position='top right'
            )
    except Exception as e:
        print(f"[Chart] Keyword-Rating Correlation error: {e}", flush=True)
    
    fig_keyword_rating.update_layout(
        title="키워드-별점 상관관계 (Keyword-Rating Correlation)",
        xaxis_title="평균 별점",
        yaxis_title="키워드",
        template='plotly_white',
        height=500,
        xaxis=dict(range=[1, 5.5]),
        showlegend=False
    )
    
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
    # 메모리 문제로 전체 데이터(df_consumer) 로딩을 안 하므로, 
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

    # ★ DB 컬럼 기반 식감/페어링 분석
    feature_data = analyze_features(filtered)

    # ★ 텍스트 패턴 매칭 보완 (DB 컬럼 데이터가 부족할 때)
    if 'cleaned_text' in filtered.columns:
        review_texts = filtered['cleaned_text'].dropna().tolist()
        text_pairing = extract_specific_insights(review_texts, mode='pairing')
        text_texture = extract_specific_insights(review_texts, mode='texture')
    else:
        text_pairing = []
        text_texture = []

    # 5. [New] 개선 우선순위 제안 (Improvement Priorities)
    improvement_priorities = extract_improvement_priorities(filtered)

    result = {
        "has_data": True,
        "search_term": item_name if item_name else item_id,
        "insights": insights_data,
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
        "feature_analysis": {
            "top_textures": feature_data.get("top_textures", []),
            "top_pairings": feature_data.get("top_pairings", []),
            "text_pairing_insights": text_pairing,
            "text_texture_insights": text_texture
        },
        "improvement_priorities": improvement_priorities,
        "diverging_summary": {
            "negative_keywords": [{"keyword": k["keyword"], "impact_score": k["impact_score"], "satisfaction_index": k.get("satisfaction_index", 0), "positivity_rate": k.get("positivity_rate", 0), "sample_reviews": k.get("sample_reviews", [])} for k in neg_keywords],
            "positive_keywords": [{"keyword": k["keyword"], "impact_score": k["impact_score"], "satisfaction_index": k.get("satisfaction_index", 0), "positivity_rate": k.get("positivity_rate", 0), "sample_reviews": k.get("sample_reviews", [])} for k in pos_keywords]
        },
        "charts": {
            "impact_diverging_bar": json.loads(fig_diverging.to_json()),
            "sentiment_gap": json.loads(fig_sentiment_gap.to_json()),
            "keyword_rating_corr": json.loads(fig_keyword_rating.to_json()),
            "positivity_bar": json.loads(fig_positivity.to_json()),
            "value_radar": json.loads(fig_radar.to_json()),
            "nss_gauge": json.loads(fig_nss.to_json()),
            "nss_cas_scatter": json.loads(fig_scatter_nss.to_json()),
            "quality_treemap": json.loads(fig_treemap.to_json()),
            "marketing_matrix": json.loads(fig_marketing.to_json())
        }
    }

    # [Added] Business Insights Charts Integration
    try:
        business_insights = generate_business_insights(filtered)
        if "charts" in result:
             result["charts"].update(business_insights)
    except Exception as e:
        print(f"Business Insights Generation Failed: {e}", flush=True)

    # [Phase 1] LRU 캐시에 저장
    set_cache(cache_key, result)
    
    # [Phase 2] 명시적 가비지 컬렉션 — 대규모 분석 후 메모리 즉시 반환
    del filtered
    gc.collect()
    
    return result

@app.get("/debug/db-check")
async def debug_db_check():
    """브라우저에서 DB 테이블과 데이터 개수를 즉시 확인"""
    try:
        # [리팩토링] raw psycopg2 대신 SQLAlchemy 엔진 사용
        if not db_engine:
             return {"error": "DB Engine Not Initialized"}

        with db_engine.connect() as conn:
            # 1. 테이블 존재 여부 확인
            result = conn.execute(text("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"))
            tables = [r[0] for r in result.fetchall()]
            
            # 2. 데이터 개수 확인
            data_counts = {}
            for table in tables:
                # Use text() for safe execution, though table name is from schema query
                res = conn.execute(text(f"SELECT count(*) FROM {table}")).fetchone()
                data_counts[table] = res[0]
            
            # 3. Kimchi 데이터가 실제로 있는지 확인
            kimchi_res = conn.execute(text("SELECT count(*) FROM amazon_reviews WHERE title ILIKE '%Kimchi%'")).fetchone()
            kimchi_count = kimchi_res[0]
            
            return {
                "tables": tables,
                "counts": data_counts,
                "kimchi_search_test": f"{kimchi_count} rows found for 'Kimchi'"
            }
    except Exception as e:
        return {"error": str(e)}

@app.get("/dashboard")
async def dashboard():
    # [지연 로딩] 데이터가 비어 있는 경우 요청 시 로딩 시도
    if df is None or df.empty:
        print("⚠️ Data empty on /dashboard request. Attempting On-Demand Load...", flush=True)
        load_data_background(max_retries=1)

    if df is None or df.empty:
        return {"has_data": False, "message": "데이터 로드 실패 (DB 연결 지연)"}
        
    try:
        # 1. Top 5 국가 수출 추세 (마켓 트렌드)
        # 국가별, 월별 합산
        country_trend = df.groupby(['period_str', 'country_name'])['export_value'].sum().reset_index()
        # 총 수출액 기준 Top 5 국가 선정
        top_countries = df.groupby('country_name')['export_value'].sum().nlargest(5).index.tolist()
        country_trend_top = country_trend[country_trend['country_name'].isin(top_countries)]
        
        fig1 = px.line(country_trend_top, x='period_str', y='export_value', color='country_name',
                       title="1. Top 5 국가 수출 추세 (Market Trend)")
        fig1.update_layout(template="plotly_white", margin=dict(l=20, r=20, t=40, b=20), xaxis_title="기간", yaxis_title="수출액 ($)")

        # 2. Top 5 품목 수출 추세 (제품 라이프사이클)
        item_trend = df.groupby(['period_str', 'item_name'])['export_value'].sum().reset_index()
        top_items = df.groupby('item_name')['export_value'].sum().nlargest(5).index.tolist()
        item_trend_top = item_trend[item_trend['item_name'].isin(top_items)]
        
        # UI 이름으로 매핑
        item_trend_top['ui_name'] = item_trend_top['item_name'].apply(lambda x: CSV_TO_UI_ITEM_MAPPING.get(x, x))
        
        fig2 = px.line(item_trend_top, x='period_str', y='export_value', color='ui_name',
                       title="2. Top 5 품목 수출 추세 (Product Lifecycle)")
        fig2.update_layout(template="plotly_white", margin=dict(l=20, r=20, t=40, b=20), xaxis_title="기간", yaxis_title="수출액 ($)")

        # 3. 국가별 평균 단가 비교 (수익성 확인)
        # 단가 = 총 수출액 / 총 중량 (중량 없으면 unit_price 평균 대용)
        # 여기서는 간단히 unit_price의 평균을 국가별로 비교
        profitability = df.groupby('country_name')['unit_price'].mean().sort_values(ascending=False).reset_index()
        
        fig3 = px.bar(profitability, x='country_name', y='unit_price', color='unit_price',
                      title="3. 국가별 평균 단가 (Profitability Check)", color_continuous_scale='Viridis')
        fig3.update_layout(template="plotly_white", margin=dict(l=20, r=20, t=40, b=20), xaxis_title="국가", yaxis_title="평균 단가 ($/kg)")

        # 4. 시장 포지셔닝 맵 (물량 vs 가치)
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

        # 5. 품목별 월별 계절성 (히트맵)
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
                "positioning": json.loads(fig4.to_json())
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


