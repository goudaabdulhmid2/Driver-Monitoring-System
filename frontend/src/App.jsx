import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import DriverMonitor from './pages/DriverMonitor';
import SupervisorDashboard from './pages/SupervisorDashboard';
import Login from './pages/Login';
import Register from './pages/Register';

const Home = () => {
  const { user, logout } = useAuth();
  if (!user) return <Navigate to="/login" />;

  return (
    <>
      {user.role === 'DRIVER' && <DriverMonitor />}
      {user.role === 'SUPERVISOR' && <SupervisorDashboard />}
    </>
  );
};

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/" element={<Home />} />
    </Routes>
  );
}

export default App;
