import time

class DriverStateEngine:
    def __init__(self):
        # Mapping rules to standard event types
        self.EVENT_MAP = {
            # Phone Usage
            "phone": "PHONE_USAGE",
            "phone_usage": "PHONE_USAGE",
            "mobile phone": "PHONE_USAGE",
            "cell phone": "PHONE_USAGE",
            "my-phone": "PHONE_USAGE",
            # Distraction
            "distraction": "DISTRACTION",
            "looking away": "DISTRACTION",
            "smoke": "DISTRACTION",
            # Seatbelt
            "no_seatbelt": "NO_SEATBELT",
            "no seatbelt": "NO_SEATBELT",
            "seat-belt": "NO_SEATBELT",
            # Drowsiness (immediate trigger)
            "drowsy": "DROWSINESS",
            "yawning": "DROWSINESS",
            "yawn": "DROWSINESS",
            "eyes_closed": "DROWSINESS",
            "closed eyes": "DROWSINESS",
            "closed_eyes": "DROWSINESS",
            "0": "DROWSINESS"
        }

        # Severity priority: higher number = more dangerous
        self.SEVERITY_MAP = {
            "DROWSINESS": ("CRITICAL", 4),
            "PHONE_USAGE": ("MEDIUM", 2),
            "DISTRACTION": ("MEDIUM", 2),
            "NO_SEATBELT": ("MEDIUM", 2)
        }

        # Classes to completely ignore (driver is fine)
        self.IGNORED_CLASSES = {"normal", "safe", "awake", "seatbelt", "seat_belt"}

    def process_detections(self, detections):
        """
        Receives a list of detections from YOLO and evaluates the business rules.
        Returns a tuple: (event_to_trigger, event_severity, highest_confidence) or (None, None, None)
        """
        detected_classes = {det['class'].lower(): det['conf'] for det in detections}

        best_event = None
        best_severity = "LOW"
        best_priority = -1
        highest_conf = 0.0

        for cls_name, conf in detected_classes.items():
            # Skip safe/normal classes
            if cls_name in self.IGNORED_CLASSES:
                continue

            if cls_name in self.EVENT_MAP:
                event = self.EVENT_MAP[cls_name]
                severity, priority = self.SEVERITY_MAP.get(event, ("MEDIUM", 1))

                # Always pick the most dangerous event if multiple are detected
                if priority > best_priority or (priority == best_priority and conf > highest_conf):
                    best_event = event
                    best_severity = severity
                    best_priority = priority
                    highest_conf = max(highest_conf, conf)

        return best_event, best_severity, highest_conf
