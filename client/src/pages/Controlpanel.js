import { useState, useEffect, useRef, useCallback } from "react";
import React from "react";
import { eventsAPI, registrationsAPI, crowdAPI } from '../utils/api';

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

// ─── ZONES / HELPERS ──────────────────────────────────────────────────────────
const ZONES = [
  { id: "Auditorium", icon: "🎭", label: "Auditorium", cap: 180 },
  { id: "Cafeteria",  icon: "🍽️", label: "Cafeteria",  cap: 120 },
  { id: "Stage",      icon: "🎤", label: "Stage",      cap: 80  },
  { id: "Entrance",   icon: "🚪", label: "Entrance",   cap: 60  },
];

const genHistory = (base, variance, n = 20) =>
  Array.from({ length: n }, (_, i) => ({
    t: i,
    v: Math.max(0, Math.round(base + (Math.random() - 0.5) * variance * 2)),
  }));

const zoneDensity = (count, cap) => {
  const pct = count / cap;
  if (pct < 0.4)  return { label: "Low",      color: "#4ade80", bg: "rgba(74,222,128,0.08)",  border: "rgba(74,222,128,0.2)"  };
  if (pct < 0.75) return { label: "Moderate", color: "#fbbf24", bg: "rgba(251,191,36,0.08)",  border: "rgba(251,191,36,0.2)"  };
  return               { label: "Crowded",   color: "#f87171", bg: "rgba(248,113,113,0.08)", border: "rgba(248,113,113,0.2)" };
};

// ─── CLICK SPARK ──────────────────────────────────────────────────────────────
const ClickSpark = ({ children }) => {
  const [sparks, setSparks] = useState([]);
  const idRef = useRef(0);
  const fire = useCallback((e) => {
    const x = e.clientX, y = e.clientY, id = ++idRef.current, count = 14;
    const ns = Array.from({ length: count }, (_, i) => ({
      id: `${id}-${i}`, x, y, angle: (i / count) * 360,
      dist: 40 + Math.random() * 30, size: 2 + Math.random() * 2.5,
      color: ["#60a5fa","#a78bfa","#fff","#38bdf8","#c4b5fd"][Math.floor(Math.random() * 5)],
    }));
    setSparks(s => [...s, ...ns]);
    setTimeout(() => setSparks(s => s.filter(sp => !ns.find(n => n.id === sp.id))), 650);
  }, []);
  return (
    <div onClick={fire} style={{ position:"relative", width:"100%" }}>
      {sparks.map(sp => (
        <span key={sp.id} style={{
          position:"fixed", left:sp.x, top:sp.y, width:sp.size, height:sp.size,
          borderRadius:"50%", background:sp.color, pointerEvents:"none", zIndex:9999,
          transform:"translate(-50%,-50%)",
          animation:`spk${Math.round(sp.angle)} 0.6s ease-out forwards`,
        }} />
      ))}
      <style>{Array.from({length:360},(_,i)=>`@keyframes spk${i}{0%{opacity:1;transform:translate(-50%,-50%) scale(1);}100%{opacity:0;transform:translate(-50%,-50%) translate(${Math.cos(i*Math.PI/180)*65}px,${Math.sin(i*Math.PI/180)*65}px) scale(0);}}`).join("")}</style>
      {children}
    </div>
  );
};

// ─── ANIMATED NUMBER ──────────────────────────────────────────────────────────
const AnimNum = ({ value }) => {
  const [disp, setDisp] = useState(0);
  useEffect(() => {
    let cur = 0;
    const end = Number(value) || 0;
    if (end === 0) { setDisp(0); return; }
    const step = Math.max(1, Math.ceil(end / 30));
    const t = setInterval(() => {
      cur = Math.min(cur + step, end);
      setDisp(cur);
      if (cur >= end) clearInterval(t);
    }, 20);
    return () => clearInterval(t);
  }, [value]);
  return <>{Math.round(disp).toLocaleString("en-IN")}</>;
};

// ─── PROGRESS BAR ─────────────────────────────────────────────────────────────
const ProgBar = ({ pct, color, glow }) => (
  <div style={{ height: 4, background: "rgba(255,255,255,0.06)", borderRadius: 99, overflow: "hidden" }}>
    <div style={{
      height: "100%", width: `${Math.min(pct, 100)}%`, borderRadius: 99,
      background: color, boxShadow: glow ? `0 0 8px ${glow}` : "none",
      transition: "width 1.1s cubic-bezier(.16,1,.3,1)",
      position: "relative", overflow: "hidden",
    }}>
      <span style={{
        position: "absolute", top: 0, left: "-100%", width: "50%", height: "100%",
        background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.25),transparent)",
        animation: "shimmer 2s infinite",
      }} />
    </div>
  </div>
);

