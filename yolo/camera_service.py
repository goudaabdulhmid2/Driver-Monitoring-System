import cv2
from picamera2 import Picamera2

class CameraService:
    def __init__(self, resolution="900x900"):
        self.resW, self.resH = map(int, resolution.split("x"))
        self.cam = Picamera2()
        self.cam.configure(self.cam.create_video_configuration(main={"format": "XRGB8888", "size": (self.resW, self.resH)}))
        self.is_running = False

    def start(self):
        self.cam.start()
        self.is_running = True

    def get_frame(self):
        if not self.is_running:
            return None
        frame_bgra = self.cam.capture_array()
        frame = cv2.cvtColor(frame_bgra, cv2.COLOR_BGRA2BGR)
        return frame

    def stop(self):
        self.cam.stop()
        self.is_running = False
