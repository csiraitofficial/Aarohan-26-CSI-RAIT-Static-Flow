import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { eventsAPI, emergencyAPI } from '../utils/api';
import { useNavigate } from 'react-router-dom';

// ─── BEAMS BACKGROUND — same shader as Login page ─────────────────────────────
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
    <div style={{ position:'relative', width:'100%', height:'100%' }} onClick={fire}>
      {sparks.map(sp => (
        <span key={sp.id} style={{
          position:'fixed', left:sp.x, top:sp.y, width:sp.size, height:sp.size,
          borderRadius:'50%', background:sp.color, pointerEvents:'none', zIndex:9999,
          transform:'translate(-50%,-50%)', boxShadow:`0 0 ${sp.size*2}px ${sp.color}`,
          animation:`spark-fly-${Math.round(sp.angle)} 0.65s ease-out forwards`,
          '--dx': `${Math.cos(sp.angle * Math.PI / 180) * sp.dist}px`,
          '--dy': `${Math.sin(sp.angle * Math.PI / 180) * sp.dist}px`,
        }} />
      ))}
      <style>{`${Array.from({length:360},(_,i)=>`@keyframes spark-fly-${i}{0%{opacity:1;transform:translate(-50%,-50%) translate(0,0) scale(1);}100%{opacity:0;transform:translate(-50%,-50%) translate(${Math.cos(i*Math.PI/180)*60*1.2}px,${Math.sin(i*Math.PI/180)*60*1.2}px) scale(0);}}`).join('')}`}</style>
      {children}
    </div>
  );
};

// ─── MAGIC BENTO ──────────────────────────────────────────────────────────────
const MagicBento = ({ children, className = '', style = {}, onClick }) => {
  const ref = useRef(null);
  const [spot, setSpot] = useState({ x:'50%', y:'50%', op:0 });
  const [ripples, setRipples] = useState([]);
  const rid = useRef(0);
  const onMove = useCallback((e) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    setSpot({ x:`${((e.clientX-r.left)/r.width)*100}%`, y:`${((e.clientY-r.top)/r.height)*100}%`, op:1 });
  }, []);
  const onLeave = useCallback(() => setSpot(s => ({ ...s, op:0 })), []);
  const onClickHandler = useCallback((e) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    const id = ++rid.current;
    setRipples(rr => [...rr, { id, x:e.clientX-r.left, y:e.clientY-r.top }]);
    setTimeout(() => setRipples(rr => rr.filter(rp => rp.id !== id)), 900);
    onClick && onClick(e);
  }, [onClick]);
  return (
    <div ref={ref} className={`mbento ${className}`} style={style} onMouseMove={onMove} onMouseLeave={onLeave} onClick={onClickHandler}>
      <div className="mb-spot" style={{ background:`radial-gradient(circle 260px at ${spot.x} ${spot.y},rgba(78,174,198,0.17),transparent 70%)`, opacity:spot.op }} />
      {ripples.map(rp => <span key={rp.id} className="mb-ripple" style={{ left:rp.x, top:rp.y }} />)}
      <div className="mb-inner">{children}</div>
    </div>
  );
};

