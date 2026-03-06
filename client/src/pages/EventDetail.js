import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { eventsAPI, registrationsAPI } from '../utils/api';
import Payment from '../components/Payment';

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
    const x=e.clientX,y=e.clientY,id=++idRef.current,count=18;
    const ns=Array.from({length:count},(_,i)=>({
      id:`${id}-${i}`,x,y,angle:(i/count)*360,
      dist:(40+Math.random()*30)*1.2,size:2.5+Math.random()*3,
      color:['#4eaec6','#93d8e8','#ffffff','#2a8fa8','#60d8f0','#b3eef8'][Math.floor(Math.random()*6)],
    }));
    setSparks(s=>[...s,...ns]);
    setTimeout(()=>setSparks(s=>s.filter(sp=>!ns.find(n=>n.id===sp.id))),700);
  },[]);
  return (
    <div style={{position:'relative',width:'100%'}} onClick={fire}>
      {sparks.map(sp=>(
        <span key={sp.id} style={{
          position:'fixed',left:sp.x,top:sp.y,width:sp.size,height:sp.size,
          borderRadius:'50%',background:sp.color,pointerEvents:'none',zIndex:9999,
          transform:'translate(-50%,-50%)',boxShadow:`0 0 ${sp.size*2}px ${sp.color}`,
          animation:`edspk${Math.round(sp.angle)} 0.65s ease-out forwards`,
        }}/>
      ))}
      <style>{`${Array.from({length:360},(_,i)=>`@keyframes edspk${i}{0%{opacity:1;transform:translate(-50%,-50%) scale(1);}100%{opacity:0;transform:translate(-50%,-50%) translate(${Math.cos(i*Math.PI/180)*72}px,${Math.sin(i*Math.PI/180)*72}px) scale(0);}}`).join('')}`}</style>
      {children}
    </div>
  );
};

// ─── MAGIC BENTO ──────────────────────────────────────────────────────────────
const MagicBento = ({ children, className='', style={}, onClick, tilt=false }) => {
  const ref = useRef(null);
  const [spot, setSpot] = useState({x:'50%',y:'50%',op:0});
  const [ripples, setRipples] = useState([]);
  const [tiltVal, setTiltVal] = useState({rx:0,ry:0});
  const rid = useRef(0);

  const onMove = useCallback((e)=>{
    const r=ref.current?.getBoundingClientRect(); if(!r) return;
    const x=((e.clientX-r.left)/r.width)*100;
    const y=((e.clientY-r.top)/r.height)*100;
    setSpot({x:`${x}%`,y:`${y}%`,op:1});
    if(tilt){
      setTiltVal({
        rx:((e.clientY-r.top)/r.height-0.5)*-6,
        ry:((e.clientX-r.left)/r.width-0.5)*6,
      });
    }
  },[tilt]);
  const onLeave = useCallback(()=>{
    setSpot(s=>({...s,op:0}));
    setTiltVal({rx:0,ry:0});
  },[]);
  const onClickH = useCallback((e)=>{
    const r=ref.current?.getBoundingClientRect(); if(!r) return;
    const id=++rid.current;
    setRipples(rr=>[...rr,{id,x:e.clientX-r.left,y:e.clientY-r.top}]);
    setTimeout(()=>setRipples(rr=>rr.filter(rp=>rp.id!==id)),900);
    onClick&&onClick(e);
  },[onClick]);

  return (
    <div ref={ref} className={`mbento ${className}`}
      style={{
        ...style,
        transform: tilt ? `perspective(900px) rotateX(${tiltVal.rx}deg) rotateY(${tiltVal.ry}deg)` : undefined,
        transition: tilt ? 'transform 0.15s ease' : undefined,
      }}
      onMouseMove={onMove} onMouseLeave={onLeave} onClick={onClickH}>
      <div className="mb-spot" style={{
        background:`radial-gradient(circle 280px at ${spot.x} ${spot.y},rgba(78,174,198,0.18),transparent 70%)`,
        opacity:spot.op,
      }}/>
      {ripples.map(rp=><span key={rp.id} className="mb-ripple" style={{left:rp.x,top:rp.y}}/>)}
      <div className="mb-inner">{children}</div>
    </div>
  );
};

// ─── FLOATING PARTICLES ───────────────────────────────────────────────────────
const FloatingParticles = () => {
  const particles = Array.from({length:12},(_,i)=>({
    id:i,
    size: 2 + Math.random()*3,
    x: Math.random()*100,
    dur: 6 + Math.random()*8,
    delay: Math.random()*5,
    opacity: 0.15 + Math.random()*0.25,
  }));
  return (
    <div style={{position:'absolute',inset:0,overflow:'hidden',pointerEvents:'none',zIndex:0}}>
      {particles.map(p=>(
        <div key={p.id} style={{
          position:'absolute',
          left:`${p.x}%`,bottom:'-10px',
          width:p.size,height:p.size,
          borderRadius:'50%',
          background:'#4eaec6',
          opacity:p.opacity,
          boxShadow:`0 0 ${p.size*3}px #4eaec6`,
          animation:`floatUp ${p.dur}s ${p.delay}s ease-in-out infinite`,
        }}/>
      ))}
      <style>{`
        @keyframes floatUp {
          0%   { transform: translateY(0) scale(1); opacity: 0; }
          10%  { opacity: 1; }
          90%  { opacity: 0.5; }
          100% { transform: translateY(-200px) scale(0.3); opacity: 0; }
        }
      `}</style>
    </div>
  );
};

