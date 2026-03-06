import React, { useState, useEffect } from 'react';
import { registrationsAPI } from '../utils/api';
import { useAuth } from '../context/AuthContext';

const Payment = ({ event, onSuccess, onClose }) => {
  const { user } = useAuth();
  const [step, setStep] = useState('details'); // details | processing | success | failed
  const [paymentMethod, setPaymentMethod] = useState('upi');
  const [upiId, setUpiId] = useState('');
  const [cardData, setCardData] = useState({ number: '', expiry: '', cvv: '', name: '' });
  const [bank, setBank] = useState('sbi');
  const [loading, setLoading] = useState(false);
  const [qrCode, setQrCode] = useState(null);
  const [registration, setRegistration] = useState(null);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(3);

  const amount = event?.registration_fee || 0;
  const gst = Math.round(amount * 0.18);
  const total = amount + gst;

  useEffect(() => {
    // Load Razorpay script
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);
    return () => {
      if (document.body.contains(script)) document.body.removeChild(script);
    };
  }, []);

  useEffect(() => {
    if (step === 'success' && countdown > 0) {
      const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [step, countdown]);

  const handleRazorpay = () => {
    if (!window.Razorpay) {
      setError('Payment gateway not loaded. Please refresh.');
      return;
    }

    const options = {
      key: process.env.REACT_APP_RAZORPAY_KEY || 'rzp_test_placeholder',
      amount: total * 100, // paise
      currency: 'INR',
      name: 'CampusFlow',
      description: `Registration: ${event?.name}`,
      image: '',
      prefill: {
        name: user?.name || '',
        email: user?.email || '',
        contact: user?.phone || '',
      },
      notes: {
        event_id: event?.id,
        user_id: user?.id,
      },
      theme: {
        color: '#6366f1',
        backdrop_color: '#04050a',
      },
      method: {
        upi: true,
        card: true,
        netbanking: true,
        wallet: true,
      },
      handler: async (response) => {
        await processPayment(response.razorpay_payment_id, 'razorpay');
      },
      modal: {
        ondismiss: () => setLoading(false),
      },
    };

    const rzp = new window.Razorpay(options);
    rzp.on('payment.failed', (response) => {
      setError(response.error?.description || 'Payment failed.');
      setStep('failed');
    });
    rzp.open();
  };

  const handleSimulatedPayment = async () => {
    setError('');

    // Validate
    if (paymentMethod === 'upi' && !upiId.includes('@')) {
      setError('Please enter a valid UPI ID (e.g. name@upi)');
      return;
    }
    if (paymentMethod === 'card') {
      if (cardData.number.replace(/\s/g, '').length < 16) {
        setError('Please enter a valid 16-digit card number');
        return;
      }
      if (!cardData.expiry || !cardData.cvv || !cardData.name) {
        setError('Please fill all card details');
        return;
      }
    }

    setLoading(true);
    setStep('processing');

    // Simulate payment processing
    await new Promise(r => setTimeout(r, 2500));

    // 90% success rate for demo
    const success = Math.random() > 0.1;

    if (success) {
      const fakePaymentId = `pay_${Date.now()}`;
      await processPayment(fakePaymentId, paymentMethod);
    } else {
      setStep('failed');
      setError('Payment declined by bank. Please try again.');
      setLoading(false);
    }
  };

  const processPayment = async (paymentId, method) => {
    try {
      // Register for event
      const regRes = await registrationsAPI.register({
        event_id: event.id,
        payment_id: paymentId,
        payment_method: method,
        amount: total,
      });

      const reg = regRes.data.registration;
      setRegistration(reg);

      // Generate QR
      try {
        const qrRes = await registrationsAPI.generateQR({ registration_id: reg.id });
        setQrCode(qrRes.data.qr_code);
      } catch (e) {
        console.error('QR generation failed:', e);
      }

      setStep('success');
      if (onSuccess) onSuccess(reg);
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed after payment.');
      setStep('failed');
    } finally {
      setLoading(false);
    }
  };

  const formatCard = (val) => {
    return val.replace(/\D/g, '').replace(/(.{4})/g, '$1 ').trim().slice(0, 19);
  };

  const formatExpiry = (val) => {
    return val.replace(/\D/g, '').replace(/^(.{2})/, '$1/').slice(0, 5);
  };

  const BANKS = [
    { id: 'sbi', name: 'State Bank of India', icon: '🏦' },
    { id: 'hdfc', name: 'HDFC Bank', icon: '🏛️' },
    { id: 'icici', name: 'ICICI Bank', icon: '🏢' },
    { id: 'axis', name: 'Axis Bank', icon: '🏗️' },
    { id: 'kotak', name: 'Kotak Mahindra', icon: '🏠' },
    { id: 'pnb', name: 'Punjab National Bank', icon: '🏣' },
  ];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap');
        * { box-sizing: border-box; }

        .pay-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.85);
          backdrop-filter: blur(12px);
          z-index: 400;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          font-family: 'Plus Jakarta Sans', sans-serif;
          animation: payFadeIn 0.25s ease;
        }

        @keyframes payFadeIn { from { opacity:0; } to { opacity:1; } }

        .pay-modal {
          background: #0d0f1e;
          border: 1px solid rgba(99,102,241,0.2);
          border-radius: 28px;
          width: 100%;
          max-width: 500px;
          max-height: 92vh;
          overflow-y: auto;
          box-shadow: 0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(99,102,241,0.1);
          animation: paySlideUp 0.4s cubic-bezier(0.16,1,0.3,1);
        }

        @keyframes paySlideUp {
          from { opacity:0; transform: translateY(32px) scale(0.96); }
          to { opacity:1; transform: translateY(0) scale(1); }
        }

        /* HEADER */
        .pay-header {
          padding: 24px 28px 20px;
          border-bottom: 1px solid rgba(255,255,255,0.06);
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: rgba(255,255,255,0.02);
          border-radius: 28px 28px 0 0;
        }

        .pay-header-left {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .pay-header-icon {
          width: 44px; height: 44px;
          background: linear-gradient(135deg, #6366f1, #4f46e5);
          border-radius: 13px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          box-shadow: 0 4px 16px rgba(99,102,241,0.4);
        }

        .pay-header-title { font-size: 17px; font-weight: 800; color: white; letter-spacing: -0.4px; }
        .pay-header-sub { font-size: 12px; color: rgba(255,255,255,0.3); margin-top: 2px; }

        .pay-close {
          width: 34px; height: 34px;
          border-radius: 9px;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.08);
          color: rgba(255,255,255,0.4);
          cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          font-size: 16px;
          transition: all 0.2s ease;
        }

        .pay-close:hover { background: rgba(239,68,68,0.1); border-color: rgba(239,68,68,0.2); color: #f87171; }

        .pay-body { padding: 24px 28px; }

        /* ORDER SUMMARY */
        .pay-summary {
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 16px;
          padding: 18px;
          margin-bottom: 22px;
        }

        .pay-summary-title {
          font-size: 11px;
          font-weight: 600;
          color: rgba(255,255,255,0.3);
          text-transform: uppercase;
          letter-spacing: 0.8px;
          margin-bottom: 14px;
        }

        .pay-summary-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 0;
          border-bottom: 1px solid rgba(255,255,255,0.04);
          font-size: 13px;
        }

        .pay-summary-row:last-child { border-bottom: none; }

        .pay-summary-key { color: rgba(255,255,255,0.4); }
        .pay-summary-val { color: white; font-weight: 600; }

        .pay-summary-total {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 14px 0 0;
          margin-top: 4px;
          border-top: 1px solid rgba(255,255,255,0.08);
        }

        .pay-total-label { font-size: 14px; font-weight: 700; color: white; }
        .pay-total-val {
          font-size: 24px;
          font-weight: 900;
          letter-spacing: -1px;
          background: linear-gradient(135deg, #6366f1, #06b6d4);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        /* USE RAZORPAY BTN */
        .pay-razorpay-btn {
          width: 100%;
          height: 52px;
          background: linear-gradient(135deg, #3395FF, #2563eb);
          border: none;
          border-radius: 14px;
          color: white;
          font-size: 15px;
          font-weight: 700;
          cursor: pointer;
          font-family: 'Plus Jakarta Sans', sans-serif;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          transition: all 0.3s cubic-bezier(0.34,1.56,0.64,1);
          box-shadow: 0 4px 20px rgba(51,149,255,0.3);
          margin-bottom: 16px;
        }

        .pay-razorpay-btn:hover { transform: translateY(-2px); box-shadow: 0 8px 28px rgba(51,149,255,0.5); }

        .pay-divider {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 20px;
        }

        .pay-divider-line { flex: 1; height: 1px; background: rgba(255,255,255,0.07); }
        .pay-divider-text { font-size: 11px; color: rgba(255,255,255,0.25); font-weight: 500; white-space: nowrap; }

        /* PAYMENT METHOD TABS */
        .pay-methods {
          display: grid;
          grid-template-columns: repeat(3,1fr);
          gap: 8px;
          margin-bottom: 20px;
        }

        .pay-method {
          padding: 12px 8px;
          border-radius: 12px;
          border: 1.5px solid rgba(255,255,255,0.07);
          background: rgba(255,255,255,0.02);
          color: rgba(255,255,255,0.4);
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          font-family: 'Plus Jakarta Sans', sans-serif;
          transition: all 0.2s ease;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
        }

        .pay-method-icon { font-size: 22px; }
        .pay-method:hover { border-color: rgba(99,102,241,0.3); color: rgba(255,255,255,0.7); }
        .pay-method.active {
          background: rgba(99,102,241,0.1);
          border-color: rgba(99,102,241,0.4);
          color: #a5b4fc;
          box-shadow: 0 0 20px rgba(99,102,241,0.1);
        }

        /* FORM */
        .pay-field { margin-bottom: 14px; }

        .pay-label {
          display: block;
          font-size: 11px;
          font-weight: 600;
          color: rgba(255,255,255,0.3);
          text-transform: uppercase;
          letter-spacing: 0.8px;
          margin-bottom: 7px;
        }

        .pay-input {
          width: 100%;
          background: rgba(255,255,255,0.04);
          border: 1.5px solid rgba(255,255,255,0.07);
          border-radius: 12px;
          padding: 13px 16px;
          font-size: 14px;
          color: white;
          font-family: 'Plus Jakarta Sans', sans-serif;
          outline: none;
          transition: all 0.25s ease;
        }

        .pay-input::placeholder { color: rgba(255,255,255,0.15); }
        .pay-input:focus {
          border-color: rgba(99,102,241,0.5);
          background: rgba(99,102,241,0.06);
          box-shadow: 0 0 0 4px rgba(99,102,241,0.08);
        }

        .pay-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }

        /* BANK GRID */
        .pay-banks {
          display: grid;
          grid-template-columns: repeat(3,1fr);
          gap: 8px;
          margin-bottom: 14px;
        }

        .pay-bank {
          padding: 12px 8px;
          border-radius: 12px;
          border: 1.5px solid rgba(255,255,255,0.07);
          background: rgba(255,255,255,0.02);
          color: rgba(255,255,255,0.4);
          font-size: 11px;
          font-weight: 600;
          cursor: pointer;
          font-family: 'Plus Jakarta Sans', sans-serif;
          transition: all 0.2s ease;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
        }

        .pay-bank-icon { font-size: 20px; }
        .pay-bank:hover { border-color: rgba(99,102,241,0.3); color: rgba(255,255,255,0.7); }
        .pay-bank.active { background: rgba(99,102,241,0.1); border-color: rgba(99,102,241,0.4); color: #a5b4fc; }

        /* PAY BUTTON */
        .pay-btn {
          width: 100%;
          height: 52px;
          background: linear-gradient(135deg, #6366f1, #4f46e5);
          border: none;
          border-radius: 14px;
          color: white;
          font-size: 16px;
          font-weight: 800;
          cursor: pointer;
          font-family: 'Plus Jakarta Sans', sans-serif;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          transition: all 0.3s cubic-bezier(0.34,1.56,0.64,1);
          box-shadow: 0 4px 20px rgba(99,102,241,0.4);
          margin-top: 20px;
          letter-spacing: 0.3px;
        }

        .pay-btn:hover:not(:disabled) { transform: translateY(-3px) scale(1.01); box-shadow: 0 10px 30px rgba(99,102,241,0.55); }
        .pay-btn:disabled { opacity: 0.5; cursor: not-allowed; }

        .pay-secure {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          font-size: 11px;
          color: rgba(255,255,255,0.2);
          margin-top: 12px;
        }

        .pay-error {
          background: rgba(239,68,68,0.08);
          border: 1px solid rgba(239,68,68,0.2);
          border-radius: 10px;
          padding: 10px 14px;
          font-size: 13px;
          color: #fca5a5;
          margin-bottom: 14px;
        }

        /* PROCESSING */
        .pay-processing {
          padding: 60px 28px;
          text-align: center;
        }

        .pay-proc-spinner {
          width: 72px; height: 72px;
          border: 4px solid rgba(99,102,241,0.15);
          border-top-color: #6366f1;
          border-radius: 50%;
          animation: paySpin 0.9s linear infinite;
          margin: 0 auto 24px;
        }

        @keyframes paySpin { to { transform: rotate(360deg); } }

        .pay-proc-title { font-size: 20px; font-weight: 800; color: white; margin-bottom: 8px; letter-spacing: -0.5px; }
        .pay-proc-sub { font-size: 14px; color: rgba(255,255,255,0.3); line-height: 1.6; }

        .pay-proc-steps {
          display: flex;
          flex-direction: column;
          gap: 10px;
          margin-top: 28px;
          text-align: left;
          max-width: 260px;
          margin-left: auto;
          margin-right: auto;
        }

        .pay-proc-step {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 13px;
          color: rgba(255,255,255,0.3);
          animation: payStepIn 0.4s ease forwards;
          opacity: 0;
        }

        .pay-proc-step:nth-child(1) { animation-delay: 0.3s; }
        .pay-proc-step:nth-child(2) { animation-delay: 0.9s; }
        .pay-proc-step:nth-child(3) { animation-delay: 1.6s; }

        @keyframes payStepIn { to { opacity:1; color: rgba(255,255,255,0.6); } }

        .pay-step-dot {
          width: 8px; height: 8px;
          border-radius: 50%;
          background: #6366f1;
          flex-shrink: 0;
          box-shadow: 0 0 8px rgba(99,102,241,0.5);
        }

        /* SUCCESS */
        .pay-success {
          padding: 48px 28px;
          text-align: center;
        }

        .pay-success-ring {
          width: 100px; height: 100px;
          border-radius: 50%;
          background: rgba(34,197,94,0.1);
          border: 2px solid rgba(34,197,94,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 44px;
          margin: 0 auto 20px;
          animation: payBounce 0.6s cubic-bezier(0.34,1.56,0.64,1);
          box-shadow: 0 0 40px rgba(34,197,94,0.2);
        }

        @keyframes payBounce { from { transform:scale(0); opacity:0; } to { transform:scale(1); opacity:1; } }

        .pay-success-title { font-size: 26px; font-weight: 900; color: white; letter-spacing: -1px; margin-bottom: 6px; }
        .pay-success-sub { font-size: 14px; color: rgba(255,255,255,0.4); margin-bottom: 24px; line-height: 1.6; }

        .pay-success-details {
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 16px;
          padding: 16px;
          margin-bottom: 20px;
          text-align: left;
        }

        .pay-detail-row {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          border-bottom: 1px solid rgba(255,255,255,0.04);
          font-size: 13px;
        }

        .pay-detail-row:last-child { border-bottom: none; }
        .pay-detail-key { color: rgba(255,255,255,0.3); }
        .pay-detail-val { color: white; font-weight: 600; }

        .pay-qr-wrap {
          background: white;
          border-radius: 16px;
          padding: 20px;
          margin-bottom: 20px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
        }

        .pay-qr-img { width: 180px; height: 180px; border-radius: 8px; }
        .pay-qr-label { font-size: 13px; font-weight: 700; color: #374151; }
        .pay-qr-sub { font-size: 11px; color: #9ca3af; font-family: monospace; }

        .pay-done-btn {
          width: 100%;
          height: 50px;
          background: linear-gradient(135deg, #16a34a, #15803d);
          border: none;
          border-radius: 14px;
          color: white;
          font-size: 15px;
          font-weight: 700;
          cursor: pointer;
          font-family: 'Plus Jakarta Sans', sans-serif;
          transition: all 0.3s ease;
          box-shadow: 0 4px 20px rgba(22,163,74,0.3);
        }

        .pay-done-btn:hover { transform: translateY(-2px); box-shadow: 0 8px 28px rgba(22,163,74,0.5); }

        /* FAILED */
        .pay-failed {
          padding: 52px 28px;
          text-align: center;
        }

        .pay-failed-icon {
          width: 100px; height: 100px;
          border-radius: 50%;
          background: rgba(239,68,68,0.1);
          border: 2px solid rgba(239,68,68,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 44px;
          margin: 0 auto 20px;
          animation: payShake 0.5s ease;
          box-shadow: 0 0 40px rgba(239,68,68,0.2);
        }

        @keyframes payShake {
          0%,100% { transform: translateX(0); }
          25% { transform: translateX(-8px); }
          75% { transform: translateX(8px); }
        }

        .pay-failed-title { font-size: 24px; font-weight: 900; color: white; margin-bottom: 8px; letter-spacing: -0.5px; }
        .pay-failed-sub { font-size: 14px; color: rgba(255,255,255,0.4); margin-bottom: 8px; line-height: 1.6; }
        .pay-failed-error { font-size: 13px; color: #fca5a5; margin-bottom: 24px; }

        .pay-retry-btn {
          width: 100%;
          height: 50px;
          background: linear-gradient(135deg, #6366f1, #4f46e5);
          border: none;
          border-radius: 14px;
          color: white;
          font-size: 15px;
          font-weight: 700;
          cursor: pointer;
          font-family: 'Plus Jakarta Sans', sans-serif;
          transition: all 0.3s ease;
          margin-bottom: 10px;
          box-shadow: 0 4px 20px rgba(99,102,241,0.3);
        }

        .pay-retry-btn:hover { transform: translateY(-2px); }

        .pay-cancel-link {
          font-size: 13px;
          color: rgba(255,255,255,0.3);
          cursor: pointer;
          text-decoration: underline;
          background: none;
          border: none;
          font-family: 'Plus Jakarta Sans', sans-serif;
        }

        .pay-cancel-link:hover { color: rgba(255,255,255,0.6); }

        @media (max-width: 500px) {
          .pay-modal { border-radius: 20px; }
          .pay-body { padding: 20px; }
          .pay-header { padding: 20px; }
          .pay-row { grid-template-columns: 1fr; }
          .pay-methods { grid-template-columns: repeat(3,1fr); }
        }
      `}</style>

      <div className="pay-overlay" onClick={e => e.target === e.currentTarget && onClose?.()}>
        <div className="pay-modal">

          {/* HEADER */}
          <div className="pay-header">
            <div className="pay-header-left">
              <div className="pay-header-icon">💳</div>
              <div>
                <div className="pay-header-title">Secure Payment</div>
                <div className="pay-header-sub">{event?.name || 'Event Registration'}</div>
              </div>
            </div>
            {step !== 'processing' && (
              <button className="pay-close" onClick={onClose}>✕</button>
            )}
          </div>

          {/* DETAILS STEP */}
          {step === 'details' && (
            <div className="pay-body">

              {/* ORDER SUMMARY */}
              <div className="pay-summary">
                <div className="pay-summary-title">Order Summary</div>
                <div className="pay-summary-row">
                  <span className="pay-summary-key">Event</span>
                  <span className="pay-summary-val">{event?.name}</span>
                </div>
                <div className="pay-summary-row">
                  <span className="pay-summary-key">Registration Fee</span>
                  <span className="pay-summary-val">₹{amount.toLocaleString('en-IN')}</span>
                </div>
                <div className="pay-summary-row">
                  <span className="pay-summary-key">GST (18%)</span>
                  <span className="pay-summary-val">₹{gst.toLocaleString('en-IN')}</span>
                </div>
                <div className="pay-summary-total">
                  <span className="pay-total-label">Total Amount</span>
                  <span className="pay-total-val">₹{total.toLocaleString('en-IN')}</span>
                </div>
              </div>

              {/* RAZORPAY BUTTON */}
              <button className="pay-razorpay-btn" onClick={handleRazorpay}>
                <span style={{ fontSize: '20px' }}>⚡</span>
                Pay with Razorpay
                <span style={{ fontSize: '11px', opacity: 0.7, fontWeight: '500' }}>UPI · Card · Netbanking</span>
              </button>

              <div className="pay-divider">
                <div className="pay-divider-line" />
                <span className="pay-divider-text">OR PAY MANUALLY (DEMO)</span>
                <div className="pay-divider-line" />
              </div>

              {error && <div className="pay-error">⚠️ {error}</div>}

              {/* PAYMENT METHOD TABS */}
              <div className="pay-methods">
                {[
                  { id: 'upi', icon: '📱', label: 'UPI' },
                  { id: 'card', icon: '💳', label: 'Card' },
                  { id: 'netbanking', icon: '🏦', label: 'Netbanking' },
                ].map(m => (
                  <button
                    key={m.id}
                    className={`pay-method ${paymentMethod === m.id ? 'active' : ''}`}
                    onClick={() => setPaymentMethod(m.id)}
                  >
                    <span className="pay-method-icon">{m.icon}</span>
                    {m.label}
                  </button>
                ))}
              </div>

              {/* UPI */}
              {paymentMethod === 'upi' && (
                <div className="pay-field">
                  <label className="pay-label">UPI ID</label>
                  <input
                    className="pay-input"
                    type="text"
                    value={upiId}
                    onChange={e => setUpiId(e.target.value)}
                    placeholder="yourname@upi"
                  />
                  <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.2)', marginTop: '6px' }}>
                    Supported: GPay, PhonePe, Paytm, BHIM
                  </div>
                </div>
              )}

              {/* CARD */}
              {paymentMethod === 'card' && (
                <>
                  <div className="pay-field">
                    <label className="pay-label">Card Number</label>
                    <input
                      className="pay-input"
                      type="text"
                      value={cardData.number}
                      onChange={e => setCardData({ ...cardData, number: formatCard(e.target.value) })}
                      placeholder="1234 5678 9012 3456"
                      maxLength={19}
                    />
                  </div>
                  <div className="pay-field">
                    <label className="pay-label">Cardholder Name</label>
                    <input
                      className="pay-input"
                      type="text"
                      value={cardData.name}
                      onChange={e => setCardData({ ...cardData, name: e.target.value })}
                      placeholder="Name on card"
                    />
                  </div>
                  <div className="pay-row">
                    <div className="pay-field">
                      <label className="pay-label">Expiry Date</label>
                      <input
                        className="pay-input"
                        type="text"
                        value={cardData.expiry}
                        onChange={e => setCardData({ ...cardData, expiry: formatExpiry(e.target.value) })}
                        placeholder="MM/YY"
                        maxLength={5}
                      />
                    </div>
                    <div className="pay-field">
                      <label className="pay-label">CVV</label>
                      <input
                        className="pay-input"
                        type="password"
                        value={cardData.cvv}
                        onChange={e => setCardData({ ...cardData, cvv: e.target.value.slice(0, 3) })}
                        placeholder="•••"
                        maxLength={3}
                      />
                    </div>
                  </div>
                </>
              )}

              {/* NETBANKING */}
              {paymentMethod === 'netbanking' && (
                <>
                  <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', marginBottom: '10px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                    Select Bank
                  </div>
                  <div className="pay-banks">
                    {BANKS.map(b => (
                      <button
                        key={b.id}
                        className={`pay-bank ${bank === b.id ? 'active' : ''}`}
                        onClick={() => setBank(b.id)}
                      >
                        <span className="pay-bank-icon">{b.icon}</span>
                        <span style={{ fontSize: '10px' }}>{b.name.split(' ')[0]}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}

              {/* PAY BUTTON */}
              <button
                className="pay-btn"
                onClick={handleSimulatedPayment}
                disabled={loading}
              >
                🔒 Pay ₹{total.toLocaleString('en-IN')}
              </button>

              <div className="pay-secure">
                🔒 256-bit SSL Encrypted · Powered by Razorpay
              </div>
            </div>
          )}

          {/* PROCESSING */}
          {step === 'processing' && (
            <div className="pay-processing">
              <div className="pay-proc-spinner" />
              <div className="pay-proc-title">Processing Payment...</div>
              <div className="pay-proc-sub">
                Please wait while we securely process your payment.<br />
                Do not close this window.
              </div>
              <div className="pay-proc-steps">
                {[
                  'Connecting to payment gateway',
                  'Verifying transaction',
                  'Confirming registration',
                ].map((s, i) => (
                  <div key={i} className="pay-proc-step">
                    <div className="pay-step-dot" />
                    {s}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SUCCESS */}
          {step === 'success' && (
            <div className="pay-success">
              <div className="pay-success-ring">✅</div>
              <div className="pay-success-title">Payment Successful! 🎉</div>
              <div className="pay-success-sub">
                You're registered for <strong style={{ color: 'white' }}>{event?.name}</strong>.<br />
                Show this QR code at the entrance.
              </div>

              <div className="pay-success-details">
                {[
                  { key: 'Amount Paid', val: `₹${total.toLocaleString('en-IN')}` },
                  { key: 'Payment Method', val: paymentMethod.toUpperCase() },
                  { key: 'Event', val: event?.name },
                  { key: 'Date', val: event?.date ? new Date(event.date).toLocaleDateString('en-IN') : 'TBD' },
                  { key: 'Ticket ID', val: registration?.id?.slice(0, 8).toUpperCase() + '...' || 'GENERATED' },
                ].map(row => (
                  <div key={row.key} className="pay-detail-row">
                    <span className="pay-detail-key">{row.key}</span>
                    <span className="pay-detail-val">{row.val}</span>
                  </div>
                ))}
              </div>

              {qrCode && (
                <div className="pay-qr-wrap">
                  <img src={qrCode} alt="QR Code" className="pay-qr-img" />
                  <div className="pay-qr-label">🎫 Your Entry Ticket</div>
                  <div className="pay-qr-sub">ID: {registration?.id?.slice(0, 12)?.toUpperCase()}</div>
                </div>
              )}

              <button className="pay-done-btn" onClick={onClose}>
                ✅ Done — See you at the event!
              </button>
            </div>
          )}

          {/* FAILED */}
          {step === 'failed' && (
            <div className="pay-failed">
              <div className="pay-failed-icon">❌</div>
              <div className="pay-failed-title">Payment Failed</div>
              <div className="pay-failed-sub">Something went wrong with your payment.</div>
              {error && <div className="pay-failed-error">⚠️ {error}</div>}
              <button className="pay-retry-btn" onClick={() => { setStep('details'); setError(''); }}>
                🔄 Try Again
              </button>
              <button className="pay-cancel-link" onClick={onClose}>Cancel</button>
            </div>
          )}

        </div>
      </div>
    </>
  );
};

export default Payment;