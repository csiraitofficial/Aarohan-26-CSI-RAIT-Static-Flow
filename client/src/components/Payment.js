import React, { useState, useEffect } from 'react';
import { registrationsAPI } from '../utils/api';
import { useAuth } from '../context/AuthContext';

// ─── ONLY the publishable key goes in frontend code ──────────────────────────
const RAZORPAY_KEY_ID = 'rzp_test_SO3eXGV9bDnR7a';

// ─── Load Razorpay SDK dynamically ───────────────────────────────────────────
const loadRazorpay = () =>
  new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload  = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });

const Payment = ({ event, onSuccess, onClose }) => {
  const { user } = useAuth();

  const [step, setStep]           = useState('info');   // info | processing | success | failed
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const [registration, setReg]    = useState(null);
  const [qrCode, setQrCode]       = useState(null);
  const [rzpReady, setRzpReady]   = useState(false);
  const [paymentData, setPayData] = useState(null);

  const amount = event?.registration_fee ?? 10;

  // Pre-load Razorpay SDK on mount
  useEffect(() => {
    loadRazorpay().then(ok => setRzpReady(ok));
  }, []);

  // ── Step 1: Ask backend to create a Razorpay Order ───────────────────────
  const handlePay = async () => {
    if (!rzpReady) {
      setError('Razorpay SDK failed to load. Check your internet connection.');
      return;
    }
    setLoading(true);
    setError('');

    try {
      // Backend creates order via Razorpay API with the SECRET KEY
      // and returns { order_id, amount, currency }
      const orderRes = await fetch('http://localhost:5000/api/payments/create-order', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_id: event.id,
          amount,        // INR — backend must convert to paise (×100) before calling Razorpay
          currency: 'INR',
        }),
      });

      if (!orderRes.ok) throw new Error('Could not create payment order. Please try again.');
      const { order_id, currency = 'INR' } = await orderRes.json();

      // ── Step 2: Open Razorpay Checkout ──────────────────────────────────
      const options = {
        key:         RAZORPAY_KEY_ID,   // publishable key — safe in frontend
        amount:      amount * 100,      // paise
        currency,
        name:        'CampusFlow Events',
        description: event?.name || 'Event Registration',
        order_id,
        prefill: {
          name:    user?.name  || '',
          email:   user?.email || '',
          contact: user?.phone || '',
        },
        theme: { color: '#6366f1' },
        modal: {
          ondismiss: () => {
            // User closed without paying — reset loading, stay on info
            setLoading(false);
          },
        },
        handler: async (response) => {
          // response = { razorpay_payment_id, razorpay_order_id, razorpay_signature }
          setPayData(response);
          await handleVerify(response);
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', (resp) => {
        setError(resp.error?.description || 'Payment failed. Please try again.');
        setStep('failed');
        setLoading(false);
      });
      rzp.open();

    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
      setStep('failed');
      setLoading(false);
    }
  };

  // ── Step 3: Send Razorpay response to backend for signature verification ──
  const handleVerify = async (rzpResponse) => {
    setStep('processing');
    try {
      // Backend verifies razorpay_signature with the secret key,
      // then marks payment confirmed and creates the registration record
      const regRes = await registrationsAPI.register({
        event_id:           event.id,
        payment_id:         rzpResponse.razorpay_payment_id,
        razorpay_order_id:  rzpResponse.razorpay_order_id,
        razorpay_signature: rzpResponse.razorpay_signature,
        payment_method:     'razorpay',
        amount,
      });

      const reg = regRes.data.registration;
      setReg(reg);

      // Generate entry QR
      try {
        const qrRes = await registrationsAPI.generateQR({ registration_id: reg.id });
        setQrCode(qrRes.data.qr_code);
      } catch (e) {
        console.error('QR generation failed:', e);
      }

      setStep('success');
      if (onSuccess) onSuccess(reg);

    } catch (err) {
      setError(
        err.response?.data?.message ||
        'Registration failed after payment. Your money is safe — contact organizers with your Payment ID.'
      );
      setStep('failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800;900&display=swap');
        * { box-sizing: border-box; }

        .pay-overlay {
          position:fixed;inset:0;background:rgba(0,0,0,0.88);backdrop-filter:blur(14px);
          z-index:400;display:flex;align-items:center;justify-content:center;
          padding:20px;font-family:'Plus Jakarta Sans',sans-serif;animation:payFadeIn .2s ease;
        }
        @keyframes payFadeIn { from{opacity:0}to{opacity:1} }

        .pay-modal {
          background:#0a0b16;border:1px solid rgba(99,102,241,0.25);border-radius:28px;
          width:100%;max-width:440px;max-height:94vh;overflow-y:auto;
          box-shadow:0 40px 100px rgba(0,0,0,0.7);
          animation:paySlide .35s cubic-bezier(.16,1,.3,1);
        }
        @keyframes paySlide { from{opacity:0;transform:translateY(28px) scale(.97)}to{opacity:1;transform:translateY(0) scale(1)} }

        .pay-hdr {
          display:flex;align-items:center;justify-content:space-between;
          padding:20px 24px;border-bottom:1px solid rgba(255,255,255,0.06);
          background:rgba(255,255,255,0.015);border-radius:28px 28px 0 0;
        }
        .pay-hdr-left { display:flex;align-items:center;gap:12px; }
        .pay-hdr-icon {
          width:42px;height:42px;background:linear-gradient(135deg,#6366f1,#4f46e5);
          border-radius:13px;display:flex;align-items:center;justify-content:center;
          font-size:19px;box-shadow:0 4px 16px rgba(99,102,241,0.4);
        }
        .pay-hdr-title { font-size:16px;font-weight:800;color:white;letter-spacing:-.4px; }
        .pay-hdr-sub { font-size:11px;color:rgba(255,255,255,0.3);margin-top:2px; }
        .pay-close {
          width:33px;height:33px;border-radius:9px;background:rgba(255,255,255,0.05);
          border:1px solid rgba(255,255,255,0.08);color:rgba(255,255,255,0.4);
          cursor:pointer;display:flex;align-items:center;justify-content:center;
          font-size:15px;transition:all .2s ease;
        }
        .pay-close:hover { background:rgba(239,68,68,0.1);border-color:rgba(239,68,68,0.2);color:#f87171; }

        .pay-amount-pill {
          margin:20px 24px 0;
          background:linear-gradient(135deg,rgba(99,102,241,0.12),rgba(6,182,212,0.08));
          border:1px solid rgba(99,102,241,0.2);border-radius:16px;
          padding:16px 20px;display:flex;align-items:center;justify-content:space-between;
        }
        .pay-event-nm { font-size:13px;font-weight:600;color:rgba(255,255,255,0.6); }
        .pay-amount-note { font-size:10px;color:rgba(255,255,255,0.25);margin-top:2px; }
        .pay-amount-big {
          font-size:32px;font-weight:900;letter-spacing:-1.5px;
          background:linear-gradient(135deg,#a5b4fc,#67e8f9);
          -webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;
        }

        .pay-body { padding:20px 24px 28px; }

        /* Info summary card */
        .pay-info-card {
          background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.07);
          border-radius:18px;padding:18px;margin-bottom:16px;
        }
        .pay-info-row {
          display:flex;justify-content:space-between;align-items:center;
          padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.04);font-size:13px;
        }
        .pay-info-row:last-child { border-bottom:none; }
        .pay-info-key { color:rgba(255,255,255,0.3); }
        .pay-info-val { color:white;font-weight:600;text-align:right;max-width:230px;word-break:break-all; }

        /* Secure badge */
        .pay-rzp-badge {
          display:flex;align-items:center;justify-content:center;gap:8px;padding:10px;
          background:rgba(99,102,241,0.05);border:1px solid rgba(99,102,241,0.12);
          border-radius:12px;margin-bottom:16px;font-size:11.5px;color:rgba(255,255,255,0.3);
        }

        /* Error */
        .pay-error {
          background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.2);
          border-radius:10px;padding:10px 14px;font-size:13px;color:#fca5a5;
          margin-bottom:14px;text-align:left;
        }

        /* Main CTA button */
        .pay-main-btn {
          width:100%;height:54px;background:linear-gradient(135deg,#6366f1,#4f46e5);
          border:none;border-radius:14px;color:white;font-size:15px;font-weight:800;
          cursor:pointer;font-family:'Plus Jakarta Sans',sans-serif;
          display:flex;align-items:center;justify-content:center;gap:10px;
          transition:all .3s cubic-bezier(.34,1.56,.64,1);
          box-shadow:0 4px 20px rgba(99,102,241,0.4);
        }
        .pay-main-btn:hover:not(:disabled) { transform:translateY(-2px);box-shadow:0 10px 30px rgba(99,102,241,0.55); }
        .pay-main-btn:disabled { opacity:.55;cursor:not-allowed;transform:none; }

        /* Processing */
        .pay-processing { padding:60px 28px;text-align:center; }
        .pay-proc-ring {
          width:72px;height:72px;margin:0 auto 24px;
          border:3px solid rgba(99,102,241,0.15);border-top-color:#6366f1;
          border-radius:50%;animation:paySpin .8s linear infinite;
        }
        @keyframes paySpin { to{transform:rotate(360deg)} }
        .pay-proc-title { font-size:20px;font-weight:800;color:white;margin-bottom:8px;letter-spacing:-.5px; }
        .pay-proc-sub { font-size:13px;color:rgba(255,255,255,0.3);line-height:1.6; }

        /* Success */
        .pay-success { padding:40px 24px 28px;text-align:center; }
        .pay-success-ring {
          width:90px;height:90px;border-radius:50%;
          background:rgba(34,197,94,0.1);border:2px solid rgba(34,197,94,0.3);
          display:flex;align-items:center;justify-content:center;font-size:40px;
          margin:0 auto 18px;animation:payBounce .6s cubic-bezier(.34,1.56,.64,1);
          box-shadow:0 0 40px rgba(34,197,94,0.2);
        }
        @keyframes payBounce { from{transform:scale(0);opacity:0}to{transform:scale(1);opacity:1} }
        .pay-success-title { font-size:24px;font-weight:900;color:white;letter-spacing:-1px;margin-bottom:6px; }
        .pay-success-sub { font-size:13px;color:rgba(255,255,255,0.4);margin-bottom:20px;line-height:1.6; }
        .pay-ticket {
          background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.07);
          border-radius:16px;padding:16px;margin-bottom:18px;text-align:left;
        }
        .pay-ticket-row {
          display:flex;justify-content:space-between;align-items:center;
          padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.04);font-size:13px;
        }
        .pay-ticket-row:last-child { border-bottom:none; }
        .pay-ticket-key { color:rgba(255,255,255,0.3); }
        .pay-ticket-val { color:white;font-weight:600; }
        .pay-qr-ticket {
          background:white;border-radius:16px;padding:16px;margin-bottom:18px;
          display:flex;flex-direction:column;align-items:center;gap:8px;
        }
        .pay-qr-ticket img { width:160px;height:160px;border-radius:6px; }
        .pay-qr-ticket-label { font-size:12px;font-weight:700;color:#1f2937; }
        .pay-qr-ticket-id { font-size:10px;color:#9ca3af;font-family:monospace; }
        .pay-done-btn {
          width:100%;height:50px;background:linear-gradient(135deg,#16a34a,#15803d);
          border:none;border-radius:14px;color:white;font-size:15px;font-weight:700;
          cursor:pointer;font-family:'Plus Jakarta Sans',sans-serif;
          transition:all .3s ease;box-shadow:0 4px 20px rgba(22,163,74,0.3);
        }
        .pay-done-btn:hover { transform:translateY(-2px);box-shadow:0 8px 28px rgba(22,163,74,0.5); }

        /* Failed */
        .pay-failed { padding:52px 28px;text-align:center; }
        .pay-failed-icon {
          width:90px;height:90px;border-radius:50%;
          background:rgba(239,68,68,0.1);border:2px solid rgba(239,68,68,0.3);
          display:flex;align-items:center;justify-content:center;font-size:40px;
          margin:0 auto 20px;box-shadow:0 0 40px rgba(239,68,68,0.2);animation:payShake .5s ease;
        }
        @keyframes payShake { 0%,100%{transform:translateX(0)}25%{transform:translateX(-8px)}75%{transform:translateX(8px)} }
        .pay-failed-title { font-size:22px;font-weight:900;color:white;margin-bottom:8px;letter-spacing:-.5px; }
        .pay-failed-sub { font-size:13px;color:rgba(255,255,255,0.4);margin-bottom:20px;line-height:1.6; }
        .pay-retry-btn {
          width:100%;height:50px;margin-bottom:10px;
          background:linear-gradient(135deg,#6366f1,#4f46e5);border:none;border-radius:14px;
          color:white;font-size:15px;font-weight:700;cursor:pointer;
          font-family:'Plus Jakarta Sans',sans-serif;
          transition:all .3s ease;box-shadow:0 4px 20px rgba(99,102,241,0.3);
        }
        .pay-retry-btn:hover { transform:translateY(-2px); }
        .pay-cancel-link {
          font-size:12px;color:rgba(255,255,255,0.25);cursor:pointer;
          background:none;border:none;font-family:'Plus Jakarta Sans',sans-serif;transition:color .2s;
        }
        .pay-cancel-link:hover { color:rgba(255,255,255,0.5); }
      `}</style>

      <div
        className="pay-overlay"
        onClick={e => e.target === e.currentTarget && step !== 'processing' && onClose?.()}
      >
        <div className="pay-modal">

          {/* ── Header ── */}
          <div className="pay-hdr">
            <div className="pay-hdr-left">
              <div className="pay-hdr-icon">💳</div>
              <div>
                <div className="pay-hdr-title">Event Registration</div>
                <div className="pay-hdr-sub">{event?.name || 'Pay & Register'}</div>
              </div>
            </div>
            {step !== 'processing' && (
              <button className="pay-close" onClick={onClose}>✕</button>
            )}
          </div>

          {/* ── Amount pill ── */}
          {step === 'info' && (
            <div className="pay-amount-pill">
              <div>
                <div className="pay-event-nm">{event?.name}</div>
                <div className="pay-amount-note">Registration fee · one-time</div>
              </div>
              <div className="pay-amount-big">₹{amount}</div>
            </div>
          )}

          {/* ════ STEP: info ════ */}
          {step === 'info' && (
            <div className="pay-body">
              <div className="pay-info-card">
                {[
                  { key:'Event',  val: event?.name },
                  { key:'Date',   val: event?.date ? new Date(event.date).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' }) : '—' },
                  { key:'Venue',  val: event?.venue || event?.location || '—' },
                  { key:'Name',   val: user?.name  || '—' },
                  { key:'Email',  val: user?.email || '—' },
                  { key:'Amount', val: `₹${amount}` },
                ].map(r => (
                  <div key={r.key} className="pay-info-row">
                    <span className="pay-info-key">{r.key}</span>
                    <span className="pay-info-val">{r.val}</span>
                  </div>
                ))}
              </div>

              <div className="pay-rzp-badge">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                Secured by Razorpay · UPI · Cards · Net Banking · Wallets
              </div>

              {error && <div className="pay-error">⚠️ {error}</div>}

              <button
                className="pay-main-btn"
                onClick={handlePay}
                disabled={loading || !rzpReady}
              >
                {loading ? (
                  <>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ animation:'paySpin .8s linear infinite' }}><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                    Opening Razorpay…
                  </>
                ) : (
                  <>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>
                    Pay ₹{amount} Securely
                  </>
                )}
              </button>

              {!rzpReady && (
                <p style={{ textAlign:'center', marginTop:8, fontSize:11, color:'rgba(255,255,255,0.22)' }}>
                  Loading payment SDK…
                </p>
              )}
            </div>
          )}

          {/* ════ STEP: processing ════ */}
          {step === 'processing' && (
            <div className="pay-processing">
              <div className="pay-proc-ring" />
              <div className="pay-proc-title">Confirming Payment…</div>
              <div className="pay-proc-sub">
                Verifying with Razorpay and securing your spot.<br />
                Please don't close this window.
              </div>
            </div>
          )}

          {/* ════ STEP: success ════ */}
          {step === 'success' && (
            <div className="pay-success">
              <div className="pay-success-ring">🎉</div>
              <div className="pay-success-title">You're In!</div>
              <div className="pay-success-sub">
                Successfully registered for{' '}
                <strong style={{ color:'white' }}>{event?.name}</strong>.{' '}
                Show the QR code at the entrance.
              </div>

              <div className="pay-ticket">
                {[
                  { key:'Event',       val: event?.name },
                  { key:'Amount Paid', val: `₹${amount}` },
                  { key:'Payment ID',  val: paymentData?.razorpay_payment_id || '—' },
                  { key:'Order ID',    val: paymentData?.razorpay_order_id ? paymentData.razorpay_order_id.slice(0,22) + '…' : '—' },
                  { key:'Ticket ID',   val: registration?.id ? registration.id.slice(0,8).toUpperCase() + '…' : '—' },
                  { key:'Status',      val: '✅ Confirmed' },
                ].map(r => (
                  <div key={r.key} className="pay-ticket-row">
                    <span className="pay-ticket-key">{r.key}</span>
                    <span className="pay-ticket-val">{r.val}</span>
                  </div>
                ))}
              </div>

              {qrCode && (
                <div className="pay-qr-ticket">
                  <img src={qrCode} alt="Entry QR" />
                  <div className="pay-qr-ticket-label">🎫 Your Entry QR Code</div>
                  <div className="pay-qr-ticket-id">
                    ID: {registration?.id?.slice(0,16)?.toUpperCase()}
                  </div>
                </div>
              )}

              <button className="pay-done-btn" onClick={onClose}>
                🚀 Done — See you at the event!
              </button>
            </div>
          )}

          {/* ════ STEP: failed ════ */}
          {step === 'failed' && (
            <div className="pay-failed">
              <div className="pay-failed-icon">❌</div>
              <div className="pay-failed-title">Payment Failed</div>
              <div className="pay-failed-sub">
                Something went wrong. If money was deducted it will be refunded within 5–7 business days.
                Contact organizers with your Payment ID.
              </div>
              {error && <div className="pay-error">⚠️ {error}</div>}
              <button
                className="pay-retry-btn"
                onClick={() => { setStep('info'); setError(''); }}
              >
                🔄 Try Again
              </button>
              <br />
              <button className="pay-cancel-link" onClick={onClose}>Cancel</button>
            </div>
          )}

        </div>
      </div>
    </>
  );
};

export default Payment;