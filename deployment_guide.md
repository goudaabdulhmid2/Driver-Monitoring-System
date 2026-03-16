# YOLO Edge Deployment & Camera Configuration Guide

Getting camera hardware to talk to Docker containers can be straightforward or complex depending on your host OS. Here is a comprehensive guide on how to configure the physical or virtual camera feed for the Driver Monitoring System depending on your hardware.

---

## Option 1: Raspberry Pi / Linux (The Ideal Edge Target)
If you deploy this project to a Raspberry Pi or a native Linux machine, Docker can directly access connected USB webcams or the Pi Camera module.

**Steps:**
1. Connect your USB camera or Pi Camera.
2. In [docker-compose.yml](file:///d:/Driver-Monitoring-System/docker-compose.yml), uncomment the `devices` mapping under the `yolo` service:
   ```yaml
   yolo:
     # ...
     devices:
       - "/dev/video0:/dev/video0"
   ```
3. Run `docker-compose up -d`. The container will natively grab the camera feed, process it, and stream it to the frontend.

---

## Option 2: Windows / Mac PC with a Local Webcam
Docker Desktop on Windows (WSL2) or Mac runs in a lightweight virtual machine. It **cannot** easily pass your built-in laptop webcam or a standard USB webcam directly into the Docker container (`/dev/video0` doesn't exist on these OSs in the same way).

**Steps (Hybrid Approach - Recommended for PC dev):**
Run the backend and frontend in Docker, but run the YOLO Edge AI natively on your machine so it can access your physical camera.

1. Stop the YOLO container:  
   `docker stop dms_yolo`
2. Leave the backend and frontend running.
3. Open a terminal and navigate to the `yolo` folder.
4. Set up a Python virtual environment:
   ```bash
   python -m venv venv
   .\venv\Scripts\activate
   pip install -r requirements.txt
   ```
5. Ensure [yolo/.env](file:///d:/Driver-Monitoring-System/yolo/.env) has the correct API URL to hit the docker backend exposed port:
   `API_URL=http://localhost:8080/api/alerts`
6. Run the script:
   `python main.py`
   OpenCV natively triggers your PC's webcam (index 0).

---

## Option 3: The "Universal" Option (Works Everywhere)
If you want an option that works perfectly inside Docker regardless of whether you are on Windows, Mac, or a Raspberry Pi, you must abstract the camera away from the physical USB port. 

### Method: IP Camera / RTSP Stream
Instead of trying to pass a physical USB cable into a virtual machine, you provide a network URL to a camera.

**How it works:**
1. You use an app like **IP Webcam** (Android) or **EpocCam** (iOS/PC) to turn your phone or a spare device into an IP Camera on your local WiFi network.
2. The app gives you a URL (e.g., `http://192.168.1.100:8080/video`).
3. You modify [yolo/camera_service.py](file:///d:/Driver-Monitoring-System/yolo/camera_service.py) to read from this URL instead of the physical port `0`.

**Changes required in [camera_service.py](file:///d:/Driver-Monitoring-System/yolo/camera_service.py):**
```python
# Change this:
self.cam = cv2.VideoCapture(0)

# To this:
camera_url = "http://192.168.1.100:8080/video" # Your IP camera URL
self.cam = cv2.VideoCapture(camera_url)
```

**Why this is the best universal solution:**
* Network traffic passes effortlessly into Docker containers on ALL operating systems (Windows, Mac, Linux).
* You don't need to mess with `/dev/video0` or hardware pass-throughs.
* It simulates the real-world scenario where edge devices often pull feeds from networked IP cameras mounted in vehicles.
