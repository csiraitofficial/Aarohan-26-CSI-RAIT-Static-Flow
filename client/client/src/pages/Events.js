import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { eventsAPI } from '../utils/api';

const Events = () => {
  const { isCommittee } = useAuth();
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [form, setForm] = useState({
    name: '', description: '', date: '', venue: '', capacity: '', budget: '', status: 'upcoming'
  });

  useEffect(() => { fetchEvents(); }, []);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const res = await eventsAPI.getAll();
      setEvents(res.data.events || []);
    } catch (err) {
      setError('Failed to load events. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreateError('');
    setCreating(true);
    try {
      await eventsAPI.create(form);
      setShowCreate(false);
      setForm({ name: '', description: '', date: '', venue: '', capacity: '', budget: '', status: 'upcoming' });
      fetchEvents();
    } catch (err) {
      setCreateError(err.response?.data?.message || 'Failed to create event.');
    } finally {
      setCreating(false);
    }
  };

  const filtered = events.filter(e => {
    const matchSearch = e.name.toLowerCase().includes(search.toLowerCase()) ||
      (e.venue && e.venue.toLowerCase().includes(search.toLowerCase()));
    const matchFilter = filter === 'all' || e.status === filter;
    return matchSearch && matchFilter;
  });

  const formatDate = (d) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

  const getStatus = (status) => {
    const map = {
      upcoming: { color: '#06b6d4', bg: 'rgba(6,182,212,0.1)', border: 'rgba(6,182,212,0.2)', label: 'Upcoming' },
      ongoing: { color: '#22c55e', bg: 'rgba(34,197,94,0.1)', border: 'rgba(34,197,94,0.2)', label: 'Ongoing' },
      completed: { color: 'rgba(255,255,255,0.3)', bg: 'rgba(255,255,255,0.05)', border: 'rgba(255,255,255,0.08)', label: 'Completed' },
      cancelled: { color: '#ef4444', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.2)', label: 'Cancelled' },
    };
    return map[status] || map.upcoming;
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap');
        * { box-sizing: border-box; }

        .ev-root { font-family: 'Plus Jakarta Sans', sans-serif; color: white; }

        /* HEADER */
        .ev-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          margin-bottom: 28px;
          gap: 20px;
          flex-wrap: wrap;
        }

        .ev-title {
          font-size: 26px;
          font-weight: 800;
          color: white;
          letter-spacing: -1px;
          margin-bottom: 4px;
        }

        .ev-sub {
          font-size: 14px;
          color: rgba(255,255,255,0.35);
          font-weight: 400;
        }

        .ev-create-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 22px;
          background: linear-gradient(135deg, #6366f1, #4f46e5);
          border: none;
          border-radius: 12px;
          color: white;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          font-family: 'Plus Jakarta Sans', sans-serif;
          transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
          box-shadow: 0 4px 20px rgba(99,102,241,0.35);
          white-space: nowrap;
        }

        .ev-create-btn:hover {
          transform: translateY(-2px) scale(1.02);
          box-shadow: 0 8px 28px rgba(99,102,241,0.5);
        }

        /* TOOLBAR */
        .ev-toolbar {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 24px;
          flex-wrap: wrap;
        }

        .ev-search-wrap {
          position: relative;
          flex: 1;
          min-width: 200px;
        }

        .ev-search-icon {
          position: absolute;
          left: 14px; top: 50%;
          transform: translateY(-50%);
          font-size: 15px;
          opacity: 0.35;
          pointer-events: none;
        }

        .ev-search {
          width: 100%;
          background: rgba(255,255,255,0.04);
          border: 1.5px solid rgba(255,255,255,0.07);
          border-radius: 12px;
          padding: 12px 14px 12px 42px;
          font-size: 14px;
          color: white;
          font-family: 'Plus Jakarta Sans', sans-serif;
          outline: none;
          transition: all 0.25s ease;
        }

        .ev-search::placeholder { color: rgba(255,255,255,0.2); }
        .ev-search:focus {
          border-color: rgba(99,102,241,0.5);
          background: rgba(99,102,241,0.06);
          box-shadow: 0 0 0 4px rgba(99,102,241,0.08);
        }

        .ev-filters {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .ev-filter {
          padding: 10px 16px;
          border-radius: 10px;
          border: 1.5px solid rgba(255,255,255,0.07);
          background: rgba(255,255,255,0.03);
          color: rgba(255,255,255,0.4);
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          font-family: 'Plus Jakarta Sans', sans-serif;
          transition: all 0.2s ease;
        }

        .ev-filter:hover {
          border-color: rgba(99,102,241,0.3);
          color: rgba(255,255,255,0.7);
        }

        .ev-filter.active {
          background: rgba(99,102,241,0.12);
          border-color: rgba(99,102,241,0.35);
          color: #a5b4fc;
        }

        /* STATS ROW */
        .ev-stats {
          display: flex;
          gap: 12px;
          margin-bottom: 24px;
          flex-wrap: wrap;
        }

        .ev-stat {
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 12px;
          padding: 14px 20px;
          display: flex;
          align-items: center;
          gap: 10px;
          flex: 1;
          min-width: 120px;
        }

        .ev-stat-icon {
          font-size: 20px;
          width: 36px; height: 36px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .ev-stat-num {
          font-size: 20px;
          font-weight: 800;
          color: white;
          letter-spacing: -0.5px;
          display: block;
        }

        .ev-stat-label {
          font-size: 11px;
          color: rgba(255,255,255,0.3);
          text-transform: uppercase;
          letter-spacing: 0.5px;
          font-weight: 500;
        }

        /* GRID */
        .ev-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 16px;
        }

        /* EVENT CARD */
        .ev-card {
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 18px;
          padding: 24px;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
          position: relative;
          overflow: hidden;
        }

        .ev-card::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 2px;
          background: linear-gradient(90deg, #6366f1, #06b6d4);
          opacity: 0;
          transition: opacity 0.3s ease;
        }

        .ev-card:hover {
          transform: translateY(-4px);
          border-color: rgba(99,102,241,0.2);
          background: rgba(255,255,255,0.04);
          box-shadow: 0 12px 40px rgba(0,0,0,0.3);
        }

        .ev-card:hover::before { opacity: 1; }

        .ev-card-top {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          margin-bottom: 16px;
          gap: 12px;
        }

        .ev-card-icon {
          width: 48px; height: 48px;
          border-radius: 14px;
          background: rgba(99,102,241,0.1);
          border: 1px solid rgba(99,102,241,0.15);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 22px;
          flex-shrink: 0;
        }

        .ev-card-status {
          font-size: 11px;
          font-weight: 600;
          padding: 4px 12px;
          border-radius: 100px;
          letter-spacing: 0.3px;
        }

        .ev-card-name {
          font-size: 17px;
          font-weight: 700;
          color: white;
          letter-spacing: -0.3px;
          margin-bottom: 6px;
          line-height: 1.3;
        }

        .ev-card-desc {
          font-size: 13px;
          color: rgba(255,255,255,0.35);
          line-height: 1.6;
          margin-bottom: 18px;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .ev-card-details {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-bottom: 18px;
        }

        .ev-card-detail {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          color: rgba(255,255,255,0.4);
        }

        .ev-card-detail-icon {
          width: 24px; height: 24px;
          border-radius: 6px;
          background: rgba(255,255,255,0.04);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          flex-shrink: 0;
        }

        .ev-card-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-top: 16px;
          border-top: 1px solid rgba(255,255,255,0.05);
        }

        .ev-card-cap {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
          color: rgba(255,255,255,0.35);
        }

        .ev-card-budget {
          font-size: 14px;
          font-weight: 700;
          color: #f59e0b;
        }

        .ev-card-arrow {
          font-size: 16px;
          opacity: 0.3;
          transition: all 0.2s ease;
        }

        .ev-card:hover .ev-card-arrow {
          opacity: 1;
          transform: translateX(4px);
        }

        /* EMPTY STATE */
        .ev-empty {
          grid-column: 1 / -1;
          text-align: center;
          padding: 80px 20px;
          color: rgba(255,255,255,0.2);
        }

        .ev-empty-icon { font-size: 56px; display: block; margin-bottom: 16px; opacity: 0.4; }
        .ev-empty-title { font-size: 18px; font-weight: 700; color: rgba(255,255,255,0.3); margin-bottom: 8px; }
        .ev-empty-sub { font-size: 14px; color: rgba(255,255,255,0.2); }

        /* LOADING */
        .ev-skeleton {
          background: linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.07) 50%, rgba(255,255,255,0.04) 75%);
          background-size: 200% 100%;
          animation: evSkeleton 1.5s infinite;
          border-radius: 8px;
        }

        @keyframes evSkeleton {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }

        .ev-skeleton-card {
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 18px;
          padding: 24px;
        }

        /* ERROR */
        .ev-error {
          grid-column: 1 / -1;
          background: rgba(239,68,68,0.08);
          border: 1px solid rgba(239,68,68,0.2);
          border-radius: 14px;
          padding: 20px 24px;
          color: #fca5a5;
          font-size: 14px;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        /* MODAL */
        .ev-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.8);
          backdrop-filter: blur(8px);
          z-index: 200;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }

        .ev-modal {
          background: #0d0f1e;
          border: 1px solid rgba(99,102,241,0.2);
          border-radius: 24px;
          padding: 40px;
          width: 100%;
          max-width: 520px;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 32px 80px rgba(0,0,0,0.5);
        }

        .ev-modal-title {
          font-size: 22px;
          font-weight: 800;
          color: white;
          letter-spacing: -0.5px;
          margin-bottom: 6px;
        }

        .ev-modal-sub {
          font-size: 14px;
          color: rgba(255,255,255,0.3);
          margin-bottom: 28px;
        }

        .ev-modal-field { margin-bottom: 18px; }

        .ev-modal-label {
          display: block;
          font-size: 11px;
          font-weight: 600;
          color: rgba(255,255,255,0.35);
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-bottom: 8px;
        }

        .ev-modal-input {
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

        .ev-modal-input::placeholder { color: rgba(255,255,255,0.15); }

        .ev-modal-input:focus {
          border-color: rgba(99,102,241,0.5);
          background: rgba(99,102,241,0.06);
          box-shadow: 0 0 0 4px rgba(99,102,241,0.08);
        }

        .ev-modal-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
        }

        .ev-modal-select {
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
          cursor: pointer;
        }

        .ev-modal-select option { background: #0d0f1e; }

        .ev-modal-btns {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin-top: 8px;
        }

        .ev-modal-cancel {
          padding: 13px;
          border-radius: 12px;
          background: rgba(255,255,255,0.04);
          border: 1.5px solid rgba(255,255,255,0.08);
          color: rgba(255,255,255,0.5);
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          font-family: 'Plus Jakarta Sans', sans-serif;
          transition: all 0.2s ease;
        }

        .ev-modal-cancel:hover { background: rgba(255,255,255,0.07); color: white; }

        .ev-modal-submit {
          padding: 13px;
          border-radius: 12px;
          background: linear-gradient(135deg, #6366f1, #4f46e5);
          border: none;
          color: white;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          font-family: 'Plus Jakarta Sans', sans-serif;
          transition: all 0.2s ease;
          box-shadow: 0 4px 16px rgba(99,102,241,0.4);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        .ev-modal-submit:hover { transform: translateY(-1px); box-shadow: 0 8px 24px rgba(99,102,241,0.5); }
        .ev-modal-submit:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }

        .ev-spinner {
          width: 16px; height: 16px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: evSpin 0.7s linear infinite;
        }

        @keyframes evSpin { to { transform: rotate(360deg); } }

        .ev-modal-error {
          background: rgba(239,68,68,0.08);
          border: 1px solid rgba(239,68,68,0.2);
          border-radius: 10px;
          padding: 10px 14px;
          font-size: 13px;
          color: #fca5a5;
          margin-bottom: 16px;
        }

        @media (max-width: 600px) {
          .ev-modal-row { grid-template-columns: 1fr; }
          .ev-modal { padding: 28px 24px; }
        }
      `}</style>

      <div className="ev-root">

        {/* HEADER */}
        <div className="ev-header">
          <div>
            <div className="ev-title">Events 🎉</div>
            <div className="ev-sub">{events.length} total events on campus</div>
          </div>
          {isCommittee && (
            <button className="ev-create-btn" onClick={() => setShowCreate(true)}>
              + Create Event
            </button>
          )}
        </div>

        {/* STATS ROW */}
        <div className="ev-stats">
          {[
            { icon: '🎉', label: 'Total', value: events.length, color: '#6366f1', bg: 'rgba(99,102,241,0.1)' },
            { icon: '⚡', label: 'Upcoming', value: events.filter(e => e.status === 'upcoming').length, color: '#06b6d4', bg: 'rgba(6,182,212,0.1)' },
            { icon: '🟢', label: 'Ongoing', value: events.filter(e => e.status === 'ongoing').length, color: '#22c55e', bg: 'rgba(34,197,94,0.1)' },
            { icon: '✅', label: 'Completed', value: events.filter(e => e.status === 'completed').length, color: 'rgba(255,255,255,0.4)', bg: 'rgba(255,255,255,0.05)' },
          ].map(s => (
            <div key={s.label} className="ev-stat">
              <div className="ev-stat-icon" style={{ background: s.bg }}>
                {s.icon}
              </div>
              <div>
                <span className="ev-stat-num" style={{ color: s.color }}>{s.value}</span>
                <span className="ev-stat-label">{s.label}</span>
              </div>
            </div>
          ))}
        </div>

        {/* TOOLBAR */}
        <div className="ev-toolbar">
          <div className="ev-search-wrap">
            <span className="ev-search-icon">🔍</span>
            <input
              className="ev-search"
              type="text"
              placeholder="Search events by name or venue..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="ev-filters">
            {['all', 'upcoming', 'ongoing', 'completed'].map(f => (
              <button
                key={f}
                className={`ev-filter ${filter === f ? 'active' : ''}`}
                onClick={() => setFilter(f)}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* GRID */}
        <div className="ev-grid">
          {loading ? (
            [1,2,3,4,5,6].map(i => (
              <div key={i} className="ev-skeleton-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                  <div className="ev-skeleton" style={{ width: '48px', height: '48px', borderRadius: '14px' }} />
                  <div className="ev-skeleton" style={{ width: '80px', height: '24px', borderRadius: '100px' }} />
                </div>
                <div className="ev-skeleton" style={{ width: '70%', height: '20px', marginBottom: '10px' }} />
                <div className="ev-skeleton" style={{ width: '90%', height: '14px', marginBottom: '6px' }} />
                <div className="ev-skeleton" style={{ width: '60%', height: '14px', marginBottom: '20px' }} />
                <div className="ev-skeleton" style={{ width: '100%', height: '1px', marginBottom: '16px' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div className="ev-skeleton" style={{ width: '40%', height: '14px' }} />
                  <div className="ev-skeleton" style={{ width: '25%', height: '14px' }} />
                </div>
              </div>
            ))
          ) : error ? (
            <div className="ev-error">⚠️ {error}</div>
          ) : filtered.length === 0 ? (
            <div className="ev-empty">
              <span className="ev-empty-icon">🔍</span>
              <div className="ev-empty-title">No events found</div>
              <div className="ev-empty-sub">
                {search ? `No results for "${search}"` : 'No events in this category yet'}
              </div>
            </div>
          ) : (
            filtered.map(event => {
              const s = getStatus(event.status);
              return (
                <div key={event.id} className="ev-card" onClick={() => navigate(`/events/${event.id}`)}>
                  <div className="ev-card-top">
                    <div className="ev-card-icon">🎉</div>
                    <div className="ev-card-status" style={{ color: s.color, background: s.bg, border: `1px solid ${s.border}` }}>
                      {s.label}
                    </div>
                  </div>

                  <div className="ev-card-name">{event.name}</div>
                  {event.description && (
                    <div className="ev-card-desc">{event.description}</div>
                  )}

                  <div className="ev-card-details">
                    <div className="ev-card-detail">
                      <div className="ev-card-detail-icon">📅</div>
                      {event.date ? formatDate(event.date) : 'Date TBD'}
                    </div>
                    {event.venue && (
                      <div className="ev-card-detail">
                        <div className="ev-card-detail-icon">📍</div>
                        {event.venue}
                      </div>
                    )}
                    {event.capacity && (
                      <div className="ev-card-detail">
                        <div className="ev-card-detail-icon">👥</div>
                        {event.capacity} capacity
                      </div>
                    )}
                  </div>

                  <div className="ev-card-footer">
                    <div className="ev-card-cap">
                      {event.budget && (
                        <span className="ev-card-budget">
                          ₹{parseFloat(event.budget).toLocaleString('en-IN')}
                        </span>
                      )}
                    </div>
                    <span className="ev-card-arrow">→</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* CREATE EVENT MODAL */}
      {showCreate && (
        <div className="ev-modal-overlay" onClick={e => e.target === e.currentTarget && setShowCreate(false)}>
          <div className="ev-modal">
            <div className="ev-modal-title">Create New Event ✨</div>
            <div className="ev-modal-sub">Fill in the details to create a new campus event</div>

            {createError && <div className="ev-modal-error">⚠️ {createError}</div>}

            <form onSubmit={handleCreate}>
              <div className="ev-modal-field">
                <label className="ev-modal-label">Event Name *</label>
                <input className="ev-modal-input" type="text"
                  value={form.name} onChange={e => setForm({...form, name: e.target.value})}
                  placeholder="e.g. Tech Fest 2026" required />
              </div>

              <div className="ev-modal-field">
                <label className="ev-modal-label">Description</label>
                <textarea className="ev-modal-input" rows={3}
                  value={form.description} onChange={e => setForm({...form, description: e.target.value})}
                  placeholder="Describe your event..."
                  style={{ resize: 'vertical', minHeight: '80px' }} />
              </div>

              <div className="ev-modal-row">
                <div className="ev-modal-field">
                  <label className="ev-modal-label">Date *</label>
                  <input className="ev-modal-input" type="date"
                    value={form.date} onChange={e => setForm({...form, date: e.target.value})}
                    required style={{ colorScheme: 'dark' }} />
                </div>
                <div className="ev-modal-field">
                  <label className="ev-modal-label">Status</label>
                  <select className="ev-modal-select"
                    value={form.status} onChange={e => setForm({...form, status: e.target.value})}>
                    <option value="upcoming">Upcoming</option>
                    <option value="ongoing">Ongoing</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>

              <div className="ev-modal-field">
                <label className="ev-modal-label">Venue</label>
                <input className="ev-modal-input" type="text"
                  value={form.venue} onChange={e => setForm({...form, venue: e.target.value})}
                  placeholder="e.g. Main Auditorium" />
              </div>

              <div className="ev-modal-row">
                <div className="ev-modal-field">
                  <label className="ev-modal-label">Capacity</label>
                  <input className="ev-modal-input" type="number"
                    value={form.capacity} onChange={e => setForm({...form, capacity: e.target.value})}
                    placeholder="500" />
                </div>
                <div className="ev-modal-field">
                  <label className="ev-modal-label">Budget (₹)</label>
                  <input className="ev-modal-input" type="number"
                    value={form.budget} onChange={e => setForm({...form, budget: e.target.value})}
                    placeholder="50000" />
                </div>
              </div>

              <div className="ev-modal-btns">
                <button type="button" className="ev-modal-cancel" onClick={() => setShowCreate(false)}>
                  Cancel
                </button>
                <button type="submit" className="ev-modal-submit" disabled={creating}>
                  {creating ? <><div className="ev-spinner" /> Creating...</> : '✨ Create Event'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default Events;