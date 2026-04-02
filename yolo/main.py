import time
import cv2
import threading
from flask import Flask, Response

import config
from camera_service import CameraService
from yolo_detector import YoloDetector
from driver_state_engine import DriverStateEngine
from alarm_controller import AlarmController
from event_sender import EventSender

# ================= Flask server (For debugging/viewing latest frame) =================
from flask_cors import CORS

app = Flask(__name__)
CORS(app) # Allow frontend to access the stream
latest_frame = None

def update_latest_frame(frame):
    global latest_frame
    latest_frame = frame.copy()

def generate_frames():
    global latest_frame
    while True:
        if latest_frame is None:
            time.sleep(0.1)
            continue
        
        # Encode the frame in JPEG format
        ret, jpeg = cv2.imencode(".jpg", latest_frame)
        if not ret:
            continue
            
        frame_bytes = jpeg.tobytes()
        yield (b'--frame\r\n'
               b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n\r\n')

@app.route("/latest")
def get_latest():
    global latest_frame
    if latest_frame is None:
        return "No frame yet", 404
    ret, jpeg = cv2.imencode(".jpg", latest_frame)
    return Response(jpeg.tobytes(), mimetype="image/jpeg")

@app.route("/video_feed")
def video_feed():
    return Response(generate_frames(),
                    mimetype='multipart/x-mixed-replace; boundary=frame')

def run_flask():
    app.run(host="0.0.0.0", port=config.FLASK_PORT, threaded=True)

# ================= Main Pipeline Loop =================
def start_pipeline():
    print("🚀 Starting Modular Driver Monitoring Edge Device!")
    
    # Initialize all components
    cam_service = CameraService(resolution=config.RESOLUTION)
    detector = YoloDetector(model_path=config.MODEL_PATH, min_thresh=config.MIN_THRESH)
    state_engine = DriverStateEngine()
    alarm = AlarmController()
    sender = EventSender(api_url=config.API_URL, driver_id=config.DRIVER_ID)

    # Start camera and flask
    cam_service.start()
    threading.Thread(target=run_flask, daemon=True).start()
    print(f"🌐 Flask server running on http://0.0.0.0:{config.FLASK_PORT}")

    # Track when we last sent an alert to prevent spamming
    last_alert_time = 0

    try:
        while True:
            # 1. Capture Camera Frame
            frame = cam_service.get_frame()
            if frame is None:
                continue
            
            # 2. YOLO Preprocessing & Inference -> Bounding Boxes & Class Detection
            detections = detector.detect(frame)
            if detections:
                print(f"🔍 Detections found: {[d['class'] for d in detections]} (Confidence: {[round(d['conf'], 2) for d in detections]})")
            
            # Draw bounding boxes
            for det in detections:
                xmin, ymin, xmax, ymax = det['bbox']
                color = (0, 0, 255) # Red for simplicity
                cv2.rectangle(frame, (xmin, ymin), (xmax, ymax), color, 2)
                cv2.putText(frame, f"{det['class']} {int(det['conf']*100)}%", (xmin, ymin-10), cv2.FONT_HERSHEY_SIMPLEX, 0.6, color, 2)

            # 3. Driver Behavior Logic Engine
            event_type, severity, highest_conf = state_engine.process_detections(detections)

            current_time = time.time()
            if event_type and (current_time - last_alert_time >= config.ALERT_COOLDOWN):
                print(f"🚨 Behavior Logic Triggered! Event: {event_type}, Severity: {severity}, Confidence: {highest_conf:.2f}")
                
                # 4. Trigger Local Alarm
                alarm.trigger_alarm(severity_level=severity)
                
                # 5. Send Event to Backend API (Asynchronously)
                sender.send_event_async(event_type=event_type, severity=severity, confidence=highest_conf, frame=frame.copy())
                
                last_alert_time = current_time

            # Update frame for Flask stream
            update_latest_frame(frame)

            # Show window if enabled
            if config.SHOW_VIDEO:
                cv2.imshow("Main Pipeline", frame)
                if cv2.waitKey(5) & 0xFF == ord('q'):
                    break
    
    except KeyboardInterrupt:
        print("\n🛑 Pipeline gracefully stopped.")
    finally:
        cam_service.stop()
        if config.SHOW_VIDEO:
            cv2.destroyAllWindows()

if __name__ == "__main__":
    start_pipeline()
