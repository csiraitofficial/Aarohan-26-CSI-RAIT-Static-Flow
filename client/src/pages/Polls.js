import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.REACT_APP_SUPABASE_ANON_KEY
);

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
    const x = e.clientX, y = e.clientY, id = ++idRef.current, count = 18;
    const ns = Array.from({ length: count }, (_, i) => ({
      id: `${id}-${i}`, x, y, angle: (i / count) * 360,
      dist: (40 + Math.random() * 30) * 1.2, size: 2.5 + Math.random() * 3,
      color: ['#4eaec6','#93d8e8','#ffffff','#2a8fa8','#60d8f0','#b3eef8'][Math.floor(Math.random() * 6)],
    }));
    setSparks(s => [...s, ...ns]);
    setTimeout(() => setSparks(s => s.filter(sp => !ns.find(n => n.id === sp.id))), 700);
  }, []);
  return (
    <div style={{ position: 'relative', width: '100%' }} onClick={fire}>
      {sparks.map(sp => (
        <span key={sp.id} style={{
          position: 'fixed', left: sp.x, top: sp.y, width: sp.size, height: sp.size,
          borderRadius: '50%', background: sp.color, pointerEvents: 'none', zIndex: 9999,
          transform: 'translate(-50%,-50%)', boxShadow: `0 0 ${sp.size * 2}px ${sp.color}`,
          animation: `plspk${Math.round(sp.angle)} 0.65s ease-out forwards`,
        }} />
      ))}
      <style>{`${Array.from({ length: 360 }, (_, i) => `@keyframes plspk${i}{0%{opacity:1;transform:translate(-50%,-50%) scale(1);}100%{opacity:0;transform:translate(-50%,-50%) translate(${Math.cos(i * Math.PI / 180) * 72}px,${Math.sin(i * Math.PI / 180) * 72}px) scale(0);}}`).join('')}`}</style>
      {children}
    </div>
  );
};

