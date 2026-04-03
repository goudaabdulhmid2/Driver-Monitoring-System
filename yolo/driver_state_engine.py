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
            "mobile phone": "PHONE_USAGE",
            "cell phone": "PHONE_USAGE",
            "distraction": "DISTRACTION",
            "looking away": "DISTRACTION",
            "no_seatbelt": "NO_SEATBELT",
            "no seatbelt": "NO_SEATBELT",
            "yawning": "DROWSINESS",
            "yawn": "DROWSINESS"
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
        drowsy_keys = ["drowsy", "eyes_closed", "closed eyes", "closed_eyes"]
        if any(k in detected_classes for k in drowsy_keys):
            if self.state_timers["drowsy"] is None:
                self.state_timers["drowsy"] = current_time
            elif current_time - self.state_timers["drowsy"] > self.thresholds["drowsy"]:
                event_to_trigger = "DROWSINESS"
                severity = "CRITICAL"
                # Get max confidence of whichever drowsy key matched
                confList = [detected_classes[k] for k in drowsy_keys if k in detected_classes]
                highest_conf = max(highest_conf, max(confList) if confList else 0.99)
        else:
            self.state_timers["drowsy"] = None

        # Rule 3: Time-based trigger (No Face)
        noface_keys = ["no_face", "no face"]
        if any(k in detected_classes for k in noface_keys):
            if self.state_timers["no_face"] is None:
                self.state_timers["no_face"] = current_time
            elif current_time - self.state_timers["no_face"] > self.thresholds["no_face"]:
                event_to_trigger = "NO_FACE"
                severity = "HIGH"
                confList = [detected_classes[k] for k in noface_keys if k in detected_classes]
                highest_conf = max(highest_conf, max(confList) if confList else 0.99)
        else:
            self.state_timers["no_face"] = None

        return event_to_trigger, severity, highest_conf