// ─── MAIN ─────────────────────────────────────────────────────────────────────
const EventDetail = () => {
  const { id } = useParams();
  const { user, isCommittee } = useAuth();
  const navigate = useNavigate();

  const [event, setEvent]               = useState(null);
  const [registrations, setRegistrations] = useState([]);
  const [myRegistration, setMyReg]      = useState(null);
  const [qrCode, setQrCode]             = useState(null);
  const [loading, setLoading]           = useState(true);
  const [registering, setRegistering]   = useState(false);
  const [generatingQR, setGeneratingQR] = useState(false);
  const [error, setError]               = useState('');
  const [regError, setRegError]         = useState('');
  const [activeTab, setActiveTab]       = useState('details');
  const [mounted, setMounted]           = useState(false);
  const [searchReg, setSearchReg]       = useState('');
  const [showPayment, setShowPayment]   = useState(false);

  useEffect(()=>{ fetchData(); },[id]);
  useEffect(()=>{ setTimeout(()=>setMounted(true),80); },[]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const eventRes = await eventsAPI.getOne(id);
      setEvent(eventRes.data.event);
      if(user){
        const myRegsRes = await registrationsAPI.getUserRegistrations(user.id);
        const found = (myRegsRes.data.registrations||[]).find(r=>r.event_id===id);
        if(found) setMyReg(found);
      }
      if(isCommittee){
        const regsRes = await registrationsAPI.getEventRegistrations(id);
        setRegistrations(regsRes.data.registrations||[]);
      }
    } catch(err){ setError('Failed to load event details.'); }
    finally { setLoading(false); }
  };

  const handleRegister = async () => {
    setShowPayment(true);
  };

  const handlePaymentSuccess = (reg) => {
    setMyReg(reg);
    setShowPayment(false);
    fetchData();
  };

  const handleGenerateQR = async () => {
    if(!myRegistration) return;
    setGeneratingQR(true);
    try {
      const res = await registrationsAPI.generateQR({ registration_id: myRegistration.id });
      setQrCode(res.data.qr_code);
    } catch(err){ setRegError('Failed to generate QR code.'); }
    finally { setGeneratingQR(false); }
  };

  const formatDate  = (d) => new Date(d).toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
  const formatShort = (d) => new Date(d).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'});

  const getStatus = (st) => ({
    upcoming:  {color:'#4eaec6', bg:'rgba(78,174,198,0.12)',  border:'rgba(78,174,198,0.3)',  grad:'linear-gradient(135deg,#4eaec6,#1d7a96)', label:'Upcoming'},
    ongoing:   {color:'#22c55e', bg:'rgba(34,197,94,0.12)',   border:'rgba(34,197,94,0.3)',   grad:'linear-gradient(135deg,#22c55e,#16a34a)', label:'Ongoing'},
    completed: {color:'rgba(255,255,255,0.45)', bg:'rgba(255,255,255,0.06)', border:'rgba(255,255,255,0.12)', grad:'linear-gradient(135deg,rgba(255,255,255,0.2),transparent)', label:'Completed'},
    cancelled: {color:'#f87171', bg:'rgba(239,68,68,0.12)',   border:'rgba(239,68,68,0.3)',   grad:'linear-gradient(135deg,#ef4444,#dc2626)', label:'Cancelled'},
  })[st]||{color:'#4eaec6',bg:'rgba(78,174,198,0.12)',border:'rgba(78,174,198,0.3)',grad:'linear-gradient(135deg,#4eaec6,#1d7a96)',label:st};

  const fillPct = event?.capacity ? Math.min(100, Math.round((registrations.length / event.capacity)*100)) : 0;

  // ── LOADING ─────────────────────────────────────────────────────────────────
  if(loading) return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&display=swap');
        .edl{font-family:'Space Grotesk',sans-serif;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:60vh;gap:14px;}
        .edl-ring{width:52px;height:52px;border:3px solid rgba(78,174,198,0.15);border-top-color:#4eaec6;border-radius:50%;animation:edSpin 0.75s linear infinite;}
        @keyframes edSpin{to{transform:rotate(360deg);}}
        .edl-text{color:rgba(255,255,255,0.25);font-size:13px;letter-spacing:0.5px;}
      `}</style>
      <div className="edl"><div className="edl-ring"/><div className="edl-text">Loading event...</div></div>
    </>
  );

  if(error||!event) return (
    <div style={{fontFamily:'Space Grotesk,sans-serif',textAlign:'center',padding:'80px 20px',color:'rgba(255,255,255,0.28)'}}>
      <div style={{fontSize:52,marginBottom:16}}>😕</div>
      <div style={{fontSize:20,fontWeight:700,marginBottom:8,background:'linear-gradient(135deg,rgba(255,255,255,0.5),rgba(78,174,198,0.5))',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>Event not found</div>
      <div style={{fontSize:13,marginBottom:24}}>{error}</div>
      <button onClick={()=>navigate('/events')} style={{padding:'10px 24px',background:'rgba(78,174,198,0.1)',border:'1px solid rgba(78,174,198,0.25)',borderRadius:10,color:'#4eaec6',cursor:'pointer',fontSize:13,fontFamily:'Space Grotesk,sans-serif'}}>← Back to Events</button>
    </div>
  );

  const s = getStatus(event.status);
  const filteredRegs = registrations.filter(r =>
    !searchReg ||
    r.users?.name?.toLowerCase().includes(searchReg.toLowerCase()) ||
    r.users?.email?.toLowerCase().includes(searchReg.toLowerCase())
  );

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&display=swap');
        *,*::before,*::after{margin:0;padding:0;box-sizing:border-box;}

        .ed-root{
          font-family:'Space Grotesk',sans-serif;color:white;
          position:relative;z-index:1;
          opacity:${mounted?1:0};transform:${mounted?'translateY(0)':'translateY(20px)'};
          transition:opacity 0.7s ease,transform 0.75s cubic-bezier(.16,1,.3,1);
        }

        /* MAGIC BENTO */
        .mbento{
          position:relative;overflow:hidden;
          background:rgba(5,12,32,0.70);
          border:1px solid rgba(78,174,198,0.15);
          border-radius:22px;
          backdrop-filter:blur(28px);-webkit-backdrop-filter:blur(28px);
          box-shadow:
            0 0 0 1px rgba(255,255,255,0.025),
            0 20px 60px rgba(0,0,0,0.45),
            inset 0 1px 0 rgba(78,174,198,0.1),
            inset 0 -1px 0 rgba(0,0,0,0.15);
        }
        .mb-spot{position:absolute;inset:0;pointer-events:none;transition:opacity 0.3s ease;z-index:0;border-radius:inherit;}
        .mb-ripple{
          position:absolute;transform:translate(-50%,-50%) scale(0);
          width:520px;height:520px;border-radius:50%;
          background:radial-gradient(circle,rgba(78,174,198,0.12) 0%,transparent 60%);
          animation:mbRipple 0.9s ease-out forwards;pointer-events:none;z-index:0;
        }
        @keyframes mbRipple{to{transform:translate(-50%,-50%) scale(1);opacity:0;}}
        .mb-inner{position:relative;z-index:1;}

        /* BACK BTN */
        .ed-back{
          display:inline-flex;align-items:center;gap:7px;
          color:rgba(255,255,255,0.32);font-size:12.5px;font-weight:500;
          cursor:pointer;margin-bottom:20px;padding:7px 15px;
          border-radius:10px;
          background:rgba(5,12,32,0.65);
          border:1px solid rgba(78,174,198,0.13);
          backdrop-filter:blur(14px);
          transition:all 0.2s ease;
        }
        .ed-back:hover{color:white;border-color:rgba(78,174,198,0.32);background:rgba(78,174,198,0.07);}
        .ed-back-arrow{transition:transform 0.2s ease;}
        .ed-back:hover .ed-back-arrow{transform:translateX(-3px);}

        /* ══════════════ HERO ══════════════ */
        .ed-hero{margin-bottom:20px;}

        .ed-hero-banner{
          height:200px;position:relative;
          display:flex;align-items:center;justify-content:center;
          overflow:hidden;border-radius:22px 22px 0 0;
        }
        .ed-hb-base{
          position:absolute;inset:0;
          background:linear-gradient(135deg,rgba(5,15,40,0.95),rgba(5,20,50,0.9));
        }
        .ed-hb-glow1{
          position:absolute;
          width:400px;height:400px;border-radius:50%;
          background:radial-gradient(circle,rgba(78,174,198,0.22),transparent 70%);
          top:-100px;left:-80px;animation:slowDrift1 12s ease-in-out infinite;
        }
        .ed-hb-glow2{
          position:absolute;
          width:350px;height:350px;border-radius:50%;
          background:radial-gradient(circle,rgba(29,122,150,0.18),transparent 70%);
          bottom:-80px;right:-60px;animation:slowDrift2 15s ease-in-out infinite;
        }
        @keyframes slowDrift1{0%,100%{transform:translate(0,0);}50%{transform:translate(30px,-20px);}}
        @keyframes slowDrift2{0%,100%{transform:translate(0,0);}50%{transform:translate(-25px,15px);}}

        .ed-hb-grid{
          position:absolute;inset:0;
          background-image:
            linear-gradient(rgba(78,174,198,0.05) 1px,transparent 1px),
            linear-gradient(90deg,rgba(78,174,198,0.05) 1px,transparent 1px);
          background-size:40px 40px;
        }
        .ed-hb-statusbar{
          position:absolute;top:0;left:0;right:0;height:3px;z-index:3;
        }

        .ed-hero-emoji{
          font-size:80px;position:relative;z-index:2;
          filter:drop-shadow(0 12px 40px rgba(78,174,198,0.6)) drop-shadow(0 0 80px rgba(78,174,198,0.3));
          animation:floatEmoji 4s ease-in-out infinite;
        }
        @keyframes floatEmoji{0%,100%{transform:translateY(0) scale(1);}50%{transform:translateY(-10px) scale(1.04);}}

        .ed-hero-body{
          padding:24px 28px 0;
          display:flex;align-items:flex-start;justify-content:space-between;
          gap:20px;flex-wrap:wrap;
        }
        .ed-hero-left{flex:1;min-width:240px;}
        .ed-hero-tags{display:flex;align-items:center;gap:8px;margin-bottom:12px;flex-wrap:wrap;}
        .ed-tag{
          font-size:10px;font-weight:700;padding:4px 11px;border-radius:100px;
          letter-spacing:0.5px;text-transform:uppercase;backdrop-filter:blur(8px);
          border:1px solid transparent;
        }

        .ed-hero-title{
          font-size:clamp(20px,2.8vw,28px);font-weight:700;letter-spacing:-1px;
          margin-bottom:9px;line-height:1.18;
          background:linear-gradient(140deg,#ffffff 0%,#caf0f8 45%,#7dd3e8 80%,#4eaec6 100%);
          -webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;
          filter:drop-shadow(0 0 22px rgba(78,174,198,0.35));
        }
        .ed-hero-desc{
          font-size:13px;color:rgba(255,255,255,0.35);line-height:1.75;
          font-weight:300;max-width:520px;
        }

        .ed-hero-right{display:flex;flex-direction:column;align-items:flex-end;gap:10px;padding-top:4px;}
        .ed-budget-wrap{
          text-align:right;padding:12px 16px;border-radius:14px;
          background:rgba(245,158,11,0.08);border:1px solid rgba(245,158,11,0.18);
        }
        .ed-budget-label{
          font-size:9.5px;color:rgba(245,158,11,0.6);text-transform:uppercase;
          letter-spacing:1px;font-weight:700;display:block;margin-bottom:4px;
        }
        .ed-budget-value{
          font-size:28px;font-weight:700;letter-spacing:-1.5px;
          background:linear-gradient(135deg,#fef08a,#fcd34d,#f59e0b);
          -webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;
          filter:drop-shadow(0 0 14px rgba(245,158,11,0.45));
        }

        .ed-cap-bar-wrap{padding:18px 28px 20px;}
        .ed-cap-bar-top{
          display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;
        }
        .ed-cap-bar-label{font-size:11px;color:rgba(255,255,255,0.3);font-weight:500;}
        .ed-cap-bar-pct{
          font-size:12px;font-weight:700;
          background:linear-gradient(135deg,#4eaec6,#93d8e8);
          -webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;
        }
        .ed-cap-bar-track{
          height:5px;border-radius:100px;background:rgba(255,255,255,0.06);overflow:hidden;
        }
        .ed-cap-bar-fill{
          height:100%;border-radius:100px;
          background:linear-gradient(90deg,#1d7a96,#4eaec6,#93d8e8);
          box-shadow:0 0 8px rgba(78,174,198,0.5);
          transition:width 1s cubic-bezier(.16,1,.3,1);
        }

        .ed-info-grid{
          display:grid;grid-template-columns:repeat(4,1fr);
          border-top:1px solid rgba(78,174,198,0.1);
          border-radius:0 0 22px 22px;overflow:hidden;
          gap:1px;background:rgba(78,174,198,0.07);
        }
        .ed-info-cell{
          background:rgba(4,10,28,0.88);padding:16px 20px;
          display:flex;align-items:center;gap:10px;
          transition:background 0.2s ease;
          cursor:default;
        }
        .ed-info-cell:hover{background:rgba(78,174,198,0.06);}
        .ed-info-icon{
          width:34px;height:34px;border-radius:9px;
          display:flex;align-items:center;justify-content:center;
          font-size:15px;flex-shrink:0;
          backdrop-filter:blur(6px);
        }
        .ed-info-lbl{
          font-size:9.5px;color:rgba(255,255,255,0.26);text-transform:uppercase;
          letter-spacing:0.7px;font-weight:600;display:block;margin-bottom:3px;
        }
        .ed-info-val{font-size:12.5px;font-weight:600;color:rgba(255,255,255,0.85);}

        .ed-tabs{
          display:flex;gap:3px;
          background:rgba(4,10,28,0.7);
          border:1px solid rgba(78,174,198,0.13);
          border-radius:13px;padding:4px;
          margin-bottom:20px;width:fit-content;
          backdrop-filter:blur(16px);
        }
        .ed-tab{
          padding:9px 18px;border-radius:9px;font-size:12.5px;font-weight:600;
          cursor:pointer;border:1px solid transparent;
          font-family:'Space Grotesk',sans-serif;transition:all 0.2s ease;
          color:rgba(255,255,255,0.36);background:transparent;
        }
        .ed-tab.active{
          background:rgba(78,174,198,0.13);color:#93d8e8;
          border-color:rgba(78,174,198,0.26);
          box-shadow:0 0 16px rgba(78,174,198,0.1),inset 0 1px 0 rgba(78,174,198,0.1);
        }
        .ed-tab:hover:not(.active){color:rgba(255,255,255,0.72);background:rgba(255,255,255,0.04);}

        .ed-grid{display:grid;grid-template-columns:1fr 330px;gap:18px;}

        .ed-sec-head{
          padding:18px 22px;border-bottom:1px solid rgba(255,255,255,0.05);
          display:flex;align-items:center;justify-content:space-between;
        }
        .ed-sec-title{
          font-size:13.5px;font-weight:700;letter-spacing:-0.2px;
          background:linear-gradient(135deg,#ffffff,#93d8e8);
          -webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;
        }
        .ed-sec-sub{font-size:11px;color:rgba(255,255,255,0.24);margin-top:2px;}

        .ed-field{
          display:flex;align-items:center;gap:13px;
          padding:12px 22px;
          border-bottom:1px solid rgba(255,255,255,0.04);
          transition:background 0.15s;
        }
        .ed-field:last-child{border-bottom:none;}
        .ed-field:hover{background:rgba(78,174,198,0.03);}
        .ed-fi{
          width:32px;height:32px;border-radius:8px;
          background:rgba(78,174,198,0.08);border:1px solid rgba(78,174,198,0.13);
          display:flex;align-items:center;justify-content:center;
          font-size:14px;flex-shrink:0;
        }
        .ed-fl{
          font-size:9.5px;color:rgba(255,255,255,0.26);text-transform:uppercase;
          letter-spacing:0.8px;font-weight:600;display:block;margin-bottom:2px;
        }
        .ed-fv{font-size:13px;font-weight:600;color:rgba(255,255,255,0.82);}

        .ed-desc-box{
          margin:4px 22px 16px;padding:14px 16px;
          background:rgba(78,174,198,0.05);border:1px solid rgba(78,174,198,0.1);
          border-radius:12px;
        }
        .ed-desc-lbl{
          font-size:9.5px;color:rgba(78,174,198,0.55);text-transform:uppercase;
          letter-spacing:1px;font-weight:700;margin-bottom:8px;display:block;
        }
        .ed-desc-text{font-size:13px;color:rgba(255,255,255,0.4);line-height:1.75;font-weight:300;}

        .ed-reg-panel{padding:20px;}

        .ed-reg-status-box{
          display:flex;align-items:center;gap:12px;
          padding:13px 15px;border-radius:13px;margin-bottom:16px;
          backdrop-filter:blur(8px);
        }
        .ed-reg-si{
          width:40px;height:40px;border-radius:11px;
          display:flex;align-items:center;justify-content:center;
          font-size:18px;flex-shrink:0;
        }
        .ed-reg-st{font-size:13.5px;font-weight:700;color:white;margin-bottom:2px;}
        .ed-reg-ss{font-size:11px;color:rgba(255,255,255,0.3);}

        .ed-reg-btn{
          width:100%;height:48px;
          background:linear-gradient(135deg,#1d7a96,#1560a0);
          border:1px solid rgba(78,174,198,0.32);border-radius:13px;
          color:white;font-size:14px;font-weight:700;cursor:pointer;
          font-family:'Space Grotesk',sans-serif;
          transition:all 0.3s cubic-bezier(.16,1,.3,1);
          box-shadow:0 4px 20px rgba(78,174,198,0.32),inset 0 1px 0 rgba(255,255,255,0.1);
          display:flex;align-items:center;justify-content:center;gap:8px;
          margin-bottom:10px;position:relative;overflow:hidden;
        }
        .ed-reg-btn::before{
          content:'';position:absolute;top:0;left:-100%;width:55%;height:100%;
          background:linear-gradient(90deg,transparent,rgba(255,255,255,0.12),transparent);
          transition:left 0.5s ease;
        }
        .ed-reg-btn:hover:not(:disabled)::before{left:160%;}
        .ed-reg-btn:hover:not(:disabled){transform:translateY(-2px);box-shadow:0 8px 28px rgba(78,174,198,0.48);}
        .ed-reg-btn:disabled{opacity:0.42;cursor:not-allowed;}

        .ed-qr-btn{
          width:100%;height:42px;
          background:rgba(78,174,198,0.09);border:1px solid rgba(78,174,198,0.22);
          border-radius:11px;color:#4eaec6;font-size:13px;font-weight:600;
          cursor:pointer;font-family:'Space Grotesk',sans-serif;transition:all 0.2s ease;
          display:flex;align-items:center;justify-content:center;gap:7px;
        }
        .ed-qr-btn:hover{background:rgba(78,174,198,0.16);color:#93d8e8;}
        .ed-qr-btn:disabled{opacity:0.42;cursor:not-allowed;}

        .ed-qr-wrap{
          background:white;border-radius:16px;padding:18px;
          text-align:center;margin-top:13px;
          box-shadow:0 12px 40px rgba(0,0,0,0.35),0 0 0 1px rgba(78,174,198,0.1);
        }
        .ed-qr-img{width:100%;max-width:180px;border-radius:8px;margin-bottom:10px;}
        .ed-qr-lbl{font-size:11px;color:#374151;font-weight:700;letter-spacing:0.3px;}
        .ed-qr-id{font-size:9.5px;color:#9ca3af;margin-top:3px;font-family:monospace;}

        .ed-stat-row{
          display:flex;align-items:center;justify-content:space-between;
          padding:11px 22px;border-bottom:1px solid rgba(255,255,255,0.04);
          transition:background 0.15s;
        }
        .ed-stat-row:last-child{border-bottom:none;}
        .ed-stat-row:hover{background:rgba(78,174,198,0.03);}
        .ed-stat-left{display:flex;align-items:center;gap:9px;}
        .ed-stat-lbl{font-size:12.5px;color:rgba(255,255,255,0.35);font-weight:500;}
        .ed-stat-val{
          font-size:20px;font-weight:700;letter-spacing:-0.5px;
          background:linear-gradient(135deg,#ffffff,var(--sv,#4eaec6));
          -webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;
        }

        .ed-err{
          background:rgba(239,68,68,0.07);border:1px solid rgba(239,68,68,0.18);
          border-radius:10px;padding:10px 13px;font-size:12.5px;color:#fca5a5;margin-top:10px;
        }

        .ed-reg-search{
          margin:12px 22px 0;
          background:rgba(255,255,255,0.04);border:1.5px solid rgba(78,174,198,0.12);
          border-radius:10px;padding:9px 13px;
          font-size:13px;color:white;font-family:'Space Grotesk',sans-serif;
          outline:none;width:calc(100% - 44px);transition:all 0.2s ease;
        }
        .ed-reg-search:focus{border-color:rgba(78,174,198,0.4);background:rgba(78,174,198,0.05);}
        .ed-reg-search::placeholder{color:rgba(255,255,255,0.18);}

        .ed-reg-row{
          display:flex;align-items:center;gap:13px;
          padding:13px 22px;
          border-bottom:1px solid rgba(255,255,255,0.03);
          transition:background 0.2s;
        }
        .ed-reg-row:last-child{border-bottom:none;}
        .ed-reg-row:hover{background:rgba(78,174,198,0.03);}
        .ed-reg-av{
          width:34px;height:34px;border-radius:9px;
          background:linear-gradient(135deg,#1d7a96,#1560a0);
          display:flex;align-items:center;justify-content:center;
          font-size:13px;font-weight:700;color:white;flex-shrink:0;
          box-shadow:0 0 14px rgba(78,174,198,0.28);
        }
        .ed-reg-name{font-size:13px;font-weight:600;color:white;}
        .ed-reg-mail{font-size:11px;color:rgba(255,255,255,0.28);margin-top:1px;}
        .ed-pill{
          font-size:10px;font-weight:700;padding:3px 10px;border-radius:100px;
          flex-shrink:0;backdrop-filter:blur(6px);
        }

        .ed-empty{padding:48px 22px;text-align:center;color:rgba(255,255,255,0.2);}
        .ed-empty-ico{font-size:38px;display:block;margin-bottom:10px;opacity:0.32;}

        .ed-spin{
          width:14px;height:14px;border:2px solid rgba(255,255,255,0.22);
          border-top-color:white;border-radius:50%;animation:edSpin 0.6s linear infinite;
        }
        @keyframes edSpin{to{transform:rotate(360deg);}}
        .ed-spin-teal{border-top-color:#4eaec6;}

        @media(max-width:1020px){
          .ed-grid{grid-template-columns:1fr;}
          .ed-info-grid{grid-template-columns:repeat(2,1fr);}
          .ed-hero-body{flex-direction:column;}
          .ed-hero-right{align-items:flex-start;}
        }
        @media(max-width:580px){
          .ed-info-grid{grid-template-columns:1fr 1fr;}
          .ed-hero-emoji{font-size:60px;}
          .ed-hero-banner{height:160px;}
        }
      `}</style>

      <BeamsBackground />

      <ClickSpark>
        <div className="ed-root">

          {/* BACK */}
          <div className="ed-back" onClick={()=>navigate('/events')}>
            <span className="ed-back-arrow">←</span> Back to Events
          </div>

          {/* ══ HERO ══ */}
          <MagicBento className="ed-hero">
            <div className="ed-hero-banner">
              <div className="ed-hb-base"/>
              <div className="ed-hb-glow1"/>
              <div className="ed-hb-glow2"/>
              <div className="ed-hb-grid"/>
              <FloatingParticles/>
              <div className="ed-hb-statusbar" style={{background:s.grad}}/>
              <span className="ed-hero-emoji">🎉</span>
            </div>

            <div className="ed-hero-body">
              <div className="ed-hero-left">
                <div className="ed-hero-tags">
                  <div className="ed-tag" style={{color:s.color,background:s.bg,border:`1px solid ${s.border}`}}>{s.label}</div>
                  {event.date && (
                    <div className="ed-tag" style={{color:'rgba(255,255,255,0.36)',background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.09)'}}>
                      📅 {formatShort(event.date)}
                    </div>
                  )}
                  {event.venue && (
                    <div className="ed-tag" style={{color:'rgba(255,255,255,0.36)',background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.09)'}}>
                      📍 {event.venue}
                    </div>
                  )}
                </div>
                <div className="ed-hero-title">{event.name}</div>
                {event.description && <div className="ed-hero-desc">{event.description}</div>}
              </div>
              {event.budget && (
                <div className="ed-hero-right">
                  <div className="ed-budget-wrap">
                    <span className="ed-budget-label">Total Budget</span>
                    <div className="ed-budget-value">₹{parseFloat(event.budget).toLocaleString('en-IN')}</div>
                  </div>
                </div>
              )}
            </div>

            {event.capacity && (
              <div className="ed-cap-bar-wrap">
                <div className="ed-cap-bar-top">
                  <span className="ed-cap-bar-label">Capacity filled — {registrations.length} / {event.capacity}</span>
                  <span className="ed-cap-bar-pct">{fillPct}%</span>
                </div>
                <div className="ed-cap-bar-track">
                  <div className="ed-cap-bar-fill" style={{width:`${fillPct}%`}}/>
                </div>
              </div>
            )}

            <div className="ed-info-grid">
              {[
                {icon:'📅',label:'Date',    value:event.date?formatDate(event.date):'TBD',             bg:'rgba(78,174,198,0.1)'},
                {icon:'📍',label:'Venue',   value:event.venue||'TBD',                                   bg:'rgba(99,102,241,0.1)'},
                {icon:'👥',label:'Capacity',value:event.capacity?`${event.capacity} seats`:'Unlimited', bg:'rgba(34,197,94,0.1)'},
                {icon:'🎫',label:'Registered',value:`${registrations.length} students`,                 bg:'rgba(245,158,11,0.1)'},
              ].map(item=>(
                <div key={item.label} className="ed-info-cell">
                  <div className="ed-info-icon" style={{background:item.bg}}>{item.icon}</div>
                  <div>
                    <span className="ed-info-lbl">{item.label}</span>
                    <div className="ed-info-val">{item.value}</div>
                  </div>
                </div>
              ))}
            </div>
          </MagicBento>

          {/* TABS */}
          <div className="ed-tabs">
            {[
              {id:'details',label:'📋 Details'},
              ...(isCommittee?[{id:'registrations',label:`🎫 Registrations (${registrations.length})`}]:[]),
            ].map(tab=>(
              <button key={tab.id} className={`ed-tab ${activeTab===tab.id?'active':''}`} onClick={()=>setActiveTab(tab.id)}>
                {tab.label}
              </button>
            ))}
          </div>

          {/* ══ DETAILS TAB ══ */}
          {activeTab==='details' && (
            <div className="ed-grid">
              <MagicBento>
                <div className="ed-sec-head">
                  <div>
                    <div className="ed-sec-title">Event Information</div>
                    <div className="ed-sec-sub">Full details about this event</div>
                  </div>
                </div>
                {[
                  {icon:'🎉',label:'Event Name',value:event.name},
                  {icon:'📅',label:'Date',      value:event.date?formatDate(event.date):'TBD'},
                  {icon:'📍',label:'Venue',     value:event.venue||'TBD'},
                  {icon:'👥',label:'Capacity',  value:event.capacity?`${event.capacity} seats`:'Unlimited'},
                  {icon:'💰',label:'Budget',    value:event.budget?`₹${parseFloat(event.budget).toLocaleString('en-IN')}`:'N/A'},
                  {icon:'⚡',label:'Status',    value:event.status},
                ].map(item=>(
                  <div key={item.label} className="ed-field">
                    <div className="ed-fi">{item.icon}</div>
                    <div>
                      <span className="ed-fl">{item.label}</span>
                      <div className="ed-fv">{item.value}</div>
                    </div>
                  </div>
                ))}
                {event.description && (
                  <div className="ed-desc-box">
                    <span className="ed-desc-lbl">Description</span>
                    <div className="ed-desc-text">{event.description}</div>
                  </div>
                )}
              </MagicBento>

              <div style={{display:'flex',flexDirection:'column',gap:16}}>
                {user?.role==='student' && (
                  <MagicBento tilt>
                    <div className="ed-reg-panel">
                      <div className="ed-reg-status-box" style={{
                        background:myRegistration?'rgba(34,197,94,0.07)':'rgba(78,174,198,0.07)',
                        border:`1px solid ${myRegistration?'rgba(34,197,94,0.18)':'rgba(78,174,198,0.18)'}`,
                      }}>
                        <div className="ed-reg-si" style={{
                          background:myRegistration?'rgba(34,197,94,0.13)':'rgba(78,174,198,0.13)',
                          border:`1px solid ${myRegistration?'rgba(34,197,94,0.22)':'rgba(78,174,198,0.22)'}`,
                        }}>
                          {myRegistration?'✅':'🎫'}
                        </div>
                        <div>
                          <div className="ed-reg-st">{myRegistration?"You're registered!":'Register for this event'}</div>
                          <div className="ed-reg-ss">{myRegistration?`Payment: ${myRegistration.payment_status}`:event.status==='upcoming'?'Spots available':'Registration closed'}</div>
                        </div>
                      </div>
                      {!myRegistration && event.status==='upcoming' && (
                        <button className="ed-reg-btn" onClick={handleRegister}>
                          🎫 Register Now
                        </button>
                      )}
                      {myRegistration && (
                        <button className="ed-qr-btn" onClick={handleGenerateQR} disabled={generatingQR}>
                          {generatingQR?<><div className="ed-spin ed-spin-teal"/>Generating...</>:'📱 Get QR Code'}
                        </button>
                      )}
                      {regError && <div className="ed-err">⚠️ {regError}</div>}
                      {qrCode && (
                        <div className="ed-qr-wrap">
                          <img src={qrCode} alt="QR Code" className="ed-qr-img"/>
                          <div className="ed-qr-lbl">Your Entry QR Code</div>
                          <div className="ed-qr-id">ID: {myRegistration?.id?.slice(0,8)}…</div>
                        </div>
                      )}
                    </div>
                  </MagicBento>
                )}

                <MagicBento>
                  <div className="ed-sec-head">
                    <div>
                      <div className="ed-sec-title">Live Stats</div>
                      <div className="ed-sec-sub">Real-time numbers</div>
                    </div>
                    <div style={{display:'flex',alignItems:'center',gap:6,fontSize:11,color:'#22c55e',fontWeight:600}}>
                      <div style={{width:7,height:7,borderRadius:'50%',background:'#22c55e',boxShadow:'0 0 8px #22c55e',animation:'gdot 2s ease-in-out infinite'}}/>
                      Live
                    </div>
                  </div>
                  <style>{`@keyframes gdot{0%,100%{opacity:1;}50%{opacity:0.28;}}`}</style>
                  {[
                    {label:'Registered', value:registrations.length,                              icon:'🎫',color:'#818cf8'},
                    {label:'Checked In', value:registrations.filter(r=>r.checked_in).length,      icon:'✅',color:'#86efac'},
                    {label:'Capacity',   value:event.capacity||'∞',                               icon:'👥',color:'#4eaec6'},
                    {label:'Available',  value:event.capacity?Math.max(0,event.capacity-registrations.length):'∞',icon:'🎟️',color:'#fcd34d'},
                  ].map(stat=>(
                    <div key={stat.label} className="ed-stat-row">
                      <div className="ed-stat-left">
                        <span style={{fontSize:15}}>{stat.icon}</span>
                        <span className="ed-stat-lbl">{stat.label}</span>
                      </div>
                      <span className="ed-stat-val" style={{'--sv':stat.color}}>{stat.value}</span>
                    </div>
                  ))}
                </MagicBento>
              </div>
            </div>
          )}

          {/* ══ REGISTRATIONS TAB ══ */}
          {activeTab==='registrations' && isCommittee && (
            <MagicBento>
              <div className="ed-sec-head">
                <div>
                  <div className="ed-sec-title">Registered Students</div>
                  <div className="ed-sec-sub">{registrations.length} students registered</div>
                </div>
                <div className="ed-pill" style={{color:'#4eaec6',background:'rgba(78,174,198,0.1)',border:'1px solid rgba(78,174,198,0.22)'}}>
                  {registrations.filter(r=>r.checked_in).length} checked in
                </div>
              </div>
              <input
                className="ed-reg-search"
                placeholder="Search by name or email…"
                value={searchReg}
                onChange={e=>setSearchReg(e.target.value)}
              />
              <div style={{height:12}}/>
              {filteredRegs.length===0 ? (
                <div className="ed-empty">
                  <span className="ed-empty-ico">🎫</span>
                  {searchReg ? `No results for "${searchReg}"` : 'No students registered yet'}
                </div>
              ) : filteredRegs.map((reg)=>(
                <div key={reg.id} className="ed-reg-row">
                  <div className="ed-reg-av">{reg.users?.name?.charAt(0)?.toUpperCase()||'?'}</div>
                  <div style={{flex:1}}>
                    <div className="ed-reg-name">{reg.users?.name||'Unknown'}</div>
                    <div className="ed-reg-mail">{reg.users?.email||''}</div>
                  </div>
                  <div className="ed-pill" style={{
                    color:reg.payment_status==='paid'?'#86efac':'#fcd34d',
                    background:reg.payment_status==='paid'?'rgba(34,197,94,0.1)':'rgba(245,158,11,0.1)',
                    border:`1px solid ${reg.payment_status==='paid'?'rgba(34,197,94,0.2)':'rgba(245,158,11,0.2)'}`,
                  }}>{reg.payment_status}</div>
                  <div className="ed-pill" style={{
                    color:reg.checked_in?'#86efac':'rgba(255,255,255,0.28)',
                    background:reg.checked_in?'rgba(34,197,94,0.1)':'rgba(255,255,255,0.04)',
                    border:`1px solid ${reg.checked_in?'rgba(34,197,94,0.2)':'rgba(255,255,255,0.06)'}`,
                  }}>{reg.checked_in?'✅ In':'⏳ Pending'}</div>
                </div>
              ))}
            </MagicBento>
          )}

        </div>
      </ClickSpark>

      {showPayment && (
        <Payment
          event={event}
          onSuccess={handlePaymentSuccess}
          onClose={() => setShowPayment(false)}
        />
      )}
    </>
  );
};

export default EventDetail;