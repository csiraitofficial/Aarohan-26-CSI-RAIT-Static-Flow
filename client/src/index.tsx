import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Global base styles - Injected once at the root
const injectGlobalStyles = () => {
  if (typeof document !== 'undefined') {
    const style = document.createElement('style');
    style.innerHTML = `
      @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

      *, *::before, *::after { 
        margin: 0; 
        padding: 0; 
        box-sizing: border-box; 
      }
      
      body {
        background: #04050a;
        color: white;
        font-family: 'Plus Jakarta Sans', sans-serif;
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
        overflow-x: hidden;
      }

      /* Custom Scrollbar */
      ::-webkit-scrollbar { width: 6px; height: 6px; }
      ::-webkit-scrollbar-track { background: rgba(255,255,255,0.03); }
      ::-webkit-scrollbar-thumb { 
        background: rgba(255,255,255,0.1); 
        border-radius: 100px; 
      }
      ::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }

      ::selection { background: rgba(99,102,241,0.3); color: white; }

      input[type="date"]::-webkit-calendar-picker-indicator { 
        filter: invert(1); 
        opacity: 0.4; 
        cursor: pointer; 
      }

      button, a, input, select, textarea { font-family: inherit; }
      a { text-decoration: none; color: inherit; }
      button { cursor: pointer; border: none; background: none; color: inherit; }
      
      /* Smooth transitions for glass cards */
      .glass-card {
        transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.3s ease;
      }
    `;
    document.head.appendChild(style);
  }
};

injectGlobalStyles();

// Ensure root element exists before rendering
const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error("Failed to find the root element. Ensure index.html has <div id='root'></div>");
}

const root = ReactDOM.createRoot(rootElement as HTMLElement);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);