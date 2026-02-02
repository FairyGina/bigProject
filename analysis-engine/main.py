from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
import numpy as np
import json
import plotly.express as px
import plotly.graph_objects as go
from typing import Optional
from contextlib import asynccontextmanager
import os

# 국가 매핑 및 ISO3 코드 매핑
COUNTRY_MAPPING = {
    '미국': 'US',
    '중국': 'CN',
    '일본': 'JP',
    '베트남': 'VN',
    '독일': 'DE'
}

REVERSE_MAPPING = {
    'CN': '중국',
    'DE': '독일',
    'JP': '일본',
    'US': '미국',
    'VN': '베트남'
}

ISO3_MAPPING = {
    'US': 'USA',
    'CN': 'CHN',
    'JP': 'JPN',
    'VN': 'VNM',
    'DE': 'DEU'
}

# (Optional) Deprecated hardcoded mapping kept for reference or categorical logic if needed later
# UI 표시 이름 -> CSV 저장 이름 매핑
UI_TO_CSV_ITEM_MAPPING = {
    "간장": "간장",
    "감": "감",
    "건고사리": "고사리",
    "고추장": "고추장",
    "국수": "국수",
    "참치 통조림": "기름에 담근 것",
    "김치": "김치",
    "깐마늘": "껍질을 깐 것",
    "김밥류": "냉동김밥",
    "냉면": "냉면",
    "당면": "당면",
    "건더덕": "더덕",
    "된장": "된장",
    "두부": "두부",
    "들기름": "들기름과 그 분획물",
    "라면": "라면",
    "쌀": "멥쌀",
    "피클 및 절임채소": "밀폐용기에 넣은 것",
    "냉동 밤": "밤",
    "쿠키 및 크래커": "비스킷, 쿠키와 크래커",
    "삼계탕": "삼계탕",
    "소시지": "소시지",
    "소주": "소주",
    "만두": "속을 채운 파스타(조리한 것인지 또는 그 밖의 방법으로 조제한 것인지에 상관없다)",
    "초코파이류": "스위트 비스킷",
    "떡볶이 떡": "쌀가루의 것",
    "전통 한과/약과": "쌀과자",
    "유자": "유자",
    "인스턴트 커피": "인스턴트 커피의 조제품",
    "즉석밥": "찌거나 삶은 쌀",
    "참기름": "참기름과 그 분획물",
    "춘장": "춘장",
    "막걸리": "탁주",
    "쌀 튀밥": "튀긴 쌀",
    "팽이버섯": "팽이버섯",
    "표고버섯": "표고버섯",
    "쌈장 및 양념장": "혼합조미료",
    "홍삼 엑기스": "홍삼 추출물(extract)"
}

CSV_TO_UI_ITEM_MAPPING = {v: k for k, v in UI_TO_CSV_ITEM_MAPPING.items()}

df = None

def calculate_market_health(country, df):
    """
    시장 건강도: 최근 3개월 수출액 성장률 기반 평가 (0-10점)
    """
    if df.empty or 'export_value' not in df.columns:
        return 0
    try:
        current = df['export_value'].iloc[-3:].mean()
        previous = df['export_value'].iloc[-6:-3].mean()
        
        if pd.isna(current) or pd.isna(previous):
            return 0
            
        if previous == 0:
            return 5.0 if current > 0 else 0.0
            
        growth = (current - previous) / previous
        # 10% 성장마다 1점 추가, 기본 5점
        score = 5 + (growth * 10)
        return round(max(0, min(10, score)), 1)
    except Exception:
        return 0

def calculate_k_buzz(country, df):
    """
    K-Buzz: 해당 국가의 검색량 트렌드 점수 (0-10점)
    """
    if df.empty:
        return 0
        
    trend_col = None
    for col in df.columns:
        if col.startswith(f"{country}_") and col.endswith("_mean"):
             trend_col = col
             break
             
    if not trend_col or trend_col not in df.columns:
        return 0
        
    try:
        # 최근 3개월 검색량 평균
        recent_trend = df[trend_col].iloc[-3:].mean()
        if pd.isna(recent_trend):
            return 0
            
        # 데이터가 0~100 스케일이라고 가정
        score = recent_trend / 10.0
        return round(max(0, min(10, score)), 1)
    except Exception:
        return 0

