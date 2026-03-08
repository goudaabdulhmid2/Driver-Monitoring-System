class AlarmController:
    def __init__(self):
        # In a real Pi environment, you might use:
        # from gpiozero import Buzzer
        # self.buzzer = Buzzer(17)
        self.is_sounding = False
        print("AlarmController initialized.")

    def trigger_alarm(self, severity_level):
        """
        Triggers the local physical alarm on the Pi.
        """
        print(f"🔊 [ALARM] Alert triggered for severity: {severity_level}!")
        
        if severity_level == "CRITICAL":
            # self.buzzer.beep(on_time=0.1, off_time=0.1, n=5)
            print("🔊 BEEP BEEP BEEP (Critical Alert)")
        elif severity_level == "HIGH":
            # self.buzzer.beep(on_time=0.5, off_time=0.5, n=2)
            print("🔊 BEEP BEEP (High Alert)")
        elif severity_level == "MEDIUM":
            # self.buzzer.beep(on_time=1, off_time=0, n=1)
            print("🔊 BEEP (Medium Alert)")

    def stop_alarm(self):
        # self.buzzer.off()
        print("🔇 [ALARM] Stopped.")