// ─── MAIN DASHBOARD ───────────────────────────────────────────────────────────
const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [events, setEvents]   = useState([]);
  const [crowd]               = useState({ total_count: 0 });
  const [alerts, setAlerts]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [time, setTime]       = useState(new Date());
  const [mounted, setMounted] = useState(false);

  useEffect(() => { const t = setInterval(() => setTime(new Date()), 1000); return () => clearInterval(t); }, []);
  useEffect(() => { setTimeout(() => setMounted(true), 80); }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [eventsRes, alertsRes] = await Promise.all([eventsAPI.getAll(), emergencyAPI.getPanicStatus()]);
        setEvents(eventsRes.data.events || []);
        setAlerts(alertsRes.data.active_alerts || []);
      } catch (err) { console.error(err); } finally { setLoading(false); }
    };
    fetchData();
  }, []);

  const totalBudget = events.reduce((s, e) => s + (parseFloat(e.budget) || 0), 0);
  const getGreeting = () => { const h = time.getHours(); if (h < 12) return 'Good morning'; if (h < 17) return 'Good afternoon'; return 'Good evening'; };
  const formatDate = (d) => new Date(d).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' });
  const isStaff = user?.role === 'committee' || user?.role === 'admin';

  // ── CARDS: same colors as file 1 (dark-theme palette) ──
  const CARDS = [
    { label:'Total Events',    value:loading?'…':events.length,              icon:'🎉', color:'#818cf8', bg:'rgba(99,102,241,0.12)',  border:'rgba(99,102,241,0.22)',  grad:'linear-gradient(135deg,#6366f1,#4f46e5)' },
    { label:'Live Attendance', value:loading?'…':crowd.total_count,          icon:'👥', color:'#4eaec6', bg:'rgba(78,174,198,0.12)',  border:'rgba(78,174,198,0.22)',  grad:'linear-gradient(135deg,#4eaec6,#1d7a96)' },
    ...(isStaff ? [{ label:'Total Budget', value:loading?'…':`₹${(totalBudget/1000).toFixed(0)}k`, icon:'💰', color:'#fcd34d', bg:'rgba(245,158,11,0.12)', border:'rgba(245,158,11,0.22)', grad:'linear-gradient(135deg,#f59e0b,#d97706)' }] : []),
    { label:'Active Alerts',   value:loading?'…':alerts.length,              icon:'🚨',
      color:  alerts.length > 0 ? '#f87171' : '#86efac',
      bg:     alerts.length > 0 ? 'rgba(239,68,68,0.12)'  : 'rgba(34,197,94,0.12)',
      border: alerts.length > 0 ? 'rgba(239,68,68,0.22)'  : 'rgba(34,197,94,0.22)',
      grad:   alerts.length > 0 ? 'linear-gradient(135deg,#ef4444,#dc2626)' : 'linear-gradient(135deg,#22c55e,#16a34a)' },
  ];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
        *, *::before, *::after { margin:0; padding:0; box-sizing:border-box; }

        .db-root {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          color: white;
          position: relative; z-index: 1; padding: 20px;
        }

        /* ── MAGIC BENTO — dark glass (file 1 style) ── */
        .mbento {
          position: relative; overflow: hidden;
          background: rgba(5,12,32,0.72);
          border: 1px solid rgba(78,174,198,0.16);
          border-radius: 20px;
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        }
        .mb-spot {
          position:absolute; inset:0; pointer-events:none;
          transition:opacity 0.3s ease; z-index:0; border-radius:inherit;
        }
        .mb-ripple {
          position:absolute; transform:translate(-50%,-50%) scale(0);
          width:600px; height:600px; border-radius:50%;
          background:radial-gradient(circle,rgba(78,174,198,0.13) 0%,transparent 60%);
          animation:mbRipple 0.9s ease-out forwards; pointer-events:none;
        }
        @keyframes mbRipple { to { transform:translate(-50%,-50%) scale(1); opacity:0; } }
        .mb-inner {
          position:relative; z-index:1;
          display:flex; align-items:center; justify-content:space-between; width:100%;
        }

        /* ── WELCOME ── */
        .db-welcome { margin-bottom: 22px; }
        .db-welcome .mb-inner { padding: 30px 36px; align-items: center; }
        .db-greeting {
          font-size:11px; color:rgba(255,255,255,0.35); font-weight:600;
          text-transform:uppercase; letter-spacing:1.2px; margin-bottom:8px;
          display:flex; align-items:center; gap:8px;
        }
        .db-greeting-dot {
          width:6px; height:6px; background:#22c55e; border-radius:50%;
          box-shadow:0 0 8px #22c55e; animation:pulseDot 2s ease infinite;
        }
        @keyframes pulseDot { 0%,100%{box-shadow:0 0 8px #22c55e;} 50%{box-shadow:0 0 16px #22c55e,0 0 24px rgba(34,197,94,0.4);} }
        .db-welcome-name { font-size:28px; font-weight:800; color:white; letter-spacing:-0.5px; margin-bottom:5px; }
        .db-welcome-name span {
          background:linear-gradient(135deg,#4eaec6,#93d8e8);
          -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text;
        }
        .db-welcome-sub { font-size:14px; color:rgba(255,255,255,0.45); }
        .db-clock { text-align:right; margin-left:auto; flex-shrink:0; padding-left:24px; }
        .db-clock-time {
          font-size:34px; font-weight:700; font-variant-numeric:tabular-nums; letter-spacing:-1px;
          background:linear-gradient(135deg,#fff,rgba(255,255,255,0.7));
          -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text;
        }
        .db-clock-date { font-size:13px; color:rgba(255,255,255,0.35); margin-top:4px; }

        /* ── STAT CARDS ── */
        .db-cards { display:grid; grid-template-columns:repeat(4,1fr); gap:14px; margin-bottom:20px; }
        .db-card { transition:transform 0.25s ease; }
        .db-card:hover { transform:translateY(-4px); }
        .db-card .mb-inner { padding:22px; flex-direction:column; align-items:flex-start; justify-content:flex-start; }
        .db-card-bar { position:absolute; top:0; left:0; right:0; height:2px; z-index:2; }
        .db-card-icon { width:42px; height:42px; border-radius:11px; display:flex; align-items:center; justify-content:center; font-size:19px; margin-bottom:16px; }
        .db-card-value { font-size:32px; font-weight:700; margin-bottom:3px; display:block; }
        .db-card-label { font-size:13px; font-weight:600; color:rgba(255,255,255,0.5); }

        /* ── BOTTOM GRID ── */
        .db-grid { display:grid; grid-template-columns:1fr 340px; gap:18px; }
        .db-events-list .mb-inner, .db-alerts-list .mb-inner {
          flex-direction:column; align-items:stretch; justify-content:flex-start; padding:0;
        }
        .db-sec-hdr {
          display:flex; align-items:center; justify-content:space-between;
          padding:22px 26px 18px; border-bottom:1px solid rgba(255,255,255,0.05); width:100%;
        }
        .db-sec-title { font-weight:700; font-size:15px; color:white; }
        .db-event-row {
          display:flex; align-items:center; gap:14px;
          padding:14px 26px; border-bottom:1px solid rgba(255,255,255,0.03);
          cursor:pointer; width:100%; transition:background 0.2s ease;
        }
        .db-event-row:hover { background:rgba(78,174,198,0.04); }
        .db-event-row:last-child { border-bottom:none; }
        .db-alert-item {
          display:flex; align-items:flex-start; gap:12px;
          padding:13px 20px; border-bottom:1px solid rgba(255,255,255,0.04); width:100%;
        }
        .db-alert-item:last-child { border-bottom:none; }

        @media(max-width:1024px){ .db-cards{grid-template-columns:repeat(2,1fr);} .db-grid{grid-template-columns:1fr;} }
        @media(max-width:600px){
          .db-cards{grid-template-columns:1fr 1fr;}
          .db-welcome .mb-inner{flex-direction:column;align-items:flex-start;gap:16px;}
          .db-clock{text-align:left;padding-left:0;margin-left:0;}
        }
      `}</style>

      <ClickSpark>
        <BeamsBackground />

        <div
          className="db-root"
          style={{
            opacity: mounted ? 1 : 0,
            transform: mounted ? 'translateY(0)' : 'translateY(16px)',
            transition: 'opacity 0.7s ease, transform 0.7s cubic-bezier(.16,1,.3,1)',
          }}
        >
          {/* WELCOME */}
          <MagicBento className="db-welcome">
            <div>
              <div className="db-greeting"><div className="db-greeting-dot"/>{getGreeting()}</div>
              <div className="db-welcome-name">Welcome back, <span>{user?.name?.split(' ')[0] || 'User'}</span> 👋</div>
              <div className="db-welcome-sub">System status is operational.</div>
            </div>
            <div className="db-clock">
              <div className="db-clock-time">{time.toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit', second:'2-digit' })}</div>
              <div className="db-clock-date">{time.toLocaleDateString('en-IN', { weekday:'long', day:'numeric', month:'long' })}</div>
            </div>
          </MagicBento>

          {/* STAT CARDS */}
          <div className="db-cards">
            {CARDS.map((card, i) => (
              <MagicBento key={i} className="db-card">
                <div className="db-card-bar" style={{ background:card.grad }}/>
                <div className="db-card-icon" style={{ background:card.bg, border:`1px solid ${card.border}` }}>{card.icon}</div>
                <span className="db-card-value" style={{ color:card.color }}>{card.value}</span>
                <div className="db-card-label">{card.label}</div>
              </MagicBento>
            ))}
          </div>

          {/* BOTTOM GRID */}
          <div className="db-grid">
            <MagicBento className="db-events-list">
              <div className="db-sec-hdr">
                <div className="db-sec-title">Recent Events</div>
                <div style={{ fontSize:12, color:'#4eaec6', cursor:'pointer', fontWeight:600 }} onClick={() => navigate('/events')}>View All →</div>
              </div>
              {loading && <div style={{ padding:30, textAlign:'center', fontSize:13, opacity:0.3, width:'100%' }}>Loading…</div>}
              {!loading && events.length === 0 && <div style={{ padding:30, textAlign:'center', fontSize:13, opacity:0.3, width:'100%' }}>No events yet</div>}
              {events.slice(0,5).map(event => (
                <div key={event.id} className="db-event-row" onClick={() => navigate(`/events/${event.id}`)}>
                  <div style={{ fontSize:18 }}>🎉</div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontWeight:600, fontSize:14, color:'white', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{event.name}</div>
                    <div style={{ fontSize:11, color:'rgba(255,255,255,0.38)', marginTop:2 }}>{formatDate(event.date)} • {event.venue}</div>
                  </div>
                  <div style={{ fontSize:10, fontWeight:700, padding:'3px 8px', borderRadius:10, background:'rgba(78,174,198,0.1)', color:'#4eaec6', flexShrink:0 }}>{event.status}</div>
                </div>
              ))}
            </MagicBento>

            <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
              <MagicBento className="db-alerts-list">
                <div className="db-sec-hdr">
                  <div className="db-sec-title">Security Alerts</div>
                  {alerts.length > 0 && (
                    <div style={{ fontSize:10, fontWeight:700, padding:'3px 8px', borderRadius:10, background:'rgba(239,68,68,0.12)', color:'#f87171' }}>
                      {alerts.length} ACTIVE
                    </div>
                  )}
                </div>
                {alerts.length === 0
                  ? <div style={{ padding:30, textAlign:'center', fontSize:13, opacity:0.3, width:'100%' }}>✅ No active alerts</div>
                  : alerts.map((alert, i) => (
                    <div key={i} className="db-alert-item">
                      <div style={{ width:6, height:6, background:'#f87171', borderRadius:'50%', marginTop:5, flexShrink:0, boxShadow:'0 0 8px #f87171' }}/>
                      <div style={{ flex:1, fontSize:12, color:'rgba(255,255,255,0.6)', lineHeight:1.5 }}>{alert.message}</div>
                    </div>
                  ))
                }
              </MagicBento>
            </div>
          </div>
        </div>
      </ClickSpark>
    </>
  );
};

export default Dashboard;