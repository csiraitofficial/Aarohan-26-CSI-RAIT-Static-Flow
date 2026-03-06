import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';

// ─── BEAMS BACKGROUND ────────────────────────────────────────────────────────
const BeamsBackground = () => {
  const canvasRef = useRef(null);
  const glRef = useRef(null);
  const animRef = useRef(0);
  const startRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext('webgl', { antialias: true, alpha: false });
    if (!gl) return;
    glRef.current = gl;

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
    const uRes = gl.getUniformLocation(prog, 'u_res');
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

// ─── TEXT TYPE ANIMATION ──────────────────────────────────────────────────────
const TextType = ({ words }) => {
  const [displayText, setDisplayText] = useState('');
  const [wordIndex, setWordIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    const currentWord = words[wordIndex];
    if (isPaused) {
      const timer = setTimeout(() => { setIsPaused(false); setIsDeleting(true); }, 2000);
      return () => clearTimeout(timer);
    }
    if (isDeleting) {
      if (displayText.length === 0) {
        setIsDeleting(false);
        setWordIndex(i => (i + 1) % words.length);
        return;
      }
      const timer = setTimeout(() => setDisplayText(t => t.slice(0, -1)), 40);
      return () => clearTimeout(timer);
    } else {
      if (displayText === currentWord) { setIsPaused(true); return; }
      const timer = setTimeout(() => setDisplayText(currentWord.slice(0, displayText.length + 1)), 80);
      return () => clearTimeout(timer);
    }
  }, [displayText, wordIndex, isDeleting, isPaused, words]);

  return <span>{displayText}<span className="type-cursor">|</span></span>;
};

