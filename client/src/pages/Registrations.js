import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { eventsAPI, registrationsAPI } from '../utils/api';
import QRScanner from '../components/QRScanner';

// ─── AURORA ──────────────────────────────────────────────────────────────────
const Aurora = () => {
  const canvasRef = useRef(null);
  const animRef   = useRef(0);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext('webgl', { antialias: true, alpha: true });
    if (!gl) return;
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; gl.viewport(0,0,canvas.width,canvas.height); };
    window.addEventListener('resize', resize); resize();
    const vert = `attribute vec2 a_pos; void main(){gl_Position=vec4(a_pos,0.0,1.0);}`;
    const frag = `
      precision highp float;
      uniform float u_t; uniform vec2 u_res;
      float blob(vec2 uv,vec2 c,float r){return smoothstep(r,0.0,length(uv-c));}
      void main(){
        vec2 uv=gl_FragCoord.xy/u_res; float t=u_t*0.18;
        vec2 b1=vec2(0.25+sin(t*0.7)*0.18,0.30+cos(t*0.5)*0.14);
        vec2 b2=vec2(0.72+cos(t*0.6+1.2)*0.16,0.65+sin(t*0.8+0.8)*0.12);
        vec2 b3=vec2(0.50+sin(t*0.4+2.5)*0.20,0.15+cos(t*0.55+1.8)*0.10);
        float w1=blob(uv,b1,0.55),w2=blob(uv,b2,0.50),w3=blob(uv,b3,0.45);
        vec3 col=vec3(0.05,0.55,0.68)*w1*0.55+vec3(0.25,0.18,0.72)*w2*0.50+vec3(0.08,0.35,0.60)*w3*0.45;
        vec2 uvc=uv-0.5; float vig=1.0-smoothstep(0.3,1.0,length(uvc)*1.4);
        col*=vig; gl_FragColor=vec4(col,length(col)*0.65);
      }`;
    const compile=(src,type)=>{ const s=gl.createShader(type); gl.shaderSource(s,src); gl.compileShader(s); return s; };
    const prog=gl.createProgram();
    gl.attachShader(prog,compile(vert,gl.VERTEX_SHADER));
    gl.attachShader(prog,compile(frag,gl.FRAGMENT_SHADER));
    gl.linkProgram(prog); gl.useProgram(prog);
    const buf=gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER,buf);
    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);
    const aPos=gl.getAttribLocation(prog,'a_pos');
    gl.enableVertexAttribArray(aPos); gl.vertexAttribPointer(aPos,2,gl.FLOAT,false,0,0);
    gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
    const uT=gl.getUniformLocation(prog,'u_t'), uRes=gl.getUniformLocation(prog,'u_res'), t0=performance.now();
    const render=(now)=>{ gl.uniform1f(uT,(now-t0)*0.001); gl.uniform2f(uRes,canvas.width,canvas.height); gl.clear(gl.COLOR_BUFFER_BIT); gl.drawArrays(gl.TRIANGLE_STRIP,0,4); animRef.current=requestAnimationFrame(render); };
    animRef.current=requestAnimationFrame(render);
    return ()=>{ cancelAnimationFrame(animRef.current); window.removeEventListener('resize',resize); };
  }, []);
  return <canvas ref={canvasRef} style={{position:'fixed',inset:0,zIndex:0,pointerEvents:'none',filter:'blur(60px) saturate(1.4)',opacity:0.7}}/>;
};

