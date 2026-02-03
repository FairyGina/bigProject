import pandas as pd

try:
    df = pd.read_csv('amz_insight_data.csv')
    df = pd.read_csv('amz_insight_data.csv')
    print("Columns List:")
    for col in df.columns:
        print(f"- {col}")
except Exception as e:
    print(e)
