import React, { useState, useEffect, useRef } from 'react';
import { crowdAPI } from '../utils/api';

const ZONES = [
  { id: 'Auditorium', icon: '🎭', description: 'Main performance hall' },
  { id: 'Cafeteria', icon: '🍽️', description: 'Food & dining area' },
  { id: 'Stage', icon: '🎤', description: 'Outdoor stage area' },
  { id: 'Entrance', icon: '🚪', description: 'Main entry point' },
];

const getZoneStatus = (count) => {
  if (count < 30) return {
    label: 'Low', color: '#22c55e',
    bg: 'rgba(34,197,94,0.08)',
    border: 'rgba(34,197,94,0.25)',
    glow: 'rgba(34,197,94,0.15)',
    barColor: 'linear-gradient(90deg, #22c55e, #16a34a)',
    textColor: '#86efac',
  };
  if (count <= 70) return {
    label: 'Moderate', color: '#f59e0b',
    bg: 'rgba(245,158,11,0.08)',
    border: 'rgba(245,158,11,0.25)',
    glow: 'rgba(245,158,11,0.15)',
    barColor: 'linear-gradient(90deg, #f59e0b, #d97706)',
    textColor: '#fcd34d',
  };
  return {
    label: 'Crowded', color: '#ef4444',
    bg: 'rgba(239,68,68,0.08)',
    border: 'rgba(239,68,68,0.25)',
    glow: 'rgba(239,68,68,0.2)',
    barColor: 'linear-gradient(90deg, #ef4444, #dc2626)',
    textColor: '#fca5a5',
  };
};

