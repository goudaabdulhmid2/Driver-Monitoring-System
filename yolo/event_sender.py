import requests
import base64
import cv2
import threading

class EventSender:
    def __init__(self, api_url, driver_id):
        self.api_url = api_url
        self.driver_id = driver_id

    def send_event_async(self, event_type, severity, confidence, frame):
        """
        Triggers the HTTP POST Request in a background thread so the camera stream doesn't block.
        """
        thread = threading.Thread(target=self._send_event, args=(event_type, severity, confidence, frame))
        thread.daemon = True
        thread.start()

    def _send_event(self, event_type, severity, confidence, frame):
        # Encode frame to base64 for snapshot
        snapshot = ""
        if frame is not None:
            ret, buffer = cv2.imencode('.jpg', frame)
            if ret:
                snapshot = "data:image/jpeg;base64," + base64.b64encode(buffer).decode('utf-8')

        payload = {
            "driverId": self.driver_id,
            "eventType": event_type,
            "severity": severity,
            "confidence": confidence,
            "source": "AI",
            "snapshotUrl": snapshot
        }

        try:
            response = requests.post(self.api_url, json=payload, timeout=3)
            print(f"✅ Event Sent to Backend: {event_type} - Response: {response.status_code}")
        except Exception as e:
            print(f"❌ Failed to reach backend API ({self.api_url}): {e}")
