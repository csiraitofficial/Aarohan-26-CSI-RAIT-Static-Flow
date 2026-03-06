import React, { useState, useEffect, useRef } from 'react';
import { budgetAPI } from '../utils/api';

const CATEGORIES = ['equipment', 'food', 'decoration', 'marketing', 'transport', 'venue', 'other'];

const CATEGORY_COLORS = {
  equipment: '#6366f1',
  food: '#f59e0b',
  decoration: '#ec4899',
  marketing: '#06b6d4',
  transport: '#8b5cf6',
  venue: '#22c55e',
  other: 'rgba(255,255,255,0.3)',
};

const CATEGORY_ICONS = {
  equipment: '🔧', food: '🍕', decoration: '🎨',
  marketing: '📢', transport: '🚗', venue: '🏛️', other: '📦',
};

const BudgetTracker = ({ event }) => {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ item: '', amount: '', category: 'equipment' });

  useEffect(() => {
    if (event?.id) fetchExpenses();
  }, [event?.id]);

  useEffect(() => {
    if (!loading) renderChart();
    return () => { if (chartInstance.current) chartInstance.current.destroy(); };
  }, [expenses, loading]);

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const res = await budgetAPI.getExpenses(event.id);
      setExpenses(res.data.expenses || []);
    } catch (err) {
      console.error('Failed to fetch expenses:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!form.item || !form.amount) return;
    setError('');
    setAdding(true);
    try {
      await budgetAPI.addExpense({
        event_id: event.id,
        item: form.item,
        amount: parseFloat(form.amount),
        category: form.category,
      });
      setForm({ item: '', amount: '', category: 'equipment' });
      setShowForm(false);
      fetchExpenses();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add expense.');
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await budgetAPI.deleteExpense(id);
      fetchExpenses();
    } catch (err) {
      console.error('Failed to delete expense:', err);
    }
  };

  const renderChart = () => {
    if (!chartRef.current || expenses.length === 0) return;

    // Dynamically import Chart.js
    import('chart.js/auto').then(({ default: Chart }) => {
      if (chartInstance.current) chartInstance.current.destroy();

      const byCategory = {};
      expenses.forEach(exp => {
        const cat = exp.category || 'other';
        byCategory[cat] = (byCategory[cat] || 0) + parseFloat(exp.amount);
      });

      const labels = Object.keys(byCategory);
      const data = Object.values(byCategory);
      const colors = labels.map(l => CATEGORY_COLORS[l] || CATEGORY_COLORS.other);

      chartInstance.current = new Chart(chartRef.current, {
        type: 'doughnut',
        data: {
          labels: labels.map(l => `${CATEGORY_ICONS[l]} ${l.charAt(0).toUpperCase() + l.slice(1)}`),
          datasets: [{
            data,
            backgroundColor: colors.map(c => c + 'cc'),
            borderColor: colors,
            borderWidth: 2,
            hoverOffset: 8,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          cutout: '65%',
          plugins: {
            legend: {
              position: 'bottom',
              labels: {
                color: 'rgba(255,255,255,0.5)',
                font: { family: 'Plus Jakarta Sans', size: 11, weight: '600' },
                padding: 12,
                usePointStyle: true,
                pointStyleWidth: 8,
              },
            },
            tooltip: {
              backgroundColor: '#0d0f1e',
              borderColor: 'rgba(255,255,255,0.1)',
              borderWidth: 1,
              titleColor: 'white',
              bodyColor: 'rgba(255,255,255,0.6)',
              padding: 12,
              callbacks: {
                label: (ctx) => ` ₹${ctx.parsed.toLocaleString('en-IN')}`,
              },
            },
          },
        },
      });
    });
  };

  const totalBudget = parseFloat(event?.budget) || 0;
  const totalSpent = expenses.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
  const remaining = totalBudget - totalSpent;
  const spentPercent = totalBudget > 0 ? Math.min(100, Math.round((totalSpent / totalBudget) * 100)) : 0;
  const isWarning = spentPercent >= 80;
  const isOver = spentPercent >= 100;

  const byCategory = {};
  expenses.forEach(exp => {
    const cat = exp.category || 'other';
    byCategory[cat] = (byCategory[cat] || 0) + parseFloat(exp.amount);
  });

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap');
        * { box-sizing: border-box; }

        .bt-root {
          font-family: 'Plus Jakarta Sans', sans-serif;
          color: white;
        }

        /* SUMMARY CARDS */
        .bt-summary {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
          margin-bottom: 20px;
        }

        .bt-card {
          border-radius: 16px;
          padding: 18px;
          position: relative;
          overflow: hidden;
          transition: all 0.3s ease;
        }

        .bt-card:hover { transform: translateY(-2px); }

        .bt-card-icon {
          font-size: 20px;
          margin-bottom: 12px;
          display: block;
        }

        .bt-card-value {
          font-size: 22px;
          font-weight: 800;
          letter-spacing: -1px;
          display: block;
          margin-bottom: 4px;
        }

        .bt-card-label {
          font-size: 11px;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          opacity: 0.6;
        }

        /* WARNING BANNER */
        .bt-warning {
          border-radius: 14px;
          padding: 14px 18px;
          margin-bottom: 20px;
          display: flex;
          align-items: center;
          gap: 12px;
          animation: btWarningPulse 2s ease-in-out infinite;
        }

        @keyframes btWarningPulse {
          0%,100% { opacity:1; }
          50% { opacity:0.8; }
        }

        .bt-warning-icon { font-size: 20px; flex-shrink: 0; }
        .bt-warning-title { font-size: 13px; font-weight: 700; margin-bottom: 2px; }
        .bt-warning-sub { font-size: 12px; opacity: 0.7; }

        /* PROGRESS */
        .bt-progress {
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 16px;
          padding: 20px;
          margin-bottom: 20px;
        }

        .bt-progress-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }

        .bt-progress-label {
          font-size: 13px;
          font-weight: 600;
          color: rgba(255,255,255,0.5);
        }

        .bt-progress-pct {
          font-size: 22px;
          font-weight: 800;
          letter-spacing: -1px;
        }

        .bt-bar-bg {
          height: 8px;
          background: rgba(255,255,255,0.06);
          border-radius: 100px;
          overflow: hidden;
          margin-bottom: 10px;
        }

        .bt-bar-fill {
          height: 100%;
          border-radius: 100px;
          transition: width 1s cubic-bezier(0.16,1,0.3,1);
          position: relative;
          overflow: hidden;
        }

        .bt-bar-fill::after {
          content: '';
          position: absolute;
          top: 0; left: -100%;
          width: 60%; height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
          animation: btShimmer 2s infinite;
        }

        @keyframes btShimmer { to { left: 200%; } }

        .bt-progress-labels {
          display: flex;
          justify-content: space-between;
          font-size: 12px;
          color: rgba(255,255,255,0.3);
        }

        /* MAIN GRID */
        .bt-grid {
          display: grid;
          grid-template-columns: 1fr 280px;
          gap: 16px;
          margin-bottom: 20px;
        }

        /* SECTION */
        .bt-section {
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 18px;
          overflow: hidden;
        }

        .bt-section-header {
          padding: 16px 20px;
          border-bottom: 1px solid rgba(255,255,255,0.05);
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .bt-section-title {
          font-size: 14px;
          font-weight: 700;
          color: white;
          letter-spacing: -0.3px;
        }

        .bt-section-sub {
          font-size: 11px;
          color: rgba(255,255,255,0.3);
          margin-top: 2px;
        }

        .bt-add-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 7px 14px;
          background: linear-gradient(135deg, #6366f1, #4f46e5);
          border: none;
          border-radius: 9px;
          color: white;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          font-family: 'Plus Jakarta Sans', sans-serif;
          transition: all 0.25s ease;
          box-shadow: 0 3px 12px rgba(99,102,241,0.3);
        }

        .bt-add-btn:hover { transform: translateY(-1px); box-shadow: 0 5px 16px rgba(99,102,241,0.4); }

        /* ADD FORM */
        .bt-form {
          padding: 16px 20px;
          border-bottom: 1px solid rgba(255,255,255,0.05);
          background: rgba(99,102,241,0.04);
          animation: btSlide 0.3s cubic-bezier(0.16,1,0.3,1);
        }

        @keyframes btSlide {
          from { opacity:0; transform: translateY(-10px); }
          to { opacity:1; transform: translateY(0); }
        }

        .bt-form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          margin-bottom: 10px;
        }

        .bt-field { margin-bottom: 0; }

        .bt-label {
          display: block;
          font-size: 10px;
          font-weight: 600;
          color: rgba(255,255,255,0.3);
          text-transform: uppercase;
          letter-spacing: 0.8px;
          margin-bottom: 6px;
        }

        .bt-input {
          width: 100%;
          background: rgba(255,255,255,0.04);
          border: 1.5px solid rgba(255,255,255,0.07);
          border-radius: 10px;
          padding: 10px 12px;
          font-size: 13px;
          color: white;
          font-family: 'Plus Jakarta Sans', sans-serif;
          outline: none;
          transition: all 0.2s ease;
        }

        .bt-input::placeholder { color: rgba(255,255,255,0.15); }
        .bt-input:focus {
          border-color: rgba(99,102,241,0.5);
          background: rgba(99,102,241,0.06);
          box-shadow: 0 0 0 3px rgba(99,102,241,0.08);
        }

        .bt-select {
          width: 100%;
          background: rgba(255,255,255,0.04);
          border: 1.5px solid rgba(255,255,255,0.07);
          border-radius: 10px;
          padding: 10px 12px;
          font-size: 13px;
          color: white;
          font-family: 'Plus Jakarta Sans', sans-serif;
          outline: none;
          cursor: pointer;
          appearance: none;
        }

        .bt-select option { background: #0d0f1e; }

        .bt-form-btns {
          display: flex;
          gap: 8px;
          margin-top: 12px;
        }

        .bt-submit {
          flex: 1;
          height: 38px;
          background: linear-gradient(135deg, #6366f1, #4f46e5);
          border: none;
          border-radius: 10px;
          color: white;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          font-family: 'Plus Jakarta Sans', sans-serif;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          box-shadow: 0 3px 12px rgba(99,102,241,0.3);
        }

        .bt-submit:hover:not(:disabled) { transform: translateY(-1px); }
        .bt-submit:disabled { opacity: 0.5; cursor: not-allowed; }

        .bt-cancel {
          height: 38px;
          padding: 0 14px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 10px;
          color: rgba(255,255,255,0.4);
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          font-family: 'Plus Jakarta Sans', sans-serif;
          transition: all 0.2s ease;
        }

        .bt-cancel:hover { background: rgba(255,255,255,0.07); color: white; }

        .bt-form-error {
          background: rgba(239,68,68,0.08);
          border: 1px solid rgba(239,68,68,0.2);
          border-radius: 8px;
          padding: 8px 12px;
          font-size: 12px;
          color: #fca5a5;
          margin-bottom: 10px;
        }

        /* EXPENSE ROW */
        .bt-expense-row {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 13px 20px;
          border-bottom: 1px solid rgba(255,255,255,0.03);
          transition: background 0.2s ease;
        }

        .bt-expense-row:last-child { border-bottom: none; }
        .bt-expense-row:hover { background: rgba(255,255,255,0.02); }

        .bt-expense-icon {
          width: 36px; height: 36px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 15px;
          flex-shrink: 0;
        }

        .bt-expense-name {
          font-size: 13px;
          font-weight: 600;
          color: white;
          flex: 1;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .bt-expense-cat {
          font-size: 10px;
          color: rgba(255,255,255,0.3);
          margin-top: 2px;
          text-transform: capitalize;
        }

        .bt-expense-amount {
          font-size: 14px;
          font-weight: 700;
          color: white;
          flex-shrink: 0;
        }

        .bt-delete-btn {
          width: 28px; height: 28px;
          border-radius: 7px;
          background: rgba(239,68,68,0.08);
          border: 1px solid rgba(239,68,68,0.15);
          color: rgba(239,68,68,0.5);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          transition: all 0.2s ease;
          flex-shrink: 0;
        }

        .bt-delete-btn:hover {
          background: rgba(239,68,68,0.15);
          border-color: rgba(239,68,68,0.3);
          color: #f87171;
        }

        .bt-empty {
          padding: 32px 20px;
          text-align: center;
          color: rgba(255,255,255,0.2);
          font-size: 13px;
        }

        .bt-empty-icon { font-size: 32px; display: block; margin-bottom: 8px; opacity: 0.4; }

        /* CHART */
        .bt-chart-wrap {
          padding: 20px;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .bt-chart-canvas-wrap {
          position: relative;
          width: 100%;
          max-width: 220px;
          margin-bottom: 8px;
        }

        .bt-chart-center {
          position: absolute;
          top: 50%; left: 50%;
          transform: translate(-50%, -60%);
          text-align: center;
          pointer-events: none;
        }

        .bt-chart-center-val {
          font-size: 18px;
          font-weight: 800;
          color: white;
          letter-spacing: -0.5px;
          display: block;
        }

        .bt-chart-center-label {
          font-size: 10px;
          color: rgba(255,255,255,0.3);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        /* CATEGORY LEGEND */
        .bt-cat-list {
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-top: 12px;
        }

        .bt-cat-row {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .bt-cat-dot {
          width: 8px; height: 8px;
          border-radius: 50%;
          flex-shrink: 0;
        }

        .bt-cat-name {
          font-size: 12px;
          color: rgba(255,255,255,0.5);
          flex: 1;
          text-transform: capitalize;
        }

        .bt-cat-val {
          font-size: 12px;
          font-weight: 700;
          color: white;
        }

        /* LOADING */
        .bt-spinner {
          width: 20px; height: 20px;
          border: 2px solid rgba(99,102,241,0.2);
          border-top-color: #6366f1;
          border-radius: 50%;
          animation: btSpin 0.8s linear infinite;
          margin: 24px auto;
          display: block;
        }

        @keyframes btSpin { to { transform: rotate(360deg); } }

        @media (max-width: 700px) {
          .bt-summary { grid-template-columns: 1fr 1fr; }
          .bt-grid { grid-template-columns: 1fr; }
          .bt-form-row { grid-template-columns: 1fr; }
        }
      `}</style>

      <div className="bt-root">

        {/* SUMMARY CARDS */}
        <div className="bt-summary">
          {[
            {
              icon: '💰', label: 'Total Budget',
              value: `₹${totalBudget.toLocaleString('en-IN')}`,
              color: '#6366f1', bg: 'rgba(99,102,241,0.08)',
              border: 'rgba(99,102,241,0.15)'
            },
            {
              icon: '💸', label: 'Amount Spent',
              value: `₹${totalSpent.toLocaleString('en-IN')}`,
              color: isOver ? '#ef4444' : isWarning ? '#f59e0b' : '#22c55e',
              bg: isOver ? 'rgba(239,68,68,0.08)' : isWarning ? 'rgba(245,158,11,0.08)' : 'rgba(34,197,94,0.08)',
              border: isOver ? 'rgba(239,68,68,0.15)' : isWarning ? 'rgba(245,158,11,0.15)' : 'rgba(34,197,94,0.15)'
            },
            {
              icon: remaining >= 0 ? '✅' : '⚠️',
              label: remaining >= 0 ? 'Remaining' : 'Over Budget',
              value: `₹${Math.abs(remaining).toLocaleString('en-IN')}`,
              color: remaining >= 0 ? '#06b6d4' : '#ef4444',
              bg: remaining >= 0 ? 'rgba(6,182,212,0.08)' : 'rgba(239,68,68,0.08)',
              border: remaining >= 0 ? 'rgba(6,182,212,0.15)' : 'rgba(239,68,68,0.15)'
            },
          ].map(c => (
            <div key={c.label} className="bt-card" style={{ background: c.bg, border: `1px solid ${c.border}` }}>
              <span className="bt-card-icon">{c.icon}</span>
              <span className="bt-card-value" style={{ color: c.color }}>{c.value}</span>
              <span className="bt-card-label" style={{ color: c.color }}>{c.label}</span>
            </div>
          ))}
        </div>

        {/* WARNING BANNER */}
        {isOver && (
          <div className="bt-warning" style={{
            background: 'rgba(239,68,68,0.08)',
            border: '1px solid rgba(239,68,68,0.25)',
            color: '#fca5a5'
          }}>
            <span className="bt-warning-icon">🚨</span>
            <div>
              <div className="bt-warning-title">Over Budget!</div>
              <div className="bt-warning-sub">You've exceeded the budget by ₹{Math.abs(remaining).toLocaleString('en-IN')}</div>
            </div>
          </div>
        )}

        {!isOver && isWarning && (
          <div className="bt-warning" style={{
            background: 'rgba(245,158,11,0.08)',
            border: '1px solid rgba(245,158,11,0.25)',
            color: '#fcd34d'
          }}>
            <span className="bt-warning-icon">⚠️</span>
            <div>
              <div className="bt-warning-title">Budget Warning!</div>
              <div className="bt-warning-sub">{spentPercent}% of budget used — only ₹{remaining.toLocaleString('en-IN')} remaining</div>
            </div>
          </div>
        )}

        {/* PROGRESS BAR */}
        <div className="bt-progress">
          <div className="bt-progress-header">
            <span className="bt-progress-label">Budget Utilization</span>
            <span className="bt-progress-pct" style={{
              color: isOver ? '#ef4444' : isWarning ? '#f59e0b' : '#22c55e'
            }}>
              {spentPercent}%
            </span>
          </div>
          <div className="bt-bar-bg">
            <div className="bt-bar-fill" style={{
              width: `${spentPercent}%`,
              background: isOver
                ? 'linear-gradient(90deg, #ef4444, #dc2626)'
                : isWarning
                ? 'linear-gradient(90deg, #f59e0b, #d97706)'
                : 'linear-gradient(90deg, #22c55e, #16a34a)',
            }} />
          </div>
          <div className="bt-progress-labels">
            <span>₹{totalSpent.toLocaleString('en-IN')} spent</span>
            <span>₹{totalBudget.toLocaleString('en-IN')} total</span>
          </div>
        </div>

        {/* MAIN GRID */}
        <div className="bt-grid">

          {/* EXPENSES LIST */}
          <div className="bt-section">
            <div className="bt-section-header">
              <div>
                <div className="bt-section-title">Expenses</div>
                <div className="bt-section-sub">{expenses.length} items · ₹{totalSpent.toLocaleString('en-IN')} total</div>
              </div>
              <button className="bt-add-btn" onClick={() => setShowForm(!showForm)}>
                {showForm ? '✕ Cancel' : '+ Add Expense'}
              </button>
            </div>

            {/* ADD FORM */}
            {showForm && (
              <div className="bt-form">
                {error && <div className="bt-form-error">⚠️ {error}</div>}
                <form onSubmit={handleAdd}>
                  <div className="bt-form-row">
                    <div className="bt-field">
                      <label className="bt-label">Item Name *</label>
                      <input
                        className="bt-input"
                        type="text"
                        value={form.item}
                        onChange={e => setForm({...form, item: e.target.value})}
                        placeholder="e.g. Sound System"
                        required
                      />
                    </div>
                    <div className="bt-field">
                      <label className="bt-label">Amount (₹) *</label>
                      <input
                        className="bt-input"
                        type="number"
                        value={form.amount}
                        onChange={e => setForm({...form, amount: e.target.value})}
                        placeholder="5000"
                        required
                        min="1"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="bt-label">Category</label>
                    <select
                      className="bt-select"
                      value={form.category}
                      onChange={e => setForm({...form, category: e.target.value})}
                    >
                      {CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>
                          {CATEGORY_ICONS[cat]} {cat.charAt(0).toUpperCase() + cat.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="bt-form-btns">
                    <button type="submit" className="bt-submit" disabled={adding}>
                      {adding ? '⏳ Adding...' : '✅ Add Expense'}
                    </button>
                    <button type="button" className="bt-cancel" onClick={() => setShowForm(false)}>
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* EXPENSE LIST */}
            {loading ? (
              <div className="bt-spinner" />
            ) : expenses.length === 0 ? (
              <div className="bt-empty">
                <span className="bt-empty-icon">💸</span>
                No expenses added yet
              </div>
            ) : (
              <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                {expenses.map(exp => {
                  const cat = exp.category || 'other';
                  const color = CATEGORY_COLORS[cat];
                  return (
                    <div key={exp.id} className="bt-expense-row">
                      <div className="bt-expense-icon" style={{
                        background: `${color}22`,
                        border: `1px solid ${color}44`
                      }}>
                        {CATEGORY_ICONS[cat]}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="bt-expense-name">{exp.item}</div>
                        <div className="bt-expense-cat">{cat}</div>
                      </div>
                      <div className="bt-expense-amount">
                        ₹{parseFloat(exp.amount).toLocaleString('en-IN')}
                      </div>
                      <button className="bt-delete-btn" onClick={() => handleDelete(exp.id)}>
                        🗑
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* CHART */}
          <div className="bt-section">
            <div className="bt-section-header">
              <div>
                <div className="bt-section-title">By Category</div>
                <div className="bt-section-sub">Spending breakdown</div>
              </div>
            </div>
            <div className="bt-chart-wrap">
              {expenses.length === 0 ? (
                <div className="bt-empty">
                  <span className="bt-empty-icon">📊</span>
                  Add expenses to see chart
                </div>
              ) : (
                <>
                  <div className="bt-chart-canvas-wrap">
                    <canvas ref={chartRef} />
                    <div className="bt-chart-center">
                      <span className="bt-chart-center-val">
                        ₹{(totalSpent / 1000).toFixed(1)}k
                      </span>
                      <span className="bt-chart-center-label">Total</span>
                    </div>
                  </div>

                  <div className="bt-cat-list">
                    {Object.entries(byCategory).map(([cat, amount]) => (
                      <div key={cat} className="bt-cat-row">
                        <div className="bt-cat-dot" style={{ background: CATEGORY_COLORS[cat] }} />
                        <span className="bt-cat-name">{CATEGORY_ICONS[cat]} {cat}</span>
                        <span className="bt-cat-val">₹{amount.toLocaleString('en-IN')}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default BudgetTracker;