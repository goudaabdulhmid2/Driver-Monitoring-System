import { useEffect, useState, useRef } from 'react';
import io from 'socket.io-client';
import axios from 'axios';
import {
    Bell,
    Activity,
    User,
    LogOut,
    Smartphone,
    EyeOff,
    MoreHorizontal,
    TriangleAlert,
    CheckCircle,
    Video,
    Sun,
    Moon,
    Users,
    Settings,
    LayoutDashboard
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useAuth } from '../context/AuthContext';

const SupervisorDashboard = () => {
    const { user, logout } = useAuth();
    const [alerts, setAlerts] = useState([]);
    const [stats, setStats] = useState({ drowsiness: 0, distraction: 0, phone: 0 });

    // UI State
    const [theme, setTheme] = useState('dark');
    const [currentView, setCurrentView] = useState('dashboard');
    const [selectedSnapshot, setSelectedSnapshot] = useState(null);
    const [drivers, setDrivers] = useState([]);

    // Live View State
    const [activeDriverId, setActiveDriverId] = useState(null);
    const remoteVideoRef = useRef();
    const socketRef = useRef();
    const peerRef = useRef();

    useEffect(() => {
        document.body.className = theme === 'light' ? 'light-theme' : '';
    }, [theme]);

    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                const alertsRes = await axios.get('http://localhost:5000/api/alerts');
                setAlerts(alertsRes.data);
                calculateStats(alertsRes.data);
                const driversRes = await axios.get('http://localhost:5000/api/users/drivers');
                setDrivers(driversRes.data);
            } catch (error) {
                console.error("Failed to fetch data", error);
            }
        };
        fetchInitialData();

        socketRef.current = io('http://localhost:5000');
        socketRef.current.emit('join_supervisor');

        socketRef.current.on('new_alert', (alert) => {
            setAlerts((prev) => {
                const updated = [alert, ...prev];
                calculateStats(updated);
                return updated;
            });
            if (alert.eventId.severity === 'HIGH') {
                setSelectedSnapshot(alert.eventId.snapshotUrl);
            }
        });

        // WebRTC Handlers
        socketRef.current.on('offer', handleReceiveOffer);
        socketRef.current.on('ice_candidate', handleNewICECandidateMsg);

        return () => socketRef.current.close();
    }, []);

    const startLiveView = (driverId) => {
        if (!driverId) return;
        setActiveDriverId(driverId);
        setSelectedSnapshot(null); // Clear snapshot if any

        const roomId = `stream_${driverId}`;
        socketRef.current.emit('join_stream_room', roomId);
        console.log("Joined stream room for live view:", roomId);
    };

    const endLiveView = () => {
        setActiveDriverId(null);
        if (peerRef.current) {
            peerRef.current.close();
            peerRef.current = null;
        }
        if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = null;
        }
    };

    const handleReceiveOffer = async (payload) => {
        console.log("Received Offer from driver");
        const peer = new RTCPeerConnection({
            iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
        });
        peerRef.current = peer;

        peer.ontrack = (e) => {
            console.log("Received Remote Stream");
            if (remoteVideoRef.current) {
                remoteVideoRef.current.srcObject = e.streams[0];
                remoteVideoRef.current.play().catch(err => console.error("Auto-play failed:", err));
            }
        };

        peer.onconnectionstatechange = () => {
            console.log("Connection State:", peer.connectionState);
            if (peer.connectionState === 'connected') {
                console.log("Peer Connected successfully!");
            }
            if (peer.connectionState === 'failed' || peer.connectionState === 'disconnected') {
                console.error("Peer connection failed/disconnected");
            }
        };

        peer.onicecandidate = (e) => {
            if (e.candidate) {
                const icePayload = {
                    target: payload.caller,
                    candidate: e.candidate
                };
                socketRef.current.emit('ice_candidate', icePayload);
            }
        };

        const desc = new RTCSessionDescription(payload.sdp);
        await peer.setRemoteDescription(desc);
        const answer = await peer.createAnswer();
        await peer.setLocalDescription(answer);

        const answerPayload = {
            target: payload.caller,
            caller: socketRef.current.id,
            sdp: peer.localDescription
        };
        socketRef.current.emit('answer', answerPayload);
    };

    const handleNewICECandidateMsg = (incoming) => {
        if (peerRef.current) {
            const candidate = new RTCIceCandidate(incoming.candidate);
            peerRef.current.addIceCandidate(candidate).catch(e => console.error(e));
        }
    };

    const calculateStats = (data) => {
        const counts = { drowsiness: 0, distraction: 0, phone: 0 };
        data.forEach(a => {
            const type = a.eventId.eventType;
            if (type === 'DROWSINESS') counts.drowsiness++;
            if (type === 'DISTRACTION') counts.distraction++;
            if (type === 'PHONE_USAGE') counts.phone++;
        });
        setStats(counts);
    };

    const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');

    const chartData = [
        { name: 'Drowsiness', value: stats.drowsiness, color: '#3b82f6' },
        { name: 'Distraction', value: stats.distraction, color: '#ef4444' },
        { name: 'Phone', value: stats.phone, color: '#22c55e' },
    ];

    const formatTime = (isoString) => new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const getSeverityBadge = (type) => {
        switch (type) {
            case 'DROWSINESS': return <span className="badge badge-red"><TriangleAlert size={12} /> Alert Sent</span>;
            case 'PHONE_USAGE': return <span className="badge badge-green"><Activity size={12} /> Warning</span>;
            case 'DISTRACTION': return <span className="badge badge-orange"><TriangleAlert size={12} /> Alert Sent</span>;
            default: return <span className="badge badge-green"><CheckCircle size={12} /> Resolved</span>;
        }
    };

    const renderDashboard = () => (
        <div className="dashboard-grid">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div className="card-glass">
                    <div className="card-title">
                        <span>
                            {activeDriverId ? 'Live Driver Feed' : selectedSnapshot ? 'Event Snapshot' : 'Driver Feed'}
                        </span>
                        {(selectedSnapshot || activeDriverId) && (
                            <button
                                onClick={activeDriverId ? endLiveView : () => setSelectedSnapshot(null)}
                                style={{ fontSize: '0.8rem', color: '#3b82f6', background: 'none', border: 'none', cursor: 'pointer' }}
                            >
                                {activeDriverId ? 'Stop Live View' : 'Close Snapshot'}
                            </button>
                        )}
                    </div>
                    <div className="live-feed-container">
                        {activeDriverId ? (
                            // Fix for Video Autoplay Issue: Browsers block unmuted autoplay.
                            // Adding 'muted' ensures video plays immediately.
                            <video
                                ref={remoteVideoRef}
                                autoPlay
                                playsInline
                                muted // Important for local testing to avoid feedback and allow autoplay
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                        ) : selectedSnapshot ? (
                            <img
                                src={selectedSnapshot}
                                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                                alt="Event Snapshot"
                            />
                        ) : (
                            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'black', color: '#a0a0a0', flexDirection: 'column', gap: '10px' }}>
                                <Video size={48} />
                                <span>No Active Feed</span>
                                <span style={{ fontSize: '0.8rem' }}>Select a driver to view live</span>
                            </div>
                        )}

                        {selectedSnapshot && (
                            <div className="feed-overlay">
                                <TriangleAlert />
                                VIOLATION SNAPSHOT
                            </div>
                        )}

                        {activeDriverId && (
                            <div style={{ position: 'absolute', top: 10, right: 10, background: 'rgba(239, 68, 68, 0.8)', color: 'white', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 600 }}>
                                LIVE
                            </div>
                        )}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', padding: '10px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                        <div>
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Status</div>
                            <div style={{ fontWeight: 600, color: (selectedSnapshot || activeDriverId) ? '#ef4444' : '#22c55e' }}>
                                {activeDriverId ? 'Live Streaming' : selectedSnapshot ? 'Reviewing Event' : 'Idle'}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="card-glass">
                    <div className="card-title">Driver Statistics</div>
                    <div className="stats-grid">
                        <div className="stat-card">
                            <span className="stat-label flex items-center gap-2"><EyeOff size={16} /> Drowsiness Alerts</span>
                            <div className="stat-value-box"><span className="stat-value">{stats.drowsiness}</span></div>
                        </div>
                        <div className="stat-card">
                            <span className="stat-label flex items-center gap-2"><Smartphone size={16} /> Phone Usage</span>
                            <div className="stat-value-box"><span className="stat-value">{stats.phone}</span></div>
                        </div>
                        <div className="stat-card">
                            <span className="stat-label flex items-center gap-2"><Activity size={16} /> Distraction</span>
                            <div className="stat-value-box"><span className="stat-value">{stats.distraction}</span></div>
                        </div>
                    </div>
                </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div className="card-glass" style={{ flex: 1 }}>
                    <div className="card-title">Alerts History</div>
                    <div className="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>Time</th>
                                    <th>Event</th>
                                    <th>Driver</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {alerts.map((alert) => (
                                    <tr
                                        key={alert._id}
                                        onClick={() => setSelectedSnapshot(alert.eventId.snapshotUrl)}
                                        style={{ cursor: 'pointer', transition: 'background 0.2s', backgroundColor: selectedSnapshot === alert.eventId.snapshotUrl ? 'rgba(59, 130, 246, 0.1)' : 'transparent' }}
                                        className="hover:bg-white/5"
                                    >
                                        <td style={{ color: 'var(--text-secondary)' }}>{formatTime(alert.createdAt)}</td>
                                        <td style={{ fontWeight: 500 }}>{alert.eventId.eventType}</td>
                                        <td>{alert.driverId.name}</td>
                                        <td>{getSeverityBadge(alert.eventId.eventType)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="card-glass" style={{ height: '300px' }}>
                    <div className="card-title">Alerts Overview</div>
                    <ResponsiveContainer width="100%" height={240}>
                        <BarChart data={chartData}>
                            <XAxis dataKey="name" stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={false} />
                            <YAxis stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={false} />
                            <Tooltip
                                contentStyle={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)' }}
                                itemStyle={{ color: 'var(--text-primary)' }}
                                cursor={{ fill: 'var(--hover-bg)' }}
                            />
                            <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={40}>
                                {chartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );

    const renderDrivers = () => (
        <div className="dashboard-grid" style={{ gridTemplateColumns: '1fr' }}>
            <div className="card-glass">
                <div className="card-title">Fleet Drivers</div>
                <div className="table-container" style={{ maxHeight: 'none' }}>
                    <table>
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Email</th>
                                <th>License ID</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {drivers.map(driver => (
                                <tr key={driver._id}>
                                    <td style={{ fontWeight: 600 }}>{driver.name}</td>
                                    <td style={{ color: 'var(--text-secondary)' }}>{driver.email}</td>
                                    <td>{driver.licenseNumber}</td>
                                    <td><span className={`badge ${driver.status === 'Active' ? 'badge-green' : 'badge-orange'}`}>{driver.status}</span></td>
                                    <td>
                                        <button
                                            className="btn-primary"
                                            style={{ padding: '4px 8px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                                            onClick={() => {
                                                setCurrentView('dashboard');
                                                startLiveView(driver._id);
                                            }}
                                        >
                                            <Video size={14} /> View Live
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );

    const renderSettings = () => (
        <div className="dashboard-grid" style={{ gridTemplateColumns: '1fr' }}>
            <div className="card-glass">
                <div className="card-title">System Settings</div>
                <p style={{ color: 'var(--text-secondary)' }}>Configuration options placeholder.</p>
            </div>
        </div>
    );

    return (
        <div className="dashboard-container">
            <header className="header">
                <div className="header-logo">
                    <Video color="var(--accent-blue)" />
                    <span>Driver Monitoring System</span>
                </div>
                <nav className="header-nav">
                    <button className={`nav-link ${currentView === 'dashboard' ? 'active' : ''}`} onClick={() => setCurrentView('dashboard')}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><LayoutDashboard size={18} /> Dashboard</div>
                    </button>
                    <button className={`nav-link ${currentView === 'drivers' ? 'active' : ''}`} onClick={() => setCurrentView('drivers')}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Users size={18} /> Drivers</div>
                    </button>
                    <button className={`nav-link ${currentView === 'settings' ? 'active' : ''}`} onClick={() => setCurrentView('settings')}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Settings size={18} /> Settings</div>
                    </button>
                </nav>
                <div className="header-profile">
                    <button onClick={toggleTheme} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', marginRight: '10px' }}>
                        {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
                    </button>
                    <div style={{ textAlign: 'right', marginRight: '10px', fontSize: '0.9rem' }}>
                        <div style={{ fontWeight: 600 }}>{user.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>SUPERVISOR</div>
                    </div>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--accent-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <User size={18} color="white" />
                    </div>
                    <button onClick={logout} className="btn-primary" style={{ padding: '6px 12px', fontSize: '0.8rem', marginLeft: '10px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                        <LogOut size={16} />
                    </button>
                </div>
            </header>
            <div style={{ overflowY: 'auto', flex: 1 }}>
                {currentView === 'dashboard' && renderDashboard()}
                {currentView === 'drivers' && renderDrivers()}
                {currentView === 'settings' && renderSettings()}
            </div>
        </div>
    );
};

export default SupervisorDashboard;
