import React, { useState, useEffect, useRef, useCallback } from 'react';
import { emergencyAPI } from '../utils/api';
import { useAuth } from '../context/AuthContext';

// ─── BEAMS BACKGROUND ─────────────────────────────────────────────────────────
const BeamsBackground = () => {
  const canvasRef = useRef(null);
  const animRef = useRef(0);
  const startRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext('webgl', { antialias: true, alpha: false });
    if (!gl) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      gl.viewport(0, 0, canvas.width, canvas.height);
    };
    window.addEventListener('resize', resize);
    resize();

    const vs = `attribute vec2 a_pos; void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }`;
    const fs = `
      precision highp float;
      uniform float u_time;
      uniform vec2 u_res;
      float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float noise(vec2 p) {
        vec2 i = floor(p); vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
      }
      float fbm(vec2 p) {
        float v = 0.0; float a = 0.5;
        for (int i = 0; i < 5; i++) { v += a * noise(p); p = p * 2.0 + vec2(0.3, 0.7); a *= 0.5; }
        return v;
      }
      float beam(vec2 uv, float angle, float offset, float width, float t) {
        float c = cos(angle), s = sin(angle);
        vec2 rot = vec2(c * uv.x - s * uv.y, s * uv.x + c * uv.y);
        float d = abs(rot.x - offset + fbm(vec2(rot.y * 0.4, t * 0.3)) * 0.18);
        return smoothstep(width * 0.5, 0.0, d) + smoothstep(width * 2.5, 0.0, d) * 0.35;
      }
      void main() {
        vec2 uv = (gl_FragCoord.xy - 0.5 * u_res) / min(u_res.x, u_res.y);
        float t = u_time * 0.4;
        vec3 green = vec3(0.29, 0.87, 0.50);
        vec3 blue = vec3(0.13, 0.82, 0.93);
        vec3 col = vec3(0.01, 0.04, 0.06);
        col += green * beam(uv, 0.38, sin(t * 0.31) * 0.6, 0.07, t) * 0.7;
        col += blue * beam(uv, -0.25, cos(t * 0.27 + 1.2) * 0.55, 0.06, t + 1.0) * 0.7;
        col += green * beam(uv, 1.05, sin(t * 0.19 + 2.4) * 0.7, 0.08, t + 2.0) * 0.5;
        col += blue * beam(uv, -0.72, cos(t * 0.23 + 0.8) * 0.45, 0.06, t + 3.5) * 0.6;
        float vign = 1.0 - smoothstep(0.4, 1.4, length(uv));
        gl_FragColor = vec4(pow(col * vign, vec3(0.4545)), 1.0);
      }
    `;

    const prog = gl.createProgram();
    const compile = (src, type) => {
      const s = gl.createShader(type);
      gl.shaderSource(s, src); gl.compileShader(s); return s;
    };
    gl.attachShader(prog, compile(vs, gl.VERTEX_SHADER));
    gl.attachShader(prog, compile(fs, gl.FRAGMENT_SHADER));
    gl.linkProgram(prog); gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(prog, 'a_pos');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const uTime = gl.getUniformLocation(prog, 'u_time');
    const uRes  = gl.getUniformLocation(prog, 'u_res');
    startRef.current = performance.now();

    const render = (now) => {
      gl.uniform1f(uTime, (now - startRef.current) * 0.001);
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      animRef.current = requestAnimationFrame(render);
    };
    animRef.current = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return <canvas ref={canvasRef} style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }} />;
};

// ─── CLICK SPARK ──────────────────────────────────────────────────────────────
const ClickSpark = ({ children }) => {
  const [sparks, setSparks] = useState([]);
  const idRef = useRef(0);
  const fire = useCallback((e) => {
    const x = e.clientX, y = e.clientY;
    const id = ++idRef.current;
    const count = 18;
    const newSparks = Array.from({ length: count }, (_, i) => ({
      id: `${id}-${i}`, x, y, angle: (i / count) * 360,
      dist: (40 + Math.random() * 30) * 1.2, size: 3 + Math.random() * 3,
      color: ['#4eaec6','#93d8e8','#ffffff','#2a8fa8','#60d8f0','#b3eef8'][Math.floor(Math.random() * 6)],
    }));
    setSparks(s => [...s, ...newSparks]);
    setTimeout(() => setSparks(s => s.filter(sp => !newSparks.find(n => n.id === sp.id))), 700);
  }, []);
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }} onClick={fire}>
      {sparks.map(sp => (
        <span key={sp.id} style={{
          position: 'fixed', left: sp.x, top: sp.y, width: sp.size, height: sp.size,
          borderRadius: '50%', background: sp.color, pointerEvents: 'none', zIndex: 9999,
          transform: 'translate(-50%,-50%)', boxShadow: `0 0 ${sp.size * 2}px ${sp.color}`,
          animation: `spark-fly-${Math.round(sp.angle)} 0.65s ease-out forwards`,
        }} />
      ))}
      <style>{`${Array.from({ length: 360 }, (_, i) => `@keyframes spark-fly-${i}{0%{opacity:1;transform:translate(-50%,-50%) translate(0,0) scale(1);}100%{opacity:0;transform:translate(-50%,-50%) translate(${Math.cos(i * Math.PI / 180) * 72}px,${Math.sin(i * Math.PI / 180) * 72}px) scale(0);}}`).join('')}`}</style>
      {children}
    </div>
  );
};

