from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
import numpy as np
import json
import plotly.express as px
import plotly.graph_objects as go
from plotly.subplots import make_subplots
from typing import Optional
from contextlib import asynccontextmanager
import os
from scipy.stats import linregress

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

@asynccontextmanager
async def lifespan(app: FastAPI):
    global df, growth_summary_df, df_consumer
    csv_path = 'cleaned_merged_export_trends.csv'
    consumer_csv_path = 'amz_insight_data.csv'
    
    if not os.path.exists(csv_path):
        parent_path = os.path.join('..', csv_path)
        if os.path.exists(parent_path):
            csv_path = parent_path

    if not os.path.exists(consumer_csv_path):
        parent_consumer_path = os.path.join('..', consumer_csv_path)
        if os.path.exists(parent_consumer_path):
            consumer_csv_path = parent_consumer_path
            
    try:
        # 기존 수출 데이터 로드
        if os.path.exists(csv_path):
            print(f"데이터 로드 중: {csv_path}")
            # 1-1. 'period' 컬럼을 문자열로 읽기 위해 dtype 지정
            df = pd.read_csv(csv_path, low_memory=False, dtype={'period': str})
            
            # 1-2. period 변환 및 정렬
            if 'period' in df.columns:
                def convert_period(val):
                    try:
                        if pd.isna(val) or val == '': return ''
                        s = str(val).strip()
                        
                        # Case 1: "2022.10" (7글자) -> 2022-10
                        # Case 2: "2022.1"  (6글자) -> 2022-01
                        # Case 3: "2022.01" (7글자) -> 2022-01
                        
                        parts = s.split('.')
                        year = parts[0]
                        if len(parts) > 1:
                            month_part = parts[1]
                        # "10", "11", "12"는 그대로
                            if len(month_part) == 2:
                                month = month_part
                            # 한 글자인 경우:
                            # 데이터셋 분석 결과 1월은 '01'로, 10월은 '1'로(0이 탈락) 저장된 패턴 확인됨
                            elif len(month_part) == 1:
                                if month_part == '1':
                                    month = '10' # 1 -> 10월
                                else:
                                    month = '0' + month_part # 2~9 -> 02~09월
                            else:
                                month = str(month_part)[:2].zfill(2)
                        else:
                            month = '01' # 월 정보 없으면 default
                            
                        return f"{year}-{month}"
                    except: return ''
                
                df['period_str'] = df['period'].apply(convert_period)
                # 잘못된 변환으로 중복된 period가 생길 수 있으므로 이를 방지하기 위한 추가 정렬
                df = df.sort_values(by=['country_name', 'item_name', 'period_str'])

            # 2. 결측치 처리 (Interpolation 제거 -> 0 채움)
            numeric_cols = df.select_dtypes(include=[np.number]).columns
            df[numeric_cols] = df[numeric_cols].fillna(0)
            
            if 'export_value' in df.columns:
                df['export_value'] = pd.to_numeric(df['export_value'], errors='coerce').fillna(0)
            
            # 3. Growth Matrix(산점도)용 요약 데이터 미리 계산
            # 각 (국가, 아이템) 별로 최근 1년 vs 직전 1년 성장률 계산
            print("성장 매트릭스 계산 중...")
            summaries = []
            
            # 그룹핑하여 계산
            group_cols = ['country_code', 'item_name']
            if 'country_code' not in df.columns:
                 group_cols = ['country_name', 'item_name']
                 
            grouped = df.groupby(group_cols)
            
            for name, group in grouped:
                if len(group) < 24: continue # 최소 2년치 데이터 필요
                
                # 정렬 보장
                group = group.sort_values('period_str')
                
                recent_12 = group.tail(12)
                prev_12 = group.iloc[-24:-12]
                
                # 양적 성장 (수출 중량)
                weight_col = 'export_weight' if 'export_weight' in group.columns else None
                if weight_col:
                    w_curr = recent_12[weight_col].sum()
                    w_prev = prev_12[weight_col].sum()
                else: 
                     w_curr = recent_12['export_value'].sum()
                     w_prev = prev_12['export_value'].sum()

                # 단, 분모가 0이면 성장률 계산 불가 -> 0 또는 예외처리
                weight_growth = ((w_curr - w_prev) / w_prev * 100) if w_prev > 0 else 0
                
                # 질적 성장 (수출 단가)
                # 단가는 합계가 아니라 평균으로 비교
                p_curr = recent_12['unit_price'].mean()
                p_prev = prev_12['unit_price'].mean()
                price_growth = ((p_curr - p_prev) / p_prev * 100) if p_prev > 0 else 0
                
                # 버블 크기 (수출 규모)
                total_value = recent_12['export_value'].sum()
                
                summaries.append({
                    'country': name[0] if 'country_code' in df.columns else COUNTRY_MAPPING.get(name[0], name[0]),
                    'item_csv_name': name[1],
                    'weight_growth': round(weight_growth, 1),
                    'price_growth': round(price_growth, 1),
                    'total_value': total_value
                })
            
            growth_summary_df = pd.DataFrame(summaries)
            print("데이터 로딩 및 요약 완료.")
            
        else:
            print(f"경고: {csv_path} 파일을 찾을 수 없습니다.")
            df = pd.DataFrame()
            growth_summary_df = pd.DataFrame()

        # 소비자 리뷰 데이터 로드
        if os.path.exists(consumer_csv_path):
            print(f"소비자 데이터 로드 중: {consumer_csv_path}")
            df_consumer = pd.read_csv(consumer_csv_path, low_memory=False)
            
            # 리스트 형태의 문자열 컬럼 파싱 (safe eval)
            import ast
            def parse_list(x):
                try:
                    return ast.literal_eval(x) if isinstance(x, str) and x.startswith('[') else []
                except:
                    return []

            list_cols = ['quality_issues_semantic', 'packaging_keywords', 'texture_terms', 
                         'ingredients', 'health_keywords', 'dietary_keywords', 'delivery_issues_semantic']
            
            for col in list_cols:
                if col in df_consumer.columns:
                    df_consumer[col] = df_consumer[col].apply(parse_list)
            
            print("소비자 데이터 로드 완료.")
        else:
            print(f"경고: {consumer_csv_path} 파일을 찾을 수 없습니다.")
            df_consumer = pd.DataFrame()
            
    except Exception as e:
        print(f"데이터 로드 중 오류 발생: {e}")
        df = pd.DataFrame()
        growth_summary_df = pd.DataFrame()
        df_consumer = pd.DataFrame()
    yield
    print("서버를 종료합니다.")

