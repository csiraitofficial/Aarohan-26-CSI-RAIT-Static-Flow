import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { registrationsAPI } from '../utils/api';

const QRScanner = ({ onClose, onSuccess }) => {
  const scannerRef = useRef(null);
  const [scanning, setScanning] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [cameras, setCameras] = useState([]);
  const [selectedCamera, setSelectedCamera] = useState(null);
  const scannerInstanceRef = useRef(null);

  useEffect(() => {
    getCameras();
    return () => stopScanner();
  }, []);

  useEffect(() => {
    if (selectedCamera) startScanner(selectedCamera);
  }, [selectedCamera]);

  const getCameras = async () => {
    try {
      const devices = await Html5Qrcode.getCameras();
      setCameras(devices);
      if (devices.length > 0) {
        // Prefer back camera on mobile
        const back = devices.find(d =>
          d.label.toLowerCase().includes('back') ||
          d.label.toLowerCase().includes('rear') ||
          d.label.toLowerCase().includes('environment')
        );
        setSelectedCamera(back?.id || devices[0].id);
      }
    } catch (err) {
      setError('Camera access denied. Please allow camera permissions.');
    }
  };

  const startScanner = async (cameraId) => {
    if (scannerInstanceRef.current) await stopScanner();

    try {
      const scanner = new Html5Qrcode('qr-reader');
      scannerInstanceRef.current = scanner;

      await scanner.start(
        cameraId,
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        },
        onScanSuccess,
        () => {} // ignore frequent errors
      );

      setScanning(true);
      setError('');
    } catch (err) {
      setError('Failed to start camera. Please check permissions.');
      setScanning(false);
    }
  };

  const stopScanner = async () => {
    if (scannerInstanceRef.current) {
      try {
        await scannerInstanceRef.current.stop();
        scannerInstanceRef.current.clear();
      } catch (e) {}
      scannerInstanceRef.current = null;
    }
    setScanning(false);
  };

  const onScanSuccess = async (decodedText) => {
    if (processing) return;
    setProcessing(true);

    // Pause scanner while processing
    await stopScanner();

    try {
      // Parse QR data
      let qrData;
      try {
        qrData = JSON.parse(decodedText);
      } catch {
        throw new Error('Invalid QR code format.');
      }

      if (!qrData.registration_id) throw new Error('Invalid registration QR code.');

      // Send to backend
      const res = await registrationsAPI.scanQR({
        registration_id: qrData.registration_id,
        event_id: qrData.event_id,
      });

      setResult({
        success: true,
        student: res.data.registration?.users?.name || 'Student',
        event: res.data.registration?.events?.name || 'Event',
        time: new Date().toLocaleTimeString('en-IN'),
        registrationId: qrData.registration_id,
      });

      if (onSuccess) onSuccess(res.data);

    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Scan failed.';
      const isAlreadyScanned = msg.toLowerCase().includes('already');
      setResult({
        success: false,
        alreadyScanned: isAlreadyScanned,
        message: msg,
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleRescan = async () => {
    setResult(null);
    setError('');
    if (selectedCamera) await startScanner(selectedCamera);
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

        .qrs-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.85);
          backdrop-filter: blur(12px);
          z-index: 300;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          font-family: 'Plus Jakarta Sans', sans-serif;
        }

        .qrs-modal {
          background: #0d0f1e;
          border: 1px solid rgba(99,102,241,0.2);
          border-radius: 24px;
          width: 100%;
          max-width: 440px;
          overflow: hidden;
          box-shadow: 0 32px 80px rgba(0,0,0,0.6);
        }

        /* HEADER */
        .qrs-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 20px 24px;
          border-bottom: 1px solid rgba(255,255,255,0.06);
          background: rgba(255,255,255,0.02);
        }

        .qrs-header-left {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .qrs-header-icon {
          width: 40px; height: 40px;
          background: linear-gradient(135deg, #6366f1, #4f46e5);
          border-radius: 11px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
          box-shadow: 0 4px 12px rgba(99,102,241,0.4);
        }

        .qrs-header-title {
          font-size: 16px;
          font-weight: 700;
          color: white;
          letter-spacing: -0.3px;
        }

        .qrs-header-sub {
          font-size: 11px;
          color: rgba(255,255,255,0.3);
          margin-top: 1px;
        }

        .qrs-close {
          width: 34px; height: 34px;
          border-radius: 8px;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.08);
          color: rgba(255,255,255,0.4);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          transition: all 0.2s ease;
        }

        .qrs-close:hover {
          background: rgba(239,68,68,0.1);
          border-color: rgba(239,68,68,0.2);
          color: #f87171;
        }

        /* CAMERA SELECTOR */
        .qrs-camera-select {
          padding: 12px 20px;
          border-bottom: 1px solid rgba(255,255,255,0.05);
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .qrs-camera-label {
          font-size: 12px;
          color: rgba(255,255,255,0.3);
          font-weight: 500;
          flex-shrink: 0;
        }

        .qrs-select {
          flex: 1;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 8px;
          padding: 7px 12px;
          font-size: 12px;
          color: white;
          font-family: 'Plus Jakarta Sans', sans-serif;
          outline: none;
          cursor: pointer;
        }

        .qrs-select option { background: #0d0f1e; }

        /* SCANNER AREA */
        .qrs-scanner-area {
          position: relative;
          background: #000;
        }

        #qr-reader {
          width: 100% !important;
          border: none !important;
        }

        #qr-reader video {
          width: 100% !important;
          border-radius: 0 !important;
        }

        #qr-reader img { display: none !important; }
        #qr-reader__dashboard_section_csr button { display: none !important; }
        #qr-reader__status_span { display: none !important; }
        #qr-reader__header_message { display: none !important; }
        #qr-reader__filescan_input { display: none !important; }
        #qr-reader__dashboard { display: none !important; }

        .qrs-crosshair {
          position: absolute;
          top: 50%; left: 50%;
          transform: translate(-50%, -50%);
          width: 250px; height: 250px;
          pointer-events: none;
          z-index: 10;
        }

        .qrs-corner {
          position: absolute;
          width: 24px; height: 24px;
          border-color: #6366f1;
          border-style: solid;
        }

        .qrs-corner-tl { top: 0; left: 0; border-width: 3px 0 0 3px; border-radius: 4px 0 0 0; }
        .qrs-corner-tr { top: 0; right: 0; border-width: 3px 3px 0 0; border-radius: 0 4px 0 0; }
        .qrs-corner-bl { bottom: 0; left: 0; border-width: 0 0 3px 3px; border-radius: 0 0 0 4px; }
        .qrs-corner-br { bottom: 0; right: 0; border-width: 0 3px 3px 0; border-radius: 0 0 4px 0; }

        .qrs-scan-line {
          position: absolute;
          left: 10px; right: 10px;
          height: 2px;
          background: linear-gradient(90deg, transparent, #6366f1, #06b6d4, #6366f1, transparent);
          animation: qrsScan 2s ease-in-out infinite;
          border-radius: 1px;
        }

        @keyframes qrsScan {
          0% { top: 10px; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 230px; opacity: 0; }
        }

        /* STATUS BAR */
        .qrs-status {
          padding: 12px 20px;
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          border-top: 1px solid rgba(255,255,255,0.05);
        }

        .qrs-status-dot {
          width: 8px; height: 8px;
          border-radius: 50%;
          flex-shrink: 0;
        }

        /* PROCESSING */
        .qrs-processing {
          padding: 40px 24px;
          text-align: center;
          background: #000;
        }

        .qrs-processing-spinner {
          width: 56px; height: 56px;
          border: 3px solid rgba(99,102,241,0.2);
          border-top-color: #6366f1;
          border-radius: 50%;
          animation: qrsSpin 0.8s linear infinite;
          margin: 0 auto 16px;
        }

        @keyframes qrsSpin { to { transform: rotate(360deg); } }

        .qrs-processing-text {
          font-size: 16px;
          font-weight: 600;
          color: white;
          margin-bottom: 6px;
        }

        .qrs-processing-sub {
          font-size: 13px;
          color: rgba(255,255,255,0.3);
        }

        /* RESULT */
        .qrs-result {
          padding: 32px 24px;
          text-align: center;
        }

        .qrs-result-icon {
          width: 72px; height: 72px;
          border-radius: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 32px;
          margin: 0 auto 20px;
          animation: qrsBounce 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        @keyframes qrsBounce {
          from { transform: scale(0); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }

        .qrs-result-title {
          font-size: 20px;
          font-weight: 800;
          color: white;
          letter-spacing: -0.5px;
          margin-bottom: 6px;
        }

        .qrs-result-sub {
          font-size: 14px;
          color: rgba(255,255,255,0.4);
          margin-bottom: 20px;
          line-height: 1.6;
        }

        .qrs-result-card {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 14px;
          padding: 16px;
          margin-bottom: 20px;
          text-align: left;
        }

        .qrs-result-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 0;
          border-bottom: 1px solid rgba(255,255,255,0.04);
        }

        .qrs-result-row:last-child { border-bottom: none; }

        .qrs-result-key {
          font-size: 12px;
          color: rgba(255,255,255,0.3);
          font-weight: 500;
        }

        .qrs-result-val {
          font-size: 13px;
          font-weight: 600;
          color: white;
        }

        .qrs-rescan-btn {
          width: 100%;
          height: 48px;
          background: linear-gradient(135deg, #6366f1, #4f46e5);
          border: none;
          border-radius: 12px;
          color: white;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          font-family: 'Plus Jakarta Sans', sans-serif;
          transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
          box-shadow: 0 4px 16px rgba(99,102,241,0.35);
        }

        .qrs-rescan-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(99,102,241,0.5);
        }

        /* ERROR STATE */
        .qrs-error-box {
          margin: 20px;
          background: rgba(239,68,68,0.08);
          border: 1px solid rgba(239,68,68,0.2);
          border-radius: 14px;
          padding: 20px;
          text-align: center;
        }

        .qrs-error-icon { font-size: 32px; margin-bottom: 12px; display: block; }
        .qrs-error-text { font-size: 14px; color: #fca5a5; margin-bottom: 16px; }

        .qrs-retry-btn {
          padding: 10px 24px;
          background: rgba(239,68,68,0.1);
          border: 1px solid rgba(239,68,68,0.2);
          border-radius: 10px;
          color: #f87171;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          font-family: 'Plus Jakarta Sans', sans-serif;
          transition: all 0.2s ease;
        }

        .qrs-retry-btn:hover { background: rgba(239,68,68,0.15); }
      `}</style>

      <div className="qrs-overlay" onClick={e => e.target === e.currentTarget && onClose?.()}>
        <div className="qrs-modal">

          {/* HEADER */}
          <div className="qrs-header">
            <div className="qrs-header-left">
              <div className="qrs-header-icon">📱</div>
              <div>
                <div className="qrs-header-title">QR Scanner</div>
                <div className="qrs-header-sub">Scan student entry tickets</div>
              </div>
            </div>
            <button className="qrs-close" onClick={() => { stopScanner(); onClose?.(); }}>✕</button>
          </div>

          {/* CAMERA SELECTOR */}
          {cameras.length > 1 && !result && !processing && (
            <div className="qrs-camera-select">
              <span className="qrs-camera-label">📷 Camera:</span>
              <select
                className="qrs-select"
                value={selectedCamera || ''}
                onChange={e => setSelectedCamera(e.target.value)}
              >
                {cameras.map(cam => (
                  <option key={cam.id} value={cam.id}>{cam.label || `Camera ${cam.id}`}</option>
                ))}
              </select>
            </div>
          )}

          {/* SCANNER */}
          {!result && !processing && (
            <>
              <div className="qrs-scanner-area">
                <div id="qr-reader" ref={scannerRef} />
                {scanning && (
                  <div className="qrs-crosshair">
                    <div className="qrs-corner qrs-corner-tl" />
                    <div className="qrs-corner qrs-corner-tr" />
                    <div className="qrs-corner qrs-corner-bl" />
                    <div className="qrs-corner qrs-corner-br" />
                    <div className="qrs-scan-line" />
                  </div>
                )}
              </div>

              <div className="qrs-status">
                <div className="qrs-status-dot" style={{
                  background: scanning ? '#22c55e' : '#f59e0b',
                  boxShadow: scanning ? '0 0 8px #22c55e' : '0 0 8px #f59e0b',
                  animation: scanning ? 'qrsDot 1.5s ease-in-out infinite' : 'none'
                }} />
                <span style={{ color: scanning ? '#86efac' : '#fcd34d', fontWeight: '600' }}>
                  {scanning ? 'Camera active — point at QR code' : 'Starting camera...'}
                </span>
              </div>
            </>
          )}

          {/* PROCESSING */}
          {processing && (
            <div className="qrs-processing">
              <div className="qrs-processing-spinner" />
              <div className="qrs-processing-text">Verifying ticket...</div>
              <div className="qrs-processing-sub">Checking with server</div>
            </div>
          )}

          {/* ERROR */}
          {error && !result && !processing && (
            <div className="qrs-error-box">
              <span className="qrs-error-icon">📷</span>
              <div className="qrs-error-text">{error}</div>
              <button className="qrs-retry-btn" onClick={getCameras}>
                🔄 Retry
              </button>
            </div>
          )}

          {/* RESULT */}
          {result && (
            <div className="qrs-result">
              <div
                className="qrs-result-icon"
                style={{
                  background: result.success
                    ? 'rgba(34,197,94,0.15)'
                    : result.alreadyScanned
                    ? 'rgba(245,158,11,0.15)'
                    : 'rgba(239,68,68,0.15)',
                  border: `1px solid ${result.success ? 'rgba(34,197,94,0.3)' : result.alreadyScanned ? 'rgba(245,158,11,0.3)' : 'rgba(239,68,68,0.3)'}`,
                }}
              >
                {result.success ? '✅' : result.alreadyScanned ? '⚠️' : '❌'}
              </div>

              <div className="qrs-result-title">
                {result.success
                  ? 'Check-in Successful!'
                  : result.alreadyScanned
                  ? 'Already Checked In'
                  : 'Invalid Ticket'
                }
              </div>

              <div className="qrs-result-sub">
                {result.success
                  ? `${result.student} has been checked in successfully`
                  : result.message
                }
              </div>

              {result.success && (
                <div className="qrs-result-card">
                  {[
                    { key: 'Student', val: result.student },
                    { key: 'Event', val: result.event },
                    { key: 'Time', val: result.time },
                    { key: 'Ticket ID', val: result.registrationId?.slice(0, 8) + '...' },
                  ].map(row => (
                    <div key={row.key} className="qrs-result-row">
                      <span className="qrs-result-key">{row.key}</span>
                      <span className="qrs-result-val">{row.val}</span>
                    </div>
                  ))}
                </div>
              )}

              <button className="qrs-rescan-btn" onClick={handleRescan}>
                📱 Scan Another
              </button>
            </div>
          )}

        </div>
      </div>
    </>
  );
};

export default QRScanner;