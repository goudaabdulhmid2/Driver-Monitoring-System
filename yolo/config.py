import os

def load_env(env_path=".env"):
    if os.path.exists(env_path):
        with open(env_path) as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#"):
                    # Split on first equals sign
                    parts = line.split("=", 1)
                    if len(parts) == 2:
                        key, value = parts
                        os.environ.setdefault(key.strip(), value.strip())

# Load variables from .env if present
load_env()

# Export configurations
API_URL = os.environ.get("API_URL", "http://localhost:8080/api/events")
DRIVER_ID = os.environ.get("DRIVER_ID", "CHANGEME")

MODEL_PATH = os.environ.get("MODEL_PATH", "best_ncnn_model")
RESOLUTION = os.environ.get("RESOLUTION", "640x640")
IP_CAMERA_URL = os.environ.get("IP_CAMERA_URL", "")
MIN_THRESH = float(os.environ.get("MIN_THRESH", 0.3))
ALERT_COOLDOWN = float(os.environ.get("ALERT_COOLDOWN", 2.0))

SHOW_VIDEO = os.environ.get("SHOW_VIDEO", "False").lower() in ("true", "1", "yes")
FLASK_PORT = int(os.environ.get("FLASK_PORT", 5000))
