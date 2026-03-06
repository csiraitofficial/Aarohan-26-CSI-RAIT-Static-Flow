import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { emergencyAPI } from '../utils/api';
import { createClient } from '@supabase/supabase-js';

// ─── Supabase ────────────────────────────────────────────────────────────────
const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.REACT_APP_SUPABASE_ANON_KEY
);

// ─── SQL: run once in Supabase SQL editor ────────────────────────────────────
/*
  create table if not exists notifications (
    id          uuid primary key default gen_random_uuid(),
    user_id     uuid,                       -- null = shown to ALL users
    type        text not null,              -- 'emergency' | 'all_clear'
    title       text not null,
    message     text,
    read        boolean default false,
    created_at  timestamptz default now()
  );
  -- Enable Realtime on the notifications table:
  -- Supabase Dashboard → Database → Replication → toggle "notifications"
*/

// ─── Supabase broadcast helpers ──────────────────────────────────────────────

// Inserts a global notification row (user_id = null means everyone sees it)
// AND sends a realtime broadcast so users online get it instantly.
const broadcastPanic = async ({ triggeredBy }) => {
  try {
    await supabase.from('notifications').insert([{
      user_id: null,
      type:    'emergency',
      title:   '🚨 CAMPUS EMERGENCY ALERT',
      message: 'A panic button has been activated. Follow evacuation procedures immediately.',
      read:    false,
    }]);
  } catch (e) { console.error('notifications insert error:', e); }

  try {
    await supabase.channel('campusflow-emergency').send({
      type:    'broadcast',
      event:   'panic',
      payload: { triggeredBy, timestamp: Date.now() },
    });
  } catch (e) { console.error('broadcast panic error:', e); }
};

const broadcastAllClear = async () => {
  try {
    await supabase.from('notifications').insert([{
      user_id: null,
      type:    'all_clear',
      title:   '✅ ALL CLEAR',
      message: 'The campus emergency has been resolved. You may return to normal activities.',
      read:    false,
    }]);
  } catch (e) { console.error('notifications insert error:', e); }

  try {
    await supabase.channel('campusflow-emergency').send({
      type:    'broadcast',
      event:   'all_clear',
      payload: { timestamp: Date.now() },
    });
  } catch (e) { console.error('broadcast all_clear error:', e); }
};

// ─── Siren ───────────────────────────────────────────────────────────────────
let sirenInterval = null;
let audioCtx = null;

const startSiren = () => {
  try {
    stopSiren();
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const ctx = audioCtx;
    let up = true;
    sirenInterval = setInterval(() => {
      if (!ctx || ctx.state === 'closed') return;
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(up ? 440 : 880, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(up ? 880 : 440, ctx.currentTime + 0.5);
      gain.gain.setValueAtTime(0.35, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.5);
      osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.5);
      up = !up;
    }, 500);
  } catch (e) { console.error('Audio error:', e); }
};

const stopSiren = () => {
  if (sirenInterval) { clearInterval(sirenInterval); sirenInterval = null; }
  if (audioCtx)      { audioCtx.close(); audioCtx = null; }
};

// ─── Static data ─────────────────────────────────────────────────────────────
const EVACUATION_ROUTES = [
  { zone:'🎭 Auditorium', steps:['Use side emergency exits','Do NOT use main stage entrance','Follow green floor markings','Assembly Point A — North Lawn'], time:'2 min', color:'#6366f1' },
  { zone:'🍽️ Cafeteria',  steps:['Exit through kitchen side door','Avoid main cafeteria entrance','Follow orange markings','Assembly Point B — Parking Lot'], time:'1.5 min', color:'#f59e0b' },
  { zone:'🎤 Stage',      steps:['Exit stage left or right','Move behind backstage area','Follow yellow markings','Assembly Point C — Sports Ground'], time:'1 min', color:'#22c55e' },
  { zone:'🚪 Entrance',   steps:['Reverse through main gate','Do NOT block emergency vehicles','Move 50m away from gate','Assembly Point D — Main Road'], time:'30 sec', color:'#06b6d4' },
];
const COUNTDOWN_OPTIONS = [30, 60, 90];

