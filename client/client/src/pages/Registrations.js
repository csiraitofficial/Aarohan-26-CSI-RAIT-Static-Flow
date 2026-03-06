import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { eventsAPI, registrationsAPI } from '../utils/api';
import QRScanner from '../components/QRScanner';

const Registrations = () => {
  const { isCommittee } = useAuth();
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState('');
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [recentScans, setRecentScans] = useState([]);
  const [stats, setStats] = useState({ total: 0, checkedIn: 0, pending: 0 });
  const [mounted, setMounted] = useState(false);
  const pollRef = useRef(null);

  useEffect(() => {
    setTimeout(() => setMounted(true), 100);
    fetchEvents();
    return () => clearInterval(pollRef.current);
  }, []);

  useEffect(() => {
    if (selectedEvent) {
      fetchRegistrations();
      // Real-time polling every 5 seconds
      clearInterval(pollRef.current);
      pollRef.current = setInterval(fetchRegistrations, 5000);
    }
    return () => clearInterval(pollRef.current);
  }, [selectedEvent]);

  const fetchEvents = async () => {
    try {
      const res = await eventsAPI.getAll();
      const evs = res.data.events || [];
      setEvents(evs);
      if (evs.length > 0) setSelectedEvent(evs[0].id);
    } catch (err) {
      console.error('Failed to fetch events:', err);
    }
  };

  const fetchRegistrations = async () => {
    if (!selectedEvent) return;
    try {
      setLoading(true);
      const res = await registrationsAPI.getEventRegistrations(selectedEvent);
      const regs = res.data.registrations || [];
      setRegistrations(regs);
      setStats({
        total: regs.length,
        checkedIn: regs.filter(r => r.checked_in).length,
        pending: regs.filter(r => !r.checked_in).length,
      });
    } catch (err) {
      console.error('Failed to fetch registrations:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleScanSuccess = (data) => {
    const reg = data.registration;
    const newScan = {
      id: reg?.id || Date.now(),
      name: reg?.users?.name || 'Unknown Student',
      email: reg?.users?.email || '',
      event: reg?.events?.name || 'Event',
      time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      success: true,
    };
    setRecentScans(prev => [newScan, ...prev].slice(0, 20));
    fetchRegistrations(); // Refresh list
  };

  const selectedEventData = events.find(e => e.id === selectedEvent);
  const checkinPercent = stats.total > 0 ? Math.round((stats.checkedIn / stats.total) * 100) : 0;

  const formatTime = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap');
        * { box-sizing: border-box; }

        .at-root {
          font-family: 'Plus Jakarta Sans', sans-serif;
          color: white;
          opacity: ${mounted ? 1 : 0};
          transform: ${mounted ? 'translateY(0)' : 'translateY(16px)'};
          transition: all 0.6s cubic-bezier(0.16, 1, 0.3, 1);
        }

        /* HEADER */
        .at-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          margin-bottom: 24px;
          gap: 16px;
          flex-wrap: wrap;
        }

        .at-title {
          font-size: 26px;
          font-weight: 800;
          color: white;
          letter-spacing: -1px;
          margin-bottom: 4px;
        }

        .at-sub {
          font-size: 14px;
          color: rgba(255,255,255,0.35);
        }

        .at-header-right {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }

        /* EVENT SELECTOR */
        .at-event-select-wrap {
          position: relative;
        }

        .at-event-select {
          background: rgba(255,255,255,0.04);
          border: 1.5px solid rgba(255,255,255,0.08);
          border-radius: 12px;
          padding: 11px 16px 11px 40px;
          font-size: 14px;
          color: white;
          font-family: 'Plus Jakarta Sans', sans-serif;
          outline: none;
          cursor: pointer;
          transition: all 0.2s ease;
          min-width: 220px;
          appearance: none;
        }

        .at-event-select:focus {
          border-color: rgba(99,102,241,0.5);
          background: rgba(99,102,241,0.06);
        }

        .at-event-select option { background: #0d0f1e; }

        .at-select-icon {
          position: absolute;
          left: 12px; top: 50%;
          transform: translateY(-50%);
          font-size: 15px;
          pointer-events: none;
        }

        /* SCAN BTN */
        .at-scan-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 11px 22px;
          background: linear-gradient(135deg, #6366f1, #4f46e5);
          border: none;
          border-radius: 12px;
          color: white;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          font-family: 'Plus Jakarta Sans', sans-serif;
          transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
          box-shadow: 0 4px 20px rgba(99,102,241,0.35);
          white-space: nowrap;
        }

        .at-scan-btn:hover {
          transform: translateY(-2px) scale(1.02);
          box-shadow: 0 8px 28px rgba(99,102,241,0.5);
        }

        /* STATS */
        .at-stats {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 14px;
          margin-bottom: 24px;
        }

        .at-stat {
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 16px;
          padding: 20px;
          position: relative;
          overflow: hidden;
          transition: all 0.3s ease;
        }

        .at-stat:hover {
          transform: translateY(-2px);
          border-color: rgba(255,255,255,0.1);
        }

        .at-stat::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 2px;
        }

        .at-stat-icon {
          width: 40px; height: 40px;
          border-radius: 11px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
          margin-bottom: 14px;
        }

        .at-stat-num {
          font-size: 32px;
          font-weight: 800;
          letter-spacing: -1.5px;
          display: block;
          margin-bottom: 4px;
        }

        .at-stat-label {
          font-size: 12px;
          color: rgba(255,255,255,0.35);
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        /* PROGRESS BAR */
        .at-progress-wrap {
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 16px;
          padding: 20px 24px;
          margin-bottom: 24px;
        }

        .at-progress-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }

        .at-progress-title {
          font-size: 14px;
          font-weight: 700;
          color: white;
        }

        .at-progress-pct {
          font-size: 24px;
          font-weight: 800;
          letter-spacing: -1px;
        }

        .at-progress-bg {
          height: 8px;
          background: rgba(255,255,255,0.06);
          border-radius: 100px;
          overflow: hidden;
          margin-bottom: 10px;
        }

        .at-progress-fill {
          height: 100%;
          border-radius: 100px;
          background: linear-gradient(90deg, #6366f1, #06b6d4);
          transition: width 1s cubic-bezier(0.16, 1, 0.3, 1);
          position: relative;
          overflow: hidden;
        }

        .at-progress-fill::after {
          content: '';
          position: absolute;
          top: 0; left: -100%;
          width: 60%; height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
          animation: atShimmer 2s infinite;
        }

        @keyframes atShimmer {
          to { left: 200%; }
        }

        .at-progress-labels {
          display: flex;
          justify-content: space-between;
          font-size: 12px;
          color: rgba(255,255,255,0.3);
        }

        /* GRID */
        .at-grid {
          display: grid;
          grid-template-columns: 1fr 360px;
          gap: 20px;
        }

        /* SECTION */
        .at-section {
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 20px;
          overflow: hidden;
        }

        .at-section-header {
          padding: 18px 24px;
          border-bottom: 1px solid rgba(255,255,255,0.05);
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .at-section-title {
          font-size: 15px;
          font-weight: 700;
          color: white;
          letter-spacing: -0.3px;
        }

        .at-section-sub {
          font-size: 12px;
          color: rgba(255,255,255,0.3);
          margin-top: 2px;
        }

        .at-live-badge {
          display: flex;
          align-items: center;
          gap: 6px;
          background: rgba(34,197,94,0.1);
          border: 1px solid rgba(34,197,94,0.2);
          border-radius: 100px;
          padding: 4px 12px;
          font-size: 11px;
          font-weight: 600;
          color: #86efac;
        }

        .at-live-dot {
          width: 6px; height: 6px;
          background: #22c55e;
          border-radius: 50%;
          box-shadow: 0 0 6px #22c55e;
          animation: atDot 1.5s ease-in-out infinite;
        }

        @keyframes atDot {
          0%,100% { opacity: 1; } 50% { opacity: 0.3; }
        }

        /* REGISTRATION ROW */
        .at-reg-row {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 13px 24px;
          border-bottom: 1px solid rgba(255,255,255,0.03);
          transition: background 0.2s ease;
        }

        .at-reg-row:last-child { border-bottom: none; }
        .at-reg-row:hover { background: rgba(255,255,255,0.02); }

        .at-avatar {
          width: 38px; height: 38px;
          border-radius: 11px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 15px;
          font-weight: 700;
          color: white;
          flex-shrink: 0;
        }

        .at-reg-name {
          font-size: 14px;
          font-weight: 600;
          color: white;
          flex: 1;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .at-reg-email {
          font-size: 11px;
          color: rgba(255,255,255,0.3);
          margin-top: 2px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .at-reg-time {
          font-size: 11px;
          color: rgba(255,255,255,0.25);
          text-align: right;
          flex-shrink: 0;
        }

        .at-checkin-badge {
          font-size: 11px;
          font-weight: 600;
          padding: 3px 10px;
          border-radius: 100px;
          flex-shrink: 0;
        }

        /* RECENT SCANS */
        .at-scan-row {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 20px;
          border-bottom: 1px solid rgba(255,255,255,0.03);
          animation: atSlideIn 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes atSlideIn {
          from { opacity: 0; transform: translateX(20px); }
          to { opacity: 1; transform: translateX(0); }
        }

        .at-scan-row:last-child { border-bottom: none; }

        .at-scan-icon {
          width: 36px; height: 36px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          flex-shrink: 0;
          background: rgba(34,197,94,0.1);
          border: 1px solid rgba(34,197,94,0.2);
        }

        .at-scan-name {
          font-size: 13px;
          font-weight: 600;
          color: white;
          flex: 1;
        }

        .at-scan-time {
          font-size: 11px;
          color: rgba(255,255,255,0.25);
          font-weight: 500;
        }

        .at-empty {
          padding: 40px 24px;
          text-align: center;
          color: rgba(255,255,255,0.2);
          font-size: 13px;
        }

        .at-empty-icon {
          font-size: 36px;
          display: block;
          margin-bottom: 10px;
          opacity: 0.4;
        }

        /* LOADING */
        .at-skeleton {
          background: linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.07) 50%, rgba(255,255,255,0.04) 75%);
          background-size: 200% 100%;
          animation: atSkeleton 1.5s infinite;
          border-radius: 8px;
        }

        @keyframes atSkeleton {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }

        /* SCANNER ONLY VIEW (non-committee) */
        .at-no-access {
          text-align: center;
          padding: 80px 20px;
          color: rgba(255,255,255,0.2);
        }

        @media (max-width: 1100px) {
          .at-stats { grid-template-columns: repeat(2, 1fr); }
          .at-grid { grid-template-columns: 1fr; }
        }

        @media (max-width: 600px) {
          .at-stats { grid-template-columns: 1fr 1fr; }
          .at-header { flex-direction: column; }
          .at-header-right { width: 100%; }
          .at-event-select { min-width: unset; width: 100%; }
        }
      `}</style>

      <div className="at-root">

        {/* HEADER */}
        <div className="at-header">
          <div>
            <div className="at-title">Attendance 🎫</div>
            <div className="at-sub">
              {selectedEventData ? `Tracking: ${selectedEventData.name}` : 'Select an event to track attendance'}
            </div>
          </div>

          <div className="at-header-right">
            {/* EVENT SELECTOR */}
            <div className="at-event-select-wrap">
              <span className="at-select-icon">🎉</span>
              <select
                className="at-event-select"
                value={selectedEvent}
                onChange={e => setSelectedEvent(e.target.value)}
              >
                {events.map(ev => (
                  <option key={ev.id} value={ev.id}>{ev.name}</option>
                ))}
              </select>
            </div>

            {/* SCAN BUTTON — committee only */}
            {isCommittee && (
              <button className="at-scan-btn" onClick={() => setShowScanner(true)}>
                📱 Scan QR
              </button>
            )}
          </div>
        </div>

        {/* STATS */}
        <div className="at-stats">
          {[
            {
              icon: '🎫', label: 'Registered', value: stats.total,
              color: '#6366f1', bg: 'rgba(99,102,241,0.1)', grad: 'linear-gradient(90deg, #6366f1, #4f46e5)'
            },
            {
              icon: '✅', label: 'Checked In', value: stats.checkedIn,
              color: '#22c55e', bg: 'rgba(34,197,94,0.1)', grad: 'linear-gradient(90deg, #22c55e, #16a34a)'
            },
            {
              icon: '⏳', label: 'Pending', value: stats.pending,
              color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', grad: 'linear-gradient(90deg, #f59e0b, #d97706)'
            },
            {
              icon: '📊', label: 'Check-in Rate', value: `${checkinPercent}%`,
              color: '#06b6d4', bg: 'rgba(6,182,212,0.1)', grad: 'linear-gradient(90deg, #06b6d4, #0891b2)'
            },
          ].map((s, i) => (
            <div key={s.label} className="at-stat">
              <style>{`.at-stat:nth-child(${i+1})::before { background: ${s.grad}; }`}</style>
              <div className="at-stat-icon" style={{ background: s.bg }}>
                {s.icon}
              </div>
              <span className="at-stat-num" style={{ color: s.color }}>{s.value}</span>
              <span className="at-stat-label">{s.label}</span>
            </div>
          ))}
        </div>

        {/* PROGRESS BAR */}
        <div className="at-progress-wrap">
          <div className="at-progress-header">
            <div className="at-progress-title">
              Check-in Progress
              {selectedEventData && (
                <span style={{ fontWeight: '400', color: 'rgba(255,255,255,0.3)', marginLeft: '8px', fontSize: '13px' }}>
                  {selectedEventData.name}
                </span>
              )}
            </div>
            <div className="at-progress-pct" style={{
              background: 'linear-gradient(135deg, #6366f1, #06b6d4)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>
              {checkinPercent}%
            </div>
          </div>
          <div className="at-progress-bg">
            <div className="at-progress-fill" style={{ width: `${checkinPercent}%` }} />
          </div>
          <div className="at-progress-labels">
            <span>{stats.checkedIn} checked in</span>
            <span>{stats.pending} still pending</span>
          </div>
        </div>

        {/* MAIN GRID */}
        <div className="at-grid">

          {/* REGISTRATIONS LIST */}
          <div className="at-section">
            <div className="at-section-header">
              <div>
                <div className="at-section-title">All Registrations</div>
                <div className="at-section-sub">{stats.total} students registered</div>
              </div>
              <div className="at-live-badge">
                <div className="at-live-dot" />
                Live
              </div>
            </div>

            {loading ? (
              <div style={{ padding: '16px 24px' }}>
                {[1,2,3,4,5].map(i => (
                  <div key={i} style={{ display: 'flex', gap: '12px', marginBottom: '14px', alignItems: 'center' }}>
                    <div className="at-skeleton" style={{ width: '38px', height: '38px', borderRadius: '11px', flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div className="at-skeleton" style={{ width: '50%', height: '14px', marginBottom: '6px' }} />
                      <div className="at-skeleton" style={{ width: '70%', height: '11px' }} />
                    </div>
                    <div className="at-skeleton" style={{ width: '72px', height: '22px', borderRadius: '100px' }} />
                  </div>
                ))}
              </div>
            ) : registrations.length === 0 ? (
              <div className="at-empty">
                <span className="at-empty-icon">🎫</span>
                No registrations yet for this event
              </div>
            ) : (
              <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
                {registrations.map((reg, i) => {
                  const colors = ['#6366f1','#06b6d4','#8b5cf6','#f59e0b','#22c55e','#ec4899'];
                  const color = colors[i % colors.length];
                  return (
                    <div key={reg.id} className="at-reg-row">
                      <div className="at-avatar" style={{ background: `${color}22`, border: `1px solid ${color}44` }}>
                        <span style={{ color }}>
                          {reg.users?.name?.charAt(0)?.toUpperCase() || '?'}
                        </span>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="at-reg-name">{reg.users?.name || 'Unknown'}</div>
                        <div className="at-reg-email">{reg.users?.email || ''}</div>
                      </div>
                      <div>
                        <div className="at-checkin-badge" style={{
                          color: reg.checked_in ? '#22c55e' : 'rgba(255,255,255,0.3)',
                          background: reg.checked_in ? 'rgba(34,197,94,0.1)' : 'rgba(255,255,255,0.04)',
                          border: `1px solid ${reg.checked_in ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.07)'}`,
                        }}>
                          {reg.checked_in ? '✅ In' : '⏳ Pending'}
                        </div>
                        {reg.checked_in_at && (
                          <div className="at-reg-time" style={{ marginTop: '4px' }}>
                            {formatTime(reg.checked_in_at)}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* RIGHT PANEL */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

            {/* SCAN TO CHECK IN */}
            {isCommittee && (
              <div style={{
                background: 'linear-gradient(135deg, rgba(99,102,241,0.1), rgba(6,182,212,0.08))',
                border: '1px solid rgba(99,102,241,0.2)',
                borderRadius: '20px',
                padding: '24px',
                textAlign: 'center',
              }}>
                <div style={{ fontSize: '40px', marginBottom: '12px' }}>📱</div>
                <div style={{ fontSize: '16px', fontWeight: '700', color: 'white', marginBottom: '6px' }}>
                  Scan to Check In
                </div>
                <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.35)', marginBottom: '20px', lineHeight: '1.6' }}>
                  Use the QR scanner to quickly check in students at the entrance
                </div>
                <button
                  className="at-scan-btn"
                  style={{ width: '100%', justifyContent: 'center' }}
                  onClick={() => setShowScanner(true)}
                >
                  📱 Open QR Scanner
                </button>
              </div>
            )}

            {/* RECENT SCANS */}
            <div className="at-section">
              <div className="at-section-header">
                <div>
                  <div className="at-section-title">Recent Scans</div>
                  <div className="at-section-sub">{recentScans.length} scans this session</div>
                </div>
                {recentScans.length > 0 && (
                  <button
                    onClick={() => setRecentScans([])}
                    style={{
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.07)',
                      borderRadius: '8px',
                      color: 'rgba(255,255,255,0.3)',
                      fontSize: '11px',
                      fontWeight: '600',
                      padding: '4px 10px',
                      cursor: 'pointer',
                      fontFamily: 'Plus Jakarta Sans, sans-serif',
                    }}
                  >
                    Clear
                  </button>
                )}
              </div>

              {recentScans.length === 0 ? (
                <div className="at-empty">
                  <span className="at-empty-icon">📷</span>
                  No scans yet this session
                </div>
              ) : (
                <div style={{ maxHeight: '320px', overflowY: 'auto' }}>
                  {recentScans.map((scan, i) => (
                    <div key={`${scan.id}-${i}`} className="at-scan-row">
                      <div className="at-scan-icon">✅</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="at-scan-name">{scan.name}</div>
                        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.25)', marginTop: '2px' }}>
                          {scan.event}
                        </div>
                      </div>
                      <div className="at-scan-time">{scan.time}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* EVENT INFO */}
            {selectedEventData && (
              <div className="at-section">
                <div className="at-section-header">
                  <div className="at-section-title">Event Info</div>
                </div>
                <div style={{ padding: '16px 20px' }}>
                  {[
                    { icon: '🎉', label: 'Event', value: selectedEventData.name },
                    { icon: '📍', label: 'Venue', value: selectedEventData.venue || 'TBD' },
                    { icon: '👥', label: 'Capacity', value: selectedEventData.capacity || '∞' },
                    { icon: '⚡', label: 'Status', value: selectedEventData.status },
                  ].map(item => (
                    <div key={item.label} style={{
                      display: 'flex', alignItems: 'center', gap: '10px',
                      padding: '10px 0',
                      borderBottom: '1px solid rgba(255,255,255,0.04)',
                    }}>
                      <span style={{ fontSize: '14px' }}>{item.icon}</span>
                      <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', flex: 1 }}>{item.label}</span>
                      <span style={{ fontSize: '13px', fontWeight: '600', color: 'white' }}>{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* QR SCANNER MODAL */}
      {showScanner && (
        <QRScanner
          onClose={() => setShowScanner(false)}
          onSuccess={handleScanSuccess}
        />
      )}
    </>
  );
};

export default Registrations;