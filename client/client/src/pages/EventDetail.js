import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { eventsAPI, registrationsAPI } from '../utils/api';

const EventDetail = () => {
  const { id } = useParams();
  const { user, isCommittee } = useAuth();
  const navigate = useNavigate();

  const [event, setEvent] = useState(null);
  const [registrations, setRegistrations] = useState([]);
  const [myRegistration, setMyRegistration] = useState(null);
  const [qrCode, setQrCode] = useState(null);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [generatingQR, setGeneratingQR] = useState(false);
  const [error, setError] = useState('');
  const [regError, setRegError] = useState('');
  const [activeTab, setActiveTab] = useState('details');

  useEffect(() => { fetchData(); }, [id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const eventRes = await eventsAPI.getOne(id);
      setEvent(eventRes.data.event);

      // Get user's registrations
      if (user) {
        const myRegsRes = await registrationsAPI.getUserRegistrations(user.id);
        const myRegs = myRegsRes.data.registrations || [];
        const found = myRegs.find(r => r.event_id === id);
        if (found) setMyRegistration(found);
      }

      // Get all registrations (committee only)
      if (isCommittee) {
        const regsRes = await registrationsAPI.getEventRegistrations(id);
        setRegistrations(regsRes.data.registrations || []);
      }
    } catch (err) {
      setError('Failed to load event details.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    setRegError('');
    setRegistering(true);
    try {
      const res = await registrationsAPI.register({ event_id: id });
      setMyRegistration(res.data.registration);
      fetchData();
    } catch (err) {
      setRegError(err.response?.data?.message || 'Registration failed.');
    } finally {
      setRegistering(false);
    }
  };

  const handleGenerateQR = async () => {
    if (!myRegistration) return;
    setGeneratingQR(true);
    try {
      const res = await registrationsAPI.generateQR({ registration_id: myRegistration.id });
      setQrCode(res.data.qr_code);
    } catch (err) {
      setRegError('Failed to generate QR code.');
    } finally {
      setGeneratingQR(false);
    }
  };

  const formatDate = (d) => new Date(d).toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });

  const getStatus = (status) => {
    const map = {
      upcoming: { color: '#06b6d4', bg: 'rgba(6,182,212,0.1)', border: 'rgba(6,182,212,0.2)' },
      ongoing: { color: '#22c55e', bg: 'rgba(34,197,94,0.1)', border: 'rgba(34,197,94,0.2)' },
      completed: { color: 'rgba(255,255,255,0.3)', bg: 'rgba(255,255,255,0.05)', border: 'rgba(255,255,255,0.08)' },
      cancelled: { color: '#ef4444', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.2)' },
    };
    return map[status] || map.upcoming;
  };

  if (loading) return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        .ed-loading {
          font-family: 'Plus Jakarta Sans', sans-serif;
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          min-height: 60vh; gap: 16px;
        }
        .ed-spinner {
          width: 48px; height: 48px;
          border: 3px solid rgba(99,102,241,0.2);
          border-top-color: #6366f1;
          border-radius: 50%;
          animation: edSpin 0.8s linear infinite;
        }
        @keyframes edSpin { to { transform: rotate(360deg); } }
        .ed-loading-text { color: rgba(255,255,255,0.3); font-size: 14px; }
      `}</style>
      <div className="ed-loading">
        <div className="ed-spinner" />
        <div className="ed-loading-text">Loading event details...</div>
      </div>
    </>
  );

  if (error || !event) return (
    <div style={{
      fontFamily: 'Plus Jakarta Sans, sans-serif',
      textAlign: 'center', padding: '80px 20px',
      color: 'rgba(255,255,255,0.3)'
    }}>
      <div style={{ fontSize: '48px', marginBottom: '16px' }}>😕</div>
      <div style={{ fontSize: '18px', fontWeight: '700', marginBottom: '8px', color: 'rgba(255,255,255,0.5)' }}>
        Event not found
      </div>
      <div style={{ fontSize: '14px', marginBottom: '24px' }}>{error}</div>
      <button onClick={() => navigate('/events')} style={{
        padding: '10px 24px', background: 'rgba(99,102,241,0.15)',
        border: '1px solid rgba(99,102,241,0.3)', borderRadius: '10px',
        color: '#818cf8', cursor: 'pointer', fontSize: '14px',
        fontFamily: 'Plus Jakarta Sans, sans-serif'
      }}>
        ← Back to Events
      </button>
    </div>
  );

  const s = getStatus(event.status);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap');
        * { box-sizing: border-box; }

        .ed-root { font-family: 'Plus Jakarta Sans', sans-serif; color: white; }

        /* BACK */
        .ed-back {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          color: rgba(255,255,255,0.35);
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          margin-bottom: 24px;
          padding: 8px 14px;
          border-radius: 10px;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.06);
          transition: all 0.2s ease;
        }

        .ed-back:hover {
          color: white;
          background: rgba(255,255,255,0.06);
        }

        /* HERO */
        .ed-hero {
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 24px;
          overflow: hidden;
          margin-bottom: 24px;
        }

        .ed-hero-banner {
          height: 160px;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }

        .ed-hero-banner-bg {
          position: absolute; inset: 0;
          background: linear-gradient(135deg, rgba(99,102,241,0.2), rgba(6,182,212,0.15));
        }

        .ed-hero-banner-pattern {
          position: absolute; inset: 0;
          background-image:
            radial-gradient(circle at 20% 50%, rgba(99,102,241,0.2) 0%, transparent 50%),
            radial-gradient(circle at 80% 50%, rgba(6,182,212,0.15) 0%, transparent 50%);
        }

        .ed-hero-emoji {
          font-size: 64px;
          position: relative; z-index: 1;
          filter: drop-shadow(0 8px 24px rgba(0,0,0,0.4));
        }

        .ed-hero-body {
          padding: 28px 32px;
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 24px;
          flex-wrap: wrap;
        }

        .ed-hero-left { flex: 1; min-width: 280px; }

        .ed-hero-tags {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 12px;
          flex-wrap: wrap;
        }

        .ed-tag {
          font-size: 11px;
          font-weight: 600;
          padding: 4px 12px;
          border-radius: 100px;
          letter-spacing: 0.3px;
        }

        .ed-hero-title {
          font-size: 28px;
          font-weight: 800;
          color: white;
          letter-spacing: -1px;
          margin-bottom: 10px;
          line-height: 1.2;
        }

        .ed-hero-desc {
          font-size: 14px;
          color: rgba(255,255,255,0.4);
          line-height: 1.7;
          font-weight: 400;
        }

        .ed-hero-right {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 12px;
        }

        .ed-hero-budget {
          text-align: right;
        }

        .ed-budget-label {
          font-size: 11px;
          color: rgba(255,255,255,0.3);
          text-transform: uppercase;
          letter-spacing: 0.8px;
          font-weight: 500;
          display: block;
          margin-bottom: 4px;
        }

        .ed-budget-value {
          font-size: 28px;
          font-weight: 800;
          color: #f59e0b;
          letter-spacing: -1px;
        }

        /* INFO GRID */
        .ed-info-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 1px;
          background: rgba(255,255,255,0.05);
          border-top: 1px solid rgba(255,255,255,0.05);
        }

        .ed-info-item {
          background: rgba(7,9,15,0.8);
          padding: 20px 24px;
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .ed-info-icon {
          width: 36px; height: 36px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          flex-shrink: 0;
        }

        .ed-info-label {
          font-size: 11px;
          color: rgba(255,255,255,0.3);
          text-transform: uppercase;
          letter-spacing: 0.5px;
          font-weight: 500;
          display: block;
          margin-bottom: 3px;
        }

        .ed-info-value {
          font-size: 14px;
          font-weight: 600;
          color: white;
        }

        /* TABS */
        .ed-tabs {
          display: flex;
          gap: 4px;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 14px;
          padding: 4px;
          margin-bottom: 24px;
          width: fit-content;
        }

        .ed-tab {
          padding: 10px 20px;
          border-radius: 10px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          border: none;
          font-family: 'Plus Jakarta Sans', sans-serif;
          transition: all 0.2s ease;
          color: rgba(255,255,255,0.4);
          background: transparent;
        }

        .ed-tab.active {
          background: rgba(99,102,241,0.15);
          color: #a5b4fc;
          border: 1px solid rgba(99,102,241,0.2);
        }

        .ed-tab:hover:not(.active) {
          color: rgba(255,255,255,0.7);
          background: rgba(255,255,255,0.04);
        }

        /* MAIN GRID */
        .ed-grid {
          display: grid;
          grid-template-columns: 1fr 340px;
          gap: 20px;
        }

        /* SECTION */
        .ed-section {
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 20px;
          overflow: hidden;
        }

        .ed-section-header {
          padding: 20px 24px;
          border-bottom: 1px solid rgba(255,255,255,0.05);
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .ed-section-title {
          font-size: 15px;
          font-weight: 700;
          color: white;
          letter-spacing: -0.3px;
        }

        .ed-section-sub {
          font-size: 12px;
          color: rgba(255,255,255,0.3);
          margin-top: 2px;
        }

        /* REGISTRATION CARD */
        .ed-reg-card {
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 20px;
          padding: 24px;
          margin-bottom: 16px;
        }

        .ed-reg-status {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 20px;
        }

        .ed-reg-icon {
          width: 44px; height: 44px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
        }

        .ed-reg-title {
          font-size: 15px;
          font-weight: 700;
          color: white;
        }

        .ed-reg-sub {
          font-size: 12px;
          color: rgba(255,255,255,0.3);
          margin-top: 2px;
        }

        .ed-register-btn {
          width: 100%;
          height: 50px;
          background: linear-gradient(135deg, #6366f1, #4f46e5);
          border: none;
          border-radius: 14px;
          color: white;
          font-size: 15px;
          font-weight: 700;
          cursor: pointer;
          font-family: 'Plus Jakarta Sans', sans-serif;
          transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
          box-shadow: 0 4px 20px rgba(99,102,241,0.35);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          margin-bottom: 12px;
        }

        .ed-register-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 28px rgba(99,102,241,0.5);
        }

        .ed-register-btn:disabled { opacity: 0.5; cursor: not-allowed; }

        .ed-qr-btn {
          width: 100%;
          height: 46px;
          background: rgba(6,182,212,0.1);
          border: 1px solid rgba(6,182,212,0.2);
          border-radius: 12px;
          color: #06b6d4;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          font-family: 'Plus Jakarta Sans', sans-serif;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        .ed-qr-btn:hover { background: rgba(6,182,212,0.15); }
        .ed-qr-btn:disabled { opacity: 0.5; cursor: not-allowed; }

        /* QR CODE */
        .ed-qr-wrap {
          background: white;
          border-radius: 16px;
          padding: 20px;
          text-align: center;
          margin-top: 16px;
        }

        .ed-qr-img {
          width: 100%;
          max-width: 200px;
          border-radius: 8px;
          margin-bottom: 12px;
        }

        .ed-qr-label {
          font-size: 12px;
          color: #374151;
          font-weight: 600;
        }

        .ed-qr-id {
          font-size: 10px;
          color: #9ca3af;
          margin-top: 4px;
          font-family: monospace;
        }

        /* REGISTRATIONS TABLE */
        .ed-reg-row {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 14px 24px;
          border-bottom: 1px solid rgba(255,255,255,0.03);
          transition: background 0.2s ease;
        }

        .ed-reg-row:last-child { border-bottom: none; }
        .ed-reg-row:hover { background: rgba(255,255,255,0.02); }

        .ed-reg-avatar {
          width: 36px; height: 36px;
          border-radius: 10px;
          background: linear-gradient(135deg, #6366f1, #4f46e5);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          font-weight: 700;
          color: white;
          flex-shrink: 0;
        }

        .ed-reg-name {
          font-size: 14px;
          font-weight: 600;
          color: white;
          flex: 1;
        }

        .ed-reg-email {
          font-size: 12px;
          color: rgba(255,255,255,0.3);
          margin-top: 2px;
        }

        .ed-reg-badge {
          font-size: 11px;
          font-weight: 600;
          padding: 3px 10px;
          border-radius: 100px;
        }

        .ed-checkin-badge {
          font-size: 11px;
          font-weight: 600;
          padding: 3px 10px;
          border-radius: 100px;
        }

        .ed-empty {
          padding: 48px 24px;
          text-align: center;
          color: rgba(255,255,255,0.2);
          font-size: 14px;
        }

        .ed-empty-icon { font-size: 36px; display: block; margin-bottom: 12px; opacity: 0.4; }

        .ed-error {
          background: rgba(239,68,68,0.08);
          border: 1px solid rgba(239,68,68,0.2);
          border-radius: 10px;
          padding: 10px 14px;
          font-size: 13px;
          color: #fca5a5;
          margin-top: 10px;
        }

        .ed-spinner {
          width: 16px; height: 16px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: edSpin 0.7s linear infinite;
        }

        @keyframes edSpin { to { transform: rotate(360deg); } }

        @media (max-width: 1000px) {
          .ed-grid { grid-template-columns: 1fr; }
          .ed-info-grid { grid-template-columns: repeat(2, 1fr); }
          .ed-hero-body { flex-direction: column; }
          .ed-hero-right { align-items: flex-start; }
        }

        @media (max-width: 600px) {
          .ed-info-grid { grid-template-columns: 1fr 1fr; }
          .ed-hero-title { font-size: 22px; }
        }
      `}</style>

      <div className="ed-root">

        {/* BACK BUTTON */}
        <div className="ed-back" onClick={() => navigate('/events')}>
          ← Back to Events
        </div>

        {/* HERO */}
        <div className="ed-hero">
          <div className="ed-hero-banner">
            <div className="ed-hero-banner-bg" />
            <div className="ed-hero-banner-pattern" />
            <span className="ed-hero-emoji">🎉</span>
          </div>

          <div className="ed-hero-body">
            <div className="ed-hero-left">
              <div className="ed-hero-tags">
                <div className="ed-tag" style={{ color: s.color, background: s.bg, border: `1px solid ${s.border}` }}>
                  {event.status}
                </div>
                {event.date && (
                  <div className="ed-tag" style={{ color: 'rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    📅 {formatDate(event.date)}
                  </div>
                )}
              </div>
              <div className="ed-hero-title">{event.name}</div>
              {event.description && (
                <div className="ed-hero-desc">{event.description}</div>
              )}
            </div>

            {event.budget && (
              <div className="ed-hero-right">
                <div className="ed-hero-budget">
                  <span className="ed-budget-label">Total Budget</span>
                  <div className="ed-budget-value">
                    ₹{parseFloat(event.budget).toLocaleString('en-IN')}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* INFO GRID */}
          <div className="ed-info-grid">
            {[
              { icon: '📅', label: 'Date', value: event.date ? formatDate(event.date) : 'TBD', bg: 'rgba(99,102,241,0.1)' },
              { icon: '📍', label: 'Venue', value: event.venue || 'TBD', bg: 'rgba(6,182,212,0.1)' },
              { icon: '👥', label: 'Capacity', value: event.capacity ? `${event.capacity} seats` : 'Unlimited', bg: 'rgba(34,197,94,0.1)' },
              { icon: '🎫', label: 'Registered', value: `${registrations.length} students`, bg: 'rgba(245,158,11,0.1)' },
            ].map(item => (
              <div key={item.label} className="ed-info-item">
                <div className="ed-info-icon" style={{ background: item.bg }}>{item.icon}</div>
                <div>
                  <span className="ed-info-label">{item.label}</span>
                  <div className="ed-info-value">{item.value}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* TABS */}
        <div className="ed-tabs">
          {[
            { id: 'details', label: '📋 Details' },
            ...(isCommittee ? [{ id: 'registrations', label: `🎫 Registrations (${registrations.length})` }] : []),
          ].map(tab => (
            <button
              key={tab.id}
              className={`ed-tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* CONTENT */}
        {activeTab === 'details' && (
          <div className="ed-grid">

            {/* LEFT - EVENT INFO */}
            <div>
              <div className="ed-section">
                <div className="ed-section-header">
                  <div>
                    <div className="ed-section-title">Event Information</div>
                    <div className="ed-section-sub">Full details about this event</div>
                  </div>
                </div>
                <div style={{ padding: '24px' }}>
                  {[
                    { label: 'Event Name', value: event.name, icon: '🎉' },
                    { label: 'Date', value: event.date ? formatDate(event.date) : 'TBD', icon: '📅' },
                    { label: 'Venue', value: event.venue || 'TBD', icon: '📍' },
                    { label: 'Capacity', value: event.capacity ? `${event.capacity} seats` : 'Unlimited', icon: '👥' },
                    { label: 'Budget', value: event.budget ? `₹${parseFloat(event.budget).toLocaleString('en-IN')}` : 'N/A', icon: '💰' },
                    { label: 'Status', value: event.status, icon: '⚡' },
                  ].map(item => (
                    <div key={item.label} style={{
                      display: 'flex', alignItems: 'center', gap: '16px',
                      padding: '14px 0',
                      borderBottom: '1px solid rgba(255,255,255,0.04)'
                    }}>
                      <div style={{
                        width: '36px', height: '36px', borderRadius: '10px',
                        background: 'rgba(255,255,255,0.04)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '16px', flexShrink: 0
                      }}>
                        {item.icon}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: '500', marginBottom: '3px' }}>
                          {item.label}
                        </div>
                        <div style={{ fontSize: '14px', fontWeight: '600', color: 'white' }}>
                          {item.value}
                        </div>
                      </div>
                    </div>
                  ))}

                  {event.description && (
                    <div style={{ marginTop: '16px' }}>
                      <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: '500', marginBottom: '10px' }}>
                        Description
                      </div>
                      <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)', lineHeight: '1.7' }}>
                        {event.description}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* RIGHT - REGISTRATION */}
            <div>
              {/* REGISTRATION CARD */}
              {user?.role === 'student' && (
                <div className="ed-reg-card">
                  <div className="ed-reg-status">
                    <div className="ed-reg-icon" style={{
                      background: myRegistration ? 'rgba(34,197,94,0.1)' : 'rgba(99,102,241,0.1)',
                      border: `1px solid ${myRegistration ? 'rgba(34,197,94,0.2)' : 'rgba(99,102,241,0.2)'}`
                    }}>
                      {myRegistration ? '✅' : '🎫'}
                    </div>
                    <div>
                      <div className="ed-reg-title">
                        {myRegistration ? 'You\'re registered!' : 'Register for this event'}
                      </div>
                      <div className="ed-reg-sub">
                        {myRegistration
                          ? `Payment: ${myRegistration.payment_status}`
                          : event.status === 'upcoming' ? 'Spots available' : 'Registration closed'
                        }
                      </div>
                    </div>
                  </div>

                  {!myRegistration && event.status === 'upcoming' && (
                    <button className="ed-register-btn" onClick={handleRegister} disabled={registering}>
                      {registering ? <><div className="ed-spinner" /> Registering...</> : '🎫 Register Now'}
                    </button>
                  )}

                  {myRegistration && (
                    <button className="ed-qr-btn" onClick={handleGenerateQR} disabled={generatingQR}>
                      {generatingQR ? <><div className="ed-spinner" style={{ borderTopColor: '#06b6d4' }} /> Generating...</> : '📱 Get QR Code'}
                    </button>
                  )}

                  {regError && <div className="ed-error">⚠️ {regError}</div>}

                  {/* QR CODE */}
                  {qrCode && (
                    <div className="ed-qr-wrap">
                      <img src={qrCode} alt="QR Code" className="ed-qr-img" />
                      <div className="ed-qr-label">Your Entry QR Code</div>
                      <div className="ed-qr-id">ID: {myRegistration?.id?.slice(0, 8)}...</div>
                    </div>
                  )}
                </div>
              )}

              {/* EVENT STATS */}
              <div className="ed-section">
                <div className="ed-section-header">
                  <div>
                    <div className="ed-section-title">Event Stats</div>
                    <div className="ed-section-sub">Live numbers</div>
                  </div>
                </div>
                <div style={{ padding: '20px 24px' }}>
                  {[
                    { label: 'Registered', value: registrations.length, icon: '🎫', color: '#6366f1' },
                    { label: 'Checked In', value: registrations.filter(r => r.checked_in).length, icon: '✅', color: '#22c55e' },
                    { label: 'Capacity', value: event.capacity || '∞', icon: '👥', color: '#06b6d4' },
                    { label: 'Available', value: event.capacity ? Math.max(0, event.capacity - registrations.length) : '∞', icon: '🎟️', color: '#f59e0b' },
                  ].map(stat => (
                    <div key={stat.label} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '12px 0',
                      borderBottom: '1px solid rgba(255,255,255,0.04)'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '16px' }}>{stat.icon}</span>
                        <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', fontWeight: '500' }}>
                          {stat.label}
                        </span>
                      </div>
                      <span style={{ fontSize: '18px', fontWeight: '800', color: stat.color, letterSpacing: '-0.5px' }}>
                        {stat.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* REGISTRATIONS TAB */}
        {activeTab === 'registrations' && isCommittee && (
          <div className="ed-section">
            <div className="ed-section-header">
              <div>
                <div className="ed-section-title">Registered Students</div>
                <div className="ed-section-sub">{registrations.length} students registered</div>
              </div>
            </div>

            {registrations.length === 0 ? (
              <div className="ed-empty">
                <span className="ed-empty-icon">🎫</span>
                No students registered yet
              </div>
            ) : (
              registrations.map((reg, i) => (
                <div key={reg.id} className="ed-reg-row">
                  <div className="ed-reg-avatar">
                    {reg.users?.name?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div className="ed-reg-name">{reg.users?.name || 'Unknown'}</div>
                    <div className="ed-reg-email">{reg.users?.email || ''}</div>
                  </div>
                  <div className="ed-reg-badge" style={{
                    color: reg.payment_status === 'paid' ? '#22c55e' : '#f59e0b',
                    background: reg.payment_status === 'paid' ? 'rgba(34,197,94,0.1)' : 'rgba(245,158,11,0.1)',
                    border: `1px solid ${reg.payment_status === 'paid' ? 'rgba(34,197,94,0.2)' : 'rgba(245,158,11,0.2)'}`
                  }}>
                    {reg.payment_status}
                  </div>
                  <div className="ed-checkin-badge" style={{
                    color: reg.checked_in ? '#22c55e' : 'rgba(255,255,255,0.3)',
                    background: reg.checked_in ? 'rgba(34,197,94,0.1)' : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${reg.checked_in ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.06)'}`
                  }}>
                    {reg.checked_in ? '✅ Checked In' : '⏳ Pending'}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </>
  );
};

export default EventDetail;