// ─── GLASS CARD (REFACTORED) ───────────────────────────────────────────────────
// Dark neutral glass — no warm amber tints. Clean, cool, professional.
const Card = ({ children, style = {}, accent }) => {
  const ref = useRef(null);
  const [glow, setGlow] = useState({ x: "50%", y: "50%", op: 0 });

  // Derive a subtle glow tint from accent, defaulting to cold blue-white
  const glowColor = accent ? `${accent}18` : "rgba(148,163,184,0.07)";
  const topBorder = accent ? `${accent}50` : "rgba(255,255,255,0.12)";
  const sideBorder = accent ? `${accent}1a` : "rgba(255,255,255,0.06)";

  return (
    <div
      ref={ref}
      onMouseMove={e => {
        const r = ref.current?.getBoundingClientRect();
        if (!r) return;
        setGlow({ x: `${((e.clientX - r.left) / r.width) * 100}%`, y: `${((e.clientY - r.top) / r.height) * 100}%`, op: 1 });
      }}
      onMouseLeave={() => setGlow(g => ({ ...g, op: 0 }))}
      style={{
        position: "relative",
        overflow: "hidden",
        // ── Core glass look ──────────────────────────────────────────────────
        background: "rgba(15, 17, 22, 0.72)",          // deep near-black
        backdropFilter: "blur(24px) saturate(160%)",
        WebkitBackdropFilter: "blur(24px) saturate(160%)",
        // ── Border: bright top edge, subtle sides ────────────────────────────
        border: `1px solid ${sideBorder}`,
        borderTop: `1px solid ${topBorder}`,
        borderRadius: 14,
        // ── Shadow: tight dark drop + faint inner highlight ──────────────────
        boxShadow: `
          0 1px 0 inset rgba(255,255,255,0.07),
          0 20px 40px rgba(0,0,0,0.45),
          0 4px 12px rgba(0,0,0,0.3)
        `,
        ...style,
      }}
    >
      {/* Spotlight follow glow */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        borderRadius: "inherit", zIndex: 0,
        background: `radial-gradient(circle 260px at ${glow.x} ${glow.y}, ${glowColor}, transparent 70%)`,
        opacity: glow.op,
        transition: "opacity 0.35s ease",
      }} />
      {/* Top-edge shine strip */}
      <div style={{
        position: "absolute", top: 0, left: "10%", right: "10%",
        height: 1, borderRadius: 99, zIndex: 0,
        background: `linear-gradient(90deg, transparent, ${topBorder}, transparent)`,
        pointerEvents: "none",
      }} />
      <div style={{ position: "relative", zIndex: 1 }}>{children}</div>
    </div>
  );
};

