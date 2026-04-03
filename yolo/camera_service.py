import subprocess
import threading
import time
import cv2
import numpy as np

HAS_PICAMERA = False # Disabled pip bindings in favor of rpicam-vid subprocess

class CameraService:
    def __init__(self, resolution="640x640", source=0, ip_camera_url=""):
        self.resW, self.resH = map(int, resolution.split("x"))
        self.is_running = False
        self.mode = "DUMMY"
        self.latest_frame = None
        self.process = None
        self.frame_size = int(self.resW * self.resH * 1.5) # Size of YUV420 frame
        
        if ip_camera_url:
            print(f"📡 IP_CAMERA_URL detected! Skipping local hardware checks.")
            self._init_opencv(source, ip_camera_url)
            return

        try:
            print("📷 Attempting to use Native Pi Camera via rpicam-vid subprocess...")
            cmd = [
                "rpicam-vid",
                "-t", "0",
                "--width", str(self.resW),
                "--height", str(self.resH),
                "--codec", "yuv420", 
                "--framerate", "15",
                "--nopreview",
                "-o", "-"
            ]
            self.process = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
            
            # Read one frame to test if the camera is actually working
            test_bytes = self.process.stdout.read(self.frame_size)
            if len(test_bytes) == self.frame_size:
                self.mode = "RPICAM"
                self._decode_yuv(test_bytes)
                print("✅ Successfully connected to Pi Camera via rpicam-vid.")
            else:
                err_output = self.process.stderr.read().decode('utf-8')
                raise Exception(f"Could not read initial frame. Error details: {err_output}")
        except Exception as e:
            if self.process:
                self.process.kill()
            print(f"⚠️ Native Pi Camera (rpicam-vid) failed. Details: {e}\nFalling back to OpenCV.")
            self._init_opencv(source, "")

    def _init_opencv(self, source, ip_camera_url):
        self.cam_source = ip_camera_url if ip_camera_url else source
        print(f"🎬 Initializing OpenCV VideoCapture (Target={self.cam_source})...")
        # Ensure FFMPEG is used for the TCP stream decoding
        self.cam = cv2.VideoCapture(self.cam_source, cv2.CAP_FFMPEG)
        
        if self.cam.isOpened():
            # CRITICAL LATENCY FIX: Force OpenCV to drop buffered TCP frames 
            self.cam.set(cv2.CAP_PROP_BUFFERSIZE, 1)
            
        # We lock into OPENCV mode. If it fails to open, get_frame will handle the auto-reconnect!
        self.mode = "OPENCV"

    def start(self):
        self.is_running = True
        if self.mode == "RPICAM":
            threading.Thread(target=self._rpicam_reader, daemon=True).start()
        elif self.mode == "OPENCV":
            threading.Thread(target=self._opencv_reader, daemon=True).start()
        print(f"✅ Camera Service started in {self.mode} mode.")

    def _rpicam_reader(self):
        while self.is_running and self.process:
            raw_data = self.process.stdout.read(self.frame_size)
            if len(raw_data) != self.frame_size:
                print("⚠️ Camera stream from rpicam-vid broken or lagging.")
                time.sleep(1)
                continue
            self._decode_yuv(raw_data)

    def _opencv_reader(self):
        while self.is_running:
            if self.cam and self.cam.isOpened():
                ret, frame = self.cam.read()
                if ret and frame is not None:
                    self.latest_frame = frame
                else:
                    self.latest_frame = None
                    print(f"⚠️ OpenCV failed to read frame. Attempting reconnect to {self.cam_source}...")
                    self.cam.release()
                    time.sleep(2)
                    self.cam = cv2.VideoCapture(self.cam_source, cv2.CAP_FFMPEG)
                    self.cam.set(cv2.CAP_PROP_BUFFERSIZE, 1)
            else:
                self.latest_frame = None
                print(f"⚠️ Camera not opened. Attempting reconnect to {self.cam_source}...")
                if self.cam:
                    self.cam.release()
                time.sleep(2)
                self.cam = cv2.VideoCapture(self.cam_source, cv2.CAP_FFMPEG)
                if self.cam.isOpened():
                    self.cam.set(cv2.CAP_PROP_BUFFERSIZE, 1)
                    print(f"✅ Reconnected successfully!")

    def _decode_yuv(self, raw_data):
        yuv = np.frombuffer(raw_data, dtype=np.uint8).reshape((int(self.resH * 1.5), self.resW))
        self.latest_frame = cv2.cvtColor(yuv, cv2.COLOR_YUV2BGR_I420)

    def get_frame(self):
        if not self.is_running:
            return None
            
        if self.latest_frame is None:
            return self._get_dummy_frame()
            
        return self.latest_frame.copy()

    def stop(self):
        self.is_running = False
        if self.mode == "RPICAM" and self.process:
            self.process.kill()
        elif self.mode == "OPENCV" and self.cam:
            self.cam.release()
            
    def _get_dummy_frame(self):
        # Create a blank image with text "Camera Offline"
        img = np.zeros((self.resH, self.resW, 3), dtype=np.uint8)
        cv2.putText(img, "Camera Offline. Waiting for feed...", (50, self.resH//2), 
                    cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 255, 255), 2)
        time.sleep(0.5) # Prevent 100% CPU on empty frames loop
        return img
