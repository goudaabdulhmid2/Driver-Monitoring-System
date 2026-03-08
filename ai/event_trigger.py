import json
import time
import requests
import random
import base64
import os

API_URL = "http://localhost:8080/api/events"
# Mock Driver ID representing a populated driver in the database
DRIVER_ID = "CHANGEME" # User will need to set this to a real driver ID

EVENTS = ['DROWSINESS', 'DISTRACTION', 'PHONE_USAGE', 'NO_FACE', 'NO_SEATBELT', 'NORMAL']

def get_snapshot():
    """Mocks a base64 snapshot string"""
    # In a real scenario, this would capture a frame from cv2, encode it to jpg, and base64 it
    # For now, we will return a minimal dummy base64 string or None to simulate intermittent snapshots
    if random.random() > 0.5:
        # A tiny transparent 1x1 GIF just as placeholder data
        return "data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw=="
    return None

def simulate_detection():
    event_type = random.choices(EVENTS, weights=[10, 15, 5, 2, 5, 63], k=1)[0]
    
    if event_type == 'NORMAL':
        # If normal, maybe we don't send an event, or we send a 'NORMAL' ping. 
        # The API currently maps unrecognized events to LOW. But 'NORMAL' might not be meant for the Events log. 
        # For this simulator, we just skip logging NORMAL events to avoid spam.
        return None

    confidence = round(random.uniform(0.75, 0.99), 2)
    snapshot = get_snapshot()

    payload = {
        "driverId": DRIVER_ID,
        "eventType": event_type,
        "confidence": confidence,
        "source": "AI",
        "snapshotUrl": snapshot
    }

    try:
        response = requests.post(API_URL, json=payload)
        response.raise_for_status()
        print(f"[{time.strftime('%H:%M:%S')}] Triggered: {event_type} (Conf: {confidence}) -> DB Event created.")
    except Exception as e:
        print(f"Failed to trigger event: {e}")

def main():
    print(f"Starting AI Driver Simulator for Driver: {DRIVER_ID}")
    print("Sending random events every 10-30 seconds...")
    try:
        while True:
            simulate_detection()
            # Wait random time between 10 and 30 seconds
            time.sleep(random.randint(10, 30))
    except KeyboardInterrupt:
        print("Simulator stopped.")

if __name__ == "__main__":
    if DRIVER_ID == "CHANGEME":
        print("Warning: Please replace 'CHANGEME' with an actual Driver User ID from MongoDB before running.")
    else:
        main()
