import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { eventsAPI } from '../utils/api';

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
      color:['#4eaec6','#93d8e8','#ffffff','#2a8fa8','#60d8f0'][Math.floor(Math.random()*5)],
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
          animation:`evspk${Math.round(sp.angle)} 0.65s ease-out forwards`,
        }}/>
      ))}
      <style>{`${Array.from({length:360},(_,i)=>`@keyframes evspk${i}{0%{opacity:1;transform:translate(-50%,-50%) scale(1);}100%{opacity:0;transform:translate(-50%,-50%) translate(${Math.cos(i*Math.PI/180)*72}px,${Math.sin(i*Math.PI/180)*72}px) scale(0);}}`).join('')}`}</style>
      {children}
    </div>
  );
};

// ─── FLOWING MENU ─────────────────────────────────────────────────────────────
const FlowingMenuItem = ({ label, emoji, active, onClick, color, count }) => {
  const itemRef    = useRef(null);
  const marqueeRef = useRef(null);
  const innerRef   = useRef(null);
  const animRef    = useRef(null);
  const posRef     = useRef(0);
  const speed      = useRef(0);
  const [hovered, setHovered] = useState(false);
  const [marqueeY, setMarqueeY]   = useState(101);
  const [innerY,   setInnerY]     = useState(-101);

  useEffect(() => {
    let raf;
    const run = () => {
      posRef.current -= speed.current;
      if (innerRef.current) {
        innerRef.current.style.transform = `translate3d(${posRef.current}px,0,0)`;
        const w = innerRef.current.scrollWidth / 2;
        if (Math.abs(posRef.current) >= w) posRef.current = 0;
      }
      raf = requestAnimationFrame(run);
    };
    raf = requestAnimationFrame(run);
    return () => cancelAnimationFrame(raf);
  }, []);

  const getDir = (e) => {
    const r = itemRef.current?.getBoundingClientRect();
    if (!r) return 1;
    const y = e.clientY - r.top;
    return y < r.height / 2 ? -1 : 1;
  };

  const onEnter = (e) => {
    const dir = getDir(e);
    setMarqueeY(dir < 0 ? -101 : 101);
    setInnerY(dir < 0 ? 101 : -101);
    setHovered(true);
    speed.current = 1.8;
    setTimeout(() => { setMarqueeY(0); setInnerY(0); }, 10);
  };

  const onLeave = (e) => {
    const dir = getDir(e);
    setMarqueeY(dir < 0 ? -101 : 101);
    setInnerY(dir < 0 ? 101 : -101);
    setHovered(false);
    setTimeout(() => speed.current = 1.8, 300);
  };

  const repeats = 6;
  const marqueeText = Array(repeats).fill(null).map((_, i) => (
    <span key={i} className="fm-mq-item">
      <span className="fm-mq-emoji">{emoji}</span>
      {label}
      {count !== undefined && <span className="fm-mq-count">{count}</span>}
      <span className="fm-mq-sep">·</span>
    </span>
  ));

  return (
    <div
      ref={itemRef}
      className={`fm-item ${active ? 'fm-active' : ''}`}
      style={{ '--fm-color': color }}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      onClick={onClick}
    >
      <div className={`fm-label ${hovered ? 'fm-label-out' : 'fm-label-in'}`}>
        <span className="fm-label-emoji">{emoji}</span>
        <span className="fm-label-text">{label}</span>
        {count !== undefined && <span className="fm-label-pill">{count}</span>}
        {active && <span className="fm-active-dot"/>}
      </div>
      <div
        ref={marqueeRef}
        className="fm-marquee"
        style={{ transform: `translateY(${marqueeY}%)`, transition: 'transform 0.55s cubic-bezier(0.16,1,0.3,1)' }}
      >
        <div
          ref={innerRef}
          className="fm-marquee-inner"
          style={{ transform: `translateY(${innerY}%)`, transition: innerY === 0 ? 'transform 0.55s cubic-bezier(0.16,1,0.3,1)' : 'none' }}
        >
          {marqueeText}{marqueeText}
        </div>
      </div>
    </div>
  );
};

const FlowingMenu = ({ items, active, onChange }) => (
  <nav className="fm-nav">
    {items.map(item => (
      <FlowingMenuItem
        key={item.id}
        label={item.label}
        emoji={item.emoji}
        count={item.count}
        color={item.color}
        active={active === item.id}
        onClick={() => onChange(item.id)}
      />
    ))}
  </nav>
);

