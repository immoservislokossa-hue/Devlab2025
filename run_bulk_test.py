import subprocess
import time
import requests
import sys
import os
import threading

def stream_reader(pipe, prefix):
    for line in iter(pipe.readline, ''):
        print(f"{prefix}: {line.strip()}")

def run_test():
    print("🚀 Starting Flask Server (server.py)...")
    
    # Start server.py
    server_process = subprocess.Popen(
        [sys.executable, '-u', 'server.py'],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        bufsize=1,
        cwd=os.getcwd()
    )

    # Start threads to read stdout/stderr
    threading.Thread(target=stream_reader, args=(server_process.stdout, "SERVER_OUT"), daemon=True).start()
    threading.Thread(target=stream_reader, args=(server_process.stderr, "SERVER_ERR"), daemon=True).start()

    # Wait for server to start
    print("⏳ Waiting for server to initialize...")
    time.sleep(5)

    try:
        print("📂 Sending CSV file to /transfer-bulk...")
        files = {'file': open('resources/payment_list.csv', 'rb')}
        response = requests.post('http://localhost:5000/transfer-bulk', files=files)
        
        print(f"📨 Response Status: {response.status_code}")
        if response.status_code == 200:
            print("✅ File accepted. Processing complete.")
            
            # Save the received ZIP file
            output_filename = f"bulk_transfer_report_{int(time.time())}.zip"
            with open(output_filename, 'wb') as f:
                f.write(response.content)
            print(f"💾 Report saved to: {output_filename}")
            
        else:
            print(f"❌ Error sending file: {response.text}")

    except Exception as e:
        print(f"❌ Exception during test: {e}")
    finally:
        print("🛑 Stopping server...")
        server_process.terminate()
        try:
            server_process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            server_process.kill()
        print("🏁 Test finished.")

if __name__ == "__main__":
    run_test()