// ─────────────────────────────────────────────────────────────────────────────
const PanicButton = ({ currentUser }) => {
  const navigate = useNavigate();

  const [phase,             setPhase]             = useState('idle');
  const [countdown,         setCountdown]         = useState(60);
  const [selectedCountdown, setSelectedCountdown] = useState(60);
  const [elapsed,           setElapsed]           = useState(0);
  const [alertId,           setAlertId]           = useState(null);
  const [activeZone,        setActiveZone]        = useState(null);
  const [resolving,         setResolving]         = useState(false);
  const [flashRed,          setFlashRed]          = useState(false);

  const timerRef   = useRef(null);
  const elapsedRef = useRef(null);

  // ── Subscribe to incoming emergency broadcasts from other users ───────────
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    const ch = supabase
      .channel('campusflow-emergency')
      .on('broadcast', { event: 'panic' }, () => {
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('🚨 CAMPUS EMERGENCY ALERT', {
            body:               'Panic button activated — follow evacuation procedures.',
            icon:               '/favicon.ico',
            requireInteraction: true,
            tag:                'cf-emergency',
          });
        }
      })
      .on('broadcast', { event: 'all_clear' }, () => {
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('✅ All Clear — CampusFlow', {
            body: 'The emergency has been resolved.',
            icon: '/favicon.ico',
            tag:  'cf-emergency',
          });
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(ch);
      clearInterval(timerRef.current);
      clearInterval(elapsedRef.current);
      stopSiren();
    };
  }, []);

  // ── Timer expired → broadcast all-clear + redirect ────────────────────────
  const handleTimerExpired = async (id) => {
    stopSiren();
    clearInterval(elapsedRef.current);
    await broadcastAllClear();
    try { await emergencyAPI.resolvePanic({ alert_id: id, resolve_all: !id }); } catch (_) {}
    setPhase('resolved');
    // Redirect to dashboard after resolved screen shows for 3 s
    setTimeout(() => navigate('/dashboard'), 3000);
  };

  const handlePanicClick = () => setPhase('confirm');

  const handleConfirm = async () => {
    setPhase('active');
    setCountdown(selectedCountdown);
    setElapsed(0);
    setFlashRed(true);
    setTimeout(() => setFlashRed(false), 500);
    startSiren();

    // 1. Broadcast to every user in DB + realtime channel
    await broadcastPanic({ triggeredBy: currentUser?.id || null });

    // 2. Browser notification for the person who pressed it
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('🚨 EMERGENCY ALERT — CampusFlow', {
        body:               'PANIC BUTTON ACTIVATED — Emergency evacuation required',
        icon:               '/favicon.ico',
        requireInteraction: true,
        tag:                'cf-emergency',
      });
    }

    // 3. Persist via your existing API
    let newId = null;
    try {
      const res = await emergencyAPI.triggerPanic({
        type: 'panic', severity: 'critical',
        message: 'PANIC BUTTON ACTIVATED — Emergency evacuation required',
        location: 'All Zones',
      });
      newId = res.data?.alert?.id || null;
      setAlertId(newId);
    } catch (err) { console.error('Failed to trigger panic API:', err); }

    const capturedId = newId; // capture for closure

    // 4. Countdown → calls handleTimerExpired at 0
    timerRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          handleTimerExpired(capturedId);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    elapsedRef.current = setInterval(() => setElapsed(p => p + 1), 1000);
  };

  // ── Manual all-clear ──────────────────────────────────────────────────────
  const handleAllClear = async () => {
    setResolving(true);
    clearInterval(timerRef.current);
    clearInterval(elapsedRef.current);
    stopSiren();
    await broadcastAllClear();
    try { await emergencyAPI.resolvePanic({ alert_id: alertId, resolve_all: !alertId }); } catch (_) {}
    setPhase('resolved');
    setResolving(false);
    setTimeout(() => navigate('/dashboard'), 3000);
  };

  const fmt = (s) => {
    const m = Math.floor(s / 60);
    return m > 0 ? `${m}:${(s % 60).toString().padStart(2, '0')}` : `${s}s`;
  };

  const pct          = (countdown / selectedCountdown) * 100;
  const circumference = 2 * Math.PI * 88;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');
        .pb-flash{position:fixed;inset:0;background:#ef4444;z-index:99999;pointer-events:none;animation:pbFlash .5s ease-out forwards;}
        @keyframes pbFlash{0%{opacity:.8}100%{opacity:0}}
        /* floating btn */
        .pb-btn{position:fixed;bottom:32px;right:32px;z-index:1000;width:80px;height:80px;border-radius:50%;border:none;cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;background:transparent;padding:0;}
        .pb-btn-inner{width:100%;height:100%;border-radius:50%;background:linear-gradient(135deg,#dc2626,#b91c1c);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;box-shadow:0 0 0 4px rgba(220,38,38,.2),0 0 0 8px rgba(220,38,38,.1),0 8px 32px rgba(220,38,38,.5);transition:all .3s ease;position:relative;}
        .pb-btn-inner::before{content:'';position:absolute;inset:4px;border-radius:50%;background:linear-gradient(135deg,rgba(255,255,255,.15),transparent);pointer-events:none;}
        .pb-btn:hover .pb-btn-inner{transform:scale(1.08);}
        .pb-btn:active .pb-btn-inner{transform:scale(.95);}
        .pb-ring{position:fixed;bottom:32px;right:32px;width:80px;height:80px;border-radius:50%;border:2px solid rgba(220,38,38,.4);z-index:999;pointer-events:none;animation:pbRing 2s ease-out infinite;}
        .pb-ring:nth-child(2){animation-delay:.5s}.pb-ring:nth-child(3){animation-delay:1s}
        @keyframes pbRing{0%{transform:scale(1);opacity:.6}100%{transform:scale(2.2);opacity:0}}
        .pb-btn-icon{font-size:24px;line-height:1;position:relative;z-index:1;}
        .pb-btn-label{font-size:9px;font-weight:900;color:white;letter-spacing:1.5px;text-transform:uppercase;position:relative;z-index:1;}
        /* overlays */
        .pb-overlay{position:fixed;inset:0;background:rgba(0,0,0,.88);backdrop-filter:blur(14px);z-index:9000;display:flex;align-items:center;justify-content:center;padding:20px;font-family:'Plus Jakarta Sans',sans-serif;animation:pbFadeIn .2s ease;}
        @keyframes pbFadeIn{from{opacity:0}to{opacity:1}}
        /* confirm */
        .pb-confirm-modal{background:#0a0b14;border:1px solid rgba(220,38,38,.3);border-radius:28px;padding:48px 40px;max-width:480px;width:100%;text-align:center;box-shadow:0 32px 80px rgba(220,38,38,.2),0 0 0 1px rgba(220,38,38,.1);animation:pbSlideUp .4s cubic-bezier(.16,1,.3,1);}
        @keyframes pbSlideUp{from{opacity:0;transform:translateY(32px) scale(.95)}to{opacity:1;transform:none}}
        .pb-confirm-icon{width:100px;height:100px;background:linear-gradient(135deg,rgba(220,38,38,.2),rgba(185,28,28,.1));border:2px solid rgba(220,38,38,.4);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:44px;margin:0 auto 24px;animation:pbShake .5s ease-in-out infinite;box-shadow:0 0 40px rgba(220,38,38,.2);}
        @keyframes pbShake{0%,100%{transform:rotate(-8deg)}50%{transform:rotate(8deg)}}
        .pb-confirm-title{font-size:28px;font-weight:900;color:white;letter-spacing:-1px;margin-bottom:10px;}
        .pb-confirm-sub{font-size:15px;color:rgba(255,255,255,.4);line-height:1.6;margin-bottom:28px;}
        .pb-countdown-label{font-size:11px;font-weight:600;color:rgba(255,255,255,.3);text-transform:uppercase;letter-spacing:1px;margin-bottom:12px;}
        .pb-countdown-opts{display:flex;gap:10px;justify-content:center;margin-bottom:28px;}
        .pb-countdown-opt{flex:1;padding:12px;border-radius:14px;border:1.5px solid rgba(255,255,255,.08);background:rgba(255,255,255,.03);color:rgba(255,255,255,.4);font-size:13px;font-weight:700;cursor:pointer;font-family:'Plus Jakarta Sans',sans-serif;transition:all .2s ease;}
        .pb-countdown-opt:hover{border-color:rgba(220,38,38,.3);color:white;}
        .pb-countdown-opt.selected{background:rgba(220,38,38,.1);border-color:rgba(220,38,38,.5);color:#fca5a5;box-shadow:0 0 16px rgba(220,38,38,.15);}
        .pb-countdown-opt-label{font-size:18px;font-weight:900;display:block;margin-bottom:2px;}
        .pb-countdown-opt-sub{font-size:10px;opacity:.6;text-transform:uppercase;letter-spacing:.5px;}
        .pb-confirm-btns{display:grid;grid-template-columns:1fr 1fr;gap:12px;}
        .pb-cancel-btn{padding:16px;border-radius:16px;background:rgba(255,255,255,.04);border:1.5px solid rgba(255,255,255,.08);color:rgba(255,255,255,.5);font-size:15px;font-weight:700;cursor:pointer;font-family:'Plus Jakarta Sans',sans-serif;transition:all .2s ease;}
        .pb-cancel-btn:hover{background:rgba(255,255,255,.07);color:white;}
        .pb-confirm-btn{padding:16px;border-radius:16px;background:linear-gradient(135deg,#dc2626,#b91c1c);border:none;color:white;font-size:15px;font-weight:900;cursor:pointer;font-family:'Plus Jakarta Sans',sans-serif;transition:all .3s cubic-bezier(.34,1.56,.64,1);box-shadow:0 8px 24px rgba(220,38,38,.4);}
        .pb-confirm-btn:hover{transform:translateY(-3px) scale(1.02);box-shadow:0 12px 32px rgba(220,38,38,.6);}
        /* active screen */
        .pb-active-overlay{position:fixed;inset:0;z-index:8000;font-family:'Plus Jakarta Sans',sans-serif;overflow-y:auto;animation:pbFadeIn .3s ease;}
        .pb-active-bg{position:fixed;inset:0;background:#0a0008;z-index:-1;}
        .pb-active-bg::before{content:'';position:fixed;inset:0;background:radial-gradient(ellipse at center,rgba(220,38,38,.15) 0%,transparent 70%);animation:pbBreath 2s ease-in-out infinite;}
        @keyframes pbBreath{0%,100%{opacity:.5;transform:scale(1)}50%{opacity:1;transform:scale(1.05)}}
        .pb-scanlines{position:fixed;inset:0;background:repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(220,38,38,.03) 2px,rgba(220,38,38,.03) 4px);pointer-events:none;z-index:1;}
        .pb-active-content{position:relative;z-index:2;padding:32px;max-width:900px;margin:0 auto;}
        .pb-top-bar{display:flex;align-items:center;justify-content:space-between;margin-bottom:32px;flex-wrap:wrap;gap:16px;}
        .pb-emergency-badge{display:flex;align-items:center;gap:12px;background:rgba(220,38,38,.1);border:1px solid rgba(220,38,38,.3);border-radius:100px;padding:10px 20px;animation:pbBadgePulse 1s ease-in-out infinite;}
        @keyframes pbBadgePulse{0%,100%{box-shadow:0 0 0 0 rgba(220,38,38,.4)}50%{box-shadow:0 0 0 8px rgba(220,38,38,0)}}
        .pb-badge-dot{width:10px;height:10px;background:#ef4444;border-radius:50%;box-shadow:0 0 12px #ef4444;animation:pbDotBlink .8s ease-in-out infinite;}
        @keyframes pbDotBlink{0%,100%{opacity:1}50%{opacity:.3}}
        .pb-badge-text{font-size:13px;font-weight:800;color:#fca5a5;letter-spacing:2px;text-transform:uppercase;}
        .pb-elapsed{font-size:13px;color:rgba(255,255,255,.3);font-weight:500;}
        /* redirect notice */
        .pb-redirect-notice{display:flex;align-items:flex-start;gap:12px;background:rgba(220,38,38,.08);border:1px solid rgba(220,38,38,.22);border-radius:14px;padding:14px 18px;margin-bottom:22px;font-size:13px;color:#fca5a5;font-weight:600;animation:pbFadeIn .3s ease;}
        .pb-redirect-bar{height:3px;background:rgba(220,38,38,.15);border-radius:100px;margin-top:8px;overflow:hidden;}
        .pb-redirect-fill{height:100%;background:#ef4444;border-radius:100px;transition:width 1s linear;}
        /* countdown ring */
        .pb-countdown-section{text-align:center;margin-bottom:40px;}
        .pb-countdown-title{font-size:14px;font-weight:700;color:rgba(255,255,255,.3);text-transform:uppercase;letter-spacing:3px;margin-bottom:16px;}
        .pb-countdown-ring{position:relative;width:200px;height:200px;margin:0 auto 24px;}
        .pb-ring-svg{width:100%;height:100%;transform:rotate(-90deg);}
        .pb-ring-bg{fill:none;stroke:rgba(220,38,38,.1);stroke-width:8;}
        .pb-ring-progress{fill:none;stroke:#ef4444;stroke-width:8;stroke-linecap:round;filter:drop-shadow(0 0 8px rgba(239,68,68,.8));transition:stroke-dashoffset 1s linear;}
        .pb-countdown-number{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);text-align:center;}
        .pb-countdown-val{font-size:52px;font-weight:900;color:#ef4444;letter-spacing:-3px;display:block;line-height:1;text-shadow:0 0 30px rgba(239,68,68,.5);font-variant-numeric:tabular-nums;}
        .pb-countdown-unit{font-size:12px;color:rgba(255,255,255,.3);text-transform:uppercase;letter-spacing:2px;font-weight:600;}
        .pb-countdown-msg{font-size:16px;color:rgba(255,255,255,.5);font-weight:500;}
        .pb-countdown-msg.urgent{color:#fca5a5;animation:pbUrgent .5s ease-in-out infinite;}
        @keyframes pbUrgent{0%,100%{opacity:1}50%{opacity:.5}}
        /* routes */
        .pb-routes-title{font-size:18px;font-weight:800;color:white;letter-spacing:-.5px;margin-bottom:16px;display:flex;align-items:center;gap:10px;}
        .pb-routes-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:14px;margin-bottom:32px;}
        .pb-route-card{background:rgba(255,255,255,.03);border-radius:18px;padding:20px;cursor:pointer;transition:all .3s cubic-bezier(.34,1.56,.64,1);}
        .pb-route-card:hover{transform:translateY(-4px);}
        .pb-route-card.active-zone{transform:translateY(-4px) scale(1.02);}
        .pb-route-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;}
        .pb-route-zone{font-size:15px;font-weight:800;color:white;}
        .pb-route-time{font-size:11px;font-weight:700;padding:3px 10px;border-radius:100px;}
        .pb-route-steps{display:flex;flex-direction:column;gap:6px;}
        .pb-route-step{display:flex;align-items:flex-start;gap:8px;font-size:12px;color:rgba(255,255,255,.5);line-height:1.4;}
        .pb-step-num{width:18px;height:18px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:800;flex-shrink:0;margin-top:1px;}
        /* all clear */
        .pb-allclear-wrap{text-align:center;padding-bottom:32px;}
        .pb-allclear-btn{display:inline-flex;align-items:center;gap:12px;padding:20px 48px;background:linear-gradient(135deg,#16a34a,#15803d);border:none;border-radius:20px;color:white;font-size:18px;font-weight:900;cursor:pointer;font-family:'Plus Jakarta Sans',sans-serif;transition:all .3s cubic-bezier(.34,1.56,.64,1);box-shadow:0 8px 32px rgba(22,163,74,.4),inset 0 1px 0 rgba(255,255,255,.15);}
        .pb-allclear-btn:hover:not(:disabled){transform:translateY(-4px) scale(1.02);box-shadow:0 16px 48px rgba(22,163,74,.6);}
        .pb-allclear-btn:disabled{opacity:.6;cursor:not-allowed;}
        .pb-allclear-sub{font-size:13px;color:rgba(255,255,255,.25);margin-top:12px;}
        /* resolved */
        .pb-resolved{position:fixed;inset:0;background:#060f09;z-index:9000;display:flex;align-items:center;justify-content:center;font-family:'Plus Jakarta Sans',sans-serif;animation:pbFadeIn .3s ease;}
        .pb-resolved-content{text-align:center;animation:pbSlideUp .5s cubic-bezier(.16,1,.3,1);}
        .pb-resolved-icon{font-size:80px;display:block;margin-bottom:24px;animation:pbBounce .6s cubic-bezier(.34,1.56,.64,1);}
        @keyframes pbBounce{from{transform:scale(0);opacity:0}to{transform:scale(1);opacity:1}}
        .pb-resolved-title{font-size:48px;font-weight:900;color:#22c55e;letter-spacing:-2px;margin-bottom:12px;text-shadow:0 0 40px rgba(34,197,94,.4);}
        .pb-resolved-sub{font-size:16px;color:rgba(255,255,255,.4);margin-bottom:6px;}
        .pb-resolved-redir{display:flex;align-items:center;justify-content:center;gap:8px;font-size:13px;color:rgba(255,255,255,.22);margin-top:14px;}
        .pb-redir-spinner{width:14px;height:14px;border:2px solid rgba(34,197,94,.25);border-top-color:#22c55e;border-radius:50%;animation:pbSpin .8s linear infinite;}
        @keyframes pbSpin{to{transform:rotate(360deg)}}
        @media(max-width:600px){.pb-routes-grid{grid-template-columns:1fr}.pb-confirm-btns{grid-template-columns:1fr}.pb-active-content{padding:20px 16px}.pb-countdown-val{font-size:40px}.pb-countdown-ring{width:160px;height:160px}.pb-allclear-btn{padding:16px 32px;font-size:16px}.pb-btn,.pb-ring{width:68px;height:68px;bottom:20px;right:20px}}
      `}</style>

      {flashRed && <div className="pb-flash" />}

      {/* ── Idle ── */}
      {phase === 'idle' && (
        <>
          <div className="pb-ring" /><div className="pb-ring" /><div className="pb-ring" />
          <button className="pb-btn" onClick={handlePanicClick}>
            <div className="pb-btn-inner">
              <span className="pb-btn-icon">🚨</span>
              <span className="pb-btn-label">PANIC</span>
            </div>
          </button>
        </>
      )}

      {/* ── Confirm ── */}
      {phase === 'confirm' && (
        <div className="pb-overlay">
          <div className="pb-confirm-modal">
            <div className="pb-confirm-icon">🚨</div>
            <div className="pb-confirm-title">ACTIVATE EMERGENCY?</div>
            <div className="pb-confirm-sub">
              This will trigger campus-wide alerts, notify{' '}
              <strong style={{color:'white'}}>every user on the platform</strong> instantly,
              activate evacuation protocols, and start the countdown timer.
            </div>
            <div className="pb-countdown-label">Select Evacuation Timer</div>
            <div className="pb-countdown-opts">
              {COUNTDOWN_OPTIONS.map(opt => (
                <button key={opt}
                  className={`pb-countdown-opt ${selectedCountdown===opt?'selected':''}`}
                  onClick={() => setSelectedCountdown(opt)}
                >
                  <span className="pb-countdown-opt-label">{opt}s</span>
                  <span className="pb-countdown-opt-sub">{opt===30?'Quick':opt===60?'Standard':'Extended'}</span>
                </button>
              ))}
            </div>
            <div className="pb-confirm-btns">
              <button className="pb-cancel-btn" onClick={() => setPhase('idle')}>Cancel</button>
              <button className="pb-confirm-btn" onClick={handleConfirm}>🚨 ACTIVATE!</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Active ── */}
      {phase === 'active' && (
        <div className="pb-active-overlay">
          <div className="pb-active-bg" />
          <div className="pb-scanlines" />
          <div className="pb-active-content">

            <div className="pb-top-bar">
              <div className="pb-emergency-badge">
                <div className="pb-badge-dot" />
                <span className="pb-badge-text">⚡ Emergency Active</span>
              </div>
              <div className="pb-elapsed">⏱ Active for {fmt(elapsed)}</div>
            </div>

            {/* Redirect warning — shows in final 10 s */}
            {countdown > 0 && countdown <= 10 && (
              <div className="pb-redirect-notice">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fca5a5" strokeWidth="2.5" strokeLinecap="round" style={{flexShrink:0,marginTop:1}}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                <div style={{flex:1}}>
                  Timer ending in <strong>{countdown}s</strong> — returning to dashboard automatically.
                  <div className="pb-redirect-bar">
                    <div className="pb-redirect-fill" style={{width:`${(countdown/10)*100}%`}} />
                  </div>
                </div>
              </div>
            )}

            <div className="pb-countdown-section">
              <div className="pb-countdown-title">Evacuation Countdown</div>
              <div className="pb-countdown-ring">
                <svg className="pb-ring-svg" viewBox="0 0 200 200">
                  <circle className="pb-ring-bg" cx="100" cy="100" r="88" />
                  <circle
                    className="pb-ring-progress" cx="100" cy="100" r="88"
                    strokeDasharray={circumference}
                    strokeDashoffset={circumference * (1 - pct / 100)}
                  />
                </svg>
                <div className="pb-countdown-number">
                  <span className="pb-countdown-val">{fmt(countdown)}</span>
                  <span className="pb-countdown-unit">remaining</span>
                </div>
              </div>
              <div className={`pb-countdown-msg ${countdown <= 10 ? 'urgent' : ''}`}>
                {countdown <= 0
                  ? '🚨 EVACUATE NOW — Returning to dashboard…'
                  : countdown <= 10
                    ? '⚠️ Final warning — Begin evacuation immediately!'
                    : '📢 Alert active — Proceed to nearest exit'}
              </div>
            </div>

            <div className="pb-routes-title">🗺️ Evacuation Routes</div>
            <div className="pb-routes-grid">
              {EVACUATION_ROUTES.map(route => (
                <div key={route.zone}
                  className={`pb-route-card ${activeZone===route.zone?'active-zone':''}`}
                  style={{
                    border:`1px solid ${activeZone===route.zone?route.color+'50':'rgba(255,255,255,0.06)'}`,
                    background:activeZone===route.zone?`${route.color}12`:'rgba(255,255,255,0.03)',
                    boxShadow:activeZone===route.zone?`0 8px 32px ${route.color}20`:'none',
                  }}
                  onClick={() => setActiveZone(activeZone===route.zone?null:route.zone)}
                >
                  <div className="pb-route-top">
                    <div className="pb-route-zone">{route.zone}</div>
                    <div className="pb-route-time" style={{color:route.color,background:`${route.color}20`,border:`1px solid ${route.color}40`}}>🕐 {route.time}</div>
                  </div>
                  <div className="pb-route-steps">
                    {route.steps.map((step,i)=>(
                      <div key={i} className="pb-route-step">
                        <div className="pb-step-num" style={{background:`${route.color}25`,color:route.color}}>{i+1}</div>
                        {step}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="pb-allclear-wrap">
              <button className="pb-allclear-btn" onClick={handleAllClear} disabled={resolving}>
                {resolving
                  ? <><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" style={{animation:'pbSpin .8s linear infinite'}}><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg> Resolving…</>
                  : '✅ ALL CLEAR — Emergency Resolved'}
              </button>
              <div className="pb-allclear-sub">Only press when situation is fully under control</div>
            </div>
          </div>
        </div>
      )}

      {/* ── Resolved → auto-redirects to /dashboard in 3 s ── */}
      {phase === 'resolved' && (
        <div className="pb-resolved">
          <div className="pb-resolved-content">
            <span className="pb-resolved-icon">✅</span>
            <div className="pb-resolved-title">ALL CLEAR</div>
            <div className="pb-resolved-sub">Emergency resolved. All users have been notified.</div>
            <div className="pb-resolved-redir">
              <div className="pb-redir-spinner" />
              Returning to dashboard…
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default PanicButton;