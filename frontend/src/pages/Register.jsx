import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { User, Lock, Mail, Activity, Shield } from 'lucide-react';

const Register = () => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState('DRIVER');
    const { register } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        const res = await register(name, email, password, role);
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
                    <h2 className="login-title">Create Account</h2>
                    <p className="login-subtitle">Join DriverGuard to get started</p>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="input-group">
                        <User className="input-icon" size={20} />
                        <input
                            type="text"
                            className="login-input"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                            placeholder="Full Name"
                        />
                    </div>

                    <div className="input-group">
                        <Mail className="input-icon" size={20} />
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

                    <div className="input-group">
                        <Shield className="input-icon" size={20} />
                        <select
                            className="login-input"
                            value={role}
                            onChange={(e) => setRole(e.target.value)}
                            style={{ appearance: 'none', cursor: 'pointer' }}
                        >
                            <option value="DRIVER">Driver</option>
                            <option value="SUPERVISOR">Supervisor</option>
                        </select>
                    </div>

                    <button type="submit" className="login-btn" disabled={loading}>
                        {loading ? 'Creating account...' : 'Sign Up'}
                    </button>

                    <div style={{ textAlign: 'center', marginTop: '16px' }}>
                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                            Already have an account?{' '}
                            <Link to="/login" style={{ color: 'var(--accent-blue)', textDecoration: 'none', fontWeight: 600 }}>
                                Sign in
                            </Link>
                        </span>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default Register;
