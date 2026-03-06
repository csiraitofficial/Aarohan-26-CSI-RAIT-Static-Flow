import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';

// ─── BEAMS BACKGROUND ───────────────────────────────────────────────────────
const BeamsBackground = () => {
  const canvasRef = useRef(null);
  const animRef = useRef(0);
  const startRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext('webgl', { antialias: true, alpha: false });
    if (!gl) return;
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; gl.viewport(0, 0, canvas.width, canvas.height); };
    window.addEventListener('resize', resize); resize();
    const vs = `attribute vec2 a_pos; void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }`;
    const fs = `
      precision highp float; uniform float u_time; uniform vec2 u_res;
      float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float noise(vec2 p){vec2 i=floor(p);vec2 f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
      float fbm(vec2 p){float v=0.0;float a=0.5;for(int i=0;i<5;i++){v+=a*noise(p);p=p*2.0+vec2(0.3,0.7);a*=0.5;}return v;}
      float beam(vec2 uv,float angle,float offset,float width,float t){float c=cos(angle),s=sin(angle);vec2 rot=vec2(c*uv.x-s*uv.y,s*uv.x+c*uv.y);float d=abs(rot.x-offset+fbm(vec2(rot.y*0.4,t*0.3))*0.18);return smoothstep(width*0.5,0.0,d)+smoothstep(width*2.5,0.0,d)*0.35;}
      void main(){
        vec2 uv=(gl_FragCoord.xy-0.5*u_res)/min(u_res.x,u_res.y); float t=u_time*0.4;
        vec3 green=vec3(0.29,0.87,0.50); vec3 blue=vec3(0.13,0.82,0.93); vec3 col=vec3(0.01,0.04,0.06);
        col+=green*beam(uv,0.38,sin(t*0.31)*0.6,0.07,t)*0.7; col+=blue*beam(uv,-0.25,cos(t*0.27+1.2)*0.55,0.06,t+1.0)*0.7;
        col+=green*beam(uv,1.05,sin(t*0.19+2.4)*0.7,0.08,t+2.0)*0.5; col+=blue*beam(uv,-0.72,cos(t*0.23+0.8)*0.45,0.06,t+3.5)*0.6;
        float vign=1.0-smoothstep(0.4,1.4,length(uv)); gl_FragColor=vec4(pow(col*vign,vec3(0.4545)),1.0);}`;
    const prog = gl.createProgram();
    const compile = (src, type) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; };
    gl.attachShader(prog, compile(vs, gl.VERTEX_SHADER)); gl.attachShader(prog, compile(fs, gl.FRAGMENT_SHADER));
    gl.linkProgram(prog); gl.useProgram(prog);
    const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,1,1]), gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(prog, 'a_pos'); gl.enableVertexAttribArray(aPos); gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
    const uTime = gl.getUniformLocation(prog, 'u_time'), uRes = gl.getUniformLocation(prog, 'u_res');
    startRef.current = performance.now();
    const render = (now) => { gl.uniform1f(uTime, (now - startRef.current) * 0.001); gl.uniform2f(uRes, canvas.width, canvas.height); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); animRef.current = requestAnimationFrame(render); };
    animRef.current = requestAnimationFrame(render);
    return () => { cancelAnimationFrame(animRef.current); window.removeEventListener('resize', resize); };
  }, []);

  return <canvas ref={canvasRef} style={{ position:'fixed', inset:0, zIndex:0, pointerEvents:'none' }} />;
};

