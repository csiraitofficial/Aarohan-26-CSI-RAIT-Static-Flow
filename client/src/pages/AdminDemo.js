import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { eventsAPI, crowdAPI, emergencyAPI } from '../utils/api';
import axios from 'axios';

const API = process.env.REACT_APP_API_URL || 'http://localhost:8000';

// ─── BEAMS BACKGROUND — same shader as Login/Dashboard ────────────────────────
const BeamsBackground = () => {
  const canvasRef = useRef(null);
  const animRef = useRef(0);
  const startRef = useRef(0);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext('webgl', { antialias: true, alpha: false });
    if (!gl) return;
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; gl.viewport(0,0,canvas.width,canvas.height); };
    window.addEventListener('resize', resize); resize();
    const vs = `attribute vec2 a_pos; void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }`;
    const fs = `
      precision highp float; uniform float u_time; uniform vec2 u_res;
      float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float noise(vec2 p){vec2 i=floor(p);vec2 f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(hash(i),hash(i+vec2(1.0,0.0)),f.x),mix(hash(i+vec2(0.0,1.0)),hash(i+vec2(1.0,1.0)),f.x),f.y);}
      float fbm(vec2 p){float v=0.0;float a=0.5;for(int i=0;i<5;i++){v+=a*noise(p);p=p*2.0+vec2(0.3,0.7);a*=0.5;}return v;}
      float beam(vec2 uv,float angle,float offset,float width,float t){float c=cos(angle),s=sin(angle);vec2 rot=vec2(c*uv.x-s*uv.y,s*uv.x+c*uv.y);float d=abs(rot.x-offset+fbm(vec2(rot.y*0.4,t*0.3))*0.18);return smoothstep(width*0.5,0.0,d)+smoothstep(width*2.5,0.0,d)*0.35;}
      void main(){vec2 uv=(gl_FragCoord.xy-0.5*u_res)/min(u_res.x,u_res.y);float t=u_time*0.4;vec3 green=vec3(0.29,0.87,0.50);vec3 blue=vec3(0.13,0.82,0.93);vec3 col=vec3(0.01,0.04,0.06);col+=green*beam(uv,0.38,sin(t*0.31)*0.6,0.07,t)*0.7;col+=blue*beam(uv,-0.25,cos(t*0.27+1.2)*0.55,0.06,t+1.0)*0.7;col+=green*beam(uv,1.05,sin(t*0.19+2.4)*0.7,0.08,t+2.0)*0.5;col+=blue*beam(uv,-0.72,cos(t*0.23+0.8)*0.45,0.06,t+3.5)*0.6;float vign=1.0-smoothstep(0.4,1.4,length(uv));gl_FragColor=vec4(pow(col*vign,vec3(0.4545)),1.0);}
    `;
    const prog = gl.createProgram();
    const compile = (src, type) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; };
    gl.attachShader(prog, compile(vs, gl.VERTEX_SHADER)); gl.attachShader(prog, compile(fs, gl.FRAGMENT_SHADER));
    gl.linkProgram(prog); gl.useProgram(prog);
    const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(prog, 'a_pos'); gl.enableVertexAttribArray(aPos); gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
    const uTime = gl.getUniformLocation(prog, 'u_time'); const uRes = gl.getUniformLocation(prog, 'u_res');
    startRef.current = performance.now();
    const render = (now) => { gl.uniform1f(uTime, (now - startRef.current) * 0.001); gl.uniform2f(uRes, canvas.width, canvas.height); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); animRef.current = requestAnimationFrame(render); };
    animRef.current = requestAnimationFrame(render);
    return () => { cancelAnimationFrame(animRef.current); window.removeEventListener('resize', resize); };
  }, []);
  return <canvas ref={canvasRef} style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }} />;
};

