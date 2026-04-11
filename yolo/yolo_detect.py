import time
import cv2
import requests
import base64
import threading
from ultralytics import YOLO
from picamera2 import Picamera2
from flask import Flask, Response
import config

# ================= Flask server =================
app = Flask(__name__)
latest_frame = None

def update_latest_frame(frame):
    global latest_frame
    latest_frame = frame.copy()

@app.route("/latest")
def get_latest():
    global latest_frame
    if latest_frame is None:
        return "No frame yet", 404
    ret, jpeg = cv2.imencode(".jpg", latest_frame)
    return Response(jpeg.tobytes(), mimetype="image/jpeg")

def run_flask():
    app.run(host="0.0.0.0", port=config.FLASK_PORT)

# ================= YOLO Detection =================
model = YOLO(config.MODEL_PATH)
labels = model.names
resW, resH = map(int, config.RESOLUTION.split("x"))

cam = Picamera2()
cam.configure(cam.create_video_configuration(main={"format": "XRGB8888", "size": (resW, resH)}))
cam.start()

last_class_sent = None
last_alert = 0

# تشغيل Flask في Thread منفصل
threading.Thread(target=run_flask, daemon=True).start()
print("Flask server running on http://0.0.0.0:{}".format(config.FLASK_PORT))

bbox_colors = [(0,255,0),(255,0,0),(0,0,255),(255,255,0),(255,0,255),(0,255,255)]

# Mapping YOLO classes to API Event Types
CLASS_TO_EVENT_MAP = {
    "drowsy": "DROWSINESS",
    "yawning": "DROWSINESS", # Optional: map yawning to drowsiness or something else
    "phone": "PHONE_USAGE",
    "phone_usage": "PHONE_USAGE",
    "distraction": "DISTRACTION",
    "no_seatbelt": "NO_SEATBELT",
    "normal": "NORMAL"
}

def send_alert_to_backend(classname, confidence, frame):
    event_type = CLASS_TO_EVENT_MAP.get(classname.lower(), "NORMAL")
    if event_type == "NORMAL":
        return

    # Encode frame to base64
    ret, buffer = cv2.imencode('.jpg', frame)
    snapshot = ""
    if ret:
        snapshot = "data:image/jpeg;base64," + base64.b64encode(buffer).decode('utf-8')

    payload = {
        "driverId": config.DRIVER_ID,
        "eventType": event_type,
        "confidence": confidence,
        "source": "AI",
        "snapshotUrl": snapshot
    }

    try:
        response = requests.post(config.API_URL, json=payload, timeout=3)
        print(f"✅ Backend Updated: {event_type} - {response.status_code}")
    except Exception as e:
        print(f"❌ Failed to reach backend API: {e}")

while True:
    frame_bgra = cam.capture_array()
    frame = cv2.cvtColor(frame_bgra, cv2.COLOR_BGRA2BGR)

    results = model(frame, verbose=False)
    detections = results[0].boxes

    new_object_detected = False
    highest_conf = 0.0
    detected_class = None

    for det in detections:
        conf = det.conf.item()
        if conf < config.MIN_THRESH:
            continue

        xyxy = det.xyxy.cpu().numpy().astype(int).squeeze()
        xmin, ymin, xmax, ymax = xyxy
        class_id = int(det.cls.item())
        classname = labels[class_id]

        if conf > highest_conf:
            highest_conf = conf
            detected_class = classname

        # رسم الصندوق حول object
        color = bbox_colors[class_id % len(bbox_colors)]
        cv2.rectangle(frame, (xmin, ymin), (xmax, ymax), color, 2)
        cv2.putText(frame, f"{classname} {int(conf*100)}%", (xmin, ymin-10),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, color, 2)

        new_object_detected = True

    # إرسال الصورة إذا object جديد
    now = time.time()
    if detected_class and (detected_class != last_class_sent or now - last_alert >= config.ALERT_COOLDOWN):
        update_latest_frame(frame)
        last_alert = now
        last_class_sent = detected_class
        print(f"🚨 Sent new detection: {detected_class}")
        
        # Send to API in separate thread so it doesn't block capture loops
        threading.Thread(target=send_alert_to_backend, args=(detected_class, highest_conf, frame.copy())).start()

    # حتى لو مفيش object جديد، نخزن الصورة الأخيرة
    if not new_object_detected:
        update_latest_frame(frame)

    if config.SHOW_VIDEO:
        cv2.imshow("YOLO Detection", frame)
        if cv2.waitKey(5) & 0xFF == ord('q'):
            break

cam.stop()
if config.SHOW_VIDEO:
    cv2.destroyAllWindows()
