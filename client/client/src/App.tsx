import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { EmergencyProvider } from './context/EmergencyContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Events from './pages/Events';
import EventDetail from './pages/EventDetail';
import Registrations from './pages/Registrations';
import CrowdMonitor from './pages/CrowdMonitor';
import Budget from './pages/Budget';
import Emergency from './pages/Emergency';
import AdminDemo from './pages/AdminDemo';

const ProtectedRoute = ({ children }: { children: React.ReactElement }) => {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return (
    <div style={{
      minHeight: '100vh', background: '#04050a',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      fontFamily: 'Plus Jakarta Sans, sans-serif', gap: '16px',
    }}>
      <div style={{
        width: '48px', height: '48px',
        border: '3px solid rgba(99,102,241,0.2)',
        borderTopColor: '#6366f1', borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
      }} />
      <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '14px', fontWeight: '500' }}>
        Loading CampusFlow...
      </div>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
        body { margin: 0; background: #04050a; }
      `}</style>
    </div>
  );
  return isAuthenticated
    ? <Layout>{children}</Layout>
    : <Navigate to="/login" replace />;
};

const AppRoutes = () => {
  const { isAuthenticated } = useAuth();
  return (
    <Routes>
      <Route path="/login"    element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login />} />
      <Route path="/register" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Register />} />
      <Route path="/dashboard"     element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/events"        element={<ProtectedRoute><Events /></ProtectedRoute>} />
      <Route path="/events/:id"    element={<ProtectedRoute><EventDetail /></ProtectedRoute>} />
      <Route path="/attendance"    element={<ProtectedRoute><Registrations /></ProtectedRoute>} />
      <Route path="/registrations" element={<ProtectedRoute><Registrations /></ProtectedRoute>} />
      <Route path="/crowd"         element={<ProtectedRoute><CrowdMonitor /></ProtectedRoute>} />
      <Route path="/budget"        element={<ProtectedRoute><Budget /></ProtectedRoute>} />
      <Route path="/emergency"     element={<ProtectedRoute><Emergency /></ProtectedRoute>} />
      <Route path="/admin"         element={<ProtectedRoute><AdminDemo /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};

const App = () => {
  return (
    <AuthProvider>
      <EmergencyProvider>
        <Router>
          <AppRoutes />
        </Router>
      </EmergencyProvider>
    </AuthProvider>
  );
};

export default App;