import React, { useState, useEffect } from 'react';
import { eventsAPI } from '../utils/api';
import BudgetTracker from '../components/BudgetTracker';

const Budget = () => {
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setTimeout(() => setMounted(true), 100);
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const res = await eventsAPI.getAll();
      const evs = res.data.events || [];
      setEvents(evs);
      if (evs.length > 0) setSelectedEvent(evs[0]);
    } catch (err) {
      console.error('Failed to fetch events:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap');
        * { box-sizing: border-box; }

        .bg-root {
          font-family: 'Plus Jakarta Sans', sans-serif;
          color: white;
          opacity: ${mounted ? 1 : 0};
          transform: ${mounted ? 'translateY(0)' : 'translateY(16px)'};
          transition: all 0.6s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .bg-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          margin-bottom: 28px;
          flex-wrap: wrap;
          gap: 16px;
        }

        .bg-title {
          font-size: 26px;
          font-weight: 800;
          color: white;
          letter-spacing: -1px;
          margin-bottom: 4px;
        }

        .bg-sub {
          font-size: 14px;
          color: rgba(255,255,255,0.35);
        }

        .bg-event-select-wrap {
          position: relative;
        }

        .bg-event-select {
          background: rgba(255,255,255,0.04);
          border: 1.5px solid rgba(255,255,255,0.08);
          border-radius: 12px;
          padding: 11px 16px 11px 40px;
          font-size: 14px;
          color: white;
          font-family: 'Plus Jakarta Sans', sans-serif;
          outline: none;
          cursor: pointer;
          transition: all 0.2s ease;
          min-width: 240px;
          appearance: none;
        }

        .bg-event-select:focus {
          border-color: rgba(99,102,241,0.5);
          background: rgba(99,102,241,0.06);
        }

        .bg-event-select option { background: #0d0f1e; }

        .bg-select-icon {
          position: absolute;
          left: 12px; top: 50%;
          transform: translateY(-50%);
          font-size: 15px;
          pointer-events: none;
        }

        .bg-empty {
          text-align: center;
          padding: 80px 20px;
          color: rgba(255,255,255,0.2);
        }

        .bg-empty-icon { font-size: 56px; display: block; margin-bottom: 16px; opacity: 0.4; }
        .bg-empty-title { font-size: 18px; font-weight: 700; color: rgba(255,255,255,0.3); margin-bottom: 8px; }
        .bg-empty-sub { font-size: 14px; }

        .bg-spinner {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 80px;
          gap: 12px;
          color: rgba(255,255,255,0.3);
          font-size: 14px;
        }

        .bg-spin {
          width: 24px; height: 24px;
          border: 2px solid rgba(99,102,241,0.2);
          border-top-color: #6366f1;
          border-radius: 50%;
          animation: bgSpin 0.8s linear infinite;
        }

        @keyframes bgSpin { to { transform: rotate(360deg); } }
      `}</style>

      <div className="bg-root">

        {/* HEADER */}
        <div className="bg-header">
          <div>
            <div className="bg-title">Budget Tracker 💰</div>
            <div className="bg-sub">
              {selectedEvent
                ? `Managing budget for: ${selectedEvent.name}`
                : 'Select an event to manage budget'
              }
            </div>
          </div>

          {/* EVENT SELECTOR */}
          {events.length > 0 && (
            <div className="bg-event-select-wrap">
              <span className="bg-select-icon">🎉</span>
              <select
                className="bg-event-select"
                value={selectedEvent?.id || ''}
                onChange={e => {
                  const ev = events.find(ev => ev.id === e.target.value);
                  setSelectedEvent(ev);
                }}
              >
                {events.map(ev => (
                  <option key={ev.id} value={ev.id}>{ev.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* CONTENT */}
        {loading ? (
          <div className="bg-spinner">
            <div className="bg-spin" />
            Loading events...
          </div>
        ) : events.length === 0 ? (
          <div className="bg-empty">
            <span className="bg-empty-icon">💰</span>
            <div className="bg-empty-title">No events found</div>
            <div className="bg-empty-sub">
              Create an event first to start tracking budget
            </div>
          </div>
        ) : selectedEvent ? (
          <BudgetTracker event={selectedEvent} />
        ) : null}

      </div>
    </>
  );
};

export default Budget;