const EVACUATION_ROUTES = [
  { zone: 'Auditorium', icon: '🎭', color: '#6366f1', time: '2 min', steps: ['Use side emergency exits', 'Follow green markings', 'Assembly Point A — North Lawn'] },
  { zone: 'Cafeteria', icon: '🍽️', color: '#f59e0b', time: '1.5 min', steps: ['Exit through kitchen door', 'Follow orange markings', 'Assembly Point B — Parking'] },
  { zone: 'Stage', icon: '🎤', color: '#22c55e', time: '1 min', steps: ['Exit stage left/right', 'Follow yellow markings', 'Assembly Point C — Sports Ground'] },
  { zone: 'Entrance', icon: '🚪', color: '#06b6d4', time: '30 sec', steps: ['Reverse through main gate', 'Move 50m away', 'Assembly Point D — Main Road'] },
];

const Emergency = () => {
  const { isCommittee } = useAuth();
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showTrigger, setShowTrigger] = useState(false);
  const [form, setForm] = useState({ message: '', severity: 'high', location: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchAlerts();
    const i = setInterval(fetchAlerts, 10000);
    return () => clearInterval(i);
  }, []);

  const fetchAlerts = async () => {
    try {
      const res = await emergencyAPI.getPanicStatus();
      setAlerts(res.data.active_alerts || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleTrigger = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await emergencyAPI.triggerPanic({ type: 'manual', ...form });
      setShowTrigger(false);
      setForm({ message: '', severity: 'high', location: '' });
      fetchAlerts();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const SEV = {
    low:      { color: '#22c55e', bg: 'rgba(34,197,94,0.1)',   border: 'rgba(34,197,94,0.25)'   },
    medium:   { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',  border: 'rgba(245,158,11,0.25)'  },
    high:     { color: '#f97316', bg: 'rgba(249,115,22,0.1)',  border: 'rgba(249,115,22,0.25)'  },
    critical: { color: '#ef4444', bg: 'rgba(239,68,68,0.1)',   border: 'rgba(239,68,68,0.25)'   },
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap');

        .em-root { font-family: 'Plus Jakarta Sans', sans-serif; color: #e2e8f0; }
        .em-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; flex-wrap: wrap; gap: 16px; }
        .em-title { font-size: 28px; font-weight: 800; letter-spacing: -1px; color: #f1f5f9; }
        .em-sub { font-size: 14px; color: rgba(148,163,184,0.5); margin-top: 4px; }
        .em-btn { padding: 12px 24px; border-radius: 12px; border: none; font-weight: 700; cursor: pointer; font-family: inherit; font-size: 14px; transition: all 0.2s; display: flex; align-items: center; gap: 8px; }
        .em-btn-trigger { background: linear-gradient(135deg,#ef4444,#b91c1c); color: white; box-shadow: 0 4px 20px rgba(239,68,68,0.4); }
        .em-btn-trigger:hover { transform: translateY(-2px); box-shadow: 0 8px 28px rgba(239,68,68,0.6); }

        .em-banner {
          background: rgba(239,68,68,0.08);
          border: 1px solid rgba(239,68,68,0.22);
          border-radius: 16px; padding: 20px 24px; margin-bottom: 24px;
          display: flex; justify-content: space-between; align-items: center; gap: 16px;
          backdrop-filter: blur(24px) saturate(160%);
          -webkit-backdrop-filter: blur(24px) saturate(160%);
        }
        .em-banner-left { display: flex; align-items: center; gap: 12px; }
        .em-banner-dot { width: 10px; height: 10px; background: #ef4444; border-radius: 50%; box-shadow: 0 0 12px #ef4444; animation: pulse 1.5s infinite; }
        @keyframes pulse { 0%,100%{opacity:1;}50%{opacity:0.3;} }
        .em-banner-title { font-size: 16px; font-weight: 700; color: #fca5a5; }
        .em-banner-sub { font-size: 12px; color: rgba(148,163,184,0.4); margin-top: 2px; }

        .em-grid { display: grid; grid-template-columns: 1fr 400px; gap: 20px; margin-bottom: 24px; }

        /* ── Glass card — matches CrowdControlPanel ── */
        .em-section {
          position: relative;
          overflow: hidden;
          background: rgba(15,17,22,0.72);
          backdrop-filter: blur(24px) saturate(160%);
          -webkit-backdrop-filter: blur(24px) saturate(160%);
          border: 1px solid rgba(255,255,255,0.06);
          border-top: 1px solid rgba(255,255,255,0.12);
          border-radius: 14px;
          box-shadow:
            0 1px 0 inset rgba(255,255,255,0.07),
            0 20px 40px rgba(0,0,0,0.45),
            0 4px 12px rgba(0,0,0,0.3);
          padding: 24px;
        }
        .em-section::before {
          content: '';
          position: absolute;
          top: 0; left: 10%; right: 10%;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent);
          border-radius: 99px;
          pointer-events: none;
        }

        .em-section-title { font-size: 18px; font-weight: 700; margin-bottom: 16px; color: rgba(226,232,240,0.9); }

        .em-alert { background: rgba(239,68,68,0.07); border: 1px solid rgba(239,68,68,0.18); border-radius: 12px; padding: 16px; margin-bottom: 12px; }
        .em-alert-top { display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px; }
        .em-alert-msg { font-size: 14px; font-weight: 600; color: #f1f5f9; flex: 1; }
        .em-alert-badge { font-size: 10px; font-weight: 700; padding: 3px 10px; border-radius: 100px; text-transform: uppercase; }
        .em-alert-meta { font-size: 12px; color: rgba(148,163,184,0.35); margin-top: 4px; }

        .em-route { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07); border-radius: 12px; padding: 16px; margin-bottom: 12px; transition: all 0.2s; }
        .em-route:hover { background: rgba(255,255,255,0.05); border-color: rgba(255,255,255,0.13); }
        .em-route-top { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
        .em-route-icon { font-size: 24px; }
        .em-route-name { font-size: 15px; font-weight: 700; flex: 1; color: rgba(226,232,240,0.85); }
        .em-route-time { font-size: 11px; font-weight: 600; padding: 3px 10px; border-radius: 100px; }
        .em-route-steps { display: flex; flex-direction: column; gap: 6px; }
        .em-route-step { font-size: 12px; color: rgba(148,163,184,0.5); display: flex; align-items: start; gap: 8px; }
        .em-route-step::before { content: '→'; color: rgba(148,163,184,0.3); }

        .em-modal { position: fixed; inset: 0; background: rgba(0,0,0,0.85); backdrop-filter: blur(12px); z-index: 9999; display: flex; align-items: center; justify-content: center; padding: 20px; animation: fadeIn 0.2s; }
        @keyframes fadeIn { from{opacity:0;}to{opacity:1;} }
        .em-modal-box {
          background: rgba(15,17,22,0.95);
          border: 1px solid rgba(255,255,255,0.08);
          border-top: 1px solid rgba(255,255,255,0.14);
          border-radius: 20px; padding: 32px;
          max-width: 500px; width: 100%;
          box-shadow: 0 32px 80px rgba(0,0,0,0.6), 0 1px 0 inset rgba(255,255,255,0.07);
          animation: slideUp 0.3s cubic-bezier(0.16,1,0.3,1);
          backdrop-filter: blur(24px) saturate(160%);
          -webkit-backdrop-filter: blur(24px) saturate(160%);
        }
        @keyframes slideUp { from{opacity:0;transform:translateY(20px);}to{opacity:1;transform:translateY(0);} }
        .em-modal-title { font-size: 24px; font-weight: 800; margin-bottom: 8px; color: #f1f5f9; }
        .em-modal-sub { font-size: 13px; color: rgba(148,163,184,0.4); margin-bottom: 24px; }
        .em-field { margin-bottom: 20px; }
        .em-label { font-size: 13px; font-weight: 600; color: rgba(203,213,225,0.5); margin-bottom: 8px; display: block; }
        .em-input, .em-select, .em-textarea { width: 100%; padding: 12px 16px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.09); border-radius: 12px; color: #e2e8f0; font-family: inherit; font-size: 14px; outline: none; transition: all 0.2s; }
        .em-input:focus, .em-select:focus, .em-textarea:focus { border-color: rgba(96,165,250,0.35); background: rgba(255,255,255,0.07); }
        .em-textarea { resize: vertical; min-height: 80px; }
        .em-btns { display: flex; gap: 12px; margin-top: 24px; }
        .em-btn-cancel { flex: 1; padding: 12px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.09); border-radius: 12px; color: rgba(203,213,225,0.5); font-weight: 600; cursor: pointer; font-family: inherit; transition: all 0.2s; }
        .em-btn-cancel:hover { background: rgba(255,255,255,0.08); color: #e2e8f0; }
        .em-btn-submit { flex: 1; padding: 12px; background: linear-gradient(135deg,#ef4444,#b91c1c); border: none; border-radius: 12px; color: white; font-weight: 700; cursor: pointer; font-family: inherit; transition: all 0.2s; box-shadow: 0 4px 20px rgba(239,68,68,0.4); }
        .em-btn-submit:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 8px 28px rgba(239,68,68,0.6); }
        .em-btn-submit:disabled { opacity: 0.5; cursor: not-allowed; }
        .em-spinner { width: 14px; height: 14px; border: 2px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: spin 0.6s linear infinite; }
        @keyframes spin { to{transform:rotate(360deg);} }
        .em-empty { text-align: center; padding: 40px; color: rgba(148,163,184,0.25); font-size: 13px; }
        @media(max-width:1000px){ .em-grid{ grid-template-columns: 1fr; } }
      `}</style>

      <BeamsBackground />

      <ClickSpark>
      <div className="em-root" style={{ position: 'relative', zIndex: 1 }}>
        <div className="em-header">
          <div>
            <div className="em-title">🚨 Emergency Center</div>
            <div className="em-sub">Monitor and manage campus emergency situations</div>
          </div>
          {isCommittee && (
            <button className="em-btn em-btn-trigger" onClick={() => setShowTrigger(true)}>
              🚨 Trigger Alert
            </button>
          )}
        </div>

        {alerts.length > 0 && (
          <div className="em-banner">
            <div className="em-banner-left">
              <div className="em-banner-dot" />
              <div>
                <div className="em-banner-title">⚡ {alerts.length} Active Alert{alerts.length > 1 ? 's' : ''}!</div>
                <div className="em-banner-sub">Immediate action required</div>
              </div>
            </div>
          </div>
        )}

        <div className="em-grid">
          <div className="em-section">
            <div className="em-section-title">Active Alerts</div>
            {loading ? (
              <div className="em-empty">Loading...</div>
            ) : alerts.length === 0 ? (
              <div className="em-empty">✅ No active alerts</div>
            ) : (
              alerts.map(a => {
                const sev = SEV[a.severity] || SEV.high;
                return (
                  <div key={a.id} className="em-alert">
                    <div className="em-alert-top">
                      <div className="em-alert-msg">{a.message}</div>
                      <div className="em-alert-badge" style={{ background: sev.bg, color: sev.color, border: `1px solid ${sev.border}` }}>
                        {a.severity}
                      </div>
                    </div>
                    <div className="em-alert-meta">📍 {a.location} • {new Date(a.created_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</div>
                  </div>
                );
              })
            )}
          </div>

          <div className="em-section">
            <div className="em-section-title">Evacuation Routes</div>
            {EVACUATION_ROUTES.map(r => (
              <div key={r.zone} className="em-route">
                <div className="em-route-top">
                  <div className="em-route-icon">{r.icon}</div>
                  <div className="em-route-name">{r.zone}</div>
                  <div className="em-route-time" style={{ background: `${r.color}20`, color: r.color, border: `1px solid ${r.color}40` }}>
                    ⏱ {r.time}
                  </div>
                </div>
                <div className="em-route-steps">
                  {r.steps.map((s, i) => (
                    <div key={i} className="em-route-step">{s}</div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      </ClickSpark>

      {showTrigger && (
        <div className="em-modal" onClick={(e) => e.target === e.currentTarget && setShowTrigger(false)}>
          <div className="em-modal-box">
            <div className="em-modal-title">🚨 Trigger Emergency Alert</div>
            <div className="em-modal-sub">This will notify {isCommittee ? 'all staff and students' : 'admin and committee members only'}</div>
            <form onSubmit={handleTrigger}>
              <div className="em-field">
                <label className="em-label">Message *</label>
                <textarea className="em-textarea" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder="Describe the emergency..." required />
              </div>
              <div className="em-field">
                <label className="em-label">Location *</label>
                <input className="em-input" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="e.g., Auditorium, Cafeteria" required />
              </div>
              <div className="em-field">
                <label className="em-label">Severity</label>
                <select className="em-select" value={form.severity} onChange={(e) => setForm({ ...form, severity: e.target.value })}>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
              <div className="em-btns">
                <button type="button" className="em-btn-cancel" onClick={() => setShowTrigger(false)}>Cancel</button>
                <button type="submit" className="em-btn-submit" disabled={submitting}>
                  {submitting ? <><div className="em-spinner" /> Triggering...</> : '🚨 Trigger Alert'}
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