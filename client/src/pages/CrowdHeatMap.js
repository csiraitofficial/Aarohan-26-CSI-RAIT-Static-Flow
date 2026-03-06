import React, { useState, useEffect, useRef, useCallback } from 'react';
import { crowdAPI } from '../utils/api';

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

const ZONES = [
  { id: 'Auditorium', icon: '🎭', cap: 120 },
  { id: 'Cafeteria',  icon: '🍽️', cap: 80  },
  { id: 'Stage',      icon: '🎤',  cap: 200 },
  { id: 'Entrance',   icon: '🚪', cap: 60  },
];

const TIME_SLOTS = Array.from({ length: 13 }, (_, i) => {
  const h = 8 + i;
  return `${String(h).padStart(2,'0')}:00`;
});

const heatBg = (val, max) => {
  if (!max || val === 0) return 'rgba(78,174,198,0.04)';
  const t = Math.min(val / max, 1);
  if (t < 0.35) return `rgba(29,122,150,${0.15 + t * 0.8})`;
  if (t < 0.65) return `rgba(245,158,11,${0.25 + (t - 0.35) * 1.4})`;
  return `rgba(239,68,68,${0.4 + (t - 0.65) * 1.7})`;
};

const heatText = (val, max) => {
  if (!max || val === 0) return 'rgba(255,255,255,0.15)';
  return val / max > 0.4 ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.5)';
};

const statusLabel = (val, cap) => {
  const pct = cap ? val / cap : 0;
  if (pct === 0)  return { label: 'Empty',    color: '#64748b' };
  if (pct < 0.35) return { label: 'Low',      color: '#22c55e' };
  if (pct < 0.7)  return { label: 'Moderate', color: '#f59e0b' };
  return              { label: 'Crowded',  color: '#ef4444' };
};