const AdminDemo = () => {
  const { user, isAdmin, token } = useAuth();
  const navigate = useNavigate();
  const [results, setResults] = useState({});
  const [loading, setLoading] = useState({});
  const [mounted, setMounted] = useState(true);

  if (!isAdmin) {
    return (
      <>
        <BeamsBackground />
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap');
          .ad-no-access { font-family:'Plus Jakarta Sans',sans-serif; display:flex; flex-direction:column; align-items:center; justify-content:center; min-height:60vh; text-align:center; gap:16px; position:relative; z-index:1; }
        `}</style>
        <div className="ad-no-access">
          <div style={{ fontSize:'64px' }}>🔒</div>
          <div style={{ fontSize:'22px', fontWeight:'800', color:'white', letterSpacing:'-0.5px' }}>Admin Only</div>
          <div style={{ fontSize:'14px', color:'rgba(255,255,255,0.3)' }}>You need admin access to view this page</div>
          <button onClick={() => navigate('/dashboard')} style={{ padding:'10px 24px', background:'rgba(99,102,241,0.15)', border:'1px solid rgba(99,102,241,0.3)', borderRadius:'10px', color:'#818cf8', cursor:'pointer', fontSize:'14px', fontFamily:'Plus Jakarta Sans, sans-serif' }}>
            ← Back to Dashboard
          </button>
        </div>
      </>
    );
  }

  const setActionLoading = (key, val) => setLoading(prev => ({ ...prev, [key]: val }));
  const setActionResult  = (key, val) => setResults(prev => ({ ...prev, [key]: val }));

  const generateStudents = async () => {
    setActionLoading('students', true); setActionResult('students', null);
    const names = ['Aarav Shah','Priya Patel','Rohit Sharma','Ananya Singh','Vikram Mehta','Sneha Iyer','Arjun Kumar','Pooja Nair','Karan Gupta','Divya Pillai','Rahul Verma','Neha Joshi','Amit Tiwari','Riya Desai','Suresh Reddy','Kavya Menon','Nikhil Rao','Shreya Bose','Aditya Mishra','Pallavi Das','Siddharth Jain','Meera Krishnan','Varun Malhotra','Anjali Chauhan','Dev Pandya','Ritu Saxena','Abhinav Grover','Ishaan Kapoor','Tanvi Mehrotra','Yash Agarwal','Nisha Bhatt','Akash Dubey','Swati Choudhary','Raghav Nair','Kritika Sinha','Manav Sethi','Deepika Rao','Shivam Tripathi','Priyanka Bansal','Arun Murthy','Sakshi Goel','Rohan Khanna','Megha Shukla','Aryan Bhatia','Simran Gill','Kartik Mathur','Avni Soni','Dhruv Bajaj','Nalini Varma','Tushar Dey'];
    let success = 0, failed = 0;
    for (let i = 0; i < names.length; i++) {
      const name = names[i];
      const email = `${name.toLowerCase().replace(/\s/g,'.')}${i}@student.campusflow.in`;
      try { await axios.post(`${API}/api/auth/register`, { name, email, password:'student123', role:'student', college:'CampusFlow University', phone:`98${Math.floor(10000000+Math.random()*90000000)}` }); success++; } catch(e){ failed++; }
      if (i%10===9) await new Promise(r=>setTimeout(r,300));
    }
    setActionResult('students',{ type:'success', message:`✅ Created ${success} students${failed>0?` (${failed} already existed)`:''}`});
    setActionLoading('students',false);
  };

  const generateEvents = async () => {
    setActionLoading('events',true); setActionResult('events',null);
    const events = [
      { name:'TechFest 2026 — Annual Tech Summit', description:'The biggest tech event on campus featuring hackathons, coding competitions, and guest lectures from industry leaders.', date:new Date(Date.now()+7*86400000).toISOString().split('T')[0], venue:'Main Auditorium', capacity:500, budget:150000, status:'upcoming' },
      { name:'Cultural Night — Colors of India', description:'A spectacular evening of dance, music, and art celebrating the diversity of Indian culture.', date:new Date(Date.now()+14*86400000).toISOString().split('T')[0], venue:'Open Air Stage', capacity:800, budget:80000, status:'upcoming' },
      { name:'Startup Pitch Competition', description:'Students pitch their startup ideas to a panel of investors and industry experts.', date:new Date(Date.now()+3*86400000).toISOString().split('T')[0], venue:'Seminar Hall B', capacity:200, budget:50000, status:'upcoming' },
      { name:'Sports Day 2026', description:'Annual inter-department sports competition with cricket, football, basketball and more.', date:new Date(Date.now()+21*86400000).toISOString().split('T')[0], venue:'Sports Ground', capacity:1000, budget:120000, status:'upcoming' },
      { name:'Freshers Welcome Party', description:'Welcome event for first-year students with games, music, and fun activities.', date:new Date(Date.now()+1*86400000).toISOString().split('T')[0], venue:'Cafeteria & Lawn', capacity:300, budget:40000, status:'ongoing' },
    ];
    let success=0,failed=0;
    for(const event of events){ try{ await eventsAPI.create(event); success++; }catch(e){ failed++; } }
    setActionResult('events',{ type:'success', message:`✅ Created ${success} events${failed>0?` (${failed} failed)`:''}`});
    setActionLoading('events',false);
  };

  const generateCrowdSurge = async () => {
    setActionLoading('crowd',true); setActionResult('crowd',null);
    const surgeData = [{ zone:'Auditorium',count:87 },{ zone:'Cafeteria',count:92 },{ zone:'Stage',count:76 },{ zone:'Entrance',count:95 }];
    let success=0;
    for(const zone of surgeData){ try{ await crowdAPI.update(zone); success++; await new Promise(r=>setTimeout(r,200)); }catch(e){} }
    setActionResult('crowd',{ type:'warning', message:`🔴 Crowd surge simulated! ${success}/4 zones now at critical levels (75-95 people)`});
    setActionLoading('crowd',false);
  };

  const simulateEmergency = async () => {
    setActionLoading('emergency',true); setActionResult('emergency',null);
    try {
      await emergencyAPI.triggerPanic({ type:'panic', severity:'critical', message:'🚨 DEMO: Fire reported near Stage area — Immediate evacuation required!', location:'Stage' });
      setActionResult('emergency',{ type:'danger', message:'🚨 Emergency simulated! Check the Emergency page and the Panic Button.' });
    } catch(e) { setActionResult('emergency',{ type:'error', message:'❌ Failed to simulate emergency: '+(e.response?.data?.message||e.message) }); }
    setActionLoading('emergency',false);
  };

  const resetAllData = async () => {
    if(!window.confirm('⚠️ This will reset ALL demo data. Are you sure?')) return;
    setActionLoading('reset',true); setActionResult('reset',null);
    try {
      for(const zone of ['Auditorium','Cafeteria','Stage','Entrance']){ try{ await crowdAPI.update({zone,count:0}); }catch(e){} }
      try{ await emergencyAPI.resolvePanic({resolve_all:true}); }catch(e){}
      setActionResult('reset',{ type:'success', message:'✅ Reset complete! Crowd set to 0, emergencies resolved.' });
    } catch(e) { setActionResult('reset',{ type:'error', message:'❌ Reset failed: '+e.message }); }
    setActionLoading('reset',false);
  };

  const ACTIONS = [
    { key:'students', icon:'👥', title:'Generate 50 Students',    desc:'Creates 50 realistic student accounts with Indian names and emails',                color:'#a5b4fc', bg:'rgba(6,7,20,0.85)',     border:'rgba(99,102,241,0.35)',  btnBg:'linear-gradient(135deg,#6366f1,#4f46e5)', btnShadow:'rgba(99,102,241,0.45)', topBar:'linear-gradient(90deg,#6366f1,#818cf8)', action:generateStudents, tag:'Creates accounts', time:'~15 sec' },
    { key:'events',   icon:'🎉', title:'Generate 5 Events',        desc:'Creates 5 realistic campus events with venues, budgets and capacities',              color:'#67e8f9', bg:'rgba(3,14,22,0.88)',     border:'rgba(6,182,212,0.35)',   btnBg:'linear-gradient(135deg,#06b6d4,#0891b2)', btnShadow:'rgba(6,182,212,0.45)',  topBar:'linear-gradient(90deg,#06b6d4,#67e8f9)', action:generateEvents,   tag:'Creates events',   time:'~3 sec'  },
    { key:'crowd',    icon:'🔴', title:'Generate Crowd Surge',     desc:'Sets all 4 zones to critical crowd levels (75-95 people) for demo',                 color:'#fde68a', bg:'rgba(18,12,3,0.88)',     border:'rgba(245,158,11,0.35)', btnBg:'linear-gradient(135deg,#f59e0b,#d97706)',  btnShadow:'rgba(245,158,11,0.45)', topBar:'linear-gradient(90deg,#f59e0b,#fde68a)', action:generateCrowdSurge, tag:'Updates crowd', time:'~2 sec'  },
    { key:'emergency',icon:'🚨', title:'Simulate Emergency',       desc:'Triggers a critical emergency alert for demo — activates panic mode',               color:'#fca5a5', bg:'rgba(20,4,4,0.90)',      border:'rgba(239,68,68,0.35)',  btnBg:'linear-gradient(135deg,#ef4444,#dc2626)',  btnShadow:'rgba(239,68,68,0.45)',  topBar:'linear-gradient(90deg,#ef4444,#fca5a5)', action:simulateEmergency, tag:'Triggers alert', time:'~1 sec'  },
    { key:'reset',    icon:'↺', title:'Reset All Data',            desc:'Resets crowd counts to 0 and resolves all active emergency alerts',                  color:'rgba(255,255,255,0.7)', bg:'rgba(8,8,14,0.88)', border:'rgba(255,255,255,0.12)', btnBg:'linear-gradient(135deg,rgba(255,255,255,0.12),rgba(255,255,255,0.06))', btnShadow:'rgba(255,255,255,0.08)', topBar:'linear-gradient(90deg,rgba(255,255,255,0.2),rgba(255,255,255,0.05))', action:resetAllData, tag:'Resets data', time:'~3 sec' },
  ];

  return (
    <>
      <BeamsBackground />
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap');
        * { box-sizing:border-box; }
        .ad-root { font-family:'Plus Jakarta Sans',sans-serif; color:white; animation:adFadeIn 0.5s ease; position:relative; z-index:1; }
        @keyframes adFadeIn { from{opacity:0;transform:translateY(12px);}to{opacity:1;transform:translateY(0);} }
        .ad-header { margin-bottom:32px; }
        .ad-badge { display:inline-flex; align-items:center; gap:6px; background:rgba(245,158,11,0.12); border:1px solid rgba(245,158,11,0.28); border-radius:100px; padding:4px 14px; font-size:11px; font-weight:700; color:#fde68a; text-transform:uppercase; letter-spacing:1px; margin-bottom:14px; }
        .ad-title { font-size:28px; font-weight:800; color:white; letter-spacing:-1px; margin-bottom:8px; }
        .ad-sub { font-size:15px; color:rgba(255,255,255,0.5); line-height:1.6; max-width:560px; }
        .ad-warn { background:rgba(245,158,11,0.05); border:1px solid rgba(245,158,11,0.18); border-radius:14px; padding:16px 20px; display:flex; align-items:flex-start; gap:12px; margin-bottom:32px; font-size:13px; color:rgba(255,255,255,0.6); line-height:1.6; }
        .ad-warn-icon { font-size:18px; flex-shrink:0; margin-top:1px; }
        .ad-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(320px,1fr)); gap:16px; margin-bottom:32px; }
        .ad-card { border-radius:20px; padding:0; transition:all 0.3s cubic-bezier(0.34,1.56,0.64,1); position:relative; overflow:hidden; box-shadow:0 8px 32px rgba(0,0,0,0.5),inset 0 1px 0 rgba(255,255,255,0.04); }
        .ad-card:hover { transform:translateY(-4px); box-shadow:0 20px 60px rgba(0,0,0,0.65),inset 0 1px 0 rgba(255,255,255,0.06); }
        .ad-card-topbar { height:3px; width:100%; border-radius:20px 20px 0 0; }
        .ad-card-body { padding:22px 24px 24px; }
        .ad-card-top { display:flex; align-items:flex-start; justify-content:space-between; margin-bottom:16px; }
        .ad-card-icon { width:52px; height:52px; border-radius:14px; display:flex; align-items:center; justify-content:center; font-size:24px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.08); flex-shrink:0; }
        .ad-card-tags { display:flex; flex-direction:column; align-items:flex-end; gap:4px; }
        .ad-tag { font-size:10px; font-weight:700; padding:3px 10px; border-radius:100px; background:rgba(255,255,255,0.06); color:rgba(255,255,255,0.55); text-transform:uppercase; letter-spacing:0.5px; border:1px solid rgba(255,255,255,0.08); }
        .ad-time { font-size:10px; color:rgba(255,255,255,0.35); font-weight:500; }
        .ad-card-title { font-size:17px; font-weight:800; color:rgba(255,255,255,0.95); letter-spacing:-0.3px; margin-bottom:8px; }
        .ad-card-desc { font-size:13px; color:rgba(255,255,255,0.55); line-height:1.65; margin-bottom:20px; }
        .ad-result { border-radius:10px; padding:10px 14px; font-size:13px; font-weight:600; margin-bottom:14px; line-height:1.5; animation:adResultIn 0.4s cubic-bezier(0.16,1,0.3,1); }
        @keyframes adResultIn { from{opacity:0;transform:translateY(6px);}to{opacity:1;transform:translateY(0);} }
        .ad-btn { width:100%; height:44px; border:none; border-radius:12px; color:white; font-size:14px; font-weight:700; cursor:pointer; font-family:'Plus Jakarta Sans',sans-serif; display:flex; align-items:center; justify-content:center; gap:8px; transition:all 0.3s cubic-bezier(0.34,1.56,0.64,1); }
        .ad-btn:hover:not(:disabled) { transform:translateY(-2px); filter:brightness(1.1); }
        .ad-btn:disabled { opacity:0.5; cursor:not-allowed; transform:none; }
        .ad-spinner { width:16px; height:16px; border:2px solid rgba(255,255,255,0.25); border-top-color:white; border-radius:50%; animation:adSpin 0.7s linear infinite; }
        @keyframes adSpin { to{transform:rotate(360deg);} }
        .ad-progress { height:2px; background:rgba(255,255,255,0.06); border-radius:100px; overflow:hidden; margin-bottom:14px; }
        .ad-progress-fill { height:100%; border-radius:100px; animation:adProgress 15s linear; }
        @keyframes adProgress { from{width:0%;}to{width:100%;} }
        .ad-info { background:rgba(5,6,15,0.85); border:1px solid rgba(255,255,255,0.09); border-radius:16px; padding:20px 24px; box-shadow:0 8px 32px rgba(0,0,0,0.4); }
        .ad-info-title { font-size:13px; font-weight:700; color:rgba(255,255,255,0.6); text-transform:uppercase; letter-spacing:0.8px; margin-bottom:14px; }
        @media(max-width:700px){ .ad-grid{grid-template-columns:1fr;} }
      `}</style>

      <div className="ad-root">
        <div className="ad-header">
          <div className="ad-badge">⚡ Admin Only</div>
          <div className="ad-title">Demo Data Generator 🎮</div>
          <div className="ad-sub">Generate realistic demo data to showcase CampusFlow at the hackathon. All actions are reversible — use Reset to clean up.</div>
        </div>

        <div className="ad-warn">
          <span className="ad-warn-icon">⚠️</span>
          <div>
            <strong style={{ color:'rgba(255,255,255,0.85)' }}>Demo Environment Only.</strong>{' '}
            These actions generate fake data for presentation purposes. Student accounts use password{' '}
            <code style={{ background:'rgba(255,255,255,0.08)', padding:'1px 6px', borderRadius:'4px', fontSize:'12px', color:'rgba(255,255,255,0.8)' }}>student123</code>.
            Run "Reset All Data" after your demo to clean up.
          </div>
        </div>

        <div className="ad-grid">
          {ACTIONS.map(action => {
            const isLoading = loading[action.key];
            const result = results[action.key];
            const resultStyle = {
              success:{ bg:'rgba(34,197,94,0.1)',  border:'rgba(34,197,94,0.3)',  color:'#86efac' },
              warning:{ bg:'rgba(245,158,11,0.1)', border:'rgba(245,158,11,0.3)', color:'#fde68a' },
              danger: { bg:'rgba(239,68,68,0.1)',  border:'rgba(239,68,68,0.3)',  color:'#fca5a5' },
              error:  { bg:'rgba(239,68,68,0.1)',  border:'rgba(239,68,68,0.3)',  color:'#fca5a5' },
            }[result?.type] || {};
            return (
              <div key={action.key} className="ad-card" style={{ background:action.bg, border:`1px solid ${action.border}` }}>
                <div className="ad-card-topbar" style={{ background:action.topBar }} />
                <div className="ad-card-body">
                  <div className="ad-card-top">
                    <div className="ad-card-icon">{action.icon}</div>
                    <div className="ad-card-tags">
                      <div className="ad-tag">{action.tag}</div>
                      <div className="ad-time">⏱ {action.time}</div>
                    </div>
                  </div>
                  <div className="ad-card-title" style={{ color:action.color }}>{action.title}</div>
                  <div className="ad-card-desc">{action.desc}</div>
                  {isLoading && <div className="ad-progress"><div className="ad-progress-fill" style={{ background:action.btnBg }} /></div>}
                  {result && !isLoading && (
                    <div className="ad-result" style={{ background:resultStyle.bg, border:`1px solid ${resultStyle.border}`, color:resultStyle.color }}>{result.message}</div>
                  )}
                  <button className="ad-btn" style={{ background:action.btnBg, boxShadow:`0 4px 20px ${action.btnShadow}` }} onClick={action.action} disabled={isLoading}>
                    {isLoading ? <><div className="ad-spinner" /> Running...</> : <>{action.icon} {action.title}</>}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="ad-info">
          <div className="ad-info-title">📋 Recommended Demo Flow</div>
          <div style={{ fontSize:'13px', color:'rgba(255,255,255,0.5)', lineHeight:'1.9' }}>
            <strong style={{ color:'rgba(255,255,255,0.85)' }}>Step 1:</strong> Generate 5 Events → shows the Events page with real data<br />
            <strong style={{ color:'rgba(255,255,255,0.85)' }}>Step 2:</strong> Generate 50 Students → shows user management scale<br />
            <strong style={{ color:'rgba(255,255,255,0.85)' }}>Step 3:</strong> Generate Crowd Surge → shows red zones on Crowd Monitor<br />
            <strong style={{ color:'rgba(255,255,255,0.85)' }}>Step 4:</strong> Simulate Emergency → shows panic button in action<br />
            <strong style={{ color:'rgba(255,255,255,0.85)' }}>Step 5:</strong> Reset All Data → clean slate for next demo
          </div>
        </div>
      </div>
    </>
  );
};

export default AdminDemo;