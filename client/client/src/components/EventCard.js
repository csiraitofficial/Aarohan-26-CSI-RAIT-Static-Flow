import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { registrationsAPI } from '../utils/api';

const EventCard = ({ event, onRegister, showRegister = true }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [registering, setRegistering] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [error, setError] = useState('');

  const formatDate = (d) => new Date(d).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric'
  });

  const getDaysLeft = (dateStr) => {
    const diff = new Date(dateStr) - new Date();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    if (days < 0) return 'Ended';
    if (days === 0) return 'Today!';
    if (days === 1) return 'Tomorrow';
    return `${days} days left`;
  };

  const getStatus = (status) => {
    const map = {
      upcoming: { color: '#06b6d4', bg: 'rgba(6,182,212,0.1)', border: 'rgba(6,182,212,0.2)' },
      ongoing: { color: '#22c55e', bg: 'rgba(34,197,94,0.1)', border: 'rgba(34,197,94,0.2)' },
      completed: { color: 'rgba(255,255,255,0.3)', bg: 'rgba(255,255,255,0.05)', border: 'rgba(255,255,255,0.08)' },
      cancelled: { color: '#ef4444', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.2)' },
    };
    return map[status] || map.upcoming;
  };

  const handleRegister = async (e) => {
    e.stopPropagation();
    setError('');
    setRegistering(true);
    try {
      await registrationsAPI.register({ event_id: event.id });
      setRegistered(true);
      if (onRegister) onRegister(event.id);
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed.');
    } finally {
      setRegistering(false);
    }
  };

  const s = getStatus(event.status);
  const daysLeft = getDaysLeft(event.date);
  const isUrgent = daysLeft === 'Today!' || daysLeft === 'Tomorrow';

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap');

        .ec-card {
          font-family: 'Plus Jakarta Sans', sans-serif;
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 20px;
          overflow: hidden;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
          position: relative;
          display: flex;
          flex-direction: column;
        }

        .ec-card::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 2px;
          background: linear-gradient(90deg, #6366f1, #06b6d4);
          opacity: 0;
          transition: opacity 0.3s ease;
        }

        .ec-card:hover {
          transform: translateY(-6px);
          border-color: rgba(99,102,241,0.25);
          background: rgba(255,255,255,0.04);
          box-shadow: 0 20px 60px rgba(0,0,0,0.4), 0 0 0 1px rgba(99,102,241,0.1);
        }

        .ec-card:hover::before { opacity: 1; }

        /* TOP BANNER */
        .ec-banner {
          height: 100px;
          position: relative;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 40px;
        }

        .ec-banner-bg {
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, rgba(99,102,241,0.15), rgba(6,182,212,0.1));
        }

        .ec-banner-pattern {
          position: absolute;
          inset: 0;
          background-image:
            radial-gradient(circle at 20% 50%, rgba(99,102,241,0.15) 0%, transparent 50%),
            radial-gradient(circle at 80% 50%, rgba(6,182,212,0.1) 0%, transparent 50%);
        }

        .ec-banner-emoji {
          position: relative;
          z-index: 1;
          filter: drop-shadow(0 4px 12px rgba(0,0,0,0.3));
        }

        .ec-days-badge {
          position: absolute;
          top: 12px; right: 12px;
          z-index: 2;
          font-size: 11px;
          font-weight: 700;
          padding: 4px 10px;
          border-radius: 100px;
          letter-spacing: 0.3px;
        }

        /* BODY */
        .ec-body {
          padding: 20px;
          flex: 1;
          display: flex;
          flex-direction: column;
        }

        .ec-top {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          margin-bottom: 12px;
          gap: 8px;
        }

        .ec-name {
          font-size: 16px;
          font-weight: 700;
          color: white;
          letter-spacing: -0.3px;
          line-height: 1.3;
          flex: 1;
        }

        .ec-status {
          font-size: 10px;
          font-weight: 600;
          padding: 3px 10px;
          border-radius: 100px;
          letter-spacing: 0.3px;
          flex-shrink: 0;
          text-transform: uppercase;
        }

        .ec-details {
          display: flex;
          flex-direction: column;
          gap: 7px;
          margin-bottom: 16px;
          flex: 1;
        }

        .ec-detail {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 12px;
          color: rgba(255,255,255,0.4);
        }

        .ec-detail-icon {
          width: 22px; height: 22px;
          border-radius: 6px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.06);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 10px;
          flex-shrink: 0;
        }

        /* CAPACITY BAR */
        .ec-capacity {
          margin-bottom: 16px;
        }

        .ec-capacity-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 6px;
        }

        .ec-capacity-label {
          font-size: 11px;
          color: rgba(255,255,255,0.3);
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .ec-capacity-count {
          font-size: 12px;
          font-weight: 700;
          color: rgba(255,255,255,0.5);
        }

        .ec-bar-bg {
          height: 4px;
          background: rgba(255,255,255,0.06);
          border-radius: 100px;
          overflow: hidden;
        }

        .ec-bar-fill {
          height: 100%;
          border-radius: 100px;
          transition: width 0.8s cubic-bezier(0.16, 1, 0.3, 1);
        }

        /* FOOTER */
        .ec-footer {
          display: flex;
          align-items: center;
          gap: 10px;
          padding-top: 14px;
          border-top: 1px solid rgba(255,255,255,0.05);
        }

        .ec-budget {
          font-size: 14px;
          font-weight: 700;
          color: #f59e0b;
          flex: 1;
        }

        .ec-register-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 9px 18px;
          background: linear-gradient(135deg, #6366f1, #4f46e5);
          border: none;
          border-radius: 10px;
          color: white;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          font-family: 'Plus Jakarta Sans', sans-serif;
          transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
          box-shadow: 0 4px 14px rgba(99,102,241,0.3);
          white-space: nowrap;
        }

        .ec-register-btn:hover:not(:disabled) {
          transform: translateY(-2px) scale(1.03);
          box-shadow: 0 8px 20px rgba(99,102,241,0.5);
        }

        .ec-register-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
        }

        .ec-register-btn.registered {
          background: linear-gradient(135deg, #16a34a, #15803d);
          box-shadow: 0 4px 14px rgba(22,163,74,0.3);
        }

        .ec-view-btn {
          padding: 9px 14px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 10px;
          color: rgba(255,255,255,0.5);
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          font-family: 'Plus Jakarta Sans', sans-serif;
          transition: all 0.2s ease;
        }

        .ec-view-btn:hover {
          background: rgba(255,255,255,0.07);
          color: white;
          border-color: rgba(255,255,255,0.12);
        }

        .ec-error {
          font-size: 11px;
          color: #f87171;
          margin-top: 8px;
          text-align: center;
        }

        .ec-spinner {
          width: 14px; height: 14px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: ecSpin 0.7s linear infinite;
        }

        @keyframes ecSpin { to { transform: rotate(360deg); } }
      `}</style>

      <div className="ec-card" onClick={() => navigate(`/events/${event.id}`)}>

        {/* BANNER */}
        <div className="ec-banner">
          <div className="ec-banner-bg" />
          <div className="ec-banner-pattern" />
          <span className="ec-banner-emoji">🎉</span>

          {event.date && (
            <div
              className="ec-days-badge"
              style={{
                background: isUrgent ? 'rgba(239,68,68,0.9)' : 'rgba(0,0,0,0.5)',
                color: isUrgent ? 'white' : 'rgba(255,255,255,0.7)',
                backdropFilter: 'blur(8px)',
                border: isUrgent ? '1px solid rgba(239,68,68,0.5)' : '1px solid rgba(255,255,255,0.1)',
              }}
            >
              {isUrgent ? `🔥 ${daysLeft}` : `📅 ${daysLeft}`}
            </div>
          )}
        </div>

        {/* BODY */}
        <div className="ec-body">
          <div className="ec-top">
            <div className="ec-name">{event.name}</div>
            <div
              className="ec-status"
              style={{ color: s.color, background: s.bg, border: `1px solid ${s.border}` }}
            >
              {event.status}
            </div>
          </div>

          <div className="ec-details">
            {event.date && (
              <div className="ec-detail">
                <div className="ec-detail-icon">📅</div>
                {formatDate(event.date)}
              </div>
            )}
            {event.venue && (
              <div className="ec-detail">
                <div className="ec-detail-icon">📍</div>
                {event.venue}
              </div>
            )}
            {event.capacity && (
              <div className="ec-detail">
                <div className="ec-detail-icon">👥</div>
                {event.capacity} seats available
              </div>
            )}
            {event.budget && (
              <div className="ec-detail">
                <div className="ec-detail-icon">💰</div>
                ₹{parseFloat(event.budget).toLocaleString('en-IN')} budget
              </div>
            )}
          </div>

          {/* CAPACITY BAR */}
          {event.capacity && (
            <div className="ec-capacity">
              <div className="ec-capacity-top">
                <span className="ec-capacity-label">Capacity</span>
                <span className="ec-capacity-count">{event.capacity} seats</span>
              </div>
              <div className="ec-bar-bg">
                <div
                  className="ec-bar-fill"
                  style={{
                    width: '35%',
                    background: 'linear-gradient(90deg, #6366f1, #06b6d4)',
                  }}
                />
              </div>
            </div>
          )}

          {/* FOOTER */}
          <div className="ec-footer">
            {event.budget && (
              <div className="ec-budget">
                ₹{parseFloat(event.budget).toLocaleString('en-IN')}
              </div>
            )}

            <button
              className="ec-view-btn"
              onClick={e => { e.stopPropagation(); navigate(`/events/${event.id}`); }}
            >
              Details
            </button>

            {showRegister && user?.role === 'student' && event.status === 'upcoming' && (
              <button
                className={`ec-register-btn ${registered ? 'registered' : ''}`}
                onClick={handleRegister}
                disabled={registering || registered}
              >
                {registering ? (
                  <><div className="ec-spinner" /> Registering...</>
                ) : registered ? (
                  '✅ Registered!'
                ) : (
                  '🎫 Register'
                )}
              </button>
            )}
          </div>

          {error && <div className="ec-error">⚠️ {error}</div>}
        </div>
      </div>
    </>
  );
};

export default EventCard;