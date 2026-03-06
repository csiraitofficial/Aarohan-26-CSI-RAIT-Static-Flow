import React, { useState, useEffect, useRef } from 'react';
import { emergencyAPI } from '../utils/api';

const EVACUATION_ROUTES = [
  {
    zone: '🎭 Auditorium',
    route: 'Exit via Side Doors → Cross Main Corridor → Assembly Point A (North Lawn)',
    steps: ['Use side emergency exits', 'Do NOT use main stage entrance', 'Follow green floor markings', 'Assembly Point A — North Lawn'],
    time: '2 min',
    color: '#6366f1',
  },
  {
    zone: '🍽️ Cafeteria',
    route: 'Exit via Kitchen Side Door → Service Road → Assembly Point B (Parking Lot)',
    steps: ['Exit through kitchen side door', 'Avoid main cafeteria entrance', 'Follow orange markings', 'Assembly Point B — Parking Lot'],
    time: '1.5 min',
    color: '#f59e0b',
  },
  {
    zone: '🎤 Stage',
    route: 'Exit Stage Left/Right → Behind Backstage → Assembly Point C (Sports Ground)',
    steps: ['Exit stage left or right', 'Move behind backstage area', 'Follow yellow markings', 'Assembly Point C — Sports Ground'],
    time: '1 min',
    color: '#22c55e',
  },
  {
    zone: '🚪 Entrance',
    route: 'Reverse through Main Gate → Spread out on Road → Assembly Point D (Road)',
    steps: ['Reverse through main gate', 'Do NOT block emergency vehicles', 'Move 50m away from gate', 'Assembly Point D — Main Road'],
    time: '30 sec',
    color: '#06b6d4',
  },
];

const COUNTDOWN_OPTIONS = [30, 60, 90];

