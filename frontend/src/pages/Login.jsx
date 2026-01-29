import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { User, Lock, Activity } from 'lucide-react';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const { login } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        const res = await login(email, password);
        setLoading(false);
        if (res.success) {
            navigate('/');
        } else {
            alert(res.message);
        }
    };

    return (
        <div className="login-container">
            <div className="login-card">
                <div className="login-header">
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px', color: 'var(--accent-blue)' }}>
                        <Activity size={48} />
                    </div>
                    <h2 className="login-title">DriverGuard</h2>
                    <p className="login-subtitle">Sign in to access the monitoring dashboard</p>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="input-group">
                        <User className="input-icon" size={20} />
                        <input
                            type="email"
                            className="login-input"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            placeholder="Email address"
                        />
                    </div>

                    <div className="input-group">
                        <Lock className="input-icon" size={20} />
                        <input
                            type="password"
                            className="login-input"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            placeholder="Password"
                        />
                    </div>

                    <button type="submit" className="login-btn" disabled={loading}>
                        {loading ? 'Signing in...' : 'Sign In'}
                    </button>

                    <div style={{ textAlign: 'center', marginTop: '16px' }}>
                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                            Don't have an account?{' '}
                            <Link to="/register" style={{ color: 'var(--accent-blue)', textDecoration: 'none', fontWeight: 600 }}>
                                Sign up
                            </Link>
                        </span>
                    </div>

                    <div style={{ textAlign: 'center', marginTop: '12px' }}>
                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                            Demo: admin@example.com / password
                        </span>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default Login;
