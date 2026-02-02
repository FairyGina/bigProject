from fastapi.testclient import TestClient
from main import app
import json
import traceback

def test_analyze_consumer():
    try:
        # Use context manager to trigger lifespan events
        with TestClient(app) as client:
            print("Testing /analyze/consumer endpoint...")
            
            # Option 1: Search by Name
            item_name = "Gochujang" 
            response = client.get(f"/analyze/consumer?item_name={item_name}")
            
            if response.status_code == 200:
                data = response.json()
                print(f"Response Status: {response.status_code}")
                # print("Keys:", data.keys())
                
                if data.get("has_data") is True:
                    print("Metrics:", json.dumps(data.get("metrics"), indent=2, ensure_ascii=False))
                    print("Charts:", list(data.get("charts").keys()))
                else:
                    print("No data found for", item_name)
                    print("Message:", data.get("message"))
            else:
                print("Error:", response.status_code, response.text)
                
    except Exception:
        traceback.print_exc()

if __name__ == "__main__":
    test_analyze_consumer()
