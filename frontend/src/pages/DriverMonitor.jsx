import React, { useEffect, useState, useRef } from 'react';
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
    const { user, logout } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const socketRef = useRef(null);

    const [status, setStatus] = useState('Active');
    const [blinkCount, setBlinkCount] = useState(0);
    const [phoneCount, setPhoneCount] = useState(0);
    const [distractionCount, setDistractionCount] = useState(0);
    const [noSeatbeltCount, setNoSeatbeltCount] = useState(0);
    const [viewerCount, setViewerCount] = useState(0);

    // YOLO video stream URL
    const videoStreamUrl = 'http://localhost:5001/video_feed';

    useEffect(() => {
        // Initialize Socket.IO
        socketRef.current = io('http://localhost:8080');

        socketRef.current.on('connect', () => {
             console.log("Connected to Backend Socket");
        });

        // Use Socket.io to receive real alerts triggered by YOLO instead of calculating them locally
        socketRef.current.on('driver_status_update', (profileUpdate) => {
            // MVP Fix: Accept all incoming Edge AI events universally to eliminate Test Account ID mismatch bugs
            setStatus(profileUpdate.currentStatus);
            
            // Increment the realtime UI dashboard Analytics counters!
            if (profileUpdate.currentStatus === 'DROWSINESS') setBlinkCount(prev => prev + 1);
            if (profileUpdate.currentStatus === 'PHONE_USAGE') setPhoneCount(prev => prev + 1);
            if (profileUpdate.currentStatus === 'DISTRACTION') setDistractionCount(prev => prev + 1);
            if (profileUpdate.currentStatus === 'NO_SEATBELT') setNoSeatbeltCount(prev => prev + 1);

            setTimeout(() => setStatus('Active'), 3000); // Revert status display
        });

        const fetchInitStats = async () => {
             try {
                const alertsRes = await axios.get(`http://localhost:8080/api/events/${user._id}`);
                const data = alertsRes.data;
                const counts = { drowsiness: 0, distraction: 0, phone: 0, no_seatbelt: 0 };
                data.forEach(a => {
                    const type = a.eventType;
                    if (type === 'DROWSINESS') counts.drowsiness++;
                    if (type === 'DISTRACTION') counts.distraction++;
                    if (type === 'PHONE_USAGE') counts.phone++;
                    if (type === 'NO_SEATBELT') counts.no_seatbelt++;
                });
                setBlinkCount(counts.drowsiness);
                setDistractionCount(counts.distraction);
                setPhoneCount(counts.phone);
                setNoSeatbeltCount(counts.no_seatbelt);
             } catch (e) {
                console.error("Failed to load init stats", e);
             }
        };

        fetchInitStats();

        // Join stream room (for supervisor tracking if needed, though they might connect direct to MJPEG)
        if (user && user._id) {
            const roomId = `stream_${user._id} `;
            socketRef.current.emit('join_stream_room', roomId);

            // Viewer Joined (No WebRTC logic needed anymore if MJPEG is direct, keeping just for count)
            socketRef.current.on('viewer_joined', (viewerId) => {
                setViewerCount(prev => prev + 1);
            });
        }

        return () => {
            if (socketRef.current) socketRef.current.disconnect();
        };
    }, [user]);

    /* Local React Event & Video logic removed - handled entirely by YOLO edge service now */

    const getStatusColor = () => {
        if (status === 'DROWSINESS') return '#ef4444';
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
                        <img
                            src={videoStreamUrl}
                            alt="YOLO Live Stream"
                            style={{
                                position: 'absolute',
                                left: 0,
                                right: 0,
                                textAlign: 'center',
                                zIndex: 9,
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover'
                            }}
                            onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.nextSibling.style.display = 'flex';
                            }}
                        />
                        <div style={{ display: 'none', flexDirection: 'column', alignItems: 'center', color: '#a0a0a0', zIndex: 10 }}>
                             <Video size={48} />
                             <span>YOLO Edge Stream Offline</span>
                        </div>

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
