import React, { useState, useEffect, useRef} from 'react';
import Heatmap from '../components/Heatmap';
import { crowdAPI } from '../utils/api';

// ─── BEAMS BACKGROUND ────────────────────────────────────────────────────────

// ─── BEAMS BACKGROUND — same shader as Login/Dashboard ───────────────────────
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

const CrowdMonitor = () => {
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [totalCrowd, setTotalCrowd] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setTimeout(() => setMounted(true), 100);
  }, []);

  return (
    <>
      <BeamsBackground />
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&display=swap');
        * { box-sizing: border-box; }

        .cm-root {
          font-family: 'Space Grotesk', sans-serif;
          color: white;
          opacity: ${mounted ? 1 : 0};
          transform: ${mounted ? 'translateY(0)' : 'translateY(16px)'};
          transition: all 0.6s cubic-bezier(0.16, 1, 0.3, 1);
          position: relative;
          z-index: 1;
        }

        .cm-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          margin-bottom: 28px;
          flex-wrap: wrap;
          gap: 16px;
        }

        .cm-title {
          font-size: 32px;
          font-weight: 700;
          color: white;
          letter-spacing: -1.5px;
          margin-bottom: 4px;
          background: linear-gradient(135deg,#ffffff 0%,#caf0f8 50%,#4eaec6 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          filter: drop-shadow(0 0 20px rgba(78,174,198,0.35));
        }

        .cm-sub {
          font-size: 15px;
          font-weight: 400;
          color: rgba(255,255,255,0.35);
        }

        .cm-live-badge {
          display: flex;
          align-items: center;
          gap: 8px;
          background: rgba(34,197,94,0.1);
          border: 1px solid rgba(34,197,94,0.2);
          border-radius: 100px;
          padding: 8px 16px;
          font-size: 13px;
          font-weight: 600;
          color: #86efac;
        }

        .cm-live-dot {
          width: 8px; height: 8px;
          background: #22c55e;
          border-radius: 50%;
          box-shadow: 0 0 8px #22c55e;
          animation: cmDot 1.5s ease-in-out infinite;
        }

        @keyframes cmDot {
          0%,100% { opacity:1; transform:scale(1); }
          50% { opacity:0.3; transform:scale(0.6); }
        }

        .cm-grid {
          display: grid;
          grid-template-columns: 1fr 340px;
          gap: 20px;
        }

        .cm-section {
          background: rgba(5,12,32,0.70);
          border: 1px solid rgba(78,174,198,0.15);
          border-radius: 20px;
          padding: 24px;
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          box-shadow: 0 20px 60px rgba(0,0,0,0.4), inset 0 1px 0 rgba(78,174,198,0.09);
        }

        .cm-section-title {
          font-size: 17px;
          font-weight: 700;
          letter-spacing: -0.5px;
          margin-bottom: 20px;
          background: linear-gradient(135deg,#ffffff,#93d8e8);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .cm-tips {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .cm-tip {
          background: rgba(5,12,32,0.55);
          border: 1px solid rgba(78,174,198,0.12);
          border-radius: 14px;
          padding: 16px;
          backdrop-filter: blur(12px);
          transition: border-color 0.2s ease;
          cursor: default;
          display: flex;
          align-items: flex-start;
          gap: 12px;
        }

        .cm-tip-icon {
          width: 36px; height: 36px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          flex-shrink: 0;
        }

        .cm-tip-title {
          font-size: 14px;
          font-weight: 700;
          color: white;
          margin-bottom: 4px;
        }

        .cm-tip-desc {
          font-size: 13px;
          color: rgba(255,255,255,0.38);
          line-height: 1.55;
        }

        .cm-legend {
          display: flex;
          flex-direction: column;
          gap: 10px;
          margin-bottom: 20px;
        }

        .cm-legend-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 14px;
          border-radius: 10px;
          font-size: 13px;
          font-weight: 500;
        }

        .cm-legend-dot {
          width: 10px; height: 10px;
          border-radius: 50%;
          flex-shrink: 0;
        }

        .cm-legend-label { flex: 1; color: rgba(255,255,255,0.5); font-size: 13.5px; font-weight: 600; }
        .cm-legend-count { font-weight: 700; font-size: 13.5px; }

        @media (max-width: 1100px) {
          .cm-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      <div className="cm-root">

        <div className="cm-header">
          <div>
            <div className="cm-title">Crowd Monitor 👥</div>
            <div className="cm-sub">Live crowd density across all campus zones</div>
          </div>
          <div className="cm-live-badge">
            <div className="cm-live-dot" />
            Live — updates every 10s
          </div>
        </div>

        <div className="cm-grid">

          <div className="cm-section">
            <Heatmap showSimulation={true} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

            <div className="cm-section">
              <div className="cm-section-title">🎨 Crowd Levels</div>
              <div className="cm-legend">
                {[
                  { color: '#22c55e', bg: 'rgba(34,197,94,0.08)', border: 'rgba(34,197,94,0.15)', label: 'Low Density', count: '0 – 29', desc: 'Safe' },
                  { color: '#f59e0b', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.15)', label: 'Moderate', count: '30 – 70', desc: 'Monitor' },
                  { color: '#ef4444', bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.15)', label: 'High Density', count: '71 – 100', desc: 'Alert!' },
                ].map(item => (
                  <div key={item.label} className="cm-legend-item" style={{ background: item.bg, border: `1px solid ${item.border}` }}>
                    <div className="cm-legend-dot" style={{ background: item.color, boxShadow: `0 0 8px ${item.color}` }} />
                    <span className="cm-legend-label">{item.label}</span>
                    <span className="cm-legend-count" style={{ color: item.color }}>{item.count}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="cm-section">
              <div className="cm-section-title">💡 Safety Tips</div>
              <div className="cm-tips">
                {[
                  { icon: '🚨', color: 'rgba(239,68,68,0.1)', title: 'Red Zone Alert', desc: 'Immediately redirect crowd to less dense zones and alert security.' },
                  { icon: '⚠️', color: 'rgba(245,158,11,0.1)', title: 'Yellow Zone Watch', desc: 'Monitor closely — open additional entry/exit points if needed.' },
                  { icon: '✅', color: 'rgba(34,197,94,0.1)', title: 'Green Zone Safe', desc: 'Normal operations — crowd levels are within safe limits.' },
                  { icon: '📱', color: 'rgba(99,102,241,0.1)', title: 'Use Panic Button', desc: 'In case of emergency, use the red panic button to alert all staff.' },
                ].map(tip => (
                  <div key={tip.title} className="cm-tip">
                    <div className="cm-tip-icon" style={{ background: tip.color }}>{tip.icon}</div>
                    <div>
                      <div className="cm-tip-title">{tip.title}</div>
                      <div className="cm-tip-desc">{tip.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>
    </>
  );
};

export default CrowdMonitor;
