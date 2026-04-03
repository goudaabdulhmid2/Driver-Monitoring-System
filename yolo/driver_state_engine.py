import time

class DriverStateEngine:
    def __init__(self):
        # Timers to track duration of certain conditions
        self.state_timers = {
            "drowsy": None,
            "no_face": None
        }
        
        # Thresholds in seconds (lowered for immediate prototyping testing)
        self.thresholds = {
            "drowsy": 0.5,
            "no_face": 2.0
        }
        
        # Mapping rules to standard event types
        self.EVENT_MAP = {
            # Immediate Phone & Distraction Rules
            "phone": "PHONE_USAGE",
            "phone_usage": "PHONE_USAGE",
            "mobile phone": "PHONE_USAGE",
            "cell phone": "PHONE_USAGE",
            "my-phone": "PHONE_USAGE",
            "distraction": "DISTRACTION",
            "looking away": "DISTRACTION",
            "smoke": "DISTRACTION",
            "no_seatbelt": "NO_SEATBELT",
            "no seatbelt": "NO_SEATBELT",
            "seat-belt": "NO_SEATBELT",
            "yawning": "DROWSINESS",
            "yawn": "DROWSINESS",
            
            # Reprogrammed Drowsiness to an IMMEDIATE trigger to bypass YOLO frame drop jitter!
            "drowsy": "DROWSINESS",
            "eyes_closed": "DROWSINESS",
            "closed eyes": "DROWSINESS",
            "closed_eyes": "DROWSINESS",
            "0": "DROWSINESS"
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
        # REMOVED: Drowsiness is now an immediate trigger handled by EVENT_MAP above
        # This prevents YOLO frame-jitter from resetting the timer.

        # Rule 3: Time-based trigger (No Face)
        # YOLO doesn't detect 'absence', it simply outputs 0 bounding boxes.
        # Alternatively, it might explicitly output 'no_face'. 
        explicit_no_face = any(k in detected_classes for k in ["no_face", "no face", "1"])
        no_detections_at_all = (len(detections) == 0)
        
        if explicit_no_face or no_detections_at_all:
            if self.state_timers["no_face"] is None:
                self.state_timers["no_face"] = current_time
            elif current_time - self.state_timers["no_face"] > self.thresholds["no_face"]:
                event_to_trigger = "NO_FACE"
                severity = "HIGH"
                highest_conf = 0.99
        else:
            self.state_timers["no_face"] = None

        return event_to_trigger, severity, highest_conf
