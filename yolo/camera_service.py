import cv2
import numpy as np
import time

try:
    from picamera2 import Picamera2
    HAS_PICAMERA = True
except ImportError:
    HAS_PICAMERA = False
    print("WARNING: picamera2 not found. Falling back to OpenCV VideoCapture.")

class CameraService:
    def __init__(self, resolution="640x640", source=0):
        self.resW, self.resH = map(int, resolution.split("x"))
        self.is_running = False
        self.mode = "DUMMY"
        
        if HAS_PICAMERA:
            try:
                print("📷 Initializing Native Pi Camera Module (Picamera2)...")
                self.cam = Picamera2()
                config = self.cam.create_video_configuration(main={"format": "XRGB8888", "size": (self.resW, self.resH)})
                self.cam.configure(config)
                self.mode = "PICAMERA"
            except Exception as e:
                print(f"⚠️ Native Pi Camera failed: {e}. Falling back to OpenCV.")
                self._init_opencv(source)
        else:
            self._init_opencv(source)

    def _init_opencv(self, source):
        print(f"🎬 Initializing OpenCV VideoCapture (source={source})...")
        self.cam = cv2.VideoCapture(source)
        # Try source 1 if source 0 fails (common if Pi Camera is at 0)
        if not self.cam.isOpened() and source == 0:
            print("⚠️ source=0 failed, trying source=1...")
            self.cam = cv2.VideoCapture(1)
            
        if self.cam.isOpened():
            self.cam.set(cv2.CAP_PROP_FRAME_WIDTH, self.resW)
            self.cam.set(cv2.CAP_PROP_FRAME_HEIGHT, self.resH)
            self.mode = "OPENCV"
        else:
            print("❌ All cameras failed to initialize.")
            self.mode = "DUMMY"

    def start(self):
        if self.mode == "PICAMERA":
            self.cam.start()
        self.is_running = True
        print(f"✅ Camera Service started in {self.mode} mode.")

    def get_frame(self):
        if not self.is_running:
            return None
            
        if HAS_PICAMERA:
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
        if HAS_PICAMERA:
            self.cam.stop()
        else:
            self.cam.release()
            
    def _get_dummy_frame(self):
        # Create a blank image with text "Camera Offline"
        img = np.zeros((self.resH, self.resW, 3), dtype=np.uint8)
        cv2.putText(img, "Camera Offline. Waiting for feed...", (50, self.resH//2), 
                    cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 255, 255), 2)
        time.sleep(0.5) # Prevent 100% CPU on empty frames loop
        return img
