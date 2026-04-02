import http.server
import urllib.request
import threading
import sys
import os

DROIDCAM_URL = "http://192.168.1.32:4747/video"
PROXY_PORT = 4748

class MJPEGProxyHandler(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        print(f"📥 Received request: {self.path}")
        if self.path != "/video":
            self.send_error(404)
            return

        print(f"🔌 Opening DroidCam: {DROIDCAM_URL}...")
        try:
            # Use a smaller timeout for the DroidCam connection
            # And use a User-Agent to mimic a browser
            headers = {'User-Agent': 'Mozilla/5.0'}
            req = urllib.request.Request(DROIDCAM_URL, headers=headers)
            with urllib.request.urlopen(req, timeout=5) as droid_res:
                print(f"✅ DroidCam connected. Status: {droid_res.getcode()}")
                content_type = droid_res.headers.get("Content-Type", "multipart/x-mixed-replace; boundary=--video_boundary--")
                
                self.send_response(200)
                self.send_header("Content-Type", content_type)
                self.send_header("Access-Control-Allow-Origin", "*")
                self.send_header("Connection", "close")
                self.end_headers()
                
                print("🚀 Streaming MJPEG...")
                while True:
                    chunk = droid_res.read(4096)
                    if not chunk:
                        break
                    self.wfile.write(chunk)
        except Exception as e:
            print(f"❌ Proxy error: {e}")
            self.send_error(502, f"Target unreachable: {e}")

    def log_message(self, format, *args):
        # Already logging via print
        pass

if __name__ == "__main__":
    print(f"🔗 DroidCam MJPEG Proxy (Verbose)")
    print(f"   Source: {DROIDCAM_URL}")
    print(f"   Listening on: http://localhost:{PROXY_PORT}/video")
    
    server = http.server.ThreadingHTTPServer(("0.0.0.0", PROXY_PORT), MJPEGProxyHandler)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n🛑 Stopped.")
        server.shutdown()