// ─── HEATMAP ──────────────────────────────────────────────────────────────────
const HeatmapViz = ({ zones: zoneData }) => {
  const areas = [
    { id: "Auditorium", x: 8,  y: 8,  w: 42, h: 38, icon: "🎭" },
    { id: "Stage",      x: 55, y: 8,  w: 37, h: 28, icon: "🎤" },
    { id: "Cafeteria",  x: 8,  y: 52, w: 37, h: 38, icon: "🍽️" },
    { id: "Entrance",   x: 55, y: 42, w: 37, h: 24, icon: "🚪" },
  ];
  const CAPS = { Auditorium: 180, Stage: 80, Cafeteria: 120, Entrance: 60 };
  return (
    <div style={{ position: "relative", width: "100%", paddingBottom: "52%", background: "rgba(0,0,0,0.25)", borderRadius: 10, overflow: "hidden", border: "1px solid rgba(255,255,255,0.06)" }}>
      <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} viewBox="0 0 100 100" preserveAspectRatio="none">
        {areas.map(a => {
          const count = zoneData[a.id] || 0;
          const pct = count / CAPS[a.id];
          const heat = pct < 0.4 ? "74,222,128" : pct < 0.75 ? "251,191,36" : "248,113,113";
          const op = 0.06 + pct * 0.32;
          return (
            <rect key={a.id} x={a.x} y={a.y} width={a.w} height={a.h}
              fill={`rgba(${heat},${op})`}
              stroke={`rgba(${heat},${0.18 + pct * 0.4})`}
              strokeWidth={0.5} rx={1.5} />
          );
        })}
      </svg>
      {areas.map(a => {
        const count = zoneData[a.id] || 0;
        const d = zoneDensity(count, CAPS[a.id]);
        return (
          <div key={a.id} style={{
            position: "absolute",
            left: `${a.x + 1}%`, top: `${a.y + 1}%`,
            width: `${a.w - 2}%`, height: `${a.h - 2}%`,
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2,
          }}>
            <span style={{ fontSize: "clamp(10px,2vw,16px)" }}>{a.icon}</span>
            <span style={{ fontSize: "clamp(7px,1.2vw,11px)", fontWeight: 700, color: d.color, fontFamily: "monospace" }}>{count}</span>
            <span style={{ fontSize: "clamp(5px,0.9vw,9px)", color: "rgba(255,255,255,0.3)", fontFamily: "monospace" }}>{a.id}</span>
          </div>
        );
      })}
      <div style={{ position: "absolute", bottom: 6, right: 8, fontSize: 9, color: "rgba(148,163,184,0.3)", fontFamily: "monospace", letterSpacing: "0.06em" }}>FLOOR PLAN · LIVE</div>
    </div>
  );
};

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function CrowdControlPanel() {
  const [events, setEvents]             = useState([]);
  const [selectedId, setSelectedId]     = useState(null);
  const [mounted, setMounted]           = useState(false);
  const [time, setTime]                 = useState(new Date());
  const [paused, setPaused]             = useState(false);
  const [activeTab, setActiveTab]       = useState("overview");
  const [zones, setZones]               = useState({ Auditorium: 0, Cafeteria: 0, Stage: 0, Entrance: 0 });
  const [crowdHistory, setCrowdHistory] = useState(genHistory(0, 10));
  const [alerts, setAlerts]             = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [lastRefresh, setLastRefresh]   = useState(new Date());
  const [refreshing, setRefreshing]     = useState(false);
  const [budget, setBudget]             = useState({ total: 0, spent: 0 });

  const event = events.find(e => e.id === selectedId) || events[0] || {};

  useEffect(() => { setTimeout(() => setMounted(true), 60); fetchData(); }, []);
  useEffect(() => { const t = setInterval(() => setTime(new Date()), 1000); return () => clearInterval(t); }, []);

  const fetchData = async () => {
    try {
      const evRes = await eventsAPI.getAll();
      const evs = evRes.data.events || [];
      setEvents(evs);
      if (evs.length > 0 && !selectedId) {
        setSelectedId(evs[0].id);
        fetchEventData(evs[0].id);
      }
    } catch (err) { console.error(err); }
  };

  const fetchEventData = async (eventId) => {
    try {
      const [regRes, crowdRes] = await Promise.all([
        registrationsAPI.getEventRegistrations(eventId),
        crowdAPI.getCurrent(eventId),
      ]);
      setRegistrations(regRes.data.registrations || []);
      const crowd = crowdRes.data.zones || {};
      setZones({ Auditorium: crowd.Auditorium || 0, Cafeteria: crowd.Cafeteria || 0, Stage: crowd.Stage || 0, Entrance: crowd.Entrance || 0 });
      setBudget({ total: 0, spent: 0 });
    } catch (err) { console.error(err); }
  };

  useEffect(() => { if (selectedId) fetchEventData(selectedId); }, [selectedId]);

  useEffect(() => {
    if (paused || !selectedId) return;
    const t = setInterval(() => {
      fetchEventData(selectedId);
      setCrowdHistory(h => {
        const total = Object.values(zones).reduce((a, b) => a + b, 0);
        return [...h.slice(1), { t: h[h.length - 1].t + 1, v: total }];
      });
      setLastRefresh(new Date());
    }, 5000);
    return () => clearInterval(t);
  }, [paused, selectedId, zones]);

  const handleRefresh = () => {
    setRefreshing(true);
    if (selectedId) fetchEventData(selectedId);
    setTimeout(() => { setRefreshing(false); setLastRefresh(new Date()); }, 700);
  };

  const dismiss = (id) => setAlerts(a => a.filter(x => x.id !== id));

  const totalCrowd  = Object.values(zones).reduce((a, b) => a + b, 0);
  const totalCap    = event.capacity || 500;
  const crowdPct    = totalCap > 0 ? Math.round((totalCrowd / totalCap) * 100) : 0;
  const checkedIn   = registrations.filter(r => r.checked_in).length;
  const pending     = registrations.filter(r => !r.checked_in).length;
  const checkinPct  = registrations.length > 0 ? Math.round((checkedIn / registrations.length) * 100) : 0;
  const hasAlerts   = alerts.length > 0;
  const totalBudget = budget.total || event.budget || 0;
  const spent       = budget.spent || 0;
  const remaining   = totalBudget - spent;
  const spentPct    = totalBudget > 0 ? Math.round((spent / totalBudget) * 100) : 0;

  const statusCol = { ongoing: "#4ade80", upcoming: "#60a5fa", completed: "#94a3b8", cancelled: "#f87171" };

  const STATS = [
    { icon: "🎫", label: "Registered",    val: registrations.length, color: "#60a5fa", grad: "linear-gradient(135deg,#3b82f6,#60a5fa)" },
    { icon: "✅", label: "Checked In",    val: checkedIn,            color: "#4ade80", grad: "linear-gradient(135deg,#16a34a,#4ade80)" },
    { icon: "👥", label: "Live Crowd",    val: totalCrowd,           color: "#a78bfa", grad: "linear-gradient(135deg,#7c3aed,#a78bfa)" },
    { icon: "🚨", label: "Active Alerts", val: alerts.length,        color: hasAlerts ? "#f87171" : "#4ade80", grad: hasAlerts ? "linear-gradient(135deg,#dc2626,#f87171)" : "linear-gradient(135deg,#16a34a,#4ade80)" },
  ];

  const tabs = ["overview", "zones", "registrations", "security"];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Syne:wght@600;700;800&family=DM+Sans:wght@400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        .cp-root {
          font-family: 'DM Sans', sans-serif;
          min-height: 100vh;
          color: #e2e8f0;
          padding: 24px;
          opacity: ${mounted ? 1 : 0};
          transform: ${mounted ? "translateY(0)" : "translateY(16px)"};
          transition: opacity 0.6s ease, transform 0.7s cubic-bezier(.16,1,.3,1);
          position: relative;
          z-index: 1;
        }
        @keyframes shimmer { to { left: 200%; } }
        @keyframes pulse   { 0%,100%{opacity:1;}50%{opacity:.3;} }
        @keyframes fadeUp  { from{opacity:0;transform:translateY(12px);}to{opacity:1;transform:none;} }
        @keyframes spin    { to{transform:rotate(360deg);} }
        .cp-tab {
          background: none; border: none; cursor: pointer;
          font-family: 'DM Sans', sans-serif;
          font-size: 11px; font-weight: 600; letter-spacing: .1em; text-transform: uppercase;
          padding: 7px 15px; border-radius: 7px; transition: all .18s;
        }
        .cp-tab:hover { background: rgba(255,255,255,0.06); }
        .cp-btn { font-family: 'DM Sans', sans-serif; cursor: pointer; border: none; transition: all .2s; }
        .cp-btn:hover { opacity: .82; }
        .cp-row  { display: grid; gap: 14px; margin-bottom: 14px; }
        .cp-2col { grid-template-columns: 1fr 1fr; }
        .cp-4col { grid-template-columns: repeat(4,1fr); }
        .cp-2l   { grid-template-columns: 1.55fr 1fr; }
        @media(max-width:900px){ .cp-4col{grid-template-columns:1fr 1fr;} .cp-2col,.cp-2l{grid-template-columns:1fr;} }
        @media(max-width:600px){ .cp-4col{grid-template-columns:1fr 1fr;} }
        .reg-row {
          display: flex; align-items: center; gap: 10px; padding: 10px 18px;
          border-bottom: 1px solid rgba(255,255,255,.04); transition: background .15s;
        }
        .reg-row:last-child { border-bottom: none; }
        .reg-row:hover { background: rgba(255,255,255,0.03); }
        ::-webkit-scrollbar { width: 3px; }
        ::-webkit-scrollbar-thumb { background: rgba(148,163,184,0.2); border-radius: 2px; }
      `}</style>

      <BeamsBackground />

      <ClickSpark>
        <div className="cp-root">

          {/* ── Header ── */}
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24, gap: 14, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 26, fontWeight: 800, letterSpacing: "-0.5px", background: "linear-gradient(140deg,#fff 10%,#cbd5e1 50%,#94a3b8 80%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text", filter: "drop-shadow(0 0 18px rgba(148,163,184,.25))", marginBottom: 4 }}>Control Panel 🎛️</div>
              <div style={{ fontSize: 12, color: "rgba(148,163,184,.4)", fontFamily: "'DM Mono',monospace" }}>{lastRefresh ? `Updated ${lastRefresh.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}` : "Live crowd management"}</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(74,222,128,.06)", border: "1px solid rgba(74,222,128,.2)", borderRadius: 100, padding: "6px 13px", fontSize: 11, fontWeight: 700, color: "#86efac" }}>
                <div style={{ width: 6, height: 6, background: "#4ade80", borderRadius: "50%", boxShadow: "0 0 6px #4ade80", animation: "pulse 1.5s infinite" }} />LIVE
              </div>
              {events.length > 0 && (
                <div style={{ position: "relative" }}>
                  <span style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", fontSize: 13, pointerEvents: "none" }}>🎉</span>
                  <select value={selectedId || ""} onChange={e => setSelectedId(e.target.value)} style={{ background: "rgba(15,17,22,.88)", border: "1px solid rgba(255,255,255,.1)", borderRadius: 10, padding: "9px 34px 9px 34px", fontSize: 12, color: "#e2e8f0", fontFamily: "'DM Sans',sans-serif", outline: "none", cursor: "pointer", appearance: "none", minWidth: 190 }}>
                    {events.map(ev => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
                  </select>
                  <span style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", color: "rgba(148,163,184,.4)", fontSize: 9, pointerEvents: "none" }}>▼</span>
                </div>
              )}
              <button onClick={handleRefresh} className="cp-btn" style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 15px", background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.1)", borderRadius: 10, color: "rgba(203,213,225,.8)", fontSize: 12, fontWeight: 600 }}>
                <span style={{ display: "inline-block", animation: refreshing ? "spin 0.7s linear 1" : "none" }}>↻</span>Refresh
              </button>
              <button onClick={() => setPaused(p => !p)} className="cp-btn" style={{ padding: "9px 14px", borderRadius: 10, fontSize: 12, fontWeight: 600, background: paused ? "rgba(251,191,36,.08)" : "rgba(255,255,255,.05)", border: `1px solid ${paused ? "rgba(251,191,36,.25)" : "rgba(255,255,255,.1)"}`, color: paused ? "#fcd34d" : "rgba(203,213,225,.7)" }}>{paused ? "▶ Resume" : "⏸ Pause"}</button>
              <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 12, color: "rgba(148,163,184,.3)" }}>{time.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</div>
            </div>
          </div>

          {/* ── Event Card ── */}
          <Card style={{ padding: "20px 24px", marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 20, fontWeight: 700, letterSpacing: "-0.3px", marginBottom: 10, color: "#f1f5f9" }}>{event.name}</div>
                <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginBottom: 8 }}>
                  {[
                    { label: `● ${event.status}`, color: statusCol[event.status] },
                    { label: `📅 ${event.date ? new Date(event.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : ""}`, color: "rgba(203,213,225,.45)" },
                    { label: `📍 ${event.venue}`, color: "rgba(203,213,225,.45)" },
                    { label: `👥 Cap: ${event.capacity}`, color: "rgba(203,213,225,.45)" },
                  ].filter(item => item.label && item.color).map(({ label, color }) => (
                    <span key={label} style={{ fontSize: 11, fontWeight: 600, padding: "3px 11px", borderRadius: 100, color, background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.08)" }}>{label}</span>
                  ))}
                </div>
                <div style={{ fontSize: 12, color: "rgba(203,213,225,.3)", lineHeight: 1.65, maxWidth: 500 }}>{event.description}</div>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 22, fontWeight: 700, color: "#fcd34d", filter: "drop-shadow(0 0 8px rgba(251,191,36,.25))", marginBottom: 2 }}>₹{totalBudget.toLocaleString("en-IN")}</div>
                <div style={{ fontSize: 9.5, color: "rgba(203,213,225,.25)", textTransform: "uppercase", letterSpacing: "0.8px" }}>Total Budget</div>
              </div>
            </div>
          </Card>

          {/* ── Stat Cards ── */}
          <div className="cp-row cp-4col" style={{ marginBottom: 16 }}>
            {STATS.map((s, i) => (
              <Card key={i} accent={s.color} style={{ padding: "18px 20px", animation: `fadeUp .5s ${i * 0.07}s both` }}>
                <div style={{ width: 36, height: 36, borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, background: `${s.color}12`, border: `1px solid ${s.color}28`, marginBottom: 12 }}>{s.icon}</div>
                <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 28, fontWeight: 700, letterSpacing: "-1px", background: s.grad, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text", marginBottom: 3 }}><AnimNum value={s.val} /></div>
                <div style={{ fontSize: 10, color: "rgba(203,213,225,.28)", textTransform: "uppercase", letterSpacing: ".7px", fontWeight: 600 }}>{s.label}</div>
              </Card>
            ))}
          </div>

          {/* ── Tabs ── */}
          <div style={{ display: "flex", gap: 4, marginBottom: 16, borderBottom: "1px solid rgba(255,255,255,.07)", paddingBottom: 10 }}>
            {tabs.map(t => (
              <button key={t} className="cp-tab" onClick={() => setActiveTab(t)} style={{ color: activeTab === t ? "#e2e8f0" : "rgba(148,163,184,.4)", background: activeTab === t ? "rgba(255,255,255,.08)" : "transparent" }}>{t}</button>
            ))}
          </div>

          {/* ── Overview Tab ── */}
          {activeTab === "overview" && (<>
            <div className="cp-row cp-2l">
              <Card style={{ padding: "20px 22px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "rgba(203,213,225,.6)" }}>Check-in Progress</div>
                    <div style={{ fontSize: 11, color: "rgba(203,213,225,.25)", marginTop: 2 }}>{checkedIn} of {registrations.length} registered</div>
                  </div>
                  <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 24, fontWeight: 700, color: "#60a5fa" }}>{checkinPct}%</div>
                </div>
                <ProgBar pct={checkinPct} color="linear-gradient(90deg,#3b82f6,#60a5fa,#93c5fd)" glow="rgba(96,165,250,.35)" />
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 11, color: "rgba(203,213,225,.28)" }}><span>✅ {checkedIn} checked in</span><span>⏳ {pending} pending</span></div>

                <div style={{ marginTop: 18 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", color: "rgba(203,213,225,.4)" }}>Crowd vs Capacity</div>
                    <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 12, fontWeight: 700, color: crowdPct > 80 ? "#f87171" : crowdPct > 55 ? "#fcd34d" : "#4ade80" }}>{crowdPct}%</span>
                  </div>
                  <ProgBar pct={crowdPct} color={crowdPct > 80 ? "linear-gradient(90deg,#ef4444,#f87171)" : crowdPct > 55 ? "linear-gradient(90deg,#f59e0b,#fcd34d)" : "linear-gradient(90deg,#22c55e,#4ade80)"} glow="rgba(74,222,128,.3)" />
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 5, fontSize: 11, color: "rgba(203,213,225,.25)" }}><span>👥 {totalCrowd} present</span><span>Max {totalCap}</span></div>
                </div>

                <div style={{ marginTop: 18 }}>
                  <div style={{ fontSize: 10, color: "rgba(203,213,225,.2)", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 6 }}>Crowd trend (last 20 readings)</div>
                  <div style={{ height: 60, display: "flex", alignItems: "flex-end", gap: 2, padding: "4px 0" }}>
                    {crowdHistory.map((d, i) => (
                      <div key={i} style={{ flex: 1, height: `${(d.v / Math.max(...crowdHistory.map(h => h.v), 1)) * 100}%`, background: "linear-gradient(180deg,#60a5fa,#3b82f6)", borderRadius: "2px 2px 0 0", opacity: 0.2 + (i / crowdHistory.length) * 0.8, transition: "height 0.3s ease", minHeight: 2 }} />
                    ))}
                  </div>
                </div>
              </Card>

              <Card style={{ padding: "20px 22px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "rgba(203,213,225,.6)" }}>Budget Summary</div>
                    <div style={{ fontSize: 11, color: "rgba(203,213,225,.25)", marginTop: 2 }}>Financial overview</div>
                  </div>
                </div>
                {[
                  { label: "💰 Total Budget", val: `₹${totalBudget.toLocaleString("en-IN")}`, color: "#fcd34d" },
                  { label: "💸 Spent",        val: `₹${spent.toLocaleString("en-IN")}`,       color: "#e2e8f0" },
                  { label: "✅ Remaining",    val: `₹${remaining.toLocaleString("en-IN")}`,   color: "#4ade80" },
                ].map(({ label, val, color }) => (
                  <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 0", borderBottom: "1px solid rgba(255,255,255,.04)" }}>
                    <span style={{ fontSize: 12, color: "rgba(203,213,225,.3)", fontWeight: 500 }}>{label}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color, fontFamily: "'DM Mono',monospace" }}>{val}</span>
                  </div>
                ))}
                <div style={{ marginTop: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5, fontSize: 10.5, color: "rgba(203,213,225,.25)" }}><span>Spent {spentPct}%</span><span>of total</span></div>
                  <ProgBar pct={spentPct} color={spentPct > 90 ? "linear-gradient(90deg,#ef4444,#f87171)" : spentPct > 65 ? "linear-gradient(90deg,#f59e0b,#fcd34d)" : "linear-gradient(90deg,#22c55e,#4ade80)"} />
                </div>
              </Card>
            </div>

            <Card style={{ padding: "20px 22px", marginBottom: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "rgba(203,213,225,.6)", marginBottom: 3 }}>Venue Heatmap</div>
              <div style={{ fontSize: 11, color: "rgba(203,213,225,.2)", marginBottom: 14 }}>Live crowd density by zone</div>
              <HeatmapViz zones={zones} />
              <div style={{ display: "flex", gap: 16, marginTop: 10 }}>
                {[["#4ade80", "Low (<40%)"], ["#fbbf24", "Moderate (40-75%)"], ["#f87171", "Crowded (>75%)"]].map(([c, l]) => (
                  <div key={l} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10, color: "rgba(203,213,225,.35)" }}><div style={{ width: 8, height: 8, borderRadius: 2, background: c }} />{l}</div>
                ))}
              </div>
            </Card>
          </>)}

          {/* ── Zones Tab ── */}
          {activeTab === "zones" && (<>
            <div className="cp-row cp-2col" style={{ marginBottom: 14 }}>
              {ZONES.map(z => {
                const count = zones[z.id] || 0;
                const d = zoneDensity(count, z.cap);
                const pct = Math.min(100, Math.round((count / z.cap) * 100));
                return (
                  <Card key={z.id} accent={d.color} style={{ padding: "20px 22px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                      <div>
                        <div style={{ fontSize: 22, marginBottom: 6 }}>{z.icon}</div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: "rgba(226,232,240,.85)" }}>{z.label}</div>
                        <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 9px", borderRadius: 100, color: d.color, background: d.bg, border: `1px solid ${d.border}`, marginTop: 5, display: "inline-block" }}>{d.label}</span>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 34, fontWeight: 700, color: d.color }}><AnimNum value={count} /></div>
                        <div style={{ fontSize: 10, color: "rgba(203,213,225,.25)" }}>of {z.cap} cap</div>
                      </div>
                    </div>
                    <ProgBar pct={pct} color={`linear-gradient(90deg,${d.color}88,${d.color})`} />
                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: 5, fontSize: 11, color: "rgba(203,213,225,.25)" }}><span>{pct}% full</span><span>{z.cap - count} spots free</span></div>
                  </Card>
                );
              })}
            </div>
            <Card style={{ padding: "20px 22px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "rgba(203,213,225,.55)" }}>Total Live Crowd</div>
                  <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 36, fontWeight: 700, color: "#e2e8f0", marginTop: 4 }}><AnimNum value={totalCrowd} /></div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 12, color: "rgba(203,213,225,.25)", marginBottom: 4 }}>vs capacity</div>
                  <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 26, fontWeight: 700, color: crowdPct > 80 ? "#f87171" : crowdPct > 55 ? "#fcd34d" : "#4ade80" }}>{crowdPct}%</div>
                </div>
              </div>
              <ProgBar pct={crowdPct} color={crowdPct > 80 ? "linear-gradient(90deg,#ef4444,#f87171)" : "linear-gradient(90deg,#3b82f6,#60a5fa,#93c5fd)"} glow="rgba(96,165,250,.35)" />
              <div style={{ marginTop: 16 }}><HeatmapViz zones={zones} /></div>
            </Card>
          </>)}

          {/* ── Registrations Tab ── */}
          {activeTab === "registrations" && (
            <Card style={{ overflow: "hidden" }}>
              <div style={{ padding: "18px 20px 12px", borderBottom: "1px solid rgba(255,255,255,.05)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "rgba(203,213,225,.6)" }}>All Registrations</div>
                  <div style={{ fontSize: 11, color: "rgba(203,213,225,.25)", marginTop: 2 }}>{registrations.length} total · {checkedIn} checked in · {pending} pending</div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 100, color: "#4ade80", background: "rgba(74,222,128,.08)", border: "1px solid rgba(74,222,128,.2)" }}>✅ {checkedIn} In</span>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 100, color: "rgba(203,213,225,.4)", background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.08)" }}>⏳ {pending}</span>
                </div>
              </div>
              <div style={{ padding: "12px 20px", borderBottom: "1px solid rgba(255,255,255,.04)" }}>
                <ProgBar pct={checkinPct} color="linear-gradient(90deg,#16a34a,#22c55e,#4ade80)" glow="rgba(74,222,128,.3)" />
                <div style={{ fontSize: 10, color: "rgba(203,213,225,.22)", marginTop: 5 }}>{checkinPct}% check-in rate</div>
              </div>
              <div style={{ maxHeight: 380, overflowY: "auto" }}>
                {registrations.map((r, i) => {
                  const palette = ["#60a5fa", "#a78bfa", "#f472b6", "#4ade80", "#fbbf24", "#f87171", "#38bdf8", "#818cf8"];
                  const col = palette[i % palette.length];
                  return (
                    <div key={r.id} className="reg-row">
                      <div style={{ width: 32, height: 32, borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", background: `${col}14`, border: `1px solid ${col}30`, flexShrink: 0 }}>
                        <span style={{ color: col, fontSize: 12, fontWeight: 700 }}>{r.name.charAt(0)}</span>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12.5, fontWeight: 600, color: "rgba(226,232,240,.85)" }}>{r.name}</div>
                        <div style={{ fontSize: 10.5, color: "rgba(203,213,225,.25)", marginTop: 1, fontFamily: "'DM Mono',monospace" }}>{r.email}</div>
                      </div>
                      <span style={{ fontSize: 9.5, fontWeight: 700, padding: "3px 9px", borderRadius: 100, color: r.checked_in ? "#4ade80" : "rgba(203,213,225,.3)", background: r.checked_in ? "rgba(74,222,128,.08)" : "rgba(255,255,255,.04)", border: `1px solid ${r.checked_in ? "rgba(74,222,128,.2)" : "rgba(255,255,255,.07)"}` }}>{r.checked_in ? "✅ Checked In" : "⏳ Pending"}</span>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {/* ── Security Tab ── */}
          {activeTab === "security" && (<>
            <div className="cp-row cp-2col">
              <Card accent={hasAlerts ? "#f87171" : "#4ade80"} style={{ overflow: "hidden" }}>
                <div style={{ padding: "18px 20px 12px", borderBottom: "1px solid rgba(255,255,255,.05)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: hasAlerts ? "#f87171" : "rgba(203,213,225,.6)" }}>Active Alerts</div>
                    <div style={{ fontSize: 11, color: "rgba(203,213,225,.25)", marginTop: 2 }}>{hasAlerts ? `${alerts.length} require attention` : "All systems clear"}</div>
                  </div>
                  {hasAlerts
                    ? <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 9px", borderRadius: 100, color: "#f87171", background: "rgba(248,113,113,.1)", border: "1px solid rgba(248,113,113,.25)" }}>{alerts.length} ACTIVE</span>
                    : <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 9px", borderRadius: 100, color: "#4ade80", background: "rgba(74,222,128,.08)", border: "1px solid rgba(74,222,128,.2)" }}>✅ Clear</span>}
                </div>
                {alerts.length === 0 ? (
                  <div style={{ padding: "36px 20px", textAlign: "center", color: "rgba(203,213,225,.2)" }}>
                    <div style={{ fontSize: 30, marginBottom: 8, opacity: .3 }}>🛡️</div>
                    <div style={{ fontSize: 12.5 }}>No active security alerts</div>
                  </div>
                ) : alerts.map(a => (
                  <div key={a.id} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "12px 20px", borderBottom: "1px solid rgba(255,255,255,.04)" }}>
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#f87171", boxShadow: "0 0 7px #f87171", marginTop: 5, flexShrink: 0, animation: "pulse .8s infinite" }} />
                    <div style={{ flex: 1, fontSize: 12, color: "rgba(226,232,240,.65)", lineHeight: 1.55 }}>{a.msg}</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                      <span style={{ fontSize: 10, color: "rgba(203,213,225,.2)" }}>{a.time}</span>
                      <button onClick={() => dismiss(a.id)} className="cp-btn" style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 6, color: "rgba(203,213,225,.35)", background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.1)" }}>Dismiss</button>
                    </div>
                  </div>
                ))}
              </Card>

              <Card style={{ padding: "20px 22px" }}>
                <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "rgba(203,213,225,.6)", marginBottom: 3 }}>System Status</div>
                <div style={{ fontSize: 11, color: "rgba(203,213,225,.25)", marginBottom: 16 }}>All monitors active</div>
                {[
                  { name: "Crowd Detection",  ok: true  },
                  { name: "RFID Check-in",    ok: true  },
                  { name: "PA System",        ok: true  },
                  { name: "Emergency Exits",  ok: true  },
                  { name: "CCTV Feed",        ok: false },
                  { name: "Fire Suppression", ok: true  },
                ].map(({ name, ok }) => (
                  <div key={name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 0", borderBottom: "1px solid rgba(255,255,255,.04)" }}>
                    <span style={{ fontSize: 12, color: "rgba(203,213,225,.6)" }}>{name}</span>
                    <span style={{ fontSize: 9.5, fontWeight: 700, padding: "2px 9px", borderRadius: 100, color: ok ? "#4ade80" : "#f87171", background: ok ? "rgba(74,222,128,.08)" : "rgba(248,113,113,.08)", border: `1px solid ${ok ? "rgba(74,222,128,.2)" : "rgba(248,113,113,.22)"}` }}>{ok ? "● ONLINE" : "● OFFLINE"}</span>
                  </div>
                ))}
                <button className="cp-btn" style={{ marginTop: 18, width: "100%", padding: "11px", borderRadius: 10, fontSize: 12, fontWeight: 700, background: "rgba(248,113,113,.08)", border: "1px solid rgba(248,113,113,.22)", color: "#f87171", letterSpacing: ".05em" }}
                  onClick={() => setAlerts(a => [...a, { id: Date.now(), msg: "⚠️ Manual emergency protocol triggered — all staff alerted.", level: "crit", time: "just now" }])}>
                  🚨 Trigger Emergency Alert
                </button>
              </Card>
            </div>
          </>)}

          <div style={{ marginTop: 20, textAlign: "center", fontSize: 10, color: "rgba(148,163,184,.15)", fontFamily: "'DM Mono',monospace", letterSpacing: ".08em" }}>
            CROWD CONTROL PANEL · LIVE · {new Date().toLocaleDateString("en-IN")}
          </div>
        </div>
      </ClickSpark>
    </>
  );
}