const PanicButton = () => {
  const [phase, setPhase] = useState('idle'); // idle | confirm | active | resolved
  const [countdown, setCountdown] = useState(60);
  const [selectedCountdown, setSelectedCountdown] = useState(60);
  const [elapsed, setElapsed] = useState(0);
  const [alertId, setAlertId] = useState(null);
  const [activeZone, setActiveZone] = useState(null);
  const [resolving, setResolving] = useState(false);
  const [flashRed, setFlashRed] = useState(false);
  const timerRef = useRef(null);
  const elapsedRef = useRef(null);
  const audioRef = useRef(null);

  useEffect(() => {
    return () => {
      clearInterval(timerRef.current);
      clearInterval(elapsedRef.current);
    };
  }, []);

  const handlePanicClick = () => {
    setPhase('confirm');
  };

  const handleConfirm = async () => {
    setPhase('active');
    setCountdown(selectedCountdown);
    setElapsed(0);
    setFlashRed(true);

    // Flash effect
    setTimeout(() => setFlashRed(false), 500);

    // Start countdown
    timerRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Start elapsed timer
    elapsedRef.current = setInterval(() => {
      setElapsed(prev => prev + 1);
    }, 1000);

    // Trigger panic on backend
    try {
      const res = await emergencyAPI.triggerPanic({
        type: 'panic',
        severity: 'critical',
        message: 'PANIC BUTTON ACTIVATED — Emergency evacuation required',
        location: 'All Zones',
      });
      setAlertId(res.data?.alert?.id);
    } catch (err) {
      console.error('Failed to trigger panic:', err);
    }
  };

  const handleAllClear = async () => {
    setResolving(true);
    try {
      if (alertId) {
        await emergencyAPI.resolvePanic({ alert_id: alertId });
      } else {
        await emergencyAPI.resolvePanic({ resolve_all: true });
      }
    } catch (err) {
      console.error('Failed to resolve panic:', err);
    }
    clearInterval(timerRef.current);
    clearInterval(elapsedRef.current);
    setPhase('resolved');
    setResolving(false);
    setTimeout(() => setPhase('idle'), 4000);
  };

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return m > 0 ? `${m}:${s.toString().padStart(2, '0')}` : `${s}s`;
  };

  const countdownPercent = (countdown / selectedCountdown) * 100;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');

        /* FLASH OVERLAY */
        .pb-flash {
          position: fixed;
          inset: 0;
          background: #ef4444;
          z-index: 99999;
          pointer-events: none;
          animation: pbFlash 0.5s ease-out forwards;
        }

        @keyframes pbFlash {
          0% { opacity: 0.8; }
          100% { opacity: 0; }
        }

        /* PANIC BUTTON */
        .pb-btn {
          position: fixed;
          bottom: 32px;
          right: 32px;
          z-index: 1000;
          width: 80px;
          height: 80px;
          border-radius: 50%;
          border: none;
          cursor: pointer;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 2px;
          font-family: 'Plus Jakarta Sans', sans-serif;
          transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
          background: transparent;
          padding: 0;
        }

        .pb-btn:hover .pb-btn-inner {
          transform: scale(1.08);
        }

        .pb-btn:active .pb-btn-inner {
          transform: scale(0.95);
        }

        .pb-btn-inner {
          width: 100%;
          height: 100%;
          border-radius: 50%;
          background: linear-gradient(135deg, #dc2626, #b91c1c);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 2px;
          box-shadow:
            0 0 0 4px rgba(220,38,38,0.2),
            0 0 0 8px rgba(220,38,38,0.1),
            0 8px 32px rgba(220,38,38,0.5);
          transition: all 0.3s ease;
          position: relative;
        }

        .pb-btn-inner::before {
          content: '';
          position: absolute;
          inset: 4px;
          border-radius: 50%;
          background: linear-gradient(135deg, rgba(255,255,255,0.15), transparent);
          pointer-events: none;
        }

        /* RINGS */
        .pb-ring {
          position: fixed;
          bottom: 32px;
          right: 32px;
          width: 80px;
          height: 80px;
          border-radius: 50%;
          border: 2px solid rgba(220,38,38,0.4);
          z-index: 999;
          pointer-events: none;
          animation: pbRing 2s ease-out infinite;
        }

        .pb-ring:nth-child(2) { animation-delay: 0.5s; }
        .pb-ring:nth-child(3) { animation-delay: 1s; }

        @keyframes pbRing {
          0% { transform: scale(1); opacity: 0.6; }
          100% { transform: scale(2.2); opacity: 0; }
        }

        .pb-btn-icon { font-size: 24px; line-height: 1; position: relative; z-index: 1; }
        .pb-btn-label {
          font-size: 9px;
          font-weight: 900;
          color: white;
          letter-spacing: 1.5px;
          text-transform: uppercase;
          position: relative; z-index: 1;
        }

        /* CONFIRM MODAL */
        .pb-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.85);
          backdrop-filter: blur(12px);
          z-index: 9000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          font-family: 'Plus Jakarta Sans', sans-serif;
          animation: pbFadeIn 0.2s ease;
        }

        @keyframes pbFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .pb-confirm-modal {
          background: #0a0b14;
          border: 1px solid rgba(220,38,38,0.3);
          border-radius: 28px;
          padding: 48px 40px;
          max-width: 480px;
          width: 100%;
          text-align: center;
          box-shadow: 0 32px 80px rgba(220,38,38,0.2), 0 0 0 1px rgba(220,38,38,0.1);
          animation: pbSlideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes pbSlideUp {
          from { opacity: 0; transform: translateY(32px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }

        .pb-confirm-icon {
          width: 100px; height: 100px;
          background: linear-gradient(135deg, rgba(220,38,38,0.2), rgba(185,28,28,0.1));
          border: 2px solid rgba(220,38,38,0.4);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 44px;
          margin: 0 auto 24px;
          animation: pbShake 0.5s ease-in-out infinite;
          box-shadow: 0 0 40px rgba(220,38,38,0.2);
        }

        @keyframes pbShake {
          0%, 100% { transform: rotate(-8deg); }
          50% { transform: rotate(8deg); }
        }

        .pb-confirm-title {
          font-size: 28px;
          font-weight: 900;
          color: white;
          letter-spacing: -1px;
          margin-bottom: 10px;
        }

        .pb-confirm-sub {
          font-size: 15px;
          color: rgba(255,255,255,0.4);
          line-height: 1.6;
          margin-bottom: 28px;
        }

        /* COUNTDOWN SELECTOR */
        .pb-countdown-label {
          font-size: 11px;
          font-weight: 600;
          color: rgba(255,255,255,0.3);
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-bottom: 12px;
        }

        .pb-countdown-opts {
          display: flex;
          gap: 10px;
          justify-content: center;
          margin-bottom: 28px;
        }

        .pb-countdown-opt {
          flex: 1;
          padding: 12px;
          border-radius: 14px;
          border: 1.5px solid rgba(255,255,255,0.08);
          background: rgba(255,255,255,0.03);
          color: rgba(255,255,255,0.4);
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          font-family: 'Plus Jakarta Sans', sans-serif;
          transition: all 0.2s ease;
        }

        .pb-countdown-opt:hover {
          border-color: rgba(220,38,38,0.3);
          color: white;
        }

        .pb-countdown-opt.selected {
          background: rgba(220,38,38,0.1);
          border-color: rgba(220,38,38,0.5);
          color: #fca5a5;
          box-shadow: 0 0 16px rgba(220,38,38,0.15);
        }

        .pb-countdown-opt-label {
          font-size: 18px;
          font-weight: 900;
          display: block;
          margin-bottom: 2px;
        }

        .pb-countdown-opt-sub {
          font-size: 10px;
          opacity: 0.6;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .pb-confirm-btns {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        .pb-cancel-btn {
          padding: 16px;
          border-radius: 16px;
          background: rgba(255,255,255,0.04);
          border: 1.5px solid rgba(255,255,255,0.08);
          color: rgba(255,255,255,0.5);
          font-size: 15px;
          font-weight: 700;
          cursor: pointer;
          font-family: 'Plus Jakarta Sans', sans-serif;
          transition: all 0.2s ease;
        }

        .pb-cancel-btn:hover {
          background: rgba(255,255,255,0.07);
          color: white;
        }

        .pb-confirm-btn {
          padding: 16px;
          border-radius: 16px;
          background: linear-gradient(135deg, #dc2626, #b91c1c);
          border: none;
          color: white;
          font-size: 15px;
          font-weight: 900;
          cursor: pointer;
          font-family: 'Plus Jakarta Sans', sans-serif;
          transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
          box-shadow: 0 8px 24px rgba(220,38,38,0.4);
          letter-spacing: 0.3px;
        }

        .pb-confirm-btn:hover {
          transform: translateY(-3px) scale(1.02);
          box-shadow: 0 12px 32px rgba(220,38,38,0.6);
        }

        /* ACTIVE PANIC OVERLAY */
        .pb-active-overlay {
          position: fixed;
          inset: 0;
          z-index: 8000;
          font-family: 'Plus Jakarta Sans', sans-serif;
          overflow-y: auto;
          animation: pbFadeIn 0.3s ease;
        }

        .pb-active-bg {
          position: fixed;
          inset: 0;
          background: #0a0008;
          z-index: -1;
        }

        .pb-active-bg::before {
          content: '';
          position: fixed;
          inset: 0;
          background: radial-gradient(ellipse at center, rgba(220,38,38,0.15) 0%, transparent 70%);
          animation: pbBreath 2s ease-in-out infinite;
        }

        @keyframes pbBreath {
          0%, 100% { opacity: 0.5; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.05); }
        }

        /* SCAN LINES */
        .pb-scanlines {
          position: fixed;
          inset: 0;
          background: repeating-linear-gradient(
            0deg,
            transparent,
            transparent 2px,
            rgba(220,38,38,0.03) 2px,
            rgba(220,38,38,0.03) 4px
          );
          pointer-events: none;
          z-index: 1;
        }

        .pb-active-content {
          position: relative;
          z-index: 2;
          padding: 32px;
          max-width: 900px;
          margin: 0 auto;
        }

        /* TOP BAR */
        .pb-top-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 32px;
          flex-wrap: wrap;
          gap: 16px;
        }

        .pb-emergency-badge {
          display: flex;
          align-items: center;
          gap: 12px;
          background: rgba(220,38,38,0.1);
          border: 1px solid rgba(220,38,38,0.3);
          border-radius: 100px;
          padding: 10px 20px;
          animation: pbBadgePulse 1s ease-in-out infinite;
        }

        @keyframes pbBadgePulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(220,38,38,0.4); }
          50% { box-shadow: 0 0 0 8px rgba(220,38,38,0); }
        }

        .pb-badge-dot {
          width: 10px; height: 10px;
          background: #ef4444;
          border-radius: 50%;
          box-shadow: 0 0 12px #ef4444;
          animation: pbDotBlink 0.8s ease-in-out infinite;
        }

        @keyframes pbDotBlink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }

        .pb-badge-text {
          font-size: 13px;
          font-weight: 800;
          color: #fca5a5;
          letter-spacing: 2px;
          text-transform: uppercase;
        }

        .pb-elapsed {
          font-size: 13px;
          color: rgba(255,255,255,0.3);
          font-weight: 500;
        }

        /* MAIN COUNTDOWN */
        .pb-countdown-section {
          text-align: center;
          margin-bottom: 40px;
        }

        .pb-countdown-title {
          font-size: 14px;
          font-weight: 700;
          color: rgba(255,255,255,0.3);
          text-transform: uppercase;
          letter-spacing: 3px;
          margin-bottom: 16px;
        }

        .pb-countdown-ring {
          position: relative;
          width: 200px;
          height: 200px;
          margin: 0 auto 24px;
        }

        .pb-ring-svg {
          width: 100%;
          height: 100%;
          transform: rotate(-90deg);
        }

        .pb-ring-bg {
          fill: none;
          stroke: rgba(220,38,38,0.1);
          stroke-width: 8;
        }

        .pb-ring-progress {
          fill: none;
          stroke: #ef4444;
          stroke-width: 8;
          stroke-linecap: round;
          filter: drop-shadow(0 0 8px rgba(239,68,68,0.8));
          transition: stroke-dashoffset 1s linear;
        }

        .pb-countdown-number {
          position: absolute;
          top: 50%; left: 50%;
          transform: translate(-50%, -50%);
          text-align: center;
        }

        .pb-countdown-val {
          font-size: 52px;
          font-weight: 900;
          color: #ef4444;
          letter-spacing: -3px;
          display: block;
          line-height: 1;
          text-shadow: 0 0 30px rgba(239,68,68,0.5);
          font-variant-numeric: tabular-nums;
        }

        .pb-countdown-unit {
          font-size: 12px;
          color: rgba(255,255,255,0.3);
          text-transform: uppercase;
          letter-spacing: 2px;
          font-weight: 600;
        }

        .pb-countdown-msg {
          font-size: 16px;
          color: rgba(255,255,255,0.5);
          font-weight: 500;
        }

        .pb-countdown-msg.urgent {
          color: #fca5a5;
          animation: pbUrgent 0.5s ease-in-out infinite;
        }

        @keyframes pbUrgent {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        /* EVACUATION ROUTES */
        .pb-routes-title {
          font-size: 18px;
          font-weight: 800;
          color: white;
          letter-spacing: -0.5px;
          margin-bottom: 16px;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .pb-routes-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 14px;
          margin-bottom: 32px;
        }

        .pb-route-card {
          background: rgba(255,255,255,0.03);
          border-radius: 18px;
          padding: 20px;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
          position: relative;
          overflow: hidden;
        }

        .pb-route-card::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 2px;
          transition: opacity 0.3s ease;
          opacity: 0;
        }

        .pb-route-card:hover {
          transform: translateY(-4px);
        }

        .pb-route-card:hover::before { opacity: 1; }

        .pb-route-card.active-zone {
          transform: translateY(-4px) scale(1.02);
        }

        .pb-route-card.active-zone::before { opacity: 1; }

        .pb-route-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 12px;
        }

        .pb-route-zone {
          font-size: 15px;
          font-weight: 800;
          color: white;
          letter-spacing: -0.3px;
        }

        .pb-route-time {
          font-size: 11px;
          font-weight: 700;
          padding: 3px 10px;
          border-radius: 100px;
        }

        .pb-route-steps {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .pb-route-step {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          font-size: 12px;
          color: rgba(255,255,255,0.5);
          line-height: 1.4;
        }

        .pb-step-num {
          width: 18px; height: 18px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 10px;
          font-weight: 800;
          flex-shrink: 0;
          margin-top: 1px;
        }

        /* ALL CLEAR BUTTON */
        .pb-allclear-wrap {
          text-align: center;
          padding-bottom: 32px;
        }

        .pb-allclear-btn {
          display: inline-flex;
          align-items: center;
          gap: 12px;
          padding: 20px 48px;
          background: linear-gradient(135deg, #16a34a, #15803d);
          border: none;
          border-radius: 20px;
          color: white;
          font-size: 18px;
          font-weight: 900;
          cursor: pointer;
          font-family: 'Plus Jakarta Sans', sans-serif;
          transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
          box-shadow: 0 8px 32px rgba(22,163,74,0.4), inset 0 1px 0 rgba(255,255,255,0.15);
          letter-spacing: 0.5px;
        }

        .pb-allclear-btn:hover:not(:disabled) {
          transform: translateY(-4px) scale(1.02);
          box-shadow: 0 16px 48px rgba(22,163,74,0.6);
        }

        .pb-allclear-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .pb-allclear-sub {
          font-size: 13px;
          color: rgba(255,255,255,0.25);
          margin-top: 12px;
        }

        /* RESOLVED */
        .pb-resolved {
          position: fixed;
          inset: 0;
          background: #060f09;
          z-index: 9000;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'Plus Jakarta Sans', sans-serif;
          animation: pbFadeIn 0.3s ease;
        }

        .pb-resolved-content {
          text-align: center;
          animation: pbSlideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .pb-resolved-icon {
          font-size: 80px;
          display: block;
          margin-bottom: 24px;
          animation: pbBounce 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        @keyframes pbBounce {
          from { transform: scale(0); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }

        .pb-resolved-title {
          font-size: 48px;
          font-weight: 900;
          color: #22c55e;
          letter-spacing: -2px;
          margin-bottom: 12px;
          text-shadow: 0 0 40px rgba(34,197,94,0.4);
        }

        .pb-resolved-sub {
          font-size: 16px;
          color: rgba(255,255,255,0.4);
        }

        @media (max-width: 600px) {
          .pb-routes-grid { grid-template-columns: 1fr; }
          .pb-confirm-btns { grid-template-columns: 1fr; }
          .pb-active-content { padding: 20px 16px; }
          .pb-countdown-val { font-size: 40px; }
          .pb-countdown-ring { width: 160px; height: 160px; }
          .pb-allclear-btn { padding: 16px 32px; font-size: 16px; }
          .pb-btn { width: 68px; height: 68px; bottom: 20px; right: 20px; }
          .pb-ring { width: 68px; height: 68px; bottom: 20px; right: 20px; }
        }
      `}</style>

      {/* FLASH */}
      {flashRed && <div className="pb-flash" />}

      {/* IDLE — PANIC BUTTON */}
      {phase === 'idle' && (
        <>
          <div className="pb-ring" />
          <div className="pb-ring" />
          <div className="pb-ring" />
          <button className="pb-btn" onClick={handlePanicClick}>
            <div className="pb-btn-inner">
              <span className="pb-btn-icon">🚨</span>
              <span className="pb-btn-label">PANIC</span>
            </div>
          </button>
        </>
      )}

      {/* CONFIRM MODAL */}
      {phase === 'confirm' && (
        <div className="pb-overlay">
          <div className="pb-confirm-modal">
            <div className="pb-confirm-icon">🚨</div>
            <div className="pb-confirm-title">ACTIVATE EMERGENCY?</div>
            <div className="pb-confirm-sub">
              This will trigger campus-wide alerts, notify all staff, activate evacuation protocols, and start emergency countdown.
            </div>

            <div className="pb-countdown-label">Select Evacuation Timer</div>
            <div className="pb-countdown-opts">
              {COUNTDOWN_OPTIONS.map(opt => (
                <button
                  key={opt}
                  className={`pb-countdown-opt ${selectedCountdown === opt ? 'selected' : ''}`}
                  onClick={() => setSelectedCountdown(opt)}
                >
                  <span className="pb-countdown-opt-label">{opt}s</span>
                  <span className="pb-countdown-opt-sub">
                    {opt === 30 ? 'Quick' : opt === 60 ? 'Standard' : 'Extended'}
                  </span>
                </button>
              ))}
            </div>

            <div className="pb-confirm-btns">
              <button className="pb-cancel-btn" onClick={() => setPhase('idle')}>
                Cancel
              </button>
              <button className="pb-confirm-btn" onClick={handleConfirm}>
                🚨 ACTIVATE!
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ACTIVE EMERGENCY */}
      {phase === 'active' && (
        <div className="pb-active-overlay">
          <div className="pb-active-bg" />
          <div className="pb-scanlines" />
          <div className="pb-active-content">

            {/* TOP BAR */}
            <div className="pb-top-bar">
              <div className="pb-emergency-badge">
                <div className="pb-badge-dot" />
                <span className="pb-badge-text">⚡ Emergency Active</span>
              </div>
              <div className="pb-elapsed">
                ⏱ Active for {formatTime(elapsed)}
              </div>
            </div>

            {/* COUNTDOWN */}
            <div className="pb-countdown-section">
              <div className="pb-countdown-title">Evacuation Countdown</div>
              <div className="pb-countdown-ring">
                <svg className="pb-ring-svg" viewBox="0 0 200 200">
                  <circle className="pb-ring-bg" cx="100" cy="100" r="88" />
                  <circle
                    className="pb-ring-progress"
                    cx="100" cy="100" r="88"
                    strokeDasharray={`${2 * Math.PI * 88}`}
                    strokeDashoffset={`${2 * Math.PI * 88 * (1 - countdownPercent / 100)}`}
                  />
                </svg>
                <div className="pb-countdown-number">
                  <span className="pb-countdown-val">{formatTime(countdown)}</span>
                  <span className="pb-countdown-unit">remaining</span>
                </div>
              </div>
              <div className={`pb-countdown-msg ${countdown <= 10 ? 'urgent' : ''}`}>
                {countdown <= 0
                  ? '🚨 EVACUATE NOW — Move to Assembly Points!'
                  : countdown <= 10
                  ? '⚠️ Final warning — Begin evacuation immediately!'
                  : '📢 Alert active — Please proceed to nearest exit'
                }
              </div>
            </div>

            {/* EVACUATION ROUTES */}
            <div className="pb-routes-title">
              🗺️ Evacuation Routes
            </div>
            <div className="pb-routes-grid">
              {EVACUATION_ROUTES.map(route => (
                <div
                  key={route.zone}
                  className={`pb-route-card ${activeZone === route.zone ? 'active-zone' : ''}`}
                  style={{
                    border: `1px solid ${activeZone === route.zone ? route.color + '50' : 'rgba(255,255,255,0.06)'}`,
                    background: activeZone === route.zone ? `${route.color}12` : 'rgba(255,255,255,0.03)',
                    boxShadow: activeZone === route.zone ? `0 8px 32px ${route.color}20` : 'none',
                  }}
                  onClick={() => setActiveZone(activeZone === route.zone ? null : route.zone)}
                >
                  <style>{`.pb-route-card[data-zone="${route.zone}"]::before { background: linear-gradient(90deg, ${route.color}, transparent); }`}</style>
                  <div className="pb-route-top">
                    <div className="pb-route-zone">{route.zone}</div>
                    <div className="pb-route-time" style={{
                      color: route.color,
                      background: `${route.color}20`,
                      border: `1px solid ${route.color}40`,
                    }}>
                      🕐 {route.time}
                    </div>
                  </div>
                  <div className="pb-route-steps">
                    {route.steps.map((step, i) => (
                      <div key={i} className="pb-route-step">
                        <div className="pb-step-num" style={{
                          background: `${route.color}25`,
                          color: route.color,
                        }}>
                          {i + 1}
                        </div>
                        {step}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* ALL CLEAR */}
            <div className="pb-allclear-wrap">
              <button
                className="pb-allclear-btn"
                onClick={handleAllClear}
                disabled={resolving}
              >
                {resolving ? '⏳ Resolving...' : '✅ ALL CLEAR — Emergency Resolved'}
              </button>
              <div className="pb-allclear-sub">
                Only press when situation is fully under control
              </div>
            </div>
          </div>
        </div>
      )}

      {/* RESOLVED */}
      {phase === 'resolved' && (
        <div className="pb-resolved">
          <div className="pb-resolved-content">
            <span className="pb-resolved-icon">✅</span>
            <div className="pb-resolved-title">ALL CLEAR</div>
            <div className="pb-resolved-sub">Emergency has been resolved. Returning to normal...</div>
          </div>
        </div>
      )}
    </>
  );
};

export default PanicButton;