// ─── TOAST ───────────────────────────────────────────────────────────────────
const Toast = ({ type, title, message, onDismiss }) => {
  const [visible, setVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const LINGER = 3200;
  useEffect(() => {
    const t1 = setTimeout(() => setVisible(true), 10);
    const t2 = setTimeout(() => setLeaving(true), LINGER);
    const t3 = setTimeout(() => onDismiss(), LINGER + 450);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);
  const ok   = type === 'success';
  const warn = type === 'warning';
  const accent  = ok ? '#4ade80' : warn ? '#fbbf24' : '#f87171';
  const accentB = ok ? 'rgba(34,197,94,0.32)' : warn ? 'rgba(251,191,36,0.32)' : 'rgba(239,68,68,0.32)';
  const bg      = ok ? 'rgba(4,24,12,0.93)'   : warn ? 'rgba(24,18,4,0.93)'    : 'rgba(24,4,4,0.93)';
  const iconBg  = ok ? 'rgba(34,197,94,0.14)' : warn ? 'rgba(251,191,36,0.14)' : 'rgba(239,68,68,0.14)';
  const IconSvg = ok
    ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
    : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>;
  return (
    <>
      <style>{`@keyframes toastBarReg{from{width:100%;}to{width:0%;}}`}</style>
      <div style={{ position:'fixed', top:26, left:'50%', transform:`translateX(-50%) translateY(${visible && !leaving ? '0px' : '-72px'})`, opacity: visible && !leaving ? 1 : 0, transition:'transform 0.42s cubic-bezier(0.16,1,0.3,1), opacity 0.32s ease', zIndex:99999, minWidth:320, maxWidth:440, pointerEvents:'none' }}>
        <div style={{ display:'flex', alignItems:'center', gap:12, padding:'13px 18px', borderRadius:16, border:`1px solid ${accentB}`, background:bg, backdropFilter:'blur(22px)', boxShadow:`0 8px 36px ${accentB.replace('0.32','0.22')}, 0 2px 8px rgba(0,0,0,0.55)`, position:'relative', overflow:'hidden' }}>
          <div style={{ width:34, height:34, borderRadius:10, flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', background:iconBg, border:`1px solid ${accentB}` }}>{IconSvg}</div>
          <div>
            <div style={{ fontSize:13, fontWeight:700, color:accent, fontFamily:"'Inter',sans-serif", marginBottom:2 }}>{title}</div>
            <div style={{ fontSize:11.5, color:`${accent}99`, fontFamily:"'Inter',sans-serif" }}>{message}</div>
          </div>
          <div style={{ position:'absolute', bottom:0, left:0, height:2, borderRadius:'0 0 16px 16px', background:`linear-gradient(90deg,${accent},${accent}88)`, animation:`toastBarReg ${LINGER}ms linear forwards` }}/>
        </div>
      </div>
    </>
  );
};

// ─── VALIDATION RULES ────────────────────────────────────────────────────────
const VALIDATION = {
  name: (val) => {
    if (!val.trim())                              return 'Full name is required.';
    if (val.trim().length < 2)                    return 'Name must be at least 2 characters.';
    if (val.trim().length > 60)                   return 'Name must be under 60 characters.';
    if (!/^[a-zA-Z\s'-]+$/.test(val.trim()))      return 'Only letters, spaces, hyphens or apostrophes allowed.';
    return null;
  },
  email: (val) => {
    if (!val.trim())                              return 'Email is required.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) return 'Enter a valid email address.';
    if (val.length > 100)                         return 'Email must be under 100 characters.';
    return null;
  },
  collegeId: (val) => {
    if (!val.trim())                              return 'College ID is required.';
    if (val.trim().length < 4)                    return 'College ID must be at least 4 characters.';
    if (val.trim().length > 20)                   return 'College ID must be under 20 characters.';
    if (!/^[A-Za-z0-9/_-]+$/.test(val.trim()))   return 'Only letters, numbers, /, _ or - allowed.';
    return null;
  },
  password: (val) => {
    if (!val)                                     return 'Password is required.';
    if (val.length < 8)                           return 'Password must be at least 8 characters.';
    if (val.length > 64)                          return 'Password must be under 64 characters.';
    if (!/[A-Z]/.test(val))                       return 'Include at least one uppercase letter.';
    if (!/[0-9]/.test(val))                       return 'Include at least one number.';
    if (!/[^A-Za-z0-9]/.test(val))               return 'Include at least one special character.';
    return null;
  },
  confirmPassword: (val, password) => {
    if (!val)                                     return 'Please confirm your password.';
    if (val !== password)                         return "Passwords don't match.";
    return null;
  },
};

const checkStrength = (pass) => {
  if (!pass) return { score:0, label:'Empty', color:'rgba(255,255,255,0.1)' };
  let score = 0;
  if (pass.length >= 8) score++;
  if (/[A-Z]/.test(pass)) score++;
  if (/[0-9]/.test(pass)) score++;
  if (/[^A-Za-z0-9]/.test(pass)) score++;
  const levels = [
    { label:'Very Weak',   color:'#ef4444' },
    { label:'Weak',        color:'#f87171' },
    { label:'Fair',        color:'#fbbf24' },
    { label:'Strong',      color:'#34d399' },
    { label:'Very Strong', color:'#4ade80' },
  ];
  return { score, ...levels[score] };
};

// Inline field error component
const FieldError = ({ msg }) => {
  if (!msg) return null;
  return (
    <div style={{ display:'flex', alignItems:'center', gap:5, marginTop:5, marginBottom:2, fontSize:11.5, color:'#f87171', fontFamily:"'Inter',sans-serif" }}>
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      {msg}
    </div>
  );
};

// ─── REGISTER PAGE ───────────────────────────────────────────────────────────
const Register = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData]       = useState({ name:'', email:'', collegeId:'', password:'', confirmPassword:'' });
  const [errors, setErrors]           = useState({});
  const [touched, setTouched]         = useState({});
  const [loading, setLoading]         = useState(false);
  const [selectedRole, setRole]       = useState('student');
  const [step, setStep]               = useState(1);
  const [showPass, setShowPass]       = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [toast, setToast]             = useState(null);
  const [mounted, setMounted]         = useState(false);

  useEffect(() => { setTimeout(() => setMounted(true), 60); }, []);

  const showToast = (type, title, message) => {
    setToast(null);
    setTimeout(() => setToast({ type, title, message }), 20);
  };

  // Validate one field, update errors, return the error string or null
  const validateField = (name, value) => {
    let err = null;
    if (name === 'confirmPassword') err = VALIDATION.confirmPassword(value, formData.password);
    else if (VALIDATION[name])      err = VALIDATION[name](value);
    setErrors(prev => ({ ...prev, [name]: err }));
    return err;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Live-validate after first blur
    if (touched[name]) validateField(name, value);
    // Keep confirmPassword in sync when password changes
    if (name === 'password' && touched.confirmPassword) {
      const err = VALIDATION.confirmPassword(formData.confirmPassword, value);
      setErrors(prev => ({ ...prev, confirmPassword: err }));
    }
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    setTouched(prev => ({ ...prev, [name]: true }));
    validateField(name, value);
  };

  // Validate all step-1 fields at once; mark all as touched
  const validateStep1 = () => {
    const fields = ['name', 'email', 'collegeId'];
    const newErrors = {};
    let valid = true;
    fields.forEach(f => {
      const err = VALIDATION[f](formData[f]);
      newErrors[f] = err;
      if (err) valid = false;
    });
    setErrors(prev => ({ ...prev, ...newErrors }));
    setTouched(prev => ({ ...prev, name:true, email:true, collegeId:true }));
    return valid;
  };

  // Validate all step-2 fields at once
  const validateStep2 = () => {
    const pwErr   = VALIDATION.password(formData.password);
    const confErr = VALIDATION.confirmPassword(formData.confirmPassword, formData.password);
    setErrors(prev => ({ ...prev, password:pwErr, confirmPassword:confErr }));
    setTouched(prev => ({ ...prev, password:true, confirmPassword:true }));
    return !pwErr && !confErr;
  };

  const strength = checkStrength(formData.password);
  const passwordsMatch    = formData.confirmPassword.length > 0 && formData.password === formData.confirmPassword;
  const passwordsMismatch = formData.confirmPassword.length > 0 && formData.password !== formData.confirmPassword;

  const handleNext = () => {
    if (!validateStep1()) {
      showToast('error', 'Fix the errors', 'Please correct the highlighted fields before continuing.');
      return;
    }
    showToast('success', 'Looking good!', 'Now set a strong password for your account.');
    setTimeout(() => setStep(2), 500);
  };

  const handleSubmit = async (e) => {
    e && e.preventDefault();
    if (!validateStep2()) {
      showToast('error', 'Fix the errors', 'Please correct the highlighted fields to continue.');
      return;
    }
    setLoading(true);
    const result = await register({ ...formData, role: selectedRole });
    setLoading(false);
    if (result?.success) {
      showToast('success', 'Account created!', 'Welcome to CampusFlow — redirecting to dashboard…');
      setTimeout(() => navigate('/dashboard'), 1500);
    } else {
      showToast('error', 'Registration failed', result?.message || 'Something went wrong. Please try again.');
    }
  };

  const getNameLabel = () => {
    if (selectedRole === 'committee') return 'Committee Name';
    if (selectedRole === 'admin')     return 'Admin Name';
    return 'Full Name';
  };

  // Returns border color based on touched + error state
  const inputBorder = (field) => {
    if (!touched[field])  return 'rgba(78,174,198,0.15)';
    if (errors[field])    return 'rgba(248,113,113,0.6)';
    return 'rgba(74,222,128,0.5)';
  };

  const ROLES = [
    { id:'student',   label:'Student',
      icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg> },
    { id:'committee', label:'Committee',
      icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> },
    { id:'admin',     label:'Admin',
      icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg> },
  ];

  const EyeOpen  = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>;
  const EyeClose = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>;

  return (
    <div style={{ minHeight:'100vh', width:'100%', display:'flex', position:'relative', overflow:'hidden', fontFamily:"'Inter',sans-serif", background:'#020617' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Syne:wght@700;800&display=swap');
        *{box-sizing:border-box;}
        .rg-input { width:100%; padding:14px 18px; background:rgba(4,7,20,0.72); border:1px solid rgba(78,174,198,0.15); border-radius:13px; color:#fff; font-size:14px; outline:none; font-family:'Inter',sans-serif; transition:border-color 0.2s,background 0.2s; }
        .rg-input:focus { background:rgba(4,7,20,0.92); }
        .rg-input::placeholder { color:rgba(255,255,255,0.2); }
        .rg-role { background:rgba(4,7,20,0.72); border:1px solid rgba(78,174,198,0.12); border-radius:13px; padding:13px 6px; text-align:center; cursor:pointer; transition:all 0.22s ease; color:rgba(255,255,255,0.3); font-family:'Inter',sans-serif; }
        .rg-role:hover { border-color:rgba(78,174,198,0.28); color:rgba(255,255,255,0.58); }
        .rg-role.active { border-color:rgba(74,222,128,0.45); background:rgba(74,222,128,0.07); color:#4ade80; }
        .rg-eye { position:absolute; right:13px; top:50%; transform:translateY(-50%); background:none; border:none; cursor:pointer; padding:4px; color:rgba(255,255,255,0.24); display:flex; align-items:center; transition:color 0.2s; z-index:5; }
        .rg-eye:hover { color:rgba(255,255,255,0.55); }
        .rg-btn { width:100%; padding:15px; border:none; border-radius:13px; color:white; font-family:'Inter'; font-weight:700; font-size:14px; cursor:pointer; transition:all 0.25s ease; letter-spacing:0.3px; background:linear-gradient(135deg,#10b981,#06b6d4); display:flex; align-items:center; justify-content:center; gap:8px; }
        .rg-btn:hover:not(:disabled) { transform:translateY(-2px); box-shadow:0 10px 28px rgba(16,185,129,0.35); }
        .rg-btn:disabled { opacity:0.6; cursor:not-allowed; }
        @keyframes cardIn { from{opacity:0;transform:translateY(24px);}to{opacity:1;transform:none;} }
        @keyframes leftIn { from{opacity:0;transform:translateX(-18px);}to{opacity:1;transform:none;} }
        @keyframes spin   { to{transform:rotate(360deg);} }
        @media(max-width:768px){.rg-wrap{flex-direction:column!important;padding:70px 16px 40px!important;}.rg-left{display:none!important;}}
      `}</style>

      <BeamsBackground />
      {toast && <Toast type={toast.type} title={toast.title} message={toast.message} onDismiss={() => setToast(null)} />}

      {/* Brand */}
      <div style={{ position:'fixed', top:30, left:42, zIndex:10, display:'flex', alignItems:'center', gap:10, fontFamily:"'Syne',sans-serif", fontSize:17, fontWeight:800, color:'#fff', letterSpacing:'-0.4px', opacity: mounted?1:0, transition:'opacity 0.5s ease 0.1s' }}>
        <div style={{ width:30, height:30, borderRadius:8, background:'linear-gradient(135deg,#1d7a96,#1560a0)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:800, color:'white' }}>CF</div>
        CampusFlow
      </div>

      {/* Layout */}
      <div className="rg-wrap" style={{ display:'flex', width:'100%', maxWidth:1160, margin:'0 auto', alignItems:'center', zIndex:2, padding:'0 44px', gap:48, position:'relative' }}>

        {/* Left panel */}
        <div className="rg-left" style={{ flex:1.1, paddingRight:32, animation: mounted?'leftIn 0.7s cubic-bezier(0.16,1,0.3,1) forwards':'none', opacity: mounted?undefined:0 }}>
          <h1 style={{ fontFamily:"'Syne',sans-serif", fontSize:'clamp(42px,5vw,70px)', color:'#fff', lineHeight:0.96, letterSpacing:'-3px', marginBottom:24, fontWeight:800 }}>
            Join the<br />
            <span style={{ background:'linear-gradient(to right,#4ade80,#22d3ee)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text' }}>Campus Flow.</span>
          </h1>
          <p style={{ color:'rgba(255,255,255,0.32)', fontSize:'0.96rem', lineHeight:1.75, maxWidth:320 }}>
            Create your account and unlock smart campus tools for events, attendance, and more.
          </p>
        </div>

        {/* Card */}
        <div style={{ flex:0.9, display:'flex', justifyContent:'center', padding:'40px 0', animation: mounted?'cardIn 0.75s cubic-bezier(0.16,1,0.3,1) 0.08s both':'none' }}>
          <div style={{ width:'100%', maxWidth:408, padding:'38px 34px', background:'rgba(6,9,26,0.78)', backdropFilter:'blur(32px)', WebkitBackdropFilter:'blur(32px)', borderRadius:26, border:'1px solid rgba(78,174,198,0.16)', boxShadow:'0 24px 64px rgba(0,0,0,0.6), inset 0 1px 0 rgba(78,174,198,0.1)' }}>

            {/* Header */}
            <div style={{ marginBottom:20 }}>
              <h2 style={{ fontFamily:"'Syne',sans-serif", fontSize:24, fontWeight:800, color:'#fff', marginBottom:4, letterSpacing:'-0.4px' }}>Get Started</h2>
              <p style={{ color:'rgba(255,255,255,0.28)', fontSize:13 }}>Step {step} of 2 — {step === 1 ? 'Your profile' : 'Set a password'}</p>
            </div>

            {/* Progress bar */}
            <div style={{ height:3, width:'100%', background:'rgba(255,255,255,0.06)', borderRadius:10, marginBottom:20, overflow:'hidden' }}>
              <div style={{ height:'100%', background:'linear-gradient(to right,#4ade80,#22d3ee)', borderRadius:10, width: step===1?'50%':'100%', transition:'width 0.4s ease' }}/>
            </div>

            {/* ── STEP 1: Profile ── */}
            {step === 1 && (
              <div>
                {/* Role picker */}
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:9, marginBottom:16 }}>
                  {ROLES.map(r => (
                    <button key={r.id} className={`rg-role${selectedRole===r.id?' active':''}`} onClick={() => setRole(r.id)} type="button">
                      <div style={{ marginBottom:6, display:'flex', justifyContent:'center' }}>{r.icon}</div>
                      <div style={{ fontSize:9.5, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.5px' }}>{r.label}</div>
                    </button>
                  ))}
                </div>

                {/* Full Name */}
                <div style={{ marginBottom:2 }}>
                  <input className="rg-input" type="text" name="name" placeholder={getNameLabel()} value={formData.name} onChange={handleChange} onBlur={handleBlur} style={{ borderColor: inputBorder('name') }} />
                  <FieldError msg={touched.name && errors.name} />
                </div>

                {/* Email */}
                <div style={{ marginBottom:2, marginTop:9 }}>
                  <input className="rg-input" type="email" name="email" placeholder="College Email" value={formData.email} onChange={handleChange} onBlur={handleBlur} style={{ borderColor: inputBorder('email') }} />
                  <FieldError msg={touched.email && errors.email} />
                </div>

                {/* College ID */}
                <div style={{ marginBottom:16, marginTop:9 }}>
                  <input className="rg-input" type="text" name="collegeId" placeholder="College ID (e.g. CS2024001)" value={formData.collegeId} onChange={handleChange} onBlur={handleBlur} style={{ borderColor: inputBorder('collegeId') }} />
                  <FieldError msg={touched.collegeId && errors.collegeId} />
                  {!errors.collegeId && (
                    <div style={{ fontSize:10.5, color:'rgba(255,255,255,0.2)', marginTop:4, fontFamily:"'Inter',sans-serif" }}>
                      4–20 chars · letters, numbers, /, _, - only
                    </div>
                  )}
                </div>

                <button className="rg-btn" onClick={handleNext} type="button">
                  Next Step
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                </button>
              </div>
            )}

            {/* ── STEP 2: Password ── */}
            {step === 2 && (
              <div>
                {/* Password field */}
                <div style={{ position:'relative', marginBottom:2 }}>
                  <input className="rg-input" type={showPass?'text':'password'} name="password" placeholder="Create Password" value={formData.password} onChange={handleChange} onBlur={handleBlur} style={{ paddingRight:42, borderColor: inputBorder('password') }} />
                  <button type="button" className="rg-eye" onClick={() => setShowPass(p => !p)}>
                    {showPass ? <EyeClose/> : <EyeOpen/>}
                  </button>
                </div>
                <FieldError msg={touched.password && errors.password} />

                {/* Strength meter + checklist */}
                {formData.password.length > 0 && (
                  <div style={{ marginTop:8, marginBottom:10 }}>
                    <div style={{ display:'flex', gap:4, marginBottom:5 }}>
                      {[1,2,3,4].map(i => (
                        <div key={i} style={{ height:3, flex:1, borderRadius:10, background: i<=strength.score ? strength.color : 'rgba(255,255,255,0.07)', transition:'background 0.35s' }}/>
                      ))}
                    </div>
                    <span style={{ fontSize:11, fontWeight:600, color:strength.color }}>Strength: {strength.label}</span>
                    <div style={{ marginTop:7, display:'flex', flexDirection:'column', gap:4 }}>
                      {[
                        { rule: formData.password.length >= 8,          label:'At least 8 characters' },
                        { rule: /[A-Z]/.test(formData.password),        label:'One uppercase letter' },
                        { rule: /[0-9]/.test(formData.password),        label:'One number' },
                        { rule: /[^A-Za-z0-9]/.test(formData.password), label:'One special character (!@#$…)' },
                      ].map(({ rule, label }) => (
                        <div key={label} style={{ display:'flex', alignItems:'center', gap:6, fontSize:11, color: rule ? '#4ade80' : 'rgba(255,255,255,0.28)' }}>
                          {rule
                            ? <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                            : <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.28)" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="10"/></svg>
                          }
                          {label}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Confirm password */}
                <div style={{ position:'relative', marginBottom:2, marginTop:10 }}>
                  <input
                    className="rg-input"
                    type={showConfirm?'text':'password'}
                    name="confirmPassword"
                    placeholder="Confirm Password"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    style={{ paddingRight:42, borderColor: inputBorder('confirmPassword') }}
                  />
                  <button type="button" className="rg-eye" onClick={() => setShowConfirm(p => !p)}>
                    {showConfirm ? <EyeClose/> : <EyeOpen/>}
                  </button>
                </div>
                <FieldError msg={touched.confirmPassword && errors.confirmPassword} />

                {/* Live match hint (only if no error message already shown) */}
                {!errors.confirmPassword && passwordsMatch && (
                  <div style={{ fontSize:11, fontWeight:600, color:'#4ade80', display:'flex', alignItems:'center', gap:5, marginTop:5, marginBottom:8 }}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                    Passwords match
                  </div>
                )}

                <div style={{ marginTop:14 }}>
                  <button className="rg-btn" onClick={handleSubmit} disabled={loading} type="button">
                    {loading && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ animation:'spin 0.8s linear infinite' }}><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>}
                    {loading ? 'Creating Account…' : 'Complete Registration'}
                  </button>
                </div>

                <div onClick={() => setStep(1)} style={{ textAlign:'center', marginTop:14, fontSize:13, color:'rgba(255,255,255,0.28)', cursor:'pointer', transition:'color 0.2s' }}
                  onMouseEnter={e => e.currentTarget.style.color='rgba(255,255,255,0.6)'}
                  onMouseLeave={e => e.currentTarget.style.color='rgba(255,255,255,0.28)'}>
                  ← Back to profile info
                </div>
              </div>
            )}

            <div style={{ textAlign:'center', marginTop:18, fontSize:13, color:'rgba(255,255,255,0.28)' }}>
              Already have an account?{' '}
              <Link to="/login" style={{ color:'#4ade80', fontWeight:600, textDecoration:'none' }}>Sign in</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;