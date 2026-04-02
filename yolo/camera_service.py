import cv2
import numpy as np
import time
import config
import threading

try:
    from picamera2 import Picamera2
    HAS_PICAMERA_MOD = True
except ImportError:
    HAS_PICAMERA_MOD = False
    print("WARNING: picamera2 not found. Falling back to OpenCV VideoCapture.")

class CameraService:
    def __init__(self, resolution="900x900", source=0):
        self.resW, self.resH = map(int, resolution.split("x"))
        self.is_running = False
        self.cam = None
        self.mode = "opencv"
        self.source = source
        self._lock = threading.Lock()
        
        ip_cam_url = getattr(config, "IP_CAMERA_URL", "")
        if ip_cam_url:
            print(f"📡 IP Camera URL configured: {ip_cam_url}")
            self.mode = "ip_camera"
            self.ip_cam_url = ip_cam_url
        elif HAS_PICAMERA_MOD:
            print("📷 Using native PiCamera2")
            self.mode = "picamera"
            self.cam = Picamera2()
            self.cam.configure(self.cam.create_video_configuration(
                main={"format": "XRGB8888", "size": (self.resW, self.resH)}
            ))
        else:
            print(f"📷 Using OpenCV local webcam source {source}")
            self.mode = "opencv"
            self.cam = cv2.VideoCapture(source)
            if self.cam.isOpened():
                self.cam.set(cv2.CAP_PROP_FRAME_WIDTH, self.resW)
                self.cam.set(cv2.CAP_PROP_FRAME_HEIGHT, self.resH)

    def _connect_ip_camera(self):
        """Attempt to connect to the IP camera. Returns True on success."""
        urls_to_try = [
            self.ip_cam_url,
        ]
        # If the URL ends with /video, also try /mjpegfeed (DroidCam variant)
        if self.ip_cam_url.endswith("/video"):
            base = self.ip_cam_url.rsplit("/video", 1)[0]
            urls_to_try.append(f"{base}/mjpegfeed")
        
        for url in urls_to_try:
            print(f"   🔌 Trying to connect: {url} ...")
            cap = cv2.VideoCapture(url)
            if cap.isOpened():
                ret, frame = cap.read()
                if ret and frame is not None:
                    print(f"   ✅ Successfully connected to: {url}")
                    with self._lock:
                        if self.cam is not None:
                            self.cam.release()
                        self.cam = cap
                    return True
                else:
                    print(f"   ⚠️  Opened but could not read frame from: {url}")
                    cap.release()
            else:
                print(f"   ❌ Failed to open: {url}")
                cap.release()
        
        return False

    def start(self):
        if self.mode == "picamera":
            self.cam.start()
        elif self.mode == "ip_camera":
            # Try initial connection
            if not self._connect_ip_camera():
                print("   ⏳ IP camera not reachable yet. Will retry in background...")
                self._start_reconnect_thread()
        self.is_running = True

    def _start_reconnect_thread(self):
        """Background thread that keeps trying to connect to the IP camera."""
        def reconnect_loop():
            while self.is_running:
                time.sleep(5)
                with self._lock:
                    if self.cam is not None and self.cam.isOpened():
                        return  # Already connected
                print("   🔄 Retrying IP camera connection...")
                if self._connect_ip_camera():
                    return
        
        t = threading.Thread(target=reconnect_loop, daemon=True)
        t.start()

    def get_frame(self):
        if not self.is_running:
            return None
            
        if self.mode == "picamera":
            try:
                frame_bgra = self.cam.capture_array()
                frame = cv2.cvtColor(frame_bgra, cv2.COLOR_BGRA2BGR)
                return frame
            except Exception as e:
                print(f"Camera capture error: {e}")
                return self._get_dummy_frame()
        else:
            with self._lock:
                cam = self.cam
            
            if cam is None or not cam.isOpened():
                return self._get_dummy_frame()
                
            ret, frame = cam.read()
            if not ret or frame is None:
                # Connection lost — trigger reconnect
                if self.mode == "ip_camera":
                    print("   📡 IP camera frame read failed. Triggering reconnect...")
                    with self._lock:
                        if self.cam is not None:
                            self.cam.release()
                            self.cam = None
                    self._start_reconnect_thread()
                return self._get_dummy_frame()
            return frame

    def stop(self):
        self.is_running = False
        with self._lock:
            if self.mode == "picamera":
                self.cam.stop()
            elif self.cam is not None:
                self.cam.release()
            
    def _get_dummy_frame(self):
        img = np.zeros((self.resH, self.resW, 3), dtype=np.uint8)
        cv2.putText(img, "Camera/Stream Offline...", (50, self.resH//2), 
                    cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 255, 255), 2)
        cv2.putText(img, "Waiting for feed", (50, self.resH//2 + 40), 
                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, (180, 180, 180), 1)
        time.sleep(0.5)
        return img