const Heatmap = ({ eventId = null, showSimulation = true }) => {
  const [zones, setZones] = useState({
    Auditorium: 0, Cafeteria: 0, Stage: 0, Entrance: 0
  });
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [simulating, setSimulating] = useState(false);
  const pollRef = useRef(null);
  const simRef = useRef(null);

  useEffect(() => {
    fetchCrowdData();
    pollRef.current = setInterval(fetchCrowdData, 10000);
    return () => {
      clearInterval(pollRef.current);
      clearInterval(simRef.current);
    };
  }, [eventId]);

  const fetchCrowdData = async () => {
    try {
      const res = await crowdAPI.getCurrent(eventId);
      const data = res.data.zones || [];
      const updated = {};
      data.forEach(z => { updated[z.zone] = z.count; });
      setZones(prev => ({ ...prev, ...updated }));
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Failed to fetch crowd data:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateZone = async (zone, count) => {
    try {
      await crowdAPI.update({ zone, count, event_id: eventId });
      setZones(prev => ({ ...prev, [zone]: count }));
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Failed to update zone:', err);
    }
  };

  const startSimulation = () => {
    setSimulating(true);
    simRef.current = setInterval(async () => {
      const updates = {};
      ZONES.forEach(z => {
        const current = zones[z.id] || 0;
        const delta = Math.floor(Math.random() * 20) - 8;
        updates[z.id] = Math.max(0, Math.min(100, current + delta));
      });

      for (const [zone, count] of Object.entries(updates)) {
        try {
          await crowdAPI.update({ zone, count, event_id: eventId });
        } catch (e) {}
      }

      setZones(prev => ({ ...prev, ...updates }));
      setLastUpdated(new Date());
    }, 2000);
  };

  const stopSimulation = () => {
    setSimulating(false);
    clearInterval(simRef.current);
  };

  const resetAll = async () => {
    for (const z of ZONES) {
      await updateZone(z.id, 0);
    }
  };

  const totalCount = Object.values(zones).reduce((a, b) => a + b, 0);
  const maxCapacity = 400;
  const overallPercent = Math.min(100, Math.round((totalCount / maxCapacity) * 100));

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap');
        * { box-sizing: border-box; }

        .hm-root {
          font-family: 'Plus Jakarta Sans', sans-serif;
          color: white;
        }

        /* HEADER */
        .hm-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 20px;
          flex-wrap: wrap;
          gap: 12px;
        }

        .hm-title-wrap {}

        .hm-title {
          font-size: 16px;
          font-weight: 700;
          color: white;
          letter-spacing: -0.3px;
          margin-bottom: 3px;
        }

        .hm-updated {
          font-size: 11px;
          color: rgba(255,255,255,0.25);
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .hm-pulse {
          width: 6px; height: 6px;
          background: #22c55e;
          border-radius: 50%;
          box-shadow: 0 0 6px #22c55e;
          animation: hmPulse 2s ease-in-out infinite;
        }

        @keyframes hmPulse {
          0%,100% { opacity:1; transform:scale(1); }
          50% { opacity:0.4; transform:scale(0.6); }
        }

        /* OVERALL BAR */
        .hm-overall {
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 14px;
          padding: 16px 20px;
          margin-bottom: 20px;
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .hm-overall-icon {
          width: 40px; height: 40px;
          border-radius: 11px;
          background: rgba(99,102,241,0.1);
          border: 1px solid rgba(99,102,241,0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
          flex-shrink: 0;
        }

        .hm-overall-info { flex: 1; }

        .hm-overall-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }

        .hm-overall-label {
          font-size: 13px;
          font-weight: 600;
          color: rgba(255,255,255,0.5);
        }

        .hm-overall-count {
          font-size: 16px;
          font-weight: 800;
          color: white;
          letter-spacing: -0.5px;
        }

        .hm-bar-bg {
          height: 6px;
          background: rgba(255,255,255,0.06);
          border-radius: 100px;
          overflow: hidden;
        }

        .hm-bar-fill {
          height: 100%;
          border-radius: 100px;
          transition: width 0.8s cubic-bezier(0.16,1,0.3,1);
          position: relative;
          overflow: hidden;
        }

        .hm-bar-fill::after {
          content: '';
          position: absolute;
          top: 0; left: -100%;
          width: 60%; height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
          animation: hmShimmer 2s infinite;
        }

        @keyframes hmShimmer { to { left: 200%; } }

        /* ZONE GRID */
        .hm-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 14px;
          margin-bottom: 20px;
        }

        .hm-zone {
          border-radius: 18px;
          padding: 20px;
          cursor: default;
          transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
          position: relative;
          overflow: hidden;
        }

        .hm-zone:hover {
          transform: translateY(-3px) scale(1.01);
        }

        .hm-zone-glow {
          position: absolute;
          top: -30px; right: -30px;
          width: 100px; height: 100px;
          border-radius: 50%;
          filter: blur(30px);
          opacity: 0.4;
          pointer-events: none;
        }

        .hm-zone-top {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          margin-bottom: 14px;
        }

        .hm-zone-icon {
          font-size: 28px;
          filter: drop-shadow(0 2px 8px rgba(0,0,0,0.3));
        }

        .hm-zone-badge {
          font-size: 10px;
          font-weight: 700;
          padding: 3px 10px;
          border-radius: 100px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .hm-zone-count {
          font-size: 40px;
          font-weight: 800;
          letter-spacing: -2px;
          line-height: 1;
          margin-bottom: 4px;
        }

        .hm-zone-name {
          font-size: 14px;
          font-weight: 700;
          color: white;
          margin-bottom: 2px;
        }

        .hm-zone-desc {
          font-size: 11px;
          color: rgba(255,255,255,0.35);
          margin-bottom: 14px;
        }

        .hm-zone-bar-bg {
          height: 4px;
          background: rgba(255,255,255,0.1);
          border-radius: 100px;
          overflow: hidden;
        }

        .hm-zone-bar-fill {
          height: 100%;
          border-radius: 100px;
          transition: width 0.8s cubic-bezier(0.16,1,0.3,1);
        }

        /* SIMULATION CONTROLS */
        .hm-controls {
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 14px;
          padding: 16px 20px;
        }

        .hm-controls-title {
          font-size: 12px;
          font-weight: 600;
          color: rgba(255,255,255,0.3);
          text-transform: uppercase;
          letter-spacing: 0.8px;
          margin-bottom: 12px;
        }

        .hm-controls-btns {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .hm-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 9px 16px;
          border-radius: 10px;
          border: none;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          font-family: 'Plus Jakarta Sans', sans-serif;
          transition: all 0.2s ease;
        }

        .hm-btn-sim {
          background: linear-gradient(135deg, #6366f1, #4f46e5);
          color: white;
          box-shadow: 0 4px 14px rgba(99,102,241,0.3);
        }

        .hm-btn-sim:hover { transform: translateY(-1px); box-shadow: 0 6px 18px rgba(99,102,241,0.4); }

        .hm-btn-stop {
          background: rgba(239,68,68,0.1);
          border: 1px solid rgba(239,68,68,0.2);
          color: #f87171;
        }

        .hm-btn-stop:hover { background: rgba(239,68,68,0.15); }

        .hm-btn-reset {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          color: rgba(255,255,255,0.4);
        }

        .hm-btn-reset:hover { background: rgba(255,255,255,0.07); color: white; }

        .hm-btn-refresh {
          background: rgba(6,182,212,0.1);
          border: 1px solid rgba(6,182,212,0.2);
          color: #06b6d4;
        }

        .hm-btn-refresh:hover { background: rgba(6,182,212,0.15); }

        /* MANUAL CONTROLS */
        .hm-manual {
          margin-top: 16px;
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 10px;
        }

        .hm-manual-zone {
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 12px;
          padding: 12px;
        }

        .hm-manual-label {
          font-size: 11px;
          color: rgba(255,255,255,0.4);
          font-weight: 600;
          margin-bottom: 8px;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .hm-manual-btns {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .hm-count-btn {
          width: 28px; height: 28px;
          border-radius: 7px;
          border: 1px solid rgba(255,255,255,0.1);
          background: rgba(255,255,255,0.05);
          color: white;
          font-size: 16px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.15s ease;
          font-family: 'Plus Jakarta Sans', sans-serif;
          flex-shrink: 0;
        }

        .hm-count-btn:hover { background: rgba(99,102,241,0.15); border-color: rgba(99,102,241,0.3); }

        .hm-count-display {
          flex: 1;
          text-align: center;
          font-size: 16px;
          font-weight: 800;
          color: white;
          letter-spacing: -0.5px;
        }

        /* LOADING */
        .hm-loading {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 40px;
          gap: 12px;
          color: rgba(255,255,255,0.3);
          font-size: 14px;
        }

        .hm-spinner {
          width: 24px; height: 24px;
          border: 2px solid rgba(99,102,241,0.2);
          border-top-color: #6366f1;
          border-radius: 50%;
          animation: hmSpin 0.8s linear infinite;
        }

        @keyframes hmSpin { to { transform: rotate(360deg); } }

        @media (max-width: 500px) {
          .hm-grid { grid-template-columns: 1fr; }
          .hm-manual { grid-template-columns: 1fr; }
        }
      `}</style>

      <div className="hm-root">

        {/* HEADER */}
        <div className="hm-header">
          <div className="hm-title-wrap">
            <div className="hm-title">Live Crowd Heatmap</div>
            <div className="hm-updated">
              <div className="hm-pulse" />
              {lastUpdated
                ? `Updated ${lastUpdated.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`
                : 'Connecting...'
              }
            </div>
          </div>
        </div>

        {loading ? (
          <div className="hm-loading">
            <div className="hm-spinner" />
            Loading crowd data...
          </div>
        ) : (
          <>
            {/* OVERALL COUNT */}
            <div className="hm-overall">
              <div className="hm-overall-icon">👥</div>
              <div className="hm-overall-info">
                <div className="hm-overall-top">
                  <span className="hm-overall-label">Total Campus Crowd</span>
                  <span className="hm-overall-count">{totalCount} / {maxCapacity}</span>
                </div>
                <div className="hm-bar-bg">
                  <div
                    className="hm-bar-fill"
                    style={{
                      width: `${overallPercent}%`,
                      background: overallPercent > 70
                        ? 'linear-gradient(90deg, #ef4444, #dc2626)'
                        : overallPercent > 40
                        ? 'linear-gradient(90deg, #f59e0b, #d97706)'
                        : 'linear-gradient(90deg, #6366f1, #06b6d4)',
                    }}
                  />
                </div>
              </div>
            </div>

            {/* ZONE GRID */}
            <div className="hm-grid">
              {ZONES.map(zone => {
                const count = zones[zone.id] || 0;
                const s = getZoneStatus(count);
                const pct = Math.min(100, Math.round((count / 100) * 100));

                return (
                  <div
                    key={zone.id}
                    className="hm-zone"
                    style={{
                      background: s.bg,
                      border: `1px solid ${s.border}`,
                      boxShadow: `0 4px 24px ${s.glow}`,
                    }}
                  >
                    <div
                      className="hm-zone-glow"
                      style={{ background: s.color }}
                    />

                    <div className="hm-zone-top">
                      <span className="hm-zone-icon">{zone.icon}</span>
                      <div
                        className="hm-zone-badge"
                        style={{
                          color: s.color,
                          background: `${s.color}20`,
                          border: `1px solid ${s.color}40`,
                        }}
                      >
                        {s.label}
                      </div>
                    </div>

                    <div className="hm-zone-count" style={{ color: s.textColor }}>
                      {count}
                    </div>
                    <div className="hm-zone-name">{zone.id}</div>
                    <div className="hm-zone-desc">{zone.description}</div>

                    <div className="hm-zone-bar-bg">
                      <div
                        className="hm-zone-bar-fill"
                        style={{
                          width: `${pct}%`,
                          background: s.barColor,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* CONTROLS */}
            {showSimulation && (
              <div className="hm-controls">
                <div className="hm-controls-title">🎮 Demo Controls</div>
                <div className="hm-controls-btns">
                  {!simulating ? (
                    <button className="hm-btn hm-btn-sim" onClick={startSimulation}>
                      ▶ Start Simulation
                    </button>
                  ) : (
                    <button className="hm-btn hm-btn-stop" onClick={stopSimulation}>
                      ⏹ Stop Simulation
                    </button>
                  )}
                  <button className="hm-btn hm-btn-refresh" onClick={fetchCrowdData}>
                    🔄 Refresh
                  </button>
                  <button className="hm-btn hm-btn-reset" onClick={resetAll}>
                    ↺ Reset All
                  </button>
                </div>

                {/* MANUAL ZONE CONTROLS */}
                <div className="hm-manual">
                  {ZONES.map(zone => {
                    const count = zones[zone.id] || 0;
                    return (
                      <div key={zone.id} className="hm-manual-zone">
                        <div className="hm-manual-label">
                          {zone.icon} {zone.id}
                        </div>
                        <div className="hm-manual-btns">
                          <button
                            className="hm-count-btn"
                            onClick={() => updateZone(zone.id, Math.max(0, count - 10))}
                          >−</button>
                          <span className="hm-count-display">{count}</span>
                          <button
                            className="hm-count-btn"
                            onClick={() => updateZone(zone.id, Math.min(100, count + 10))}
                          >+</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
};

export default Heatmap;