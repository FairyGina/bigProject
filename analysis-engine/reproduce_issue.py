import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
from collections import Counter
import traceback

# Mock the dataframe loading
try:
    df_consumer = pd.read_csv('amz_insight_data.csv')
    print("CSV Loaded. Shape:", df_consumer.shape)
except Exception as e:
    print("CSV Load Error:", e)
    df_consumer = pd.DataFrame()

def extract_top_keywords(text_series, top_n=5):
    try:
        from collections import Counter
        all_terms = []
        for text in text_series.dropna():
            if isinstance(text, str):
                # Simple split by comma or space if pre-processed
                terms = text.split(',') 
                # Clean whitespace
                terms = [t.strip() for t in terms if t.strip()]
                all_terms.extend(terms)
        
        counts = Counter(all_terms)
        common = counts.most_common(top_n)
        return dict(common), [term for term, count in common]
    except Exception as e:
        print(f"Keyword extraction error: {e}")
        return {}, []

def analyze_consumer_simulation(item_name: str):
    global df_consumer
    print(f"Analyzing for: {item_name}")
    
    if df_consumer is None or df_consumer.empty:
        print("No data")
        return
    
    # 1. Filtering Logic
    filtered = pd.DataFrame()
    
    try:
        # Mode A: Keyword/Category Analysis
        if item_name:
            target_col = 'title' if 'title' in df_consumer.columns else 'cleaned_text'
            print(f"Target Column: {target_col}")
            
            if target_col in df_consumer.columns:
                filtered = df_consumer[df_consumer[target_col].str.contains(item_name, case=False, na=False)].copy()
            else:
                 print("Missing text columns")
                 return
        
        print(f"Filtered Rows: {len(filtered)}")
        if filtered.empty: return

        # === [CRITICAL] Data Fill / Fallback Logic ===
        # Ensure rating is numeric
        if 'rating' in filtered.columns:
            filtered['rating'] = pd.to_numeric(filtered['rating'], errors='coerce').fillna(3.0)

        # 1. Sentiment Score
        if 'sentiment_score' not in filtered.columns:
            if 'rating' in filtered.columns:
                filtered['sentiment_score'] = (filtered['rating'] - 1) / 4
            else:
                filtered['sentiment_score'] = 0.5
    except Exception as e:
        print(f"Error in filtering block: {e}")
        traceback.print_exc()
        return

    # 2. Intents (Copying logic from main.py)
    if 'repurchase_intent_hybrid' not in filtered.columns:
         filtered['repurchase_intent_hybrid'] = filtered['rating'] >= 4
    if 'recommendation_intent_hybrid' not in filtered.columns:
         filtered['recommendation_intent_hybrid'] = filtered['rating'] >= 4
         
    # 3. Keywords/Terms placeholders
    for col in ['review_text_keywords', 'title_keywords', 'flavor_terms', 'price', 'quality_issues_semantic', 'delivery_issues_semantic']:
        if col not in filtered.columns:
            filtered[col] = None 
            
    total_count = filtered.shape[0]
    print(f"Total Count for Stats: {total_count}")

    # NSS
    pos_count = filtered[filtered['sentiment_score'] >= 0.75].shape[0]
    neg_count = filtered[filtered['sentiment_score'] <= 0.25].shape[0]
    nss_score = ((pos_count - neg_count) / total_count * 100) if total_count > 0 else 0
    print(f"NSS Score: {nss_score}")

    # Segment Data
    neg_reviews = filtered[filtered['rating'] <= 2]
    pos_reviews = filtered[filtered['rating'] >= 4]
    
    # Extract Why
    target_col = 'review_text_keywords'
    use_text_extraction = False
    
    # Check if target_col is all None (it should be since we filled it with None)
    if filtered[target_col].isna().all():
        use_text_extraction = True
        print("Using Text Extraction Fallback")
        
    if use_text_extraction:
        def get_simple_keywords(text_series):
            from collections import Counter
            if text_series.empty: return {}
            all_text = " ".join(text_series.dropna().astype(str).tolist()).lower()
            words = [w for w in all_text.split() if len(w) > 3] 
            return dict(Counter(words).most_common(5))
            
        pain_points = get_simple_keywords(neg_reviews['cleaned_text'])
        delight_points = get_simple_keywords(pos_reviews['cleaned_text'])
        print("Pain Points:", pain_points)
    else:
        pain_points, pain_labels = extract_top_keywords(neg_reviews[target_col], top_n=5)
        delight_points, delight_labels = extract_top_keywords(pos_reviews[target_col], top_n=5)

    # Visualization
    fig_pain = px.bar(
        x=list(pain_points.values()),
        y=list(pain_points.keys()),
        orientation='h'
    )
    print("Fig Pain created")

    # Value Radar
    metrics = {
        "Taste": 0, "Price": 0, "Package": 0, "Quality": 0, "Delivery": 0, "Texture": 0
    }
    all_text_combined = " ".join(filtered['cleaned_text'].dropna().astype(str).tolist()).lower()
    metrics['Taste'] = all_text_combined.count('taste')
    print("Radar Metrics:", metrics)

    return "Success"

if __name__ == "__main__":
    analyze_consumer_simulation("Gochujang")
