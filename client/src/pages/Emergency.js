import React, { useState, useEffect } from 'react';
import { emergencyAPI } from '../utils/api';
import { useAuth } from '../context/AuthContext';

const EVACUATION_ROUTES = [
  {
    zone: 'Auditorium', icon: '🎭', color: '#6366f1', time: '2 min',
    steps: ['Use side emergency exits only', 'Do NOT use main stage entrance', 'Follow green floor markings', 'Assembly Point A — North Lawn'],
  },
  {
    zone: 'Cafeteria', icon: '🍽️', color: '#f59e0b', time: '1.5 min',
    steps: ['Exit through kitchen side door', 'Avoid main cafeteria entrance', 'Follow orange floor markings', 'Assembly Point B — Parking Lot'],
  },
  {
    zone: 'Stage', icon: '🎤', color: '#22c55e', time: '1 min',
    steps: ['Exit stage left or right immediately', 'Move behind backstage area', 'Follow yellow floor markings', 'Assembly Point C — Sports Ground'],
  },
  {
    zone: 'Entrance', icon: '🚪', color: '#06b6d4', time: '30 sec',
    steps: ['Reverse through main gate calmly', 'Do NOT block emergency vehicles', 'Move 50m away from gate', 'Assembly Point D — Main Road'],
  },
];

