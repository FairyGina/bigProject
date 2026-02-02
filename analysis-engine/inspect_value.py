import pandas as pd

try:
    df = pd.read_csv('amz_insight_data.csv')
    if 'value_perception_hybrid' in df.columns:
        print("Unique values:", df['value_perception_hybrid'].unique())
        print("Describe:", df['value_perception_hybrid'].describe())
    else:
        print("Column 'value_perception_hybrid' not found.")
except Exception as e:
    print(e)