// ─── REGISTRATIONS ───────────────────────────────────────────────────────────
const Registrations = () => {
  const { isCommittee } = useAuth();
  const [events, setEvents]               = useState([]);
  const [selectedEvent, setSelectedEvent] = useState('');
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading]             = useState(false);
  const [showScanner, setShowScanner]     = useState(false);
  const [recentScans, setRecentScans]     = useState([]);
  const [stats, setStats]                 = useState({ total:0, checkedIn:0, pending:0 });
  const [mounted, setMounted]             = useState(false);
  const pollRef = useRef(null);

  useEffect(() => {
    setTimeout(() => setMounted(true), 100);
    fetchEvents();
    return () => clearInterval(pollRef.current);
  }, []);

  useEffect(() => {
    if (selectedEvent) {
      fetchRegistrations();
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
    } catch (err) { console.error(err); }
  };

  const fetchRegistrations = async () => {
    if (!selectedEvent) return;
    try {
      setLoading(true);
      const res = await registrationsAPI.getEventRegistrations(selectedEvent);
      const regs = res.data.registrations || [];
      setRegistrations(regs);
      setStats({ total:regs.length, checkedIn:regs.filter(r=>r.checked_in).length, pending:regs.filter(r=>!r.checked_in).length });
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleScanSuccess = (data) => {
    const reg = data.registration;
    setRecentScans(prev => [{
      id: reg?.id || Date.now(),
      name: reg?.users?.name || 'Unknown Student',
      email: reg?.users?.email || '',
      event: reg?.events?.name || 'Event',
      time: new Date().toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit', second:'2-digit' }),
      success: true,
    }, ...prev].slice(0, 20));
    fetchRegistrations();
  };

  const selectedEventData = events.find(e => e.id === selectedEvent);
  const checkinPercent = stats.total > 0 ? Math.round((stats.checkedIn / stats.total) * 100) : 0;
  const formatTime = (d) => d ? new Date(d).toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' }) : '—';
  const COLORS = ['#818cf8','#38bdf8','#a78bfa','#fcd34d','#4ade80','#f472b6'];

  return (
    <>
      <Aurora />
      <div style={{position:'fixed',inset:0,background:'rgba(7,10,22,0.62)',zIndex:2,pointerEvents:'none'}}/>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=Inter:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; }
        .at-root { font-family:'Inter',sans-serif; color:white; position:relative; z-index:3; }
        .at-title { font-family:'Syne',sans-serif; font-size:26px; font-weight:800; color:white; letter-spacing:-1px; margin-bottom:4px; }
        .at-sub { font-size:14px; color:rgba(255,255,255,0.35); }
        .at-header { display:flex; align-items:flex-start; justify-content:space-between; margin-bottom:24px; gap:16px; flex-wrap:wrap; }
        .at-header-right { display:flex; align-items:center; gap:10px; flex-wrap:wrap; }
        .at-event-select { background:rgba(6,9,26,0.80); border:1px solid rgba(78,174,198,0.18); border-radius:12px; padding:11px 16px; font-size:14px; color:white; font-family:'Inter',sans-serif; outline:none; cursor:pointer; min-width:220px; appearance:none; transition:border-color 0.2s; }
        .at-event-select:focus { border-color:rgba(78,174,198,0.45); }
        .at-event-select option { background:#080b18; }
        .at-scan-btn { display:flex; align-items:center; gap:8px; padding:11px 22px; background:linear-gradient(135deg,#6366f1,#4f46e5); border:none; border-radius:12px; color:white; font-size:14px; font-weight:700; cursor:pointer; font-family:'Syne',sans-serif; transition:all 0.25s ease; box-shadow:0 4px 20px rgba(99,102,241,0.35); white-space:nowrap; }
        .at-scan-btn:hover { transform:translateY(-2px); box-shadow:0 8px 28px rgba(99,102,241,0.5); }
        .at-stats { display:grid; grid-template-columns:repeat(4,1fr); gap:14px; margin-bottom:24px; }
        .at-stat { background:rgba(6,9,26,0.82); border:1px solid rgba(78,174,198,0.13); border-radius:18px; padding:20px; position:relative; overflow:hidden; transition:all 0.3s ease; backdrop-filter:blur(16px); }
        .at-stat:hover { transform:translateY(-3px); border-color:rgba(78,174,198,0.28); }
        .at-stat::before { content:''; position:absolute; top:0; left:0; right:0; height:2px; }
        .at-stat-icon { width:40px; height:40px; border-radius:11px; display:flex; align-items:center; justify-content:center; margin-bottom:14px; }
        .at-stat-num { font-family:'Syne',sans-serif; font-size:32px; font-weight:800; letter-spacing:-1.5px; display:block; margin-bottom:4px; }
        .at-stat-label { font-size:12px; color:rgba(255,255,255,0.35); font-weight:500; text-transform:uppercase; letter-spacing:0.5px; }
        .at-progress-wrap { background:rgba(6,9,26,0.82); border:1px solid rgba(78,174,198,0.13); border-radius:18px; padding:20px 24px; margin-bottom:24px; backdrop-filter:blur(16px); }
        .at-progress-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; }
        .at-progress-title { font-family:'Syne',sans-serif; font-size:14px; font-weight:700; color:white; }
        .at-progress-pct { font-family:'Syne',sans-serif; font-size:24px; font-weight:800; letter-spacing:-1px; }
        .at-progress-bg { height:8px; background:rgba(255,255,255,0.07); border-radius:100px; overflow:hidden; margin-bottom:10px; }
        .at-progress-fill { height:100%; border-radius:100px; background:linear-gradient(90deg,#6366f1,#06b6d4); transition:width 1s cubic-bezier(0.16,1,0.3,1); position:relative; overflow:hidden; }
        .at-progress-fill::after { content:''; position:absolute; top:0; left:-100%; width:60%; height:100%; background:linear-gradient(90deg,transparent,rgba(255,255,255,0.25),transparent); animation:atShimmer 2.5s infinite; }
        @keyframes atShimmer { to { left:200%; } }
        .at-progress-labels { display:flex; justify-content:space-between; font-size:12px; color:rgba(255,255,255,0.3); }
        .at-grid { display:grid; grid-template-columns:1fr 360px; gap:20px; }
        .at-section { background:rgba(6,9,26,0.82); border:1px solid rgba(78,174,198,0.13); border-radius:20px; overflow:hidden; backdrop-filter:blur(16px); }
        .at-section-header { padding:18px 24px; border-bottom:1px solid rgba(78,174,198,0.08); display:flex; align-items:center; justify-content:space-between; }
        .at-section-title { font-family:'Syne',sans-serif; font-size:15px; font-weight:700; color:white; letter-spacing:-0.3px; }
        .at-section-sub { font-size:12px; color:rgba(255,255,255,0.3); margin-top:2px; }
        .at-live-badge { display:flex; align-items:center; gap:6px; background:rgba(34,197,94,0.1); border:1px solid rgba(34,197,94,0.2); border-radius:100px; padding:4px 12px; font-size:11px; font-weight:600; color:#86efac; }
        .at-live-dot { width:6px; height:6px; background:#22c55e; border-radius:50%; box-shadow:0 0 6px #22c55e; animation:atDot 1.5s ease-in-out infinite; }
        @keyframes atDot { 0%,100%{opacity:1;} 50%{opacity:0.3;} }
        .at-reg-row { display:flex; align-items:center; gap:14px; padding:13px 24px; border-bottom:1px solid rgba(78,174,198,0.06); transition:background 0.2s ease; }
        .at-reg-row:last-child { border-bottom:none; }
        .at-reg-row:hover { background:rgba(78,174,198,0.04); }
        .at-avatar { width:38px; height:38px; border-radius:11px; display:flex; align-items:center; justify-content:center; font-size:15px; font-weight:700; flex-shrink:0; }
        .at-reg-name { font-size:14px; font-weight:600; color:white; flex:1; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .at-reg-email { font-size:11px; color:rgba(255,255,255,0.3); margin-top:2px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .at-reg-time { font-size:11px; color:rgba(255,255,255,0.25); text-align:right; flex-shrink:0; }
        .at-checkin-badge { font-size:11px; font-weight:600; padding:3px 10px; border-radius:100px; flex-shrink:0; }
        .at-scan-row { display:flex; align-items:center; gap:12px; padding:12px 20px; border-bottom:1px solid rgba(78,174,198,0.06); animation:atSlideIn 0.4s cubic-bezier(0.16,1,0.3,1); }
        @keyframes atSlideIn { from{opacity:0;transform:translateX(16px);} to{opacity:1;transform:none;} }
        .at-scan-row:last-child { border-bottom:none; }
        .at-scan-name { font-size:13px; font-weight:600; color:white; flex:1; }
        .at-scan-time { font-size:11px; color:rgba(255,255,255,0.25); font-weight:500; }
        .at-empty { padding:40px 24px; text-align:center; color:rgba(255,255,255,0.2); font-size:13px; }
        .at-skeleton { background:linear-gradient(90deg,rgba(255,255,255,0.04) 25%,rgba(255,255,255,0.08) 50%,rgba(255,255,255,0.04) 75%); background-size:200% 100%; animation:atSkel 1.5s infinite; border-radius:8px; }
        @keyframes atSkel { 0%{background-position:200% 0;} 100%{background-position:-200% 0;} }
        @media(max-width:1100px){ .at-stats{grid-template-columns:repeat(2,1fr);} .at-grid{grid-template-columns:1fr;} }
        @media(max-width:600px){ .at-stats{grid-template-columns:1fr 1fr;} .at-header{flex-direction:column;} .at-header-right{width:100%;} .at-event-select{min-width:unset;width:100%;} }
      `}</style>

      <div className="at-root" style={{ opacity: mounted?1:0, transform: mounted?'translateY(0)':'translateY(16px)', transition:'all 0.6s cubic-bezier(0.16,1,0.3,1)' }}>

        <div className="at-header">
          <div>
            <div className="at-title">Registrations</div>
            <div className="at-sub">{selectedEventData ? `Tracking: ${selectedEventData.name}` : 'Select an event to track attendance'}</div>
          </div>
          <div className="at-header-right">
            <select className="at-event-select" value={selectedEvent} onChange={e => setSelectedEvent(e.target.value)}>
              {events.map(ev => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
            </select>
            {isCommittee && (
              <button className="at-scan-btn" onClick={() => setShowScanner(true)}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><path d="M14 14h3v3m0 4h4m-4 0v-4m4 0h-4"/></svg>
                Scan QR
              </button>
            )}
          </div>
        </div>

        <div className="at-stats">
          {[
            { label:'Registered',    value:stats.total,          color:'#818cf8', bg:'rgba(99,102,241,0.12)',  grad:'linear-gradient(90deg,#6366f1,#4f46e5)' },
            { label:'Checked In',    value:stats.checkedIn,      color:'#4ade80', bg:'rgba(34,197,94,0.12)',   grad:'linear-gradient(90deg,#22c55e,#16a34a)' },
            { label:'Pending',       value:stats.pending,        color:'#fcd34d', bg:'rgba(245,158,11,0.12)',  grad:'linear-gradient(90deg,#f59e0b,#d97706)' },
            { label:'Check-in Rate', value:`${checkinPercent}%`, color:'#38bdf8', bg:'rgba(6,182,212,0.12)',   grad:'linear-gradient(90deg,#06b6d4,#0891b2)' },
          ].map((s, i) => (
            <div key={s.label} className="at-stat">
              <style>{`.at-stat:nth-child(${i+1})::before{background:${s.grad};}`}</style>
              <div className="at-stat-icon" style={{ background:s.bg }}>
                <div style={{ width:16, height:16, borderRadius:'50%', background:s.color, boxShadow:`0 0 10px ${s.color}` }}/>
              </div>
              <span className="at-stat-num" style={{ color:s.color }}>{s.value}</span>
              <span className="at-stat-label">{s.label}</span>
            </div>
          ))}
        </div>

        <div className="at-progress-wrap">
          <div className="at-progress-header">
            <div className="at-progress-title">
              Check-in Progress
              {selectedEventData && <span style={{ fontWeight:400, color:'rgba(255,255,255,0.3)', marginLeft:8, fontSize:13 }}>{selectedEventData.name}</span>}
            </div>
            <div className="at-progress-pct" style={{ background:'linear-gradient(135deg,#6366f1,#06b6d4)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text' }}>
              {checkinPercent}%
            </div>
          </div>
          <div className="at-progress-bg"><div className="at-progress-fill" style={{ width:`${checkinPercent}%` }}/></div>
          <div className="at-progress-labels"><span>{stats.checkedIn} checked in</span><span>{stats.pending} still pending</span></div>
        </div>

        <div className="at-grid">
          <div className="at-section">
            <div className="at-section-header">
              <div>
                <div className="at-section-title">All Registrations</div>
                <div className="at-section-sub">{stats.total} students registered</div>
              </div>
              <div className="at-live-badge"><div className="at-live-dot"/> Live</div>
            </div>
            {loading ? (
              <div style={{ padding:'16px 24px' }}>
                {[1,2,3,4,5].map(i => (
                  <div key={i} style={{ display:'flex', gap:12, marginBottom:14, alignItems:'center' }}>
                    <div className="at-skeleton" style={{ width:38, height:38, borderRadius:11, flexShrink:0 }}/>
                    <div style={{ flex:1 }}>
                      <div className="at-skeleton" style={{ width:'50%', height:14, marginBottom:6 }}/>
                      <div className="at-skeleton" style={{ width:'70%', height:11 }}/>
                    </div>
                    <div className="at-skeleton" style={{ width:72, height:22, borderRadius:100 }}/>
                  </div>
                ))}
              </div>
            ) : registrations.length === 0 ? (
              <div className="at-empty">No registrations yet for this event</div>
            ) : (
              <div style={{ maxHeight:500, overflowY:'auto' }}>
                {registrations.map((reg, i) => {
                  const color = COLORS[i % COLORS.length];
                  return (
                    <div key={reg.id} className="at-reg-row">
                      <div className="at-avatar" style={{ background:`${color}18`, border:`1px solid ${color}38` }}>
                        <span style={{ color }}>{reg.users?.name?.charAt(0)?.toUpperCase() || '?'}</span>
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div className="at-reg-name">{reg.users?.name || 'Unknown'}</div>
                        <div className="at-reg-email">{reg.users?.email || ''}</div>
                      </div>
                      <div>
                        <div className="at-checkin-badge" style={{
                          color: reg.checked_in ? '#4ade80' : 'rgba(255,255,255,0.3)',
                          background: reg.checked_in ? 'rgba(34,197,94,0.12)' : 'rgba(255,255,255,0.05)',
                          border: `1px solid ${reg.checked_in ? 'rgba(34,197,94,0.25)' : 'rgba(255,255,255,0.09)'}`,
                        }}>
                          {reg.checked_in ? 'Checked In' : 'Pending'}
                        </div>
                        {reg.checked_in_at && <div className="at-reg-time" style={{ marginTop:4 }}>{formatTime(reg.checked_in_at)}</div>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            {isCommittee && (
              <div style={{ background:'rgba(6,9,26,0.84)', border:'1px solid rgba(99,102,241,0.22)', borderRadius:20, padding:24, textAlign:'center', backdropFilter:'blur(16px)' }}>
                <div style={{ width:52, height:52, borderRadius:14, margin:'0 auto 14px', background:'rgba(99,102,241,0.14)', border:'1px solid rgba(99,102,241,0.28)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><path d="M14 14h3v3m0 4h4m-4 0v-4m4 0h-4"/>
                  </svg>
                </div>
                <div style={{ fontFamily:'Syne,sans-serif', fontSize:16, fontWeight:700, color:'white', marginBottom:6 }}>Scan to Check In</div>
                <div style={{ fontSize:13, color:'rgba(255,255,255,0.35)', marginBottom:20, lineHeight:1.6 }}>Use the QR scanner to quickly check in students at the entrance</div>
                <button className="at-scan-btn" style={{ width:'100%', justifyContent:'center' }} onClick={() => setShowScanner(true)}>Open QR Scanner</button>
              </div>
            )}

            <div className="at-section">
              <div className="at-section-header">
                <div>
                  <div className="at-section-title">Recent Scans</div>
                  <div className="at-section-sub">{recentScans.length} scans this session</div>
                </div>
                {recentScans.length > 0 && (
                  <button onClick={() => setRecentScans([])} style={{ background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.09)', borderRadius:8, color:'rgba(255,255,255,0.3)', fontSize:11, fontWeight:600, padding:'4px 10px', cursor:'pointer', fontFamily:'Inter,sans-serif' }}>Clear</button>
                )}
              </div>
              {recentScans.length === 0 ? (
                <div className="at-empty">No scans yet this session</div>
              ) : (
                <div style={{ maxHeight:320, overflowY:'auto' }}>
                  {recentScans.map((scan, i) => (
                    <div key={`${scan.id}-${i}`} className="at-scan-row">
                      <div style={{ width:36, height:36, borderRadius:10, flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(34,197,94,0.1)', border:'1px solid rgba(34,197,94,0.2)' }}>
                        <div style={{ width:10, height:10, borderRadius:'50%', background:'#4ade80', boxShadow:'0 0 8px #4ade80' }}/>
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div className="at-scan-name">{scan.name}</div>
                        <div style={{ fontSize:11, color:'rgba(255,255,255,0.25)', marginTop:2 }}>{scan.event}</div>
                      </div>
                      <div className="at-scan-time">{scan.time}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {selectedEventData && (
              <div className="at-section">
                <div className="at-section-header"><div className="at-section-title">Event Info</div></div>
                <div style={{ padding:'12px 20px' }}>
                  {[
                    { label:'Event',    value:selectedEventData.name },
                    { label:'Venue',    value:selectedEventData.venue || 'TBD' },
                    { label:'Capacity', value:selectedEventData.capacity || '∞' },
                    { label:'Status',   value:selectedEventData.status },
                  ].map(item => (
                    <div key={item.label} style={{ display:'flex', alignItems:'center', gap:10, padding:'11px 0', borderBottom:'1px solid rgba(78,174,198,0.07)' }}>
                      <span style={{ fontSize:12, color:'rgba(255,255,255,0.3)', flex:1 }}>{item.label}</span>
                      <span style={{ fontSize:13, fontWeight:600, color:'white' }}>{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {showScanner && <QRScanner onClose={() => setShowScanner(false)} onSuccess={handleScanSuccess}/>}
    </>
  );
};

export default Registrations;