app = FastAPI(title="K-Food Export Analysis Engine", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"]
)

@app.get("/")
async def root():
    return {"message": "K-Food Analysis Engine (Visual Analytics Mode)", "status": "Ready"}

@app.get("/items")
async def get_items():
    global df
    if df is None or df.empty: return {"items": []}
    try:
        csv_items = df['item_name'].dropna().unique().tolist()
        ui_items = sorted(list(set([CSV_TO_UI_ITEM_MAPPING.get(i, i) for i in csv_items])))
        return {"items": ui_items}
    except: return {"items": []}

@app.get("/analyze")
async def analyze(country: str = Query(...), item: str = Query(...)):
    global df, growth_summary_df
    
    # 1. 매핑 및 유효성 검사
    country_name = REVERSE_MAPPING.get(country, country) # 코드(US) -> 이름(미국)
    if country in COUNTRY_MAPPING: # 입력이 한글(미국)이면 코드로 변환
         country_code = COUNTRY_MAPPING[country]
         country_name = country
    else:
         country_code = country # 입력이 코드(US)면 그대로
         
    csv_item_name = UI_TO_CSV_ITEM_MAPPING.get(item, item)
    
    # 데이터 필터링
    filtered = df[
        (df['country_name'] == country_name) & 
        (df['item_name'] == csv_item_name)
    ].copy()
    
    if filtered.empty or (filtered['export_value'].sum() == 0):
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
    
    # 1. 공통 선행 지표: 전체 K-Food 관심도 (Baseline)
    common_trend_col = f"{country_code}_KFood_mean"
    has_common = common_trend_col in filtered.columns
    if has_common:
        fig_signal.add_trace(go.Scatter(
            x=filtered['period_str'], y=filtered[common_trend_col], 
            name="K-Food 전체 관심도",
            line=dict(color='#fda4af', width=2, dash='dot'), # 연한 핑크 점선
            opacity=0.6
        ), secondary_y=True)

    # 2. 개별 선행 지표: 1:1 매핑된 품목 관심도
    trend_kw = ITEM_TO_TREND_MAPPING.get(item)
    # KFood와 중복되지 않는 경우에만 추가로 그림
    if trend_kw and trend_kw != "KFood":
        specific_trend_col = f"{country_code}_{trend_kw}_mean"
        if specific_trend_col in filtered.columns:
            fig_signal.add_trace(go.Scatter(
                x=filtered['period_str'], y=filtered[specific_trend_col], 
                name=f"품목 관심도 ({trend_kw})",
                line=dict(color='#f43f5e', width=4), # 진한 장미색 실선
                mode='lines+markers'
            ), secondary_y=True)
    elif not has_common:
        # KFood도 없고 매핑도 없을 때만 아무 트렌드나 하나 찾아서 표시 (폴백)
        fallback_col = next((c for c in filtered.columns if c.startswith(f"{country_code}_") and c.endswith("_mean")), None)
        if fallback_col:
            fig_signal.add_trace(go.Scatter(
                x=filtered['period_str'], y=filtered[fallback_col], 
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
    global df_consumer
    
    if df_consumer is None or df_consumer.empty:
        return {"has_data": False, "message": "소비자 데이터가 로드되지 않았습니다."}
    
    # 1. 필터링 로직
    filtered = pd.DataFrame()
    
    # 모드 A: 키워드/카테고리 분석 (권장)
    try:
        # Mode A: Keyword/Category Analysis
        if item_name:
            # Fallback to searching in review text if title is missing
            target_col = 'title' if 'title' in df_consumer.columns else 'cleaned_text'
            
            if target_col in df_consumer.columns:
                filtered = df_consumer[df_consumer[target_col].str.contains(item_name, case=False, na=False)].copy()
            else:
                 return {"has_data": False, "message": "Search unavailable (missing text columns)."}
        # Mode B: Specific ASIN Analysis
        elif item_id:
            filtered = df_consumer[df_consumer['asin'] == item_id].copy()
            
        if filtered.empty:
            return {"has_data": False, "message": "해당 조건의 데이터가 없습니다."}

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
            
    total_count = filtered.shape[0]
    
    # =========================================================
    # 2. 시장 감성 및 주요 점수 (요약 보기)
    # =========================================================
    
    # NSS (Net Sentiment Score: 순 감성 지수)
    pos_count = filtered[filtered['sentiment_score'] >= 0.75].shape[0]
    neg_count = filtered[filtered['sentiment_score'] <= 0.25].shape[0]
    nss_score = ((pos_count - neg_count) / total_count * 100) if total_count > 0 else 0
    
    # CAS (Customer Advocacy Score: 고객 옹호 지수)
    advocates = filtered[
        (filtered['repurchase_intent_hybrid'] == True) & 
        (filtered['recommendation_intent_hybrid'] == True)
    ].shape[0]
    cas_score = (advocates / total_count * 100) if total_count > 0 else 0
    
    # =========================================================
    # 3. 상세 분석: 불만족(Pain) vs 만족(Delight) 요인
    # =========================================================
    
    # 키워드 추출 헬퍼 함수
    def extract_top_keywords(series, top_n=5):
        try:
            all_terms = []
            for item in series.dropna():
                if isinstance(item, str):
                    clean_item = item.replace("[", "").replace("]", "").replace("'", "")
                    terms = [t.strip() for t in clean_item.split(',')]
                    all_terms.extend(terms)
            
            if not all_terms:
                return {}, []
                
            from collections import Counter
            counts = Counter(all_terms)
            common = counts.most_common(top_n)
            return dict(common), [term for term, count in common]
        except Exception as e:
            print(f"키워드 추출 오류: {e}")
            return {}, []

    # 평점 기반 데이터 분리 (1-2점: 불만, 4-5점: 만족)
    neg_reviews = filtered[filtered['rating'] <= 2]
    pos_reviews = filtered[filtered['rating'] >= 4]
    
    # 키워드 분석 대상 컬럼 선정
    target_col = 'review_text_keywords'
    
    # 키워드 데이터가 없을 경우 리뷰 본문에서 직접 추출 시도
    use_text_extraction = False
    if filtered[target_col].isna().all():
        use_text_extraction = True
        
    if use_text_extraction:
        def get_simple_keywords(text_series):
            from collections import Counter
            if text_series.empty: return {}
            all_text = " ".join(text_series.dropna().astype(str).tolist()).lower()
            words = [w for w in all_text.split() if len(w) > 3]
            return dict(Counter(words).most_common(5))
            
        pain_points = get_simple_keywords(neg_reviews['cleaned_text'])
        delight_points = get_simple_keywords(pos_reviews['cleaned_text'])
    else:
        pain_points, pain_labels = extract_top_keywords(neg_reviews[target_col], top_n=5)
        delight_points, delight_labels = extract_top_keywords(pos_reviews[target_col], top_n=5)
    
    # 시각화: 불만족 vs 만족 요인 가로 막대 차트
    fig_pain = px.bar(
        x=list(pain_points.values()),
        y=list(pain_points.keys()),
        orientation='h',
        title=f"소비자 불만족 요인 (Pain Points)",
        labels={'x': '언급 횟수', 'y': '키워드'},
        color_discrete_sequence=['#ff4d4f']
    )
    if list(pain_points.keys()):
         fig_pain.update_layout(yaxis={'categoryorder':'total ascending'})

    fig_delight = px.bar(
        x=list(delight_points.values()),
        y=list(delight_points.keys()),
        orientation='h',
        title=f"소비자 만족 요인 (Delight Points)",
        labels={'x': '언급 횟수', 'y': '키워드'},
        color_discrete_sequence=['#52c41a']
    )
    if list(delight_points.keys()):
        fig_delight.update_layout(yaxis={'categoryorder':'total ascending'})

    # =========================================================
    # 4. 핵심 가치 드라이버 (Radar Chart)
    # =========================================================
    
    # 한국어 라벨 매핑용 metrics
    metrics_map = {
        "Taste": "맛", "Price": "가격", "Package": "포장", "Quality": "품질", "Delivery": "배송", "Texture": "식감"
    }
    raw_metrics = {k: 0 for k in metrics_map.keys()}
    
    # 리뷰 본문 키워드 매칭 분석
    all_text_combined = " ".join(filtered['cleaned_text'].dropna().astype(str).tolist()).lower()
    
    raw_metrics['Taste'] = all_text_combined.count('taste') + all_text_combined.count('flavor') + all_text_combined.count('delicious')
    raw_metrics['Price'] = all_text_combined.count('price') + all_text_combined.count('expensive') + all_text_combined.count('cheap') + all_text_combined.count('value')
    raw_metrics['Package'] = all_text_combined.count('package') + all_text_combined.count('box') + all_text_combined.count('broken')
    raw_metrics['Quality'] = all_text_combined.count('quality') + all_text_combined.count('good') + all_text_combined.count('bad')
    raw_metrics['Delivery'] = all_text_combined.count('delivery') + all_text_combined.count('shipping') + all_text_combined.count('arrive')
    raw_metrics['Texture'] = all_text_combined.count('texture') + all_text_combined.count('soft') + all_text_combined.count('hard')
         
    # 정규화 (0-100)
    max_val = max(raw_metrics.values()) if max(raw_metrics.values()) > 0 else 1
    r_values = [v/max_val*100 for v in raw_metrics.values()]
    theta_values = [metrics_map[k] for k in raw_metrics.keys()]
    
    fig_radar = go.Figure(data=go.Scatterpolar(
        r=r_values,
        theta=theta_values,
        fill='toself',
        name='핵심 가치 요인'
    ))
    fig_radar.update_layout(
        polar=dict(radialaxis=dict(visible=True, range=[0, 100])),
        title="핵심 구매 결정 요인 (언급 빈도)"
    )

    # =========================================================
    # 결과 반환
    # =========================================================
    
    # NSS 게이지 차트
    fig_nss = go.Figure(go.Indicator(
        mode = "gauge+number",
        value = nss_score,
        title = {'text': "시장 감성 지표 (NSS)"},
        gauge = {'axis': {'range': [-100, 100]}, 'bar': {'color': "darkblue"}}
    ))
    
    return {
        "has_data": True,
        "search_term": item_name if item_name else item_id,
        "total_reviews": int(total_count),
        "metrics": {
            "nss": round(nss_score, 2),
            "cas": round(cas_score, 2),
            "avg_rating": round(filtered['rating'].mean(), 2) if 'rating' in filtered.columns else 0
        },
        "charts": {
            "pain_points": json.loads(fig_pain.to_json()),
            "delight_points": json.loads(fig_delight.to_json()),
            "value_radar": json.loads(fig_radar.to_json()),
            "nss_gauge": json.loads(fig_nss.to_json())
        }
    }
    
    # CAS (Customer Advocacy Score)
    # 재구매의사(repurchase) + 추천의사(recommendation) 모두 True인 비율
    advocates = filtered[
        (filtered['repurchase_intent_hybrid'] == True) & 
        (filtered['recommendation_intent_hybrid'] == True)
    ].shape[0]
    cas_score = (advocates / total_count) if total_count > 0 else 0
    
    # 시각화 1: NSS 게이지 차트
    fig_nss = go.Figure(go.Indicator(
        mode = "gauge+number",
        value = nss_score,
        title = {'text': "NSS (순 정서 점수)"},
        gauge = {
            'axis': {'range': [-100, 100]},
            'bar': {'color': "darkblue"},
            'steps' : [
                {'range': [-100, -30], 'color': "#ff4d4f"}, # 부정적
                {'range': [-30, 30], 'color': "#faad14"},   # 중립적
                {'range': [30, 100], 'color': "#52c41a"}    # 긍정적
            ],
            'threshold' : {'line': {'color': "black", 'width': 4}, 'thickness': 0.75, 'value': nss_score}
        }
    ))
    fig_nss.update_layout(height=300, margin=dict(l=20, r=20, t=50, b=20))

    # 시각화 2: ASIN별 NSS vs CAS 산점도 (전체 데이터 기준 비교)
    # 비교를 위해 전체 데이터셋에서 ASIN별로 집계
    asin_stats = df_consumer.groupby('asin').agg(
        total=('sentiment_score', 'count'),
        pos_count=('sentiment_score', lambda x: (x >= 0.75).sum()),
        neg_count=('sentiment_score', lambda x: (x <= 0.25).sum()),
        advocates=('rating', lambda x: 0) # 임시 초기화
    ).reset_index()
    
    # CAS 집계 (복잡한 조건이라 별도 계산 후 병합)
    cas_counts = df_consumer[
        (df_consumer['repurchase_intent_hybrid'] == True) & 
        (df_consumer['recommendation_intent_hybrid'] == True)
    ].groupby('asin').size().reset_index(name='adv_count')
    
    asin_stats = pd.merge(asin_stats, cas_counts, on='asin', how='left').fillna(0)
    
    asin_stats['nss'] = (asin_stats['pos_count'] - asin_stats['neg_count']) / asin_stats['total'] * 100
    asin_stats['cas'] = asin_stats['adv_count'] / asin_stats['total']
    
    # 현재 선택된 ASIN 하이라이트
    current_asins = filtered['asin'].unique()
    
    fig_scatter_nss = go.Figure()
    
    # 전체 분포
    fig_scatter_nss.add_trace(go.Scatter(
        x=asin_stats['nss'], y=asin_stats['cas'],
        mode='markers',
        marker=dict(color='lightgray', size=8, opacity=0.5),
        name='타사 제품'
    ))
    
    # 현재 제품
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


    # =========================================================
    # 2. Operations View: 운영 리스크 및 물류 최적화
    # =========================================================
    
    # PQI (Product Quality Index)
    # quality_issues_semantic 컬럼 explode
    quality_exploded = filtered.explode('quality_issues_semantic')
    quality_issues_count = quality_exploded['quality_issues_semantic'].dropna().value_counts()
    
    total_reviews = filtered.shape[0]
    total_issues = quality_issues_count.sum()
    
    # 단순화된 PQI: 100점 만점에서 이슈 발생 비율만큼 차감 (가중치 임의 설정 10)
    # 이슈가 하나도 없으면 100
    pqi_score = max(0, 100 - (total_issues / total_reviews * 20)) if total_reviews > 0 else 100
    
    # LFI (Logistics Friction Index)
    # delivery_issues_semantic 및 packaging에서 파손 관련 키워드
    cols_to_check = ['delivery_issues_semantic', 'packaging_keywords']
    lfi_keywords = ['dent', 'leak', 'broken', 'damage', 'crush', 'open']
    
    lfi_count = 0
    for col in cols_to_check:
        if col in filtered.columns:
            exploded = filtered.explode(col)
            # 해당 키워드가 포함된 경우 카운트
            mask = exploded[col].astype(str).str.contains('|'.join(lfi_keywords), case=False, na=False)
            lfi_count += mask.sum()
            
    # LFI: 전체 리뷰 중 파손 관련 언급 비율 (낮을수록 좋음, 0~10 scale로 변환 표시)
    lfi_rate = (lfi_count / total_reviews * 100) if total_reviews > 0 else 0
    
    # 시각화 3: 이슈 트리맵 (Quality Issues)
    if not quality_issues_count.empty:
        fig_treemap = px.treemap(
            names=quality_issues_count.index,
            parents=["Quality Issues"] * len(quality_issues_count),
            values=quality_issues_count.values,
            title="주요 품질 불만 (Quality Issues)"
        )
    else:
        fig_treemap = go.Figure()
        fig_treemap.update_layout(title="품질 불만 데이터가 없습니다.")

    # =========================================================
    # 3. R&D View: 관능 프로파일링 및 레시피 제안
    # =========================================================
    
    # SPI (Sensory Performance Index)
    # sensory_conflict가 False인 비율 (일치도)
    spi_score = (filtered[filtered['sensory_conflict'] == False].shape[0] / total_reviews * 100) if total_reviews > 0 else 0
    
    # Texture-Sentiment Correlation
    # texture_terms explode하여 각 텍스처별 평균 평점 계산
    texture_exploded = filtered.explode('texture_terms')
    texture_sentiment = texture_exploded.groupby('texture_terms')['sentiment_score'].mean().sort_values(ascending=False).head(8)
    
    # 시각화 4: 관능 레이더 차트 (상위 5개 텍스처 특성)
    if not texture_sentiment.empty:
        categories = texture_sentiment.index.tolist()
        values = texture_sentiment.values.tolist()
        # 레이더 차트 닫기 위해 첫 번째 값 추가
        categories_radar = categories + [categories[0]]
        values_radar = values + [values[0]]
        
        fig_radar = go.Figure(data=go.Scatterpolar(
            r=values_radar,
            theta=categories_radar,
            fill='toself',
            name='Texture Sentiment'
        ))
        fig_radar.update_layout(
            polar=dict(radialaxis=dict(visible=True, range=[0, 1])),
            title="식감별 선호도 (Textural Preference)",
            height=400
        )
    else:
        fig_radar = go.Figure()

    # 성분(Ingredients) - 호불호 분석 (부정 리뷰에 많이 등장하는 성분)
    neg_reviews = filtered[filtered['sentiment_score'] <= 0.25]
    ingredients_exploded = neg_reviews.explode('ingredients')
    neg_ingredients = ingredients_exploded['ingredients'].value_counts().head(10)

    # =========================================================
    # 4. Marketing View: 타겟팅 및 가치 인식
    # =========================================================
    
    # Value Perception Score (-1 ~ 1) -> 평균
    # value_perception_hybrid values: -1, 0, 1
    value_score = filtered['value_perception_hybrid'].mean()
    
    # Price Sensitivity Ratio (True 비율)
    price_sensitive_ratio = filtered['price_sensitive'].mean() if 'price_sensitive' in filtered.columns else 0
    
    # 시각화 5: 가치-가격 4분면 매트릭스
    # ASIN별로 집계하여 배치
    marketing_stats = df_consumer.groupby('asin').agg(
        avg_value=('value_perception_hybrid', 'mean'),
        price_sens=('price_sensitive', 'mean')
    ).reset_index()
    
    if 'title' in df_consumer.columns:
        titles = df_consumer.groupby('asin')['title'].first().reset_index()
        marketing_stats = pd.merge(marketing_stats, titles, on='asin', how='left')
    else:
        marketing_stats['title'] = marketing_stats['asin']
    
    fig_marketing = go.Figure()
    
    # 전체 제품
    fig_marketing.add_trace(go.Scatter(
        x=marketing_stats['price_sens'], 
        y=marketing_stats['avg_value'],
        mode='markers',
        text=marketing_stats['title'],
        marker=dict(color='#8884d8', opacity=0.5),
        name='타사 제품'
    ))
    
    # 현재 제품
    curr_mk = marketing_stats[marketing_stats['asin'].isin(current_asins)]
    fig_marketing.add_trace(go.Scatter(
        x=curr_mk['price_sens'], 
        y=curr_mk['avg_value'],
        mode='markers',
        text=curr_mk['title'],
        marker=dict(color='#ff7300', size=15, symbol='diamond'),
        name='현재 제품'
    ))
    
    # 사분면 기준선 (Value 중심 0, Sensitivity 중심 0.5 가정)
    # Sensitivity는 0~1 비율이므로 0.5를 중심으로 잡을 수도 있고, 전체 평균을 잡을 수도 있음. 
    # 여기서는 0.5를 기준으로 함. Value는 -1~1이므로 0 기준.
    fig_marketing.add_hline(y=0, line_dash="dash", line_color="gray")
    fig_marketing.add_vline(x=0.5, line_dash="dash", line_color="gray")
    
    fig_marketing.add_annotation(x=0.2, y=0.8, text="Premium Zone (프리미엄)", showarrow=False, font=dict(color="blue"))
    fig_marketing.add_annotation(x=0.8, y=0.8, text="Mass Zone (가성비)", showarrow=False, font=dict(color="green"))
    
    fig_marketing.update_layout(
        title="가치-가격 포지셔닝 맵",
        xaxis_title="가격 민감도 (Price Sensitivity)",
        yaxis_title="가치 인식 (Value Perception)",
        template="plotly_white",
        height=500
    )


    return {
        "has_data": True,
        "item_id": item_id,
        "metrics": {
            "nss": round(nss_score, 2),
            "cas": round(cas_score, 2),
            "pqi": round(pqi_score, 2),
            "lfi": round(lfi_rate, 2),
            "spi": round(spi_score, 2),
            "value_score": round(value_score, 2),
            "price_sensitivity": round(price_sensitive_ratio, 2)
        },
        "charts": {
            "nss_gauge": json.loads(fig_nss.to_json()),
            "nss_cas_scatter": json.loads(fig_scatter_nss.to_json()),
            "quality_treemap": json.loads(fig_treemap.to_json()),
            "sensory_radar": json.loads(fig_radar.to_json()),
            "marketing_matrix": json.loads(fig_marketing.to_json())
        }
    }

@app.get("/dashboard")
async def dashboard():
    global df
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
