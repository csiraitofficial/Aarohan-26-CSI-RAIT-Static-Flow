import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import PanicButton from './PanicButton';
import { OfflineBanner } from '../utils/offline';

const NAV_ITEMS = [
  { path: '/dashboard',     icon: '⚡', label: 'Dashboard' },
  { path: '/events',        icon: '🎉', label: 'Events' },
  { path: '/registrations', icon: '🎫', label: 'Registrations' },
  { path: '/crowd',         icon: '👥', label: 'Crowd Monitor' },
  { path: '/budget',        icon: '💰', label: 'Budget' },
  { path: '/admin',         icon: '🎮', label: 'Admin Demo' },
];

const Layout = ({ children }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getRoleColor = (role) => {
    if (role === 'admin') return '#f59e0b';
    if (role === 'committee') return '#6366f1';
    return '#06b6d4';
  };

  const getRoleBg = (role) => {
    if (role === 'admin') return 'rgba(245,158,11,0.1)';
    if (role === 'committee') return 'rgba(99,102,241,0.1)';
    return 'rgba(6,182,212,0.1)';
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap');
        *, *::before, *::after { margin:0; padding:0; box-sizing:border-box; }

        .ly-root {
          min-height: 100vh;
          display: flex;
          font-family: 'Plus Jakarta Sans', sans-serif;
          background: #04050a;
          color: white;
        }

        .ly-sidebar {
          width: 260px;
          min-height: 100vh;
          background: rgba(7,9,15,0.95);
          border-right: 1px solid rgba(255,255,255,0.06);
          display: flex;
          flex-direction: column;
          position: fixed;
          top: 0; left: 0;
          z-index: 100;
          transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          backdrop-filter: blur(20px);
        }

        .ly-sidebar-brand {
          padding: 28px 24px 24px;
          border-bottom: 1px solid rgba(255,255,255,0.05);
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .ly-brand-icon {
          width: 40px; height: 40px;
          background: linear-gradient(135deg, #6366f1, #4f46e5);
          border-radius: 11px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
          box-shadow: 0 4px 16px rgba(99,102,241,0.4);
          flex-shrink: 0;
        }

        .ly-brand-name {
          font-size: 16px;
          font-weight: 800;
          color: white;
          letter-spacing: -0.5px;
          display: block;
        }

        .ly-brand-sub {
          font-size: 10px;
          color: rgba(255,255,255,0.3);
          text-transform: uppercase;
          letter-spacing: 0.8px;
          font-weight: 500;
        }

        .ly-nav {
          flex: 1;
          padding: 16px 12px;
          overflow-y: auto;
        }

        .ly-nav-section {
          font-size: 10px;
          font-weight: 600;
          color: rgba(255,255,255,0.2);
          text-transform: uppercase;
          letter-spacing: 1px;
          padding: 0 12px;
          margin-bottom: 8px;
          margin-top: 16px;
        }

        .ly-nav-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 11px 14px;
          border-radius: 12px;
          text-decoration: none;
          color: rgba(255,255,255,0.45);
          font-size: 14px;
          font-weight: 500;
          transition: all 0.2s ease;
          margin-bottom: 2px;
          position: relative;
          cursor: pointer;
          border: 1px solid transparent;
        }

        .ly-nav-item:hover {
          background: rgba(255,255,255,0.05);
          color: rgba(255,255,255,0.8);
        }

        .ly-nav-item.active {
          background: rgba(99,102,241,0.12);
          color: white;
          border-color: rgba(99,102,241,0.2);
        }

        .ly-nav-item.active::before {
          content: '';
          position: absolute;
          left: 0; top: 25%; bottom: 25%;
          width: 3px;
          background: linear-gradient(to bottom, #6366f1, #4f46e5);
          border-radius: 0 4px 4px 0;
        }

        .ly-nav-icon {
          width: 32px; height: 32px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 15px;
          background: rgba(255,255,255,0.04);
          flex-shrink: 0;
          transition: all 0.2s ease;
        }

        .ly-nav-item.active .ly-nav-icon {
          background: rgba(99,102,241,0.2);
        }

        .ly-nav-emergency {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 11px 14px;
          border-radius: 12px;
          text-decoration: none;
          color: rgba(239,68,68,0.7);
          font-size: 14px;
          font-weight: 500;
          transition: all 0.2s ease;
          margin-bottom: 2px;
          cursor: pointer;
          border: 1px solid transparent;
        }

        .ly-nav-emergency:hover {
          background: rgba(239,68,68,0.08);
          color: #f87171;
          border-color: rgba(239,68,68,0.15);
        }

        .ly-nav-emergency.active {
          background: rgba(239,68,68,0.1);
          color: #f87171;
          border-color: rgba(239,68,68,0.2);
        }

        .ly-nav-emergency .ly-nav-icon {
          background: rgba(239,68,68,0.1);
        }

        .ly-user {
          padding: 16px 12px;
          border-top: 1px solid rgba(255,255,255,0.05);
        }

        .ly-user-card {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px;
          border-radius: 12px;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.06);
          margin-bottom: 8px;
        }

        .ly-avatar {
          width: 36px; height: 36px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          font-weight: 700;
          color: white;
          flex-shrink: 0;
        }

        .ly-user-name {
          font-size: 13px;
          font-weight: 600;
          color: white;
          display: block;
          letter-spacing: -0.2px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .ly-user-role {
          font-size: 10px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          display: inline-block;
          padding: 2px 8px;
          border-radius: 100px;
          margin-top: 2px;
        }

        .ly-logout-btn {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 14px;
          border-radius: 10px;
          background: transparent;
          border: 1px solid rgba(255,255,255,0.06);
          color: rgba(255,255,255,0.35);
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          font-family: 'Plus Jakarta Sans', sans-serif;
          transition: all 0.2s ease;
        }

        .ly-logout-btn:hover {
          background: rgba(239,68,68,0.08);
          border-color: rgba(239,68,68,0.2);
          color: #f87171;
        }

        .ly-main {
          flex: 1;
          margin-left: 260px;
          min-height: 100vh;
          display: flex;
          flex-direction: column;
        }

        .ly-header {
          height: 68px;
          background: rgba(7,9,15,0.8);
          border-bottom: 1px solid rgba(255,255,255,0.05);
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 32px;
          position: sticky;
          top: 0; z-index: 50;
          backdrop-filter: blur(20px);
        }

        .ly-header-left {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .ly-hamburger {
          display: none;
          width: 36px; height: 36px;
          border-radius: 8px;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.08);
          align-items: center;
          justify-content: center;
          cursor: pointer;
          font-size: 16px;
          color: white;
        }

        .ly-page-title {
          font-size: 18px;
          font-weight: 700;
          color: white;
          letter-spacing: -0.5px;
        }

        .ly-header-right {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .ly-content {
          flex: 1;
          padding: 32px;
          overflow-y: auto;
        }

        .ly-overlay {
          display: none;
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.7);
          z-index: 99;
          backdrop-filter: blur(4px);
        }

        @media (max-width: 768px) {
          .ly-sidebar { transform: translateX(-100%); }
          .ly-sidebar.open { transform: translateX(0); }
          .ly-main { margin-left: 0; }
          .ly-hamburger { display: flex; }
          .ly-overlay.show { display: block; }
          .ly-content { padding: 20px 16px; }
          .ly-header { padding: 0 16px; }
        }
      `}</style>

      <div className="ly-root">
        <div
          className={`ly-overlay ${sidebarOpen ? 'show' : ''}`}
          onClick={() => setSidebarOpen(false)}
        />

        {/* SIDEBAR */}
        <aside className={`ly-sidebar ${sidebarOpen ? 'open' : ''}`}>
          <div className="ly-sidebar-brand">
            <div className="ly-brand-icon">🎓</div>
            <div>
              <span className="ly-brand-name">CampusFlow</span>
              <span className="ly-brand-sub">Event Platform</span>
            </div>
          </div>

          <nav className="ly-nav">
            <div className="ly-nav-section">Main Menu</div>
            {NAV_ITEMS.map(item => (
              <Link
                key={item.path}
                to={item.path}
                className={`ly-nav-item ${location.pathname === item.path ? 'active' : ''}`}
                onClick={() => setSidebarOpen(false)}
              >
                <div className="ly-nav-icon">{item.icon}</div>
                {item.label}
              </Link>
            ))}

            <div className="ly-nav-section">Safety</div>
            <Link
              to="/emergency"
              className={`ly-nav-emergency ${location.pathname === '/emergency' ? 'active' : ''}`}
              onClick={() => setSidebarOpen(false)}
            >
              <div className="ly-nav-icon">🚨</div>
              Emergency
            </Link>
          </nav>

          <div className="ly-user">
            <div className="ly-user-card">
              <div className="ly-avatar" style={{
                background: `linear-gradient(135deg, ${getRoleColor(user?.role)}, ${getRoleColor(user?.role)}99)`
              }}>
                {user?.name?.charAt(0)?.toUpperCase() || '?'}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <span className="ly-user-name">{user?.name || 'User'}</span>
                <span className="ly-user-role" style={{
                  color: getRoleColor(user?.role),
                  background: getRoleBg(user?.role),
                }}>
                  {user?.role || 'student'}
                </span>
              </div>
            </div>
            <button className="ly-logout-btn" onClick={handleLogout}>
              🚪 Sign Out
            </button>
          </div>
        </aside>

        {/* MAIN */}
        <div className="ly-main">
          <header className="ly-header">
            <div className="ly-header-left">
              <button className="ly-hamburger" onClick={() => setSidebarOpen(!sidebarOpen)}>☰</button>
              <span className="ly-page-title">
                {[...NAV_ITEMS, { path: '/emergency', label: 'Emergency' }]
                  .find(i => i.path === location.pathname)?.label || 'CampusFlow'}
              </span>
            </div>
            <div className="ly-header-right">
              <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.3)' }}>
                👋 {user?.name?.split(' ')[0]}
              </span>
            </div>
          </header>

          <main className="ly-content">
            {children}
          </main>
        </div>
      </div>

      {/* OFFLINE BANNER */}
      <OfflineBanner />

      {/* PANIC BUTTON */}
      <PanicButton />
    </>
  );
};

export default Layout;