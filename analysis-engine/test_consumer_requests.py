import requests
import json
import time

def test_analyze_consumer():
    base_url = "http://127.0.0.1:8000"
    
    # 1. Ping Check
    try:
        ping = requests.get(base_url + "/")
        print(f"Ping /: {ping.status_code} {ping.json()}")
    except Exception as e:
        print(f"Ping failed: {e}")
        return

    url = base_url + "/analyze/consumer"
    # ... rest of code uses url
    item_name = "Gochujang"
    params = {"item_name": item_name}
    
    # Wait for server to be ready (naive wait)
    max_retries = 5
    for i in range(max_retries):
        try:
            response = requests.get(url, params=params)
            if response.status_code == 200:
                data = response.json()
                print(f"Response Status: {response.status_code}")
                if data.get("has_data") is True:
                    print("Metrics:", json.dumps(data.get("metrics"), indent=2, ensure_ascii=False))
                    print("Charts:", list(data.get("charts").keys()))
                else:
                    print("No data found for", item_id)
                    print("Full Data:", data)
                return
            else:
                print("Error:", response.status_code, response.text)
                return
        except requests.ConnectionError:
            print(f"Server not ready, retrying ({i+1}/{max_retries})...")
            time.sleep(2)
            
    print("Server failed to respond after retries.")

if __name__ == "__main__":
    test_analyze_consumer()