const CrowdHeatmap = ({ eventId, registrations = [] }) => {
  const [liveZones,  setLiveZones]  = useState({ Auditorium:0, Cafeteria:0, Stage:0, Entrance:0 });
  const [history,    setHistory]    = useState({});
  const [loading,    setLoading]    = useState(true);
  const [view,       setView]       = useState('live');
  const [activeCell, setActiveCell] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const pollRef = useRef(null);

  const fetchLive = useCallback(async () => {
    try {
      const res = await crowdAPI.getCurrent(eventId);
      const data = res.data.zones || [];
      const updated = { Auditorium:0, Cafeteria:0, Stage:0, Entrance:0 };
      data.forEach(z => { if (updated[z.zone] !== undefined) updated[z.zone] = z.count || 0; });
      setLiveZones(updated);
      setLastUpdate(new Date());
    } catch {}
    finally { setLoading(false); }
  }, [eventId]);

  const buildHistory = useCallback(() => {
    const slots = {};
    ZONES.forEach(z => { slots[z.id] = Array(TIME_SLOTS.length).fill(0); });
    registrations.forEach((reg, idx) => {
      if (!reg.checked_in) return;
      const ts   = reg.checked_in_at || reg.updated_at || reg.created_at;
      const zone = reg.checked_in_zone || ZONES[idx % ZONES.length].id;
      if (!ts || !slots[zone]) return;
      const hour = new Date(ts).getHours();
      const slot = Math.max(0, Math.min(TIME_SLOTS.length - 1, hour - 8));
      slots[zone][slot]++;
    });
    setHistory(slots);
  }, [registrations]);

  useEffect(() => {
    if (!eventId) return;
    fetchLive();
    buildHistory();
    clearInterval(pollRef.current);
    pollRef.current = setInterval(fetchLive, 6000);
    return () => clearInterval(pollRef.current);
  }, [eventId, fetchLive, buildHistory]);

  useEffect(() => { buildHistory(); }, [registrations, buildHistory]);

  const liveMax   = Math.max(...Object.values(liveZones), 1);
  const histMax   = Math.max(...Object.values(history).flatMap(a => a), 1);
  const totalLive = Object.values(liveZones).reduce((a,b) => a+b, 0);
  const totalCap  = ZONES.reduce((a,z) => a + z.cap, 0);
  const totalPct  = Math.round((totalLive / totalCap) * 100);
  const checkedIn = registrations.filter(r => r.checked_in).length;
  const busiestZone = ZONES.reduce((best, z) => liveZones[z.id] > liveZones[best.id] ? z : best, ZONES[0]);

  return (
    <>
      <BeamsBackground />
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&display=swap');
        .chm{font-family:'Space Grotesk',sans-serif;color:white;position:relative;z-index:1;}
        .chm-hdr{display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:10px;}
        .chm-title-row{display:flex;align-items:center;gap:10px;}
        .chm-title{font-size:15px;font-weight:700;background:linear-gradient(135deg,#fff,#93d8e8);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;}
        .chm-live-badge{display:flex;align-items:center;gap:5px;font-size:10px;font-weight:700;padding:3px 10px;border-radius:100px;background:rgba(34,197,94,0.08);border:1px solid rgba(34,197,94,0.22);color:#86efac;}
        .chm-dot{width:5px;height:5px;background:#22c55e;border-radius:50%;box-shadow:0 0 6px #22c55e;animation:chmD 1.6s ease-in-out infinite;}
        @keyframes chmD{0%,100%{opacity:1;}50%{opacity:0.2;}}
        .chm-updated{font-size:10px;color:rgba(255,255,255,0.22);}
        .chm-toggle{display:flex;gap:3px;background:rgba(255,255,255,0.03);border:1px solid rgba(78,174,198,0.1);border-radius:10px;padding:3px;}
        .chm-tb{padding:5px 13px;border-radius:7px;border:none;cursor:pointer;font-size:11px;font-weight:600;font-family:'Space Grotesk',sans-serif;transition:all 0.2s;}
        .chm-tb.on{background:rgba(78,174,198,0.16);color:#93d8e8;}
        .chm-tb:not(.on){background:transparent;color:rgba(255,255,255,0.28);}
        .chm-tb:not(.on):hover{color:rgba(255,255,255,0.55);}
        .chm-legend{display:flex;align-items:center;gap:7px;margin-bottom:14px;}
        .chm-leg-lbl{font-size:10px;color:rgba(255,255,255,0.25);}
        .chm-leg-scale{display:flex;gap:2px;}
        .chm-leg-cell{width:15px;height:9px;border-radius:2px;}
        .chm-total-bar{display:flex;align-items:center;gap:14px;padding:14px 18px;border-radius:14px;background:rgba(255,255,255,0.02);border:1px solid rgba(78,174,198,0.09);margin-bottom:14px;}
        .chm-total-icon{width:38px;height:38px;border-radius:10px;background:rgba(78,174,198,0.1);border:1px solid rgba(78,174,198,0.18);display:flex;align-items:center;justify-content:center;font-size:17px;flex-shrink:0;}
        .chm-total-info{flex:1;}
        .chm-total-top{display:flex;justify-content:space-between;align-items:center;margin-bottom:7px;}
        .chm-total-lbl{font-size:12px;font-weight:600;color:rgba(255,255,255,0.4);}
        .chm-total-val{font-size:14px;font-weight:800;color:white;letter-spacing:-0.3px;}
        .chm-total-track{height:5px;background:rgba(255,255,255,0.05);border-radius:100px;overflow:hidden;}
        .chm-total-fill{height:100%;border-radius:100px;transition:width 1s cubic-bezier(.16,1,.3,1);position:relative;overflow:hidden;}
        .chm-total-fill::after{content:'';position:absolute;top:0;left:-100%;width:50%;height:100%;background:linear-gradient(90deg,transparent,rgba(255,255,255,0.3),transparent);animation:chmS 2.2s infinite;}
        @keyframes chmS{to{left:200%;}}
        .chm-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin-bottom:14px;}
        .chm-zone{border-radius:16px;padding:16px 18px;transition:all 0.3s ease;cursor:default;position:relative;overflow:hidden;}
        .chm-zone:hover{transform:translateY(-2px);}
        .chm-zone-glow{position:absolute;top:-28px;right:-28px;width:90px;height:90px;border-radius:50%;filter:blur(28px);opacity:0.35;pointer-events:none;}
        .chm-zone-top{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:10px;}
        .chm-zone-icon{font-size:24px;}
        .chm-zone-badge{font-size:9.5px;font-weight:700;padding:2px 9px;border-radius:100px;text-transform:uppercase;letter-spacing:0.4px;}
        .chm-zone-count{font-size:36px;font-weight:800;letter-spacing:-1.5px;line-height:1;margin-bottom:3px;}
        .chm-zone-name{font-size:13px;font-weight:700;color:white;margin-bottom:1px;}
        .chm-zone-cap{font-size:10px;color:rgba(255,255,255,0.3);margin-bottom:10px;}
        .chm-zone-track{height:3px;background:rgba(255,255,255,0.08);border-radius:100px;overflow:hidden;}
        .chm-zone-bar{height:100%;border-radius:100px;transition:width 1s cubic-bezier(.16,1,.3,1);}
        .chm-matrix{overflow-x:auto;padding-bottom:4px;}
        .chm-mat-inner{min-width:520px;}
        .chm-mat-row{display:grid;align-items:center;margin-bottom:4px;}
        .chm-mat-lbl{font-size:11px;color:rgba(255,255,255,0.4);font-weight:600;text-align:right;padding-right:10px;white-space:nowrap;}
        .chm-cell{height:30px;border-radius:5px;display:flex;align-items:center;justify-content:center;font-size:9.5px;font-weight:700;border:1px solid rgba(255,255,255,0.03);cursor:pointer;transition:transform 0.15s,box-shadow 0.15s;position:relative;}
        .chm-cell:hover{transform:scale(1.1);z-index:2;box-shadow:0 3px 14px rgba(0,0,0,0.4);}
        .chm-cell.act{transform:scale(1.12);z-index:3;box-shadow:0 5px 18px rgba(0,0,0,0.5);border-color:rgba(255,255,255,0.2);}
        .chm-time-row{display:grid;margin-bottom:3px;}
        .chm-time-lbl{font-size:8.5px;color:rgba(255,255,255,0.2);text-align:center;font-weight:500;}
        .chm-tip{position:absolute;bottom:calc(100% + 7px);left:50%;transform:translateX(-50%);background:rgba(3,9,25,0.97);border:1px solid rgba(78,174,198,0.22);border-radius:10px;padding:7px 11px;font-size:10.5px;color:white;white-space:nowrap;box-shadow:0 6px 20px rgba(0,0,0,0.5);pointer-events:none;z-index:10;line-height:1.7;}
        .chm-tip::after{content:'';position:absolute;top:100%;left:50%;transform:translateX(-50%);border:4px solid transparent;border-top-color:rgba(78,174,198,0.22);}
        .chm-summary{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:14px;}
        .chm-sum{padding:11px 12px;border-radius:12px;background:rgba(255,255,255,0.02);border:1px solid rgba(78,174,198,0.09);text-align:center;}
        .chm-sum-val{font-size:18px;font-weight:800;letter-spacing:-0.5px;display:block;background:linear-gradient(135deg,#fff,#4eaec6);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;}
        .chm-sum-lbl{font-size:9px;color:rgba(255,255,255,0.22);text-transform:uppercase;letter-spacing:0.5px;margin-top:2px;}
        @media(max-width:580px){.chm-grid{grid-template-columns:1fr 1fr;}.chm-summary{grid-template-columns:1fr 1fr;}}
      `}</style>

      <div className="chm">
        <div className="chm-hdr">
          <div className="chm-title-row">
            <span className="chm-title">Zone Density Heatmap</span>
            <span className="chm-live-badge"><span className="chm-dot"/>Live</span>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
            {lastUpdate && <span className="chm-updated">Updated {lastUpdate.toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit',second:'2-digit'})}</span>}
            <div className="chm-toggle">
              <button className={`chm-tb ${view==='live'?'on':''}`} onClick={()=>setView('live')}>Live</button>
              <button className={`chm-tb ${view==='timeline'?'on':''}`} onClick={()=>setView('timeline')}>Timeline</button>
            </div>
          </div>
        </div>

        <div className="chm-legend">
          <span className="chm-leg-lbl">Low</span>
          <div className="chm-leg-scale">
            {[0.04,0.2,0.4,0.6,0.8,1].map((t,i)=>(
              <div key={i} className="chm-leg-cell" style={{background:heatBg(t,1)}}/>
            ))}
          </div>
          <span className="chm-leg-lbl">High</span>
        </div>

        {loading ? (
          <div style={{display:'flex',alignItems:'center',justifyContent:'center',padding:36,gap:12,color:'rgba(255,255,255,0.3)',fontSize:13}}>
            <div style={{width:22,height:22,border:'2px solid rgba(78,174,198,0.2)',borderTopColor:'#4eaec6',borderRadius:'50%',animation:'chmD 0.8s linear infinite'}}/>
            Loading crowd data...
          </div>
        ) : (
          <>
            <div className="chm-total-bar">
              <div className="chm-total-icon">👥</div>
              <div className="chm-total-info">
                <div className="chm-total-top">
                  <span className="chm-total-lbl">Total Live Crowd</span>
                  <span className="chm-total-val">{totalLive} / {totalCap} people</span>
                </div>
                <div className="chm-total-track">
                  <div className="chm-total-fill" style={{
                    width:`${totalPct}%`,
                    background: totalPct>70 ? 'linear-gradient(90deg,#ef4444,#dc2626)' : totalPct>40 ? 'linear-gradient(90deg,#f59e0b,#d97706)' : 'linear-gradient(90deg,#1d7a96,#4eaec6)',
                  }}/>
                </div>
              </div>
            </div>

            {view==='live' && (
              <div className="chm-grid">
                {ZONES.map(z => {
                  const count = liveZones[z.id]||0;
                  const pct   = Math.min(100,Math.round((count/z.cap)*100));
                  const st    = statusLabel(count,z.cap);
                  const bg    = heatBg(count,liveMax);
                  const barG  = pct>65 ? 'linear-gradient(90deg,#ef4444,#f87171)' : pct>35 ? 'linear-gradient(90deg,#f59e0b,#fcd34d)' : 'linear-gradient(90deg,#1d7a96,#4eaec6)';
                  return (
                    <div key={z.id} className="chm-zone" style={{ background:bg, border:`1px solid ${st.color}28`, boxShadow:count>0?`0 4px 24px ${st.color}18`:'none' }}>
                      <div className="chm-zone-glow" style={{background:st.color}}/>
                      <div className="chm-zone-top">
                        <span className="chm-zone-icon">{z.icon}</span>
                        <span className="chm-zone-badge" style={{color:st.color,background:`${st.color}18`,border:`1px solid ${st.color}35`}}>{st.label}</span>
                      </div>
                      <div className="chm-zone-count" style={{color:heatText(count,liveMax)}}>{count}</div>
                      <div className="chm-zone-name">{z.id}</div>
                      <div className="chm-zone-cap">{pct}% of {z.cap} capacity</div>
                      <div className="chm-zone-track">
                        <div className="chm-zone-bar" style={{width:`${pct}%`,background:barG}}/>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {view==='timeline' && (
              <div className="chm-matrix">
                <div className="chm-mat-inner">
                  <div className="chm-time-row" style={{gridTemplateColumns:`90px repeat(${TIME_SLOTS.length},1fr)`,display:'grid',marginBottom:3}}>
                    <div/>
                    {TIME_SLOTS.map(t=><div key={t} className="chm-time-lbl">{t}</div>)}
                  </div>
                  {ZONES.map(z => {
                    const row = history[z.id]||Array(TIME_SLOTS.length).fill(0);
                    return (
                      <div key={z.id} className="chm-mat-row" style={{gridTemplateColumns:`90px repeat(${TIME_SLOTS.length},1fr)`,gap:3,display:'grid'}}>
                        <div className="chm-mat-lbl">{z.icon} {z.id}</div>
                        {row.map((val,i) => {
                          const cellKey=`${z.id}-${i}`;
                          const isAct=activeCell===cellKey;
                          return (
                            <div key={i} className={`chm-cell ${isAct?'act':''}`}
                              style={{background:heatBg(val,histMax),color:heatText(val,histMax)}}
                              onClick={()=>setActiveCell(isAct?null:cellKey)}>
                              {val>0&&val}
                              {isAct&&(
                                <div className="chm-tip">
                                  {z.icon} <strong>{z.id}</strong><br/>
                                  {TIME_SLOTS[i]} — {val} check-in{val!==1?'s':''}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="chm-summary">
              {[
                {val:registrations.length, lbl:'Registered'},
                {val:checkedIn,            lbl:'Checked In'},
                {val:totalLive,            lbl:'Live Crowd'},
                {val:`${busiestZone.icon} ${busiestZone.id}`, lbl:'Busiest Zone', small:true},
              ].map((s,i)=>(
                <div key={i} className="chm-sum">
                  <span className="chm-sum-val" style={s.small?{fontSize:13}:{}}>{s.val}</span>
                  <div className="chm-sum-lbl">{s.lbl}</div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </>
  );
};

export default CrowdHeatmap;
