import pandas as pd

try:
    df = pd.read_csv('amz_insight_data.csv')
    print("ASINs:", df['asin'].unique()[:5])
except Exception as e:
    print(e)
