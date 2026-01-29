import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import DriverMonitor from './pages/DriverMonitor';
import SupervisorDashboard from './pages/SupervisorDashboard';
import Login from './pages/Login';

const Home = () => {
  const { user, logout } = useAuth();
  if (!user) return <Navigate to="/login" />;

  return (
    <>
      {user.role === 'DRIVER' && (
        <div className="container" style={{ marginTop: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h1>Welcome, {user.name}</h1>
            <button onClick={logout} className="btn btn-danger">Logout</button>
          </div>
          <DriverMonitor />
        </div>
      )}
      {user.role === 'SUPERVISOR' && <SupervisorDashboard />}
    </>
  );
};

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<Home />} />
    </Routes>
  );
}

export default App;
