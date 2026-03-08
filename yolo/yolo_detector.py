from ultralytics import YOLO

class YoloDetector:
    def __init__(self, model_path="best_ncnn_model", min_thresh=0.5):
        self.model = YOLO(model_path)
        self.labels = self.model.names
        self.min_thresh = min_thresh

    def detect(self, frame):
        """
        Runs YOLO inference on the frame and returns bounding boxes and classes.
        Returns a list of dictionaries: [{'class': name, 'conf': confidence, 'bbox': (xmin, ymin, xmax, ymax)}]
        """
        results = self.model(frame, verbose=False)
        detections = results[0].boxes
        
        parsed_detections = []
        for det in detections:
            conf = det.conf.item()
            if conf < self.min_thresh:
                continue

            xyxy = det.xyxy.cpu().numpy().astype(int).squeeze()
            xmin, ymin, xmax, ymax = xyxy
            class_id = int(det.cls.item())
            classname = self.labels[class_id]

            parsed_detections.append({
                "class": classname,
                "conf": conf,
                "bbox": (xmin, ymin, xmax, ymax)
            })

        return parsed_detections
