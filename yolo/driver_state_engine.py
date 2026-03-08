import time

class DriverStateEngine:
    def __init__(self):
        # Timers to track duration of certain conditions
        self.state_timers = {
            "drowsy": None,
            "no_face": None
        }
        
        # Thresholds in seconds
        self.thresholds = {
            "drowsy": 2.0,
            "no_face": 3.0
        }
        
        # Mapping rules to standard event types
        self.EVENT_MAP = {
            "phone": "PHONE_USAGE",
            "phone_usage": "PHONE_USAGE",
            "distraction": "DISTRACTION",
            "no_seatbelt": "NO_SEATBELT",
            "yawning": "DROWSINESS"
        }

    def process_detections(self, detections):
        """
        Receives a list of detections from YOLO and evaluates the business rules.
        Returns a tuple: (event_to_trigger, event_severity, highest_confidence) or (None, None, None)
        """
        detected_classes = {det['class'].lower(): det['conf'] for det in detections}
        current_time = time.time()
        
        event_to_trigger = None
        severity = "LOW"
        highest_conf = 0.0

        # Rule 1: Immediate triggers
        for cls_name, conf in detected_classes.items():
            if cls_name in self.EVENT_MAP:
                event_to_trigger = self.EVENT_MAP[cls_name]
                highest_conf = max(highest_conf, conf)
                severity = "MEDIUM" # Default to medium, backend handles auto-mapping too

        # Rule 2: Time-based triggers (Drowsiness)
        if "drowsy" in detected_classes or "eyes_closed" in detected_classes:
            if self.state_timers["drowsy"] is None:
                self.state_timers["drowsy"] = current_time
            elif current_time - self.state_timers["drowsy"] > self.thresholds["drowsy"]:
                event_to_trigger = "DROWSINESS"
                severity = "CRITICAL"
                highest_conf = max(highest_conf, detected_classes.get("drowsy", 0.99))
        else:
            self.state_timers["drowsy"] = None

        # Rule 3: Time-based trigger (No Face)
        if "no_face" in detected_classes:
            if self.state_timers["no_face"] is None:
                self.state_timers["no_face"] = current_time
            elif current_time - self.state_timers["no_face"] > self.thresholds["no_face"]:
                event_to_trigger = "NO_FACE"
                severity = "HIGH"
                highest_conf = max(highest_conf, detected_classes.get("no_face", 0.99))
        else:
            self.state_timers["no_face"] = None

        return event_to_trigger, severity, highest_conf