def calculate_price_advantage(df):
    """
    가격 경쟁력 (고부가가치화): 수출 단가 상승률 (0-10점)
    """
    if df.empty or 'unit_price' not in df.columns:
        return 5.0
        
    try:
        current = df['unit_price'].iloc[-3:].mean()
        previous = df['unit_price'].iloc[-6:-3].mean()
        
        if pd.isna(current) or pd.isna(previous):
            return 5.0
            
        if previous == 0:
            return 5.0
            
        growth = (current - previous) / previous
        # 단가 상승을 긍정적(고부가가치)으로 해석
        score = 5 + (growth * 20)
        return round(max(0, min(10, score)), 1)
    except Exception:
        return 5.0

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: 데이터 로드
    global df
    csv_path = 'cleaned_merged_export_trends.csv'
    
    # 개발 환경 배려
    if not os.path.exists(csv_path):
        parent_path = os.path.join('..', csv_path)
        if os.path.exists(parent_path):
            csv_path = parent_path
            
    try:
        if os.path.exists(csv_path):
            print(f"데이터 로드 중: {csv_path}")
            df = pd.read_csv(csv_path, low_memory=False)
            
            # 결측치 처리
            numeric_cols = df.select_dtypes(include=[np.number]).columns
            df[numeric_cols] = df[numeric_cols].interpolate(method='linear')
            df[numeric_cols] = df[numeric_cols].fillna(0) # mean fill might bias 0 data

            # Data Type Correction
            if 'export_value' in df.columns:
                df['export_value'] = pd.to_numeric(df['export_value'], errors='coerce').fillna(0)
            
            # period 컬럼 처리 (2022.01 형식 -> YYYY-MM 문자열)
            # CSV의 period가 float (예: 2022.01, 2022.1)으로 저장되어 있음
            if 'period' in df.columns:
                def convert_period(val):
                    try:
                        if pd.isna(val):
                            return ''
                        # float를 문자열로 변환 (예: 2022.01 -> "2022.01")
                        s = str(val)
                        parts = s.split('.')
                        year = parts[0]
                        # 월 부분 처리 (01 -> 01, 1 -> 01, 10 -> 10)
                        if len(parts) > 1:
                            month = parts[1].ljust(2, '0')[:2]  # "1" -> "10" 방지, 정확히 파싱
                            # 2022.1 은 1월, 2022.10은 10월
                            if len(parts[1]) == 1:
                                month = '0' + parts[1]
                            else:
                                month = parts[1][:2]
                        else:
                            month = '01'
                        return f"{year}-{month}"
                    except:
                        return ''
                
                df['period_str'] = df['period'].apply(convert_period)
                print(f"Period 변환 샘플: {df['period_str'].head(3).tolist()}")

            print("데이터 로딩 및 정제 완료.")
        else:
            print(f"경고: {csv_path} 파일을 찾을 수 없습니다.")
            df = pd.DataFrame()
    except Exception as e:
        print(f"데이터 로드 중 오류 발생: {e}")
        df = pd.DataFrame()
    yield
    print("서버를 종료합니다.")

app = FastAPI(title="K-Food Export Analysis Engine", lifespan=lifespan)

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    global df
    status = "Ready" if df is not None and not df.empty else "Data Not Loaded"
    return {
        "message": "K-Food Export Analysis Engine is running.",
        "status": status,
        "endpoints": {
            "analyze": "/analyze?country={code}&item={name}",
            "items": "/items",
            "docs": "/docs",
            "health": "/health"
        }
    }

@app.get("/items")
async def get_items():
    """
    데이터셋에 존재하는 품목 리스트를 반환합니다. (UI용 매핑 명칭)
    """
    global df
    if df is None or df.empty:
        return {"items": []}
        
    try:
        # CSV의 'item_name' 컬럼에서 유니크한 값들을 가져와서 UI 명칭으로 매핑
        csv_items = df['item_name'].dropna().unique().tolist()
        ui_items = []
        for item in csv_items:
            if item in CSV_TO_UI_ITEM_MAPPING:
                ui_items.append(CSV_TO_UI_ITEM_MAPPING[item])
            else:
                # 매핑에 없는 항목은 그대로 노출하거나 제외 (필요에 따라 조절)
                ui_items.append(item)
        
        # 중복 제거 및 정렬
        return {"items": sorted(list(set(ui_items)))}
    except Exception as e:
        print(f"Error fetching items: {e}")
        return {"items": []}

@app.get("/health")
async def health():
    return {"status": "ok"}