// ─── MASONRY GRID ─────────────────────────────────────────────────────────────
const MasonryGrid = ({ children, columns = 3, gap = 16 }) => {
  const [cols, setCols] = useState(columns);
  const containerRef = useRef(null);
  useEffect(() => {
    const update = () => {
      const w = containerRef.current?.offsetWidth || window.innerWidth;
      setCols(w < 600 ? 1 : w < 900 ? 2 : columns);
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [columns]);
  const colArrays = Array.from({ length: cols }, () => []);
  React.Children.forEach(children, (child, i) => { colArrays[i % cols].push(child); });
  return (
    <div ref={containerRef} style={{ display:'flex', gap, alignItems:'flex-start' }}>
      {colArrays.map((col, ci) => (
        <div key={ci} style={{ flex:1, display:'flex', flexDirection:'column', gap }}>
          {col.map((child, ri) => (
            <div key={ri} style={{
              animation:`masonryIn 0.55s cubic-bezier(0.175,0.885,0.32,1.275) both`,
              animationDelay:`${(ci * col.length + ri) * 0.06}s`,
            }}>
              {child}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};

// ─── GLASSY EVENT CARD ────────────────────────────────────────────────────────
const EventCard = ({ event, onClick, getStatus, formatDate }) => {
  const cardRef = useRef(null);
  const [spot, setSpot] = useState({ x:'50%', y:'50%', op:0 });
  const [ripples, setRipples] = useState([]);
  const rid = useRef(0);
  const [tilt, setTilt] = useState({ rx:0, ry:0 });
  const s = getStatus(event.status);

  const onMove = useCallback((e) => {
    const r = cardRef.current?.getBoundingClientRect(); if (!r) return;
    const x = ((e.clientX-r.left)/r.width)*100;
    const y = ((e.clientY-r.top)/r.height)*100;
    setSpot({ x:`${x}%`, y:`${y}%`, op:1 });
    setTilt({ rx:((e.clientY-r.top)/r.height-0.5)*-8, ry:((e.clientX-r.left)/r.width-0.5)*8 });
  },[]);
  const onLeave = useCallback(()=>{ setSpot(s=>({...s,op:0})); setTilt({rx:0,ry:0}); },[]);
  const handleClick = useCallback((e) => {
    const r = cardRef.current?.getBoundingClientRect(); if (!r) return;
    const id = ++rid.current;
    setRipples(rr=>[...rr,{id,x:e.clientX-r.left,y:e.clientY-r.top}]);
    setTimeout(()=>setRipples(rr=>rr.filter(rp=>rp.id!==id)),900);
    onClick(event.id);
  },[onClick, event.id]);

  return (
    <div ref={cardRef} className="ev-card"
      style={{ transform:`perspective(800px) rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg)`, transition:'transform 0.15s ease' }}
      onMouseMove={onMove} onMouseLeave={onLeave} onClick={handleClick}
    >
      <div className="ev-card-spot" style={{
        background:`radial-gradient(circle 200px at ${spot.x} ${spot.y}, rgba(78,174,198,0.2), transparent 70%)`,
        opacity: spot.op,
      }}/>
      {ripples.map(rp=>(
        <span key={rp.id} className="ev-card-ripple" style={{left:rp.x,top:rp.y}}/>
      ))}
      <div className="ev-card-bar" style={{background:s.grad||'linear-gradient(90deg,#4eaec6,#1d7a96)'}}/>
      <div className="ev-card-inner">
        <div className="ev-card-top">
          <div className="ev-card-icon" style={{background:s.bg,border:`1px solid ${s.border}`}}>🎉</div>
          <div className="ev-card-status-pill" style={{color:s.color,background:s.bg,border:`1px solid ${s.border}`}}>
            {s.label}
          </div>
        </div>
        <div className="ev-card-name">{event.name}</div>
        {event.description && <div className="ev-card-desc">{event.description}</div>}
        <div className="ev-card-details">
          {event.date && <div className="ev-card-detail"><span className="ev-detail-icon">📅</span><span>{formatDate(event.date)}</span></div>}
          {event.venue && <div className="ev-card-detail"><span className="ev-detail-icon">📍</span><span>{event.venue}</span></div>}
          {event.capacity && <div className="ev-card-detail"><span className="ev-detail-icon">👥</span><span>{event.capacity} capacity</span></div>}
        </div>
        <div className="ev-card-footer">
          {event.budget ? <span className="ev-card-budget">₹{parseFloat(event.budget).toLocaleString('en-IN')}</span> : <span/>}
          <span className="ev-card-arrow">→</span>
        </div>
      </div>
    </div>
  );
};

// ─── MAIN ─────────────────────────────────────────────────────────────────────
const Events = () => {
  const { isCommittee } = useAuth();
  const navigate = useNavigate();
  const [events, setEvents]           = useState([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState('');
  const [search, setSearch]           = useState('');
  const [filter, setFilter]           = useState('all');
  const [showCreate, setShowCreate]   = useState(false);
  const [creating, setCreating]       = useState(false);
  const [createError, setCreateError] = useState('');
  const [form, setForm] = useState({ name:'', description:'', date:'', venue:'', capacity:'', budget:'', status:'upcoming' });

  useEffect(()=>{ fetchEvents(); },[]);

  const fetchEvents = async () => {
    try { setLoading(true); const res = await eventsAPI.getAll(); setEvents(res.data.events||[]); }
    catch(err) { setError('Failed to load events.'); }
    finally { setLoading(false); }
  };

  const handleCreate = async (e) => {
    e.preventDefault(); setCreateError(''); setCreating(true);
    try {
      await eventsAPI.create(form);
      setShowCreate(false);
      setForm({name:'',description:'',date:'',venue:'',capacity:'',budget:'',status:'upcoming'});
      fetchEvents();
    } catch(err) { setCreateError(err.response?.data?.message||'Failed to create event.'); }
    finally { setCreating(false); }
  };

  const filtered = events.filter(e => {
    const ms = e.name.toLowerCase().includes(search.toLowerCase()) || (e.venue&&e.venue.toLowerCase().includes(search.toLowerCase()));
    const mf = filter==='all' || e.status===filter;
    return ms && mf;
  });

  const formatDate = (d) => new Date(d).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'});

  const getStatus = (st) => ({
    upcoming:  { color:'#4eaec6', bg:'rgba(78,174,198,0.12)',  border:'rgba(78,174,198,0.25)',  label:'Upcoming',  grad:'linear-gradient(90deg,#4eaec6,#1d7a96)' },
    ongoing:   { color:'#22c55e', bg:'rgba(34,197,94,0.12)',   border:'rgba(34,197,94,0.25)',   label:'Ongoing',   grad:'linear-gradient(90deg,#22c55e,#16a34a)' },
    completed: { color:'rgba(255,255,255,0.4)', bg:'rgba(255,255,255,0.06)', border:'rgba(255,255,255,0.1)', label:'Completed', grad:'linear-gradient(90deg,rgba(255,255,255,0.2),transparent)' },
    cancelled: { color:'#f87171', bg:'rgba(239,68,68,0.12)',   border:'rgba(239,68,68,0.25)',   label:'Cancelled', grad:'linear-gradient(90deg,#ef4444,#dc2626)' },
  })[st] || { color:'#4eaec6', bg:'rgba(78,174,198,0.12)', border:'rgba(78,174,198,0.25)', label:st, grad:'linear-gradient(90deg,#4eaec6,#1d7a96)' };

  const STATS = [
    { icon:'🎉', label:'Total',     value:events.length,                                    color:'#4eaec6', bg:'rgba(78,174,198,0.12)'  },
    { icon:'⚡', label:'Upcoming',  value:events.filter(e=>e.status==='upcoming').length,   color:'#93d8e8', bg:'rgba(78,174,198,0.08)'  },
    { icon:'🟢', label:'Ongoing',   value:events.filter(e=>e.status==='ongoing').length,    color:'#86efac', bg:'rgba(34,197,94,0.1)'    },
    { icon:'✅', label:'Completed', value:events.filter(e=>e.status==='completed').length,  color:'rgba(255,255,255,0.4)', bg:'rgba(255,255,255,0.05)' },
  ];

  const MENU_ITEMS = [
    { id:'all',       label:'All Events',  emoji:'🎉', color:'#4eaec6', count: events.length },
    { id:'upcoming',  label:'Upcoming',    emoji:'⚡', color:'#93d8e8', count: events.filter(e=>e.status==='upcoming').length },
    { id:'ongoing',   label:'Ongoing',     emoji:'🟢', color:'#22c55e', count: events.filter(e=>e.status==='ongoing').length },
    { id:'completed', label:'Completed',   emoji:'✅', color:'rgba(255,255,255,0.55)', count: events.filter(e=>e.status==='completed').length },
  ];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&display=swap');
        *,*::before,*::after{margin:0;padding:0;box-sizing:border-box;}

        .ev-root { font-family:'Space Grotesk',sans-serif; color:white; position:relative; z-index:1; }

        /* ── HEADER ── */
        .ev-header {
          display:flex; align-items:flex-start; justify-content:space-between;
          margin-bottom:28px; gap:20px; flex-wrap:wrap;
        }
        .ev-title {
          font-size:28px; font-weight:700; letter-spacing:-1px;
          background: linear-gradient(160deg, #ffffff 0%, #93d8e8 40%, #4eaec6 70%, #1d7a96 100%);
          -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text;
          filter: drop-shadow(0 0 18px rgba(78,174,198,0.45));
          margin-bottom:5px;
        }
        .ev-sub { font-size:13px; color:rgba(255,255,255,0.32); font-weight:400; }

        .ev-create-btn {
          display:flex; align-items:center; gap:8px; padding:11px 22px;
          background:linear-gradient(135deg,#1d7a96,#1560a0);
          border:1px solid rgba(78,174,198,0.3); border-radius:12px;
          color:white; font-size:13.5px; font-weight:700; cursor:pointer;
          font-family:'Space Grotesk',sans-serif;
          transition:all 0.3s cubic-bezier(.16,1,.3,1);
          box-shadow:0 4px 20px rgba(78,174,198,0.3), inset 0 1px 0 rgba(255,255,255,0.1);
          white-space:nowrap; position:relative; overflow:hidden;
          z-index:10; pointer-events:auto;
        }
        .ev-create-btn::before{
          content:'';position:absolute;top:0;left:-100%;width:60%;height:100%;
          background:linear-gradient(90deg,transparent,rgba(255,255,255,0.1),transparent);
          transition:left 0.5s ease;
        }
        .ev-create-btn:hover::before{left:150%;}
        .ev-create-btn:hover{transform:translateY(-2px);box-shadow:0 8px 28px rgba(78,174,198,0.45);}

        /* ── STAT CARDS ── */
        .ev-stats { display:flex; gap:12px; margin-bottom:24px; flex-wrap:wrap; }
        .ev-stat {
          flex:1; min-width:110px; padding:14px 18px;
          background:rgba(5,12,32,0.65);
          border:1px solid rgba(78,174,198,0.14);
          border-radius:14px; display:flex; align-items:center; gap:10px;
          backdrop-filter:blur(20px); position:relative; overflow:hidden;
          transition:transform 0.2s ease, box-shadow 0.2s ease;
        }
        .ev-stat:hover{transform:translateY(-2px);box-shadow:0 8px 28px rgba(78,174,198,0.12);}
        .ev-stat::before{
          content:'';position:absolute;top:0;left:0;right:0;height:1px;
          background:linear-gradient(90deg,transparent,rgba(78,174,198,0.4),transparent);
        }
        .ev-stat-icon {
          width:34px;height:34px;border-radius:9px;display:flex;
          align-items:center;justify-content:center;font-size:16px;flex-shrink:0;
        }
        .ev-stat-num {
          font-size:20px;font-weight:700;letter-spacing:-0.5px;display:block;
          background:linear-gradient(135deg,#ffffff,var(--stat-color,#4eaec6));
          -webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;
        }
        .ev-stat-label{font-size:10.5px;color:rgba(255,255,255,0.3);text-transform:uppercase;letter-spacing:0.6px;font-weight:500;}

        /* ── SEARCH ── */
        .ev-search-row{display:flex;align-items:center;gap:12px;margin-bottom:18px;flex-wrap:wrap;}
        .ev-search-wrap{position:relative;flex:1;min-width:200px;}
        .ev-search-icon{position:absolute;left:13px;top:50%;transform:translateY(-50%);font-size:14px;opacity:0.3;pointer-events:none;}
        .ev-search{
          width:100%; background:rgba(5,12,32,0.6);
          border:1.5px solid rgba(78,174,198,0.14); border-radius:12px;
          padding:11px 13px 11px 40px; font-size:13.5px; color:white;
          font-family:'Space Grotesk',sans-serif; outline:none;
          backdrop-filter:blur(16px); transition:all 0.25s ease;
        }
        .ev-search::placeholder{color:rgba(255,255,255,0.18);}
        .ev-search:focus{border-color:rgba(78,174,198,0.45);background:rgba(78,174,198,0.06);box-shadow:0 0 0 4px rgba(78,174,198,0.08);}

        /* ── FLOWING MENU ── */
        .fm-nav {
          display: flex;
          border-radius: 20px;
          overflow: hidden;
          border: 1px solid rgba(78,174,198,0.18);
          background: rgba(4,10,28,0.85);
          backdrop-filter: blur(28px);
          -webkit-backdrop-filter: blur(28px);
          box-shadow:
            0 0 0 1px rgba(255,255,255,0.025),
            0 20px 60px rgba(0,0,0,0.45),
            inset 0 1px 0 rgba(78,174,198,0.1);
          margin-bottom: 26px;
          height: 64px;
        }
        .fm-item {
          position: relative; flex: 1; overflow: hidden; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          border-right: 1px solid rgba(78,174,198,0.1);
          transition: background 0.25s ease; user-select: none;
        }
        .fm-item:last-child { border-right: none; }
        .fm-item:hover { background: rgba(78,174,198,0.06); }
        .fm-item.fm-active { background: rgba(78,174,198,0.1); }
        .fm-item.fm-active::after {
          content: ''; position: absolute; bottom: 0; left: 0; right: 0;
          height: 2px; background: var(--fm-color, #4eaec6);
          box-shadow: 0 0 10px var(--fm-color, #4eaec6);
        }
        .fm-label {
          display: flex; align-items: center; gap: 8px;
          position: relative; z-index: 1;
          transition: transform 0.55s cubic-bezier(0.16,1,0.3,1), opacity 0.4s ease;
          pointer-events: none; padding: 0 4px;
        }
        .fm-label-in  { transform: translateY(0);    opacity: 1; }
        .fm-label-out { transform: translateY(-120%); opacity: 0; }
        .fm-label-emoji { font-size: 16px; flex-shrink: 0; }
        .fm-label-text {
          font-size: 13px; font-weight: 700; color: rgba(255,255,255,0.75);
          letter-spacing: 0.2px; white-space: nowrap;
          font-family: 'Space Grotesk', sans-serif; transition: color 0.2s ease;
        }
        .fm-item.fm-active .fm-label-text { color: var(--fm-color, #4eaec6); }
        .fm-label-pill {
          font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 100px;
          background: rgba(78,174,198,0.12); border: 1px solid rgba(78,174,198,0.22);
          color: rgba(255,255,255,0.5); transition: all 0.2s ease;
        }
        .fm-item.fm-active .fm-label-pill {
          background: rgba(78,174,198,0.18); color: var(--fm-color, #4eaec6);
          border-color: var(--fm-color, #4eaec6); box-shadow: 0 0 8px rgba(78,174,198,0.2);
        }
        .fm-active-dot {
          width: 6px; height: 6px; border-radius: 50%;
          background: var(--fm-color, #4eaec6); box-shadow: 0 0 8px var(--fm-color, #4eaec6);
          animation: fmDot 2s ease-in-out infinite;
        }
        @keyframes fmDot { 0%,100%{opacity:1;}50%{opacity:0.3;} }
        .fm-marquee {
          position: absolute; inset: 0; display: flex; align-items: center;
          overflow: hidden; pointer-events: none; z-index: 2;
          background: var(--fm-color, #4eaec6);
        }
        .fm-marquee-inner { display: flex; align-items: center; white-space: nowrap; will-change: transform; }
        .fm-mq-item {
          display: inline-flex; align-items: center; gap: 12px; padding: 0 20px;
          font-size: 14px; font-weight: 700; color: rgba(5,12,32,0.9);
          text-transform: uppercase; letter-spacing: 1.5px; font-family: 'Space Grotesk', sans-serif;
        }
        .fm-mq-emoji { font-size: 16px; }
        .fm-mq-count { font-size: 11px; background: rgba(5,12,32,0.2); padding: 1px 7px; border-radius: 100px; font-weight: 700; }
        .fm-mq-sep { font-size: 18px; opacity: 0.35; font-weight: 300; }

        /* ── MASONRY CARD ── */
        @keyframes masonryIn {
          0%  { opacity:0; transform:translateY(28px) scale(0.95); }
          100%{ opacity:1; transform:translateY(0)    scale(1); }
        }
        .ev-card {
          position:relative; overflow:hidden; cursor:pointer;
          background:rgba(5,12,32,0.68);
          border:1px solid rgba(78,174,198,0.16);
          border-radius:20px;
          backdrop-filter:blur(28px); -webkit-backdrop-filter:blur(28px);
          box-shadow:0 0 0 1px rgba(255,255,255,0.025),0 16px 48px rgba(0,0,0,0.45),inset 0 1px 0 rgba(78,174,198,0.1),inset 0 -1px 0 rgba(0,0,0,0.2);
          transition:box-shadow 0.25s ease, border-color 0.25s ease;
        }
        .ev-card:hover{
          border-color:rgba(78,174,198,0.32);
          box-shadow:0 0 0 1px rgba(78,174,198,0.08),0 24px 64px rgba(0,0,0,0.5),0 0 40px rgba(78,174,198,0.1),inset 0 1px 0 rgba(78,174,198,0.18);
        }
        .ev-card-spot{position:absolute;inset:0;pointer-events:none;transition:opacity 0.25s ease;z-index:0;border-radius:inherit;}
        .ev-card-ripple{
          position:absolute;transform:translate(-50%,-50%) scale(0);
          width:500px;height:500px;border-radius:50%;
          background:radial-gradient(circle,rgba(78,174,198,0.14) 0%,transparent 60%);
          animation:evRipple 0.9s ease-out forwards;pointer-events:none;z-index:0;
        }
        @keyframes evRipple{to{transform:translate(-50%,-50%) scale(1);opacity:0;}}
        .ev-card-bar{position:absolute;top:0;left:0;right:0;height:2px;z-index:2;border-radius:20px 20px 0 0;}
        .ev-card-inner{position:relative;z-index:1;padding:22px;}
        .ev-card-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;}
        .ev-card-icon{width:44px;height:44px;border-radius:13px;display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0;backdrop-filter:blur(8px);}
        .ev-card-status-pill{font-size:10.5px;font-weight:700;padding:4px 11px;border-radius:100px;letter-spacing:0.4px;text-transform:uppercase;backdrop-filter:blur(8px);}
        .ev-card-name{
          font-size:17px;font-weight:700;letter-spacing:-0.4px;margin-bottom:7px;line-height:1.3;
          background:linear-gradient(135deg,#ffffff 0%,#caf0f8 60%,#90e0ef 100%);
          -webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;
          filter:drop-shadow(0 0 12px rgba(78,174,198,0.3));
        }
        .ev-card-desc{font-size:12.5px;color:rgba(255,255,255,0.35);line-height:1.65;margin-bottom:14px;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;}
        .ev-card-details{display:flex;flex-direction:column;gap:7px;margin-bottom:16px;}
        .ev-card-detail{display:flex;align-items:center;gap:8px;font-size:12.5px;color:rgba(255,255,255,0.38);}
        .ev-detail-icon{width:22px;height:22px;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:11px;flex-shrink:0;background:rgba(78,174,198,0.08);border:1px solid rgba(78,174,198,0.12);}
        .ev-card-footer{display:flex;align-items:center;justify-content:space-between;padding-top:14px;border-top:1px solid rgba(255,255,255,0.05);}
        .ev-card-budget{font-size:14.5px;font-weight:700;background:linear-gradient(135deg,#fcd34d,#f59e0b);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;}
        .ev-card-arrow{font-size:16px;opacity:0.28;transition:opacity 0.2s,transform 0.2s;}
        .ev-card:hover .ev-card-arrow{opacity:1;transform:translateX(5px);}

        /* ── SKELETON ── */
        .ev-skeleton{background:linear-gradient(90deg,rgba(255,255,255,0.04) 25%,rgba(78,174,198,0.07) 50%,rgba(255,255,255,0.04) 75%);background-size:200% 100%;animation:evSkel 1.5s infinite;border-radius:8px;}
        @keyframes evSkel{0%{background-position:200% 0;}100%{background-position:-200% 0;}}
        .ev-skeleton-card{background:rgba(5,12,32,0.65);border:1px solid rgba(78,174,198,0.1);border-radius:20px;padding:22px;backdrop-filter:blur(20px);}

        /* ── EMPTY / ERROR ── */
        .ev-empty{text-align:center;padding:80px 20px;color:rgba(255,255,255,0.18);grid-column:1/-1;}
        .ev-empty-icon{font-size:52px;display:block;margin-bottom:14px;opacity:0.35;}
        .ev-empty-title{font-size:18px;font-weight:700;margin-bottom:7px;background:linear-gradient(135deg,rgba(255,255,255,0.5),rgba(78,174,198,0.5));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;}
        .ev-empty-sub{font-size:13px;color:rgba(255,255,255,0.18);}
        .ev-error{background:rgba(239,68,68,0.07);border:1px solid rgba(239,68,68,0.18);border-radius:14px;padding:18px 22px;color:#fca5a5;font-size:13.5px;display:flex;align-items:center;gap:10px;backdrop-filter:blur(12px);}

        /* ── MODAL ── */
        .ev-modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.82);backdrop-filter:blur(10px);z-index:200;display:flex;align-items:center;justify-content:center;padding:20px;}
        .ev-modal{background:rgba(5,10,28,0.92);border:1px solid rgba(78,174,198,0.22);border-radius:24px;padding:40px;width:100%;max-width:520px;max-height:90vh;overflow-y:auto;box-shadow:0 32px 80px rgba(0,0,0,0.6),0 0 60px rgba(78,174,198,0.08),inset 0 1px 0 rgba(78,174,198,0.1);backdrop-filter:blur(32px);}
        .ev-modal-title{font-size:22px;font-weight:700;letter-spacing:-0.5px;margin-bottom:5px;background:linear-gradient(135deg,#ffffff,#93d8e8,#4eaec6);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;}
        .ev-modal-sub{font-size:13px;color:rgba(255,255,255,0.3);margin-bottom:28px;}
        .ev-modal-field{margin-bottom:16px;}
        .ev-modal-label{display:block;font-size:10.5px;font-weight:600;color:rgba(78,174,198,0.7);text-transform:uppercase;letter-spacing:1px;margin-bottom:7px;}
        .ev-modal-input,.ev-modal-select{width:100%;background:rgba(255,255,255,0.04);border:1.5px solid rgba(78,174,198,0.12);border-radius:12px;padding:12px 15px;font-size:13.5px;color:white;font-family:'Space Grotesk',sans-serif;outline:none;transition:all 0.22s ease;}
        .ev-modal-input::placeholder{color:rgba(255,255,255,0.14);}
        .ev-modal-input:focus,.ev-modal-select:focus{border-color:rgba(78,174,198,0.5);background:rgba(78,174,198,0.06);box-shadow:0 0 0 4px rgba(78,174,198,0.08);}
        .ev-modal-select option{background:#0d1426;}
        .ev-modal-row{display:grid;grid-template-columns:1fr 1fr;gap:13px;}
        .ev-modal-btns{display:grid;grid-template-columns:1fr 1fr;gap:11px;margin-top:8px;}
        .ev-modal-cancel{padding:12px;border-radius:11px;background:rgba(255,255,255,0.04);border:1.5px solid rgba(255,255,255,0.08);color:rgba(255,255,255,0.45);font-size:13.5px;font-weight:600;cursor:pointer;font-family:'Space Grotesk',sans-serif;transition:all 0.2s ease;}
        .ev-modal-cancel:hover{background:rgba(255,255,255,0.07);color:white;}
        .ev-modal-submit{padding:12px;border-radius:11px;background:linear-gradient(135deg,#1d7a96,#1560a0);border:1px solid rgba(78,174,198,0.3);color:white;font-size:13.5px;font-weight:700;cursor:pointer;font-family:'Space Grotesk',sans-serif;transition:all 0.2s ease;box-shadow:0 4px 16px rgba(78,174,198,0.3);display:flex;align-items:center;justify-content:center;gap:8px;}
        .ev-modal-submit:hover{transform:translateY(-1px);box-shadow:0 8px 24px rgba(78,174,198,0.45);}
        .ev-modal-submit:disabled{opacity:0.5;cursor:not-allowed;transform:none;}
        .ev-modal-error{background:rgba(239,68,68,0.07);border:1px solid rgba(239,68,68,0.2);border-radius:10px;padding:10px 14px;font-size:13px;color:#fca5a5;margin-bottom:14px;}
        .ev-spinner{width:15px;height:15px;border:2px solid rgba(255,255,255,0.25);border-top-color:white;border-radius:50%;animation:evSpin 0.6s linear infinite;}
        @keyframes evSpin{to{transform:rotate(360deg);}}

        @media(max-width:600px){.ev-modal-row{grid-template-columns:1fr;}.ev-modal{padding:26px 20px;}}
      `}</style>

      <BeamsBackground />

      <ClickSpark>
        <div className="ev-root">

          {/* HEADER */}
          <div className="ev-header">
            <div>
              <div className="ev-title">Events 🎉</div>
              <div className="ev-sub">{events.length} total events on campus</div>
            </div>
            {isCommittee && (
              <button className="ev-create-btn" onClick={()=>setShowCreate(true)}>
                + Create Event
              </button>
            )}
          </div>

          {/* STATS */}
          <div className="ev-stats">
            {STATS.map(s=>(
              <div key={s.label} className="ev-stat">
                <div className="ev-stat-icon" style={{background:s.bg}}>{s.icon}</div>
                <div>
                  <span className="ev-stat-num" style={{'--stat-color':s.color}}>{s.value}</span>
                  <span className="ev-stat-label">{s.label}</span>
                </div>
              </div>
            ))}
          </div>

          {/* SEARCH */}
          <div className="ev-search-row">
            <div className="ev-search-wrap">
              <span className="ev-search-icon">🔍</span>
              <input className="ev-search" type="text"
                placeholder="Search events by name or venue..."
                value={search} onChange={e=>setSearch(e.target.value)} />
            </div>
          </div>

          {/* FLOWING MENU FILTER */}
          <FlowingMenu items={MENU_ITEMS} active={filter} onChange={setFilter} />

          {/* MASONRY GRID */}
          {loading ? (
            <MasonryGrid columns={3} gap={16}>
              {[1,2,3,4,5,6].map(i=>(
                <div key={i} className="ev-skeleton-card">
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:14}}>
                    <div className="ev-skeleton" style={{width:44,height:44,borderRadius:13}}/>
                    <div className="ev-skeleton" style={{width:80,height:24,borderRadius:100}}/>
                  </div>
                  <div className="ev-skeleton" style={{width:'70%',height:18,marginBottom:9}}/>
                  <div className="ev-skeleton" style={{width:'90%',height:13,marginBottom:5}}/>
                  <div className="ev-skeleton" style={{width:'60%',height:13,marginBottom:18}}/>
                  <div style={{display:'flex',justifyContent:'space-between'}}>
                    <div className="ev-skeleton" style={{width:'40%',height:13}}/>
                    <div className="ev-skeleton" style={{width:'20%',height:13}}/>
                  </div>
                </div>
              ))}
            </MasonryGrid>
          ) : error ? (
            <div className="ev-error">⚠️ {error}</div>
          ) : filtered.length===0 ? (
            <div className="ev-empty">
              <span className="ev-empty-icon">🔍</span>
              <div className="ev-empty-title">No events found</div>
              <div className="ev-empty-sub">{search?`No results for "${search}"`:'No events in this category yet'}</div>
            </div>
          ) : (
            <MasonryGrid columns={3} gap={16}>
              {filtered.map(event=>(
                <EventCard key={event.id} event={event}
                  onClick={(id)=>navigate(`/events/${id}`)}
                  getStatus={getStatus} formatDate={formatDate}
                />
              ))}
            </MasonryGrid>
          )}
        </div>
      </ClickSpark>

      {/* MODAL */}
      {showCreate && (
        <div className="ev-modal-overlay" onClick={e=>e.target===e.currentTarget&&setShowCreate(false)}>
          <div className="ev-modal">
            <div className="ev-modal-title">Create New Event ✨</div>
            <div className="ev-modal-sub">Fill in the details to create a new campus event</div>
            {createError && <div className="ev-modal-error">⚠️ {createError}</div>}
            <form onSubmit={handleCreate}>
              <div className="ev-modal-field">
                <label className="ev-modal-label">Event Name *</label>
                <input className="ev-modal-input" type="text" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="e.g. Tech Fest 2026" required/>
              </div>
              <div className="ev-modal-field">
                <label className="ev-modal-label">Description</label>
                <textarea className="ev-modal-input" rows={3} value={form.description} onChange={e=>setForm({...form,description:e.target.value})} placeholder="Describe your event..." style={{resize:'vertical',minHeight:80}}/>
              </div>
              <div className="ev-modal-row">
                <div className="ev-modal-field">
                  <label className="ev-modal-label">Date *</label>
                  <input className="ev-modal-input" type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})} required style={{colorScheme:'dark'}}/>
                </div>
                <div className="ev-modal-field">
                  <label className="ev-modal-label">Status</label>
                  <select className="ev-modal-select" value={form.status} onChange={e=>setForm({...form,status:e.target.value})}>
                    <option value="upcoming">Upcoming</option>
                    <option value="ongoing">Ongoing</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>
              <div className="ev-modal-field">
                <label className="ev-modal-label">Venue</label>
                <input className="ev-modal-input" type="text" value={form.venue} onChange={e=>setForm({...form,venue:e.target.value})} placeholder="e.g. Main Auditorium"/>
              </div>
              <div className="ev-modal-row">
                <div className="ev-modal-field">
                  <label className="ev-modal-label">Capacity</label>
                  <input className="ev-modal-input" type="number" value={form.capacity} onChange={e=>setForm({...form,capacity:e.target.value})} placeholder="500"/>
                </div>
                <div className="ev-modal-field">
                  <label className="ev-modal-label">Budget (₹)</label>
                  <input className="ev-modal-input" type="number" value={form.budget} onChange={e=>setForm({...form,budget:e.target.value})} placeholder="50000"/>
                </div>
              </div>
              <div className="ev-modal-btns">
                <button type="button" className="ev-modal-cancel" onClick={()=>setShowCreate(false)}>Cancel</button>
                <button type="submit" className="ev-modal-submit" disabled={creating}>
                  {creating?<><div className="ev-spinner"/>Creating...</>:'✨ Create Event'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default Events;