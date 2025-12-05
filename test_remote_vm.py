import requests
import pandas as pd
import time
import os

SERVER_URL = "http://20.199.136.163:5000"

def test_remote_bulk():
    print(f"🚀 Testing Remote Server at {SERVER_URL}...")
    
    # Create small dataset
    try:
        df = pd.read_csv('resources/payment_list.csv', nrows=100)
        csv_content = df.to_csv(index=False)
    except Exception as e:
        print(f"❌ Error reading CSV: {e}")
        return

    print(f"📤 Sending 100 transactions...")
    start_time = time.time()
    
    try:
        files = {'file': ('test_100.csv', csv_content, 'text/csv')}
        response = requests.post(f"{SERVER_URL}/transfer-bulk", files=files, timeout=60)
        
        elapsed = time.time() - start_time
        
        if response.status_code == 200:
            print(f"✅ Success! Time: {elapsed:.2f}s")
            print(f"💾 Saving report to remote_report.zip...")
            with open('remote_report.zip', 'wb') as f:
                f.write(response.content)
            print("Done.")
        else:
            print(f"❌ Failed. Status: {response.status_code}")
            print(f"Response: {response.text}")
            
    except Exception as e:
        print(f"❌ Connection Error: {e}")
        print("Make sure the server is running and port 5000 is exposed.")

if __name__ == "__main__":
    test_remote_bulk()
