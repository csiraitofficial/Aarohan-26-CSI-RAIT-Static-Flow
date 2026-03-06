import React, { useState, useEffect } from 'react';
import Heatmap from '../components/Heatmap';
import { crowdAPI } from '../utils/api';

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
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap');
        * { box-sizing: border-box; }

        .cm-root {
          font-family: 'Plus Jakarta Sans', sans-serif;
          color: white;
          opacity: ${mounted ? 1 : 0};
          transform: ${mounted ? 'translateY(0)' : 'translateY(16px)'};
          transition: all 0.6s cubic-bezier(0.16, 1, 0.3, 1);
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
          font-size: 26px;
          font-weight: 800;
          color: white;
          letter-spacing: -1px;
          margin-bottom: 4px;
        }

        .cm-sub {
          font-size: 14px;
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
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 20px;
          padding: 24px;
        }

        .cm-section-title {
          font-size: 15px;
          font-weight: 700;
          color: white;
          letter-spacing: -0.3px;
          margin-bottom: 20px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        /* TIPS */
        .cm-tips {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .cm-tip {
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 14px;
          padding: 16px;
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
          font-size: 13px;
          font-weight: 700;
          color: white;
          margin-bottom: 4px;
        }

        .cm-tip-desc {
          font-size: 12px;
          color: rgba(255,255,255,0.35);
          line-height: 1.5;
        }

        /* COLOR LEGEND */
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

        .cm-legend-label { flex: 1; color: rgba(255,255,255,0.5); }
        .cm-legend-count { font-weight: 700; }

        @media (max-width: 1100px) {
          .cm-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      <div className="cm-root">

        {/* HEADER */}
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

        {/* MAIN GRID */}
        <div className="cm-grid">

          {/* HEATMAP */}
          <div className="cm-section">
            <Heatmap showSimulation={true} />
          </div>

          {/* RIGHT PANEL */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

            {/* COLOR LEGEND */}
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

            {/* TIPS */}
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