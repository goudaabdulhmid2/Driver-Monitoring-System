import { useEffect, useState, useRef } from 'react';
import io from 'socket.io-client';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
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
    LayoutDashboard,
    Sliders
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, AreaChart, Area, PieChart, Pie, Legend } from 'recharts';

const SupervisorDashboard = () => {
    const { user, logout } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const [alerts, setAlerts] = useState([]);
    const [stats, setStats] = useState({ drowsiness: 0, distraction: 0, phone: 0, no_seatbelt: 0 });

    // UI State
    const [currentView, setCurrentView] = useState('dashboard');
    const [selectedSnapshot, setSelectedSnapshot] = useState(null);
    const [drivers, setDrivers] = useState([]);
    const [eventFrequency, setEventFrequency] = useState([]); // for AreaChart

    // Live View State
    const [activeDriverId, setActiveDriverId] = useState(null);
    const remoteVideoRef = useRef();
    const socketRef = useRef();
    const peerRef = useRef();

    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                const alertsRes = await axios.get('http://localhost:8080/api/alerts');
                setAlerts(alertsRes.data);
                calculateStats(alertsRes.data);
                generateEventFrequency(alertsRes.data);
                const driversRes = await axios.get('http://localhost:8080/api/users/drivers');
                setDrivers(driversRes.data);
            } catch (error) {
                console.error("Failed to fetch data", error);
            }
        };
        fetchInitialData();

        socketRef.current = io('http://localhost:8080');
        socketRef.current.emit('join_supervisor');

        socketRef.current.on('new_alert', (alert) => {
            setAlerts((prev) => {
                const updated = [alert, ...prev];
                calculateStats(updated);
                generateEventFrequency(updated);
                return updated;
            });
            if (alert.eventId.severity === 'HIGH' || alert.eventId.severity === 'CRITICAL') {
                setSelectedSnapshot(alert.eventId.snapshotUrl);
            }
        });

        socketRef.current.on('alert_updated', (updatedAlert) => {
            setAlerts((prev) => prev.map(a => a._id === updatedAlert._id ? updatedAlert : a));
        });

        socketRef.current.on('driver_status_update', (updatedProfile) => {
            setDrivers((prev) => prev.map(d => {
                if (d._id === updatedProfile.userId) {
                    return { ...d, currentStatus: updatedProfile.currentStatus, safetyScore: updatedProfile.safetyScore };
                }
                return d;
            }));
        });

        // WebRTC Logic Removed

        return () => socketRef.current.close();
    }, []);

    const startLiveView = (driverId) => {
        if (!driverId) return;
        setActiveDriverId(driverId);
        setSelectedSnapshot(null); // Clear snapshot if any
    };

    const endLiveView = () => {
        setActiveDriverId(null);
    };

    const videoStreamUrl = 'http://localhost:5001/video_feed';

    const calculateStats = (data) => {
        const counts = { drowsiness: 0, distraction: 0, phone: 0, no_seatbelt: 0 };
        data.forEach(a => {
            const type = a.eventId?.eventType;
            if (type === 'DROWSINESS') counts.drowsiness++;
            if (type === 'DISTRACTION') counts.distraction++;
            if (type === 'PHONE_USAGE') counts.phone++;
            if (type === 'NO_SEATBELT') counts.no_seatbelt++;
        });
        setStats(counts);
    };

    const generateEventFrequency = (data) => {
        const frequencyMap = {};
        data.forEach(a => {
            if (!a.createdAt) return;
            const date = new Date(a.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' });
            frequencyMap[date] = (frequencyMap[date] || 0) + 1;
        });
        // Convert to array and sort chronologically (assuming keys are reasonably sortable by Date parsing)
        const sortedArray = Object.keys(frequencyMap)
            .sort((x, y) => new Date(x) - new Date(y))
            .map(date => ({ date, count: frequencyMap[date] }));
        setEventFrequency(sortedArray);
    };

    const updateAlertStatus = async (alertId, newStatus) => {
        try {
            await axios.put(`http://localhost:8080/api/alerts/${alertId}`, {
                status: newStatus,
                supervisorId: user._id
            });
            // State is updated via socket 'alert_updated'
        } catch (error) {
            console.error("Failed to update alert status", error);
        }
    };

    const chartData = [
        { name: 'Drowsiness', value: stats.drowsiness, color: '#3b82f6' },
        { name: 'Distraction', value: stats.distraction, color: '#ef4444' },
        { name: 'Phone', value: stats.phone, color: '#22c55e' },
        { name: 'No Seatbelt', value: stats.no_seatbelt, color: '#f59e0b' },
    ];

    const formatTime = (isoString) => new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const getSeverityBadge = (type, severity) => {
        if (severity === 'CRITICAL') return <span className="badge badge-red" style={{ background: 'rgba(239, 68, 68, 0.4)' }}><TriangleAlert size={12} /> CRITICAL</span>;

        switch (type) {
            case 'DROWSINESS': return <span className="badge badge-red"><TriangleAlert size={12} /> Drowsiness Alerts</span>;
            case 'PHONE_USAGE': return <span className="badge badge-orange"><Smartphone size={12} /> Phone Usage</span>;
            case 'NO_SEATBELT': return <span className="badge badge-orange"><Activity size={12} /> No Seatbelt</span>;
            case 'DISTRACTION': return <span className="badge badge-orange"><TriangleAlert size={12} /> Distraction</span>;
            default: return <span className="badge badge-green"><CheckCircle size={12} /> Unknown</span>;
        }
    };

    const getAlertStatusBadge = (status) => {
        switch (status) {
            case 'ACTIVE': return <span className="badge badge-red">Active</span>;
            case 'ACKNOWLEDGED': return <span className="badge badge-orange">Acknowledged</span>;
            case 'RESOLVED': return <span className="badge badge-green">Resolved</span>;
            case 'DISMISSED': return <span className="badge" style={{ color: '#a0a0a0', background: 'rgba(255,255,255,0.1)' }}>Dismissed</span>;
            default: return <span className="badge">New</span>;
        }
    };

    const getDriverStatusBadge = (status) => {
        if (status === 'NORMAL') return <span className="badge badge-green"><CheckCircle size={12} /> Normal</span>;
        if (['PHONE_USAGE', 'NO_SEATBELT', 'DISTRACTION'].includes(status)) return <span className="badge badge-orange"><TriangleAlert size={12} /> Warning</span>;
        return <span className="badge badge-red"><TriangleAlert size={12} /> Danger</span>;
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
                            <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                                <img
                                    src={videoStreamUrl}
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                    alt="Live YOLO View"
                                    onError={(e) => {
                                        e.target.style.display = 'none';
                                        e.target.nextSibling.style.display = 'flex';
                                    }}
                                />
                                <div style={{ display: 'none', position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', background: 'black', color: '#a0a0a0', flexDirection: 'column', gap: '10px' }}>
                                    <Video size={48} />
                                    <span>YOLO Edge Stream Offline</span>
                                </div>
                            </div>
                        ) : selectedSnapshot ? (
                            <img
                                src={selectedSnapshot.startsWith('/uploads') ? `${import.meta.env.VITE_API_URL}${selectedSnapshot} ` : selectedSnapshot}
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
                            <span className="stat-label flex items-center gap-2"><CheckCircle size={16} /> No Seatbelt</span>
                            <div className="stat-value-box"><span className="stat-value">{stats.no_seatbelt}</span></div>
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
                                    <th>Severity</th>
                                    <th>Status</th>
                                    <th>Actions</th>
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
                                        <td>{getSeverityBadge(alert.eventId.eventType, alert.eventId.severity)}</td>
                                        <td>{getAlertStatusBadge(alert.status)}</td>
                                        <td>
                                            {alert.status === 'ACTIVE' && (
                                                <div style={{ display: 'flex', gap: '4px' }}>
                                                    <button onClick={(e) => { e.stopPropagation(); updateAlertStatus(alert._id, 'ACKNOWLEDGED'); }} className="btn-primary" style={{ padding: '2px 6px', fontSize: '0.7rem', background: '#f59e0b' }}>Ack</button>
                                                    <button onClick={(e) => { e.stopPropagation(); updateAlertStatus(alert._id, 'RESOLVED'); }} className="btn-primary" style={{ padding: '2px 6px', fontSize: '0.7rem', background: '#22c55e' }}>Resolve</button>
                                                    <button onClick={(e) => { e.stopPropagation(); updateAlertStatus(alert._id, 'DISMISSED'); }} className="btn-primary" style={{ padding: '2px 6px', fontSize: '0.7rem', background: 'transparent', border: '1px solid #555', color: '#a0a0a0' }}>Dismiss</button>
                                                </div>
                                            )}
                                            {alert.status === 'ACKNOWLEDGED' && (
                                                <button onClick={(e) => { e.stopPropagation(); updateAlertStatus(alert._id, 'RESOLVED'); }} className="btn-primary" style={{ padding: '2px 6px', fontSize: '0.7rem', background: '#22c55e' }}>Resolve</button>
                                            )}
                                        </td>
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
                <div className="card-title">Fleet Drivers Risk Ranking</div>
                <div className="table-container" style={{ maxHeight: 'none' }}>
                    <table>
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Email</th>
                                <th>Safety Score</th>
                                <th>Real-Time Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {[...drivers].sort((a, b) => a.safetyScore - b.safetyScore).map(driver => (
                                <tr key={driver._id}>
                                    <td style={{ fontWeight: 600 }}>{driver.name}</td>
                                    <td style={{ color: 'var(--text-secondary)' }}>{driver.email}</td>
                                    <td>
                                        <span style={{
                                            fontWeight: 'bold',
                                            color: driver.safetyScore < 60 ? '#ef4444' : driver.safetyScore < 80 ? '#f59e0b' : '#22c55e'
                                        }}>
                                            {driver.safetyScore}/100
                                        </span>
                                    </td>
                                    <td>{getDriverStatusBadge(driver.currentStatus)}</td>
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

            <div className="card-glass" style={{ height: '350px' }}>
                <div className="card-title">Event Frequency Over Time</div>
                <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={eventFrequency} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                        <defs>
                            <linearGradient id="colorFreq" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <XAxis dataKey="date" stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={false} />
                        <Tooltip contentStyle={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px' }} />
                        <Area type="monotone" dataKey="count" stroke="#ef4444" fillOpacity={1} fill="url(#colorFreq)" />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );

    const [settings, setSystemSettings] = useState({
        drowsiness_threshold: 10,
        phone_detection_sensitivity: 'High',
        alert_sound_enabled: true,
        critical_alert_notifications: true,
        snapshot_capture_enabled: true
    });

    const handleSettingChange = (key, value) => {
        setSystemSettings(prev => ({ ...prev, [key]: value }));
    };

    const renderSettings = () => (
        <div className="dashboard-grid" style={{ gridTemplateColumns: '1fr' }}>
            <div className="card-glass" style={{ maxWidth: '800px', margin: '0 auto', width: '100%' }}>
                <div className="card-title">System Configuration</div>

                <div style={{ marginBottom: '24px' }}>
                    <h3 style={{ fontSize: '1rem', marginBottom: '16px', color: 'var(--accent-blue)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Sliders size={18} /> Detection Thresholds
                    </h3>

                    <div style={{ display: 'grid', gap: '16px', backgroundColor: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <div style={{ fontWeight: 500 }}>Drowsiness Threshold (seconds)</div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Time before eyes closed triggers HIGH alert</div>
                            </div>
                            <input
                                type="number"
                                value={settings.drowsiness_threshold}
                                onChange={(e) => handleSettingChange('drowsiness_threshold', parseInt(e.target.value))}
                                style={{ background: 'var(--bg-dark)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '8px', borderRadius: '4px', width: '80px' }}
                            />
                        </div>



                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <div style={{ fontWeight: 500 }}>Phone Detection Sensitivity</div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>AI confidence required for phone detection</div>
                            </div>
                            <select
                                value={settings.phone_detection_sensitivity}
                                onChange={(e) => handleSettingChange('phone_detection_sensitivity', e.target.value)}
                                style={{ background: 'var(--bg-dark)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '8px', borderRadius: '4px', width: '100px' }}
                            >
                                <option>Low</option>
                                <option>Medium</option>
                                <option>High</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div style={{ marginBottom: '24px' }}>
                    <h3 style={{ fontSize: '1rem', marginBottom: '16px', color: 'var(--accent-orange)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Bell size={18} /> Alert Settings
                    </h3>

                    <div style={{ display: 'grid', gap: '16px', backgroundColor: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <div style={{ fontWeight: 500 }}>Enable Alert Sounds</div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Play sound when new alert arrives</div>
                            </div>
                            <input
                                type="checkbox"
                                checked={settings.alert_sound_enabled}
                                onChange={(e) => handleSettingChange('alert_sound_enabled', e.target.checked)}
                                style={{ width: '18px', height: '18px' }}
                            />
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <div style={{ fontWeight: 500 }}>Critical Alert Notifications</div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Show browser notifications for CRITICAL events</div>
                            </div>
                            <input
                                type="checkbox"
                                checked={settings.critical_alert_notifications}
                                onChange={(e) => handleSettingChange('critical_alert_notifications', e.target.checked)}
                                style={{ width: '18px', height: '18px' }}
                            />
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <div style={{ fontWeight: 500 }}>Capture Snapshots</div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Save image frames on violations</div>
                            </div>
                            <input
                                type="checkbox"
                                checked={settings.snapshot_capture_enabled}
                                onChange={(e) => handleSettingChange('snapshot_capture_enabled', e.target.checked)}
                                style={{ width: '18px', height: '18px' }}
                            />
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
                    <button className="btn-primary" onClick={() => alert('Settings saved successfully! (Mock)')}>
                        Save Configuration
                    </button>
                </div>
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
                    <button className={`nav - link ${currentView === 'dashboard' ? 'active' : ''} `} onClick={() => setCurrentView('dashboard')}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><LayoutDashboard size={18} /> Dashboard</div>
                    </button>
                    <button className={`nav - link ${currentView === 'drivers' ? 'active' : ''} `} onClick={() => setCurrentView('drivers')}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Users size={18} /> Drivers</div>
                    </button>
                    <button className={`nav - link ${currentView === 'settings' ? 'active' : ''} `} onClick={() => setCurrentView('settings')}>
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