const Polls = () => {
  const { user } = useAuth();
  const isStaff = user?.role === 'committee' || user?.role === 'admin';

  const [polls,       setPolls]       = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [message,     setMessage]     = useState('');
  const [submitting,  setSubmitting]  = useState(false);
  const [votedPolls,  setVotedPolls]  = useState({});
  const [mounted,     setMounted]     = useState(false);
  const [filter,      setFilter]      = useState('open');

  useEffect(() => {
    setTimeout(() => setMounted(true), 100);
    fetchPolls();
    fetchMyVotes();

    const channel = supabase
      .channel('polls-realtime-' + Math.random())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'polls' }, () => fetchPolls())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'poll_votes' }, () => {
        fetchPolls();
        fetchMyVotes();
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  const fetchPolls = async () => {
    const { data, error } = await supabase
      .from('polls')
      .select('*, users(name, role)')
      .order('created_at', { ascending: false });
    if (!error) setPolls(data || []);
    setLoading(false);
  };

  const fetchMyVotes = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('poll_votes')
      .select('poll_id, vote')
      .eq('user_id', user.id);
    const map = {};
    (data || []).forEach(v => { map[v.poll_id] = v.vote; });
    setVotedPolls(map);
  };

  const handleSubmit = async () => {
    if (!message.trim()) return;
    setSubmitting(true);
    try {
      await supabase.from('polls').insert([{
        user_id: user.id,
        message: message.trim(),
        status: 'open',
      }]);
      setMessage('');
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleVote = async (pollId, vote) => {
    if (votedPolls[pollId]) return;
    const field = vote === 'agree' ? 'agree_count' : 'disagree_count';
    const poll  = polls.find(p => p.id === pollId);
    if (!poll) return;
    await supabase.from('poll_votes').insert([{ poll_id: pollId, user_id: user.id, vote }]);
    await supabase.from('polls').update({ [field]: (poll[field] || 0) + 1 }).eq('id', pollId);
    setVotedPolls(prev => ({ ...prev, [pollId]: vote }));
    fetchPolls();
  };

  const handleAction = async (pollId, status) => {
    await supabase.from('polls').update({ status }).eq('id', pollId);
    fetchPolls();
  };

  const formatTime = (d) => {
    const diff = Date.now() - new Date(d);
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  const getRoleAccent = (role) => {
    if (role === 'admin')     return { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)',  label: 'Admin'     };
    if (role === 'committee') return { color: '#818cf8', bg: 'rgba(99,102,241,0.12)',  label: 'Committee' };
    return                           { color: '#22d3ee', bg: 'rgba(6,182,212,0.12)',   label: 'Student'   };
  };

  const STATUS_CFG = {
    open:      { color: '#fbbf24', bg: 'rgba(245,158,11,0.10)',  border: 'rgba(245,158,11,0.22)',  dot: '#f59e0b', label: 'Open'      },
    resolved:  { color: '#4ade80', bg: 'rgba(34,197,94,0.10)',   border: 'rgba(34,197,94,0.22)',   dot: '#22c55e', label: 'Resolved'  },
    dismissed: { color: 'rgba(255,255,255,0.3)', bg: 'rgba(255,255,255,0.04)', border: 'rgba(255,255,255,0.08)', dot: 'rgba(255,255,255,0.2)', label: 'Dismissed' },
  };

  const FILTERS = [
    { id: 'open',      label: '🔴 Open'      },
    { id: 'resolved',  label: '✅ Resolved'  },
    { id: 'dismissed', label: '🚫 Dismissed' },
    { id: 'all',       label: '📋 All'       },
  ];

  const filteredPolls = polls.filter(p => filter === 'all' ? true : p.status === filter);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800;900&display=swap');
        * { box-sizing: border-box; }

        .pl-root {
          font-family: 'Plus Jakarta Sans', sans-serif;
          color: white;
          max-width: 720px;
          margin: 0 auto;
          position: relative;
          z-index: 1;
          opacity: ${mounted ? 1 : 0};
          transform: ${mounted ? 'translateY(0)' : 'translateY(20px)'};
          transition: opacity 0.55s ease, transform 0.55s cubic-bezier(0.16,1,0.3,1);
        }

        .pl-header { margin-bottom: 28px; }
        .pl-title {
          font-size: 26px; font-weight: 900; letter-spacing: -1px;
          color: white; margin-bottom: 5px;
          display: flex; align-items: center; gap: 10px;
        }
        .pl-sub { font-size: 13px; color: rgba(255,255,255,0.3); display: flex; align-items: center; gap: 7px; }
        .pl-live-dot {
          width: 7px; height: 7px; border-radius: 50%;
          background: #22c55e; box-shadow: 0 0 7px #22c55e;
          display: inline-block; animation: plDot 1.4s ease-in-out infinite;
        }
        @keyframes plDot { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.3;transform:scale(0.8)} }

        .pl-compose {
          background: rgba(8,10,22,0.92);
          border: 1px solid rgba(99,102,241,0.2);
          border-radius: 22px; padding: 22px; margin-bottom: 22px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.05);
          backdrop-filter: blur(24px);
        }
        .pl-compose-label {
          font-size: 11px; font-weight: 700; letter-spacing: 1px;
          text-transform: uppercase; color: rgba(255,255,255,0.3);
          margin-bottom: 12px; display: block;
        }
        .pl-compose-input {
          width: 100%; background: rgba(255,255,255,0.03);
          border: 1.5px solid rgba(255,255,255,0.07);
          border-radius: 14px; padding: 14px 16px;
          font-size: 14px; color: white; line-height: 1.6;
          font-family: 'Plus Jakarta Sans', sans-serif;
          outline: none; resize: none; min-height: 82px;
          transition: border-color 0.2s, background 0.2s;
        }
        .pl-compose-input:focus {
          border-color: rgba(99,102,241,0.45);
          background: rgba(99,102,241,0.04);
        }
        .pl-compose-input::placeholder { color: rgba(255,255,255,0.14); }
        .pl-compose-footer {
          display: flex; align-items: center;
          justify-content: space-between; margin-top: 14px;
        }
        .pl-char-count { font-size: 12px; color: rgba(255,255,255,0.18); }
        .pl-submit-btn {
          padding: 10px 22px;
          background: linear-gradient(135deg, #6366f1, #4f46e5);
          border: none; border-radius: 12px;
          color: white; font-size: 13px; font-weight: 700;
          cursor: pointer; font-family: 'Plus Jakarta Sans', sans-serif;
          transition: all 0.25s ease;
          box-shadow: 0 4px 16px rgba(99,102,241,0.35);
          display: flex; align-items: center; gap: 8px;
        }
        .pl-submit-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(99,102,241,0.55);
        }
        .pl-submit-btn:disabled { opacity: 0.45; cursor: not-allowed; }

        .pl-filters {
          display: flex; gap: 4px; margin-bottom: 22px;
          background: rgba(0,0,0,0.35);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 14px; padding: 4px;
          width: fit-content; backdrop-filter: blur(12px);
        }
        .pl-filter {
          padding: 7px 16px; border-radius: 10px;
          font-size: 12px; font-weight: 700;
          cursor: pointer; border: 1px solid transparent;
          font-family: 'Plus Jakarta Sans', sans-serif;
          color: rgba(255,255,255,0.35); background: transparent;
          transition: all 0.2s ease; letter-spacing: 0.1px;
        }
        .pl-filter.active {
          background: rgba(99,102,241,0.14);
          color: #a5b4fc; border-color: rgba(99,102,241,0.25);
        }
        .pl-filter:hover:not(.active) {
          color: rgba(255,255,255,0.6);
          background: rgba(255,255,255,0.04);
        }

        .pl-poll {
          background: rgba(8,10,22,0.92);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 20px; padding: 22px; margin-bottom: 12px;
          backdrop-filter: blur(24px);
          box-shadow: 0 4px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.04);
          transition: border-color 0.25s ease, box-shadow 0.25s ease, transform 0.2s ease;
          position: relative; overflow: hidden;
          animation: plCardIn 0.45s cubic-bezier(0.16,1,0.3,1) both;
        }
        .pl-poll::before {
          content: ''; position: absolute;
          left: 0; top: 16px; bottom: 16px;
          width: 3px; border-radius: 0 3px 3px 0;
          background: var(--accent, rgba(99,102,241,0.6));
          opacity: 0; transition: opacity 0.25s ease;
        }
        .pl-poll:hover {
          border-color: rgba(255,255,255,0.13);
          box-shadow: 0 8px 40px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.06);
          transform: translateY(-1px);
        }
        .pl-poll:hover::before { opacity: 1; }
        @keyframes plCardIn { from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none} }

        .pl-poll-header { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
        .pl-avatar {
          width: 38px; height: 38px; border-radius: 11px;
          display: flex; align-items: center; justify-content: center;
          font-size: 15px; font-weight: 800; color: white;
          flex-shrink: 0; box-shadow: 0 4px 12px rgba(0,0,0,0.4);
        }
        .pl-poll-name {
          font-size: 13px; font-weight: 700; color: white;
          display: flex; align-items: center; gap: 7px;
        }
        .pl-role-chip {
          font-size: 9.5px; font-weight: 700; letter-spacing: 0.4px;
          padding: 2px 8px; border-radius: 100px; text-transform: uppercase;
        }
        .pl-poll-time { font-size: 11px; color: rgba(255,255,255,0.28); margin-top: 2px; }

        .pl-status-badge {
          font-size: 10.5px; font-weight: 700;
          padding: 4px 11px; border-radius: 100px;
          margin-left: auto; display: flex; align-items: center;
          gap: 5px; letter-spacing: 0.2px; flex-shrink: 0;
        }
        .pl-status-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }

        .pl-poll-msg {
          font-size: 14.5px; color: rgba(255,255,255,0.8);
          line-height: 1.65; margin-bottom: 18px;
          font-weight: 500; letter-spacing: -0.1px;
        }

        .pl-vote-meta {
          display: flex; justify-content: space-between;
          font-size: 11px; color: rgba(255,255,255,0.3);
          margin-bottom: 6px; font-weight: 600;
        }
        .pl-vote-meta span { display: flex; align-items: center; gap: 4px; }
        .pl-bar-bg {
          height: 5px; border-radius: 100px;
          background: rgba(255,255,255,0.06);
          overflow: hidden; margin-bottom: 14px;
        }
        .pl-bar-inner { display: flex; height: 100%; }
        .pl-bar-agree {
          height: 100%; border-radius: 100px 0 0 100px;
          background: linear-gradient(90deg, #22c55e, #4ade80);
          transition: width 0.55s cubic-bezier(0.16,1,0.3,1);
        }
        .pl-bar-disagree {
          height: 100%; border-radius: 0 100px 100px 0;
          background: linear-gradient(90deg, #f87171, #ef4444);
          transition: width 0.55s cubic-bezier(0.16,1,0.3,1);
        }

        .pl-vote-row { display: flex; gap: 10px; }
        .pl-vote-btn {
          flex: 1; padding: 11px 14px; border-radius: 13px;
          font-size: 13px; font-weight: 700; cursor: pointer;
          font-family: 'Plus Jakarta Sans', sans-serif;
          transition: all 0.25s cubic-bezier(0.34,1.56,0.64,1);
          display: flex; align-items: center; justify-content: center;
          gap: 7px; border: 1.5px solid;
        }
        .pl-vote-agree { background: rgba(34,197,94,0.07); border-color: rgba(34,197,94,0.18); color: #86efac; }
        .pl-vote-agree:hover:not(:disabled) { background: rgba(34,197,94,0.14); border-color: rgba(34,197,94,0.35); transform: translateY(-2px); box-shadow: 0 6px 20px rgba(34,197,94,0.2); }
        .pl-vote-agree.voted { background: rgba(34,197,94,0.16); border-color: rgba(34,197,94,0.45); color: #4ade80; box-shadow: 0 0 0 3px rgba(34,197,94,0.1); }
        .pl-vote-disagree { background: rgba(239,68,68,0.07); border-color: rgba(239,68,68,0.18); color: #fca5a5; }
        .pl-vote-disagree:hover:not(:disabled) { background: rgba(239,68,68,0.14); border-color: rgba(239,68,68,0.35); transform: translateY(-2px); box-shadow: 0 6px 20px rgba(239,68,68,0.2); }
        .pl-vote-disagree.voted { background: rgba(239,68,68,0.16); border-color: rgba(239,68,68,0.45); color: #f87171; box-shadow: 0 0 0 3px rgba(239,68,68,0.1); }
        .pl-vote-btn:disabled { cursor: not-allowed; opacity: 0.55; transform: none !important; box-shadow: none !important; }

        .pl-action-row {
          display: flex; gap: 8px; margin-top: 16px;
          padding-top: 14px; border-top: 1px solid rgba(255,255,255,0.06);
          align-items: center;
        }
        .pl-action-label { font-size: 11px; color: rgba(255,255,255,0.25); font-weight: 600; margin-right: auto; letter-spacing: 0.3px; }
        .pl-action-btn {
          padding: 7px 15px; border-radius: 9px;
          font-size: 12px; font-weight: 700; cursor: pointer;
          font-family: 'Plus Jakarta Sans', sans-serif;
          transition: all 0.2s ease; border: 1px solid;
          display: flex; align-items: center; gap: 6px;
        }
        .pl-action-resolved { background: rgba(34,197,94,0.08); border-color: rgba(34,197,94,0.22); color: #86efac; }
        .pl-action-resolved:hover { background: rgba(34,197,94,0.16); border-color: rgba(34,197,94,0.4); transform: translateY(-1px); }
        .pl-action-dismissed { background: rgba(255,255,255,0.04); border-color: rgba(255,255,255,0.09); color: rgba(255,255,255,0.3); }
        .pl-action-dismissed:hover { background: rgba(255,255,255,0.08); color: rgba(255,255,255,0.55); }

        .pl-empty { text-align: center; padding: 64px 24px; color: rgba(255,255,255,0.2); }
        .pl-empty-icon { font-size: 44px; display: block; margin-bottom: 14px; }
        .pl-empty-title { font-size: 15px; font-weight: 700; color: rgba(255,255,255,0.25); margin-bottom: 6px; }
        .pl-empty-sub { font-size: 13px; color: rgba(255,255,255,0.15); }

        .pl-spinner {
          width: 13px; height: 13px;
          border: 2px solid rgba(255,255,255,0.25);
          border-top-color: white; border-radius: 50%;
          animation: plSpin 0.65s linear infinite;
        }
        @keyframes plSpin { to { transform: rotate(360deg); } }
      `}</style>

      <BeamsBackground />

      <ClickSpark>
        <div className="pl-root">

          {/* ── Header ── */}
          <div className="pl-header">
            <div className="pl-title">
              <span>💬</span> Student Issues & Polls
            </div>
            <div className="pl-sub">
              <span className="pl-live-dot" />
              Live · Raise issues, vote, get action taken
            </div>
          </div>

          {/* ── Compose (students only) ── */}
          {!isStaff && (
            <div className="pl-compose">
              <span className="pl-compose-label">Raise an Issue or Poll</span>
              <textarea
                className="pl-compose-input"
                placeholder="e.g. Food stall queue is too long, need more counters..."
                value={message}
                onChange={e => setMessage(e.target.value.slice(0, 200))}
              />
              <div className="pl-compose-footer">
                <span className="pl-char-count">{message.length}/200</span>
                <button
                  className="pl-submit-btn"
                  onClick={handleSubmit}
                  disabled={submitting || !message.trim()}
                >
                  {submitting
                    ? <><div className="pl-spinner" /> Posting…</>
                    : <>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                        Post Issue
                      </>
                  }
                </button>
              </div>
            </div>
          )}

          {/* ── Filter tabs ── */}
          <div className="pl-filters">
            {FILTERS.map(f => (
              <button
                key={f.id}
                className={`pl-filter ${filter === f.id ? 'active' : ''}`}
                onClick={() => setFilter(f.id)}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* ── Poll list ── */}
          {loading ? (
            <div className="pl-empty">
              <span className="pl-empty-icon">⏳</span>
              <div className="pl-empty-title">Loading polls…</div>
            </div>
          ) : filteredPolls.length === 0 ? (
            <div className="pl-empty">
              <span className="pl-empty-icon">💬</span>
              <div className="pl-empty-title">No issues here</div>
              <div className="pl-empty-sub">
                {filter === 'open' && !isStaff ? 'Be the first to raise an issue!' : `No ${filter} polls yet.`}
              </div>
            </div>
          ) : (
            filteredPolls.map((poll, idx) => {
              const total       = (poll.agree_count || 0) + (poll.disagree_count || 0);
              const agreePct    = total > 0 ? Math.round((poll.agree_count    / total) * 100) : 0;
              const disagreePct = total > 0 ? Math.round((poll.disagree_count / total) * 100) : 0;
              const myVote      = votedPolls[poll.id];
              const sc          = STATUS_CFG[poll.status] || STATUS_CFG.open;
              const role        = getRoleAccent(poll.users?.role);

              return (
                <div
                  key={poll.id}
                  className="pl-poll"
                  style={{ '--accent': role.color, animationDelay: `${idx * 0.06}s` }}
                >
                  <div className="pl-poll-header">
                    <div className="pl-avatar" style={{ background: `linear-gradient(135deg, ${role.color}, ${role.color}88)` }}>
                      {poll.users?.name?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="pl-poll-name">
                        {poll.users?.name || 'Student'}
                        <span className="pl-role-chip" style={{ color: role.color, background: role.bg }}>{role.label}</span>
                      </div>
                      <div className="pl-poll-time">{formatTime(poll.created_at)}</div>
                    </div>
                    <div className="pl-status-badge" style={{ color: sc.color, background: sc.bg, border: `1px solid ${sc.border}` }}>
                      <div className="pl-status-dot" style={{ background: sc.dot }} />
                      {sc.label}
                    </div>
                  </div>

                  <div className="pl-poll-msg">{poll.message}</div>

                  <div className="pl-vote-meta">
                    <span>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                      {poll.agree_count || 0} agree · {agreePct}%
                    </span>
                    <span>
                      {disagreePct}% · {poll.disagree_count || 0} disagree
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </span>
                  </div>
                  <div className="pl-bar-bg">
                    <div className="pl-bar-inner">
                      <div className="pl-bar-agree"    style={{ width: `${agreePct}%`    }} />
                      <div className="pl-bar-disagree" style={{ width: `${disagreePct}%` }} />
                    </div>
                  </div>

                  <div className="pl-vote-row">
                    <button
                      className={`pl-vote-btn pl-vote-agree ${myVote === 'agree' ? 'voted' : ''}`}
                      onClick={() => handleVote(poll.id, 'agree')}
                      disabled={!!myVote || poll.status !== 'open' || isStaff}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill={myVote === 'agree' ? '#4ade80' : 'none'} stroke="#4ade80" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z"/>
                        <path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/>
                      </svg>
                      Agree · {poll.agree_count || 0}
                    </button>
                    <button
                      className={`pl-vote-btn pl-vote-disagree ${myVote === 'disagree' ? 'voted' : ''}`}
                      onClick={() => handleVote(poll.id, 'disagree')}
                      disabled={!!myVote || poll.status !== 'open' || isStaff}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill={myVote === 'disagree' ? '#f87171' : 'none'} stroke="#f87171" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3H10z"/>
                        <path d="M17 2h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17"/>
                      </svg>
                      Disagree · {poll.disagree_count || 0}
                    </button>
                  </div>

                  {isStaff && poll.status === 'open' && (
                    <div className="pl-action-row">
                      <span className="pl-action-label">Take action</span>
                      <button className="pl-action-btn pl-action-resolved" onClick={() => handleAction(poll.id, 'resolved')}>
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#86efac" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                        Mark Resolved
                      </button>
                      <button className="pl-action-btn pl-action-dismissed" onClick={() => handleAction(poll.id, 'dismissed')}>
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
                        Dismiss
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </ClickSpark>
    </>
  );
};

export default Polls;