import cv2
import numpy as np
import time
import config

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
        
        ip_cam_url = getattr(config, "IP_CAMERA_URL", "")
        if ip_cam_url:
            print(f"📡 Connecting to IP Camera: {ip_cam_url}")
            self.mode = "opencv"
            self.cam = cv2.VideoCapture(ip_cam_url)
        elif HAS_PICAMERA_MOD:
            print("📷 Using native PiCamera2")
            self.mode = "picamera"
            self.cam = Picamera2()
            self.cam.configure(self.cam.create_video_configuration(main={"format": "XRGB8888", "size": (self.resW, self.resH)}))
        else:
            print(f"📷 Using OpenCV local webcam source {source}")
            self.mode = "opencv"
            self.cam = cv2.VideoCapture(source)
            
        if self.mode == "opencv":
            self.cam.set(cv2.CAP_PROP_FRAME_WIDTH, self.resW)
            self.cam.set(cv2.CAP_PROP_FRAME_HEIGHT, self.resH)

    def start(self):
        if self.mode == "picamera":
            self.cam.start()
        self.is_running = True

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
            ret, frame = self.cam.read()
            if not ret or frame is None:
                # Provide a dummy frame to keep the stream alive if camera is missing
                return self._get_dummy_frame()
            return frame

    def stop(self):
        self.is_running = False
        if self.mode == "picamera":
            self.cam.stop()
        else:
            self.cam.release()
            
    def _get_dummy_frame(self):
        # Create a blank image with text "Camera Offline"
        img = np.zeros((self.resH, self.resW, 3), dtype=np.uint8)
        cv2.putText(img, "Camera/Stream Offline...", (50, self.resH//2), 
                    cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 255, 255), 2)
        time.sleep(0.5) # Prevent 100% CPU on empty frames loop
        return img
