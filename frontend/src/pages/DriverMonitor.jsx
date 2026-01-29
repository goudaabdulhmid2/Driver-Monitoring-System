import React, { useRef, useEffect, useState } from 'react';
import Webcam from 'react-webcam';
import { FaceMesh } from '@mediapipe/face_mesh';
import * as cam from '@mediapipe/camera_utils';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const DriverMonitor = () => {
    const webcamRef = useRef(null);
    const canvasRef = useRef(null);
    const { user } = useAuth();

    // State
    const [status, setStatus] = useState('Active');
    const [lastAlertTime, setLastAlertTime] = useState(0);

    // Landmarks for Eyes (Mesh468)
    // Left Eye: 33, 160, 158, 133, 153, 144 (approx)
    // Right Eye: 362, 385, 387, 263, 373, 380
    const LEFT_EYE = [33, 160, 158, 133, 153, 144];
    const RIGHT_EYE = [362, 385, 387, 263, 373, 380];

    const calculateEAR = (landmarks, indices) => {
        // Euclidean distance function
        const dist = (p1, p2) => Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));

        const p1 = landmarks[indices[0]];
        const p2 = landmarks[indices[1]];
        const p3 = landmarks[indices[2]];
        const p4 = landmarks[indices[3]];
        const p5 = landmarks[indices[4]];
        const p6 = landmarks[indices[5]];

        const ear = (dist(p2, p6) + dist(p3, p5)) / (2 * dist(p1, p4));
        return ear;
    };

    const onResults = async (results) => {
        if (!results.multiFaceLandmarks || results.multiFaceLandmarks.length === 0) {
            return;
        }

        const landmarks = results.multiFaceLandmarks[0];

        // Draw Logic (Optional, for debugging)
        // ... implementation of drawing would go here

        // EAR Logic
        const leftEAR = calculateEAR(landmarks, LEFT_EYE);
        const rightEAR = calculateEAR(landmarks, RIGHT_EYE);
        const avgEAR = (leftEAR + rightEAR) / 2;

        // Thresholds
        const EAR_THRESHOLD = 0.25; // Experimental value

        if (avgEAR < EAR_THRESHOLD) {
            handleEvent('DROWSINESS', 'High chance of drowsy driver', 'HIGH');
        }

        // Head Pose Logic (Simplified using nose position relative to face width)
        // Ideally use PnP algorithm, but heuristic: 
        // Nose tip: 1, Left cheek: 234, Right cheek: 454
        const nose = landmarks[1];
        const leftCheek = landmarks[234];
        const rightCheek = landmarks[454];

        const faceMidpoint = (leftCheek.x + rightCheek.x) / 2;
        const yawStatus = nose.x - faceMidpoint; // Positive = Right turn, Negative = Left

        if (Math.abs(yawStatus) > 0.1) { // Threshold
            handleEvent('DISTRACTION', 'Driver looking away', 'MEDIUM');
        }
    };

    const handleEvent = async (type, desc, severity) => {
        const now = Date.now();
        if (now - lastAlertTime < 5000) return; // Debounce 5s

        setLastAlertTime(now);
        setStatus(`ALERT: ${type}`);

        // Capture Snapshot
        const imageSrc = webcamRef.current.getScreenshot();

        try {
            await axios.post('http://localhost:5000/api/events', {
                driverId: user._id,
                eventType: type,
                confidence: 0.9,
                severity: severity,
                snapshotUrl: imageSrc // Base64 for MVP. optimized to upload to S3/Cloudinary in Prod
            });
            console.log("Event Sent:", type);
        } catch (error) {
            console.error("Error sending event", error);
        }

        // Reset status after a bit
        setTimeout(() => setStatus('Active'), 3000);
    };

    const onUserMedia = (stream) => {
        // Camera logic initialized here to ensure video element isn't null
        const faceMesh = new FaceMesh({
            locateFile: (file) => {
                return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`;
            }
        });

        faceMesh.setOptions({
            maxNumFaces: 1,
            refineLandmarks: true,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5
        });

        faceMesh.onResults(onResults);

        if (webcamRef.current && webcamRef.current.video) {
            const camera = new cam.Camera(webcamRef.current.video, {
                onFrame: async () => {
                    if (webcamRef.current && webcamRef.current.video) {
                        await faceMesh.send({ image: webcamRef.current.video });
                    }
                },
                width: 640,
                height: 480
            });
            camera.start();
        }
    };

    return (
        <div className="card">
            <h2>Driver Monitor</h2>
            <div style={{ position: 'relative' }}>
                <Webcam
                    ref={webcamRef}
                    onUserMedia={onUserMedia}
                    screenshotFormat="image/jpeg"
                    style={{ width: '100%', borderRadius: '8px' }}
                />
                <canvas ref={canvasRef} style={{ position: 'absolute', top: 0, left: 0 }} />
            </div>
            <div style={{ marginTop: '20px', padding: '10px', background: status.includes('ALERT') ? 'red' : 'green', borderRadius: '4px' }}>
                <strong>Status:</strong> {status}
            </div>
        </div>
    );
};

export default DriverMonitor;
