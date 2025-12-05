import requests
import os

BASE_URL = "http://20.199.136.163:5001"

def test_health():
    print("Testing Health Check...")
    try:
        res = requests.get(f"{BASE_URL}/health")
        print(f"Status: {res.status_code}")
        print(f"Response: {res.json()}")
    except Exception as e:
        print(f"Health check failed: {e}")

def test_chat_text():
    print("\nTesting Chat (Text Only)...")
    try:
        res = requests.post(f"{BASE_URL}/chat", data={"message": "Bonjour"}, stream=True)
        print("Response Stream:")
        for chunk in res.iter_content(chunk_size=1024):
            print(chunk.decode('utf-8'), end="")
        print()
    except Exception as e:
        print(f"Chat text failed: {e}")

def test_csv_upload():
    print("\nTesting CSV Upload (First 1000 lines from payment_list.csv)...")
    
    source_file = "payment_list.csv"
    target_file = "real_large_test.csv"
    
    if not os.path.exists(source_file):
        print(f"Error: {source_file} not found.")
        return

    # Read 1000 lines from source and write to target
    try:
        with open(source_file, "r", encoding="utf-8") as f_in, open(target_file, "w", encoding="utf-8", newline='') as f_out:
            # Read header
            header = f_in.readline()
            f_out.write(header)
            
            count = 0
            for line in f_in:
                f_out.write(line)
                count += 1
                if count >= 1000:
                    break
        print(f"Created {target_file} with {count} rows from {source_file}.")
    except Exception as e:
        print(f"Error preparing test file: {e}")
        return

    try:
        with open(target_file, "rb") as f:
            files = {'file': f}
            res = requests.post(f"{BASE_URL}/upload-csv", files=files)
            
        if res.status_code == 200:
            print(f"Success! Received content of size: {len(res.content)} bytes")
            print(f"First 50 bytes: {res.content[:50]}")
            
            try:
                import zipfile
                import io
                z = zipfile.ZipFile(io.BytesIO(res.content))
                print(f"Valid ZIP file. Contains: {z.namelist()}")
            except zipfile.BadZipFile:
                print("ERROR: The received file is NOT a valid ZIP file.")
                print(f"Content preview: {res.content[:200]}")

            with open("test_report_large.zip", "wb") as f:
                f.write(res.content)
            print("Saved to test_report_large.zip")
        else:
            print(f"Error: {res.status_code} - {res.text}")
    except Exception as e:
        print(f"CSV upload failed: {e}")

def test_chat_audio():
    print("\nTesting Chat (Audio)...")
    # Create a dummy WAV file (1 second of silence)
    import wave
    if not os.path.exists("test_audio.wav"):
        with wave.open("test_audio.wav", "wb") as wav_file:
            wav_file.setnchannels(1)
            wav_file.setsampwidth(2)
            wav_file.setframerate(44100)
            wav_file.writeframes(b'\x00\x00' * 44100) # 1 sec silence
            
    try:
        with open("test_audio.wav", "rb") as f:
            # We can also send a text message with it
            data = {"message": "J'ai envoyé un fichier audio de test (silence). Peux-tu confirmer que tu l'as reçu ?"}
            files = {'file': ('test_audio.wav', f, 'audio/wav')}
            res = requests.post(f"{BASE_URL}/chat", data=data, files=files, stream=True)
            
        print("Response Stream:")
        for chunk in res.iter_content(chunk_size=1024):
            print(chunk.decode('utf-8'), end="")
        print()
    except Exception as e:
        print(f"Chat audio failed: {e}")

if __name__ == "__main__":
    test_health()
    test_chat_text()
    test_chat_audio()
    test_csv_upload()
