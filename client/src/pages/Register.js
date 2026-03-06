import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';

const ROLES = [
  { id: 'student', label: 'Student', icon: '🎓', desc: 'Attend & register for events' },
  { id: 'committee', label: 'Committee', icon: '⚡', desc: 'Organize & manage events' },
  { id: 'admin', label: 'Admin', icon: '👑', desc: 'Full platform control' },
];

const Register = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [mounted, setMounted] = useState(false);
  const [selectedRole, setSelectedRole] = useState('student');
  const [step, setStep] = useState(1);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    name: '', email: '', password: '', confirmPassword: '',
    college: '', phone: ''
  });

  useEffect(() => { setTimeout(() => setMounted(true), 100); }, []);

  const update = (field, value) => setForm(f => ({ ...f, [field]: value }));

  const handleStep1 = (e) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setError('');
    setStep(2);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await register({
      name: form.name,
      email: form.email,
      password: form.password,
      role: selectedRole,
      college: form.college,
      phone: form.phone,
    });

    if (result.success) {
      navigate('/login');
    } else {
      setError(result.message);
    }
    setLoading(false);
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap');
        *, *::before, *::after { margin:0; padding:0; box-sizing:border-box; }

        .rg-root {
          min-height: 100vh;
          width: 100%;
          display: flex;
          font-family: 'Plus Jakarta Sans', sans-serif;
          background: #04050a;
          overflow: hidden;
          position: relative;
        }

        .rg-mesh {
          position: absolute;
          inset: 0;
          pointer-events: none;
          overflow: hidden;
          z-index: 0;
        }

        .rg-blob {
          position: absolute;
          border-radius: 50%;
          filter: blur(100px);
          animation: rgMove linear infinite;
        }

        .rg-blob:nth-child(1) {
          width: 600px; height: 600px;
          background: radial-gradient(circle, #6366f1, #4f46e5);
          top: -200px; right: -100px;
          animation-duration: 20s;
          opacity: 0.1;
        }

        .rg-blob:nth-child(2) {
          width: 500px; height: 500px;
          background: radial-gradient(circle, #06b6d4, #0891b2);
          bottom: -100px; left: -100px;
          animation-duration: 25s;
          animation-direction: reverse;
          opacity: 0.07;
        }

        .rg-blob:nth-child(3) {
          width: 350px; height: 350px;
          background: radial-gradient(circle, #8b5cf6, transparent);
          top: 40%; left: 40%;
          animation-duration: 18s;
          opacity: 0.06;
        }

        @keyframes rgMove {
          0%,100% { transform: translate(0,0) scale(1); }
          33% { transform: translate(40px,-40px) scale(1.05); }
          66% { transform: translate(-30px,30px) scale(0.95); }
        }

        .rg-grid {
          position: absolute; inset: 0;
          background-image:
            linear-gradient(rgba(99,102,241,0.025) 1px, transparent 1px),
            linear-gradient(90deg, rgba(99,102,241,0.025) 1px, transparent 1px);
          background-size: 60px 60px;
          pointer-events: none; z-index: 0;
        }

        .rg-wrap {
          position: relative; z-index: 1;
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 40px 20px;
          min-height: 100vh;
        }

        .rg-card {
          width: 100%;
          max-width: 520px;
          background: rgba(7,9,15,0.85);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 24px;
          padding: 48px 44px;
          backdrop-filter: blur(20px);
          box-shadow: 0 32px 80px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06);
          opacity: ${mounted ? 1 : 0};
          transform: ${mounted ? 'translateY(0) scale(1)' : 'translateY(32px) scale(0.98)'};
          transition: all 0.9s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .rg-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 36px;
        }

        .rg-brand {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .rg-brand-icon {
          width: 38px; height: 38px;
          background: linear-gradient(135deg, #6366f1, #4f46e5);
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
          box-shadow: 0 4px 16px rgba(99,102,241,0.4);
        }

        .rg-brand-name {
          font-size: 17px;
          font-weight: 700;
          color: white;
          letter-spacing: -0.5px;
        }

        .rg-steps {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .rg-step-dot {
          width: 28px; height: 4px;
          border-radius: 100px;
          transition: all 0.4s ease;
        }

        .rg-step-dot.active {
          background: linear-gradient(90deg, #6366f1, #06b6d4);
          width: 40px;
        }

        .rg-step-dot.done {
          background: #6366f1;
        }

        .rg-step-dot.inactive {
          background: rgba(255,255,255,0.1);
        }

        .rg-title {
          font-size: 28px;
          font-weight: 800;
          color: white;
          letter-spacing: -1px;
          margin-bottom: 6px;
        }

        .rg-sub {
          font-size: 14px;
          color: rgba(255,255,255,0.3);
          margin-bottom: 28px;
          font-weight: 400;
        }

        /* ROLE SELECTOR */
        .rg-roles {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
          margin-bottom: 28px;
        }

        .rg-role {
          background: rgba(255,255,255,0.03);
          border: 1.5px solid rgba(255,255,255,0.07);
          border-radius: 14px;
          padding: 14px 10px;
          cursor: pointer;
          text-align: center;
          transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
          position: relative;
        }

        .rg-role:hover {
          border-color: rgba(99,102,241,0.3);
          background: rgba(99,102,241,0.05);
          transform: translateY(-2px);
        }

        .rg-role.active {
          border-color: rgba(99,102,241,0.6);
          background: rgba(99,102,241,0.1);
          box-shadow: 0 0 0 3px rgba(99,102,241,0.1);
          transform: translateY(-2px);
        }

        .rg-role.active::after {
          content: '✓';
          position: absolute;
          top: 8px; right: 10px;
          font-size: 10px;
          color: #818cf8;
          font-weight: 700;
        }

        .rg-role-icon { font-size: 22px; display: block; margin-bottom: 6px; }
        .rg-role-name { font-size: 12px; font-weight: 700; color: white; display: block; margin-bottom: 2px; }
        .rg-role-desc { font-size: 10px; color: rgba(255,255,255,0.25); line-height: 1.4; display: block; }

        .rg-error {
          background: rgba(239,68,68,0.08);
          border: 1px solid rgba(239,68,68,0.2);
          border-radius: 12px;
          padding: 12px 16px;
          font-size: 13px;
          color: #fca5a5;
          margin-bottom: 20px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .rg-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
        }

        .rg-field { margin-bottom: 16px; }

        .rg-label {
          display: block;
          font-size: 11px;
          font-weight: 600;
          color: rgba(255,255,255,0.35);
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-bottom: 8px;
        }

        .rg-input-wrap { position: relative; }

        .rg-icon {
          position: absolute;
          left: 14px; top: 50%;
          transform: translateY(-50%);
          font-size: 15px;
          opacity: 0.3;
          pointer-events: none;
        }

        .rg-input {
          width: 100%;
          background: rgba(255,255,255,0.04);
          border: 1.5px solid rgba(255,255,255,0.07);
          border-radius: 12px;
          padding: 13px 14px 13px 42px;
          font-size: 14px;
          color: white;
          font-family: 'Plus Jakarta Sans', sans-serif;
          outline: none;
          transition: all 0.25s ease;
        }

        .rg-input::placeholder { color: rgba(255,255,255,0.12); }

        .rg-input:focus {
          border-color: rgba(99,102,241,0.5);
          background: rgba(99,102,241,0.06);
          box-shadow: 0 0 0 4px rgba(99,102,241,0.08);
        }

        .rg-btn {
          width: 100%;
          height: 52px;
          background: linear-gradient(135deg, #6366f1, #4f46e5);
          border: none;
          border-radius: 14px;
          font-size: 15px;
          font-weight: 700;
          color: white;
          cursor: pointer;
          font-family: 'Plus Jakarta Sans', sans-serif;
          transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          box-shadow: 0 4px 24px rgba(99,102,241,0.4), inset 0 1px 0 rgba(255,255,255,0.15);
          margin-top: 8px;
          margin-bottom: 20px;
          position: relative;
          overflow: hidden;
        }

        .rg-btn::after {
          content: '';
          position: absolute;
          top: 0; left: -100%;
          width: 60%; height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent);
          transition: left 0.5s ease;
        }

        .rg-btn:hover:not(:disabled)::after { left: 150%; }

        .rg-btn:hover:not(:disabled) {
          transform: translateY(-2px) scale(1.01);
          box-shadow: 0 8px 32px rgba(99,102,241,0.5);
        }

        .rg-btn:disabled { opacity: 0.5; cursor: not-allowed; }

        .rg-btn-back {
          width: 100%;
          height: 52px;
          background: rgba(255,255,255,0.04);
          border: 1.5px solid rgba(255,255,255,0.08);
          border-radius: 14px;
          font-size: 14px;
          font-weight: 600;
          color: rgba(255,255,255,0.5);
          cursor: pointer;
          font-family: 'Plus Jakarta Sans', sans-serif;
          transition: all 0.2s ease;
          margin-bottom: 8px;
        }

        .rg-btn-back:hover {
          background: rgba(255,255,255,0.07);
          color: white;
        }

        .rg-login {
          text-align: center;
          font-size: 14px;
          color: rgba(255,255,255,0.28);
          margin-top: 4px;
        }

        .rg-login a {
          color: #818cf8;
          text-decoration: none;
          font-weight: 600;
          margin-left: 4px;
        }

        .rg-login a:hover { color: #a5b4fc; }

        .rg-spinner {
          width: 18px; height: 18px;
          border: 2px solid rgba(255,255,255,0.25);
          border-top-color: white;
          border-radius: 50%;
          animation: rgSpin 0.7s linear infinite;
        }

        @keyframes rgSpin { to { transform: rotate(360deg); } }

        .rg-success-icon {
          width: 56px; height: 56px;
          background: linear-gradient(135deg, rgba(99,102,241,0.2), rgba(6,182,212,0.2));
          border: 1px solid rgba(99,102,241,0.3);
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
          margin-bottom: 20px;
        }
      `}</style>

      <div className="rg-root">
        <div className="rg-mesh">
          <div className="rg-blob" /><div className="rg-blob" /><div className="rg-blob" />
        </div>
        <div className="rg-grid" />

        <div className="rg-wrap">
          <div className="rg-card">

            {/* TOP BAR */}
            <div className="rg-top">
              <div className="rg-brand">
                <div className="rg-brand-icon">🎓</div>
                <span className="rg-brand-name">CampusFlow</span>
              </div>
              <div className="rg-steps">
                {[1, 2].map(s => (
                  <div key={s} className={`rg-step-dot ${step === s ? 'active' : step > s ? 'done' : 'inactive'}`} />
                ))}
              </div>
            </div>

            {/* STEP 1 */}
            {step === 1 && (
              <>
                <div className="rg-success-icon">✨</div>
                <h2 className="rg-title">Create account</h2>
                <p className="rg-sub">Step 1 of 2 — Basic information</p>

                {/* ROLE SELECTOR */}
                <div className="rg-roles">
                  {ROLES.map(role => (
                    <div
                      key={role.id}
                      className={`rg-role ${selectedRole === role.id ? 'active' : ''}`}
                      onClick={() => setSelectedRole(role.id)}
                    >
                      <span className="rg-role-icon">{role.icon}</span>
                      <span className="rg-role-name">{role.label}</span>
                      <span className="rg-role-desc">{role.desc}</span>
                    </div>
                  ))}
                </div>

                {error && <div className="rg-error">⚠️ {error}</div>}

                <form onSubmit={handleStep1}>
                  <div className="rg-field">
                    <label className="rg-label">Full Name</label>
                    <div className="rg-input-wrap">
                      <span className="rg-icon">👤</span>
                      <input className="rg-input" type="text" value={form.name}
                        onChange={e => update('name', e.target.value)}
                        placeholder="John Doe" required />
                    </div>
                  </div>

                  <div className="rg-field">
                    <label className="rg-label">Email Address</label>
                    <div className="rg-input-wrap">
                      <span className="rg-icon">✉️</span>
                      <input className="rg-input" type="email" value={form.email}
                        onChange={e => update('email', e.target.value)}
                        placeholder="you@college.edu" required />
                    </div>
                  </div>

                  <div className="rg-row">
                    <div className="rg-field">
                      <label className="rg-label">Password</label>
                      <div className="rg-input-wrap">
                        <span className="rg-icon">🔑</span>
                        <input className="rg-input" type="password" value={form.password}
                          onChange={e => update('password', e.target.value)}
                          placeholder="••••••••" required />
                      </div>
                    </div>
                    <div className="rg-field">
                      <label className="rg-label">Confirm</label>
                      <div className="rg-input-wrap">
                        <span className="rg-icon">🔒</span>
                        <input className="rg-input" type="password" value={form.confirmPassword}
                          onChange={e => update('confirmPassword', e.target.value)}
                          placeholder="••••••••" required />
                      </div>
                    </div>
                  </div>

                  <button type="submit" className="rg-btn">
                    Continue →
                  </button>
                </form>

                <div className="rg-login">
                  Already have an account? <Link to="/login">Sign in</Link>
                </div>
              </>
            )}

            {/* STEP 2 */}
            {step === 2 && (
              <>
                <div className="rg-success-icon">🏫</div>
                <h2 className="rg-title">Almost there!</h2>
                <p className="rg-sub">Step 2 of 2 — College details</p>

                {error && <div className="rg-error">⚠️ {error}</div>}

                <form onSubmit={handleSubmit}>
                  <div className="rg-field">
                    <label className="rg-label">College / University</label>
                    <div className="rg-input-wrap">
                      <span className="rg-icon">🏫</span>
                      <input className="rg-input" type="text" value={form.college}
                        onChange={e => update('college', e.target.value)}
                        placeholder="MIT, Stanford, IIT..." />
                    </div>
                  </div>

                  <div className="rg-field">
                    <label className="rg-label">Phone Number</label>
                    <div className="rg-input-wrap">
                      <span className="rg-icon">📱</span>
                      <input className="rg-input" type="tel" value={form.phone}
                        onChange={e => update('phone', e.target.value)}
                        placeholder="+91 99999 99999" />
                    </div>
                  </div>

                  <div className="rg-field" style={{marginBottom: '8px'}}>
                    <label className="rg-label">Registering as</label>
                    <div style={{
                      background: 'rgba(99,102,241,0.08)',
                      border: '1px solid rgba(99,102,241,0.2)',
                      borderRadius: '12px',
                      padding: '12px 16px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      color: '#a5b4fc',
                      fontSize: '14px',
                      fontWeight: '600'
                    }}>
                      <span>{ROLES.find(r => r.id === selectedRole)?.icon}</span>
                      {ROLES.find(r => r.id === selectedRole)?.label}
                      <span style={{color: 'rgba(255,255,255,0.3)', fontWeight: '400', fontSize: '12px', marginLeft: 'auto'}}>
                        {ROLES.find(r => r.id === selectedRole)?.desc}
                      </span>
                    </div>
                  </div>

                  <button type="submit" className="rg-btn" disabled={loading}>
                    {loading ? <><div className="rg-spinner" /> Creating account...</> : '🎉 Create Account'}
                  </button>

                  <button type="button" className="rg-btn-back" onClick={() => setStep(1)}>
                    ← Back
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default Register;