const Emergency = () => {
  const { isCommittee } = useAuth();
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [resolving, setResolving] = useState(null);
  const [mounted, setMounted] = useState(false);
  const [activeRoute, setActiveRoute] = useState(null);
  const [showTrigger, setShowTrigger] = useState(false);
  const [triggerForm, setTriggerForm] = useState({ message: '', severity: 'high', location: '' });
  const [triggering, setTriggering] = useState(false);

  useEffect(() => {
    setTimeout(() => setMounted(true), 100);
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchAlerts = async () => {
    try {
      const res = await emergencyAPI.getPanicStatus();
      setAlerts(res.data.active_alerts || []);
    } catch (err) {
      console.error('Failed to fetch alerts:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async (alertId) => {
    setResolving(alertId);
    try {
      await emergencyAPI.resolvePanic({ alert_id: alertId });
      fetchAlerts();
    } catch (err) {
      console.error('Failed to resolve:', err);
    } finally {
      setResolving(null);
    }
  };

  const handleResolveAll = async () => {
    setResolving('all');
    try {
      await emergencyAPI.resolvePanic({ resolve_all: true });
      fetchAlerts();
    } catch (err) {
      console.error('Failed to resolve all:', err);
    } finally {
      setResolving(null);
    }
  };

  const handleTrigger = async (e) => {
    e.preventDefault();
    setTriggering(true);
    try {
      await emergencyAPI.triggerPanic({
        type: 'manual',
        severity: triggerForm.severity,
        message: triggerForm.message,
        location: triggerForm.location,
      });
      setShowTrigger(false);
      setTriggerForm({ message: '', severity: 'high', location: '' });
      fetchAlerts();
    } catch (err) {
      console.error('Failed to trigger:', err);
    } finally {
      setTriggering(false);
    }
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleString('en-IN', {
      day: 'numeric', month: 'short',
      hour: '2-digit', minute: '2-digit',
    });
  };

  const SEVERITY = {
    low:      { color: '#22c55e', bg: 'rgba(34,197,94,0.1)',   border: 'rgba(34,197,94,0.2)' },
    medium:   { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',  border: 'rgba(245,158,11,0.2)' },
    high:     { color: '#f97316', bg: 'rgba(249,115,22,0.1)',  border: 'rgba(249,115,22,0.2)' },
    critical: { color: '#ef4444', bg: 'rgba(239,68,68,0.1)',   border: 'rgba(239,68,68,0.2)' },
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap');
        * { box-sizing: border-box; }

        .em-root {
          font-family: 'Plus Jakarta Sans', sans-serif;
          color: white;
          opacity: ${mounted ? 1 : 0};
          transform: ${mounted ? 'translateY(0)' : 'translateY(16px)'};
          transition: all 0.6s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .em-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          margin-bottom: 28px;
          flex-wrap: wrap;
          gap: 16px;
        }

        .em-title { font-size: 26px; font-weight: 800; color: white; letter-spacing: -1px; margin-bottom: 4px; }
        .em-sub { font-size: 14px; color: rgba(255,255,255,0.35); }

        .em-trigger-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 11px 22px;
          background: linear-gradient(135deg, #ef4444, #dc2626);
          border: none;
          border-radius: 12px;
          color: white;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          font-family: 'Plus Jakarta Sans', sans-serif;
          transition: all 0.3s ease;
          box-shadow: 0 4px 20px rgba(239,68,68,0.35);
          animation: emPulse 2s ease-in-out infinite;
        }

        @keyframes emPulse {
          0%,100% { box-shadow: 0 4px 20px rgba(239,68,68,0.35); }
          50% { box-shadow: 0 4px 30px rgba(239,68,68,0.6); }
        }

        .em-trigger-btn:hover { transform: translateY(-2px); }

        /* ACTIVE ALERT BANNER */
        .em-active-banner {
          background: rgba(239,68,68,0.08);
          border: 1px solid rgba(239,68,68,0.25);
          border-radius: 16px;
          padding: 20px 24px;
          margin-bottom: 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 16px;
          animation: emBannerPulse 1.5s ease-in-out infinite;
        }

        @keyframes emBannerPulse {
          0%,100% { border-color: rgba(239,68,68,0.25); }
          50% { border-color: rgba(239,68,68,0.5); }
        }

        .em-banner-left { display: flex; align-items: center; gap: 12px; }
        .em-banner-dot {
          width: 12px; height: 12px;
          background: #ef4444;
          border-radius: 50%;
          box-shadow: 0 0 12px #ef4444;
          animation: emDot 0.8s ease-in-out infinite;
          flex-shrink: 0;
        }

        @keyframes emDot { 0%,100% { opacity:1; } 50% { opacity:0.3; } }

        .em-banner-title { font-size: 16px; font-weight: 800; color: #fca5a5; letter-spacing: -0.3px; }
        .em-banner-sub { font-size: 13px; color: rgba(255,255,255,0.4); margin-top: 2px; }

        .em-resolve-all-btn {
          padding: 10px 20px;
          background: rgba(34,197,94,0.1);
          border: 1px solid rgba(34,197,94,0.3);
          border-radius: 10px;
          color: #86efac;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          font-family: 'Plus Jakarta Sans', sans-serif;
          transition: all 0.2s ease;
        }

        .em-resolve-all-btn:hover { background: rgba(34,197,94,0.15); }
        .em-resolve-all-btn:disabled { opacity: 0.5; cursor: not-allowed; }

        /* GRID */
        .em-grid {
          display: grid;
          grid-template-columns: 1fr 340px;
          gap: 20px;
        }

        /* SECTION */
        .em-section {
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 20px;
          overflow: hidden;
          margin-bottom: 16px;
        }

        .em-section-header {
          padding: 18px 24px;
          border-bottom: 1px solid rgba(255,255,255,0.05);
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .em-section-title { font-size: 15px; font-weight: 700; color: white; letter-spacing: -0.3px; }
        .em-section-sub { font-size: 12px; color: rgba(255,255,255,0.3); margin-top: 2px; }

        /* ALERT ROW */
        .em-alert-row {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 16px 24px;
          border-bottom: 1px solid rgba(255,255,255,0.03);
          transition: background 0.2s ease;
        }

        .em-alert-row:last-child { border-bottom: none; }
        .em-alert-row:hover { background: rgba(255,255,255,0.02); }

        .em-alert-icon {
          width: 40px; height: 40px;
          border-radius: 11px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
          flex-shrink: 0;
        }

        .em-alert-msg { font-size: 14px; font-weight: 600; color: white; margin-bottom: 4px; }
        .em-alert-meta { font-size: 12px; color: rgba(255,255,255,0.3); display: flex; gap: 12px; flex-wrap: wrap; }

        .em-severity-badge {
          font-size: 11px;
          font-weight: 700;
          padding: 3px 10px;
          border-radius: 100px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .em-resolve-btn {
          padding: 7px 14px;
          background: rgba(34,197,94,0.1);
          border: 1px solid rgba(34,197,94,0.2);
          border-radius: 8px;
          color: #86efac;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          font-family: 'Plus Jakarta Sans', sans-serif;
          transition: all 0.2s ease;
          flex-shrink: 0;
        }

        .em-resolve-btn:hover { background: rgba(34,197,94,0.15); }
        .em-resolve-btn:disabled { opacity: 0.5; cursor: not-allowed; }

        .em-empty {
          padding: 48px 24px;
          text-align: center;
          color: rgba(255,255,255,0.2);
          font-size: 14px;
        }

        .em-empty-icon { font-size: 48px; display: block; margin-bottom: 12px; opacity: 0.4; }

        /* EVACUATION ROUTES */
        .em-route-card {
          border-radius: 16px;
          padding: 18px;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.34,1.56,0.64,1);
          margin-bottom: 12px;
        }

        .em-route-card:hover { transform: translateY(-2px); }
        .em-route-card.active { transform: translateY(-2px) scale(1.01); }

        .em-route-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 12px;
        }

        .em-route-zone { font-size: 15px; font-weight: 800; color: white; display: flex; align-items: center; gap: 8px; }
        .em-route-time { font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 100px; }

        .em-route-steps { display: flex; flex-direction: column; gap: 6px; }

        .em-route-step {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          font-size: 12px;
          color: rgba(255,255,255,0.5);
        }

        .em-step-num {
          width: 18px; height: 18px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 10px;
          font-weight: 800;
          flex-shrink: 0;
        }

        /* TRIGGER MODAL */
        .em-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.85);
          backdrop-filter: blur(8px);
          z-index: 200;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }

        .em-modal {
          background: #0d0f1e;
          border: 1px solid rgba(239,68,68,0.2);
          border-radius: 24px;
          padding: 36px;
          width: 100%;
          max-width: 480px;
          box-shadow: 0 32px 80px rgba(239,68,68,0.15);
          animation: emModalIn 0.4s cubic-bezier(0.16,1,0.3,1);
        }

        @keyframes emModalIn {
          from { opacity:0; transform:translateY(24px) scale(0.96); }
          to { opacity:1; transform:translateY(0) scale(1); }
        }

        .em-modal-title { font-size: 20px; font-weight: 800; color: white; letter-spacing: -0.5px; margin-bottom: 6px; }
        .em-modal-sub { font-size: 14px; color: rgba(255,255,255,0.35); margin-bottom: 24px; }

        .em-modal-field { margin-bottom: 16px; }
        .em-modal-label {
          display: block;
          font-size: 11px;
          font-weight: 600;
          color: rgba(255,255,255,0.3);
          text-transform: uppercase;
          letter-spacing: 0.8px;
          margin-bottom: 7px;
        }

        .em-modal-input {
          width: 100%;
          background: rgba(255,255,255,0.04);
          border: 1.5px solid rgba(255,255,255,0.07);
          border-radius: 12px;
          padding: 12px 16px;
          font-size: 14px;
          color: white;
          font-family: 'Plus Jakarta Sans', sans-serif;
          outline: none;
          transition: all 0.2s ease;
        }

        .em-modal-input:focus {
          border-color: rgba(239,68,68,0.4);
          background: rgba(239,68,68,0.04);
        }

        .em-modal-input::placeholder { color: rgba(255,255,255,0.15); }

        .em-modal-select {
          width: 100%;
          background: rgba(255,255,255,0.04);
          border: 1.5px solid rgba(255,255,255,0.07);
          border-radius: 12px;
          padding: 12px 16px;
          font-size: 14px;
          color: white;
          font-family: 'Plus Jakarta Sans', sans-serif;
          outline: none;
          cursor: pointer;
          appearance: none;
        }

        .em-modal-select option { background: #0d0f1e; }

        .em-modal-btns { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 8px; }

        .em-modal-cancel {
          padding: 13px;
          border-radius: 12px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          color: rgba(255,255,255,0.4);
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          font-family: 'Plus Jakarta Sans', sans-serif;
          transition: all 0.2s ease;
        }

        .em-modal-cancel:hover { background: rgba(255,255,255,0.07); color: white; }

        .em-modal-submit {
          padding: 13px;
          border-radius: 12px;
          background: linear-gradient(135deg, #ef4444, #dc2626);
          border: none;
          color: white;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          font-family: 'Plus Jakarta Sans', sans-serif;
          transition: all 0.2s ease;
          box-shadow: 0 4px 16px rgba(239,68,68,0.4);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        .em-modal-submit:hover { transform: translateY(-1px); }
        .em-modal-submit:disabled { opacity: 0.5; cursor: not-allowed; }

        .em-spinner {
          width: 14px; height: 14px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: emSpin 0.7s linear infinite;
        }

        @keyframes emSpin { to { transform: rotate(360deg); } }

        @media (max-width: 1000px) { .em-grid { grid-template-columns: 1fr; } }
      `}</style>

      <div className="em-root">

        {/* HEADER */}
        <div className="em-header">
          <div>
            <div className="em-title">Emergency Center 🚨</div>
            <div className="em-sub">Monitor and manage campus emergency situations</div>
          </div>
          {isCommittee && (
            <button className="em-trigger-btn" onClick={() => setShowTrigger(true)}>
              🚨 Trigger Alert
            </button>
          )}
        </div>

        {/* ACTIVE ALERT BANNER */}
        {alerts.length > 0 && (
          <div className="em-active-banner">
            <div className="em-banner-left">
              <div className="em-banner-dot" />
              <div>
                <div className="em-banner-title">⚡ {alerts.length} Active Emergency Alert{alerts.length > 1 ? 's' : ''}!</div>
                <div className="em-banner-sub">Immediate action required — check alerts below</div>
              </div>
            </div>
            {isCommittee && (
              <button
                className="em-resolve-all-btn"
                onClick={handleResolveAll}
                disabled={resolving === 'all'}
              >
                {resolving === 'all' ? '⏳ Resolving...' : '✅ Resolve All'}
              </button>
            )}
          </div>
        )}

        <div className="em-grid">

          {/* LEFT — ALERTS */}
          <div>
            <div className="em-section">
              <div className="em-section-header">
                <div>
                  <div className="em-section-title">Active Alerts</div>
                  <div className="em-section-sub">{alerts.length} active · updates every 10s</div>
                </div>
                <div style={{
                  width: '8px', height: '8px', borderRadius: '50%',
                  background: alerts.length > 0 ? '#ef4444' : '#22c55e',
                  boxShadow: `0 0 8px ${alerts.length > 0 ? '#ef4444' : '#22c55e'}`,
                  animation: 'emDot 1s ease-in-out infinite',
                }} />
              </div>

              {loading ? (
                <div className="em-empty">
                  <span className="em-empty-icon">⏳</span>
                  Loading alerts...
                </div>
              ) : alerts.length === 0 ? (
                <div className="em-empty">
                  <span className="em-empty-icon">✅</span>
                  <div style={{ fontWeight: '700', color: 'rgba(255,255,255,0.3)', marginBottom: '6px' }}>
                    All Clear — No Active Alerts
                  </div>
                  Campus is safe and operating normally
                </div>
              ) : (
                alerts.map(alert => {
                  const s = SEVERITY[alert.severity] || SEVERITY.high;
                  return (
                    <div key={alert.id} className="em-alert-row">
                      <div className="em-alert-icon" style={{ background: s.bg, border: `1px solid ${s.border}` }}>
                        {alert.severity === 'critical' ? '🚨' : alert.severity === 'high' ? '⚠️' : '⚡'}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="em-alert-msg">{alert.message}</div>
                        <div className="em-alert-meta">
                          <span>📍 {alert.location || 'All Zones'}</span>
                          <span>🕐 {formatTime(alert.created_at)}</span>
                        </div>
                      </div>
                      <div className="em-severity-badge" style={{ color: s.color, background: s.bg, border: `1px solid ${s.border}` }}>
                        {alert.severity}
                      </div>
                      {isCommittee && (
                        <button
                          className="em-resolve-btn"
                          onClick={() => handleResolve(alert.id)}
                          disabled={resolving === alert.id}
                        >
                          {resolving === alert.id ? '⏳' : '✅ Resolve'}
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* RIGHT — EVACUATION ROUTES */}
          <div>
            <div className="em-section">
              <div className="em-section-header">
                <div>
                  <div className="em-section-title">🗺️ Evacuation Routes</div>
                  <div className="em-section-sub">Click zone for details</div>
                </div>
              </div>
              <div style={{ padding: '16px' }}>
                {EVACUATION_ROUTES.map(route => (
                  <div
                    key={route.zone}
                    className={`em-route-card ${activeRoute === route.zone ? 'active' : ''}`}
                    style={{
                      background: activeRoute === route.zone ? `${route.color}12` : 'rgba(255,255,255,0.02)',
                      border: `1px solid ${activeRoute === route.zone ? route.color + '40' : 'rgba(255,255,255,0.06)'}`,
                    }}
                    onClick={() => setActiveRoute(activeRoute === route.zone ? null : route.zone)}
                  >
                    <div className="em-route-top">
                      <div className="em-route-zone">
                        {route.icon} {route.zone}
                      </div>
                      <div className="em-route-time" style={{ color: route.color, background: `${route.color}20`, border: `1px solid ${route.color}40` }}>
                        🕐 {route.time}
                      </div>
                    </div>
                    {activeRoute === route.zone && (
                      <div className="em-route-steps">
                        {route.steps.map((step, i) => (
                          <div key={i} className="em-route-step">
                            <div className="em-step-num" style={{ background: `${route.color}25`, color: route.color }}>
                              {i + 1}
                            </div>
                            {step}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* TRIGGER MODAL */}
      {showTrigger && (
        <div className="em-modal-overlay" onClick={e => e.target === e.currentTarget && setShowTrigger(false)}>
          <div className="em-modal">
            <div className="em-modal-title">🚨 Trigger Emergency Alert</div>
            <div className="em-modal-sub">This will notify all staff and students immediately</div>
            <form onSubmit={handleTrigger}>
              <div className="em-modal-field">
                <label className="em-modal-label">Message *</label>
                <textarea
                  className="em-modal-input"
                  rows={3}
                  value={triggerForm.message}
                  onChange={e => setTriggerForm({ ...triggerForm, message: e.target.value })}
                  placeholder="Describe the emergency situation..."
                  required
                  style={{ resize: 'vertical', minHeight: '80px' }}
                />
              </div>
              <div className="em-modal-field">
                <label className="em-modal-label">Location</label>
                <input
                  className="em-modal-input"
                  type="text"
                  value={triggerForm.location}
                  onChange={e => setTriggerForm({ ...triggerForm, location: e.target.value })}
                  placeholder="e.g. Auditorium, Stage, Entrance"
                />
              </div>
              <div className="em-modal-field">
                <label className="em-modal-label">Severity</label>
                <select
                  className="em-modal-select"
                  value={triggerForm.severity}
                  onChange={e => setTriggerForm({ ...triggerForm, severity: e.target.value })}
                >
                  <option value="low">⚡ Low</option>
                  <option value="medium">⚠️ Medium</option>
                  <option value="high">🔴 High</option>
                  <option value="critical">🚨 Critical</option>
                </select>
              </div>
              <div className="em-modal-btns">
                <button type="button" className="em-modal-cancel" onClick={() => setShowTrigger(false)}>
                  Cancel
                </button>
                <button type="submit" className="em-modal-submit" disabled={triggering}>
                  {triggering ? <><div className="em-spinner" /> Triggering...</> : '🚨 Trigger Alert'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default Emergency;