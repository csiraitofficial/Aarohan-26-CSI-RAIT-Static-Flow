import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { eventsAPI, crowdAPI, budgetAPI, emergencyAPI } from '../utils/api';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
  const { user, isCommittee } = useAuth();
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [crowd, setCrowd] = useState({ total_count: 0 });
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [time, setTime] = useState(new Date());

  // Live clock
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Fetch all data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [eventsRes, alertsRes] = await Promise.all([
          eventsAPI.getAll(),
          emergencyAPI.getPanicStatus(),
        ]);
        setEvents(eventsRes.data.events || []);
        setAlerts(alertsRes.data.active_alerts || []);
      } catch (err) {
        console.error('Dashboard fetch error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const upcomingEvents = events.filter(e => e.status === 'upcoming').slice(0, 5);
  const totalBudget = events.reduce((sum, e) => sum + (parseFloat(e.budget) || 0), 0);

  const getGreeting = () => {
    const h = time.getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const getStatusColor = (status) => {
    if (status === 'upcoming') return { color: '#06b6d4', bg: 'rgba(6,182,212,0.1)', border: 'rgba(6,182,212,0.2)' };
    if (status === 'ongoing') return { color: '#22c55e', bg: 'rgba(34,197,94,0.1)', border: 'rgba(34,197,94,0.2)' };
    if (status === 'completed') return { color: 'rgba(255,255,255,0.3)', bg: 'rgba(255,255,255,0.05)', border: 'rgba(255,255,255,0.08)' };
    return { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.2)' };
  };

  const CARDS = [
    {
      label: 'Total Events',
      value: loading ? '...' : events.length,
      icon: '🎉',
      sub: `${upcomingEvents.length} upcoming`,
      color: '#6366f1',
      bg: 'rgba(99,102,241,0.1)',
      border: 'rgba(99,102,241,0.2)',
      grad: 'linear-gradient(135deg, #6366f1, #4f46e5)',
    },
    {
      label: 'Live Attendance',
      value: loading ? '...' : crowd.total_count,
      icon: '👥',
      sub: 'Across all zones',
      color: '#06b6d4',
      bg: 'rgba(6,182,212,0.1)',
      border: 'rgba(6,182,212,0.2)',
      grad: 'linear-gradient(135deg, #06b6d4, #0891b2)',
    },
    {
      label: 'Total Budget',
      value: loading ? '...' : `₹${(totalBudget / 1000).toFixed(0)}k`,
      icon: '💰',
      sub: 'Across all events',
      color: '#f59e0b',
      bg: 'rgba(245,158,11,0.1)',
      border: 'rgba(245,158,11,0.2)',
      grad: 'linear-gradient(135deg, #f59e0b, #d97706)',
    },
    {
      label: 'Active Alerts',
      value: loading ? '...' : alerts.length,
      icon: '🚨',
      sub: alerts.length > 0 ? 'Needs attention!' : 'All clear',
      color: alerts.length > 0 ? '#ef4444' : '#22c55e',
      bg: alerts.length > 0 ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)',
      border: alerts.length > 0 ? 'rgba(239,68,68,0.2)' : 'rgba(34,197,94,0.2)',
      grad: alerts.length > 0 ? 'linear-gradient(135deg, #ef4444, #dc2626)' : 'linear-gradient(135deg, #22c55e, #16a34a)',
    },
  ];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap');

        .db-root {
          font-family: 'Plus Jakarta Sans', sans-serif;
          color: white;
          min-height: 100vh;
        }

        /* WELCOME SECTION */
        .db-welcome {
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 20px;
          padding: 32px 36px;
          margin-bottom: 28px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          position: relative;
          overflow: hidden;
        }

        .db-welcome::before {
          content: '';
          position: absolute;
          top: -50%; right: -10%;
          width: 300px; height: 300px;
          background: radial-gradient(circle, rgba(99,102,241,0.1), transparent 70%);
          pointer-events: none;
        }

        .db-welcome-left { position: relative; z-index: 1; }

        .db-greeting {
          font-size: 13px;
          color: rgba(255,255,255,0.35);
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-bottom: 8px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .db-greeting-dot {
          width: 6px; height: 6px;
          background: #22c55e;
          border-radius: 50%;
          box-shadow: 0 0 8px #22c55e;
          animation: dbDot 2s ease-in-out infinite;
        }

        @keyframes dbDot {
          0%,100% { opacity:1; } 50% { opacity:0.3; }
        }

        .db-welcome-name {
          font-size: 28px;
          font-weight: 800;
          color: white;
          letter-spacing: -1px;
          margin-bottom: 6px;
        }

        .db-welcome-name span {
          background: linear-gradient(135deg, #818cf8, #06b6d4);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .db-welcome-sub {
          font-size: 14px;
          color: rgba(255,255,255,0.35);
          font-weight: 400;
        }

        .db-clock {
          text-align: right;
          position: relative;
          z-index: 1;
        }

        .db-clock-time {
          font-size: 36px;
          font-weight: 800;
          color: white;
          letter-spacing: -2px;
          font-variant-numeric: tabular-nums;
        }

        .db-clock-date {
          font-size: 13px;
          color: rgba(255,255,255,0.3);
          font-weight: 400;
          margin-top: 4px;
        }

        /* STATS CARDS */
        .db-cards {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
          margin-bottom: 28px;
        }

        .db-card {
          background: rgba(255,255,255,0.02);
          border-radius: 18px;
          padding: 24px;
          border: 1px solid rgba(255,255,255,0.06);
          transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
          cursor: pointer;
          position: relative;
          overflow: hidden;
        }

        .db-card::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 2px;
          opacity: 0;
          transition: opacity 0.3s ease;
        }

        .db-card:hover {
          transform: translateY(-4px);
          border-color: rgba(255,255,255,0.1);
          background: rgba(255,255,255,0.04);
        }

        .db-card:hover::before { opacity: 1; }

        .db-card-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 16px;
        }

        .db-card-icon {
          width: 44px; height: 44px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
        }

        .db-card-badge {
          font-size: 11px;
          font-weight: 600;
          padding: 4px 10px;
          border-radius: 100px;
          letter-spacing: 0.3px;
        }

        .db-card-value {
          font-size: 36px;
          font-weight: 800;
          color: white;
          letter-spacing: -1.5px;
          margin-bottom: 4px;
          font-variant-numeric: tabular-nums;
        }

        .db-card-label {
          font-size: 13px;
          font-weight: 600;
          color: rgba(255,255,255,0.5);
          margin-bottom: 2px;
        }

        .db-card-sub {
          font-size: 11px;
          color: rgba(255,255,255,0.25);
          font-weight: 400;
        }

        /* BOTTOM GRID */
        .db-grid {
          display: grid;
          grid-template-columns: 1fr 340px;
          gap: 20px;
        }

        /* EVENTS TABLE */
        .db-section {
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 20px;
          overflow: hidden;
        }

        .db-section-header {
          padding: 24px 28px 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid rgba(255,255,255,0.05);
        }

        .db-section-title {
          font-size: 16px;
          font-weight: 700;
          color: white;
          letter-spacing: -0.3px;
        }

        .db-section-sub {
          font-size: 12px;
          color: rgba(255,255,255,0.3);
          margin-top: 2px;
        }

        .db-view-all {
          font-size: 12px;
          color: #6366f1;
          font-weight: 600;
          text-decoration: none;
          padding: 6px 14px;
          border-radius: 8px;
          background: rgba(99,102,241,0.08);
          border: 1px solid rgba(99,102,241,0.15);
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .db-view-all:hover {
          background: rgba(99,102,241,0.15);
          color: #818cf8;
        }

        .db-event-row {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 16px 28px;
          border-bottom: 1px solid rgba(255,255,255,0.03);
          transition: background 0.2s ease;
          cursor: pointer;
        }

        .db-event-row:last-child { border-bottom: none; }

        .db-event-row:hover {
          background: rgba(255,255,255,0.02);
        }

        .db-event-icon {
          width: 42px; height: 42px;
          border-radius: 12px;
          background: rgba(99,102,241,0.1);
          border: 1px solid rgba(99,102,241,0.15);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
          flex-shrink: 0;
        }

        .db-event-info { flex: 1; min-width: 0; }

        .db-event-name {
          font-size: 14px;
          font-weight: 600;
          color: white;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          margin-bottom: 3px;
        }

        .db-event-meta {
          font-size: 12px;
          color: rgba(255,255,255,0.3);
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .db-event-status {
          font-size: 11px;
          font-weight: 600;
          padding: 3px 10px;
          border-radius: 100px;
          flex-shrink: 0;
        }

        .db-event-cap {
          font-size: 13px;
          font-weight: 600;
          color: rgba(255,255,255,0.4);
          flex-shrink: 0;
          text-align: right;
        }

        .db-empty {
          padding: 48px 28px;
          text-align: center;
          color: rgba(255,255,255,0.2);
          font-size: 14px;
        }

        .db-empty-icon { font-size: 40px; margin-bottom: 12px; display: block; opacity: 0.4; }

        /* RIGHT PANEL */
        .db-right { display: flex; flex-direction: column; gap: 20px; }

        /* QUICK ACTIONS */
        .db-actions-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          padding: 20px;
        }

        .db-action {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 14px;
          padding: 16px 14px;
          cursor: pointer;
          transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
          text-align: center;
        }

        .db-action:hover {
          transform: translateY(-3px);
          border-color: rgba(99,102,241,0.3);
          background: rgba(99,102,241,0.06);
        }

        .db-action-icon { font-size: 24px; display: block; margin-bottom: 8px; }
        .db-action-label { font-size: 12px; font-weight: 600; color: rgba(255,255,255,0.6); }

        /* ALERTS */
        .db-alert-item {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 14px 20px;
          border-bottom: 1px solid rgba(255,255,255,0.04);
        }

        .db-alert-item:last-child { border-bottom: none; }

        .db-alert-dot {
          width: 8px; height: 8px;
          border-radius: 50%;
          margin-top: 5px;
          flex-shrink: 0;
          animation: dbDot 1.5s ease-in-out infinite;
        }

        .db-alert-msg {
          font-size: 13px;
          color: rgba(255,255,255,0.6);
          line-height: 1.5;
          flex: 1;
        }

        .db-alert-time {
          font-size: 11px;
          color: rgba(255,255,255,0.2);
          white-space: nowrap;
          margin-top: 2px;
        }

        .db-no-alerts {
          padding: 32px 20px;
          text-align: center;
          font-size: 13px;
          color: rgba(255,255,255,0.2);
        }

        /* LOADING SKELETON */
        .db-skeleton {
          background: linear-gradient(90deg, rgba(255,255,255,0.05) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.05) 75%);
          background-size: 200% 100%;
          animation: dbSkeleton 1.5s infinite;
          border-radius: 8px;
          height: 16px;
        }

        @keyframes dbSkeleton {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }

        @media (max-width: 1100px) {
          .db-cards { grid-template-columns: repeat(2, 1fr); }
          .db-grid { grid-template-columns: 1fr; }
        }

        @media (max-width: 600px) {
          .db-cards { grid-template-columns: 1fr 1fr; }
          .db-welcome { flex-direction: column; gap: 20px; }
          .db-clock { text-align: left; }
        }
      `}</style>

      <div className="db-root">

        {/* WELCOME BANNER */}
        <div className="db-welcome">
          <div className="db-welcome-left">
            <div className="db-greeting">
              <div className="db-greeting-dot" />
              {getGreeting()}
            </div>
            <div className="db-welcome-name">
              Welcome back, <span>{user?.name?.split(' ')[0] || 'User'}</span> 👋
            </div>
            <div className="db-welcome-sub">
              Here's what's happening at your campus today.
            </div>
          </div>
          <div className="db-clock">
            <div className="db-clock-time">
              {time.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </div>
            <div className="db-clock-date">
              {time.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </div>
          </div>
        </div>

        {/* STAT CARDS */}
        <div className="db-cards">
          {CARDS.map((card, i) => (
            <div key={i} className="db-card" style={{ '--card-grad': card.grad }}>
              <style>{`.db-card:nth-child(${i + 1})::before { background: ${card.grad}; }`}</style>
              <div className="db-card-top">
                <div className="db-card-icon" style={{ background: card.bg, border: `1px solid ${card.border}` }}>
                  {card.icon}
                </div>
                <div className="db-card-badge" style={{ color: card.color, background: card.bg, border: `1px solid ${card.border}` }}>
                  {card.sub}
                </div>
              </div>
              <div className="db-card-value">{card.value}</div>
              <div className="db-card-label">{card.label}</div>
            </div>
          ))}
        </div>

        {/* BOTTOM GRID */}
        <div className="db-grid">

          {/* UPCOMING EVENTS */}
          <div className="db-section">
            <div className="db-section-header">
              <div>
                <div className="db-section-title">Upcoming Events</div>
                <div className="db-section-sub">{upcomingEvents.length} events scheduled</div>
              </div>
              <span className="db-view-all" onClick={() => navigate('/events')}>
                View all →
              </span>
            </div>

            {loading ? (
              <div style={{ padding: '20px 28px' }}>
                {[1,2,3].map(i => (
                  <div key={i} style={{ display: 'flex', gap: '16px', marginBottom: '16px', alignItems: 'center' }}>
                    <div className="db-skeleton" style={{ width: '42px', height: '42px', borderRadius: '12px', flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div className="db-skeleton" style={{ width: '60%', marginBottom: '8px' }} />
                      <div className="db-skeleton" style={{ width: '40%', height: '12px' }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : upcomingEvents.length === 0 ? (
              <div className="db-empty">
                <span className="db-empty-icon">🎉</span>
                No upcoming events yet
              </div>
            ) : (
              upcomingEvents.map(event => {
                const s = getStatusColor(event.status);
                return (
                  <div key={event.id} className="db-event-row" onClick={() => navigate(`/events/${event.id}`)}>
                    <div className="db-event-icon">🎉</div>
                    <div className="db-event-info">
                      <div className="db-event-name">{event.name}</div>
                      <div className="db-event-meta">
                        <span>📅 {formatDate(event.date)}</span>
                        {event.venue && <span>📍 {event.venue}</span>}
                      </div>
                    </div>
                    <div className="db-event-status" style={{ color: s.color, background: s.bg, border: `1px solid ${s.border}` }}>
                      {event.status}
                    </div>
                    {event.capacity && (
                      <div className="db-event-cap">
                        <div style={{ fontSize: '14px', fontWeight: '700', color: 'white' }}>{event.capacity}</div>
                        <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)' }}>capacity</div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* RIGHT PANEL */}
          <div className="db-right">

            {/* QUICK ACTIONS */}
            <div className="db-section">
              <div className="db-section-header">
                <div>
                  <div className="db-section-title">Quick Actions</div>
                  <div className="db-section-sub">Shortcuts to key features</div>
                </div>
              </div>
              <div className="db-actions-grid">
                {[
                  { icon: '🎉', label: 'New Event', path: '/events' },
                  { icon: '👥', label: 'Crowd Monitor', path: '/crowd' },
                  { icon: '💰', label: 'Budget', path: '/budget' },
                  { icon: '🎫', label: 'Registrations', path: '/registrations' },
                ].map(a => (
                  <div key={a.label} className="db-action" onClick={() => navigate(a.path)}>
                    <span className="db-action-icon">{a.icon}</span>
                    <span className="db-action-label">{a.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* ACTIVE ALERTS */}
            <div className="db-section">
              <div className="db-section-header">
                <div>
                  <div className="db-section-title">Active Alerts</div>
                  <div className="db-section-sub">{alerts.length} alert{alerts.length !== 1 ? 's' : ''} right now</div>
                </div>
                {alerts.length > 0 && (
                  <div style={{
                    width: '24px', height: '24px',
                    background: 'rgba(239,68,68,0.15)',
                    border: '1px solid rgba(239,68,68,0.3)',
                    borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '12px', fontWeight: '700', color: '#f87171'
                  }}>
                    {alerts.length}
                  </div>
                )}
              </div>

              {alerts.length === 0 ? (
                <div className="db-no-alerts">
                  <div style={{ fontSize: '32px', marginBottom: '8px' }}>✅</div>
                  All clear — no active alerts
                </div>
              ) : (
                alerts.slice(0, 4).map((alert, i) => (
                  <div key={i} className="db-alert-item">
                    <div className="db-alert-dot" style={{
                      background: alert.severity === 'critical' ? '#ef4444' : alert.severity === 'high' ? '#f97316' : '#f59e0b'
                    }} />
                    <div style={{ flex: 1 }}>
                      <div className="db-alert-msg">{alert.message}</div>
                      <div className="db-alert-time">{alert.location} • {alert.severity}</div>
                    </div>
                  </div>
                ))
              )}
            </div>

          </div>
        </div>
      </div>
    </>
  );
};

export default Dashboard;