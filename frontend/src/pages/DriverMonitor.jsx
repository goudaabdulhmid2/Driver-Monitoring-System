import React, { useRef, useEffect, useState } from 'react';
import Webcam from 'react-webcam';
import { FaceMesh } from '@mediapipe/face_mesh';
import * as faceMeshUtils from '@mediapipe/face_mesh'; // For FACEMESH_TESSELATION etc if needed, or just hardcode
import { drawConnectors } from '@mediapipe/drawing_utils';
import '@tensorflow/tfjs';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import axios from 'axios';
import { io } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
    Video,
    LogOut,
    Activity,
    Eye,
    EyeOff,
    TriangleAlert,
    CheckCircle,
    Signal,
    User,
    Smartphone,
    Sun,
    Moon
} from 'lucide-react';

const DriverMonitor = () => {
    const webcamRef = useRef(null);
    const canvasRef = useRef(null);
    const { user, logout } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const requestRef = useRef();

    // State
    const [status, setStatus] = useState('Active');
    const [viewerCount, setViewerCount] = useState(0);
    const [lastAlertTime, setLastAlertTime] = useState(0);
    const socketRef = useRef();
    const peerRef = useRef();
    const faceMeshRef = useRef(null);

    // Stats for UI
    const [blinkCount, setBlinkCount] = useState(0);
    const [distractionCount, setDistractionCount] = useState(0);
    const [phoneCount, setPhoneCount] = useState(0);
    const [noFaceCount, setNoFaceCount] = useState(0);
    const [noSeatbeltCount, setNoSeatbeltCount] = useState(0);

    const cocoModelRef = useRef(null);
    const lastFaceDetectTime = useRef(Date.now());
    const aiIntervalRef = useRef(null);

    // Landmarks for Eyes (Mesh468)
    const LEFT_EYE = [33, 160, 158, 133, 153, 144];
    const RIGHT_EYE = [362, 385, 387, 263, 373, 380];

    useEffect(() => {
        // Initialize Socket.IO
        socketRef.current = io('http://localhost:8080');

        // Join stream room
        if (user && user._id) {
            const roomId = `stream_${user._id} `;
            socketRef.current.emit('join_stream_room', roomId);

            // Handle Viewer Joined
            socketRef.current.on('viewer_joined', (viewerId) => {
                setViewerCount(prev => prev + 1);
                handleViewerJoined(viewerId);
            });

            socketRef.current.on('answer', handleAnswer);
            socketRef.current.on('ice_candidate', handleNewICECandidateMsg);
        }

        // Initialize FaceMesh
        const faceMesh = new FaceMesh({
            locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
        });

        faceMesh.setOptions({
            maxNumFaces: 1,
            refineLandmarks: true,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5
        });

        faceMesh.onResults(onResults);
        faceMeshRef.current = faceMesh;

        // Load COCO-SSD for Phone detection
        const loadCoco = async () => {
            try {
                cocoModelRef.current = await cocoSsd.load();
                console.log("COCO-SSD loaded for phone detection");
            } catch (err) {
                console.error("Failed to load COCO-SSD", err);
            }
        };
        loadCoco();

        // Secondary Periodic AI Loop for Phone, No Face, and Seatbelt heuristic
        aiIntervalRef.current = setInterval(() => {
            if (!webcamRef.current || !webcamRef.current.video) return;
            const video = webcamRef.current.video;
            if (video.readyState !== 4) return;

            // Check NO_FACE (if 3 seconds passed since last face detection)
            if (Date.now() - lastFaceDetectTime.current > 3000) {
                handleEvent('NO_FACE', 'No Face Detected', 'HIGH');
                setNoFaceCount(prev => prev + 1);
                lastFaceDetectTime.current = Date.now(); // Reset to avoid alert spam
            }

            // Check PHONE_USAGE (heavy model, so run occasionally)
            if (cocoModelRef.current) {
                cocoModelRef.current.detect(video).then(predictions => {
                    // Check if a cell phone is in the predictions
                    const phone = predictions.find(p => p.class === 'cell phone' || p.class === 'remote');
                    if (phone && phone.score > 0.5) {
                        handleEvent('PHONE_USAGE', 'Phone Usage Detected', 'MEDIUM');
                        setPhoneCount(prev => prev + 1);
                    }
                });
            }

            // Check SEATBELT (Mock Heuristic for demonstration)
            // Simulates a 10% chance every second to detect an unfastened seatbelt
            if (Math.random() < 0.1) {
                handleEvent('NO_SEATBELT', 'Seatbelt Unfastened', 'MEDIUM');
                setNoSeatbeltCount(prev => prev + 1);
            }
        }, 1000);

        return () => {
            if (socketRef.current) socketRef.current.disconnect();
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
            if (faceMeshRef.current) faceMeshRef.current.close();
            if (aiIntervalRef.current) clearInterval(aiIntervalRef.current);
        };
    }, [user]);

    const handleViewerJoined = async (viewerId) => {
        console.log("Driver: Viewer joined signal received:", viewerId);
        const peer = createPeer(viewerId);
        peerRef.current = peer;

        // Add Stream Tracks
        if (webcamRef.current && webcamRef.current.stream) {
            console.log("Driver: Adding stream tracks to peer connection");
            webcamRef.current.stream.getTracks().forEach(track => {
                peer.addTrack(track, webcamRef.current.stream);
            });
        } else {
            console.warn("Driver: No webcam stream found to add!");
        }

        // Create Offer
        const offer = await peer.createOffer();
        await peer.setLocalDescription(offer);
        const payload = {
            target: viewerId,
            caller: socketRef.current.id,
            sdp: peer.localDescription
        };
        console.log("Driver: Sending Offer to Supervisor");
        socketRef.current.emit('offer', payload);
    };

    const createPeer = (targetId) => {
        const peer = new RTCPeerConnection({
            iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
        });
        peer.onicecandidate = (e) => {
            if (e.candidate) {
                const payload = { target: targetId, candidate: e.candidate };
                socketRef.current.emit('ice_candidate', payload);
            }
        };
        return peer;
    };

    const handleAnswer = (message) => {
        if (peerRef.current) {
            const desc = new RTCSessionDescription(message.sdp);
            peerRef.current.setRemoteDescription(desc).catch(e => console.error(e));
        }
    };

    const handleNewICECandidateMsg = (incoming) => {
        if (peerRef.current) {
            const candidate = new RTCIceCandidate(incoming.candidate);
            peerRef.current.addIceCandidate(candidate).catch(e => console.error(e));
        }
    };

    const calculateEAR = (landmarks, indices) => {
        const dist = (p1, p2) => Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
        const p1 = landmarks[indices[0]];
        const p2 = landmarks[indices[1]];
        const p3 = landmarks[indices[2]];
        const p4 = landmarks[indices[3]];
        const p5 = landmarks[indices[4]];
        const p6 = landmarks[indices[5]];
        return (dist(p2, p6) + dist(p3, p5)) / (2 * dist(p1, p4));
    };

    const onResults = async (results) => {
        // Draw on canvas
        const canvasCtx = canvasRef.current.getContext('2d');
        canvasCtx.save();
        canvasCtx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        canvasCtx.drawImage(results.image, 0, 0, canvasRef.current.width, canvasRef.current.height);

        if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
            lastFaceDetectTime.current = Date.now(); // Face found, update timestamp
            for (const landmarks of results.multiFaceLandmarks) {
                // Draw mesh
                drawConnectors(canvasCtx, landmarks, faceMeshUtils.FACEMESH_TESSELATION, { color: '#C0C0C070', lineWidth: 1 });

                // Draw eyes highlight
                drawConnectors(canvasCtx, landmarks, faceMeshUtils.FACEMESH_RIGHT_EYE, { color: '#FF3030', lineWidth: 2 });
                drawConnectors(canvasCtx, landmarks, faceMeshUtils.FACEMESH_LEFT_EYE, { color: '#FF3030', lineWidth: 2 });

                // Logic
                const leftEAR = calculateEAR(landmarks, LEFT_EYE);
                const rightEAR = calculateEAR(landmarks, RIGHT_EYE);
                const avgEAR = (leftEAR + rightEAR) / 2;
                const EAR_THRESHOLD = 0.25;

                if (avgEAR < EAR_THRESHOLD) {
                    handleEvent('DROWSINESS', 'Drowsiness Detected', 'HIGH');
                    setBlinkCount(prev => prev + 1);
                }

                const nose = landmarks[1];
                const leftCheek = landmarks[234];
                const rightCheek = landmarks[454];
                const faceMidpoint = (leftCheek.x + rightCheek.x) / 2;
                const yawStatus = nose.x - faceMidpoint;

                if (Math.abs(yawStatus) > 0.1) {
                    handleEvent('DISTRACTION', 'Distraction Detected', 'MEDIUM');
                    setDistractionCount(prev => prev + 1);
                }
            }
        }
        canvasCtx.restore();
    };

    const handleEvent = async (type, desc, severity) => {
        const now = Date.now();
        if (now - lastAlertTime < 5000) return;
        setLastAlertTime(now);
        setStatus(type);

        const imageSrc = webcamRef.current.getScreenshot();
        try {
            await axios.post('http://localhost:8080/api/events', {
                driverId: user._id,
                eventType: type,
                confidence: 0.9,
                severity: severity,
                snapshotUrl: imageSrc
            });
        } catch (error) {
            console.error("Error sending event", error);
        }
        setTimeout(() => setStatus('Active'), 3000);
    };

    // Manual loop
    const runFaceMesh = async () => {
        if (
            typeof webcamRef.current !== "undefined" &&
            webcamRef.current !== null &&
            webcamRef.current.video.readyState === 4 &&
            faceMeshRef.current
        ) {
            // Get Video Properties
            const video = webcamRef.current.video;
            const videoWidth = video.videoWidth;
            const videoHeight = video.videoHeight;

            // Set video width
            webcamRef.current.video.width = videoWidth;
            webcamRef.current.video.height = videoHeight;

            // Set canvas width
            canvasRef.current.width = videoWidth;
            canvasRef.current.height = videoHeight;

            await faceMeshRef.current.send({ image: video });
        }
        requestRef.current = requestAnimationFrame(runFaceMesh);
    };

    const onUserMedia = (stream) => {
        console.log("Webcam stream started");
        runFaceMesh();
    };

    const onUserMediaError = (error) => {
        console.error("Webcam error:", error);
        alert("Camera access denied or missing. Please allow camera access.");
    };

    const getStatusColor = () => {
        if (status === 'DROWSINESS') return '#ef4444';
        if (status === 'NO_FACE') return '#ef4444';
        if (status === 'DISTRACTION') return '#f59e0b';
        if (status === 'PHONE_USAGE') return '#f59e0b';
        if (status === 'NO_SEATBELT') return '#f59e0b';
        return '#22c55e';
    };

    return (
        <div className="dashboard-container">
            <header className="header">
                <div className="header-logo">
                    <Activity color="#3b82f6" />
                    <span>Edge Driver Monitor</span>
                </div>
                <div className="header-profile">
                    <div style={{ textAlign: 'right', marginRight: '10px', fontSize: '0.9rem' }}>
                        <div style={{ fontWeight: 600 }}>{user.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>ID: {user._id.slice(-6)}</div>
                    </div>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <User size={18} color="white" />
                    </div>
                    <button onClick={toggleTheme} className="btn-primary" style={{ padding: '6px 12px', fontSize: '0.8rem', marginLeft: '10px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                        {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
                    </button>
                    <button onClick={logout} className="btn-primary" style={{ padding: '6px 12px', fontSize: '0.8rem', marginLeft: '10px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                        <LogOut size={16} />
                    </button>
                </div>
            </header>

            <div className="dashboard-grid" style={{ height: 'calc(100vh - 80px)' }}>
                {/* Main Camera Feed */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', flex: 2 }}>
                    <div className="card-glass" style={{ flex: 1, padding: 0, overflow: 'hidden', position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#000' }}>
                        <Webcam
                            ref={webcamRef}
                            onUserMedia={onUserMedia}
                            onUserMediaError={onUserMediaError}
                            screenshotFormat="image/jpeg"
                            style={{
                                position: 'absolute',
                                left: 0,
                                right: 0,
                                textAlign: 'center',
                                zindex: 9,
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover'
                            }}
                            mirrored={true}
                        />
                        <canvas
                            ref={canvasRef}
                            style={{
                                position: 'absolute',
                                left: 0,
                                right: 0,
                                textAlign: 'center',
                                zindex: 9,
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover'
                            }}
                        />

                        {/* Overlay Status */}
                        <div style={{
                            position: 'absolute',
                            top: 20,
                            left: 20,
                            zIndex: 20,
                            background: 'rgba(0,0,0,0.6)',
                            padding: '8px 16px',
                            borderRadius: '30px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            backdropFilter: 'blur(4px)',
                            border: `1px solid ${getStatusColor()}`
                        }}>
                            <div style={{ width: 10, height: 10, borderRadius: '50%', background: getStatusColor(), boxShadow: `0 0 10px ${getStatusColor()}` }}></div>
                            <span style={{ color: 'white', fontWeight: 600, fontSize: '0.9rem' }}>SYSTEM STATUS: {status}</span>
                        </div>

                        {/* Viewer Indicator */}
                        {viewerCount > 0 && (
                            <div style={{
                                position: 'absolute',
                                top: 20,
                                right: 20,
                                zIndex: 20,
                                background: 'rgba(239, 68, 68, 0.9)',
                                padding: '8px 16px',
                                borderRadius: '30px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                color: 'white',
                                fontWeight: 600
                            }}>
                                <Signal size={16} className="animate-pulse" />
                                LIVE STREAMING
                            </div>
                        )}
                    </div>
                </div>

                {/* Sidebar Stats */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', flex: 1 }}>
                    <div className="card-glass">
                        <div className="card-title">Session Analytics</div>
                        <div className="stats-grid" style={{ gridTemplateColumns: '1fr' }}>
                            <div className="stat-card">
                                <span className="stat-label flex items-center gap-2"><EyeOff size={16} /> Eyes Closed Events</span>
                                <div className="stat-value-box">
                                    <span className="stat-value">{blinkCount}</span>
                                </div>
                            </div>
                            <div className="stat-card">
                                <span className="stat-label flex items-center gap-2"><Smartphone size={16} /> Phone Usage</span>
                                <div className="stat-value-box">
                                    <span className="stat-value">{phoneCount}</span>
                                </div>
                            </div>
                            <div className="stat-card">
                                <span className="stat-label flex items-center gap-2"><User size={16} /> No Face</span>
                                <div className="stat-value-box">
                                    <span className="stat-value">{noFaceCount}</span>
                                </div>
                            </div>
                            <div className="stat-card">
                                <span className="stat-label flex items-center gap-2"><CheckCircle size={16} /> No Seatbelt</span>
                                <div className="stat-value-box">
                                    <span className="stat-value">{noSeatbeltCount}</span>
                                </div>
                            </div>
                            <div className="stat-card">
                                <span className="stat-label flex items-center gap-2"><TriangleAlert size={16} /> Distraction Events</span>
                                <div className="stat-value-box">
                                    <span className="stat-value">{distractionCount}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="card-glass" style={{ flex: 1 }}>
                        <div className="card-title">System Health</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '10px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <Video size={18} color="#22c55e" />
                                    <span style={{ fontSize: '0.9rem' }}>Camera</span>
                                </div>
                                <span className="badge badge-green">Active</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <Activity size={18} color="#22c55e" />
                                    <span style={{ fontSize: '0.9rem' }}>AI Engine</span>
                                </div>
                                <span className="badge badge-green">Running</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <Signal size={18} color={viewerCount > 0 ? "#ef4444" : "#a0a0a0"} />
                                    <span style={{ fontSize: '0.9rem' }}>Uplink</span>
                                </div>
                                <span className={`badge ${viewerCount > 0 ? 'badge-red' : 'badge-green'}`}>
                                    {viewerCount > 0 ? 'Broadcasting' : 'Standby'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DriverMonitor;