@app.get("/analyze")
async def analyze(country: str = Query(...), item: str = Query(...)):
    global df
    if df is None or df.empty:
        raise HTTPException(status_code=500, detail="데이터가 로드되지 않았습니다.")
    
    # 1. 국가 코드 매핑 ('US' -> '미국')
    country_name = REVERSE_MAPPING.get(country)
    if not country_name:
        if country in COUNTRY_MAPPING: # 한글로 들어온 경우
            country_name = country
            country = COUNTRY_MAPPING[country]
        else:
            raise HTTPException(status_code=400, detail=f"지원하지 않는 국가입니다: {country}")
            
    # 2. 아이템 매핑 (UI 명칭 -> CSV 명칭)
    csv_item_name = UI_TO_CSV_ITEM_MAPPING.get(item, item)
    
    # 3. 데이터 필터링 (정확한 품목명 일치)
    filtered = df[
        (df['country_name'] == country_name) & 
        (df['item_name'] == csv_item_name)
    ].copy()
    
    if filtered.empty or (filtered['export_value'].sum() == 0):
        return {
            "country": country,
            "country_name": country_name,
            "item": item,
            "has_data": False,
            "scores": {"market_health": 0, "k_buzz": 0, "price_advantage": 0, "total_score": 0},
            "charts": {"export_trend": {}, "correlation": {}}
        }
        
    # period_str 기준 정렬 (데이터 로드 시 이미 변환됨)
    filtered = filtered.sort_values('period_str')
    
    # 그래프용 데이터 (문자열 period 사용)
    grouped = filtered.groupby('period_str').agg({
        'export_value': 'sum',
        'exchange_rate': 'mean'
    }).reset_index()
    
    # period_str 기준 정렬
    grouped = grouped.sort_values('period_str')
    
    # 지표 계산을 위한 최근 1년 데이터
    recent_data = filtered.tail(12)
    
    # 스코어 계산
    market_health = calculate_market_health(country, recent_data)
    k_buzz = calculate_k_buzz(country, recent_data)
    price_advantage = calculate_price_advantage(recent_data)
    total_score = round((market_health * 10 + k_buzz + price_advantage * 10) / 3, 1)
    
    # 차트 생성 1: 수출액 추이
    try:
        fig_export = px.line(grouped, x='period_str', y='export_value', 
                             title=f"{country_name} {item} 수출 금액 추이 ($)",
                             labels={'period_str': '기간', 'export_value': '수출액'})
        fig_export.update_layout(template="plotly_white", margin=dict(l=20, r=20, t=60, b=20))
        fig_export.update_xaxes(tickangle=45)  # X축 레이블 회전
        chart_export = json.loads(fig_export.to_json())
    except Exception as e:
        print(f"차트 생성 오류: {e}")
        chart_export = {}
    
    # 차트 생성 2: 상관관계 (수출액 vs 검색수)
    chart_corr = {}
    try:
        # 검색 트렌드 컬럼 찾기
        trend_col = None
        for col in filtered.columns:
            if col.startswith(f"{country}_") and col.endswith("_mean"):
                 trend_col = col
                 break
        
        fig_corr = go.Figure()
        # 수출액
        fig_corr.add_trace(go.Scatter(x=grouped['period_str'], y=grouped['export_value'], name="수출액($)", yaxis="y1", line=dict(color='#6366f1', width=3)))
        
        if trend_col:
            # 트렌드 데이터 (문자열 period 사용)
            trend_grouped = filtered.groupby('period_str')[trend_col].mean().reset_index()
            trend_grouped = trend_grouped.sort_values('period_str')
            fig_corr.add_trace(go.Scatter(x=trend_grouped['period_str'], y=trend_grouped[trend_col], name="현지 관심도", yaxis="y2", line=dict(color='#f43f5e', width=3, dash='dot')))

        fig_corr.update_layout(
            title=f"수출액 vs {country_name} 내 관심도 변화",
            yaxis=dict(title="수출액 ($)", side="left", showgrid=True),
            yaxis2=dict(title="관심도 지수", side="right", overlaying="y", showgrid=False),
            template="plotly_white",
            legend=dict(orientation="h", yanchor="bottom", y=1.02, xanchor="right", x=1),
            margin=dict(l=20, r=20, t=60, b=20),
            hovermode="x unified"
        )
        chart_corr = json.loads(fig_corr.to_json())
    except Exception as e:
        print(f"상관관계 차트 생성 오류: {e}")

    return {
        "country": country,
        "country_name": country_name,
        "item": item,
        "has_data": True,
        "scores": {
            "market_health": market_health,
            "k_buzz": k_buzz,
            "price_advantage": price_advantage,
            "total_score": total_score
        },
        "charts": {
            "export_trend": chart_export,
            "correlation": chart_corr
        }
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
