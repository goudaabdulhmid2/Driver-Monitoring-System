import requests
import time
import os

# Configuration (Simulating YOLO environment)
API_URL = os.environ.get("API_URL", "http://backend:5000/api/events")
DRIVER_ID = os.environ.get("DRIVER_ID", "CHANGEME")

def test_backend_connection():
    print(f"📡 Testing integration from YOLO container to Backend API...")
    print(f"   Target URL: {API_URL}")
    print(f"   Driver ID:  {DRIVER_ID}")
    print("-" * 50)

    payload = {
        "driverId": DRIVER_ID,
        "eventType": "TEST_CONNECTION",
        "severity": "LOW",
        "confidence": 1.0,
        "source": "AI_TEST_SCRIPT",
        "snapshotUrl": "" # No image for this test
    }

    try:
        start_time = time.time()
        response = requests.post(API_URL, json=payload, timeout=5)
        duration = time.time() - start_time
        
        if response.status_code == 201:
            print(f"✅ SUCCESS: Event sent successfully in {duration:.2f}s!")
            print(f"   Backend Response: {response.json()}")
            print("-" * 50)
            print("🚀 ACTION: Check your Driver Dashboard now. A new 'TEST_CONNECTION' event should appear in the Session Analytics!")
        else:
            print(f"❌ FAILED: Backend returned status code {response.status_code}")
            print(f"   Response Body: {response.text}")
    except Exception as e:
        print(f"❌ ERROR: Could not connect to backend at {API_URL}")
        print(f"   Details: {e}")

if __name__ == "__main__":
    test_backend_connection()