// ─── LOGIN COMPONENT ──────────────────────────────────────────────────────────
const Login = () => {
  const auth = useAuth();
  const login = auth ? auth.login : null;
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedRole, setRole] = useState('student');
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!login) return;
    setError(''); setLoading(true);
    const result = await login(email, password);
    if (result.success) navigate('/dashboard');
    else setError(result.message);
    setLoading(false);
  };

  return (
    <div className="login-root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Syne:wght@700;800&display=swap');
        
        .login-root { 
            min-height: 100vh; 
            width: 100%; 
            display: flex; 
            position: relative; 
            overflow: hidden; 
            font-family: 'Inter', sans-serif; 
            background: #020617; 
            -webkit-font-smoothing: antialiased;
        }
        
        .login-container { display: flex; width: 100%; max-width: 1300px; margin: 0 auto; z-index: 2; align-items: center; }
        .login-left { flex: 1.2; padding: 0 60px; }
        .login-right { flex: 0.8; display: flex; justify-content: center; padding: 40px; }

        .brand { 
            position: absolute; top: 50px; left: 60px; 
            display: flex; align-items: center; gap: 14px; 
            font-family: 'Syne', sans-serif; color: #fff; 
            font-size: 22px; font-weight: 800; letter-spacing: -0.5px;
        }
        
        .headline { 
            font-family: 'Syne', sans-serif; 
            font-size: clamp(48px, 6vw, 82px); 
            color: #fff; 
            line-height: 0.95; 
            letter-spacing: -4px; 
            margin-bottom: 32px; 
        }
        
        .accent { background: linear-gradient(to right, #4ade80, #22d3ee); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        
        .sub-text { 
            color: rgba(255,255,255,0.5); 
            font-size: 1.1rem; 
            line-height: 1.6; 
            max-width: 440px; 
            font-weight: 400;
        }

        .bento-card {
          position: relative;
          width: 100%;
          max-width: 440px;
          padding: 48px;
          background: rgba(15, 23, 42, 0.4);
          backdrop-filter: blur(30px) saturate(150%);
          border-radius: 40px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow: 0 30px 60px -12px rgba(0, 0, 0, 0.6);
          animation: float 6s ease-in-out infinite;
        }

        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }

        .role-selector { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin: 32px 0; }
        .role-btn {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 20px;
          padding: 16px 8px;
          text-align: center;
          cursor: pointer;
          transition: all 0.4s cubic-bezier(0.23, 1, 0.32, 1);
        }
        
        .role-btn.active { 
          background: rgba(74, 222, 128, 0.15); 
          border-color: #4ade80; 
          transform: scale(1.05);
        }

        .role-label { 
            font-size: 11px; 
            font-weight: 700; 
            text-transform: uppercase; 
            letter-spacing: 1px;
            margin-top: 8px;
        }

        .input-group input {
          width: 100%;
          padding: 18px 24px;
          background: rgba(0,0,0,0.3);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 18px;
          color: #fff;
          font-family: 'Inter', sans-serif;
          font-size: 15px;
          transition: 0.3s;
        }
        
        .input-group input:focus { border-color: #4ade80; outline: none; background: rgba(0,0,0,0.5); }

        .login-btn {
          width: 100%;
          padding: 18px;
          margin-top: 24px;
          background: linear-gradient(135deg, #10b981, #06b6d4);
          border: none;
          border-radius: 18px;
          color: white;
          font-family: 'Inter', sans-serif;
          font-weight: 600;
          font-size: 16px;
          letter-spacing: -0.2px;
          cursor: pointer;
          transition: 0.3s cubic-bezier(0.23, 1, 0.32, 1);
        }
        .login-btn:hover { transform: translateY(-2px); box-shadow: 0 15px 30px rgba(16, 185, 129, 0.4); }

        .type-cursor { animation: blink 1s infinite; color: #4ade80; font-weight: 300; }
        @keyframes blink { 50% { opacity: 0; } }

        @media (max-width: 1000px) {
          .login-container { flex-direction: column; padding: 120px 20px 60px; }
          .login-left { text-align: center; padding: 0; margin-bottom: 60px; }
          .headline { font-size: 56px; }
          .sub-text { margin: 0 auto; }
          .brand { left: 50%; transform: translateX(-50%); }
        }
      `}</style>

      <BeamsBackground />
      
      <div className="brand">
        <div style={{width:'36px', height:'36px', background:'linear-gradient(135deg,#10b981,#06b6d4)', borderRadius:'10px', display:'flex', alignItems:'center', justifyContent:'center', fontSize: '18px'}}>🎓</div>
        CAMPUSFLOW
      </div>

      <div className="login-container">
        <div className="login-left">
          <h1 className="headline">
            Revolutionize<br />Campus <span className="accent"><TextType words={['Management.', 'Experience.', 'Engagement.']} /></span>
          </h1>
          <p className="sub-text">
            The next-generation platform for event coordination, smart monitoring, and campus-wide connectivity.
          </p>
        </div>

        <div className="login-right">
          <div className="bento-card">
            <h2 style={{color:'#fff', fontSize:'32px', fontWeight:800, fontFamily:'Syne', letterSpacing:'-1px'}}>Welcome</h2>
            <p style={{color:'rgba(255,255,255,0.4)', fontSize:'15px', fontWeight: 400}}>Identify your role to access the portal</p>

            <div className="role-selector">
              {['student', 'committee', 'admin'].map(role => (
                <div 
                  key={role} 
                  className={`role-btn ${selectedRole === role ? 'active' : ''}`}
                  onClick={() => setRole(role)}
                >
                  <div style={{fontSize:'24px'}}>{role === 'student' ? '🎓' : role === 'committee' ? '⚡' : '👑'}</div>
                  <div className="role-label" style={{ color: selectedRole === role ? '#4ade80' : 'rgba(255,255,255,0.3)' }}>
                    {role}
                  </div>
                </div>
              ))}
            </div>

            <form onSubmit={handleSubmit}>
              <div className="input-group" style={{marginBottom: '12px'}}>
                <input type="email" placeholder="Email Address" value={email} onChange={e => setEmail(e.target.value)} required />
              </div>
              <div className="input-group">
                <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required />
              </div>

              <button className="login-btn" type="submit" disabled={loading}>
                {loading ? 'Verifying...' : `Enter as ${selectedRole.charAt(0).toUpperCase() + selectedRole.slice(1)}`}
              </button>
            </form>

            <div style={{textAlign:'center', marginTop:'28px', fontSize:'14px', color:'rgba(255,255,255,0.4)'}}>
              New to the campus? <Link to="/register" style={{color:'#4ade80', fontWeight:600, textDecoration:'none'}}>Create Account</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;