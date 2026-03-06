import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';

// ─── SHARED BEAMS BACKGROUND ────────────────────────────────────────────────
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

  return <canvas ref={canvasRef} style={{ position:'fixed', inset:0, zIndex:0, pointerEvents:'none' }} />;
};

// ─── TOAST ALERT ─────────────────────────────────────────────────────────────
const Toast = ({ type, message, onDismiss }) => {
  const [visible, setVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setVisible(true), 10);
    const t2 = setTimeout(() => { setLeaving(true); }, 3000);
    const t3 = setTimeout(() => { onDismiss(); }, 3500);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  const isSuccess = type === 'success';

  const styles = {
    wrapper: {
      position: 'fixed',
      top: 28,
      left: '50%',
      transform: `translateX(-50%) translateY(${visible && !leaving ? '0px' : '-80px'})`,
      opacity: visible && !leaving ? 1 : 0,
      transition: 'transform 0.45s cubic-bezier(0.16,1,0.3,1), opacity 0.35s ease',
      zIndex: 99999,
      minWidth: 320,
      maxWidth: 420,
      pointerEvents: 'none',
    },
    alert: {
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '14px 18px',
      borderRadius: 16,
      border: `1px solid ${isSuccess ? 'rgba(34,197,94,0.35)' : 'rgba(239,68,68,0.35)'}`,
      background: isSuccess ? 'rgba(5,30,18,0.92)' : 'rgba(30,5,5,0.92)',
      backdropFilter: 'blur(20px)',
      boxShadow: isSuccess
        ? '0 8px 40px rgba(34,197,94,0.18), 0 2px 8px rgba(0,0,0,0.5)'
        : '0 8px 40px rgba(239,68,68,0.18), 0 2px 8px rgba(0,0,0,0.5)',
    },
    iconWrap: {
      width: 34,
      height: 34,
      borderRadius: 10,
      flexShrink: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: 16,
      background: isSuccess ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
      border: `1px solid ${isSuccess ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
    },
    title: {
      fontSize: 13,
      fontWeight: 700,
      color: isSuccess ? '#86efac' : '#fca5a5',
      fontFamily: "'Inter', sans-serif",
      letterSpacing: 0.2,
      marginBottom: 2,
    },
    sub: {
      fontSize: 11.5,
      color: isSuccess ? 'rgba(134,239,172,0.6)' : 'rgba(252,165,165,0.6)',
      fontFamily: "'Inter', sans-serif",
    },
    bar: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      height: 2,
      borderRadius: '0 0 16px 16px',
      background: isSuccess
        ? 'linear-gradient(90deg,#22c55e,#4ade80)'
        : 'linear-gradient(90deg,#ef4444,#f87171)',
      animation: 'toastBar 3s linear forwards',
    },
  };

  return (
    <>
      <style>{`
        @keyframes toastBar {
          from { width: 100%; }
          to   { width: 0%; }
        }
      `}</style>
      <div style={styles.wrapper}>
        <div style={{ ...styles.alert, position: 'relative', overflow: 'hidden' }}>
          <div style={styles.iconWrap}>
            {isSuccess ? '✅' : '⚠️'}
          </div>
          <div>
            <div style={styles.title}>
              {isSuccess ? 'Login successful' : 'Authentication failed'}
            </div>
            <div style={styles.sub}>{message}</div>
          </div>
          <div style={styles.bar} />
        </div>
      </div>
    </>
  );
};

// ─── LOGIN ────────────────────────────────────────────────────────────────────
const Login = () => {
  const auth = useAuth();
  const login = auth ? auth.login : null;
  const navigate = useNavigate();
  const [email, setEmail]           = useState('');
  const [password, setPassword]     = useState('');
  const [loading, setLoading]       = useState(false);
  const [selectedRole, setRole]     = useState('student');
  const [toast, setToast]           = useState(null);
  const [showPw, setShowPw]         = useState(false);
  const [mounted, setMounted]       = useState(false);
  const cardRef = useRef(null);

  useEffect(() => { setTimeout(() => setMounted(true), 60); }, []);

  const showToast = (type, message) => {
    setToast(null);
    setTimeout(() => setToast({ type, message }), 20);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!login) return;
    setLoading(true);
    const result = await login(email, password);
    setLoading(false);
    if (result.success) {
      showToast('success', `Welcome back! Redirecting to dashboard…`);
      setTimeout(() => navigate('/dashboard'), 1400);
    } else {
      showToast('error', result.message || 'Invalid credentials. Please try again.');
    }
  };

  const getRoleGreeting = () => {
    if (selectedRole === 'committee') return 'Committee Portal';
    if (selectedRole === 'admin') return 'Admin Access';
    return 'Student Login';
  };

  const ROLES = [
    {
      id: 'student', label: 'Student',
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>,
    },
    {
      id: 'committee', label: 'Committee',
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
    },
    {
      id: 'admin', label: 'Admin',
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
    },
  ];

  return (
    <div className="login-root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Syne:wght@700;800&display=swap');
        *{box-sizing:border-box;}

        .login-root {
          min-height: 100vh; width: 100%;
          display: flex; position: relative;
          overflow: hidden; font-family: 'Inter', sans-serif;
          background: #020617;
        }
        .login-container {
          display: flex; width: 100%; max-width: 1300px;
          margin: 0 auto; z-index: 2; align-items: center;
        }
        .login-left  { flex: 1.2; padding: 0 60px; }
        .login-right { flex: 0.8; display: flex; justify-content: center; padding: 40px; }

        .brand {
          position: fixed; top: 30px; left: 42px;
          display: flex; align-items: center; gap: 10px;
          font-family: 'Syne', sans-serif; color: #fff;
          font-size: 17px; font-weight: 800; letter-spacing: -0.4px;
          z-index: 10;
          opacity: ${mounted ? 1 : 0};
          transition: opacity 0.5s ease 0.1s;
        }
        .brand-icon {
          width: 30px; height: 30px; border-radius: 8px;
          background: linear-gradient(135deg,#1d7a96,#1560a0);
          display: flex; align-items: center; justify-content: center;
          font-size: 11px; font-weight: 800; color: white;
        }

        .headline {
          font-family: 'Syne', sans-serif;
          font-size: clamp(42px, 5vw, 70px);
          color: #fff; line-height: 0.96;
          letter-spacing: -3px; margin-bottom: 24px; font-weight: 800;
        }
        .accent {
          background: linear-gradient(to right, #4ade80, #22d3ee);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        /* ── Card (file-1 style) ── */
        .bento-card {
          width: 100%; max-width: 408px;
          padding: 38px 34px;
          background: rgba(6,9,26,0.78);
          backdrop-filter: blur(32px);
          -webkit-backdrop-filter: blur(32px);
          border-radius: 26px;
          border: 1px solid rgba(78,174,198,0.16);
          box-shadow: 0 24px 64px rgba(0,0,0,0.6), inset 0 1px 0 rgba(78,174,198,0.1);
          animation: cardIn 0.75s cubic-bezier(0.16,1,0.3,1) 0.08s both;
        }
        @keyframes cardIn {
          from { opacity:0; transform:translateY(24px); }
          to   { opacity:1; transform:none; }
        }

        /* ── Role pills (file-1 style) ── */
        .role-selector {
          display: grid; grid-template-columns: 1fr 1fr 1fr;
          gap: 9px; margin-bottom: 22px;
        }
        .role-btn {
          background: rgba(4,7,20,0.72);
          border: 1px solid rgba(78,174,198,0.12);
          border-radius: 13px; padding: 13px 6px;
          text-align: center; cursor: pointer;
          transition: all 0.22s ease;
          color: rgba(255,255,255,0.3);
          font-family: 'Inter', sans-serif;
        }
        .role-btn:hover {
          border-color: rgba(78,174,198,0.28);
          color: rgba(255,255,255,0.58);
        }
        .role-btn.active {
          border-color: rgba(74,222,128,0.45);
          background: rgba(74,222,128,0.07);
          color: #4ade80;
        }

        /* ── Inputs (file-1 style) ── */
        .lg-input {
          width: 100%; padding: 14px 18px;
          background: rgba(4,7,20,0.72);
          border: 1px solid rgba(78,174,198,0.15);
          border-radius: 13px; color: #fff; font-size: 14px;
          outline: none; font-family: 'Inter', sans-serif;
          transition: border-color 0.2s, background 0.2s;
        }
        .lg-input:focus {
          border-color: rgba(12,81,0,0.45);
          background: rgba(4,7,20,0.92);
        }
        .lg-input::placeholder { color: rgba(255,255,255,0.2); }

        /* ── Eye toggle ── */
        .lg-eye {
          position: absolute; right: 13px; top: 50%; transform: translateY(-50%);
          background: none; border: none; cursor: pointer; padding: 4px;
          color: rgba(255,255,255,0.24); display: flex; align-items: center;
          transition: color 0.2s;
        }
        .lg-eye:hover { color: rgba(255,255,255,0.55); }

        /* ── Submit button (file-1 style) ── */
        .lg-btn {
          width: 100%; padding: 15px;
          background: linear-gradient(135deg,#10b981,#06b6d4);
          border: none; border-radius: 13px;
          color: white; font-weight: 700; font-size: 14px;
          cursor: pointer; transition: all 0.25s ease;
          font-family: 'Inter', sans-serif; letter-spacing: 0.3px;
          display: flex; align-items: center; justify-content: center; gap: 8px;
        }
        .lg-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 10px 28px rgba(16,185,129,0.35);
        }
        .lg-btn:disabled { opacity: 0.6; cursor: not-allowed; }

        @keyframes spin { to { transform: rotate(360deg); } }

        @media(max-width: 768px) {
          .login-container { flex-direction: column; padding-top: 100px; }
          .login-left { padding: 0 20px 40px; display: none; }
          .login-right { width: 100%; padding: 0 16px 40px; }
          .brand { left: 20px; }
        }
      `}</style>

      <BeamsBackground />

      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          onDismiss={() => setToast(null)}
        />
      )}

      {/* Brand */}
      <div className="brand">
        <div className="brand-icon">CF</div>
        CampusFlow
      </div>

      <div className="login-container">
        {/* Left */}
        <div className="login-left">
          <h1 className="headline">
            Manage<br />Campus <span className="accent">Smarter.</span>
          </h1>
          <p style={{ color:'rgba(255,255,255,0.32)', fontSize:'0.96rem', lineHeight:1.75, maxWidth:320 }}>
            Access your dashboard, event tools, and live attendance tracking — all in one place.
          </p>
        </div>

        {/* Card */}
        <div className="login-right">
          <div ref={cardRef} className="bento-card">

            <div style={{ marginBottom: 26 }}>
              <h2 style={{ fontFamily:"'Syne',sans-serif", fontSize:24, fontWeight:800, color:'#fff', marginBottom:5, letterSpacing:'-0.4px' }}>
                {getRoleGreeting()}
              </h2>
              <p style={{ color:'rgba(255,255,255,0.28)', fontSize:13 }}>
                Select your role to continue
              </p>
            </div>

            {/* Role picker */}
            <div className="role-selector">
              {ROLES.map(r => (
                <button
                  key={r.id}
                  className={`role-btn${selectedRole === r.id ? ' active' : ''}`}
                  onClick={() => setRole(r.id)}
                  type="button"
                >
                  <div style={{ marginBottom:7, display:'flex', justifyContent:'center' }}>{r.icon}</div>
                  <div style={{ fontSize:9.5, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.5px' }}>
                    {r.label}
                  </div>
                </button>
              ))}
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: 9 }}>
                <input
                  className="lg-input"
                  type="email"
                  placeholder={selectedRole === 'committee' ? 'Committee Email' : 'Email Address'}
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                />
              </div>
              <div style={{ position:'relative', marginBottom:18 }}>
                <input
                  className="lg-input"
                  type={showPw ? 'text' : 'password'}
                  placeholder="Password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  style={{ paddingRight: 42 }}
                  required
                />
                <button type="button" className="lg-eye" onClick={() => setShowPw(p => !p)}>
                  {showPw
                    ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                    : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  }
                </button>
              </div>
              <button className="lg-btn" type="submit" disabled={loading}>
                {loading && (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ animation:'spin 0.8s linear infinite' }}>
                    <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                  </svg>
                )}
                {loading ? 'Authenticating…' : 'Sign In'}
              </button>
            </form>

            <div style={{ textAlign:'center', marginTop:18, fontSize:13, color:'rgba(255,255,255,0.28)' }}>
              New here?{' '}
              <Link to="/register" style={{ color:'#4ade80', fontWeight:600, textDecoration:'none' }}>
                Create account
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;