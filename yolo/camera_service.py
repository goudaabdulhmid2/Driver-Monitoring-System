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
    def __init__(self, resolution="900x900", source=0):
        self.resW, self.resH = map(int, resolution.split("x"))
        self.is_running = False
        
        if HAS_PICAMERA:
            self.cam = Picamera2()
            self.cam.configure(self.cam.create_video_configuration(main={"format": "XRGB8888", "size": (self.resW, self.resH)}))
        else:
            self.cam = cv2.VideoCapture(source)
            self.cam.set(cv2.CAP_PROP_FRAME_WIDTH, self.resW)
            self.cam.set(cv2.CAP_PROP_FRAME_HEIGHT, self.resH)

    def start(self):
        if HAS_PICAMERA:
            self.cam.start()
        self.is_running = True

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
