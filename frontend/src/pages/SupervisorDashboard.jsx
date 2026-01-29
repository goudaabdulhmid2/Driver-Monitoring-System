import { useEffect, useState } from 'react';
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
    const [currentView, setCurrentView] = useState('dashboard'); // 'dashboard', 'drivers', 'settings'
    const [selectedSnapshot, setSelectedSnapshot] = useState(null);
    const [drivers, setDrivers] = useState([]);

    useEffect(() => {
        // Apply theme
        document.body.className = theme === 'light' ? 'light-theme' : '';
    }, [theme]);

    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                // Fetch Alerts
                const alertsRes = await axios.get('http://localhost:5000/api/alerts');
                setAlerts(alertsRes.data);
                calculateStats(alertsRes.data);

                // Fetch Drivers
                const driversRes = await axios.get('http://localhost:5000/api/users/drivers');
                setDrivers(driversRes.data);

            } catch (error) {
                console.error("Failed to fetch data", error);
            }
        };
        fetchInitialData();

        const newSocket = io('http://localhost:5000');
        newSocket.emit('join_supervisor');

        newSocket.on('new_alert', (alert) => {
            setAlerts((prev) => {
                const updated = [alert, ...prev];
                calculateStats(updated);
                return updated;
            });
            // Auto-show high severity snapshots if in dashboard view
            if (alert.eventId.severity === 'HIGH') {
                setSelectedSnapshot(alert.eventId.snapshotUrl);
            }
        });

        return () => newSocket.close();
    }, []);

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

    const toggleTheme = () => {
        setTheme(prev => prev === 'dark' ? 'light' : 'dark');
    };

    const chartData = [
        { name: 'Drowsiness', value: stats.drowsiness, color: '#3b82f6' },
        { name: 'Distraction', value: stats.distraction, color: '#ef4444' },
        { name: 'Phone', value: stats.phone, color: '#22c55e' },
    ];

    const formatTime = (isoString) => {
        return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

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
            {/* Left Column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

                {/* Live Feed / Snapshot Card */}
                <div className="card-glass">
                    <div className="card-title">
                        <span>{selectedSnapshot ? 'Event Snapshot' : 'Live Driver Feed'}</span>
                        {selectedSnapshot && (
                            <button
                                onClick={() => setSelectedSnapshot(null)}
                                style={{ fontSize: '0.8rem', color: '#3b82f6', background: 'none', border: 'none', cursor: 'pointer' }}
                            >
                                Return to Live View
                            </button>
                        )}
                    </div>
                    <div className="live-feed-container">
                        {selectedSnapshot ? (
                            <img
                                src={selectedSnapshot}
                                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                                alt="Event Snapshot"
                            />
                        ) : (
                            /* Placeholder for Video */
                            <img
                                src="https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?q=80&w=1000&auto=format&fit=crop"
                                style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.6 }}
                                alt="Driver Live Feed Placeholder"
                            />
                        )}

                        {/* Overlay only if showing a snapshot of a high severity event (logic simplified) */}
                        {selectedSnapshot && (
                            <div className="feed-overlay">
                                <TriangleAlert />
                                VIOLATION SNAPSHOT
                            </div>
                        )}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', padding: '10px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                        <div>
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Status</div>
                            <div style={{ fontWeight: 600, color: selectedSnapshot ? '#ef4444' : '#22c55e' }}>
                                {selectedSnapshot ? 'Reviewing Event' : 'Monitoring Active'}
                            </div>
                        </div>
                        {selectedSnapshot && <button className="btn-primary" onClick={() => setSelectedSnapshot(null)}>Dismiss Snapshot</button>}
                    </div>
                </div>

                {/* Stats Row */}
                <div className="card-glass">
                    <div className="card-title">Driver Statistics</div>
                    <div className="stats-grid">
                        <div className="stat-card">
                            <span className="stat-label flex items-center gap-2"><EyeOff size={16} /> Drowsiness Alerts</span>
                            <div className="stat-value-box">
                                <span className="stat-value">{stats.drowsiness}</span>
                            </div>
                        </div>
                        <div className="stat-card">
                            <span className="stat-label flex items-center gap-2"><Smartphone size={16} /> Phone Usage</span>
                            <div className="stat-value-box">
                                <span className="stat-value">{stats.phone}</span>
                            </div>
                        </div>
                        <div className="stat-card">
                            <span className="stat-label flex items-center gap-2"><Activity size={16} /> Distraction</span>
                            <div className="stat-value-box">
                                <span className="stat-value">{stats.distraction}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

                {/* Alerts History */}
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

                {/* Alerts Overview Chart */}
                <div className="card-glass" style={{ height: '300px' }}>
                    <div className="card-title">Alerts Overview</div>
                    <ResponsiveContainer width="100%" height="100%">
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
                                <th>Vehicle Status</th>
                                <th>Last Active</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {drivers.map(driver => (
                                <tr key={driver._id}>
                                    <td style={{ fontWeight: 600 }}>{driver.name}</td>
                                    <td style={{ color: 'var(--text-secondary)' }}>{driver.email}</td>
                                    <td>{driver.licenseNumber}</td>
                                    <td>
                                        <span className={`badge ${driver.status === 'Active' ? 'badge-green' : 'badge-orange'}`}>
                                            {driver.status}
                                        </span>
                                    </td>
                                    <td style={{ color: 'var(--text-secondary)' }}>
                                        {driver.lastActiveAt ? new Date(driver.lastActiveAt).toLocaleString() : 'Never'}
                                    </td>
                                    <td>
                                        <button className="btn-primary" style={{ padding: '4px 8px', fontSize: '0.8rem' }}>View Logs</button>
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
                <p style={{ color: 'var(--text-secondary)' }}>Configuration options for alert thresholds, notification preferences, and system maintenance will go here.</p>
            </div>
        </div>
    );

    return (
        <div className="dashboard-container">
            {/* Top Navigation */}
            <header className="header">
                <div className="header-logo">
                    <Video color="var(--accent-blue)" />
                    <span>Driver Monitoring System</span>
                </div>
                <nav className="header-nav">
                    <button
                        className={`nav-link ${currentView === 'dashboard' ? 'active' : ''}`}
                        onClick={() => setCurrentView('dashboard')}
                        style={{ background: 'none', border: 'none', fontSize: '1rem', cursor: 'pointer' }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <LayoutDashboard size={18} /> Dashboard
                        </div>
                    </button>
                    <button
                        className={`nav-link ${currentView === 'drivers' ? 'active' : ''}`}
                        onClick={() => setCurrentView('drivers')}
                        style={{ background: 'none', border: 'none', fontSize: '1rem', cursor: 'pointer' }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Users size={18} /> Drivers
                        </div>
                    </button>
                    <button
                        className={`nav-link ${currentView === 'settings' ? 'active' : ''}`}
                        onClick={() => setCurrentView('settings')}
                        style={{ background: 'none', border: 'none', fontSize: '1rem', cursor: 'pointer' }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Settings size={18} /> Settings
                        </div>
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

            {/* Main Content */}
            <div style={{ overflowY: 'auto', flex: 1 }}>
                {currentView === 'dashboard' && renderDashboard()}
                {currentView === 'drivers' && renderDrivers()}
                {currentView === 'settings' && renderSettings()}
            </div>
        </div>
    );
};

export default SupervisorDashboard;
