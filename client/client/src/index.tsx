import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Global base styles
const style = document.createElement('style');
style.innerHTML = `
  *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
  
  body {
    background: #04050a;
    color: white;
    font-family: 'Plus Jakarta Sans', sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    overflow-x: hidden;
  }

  ::-webkit-scrollbar { width: 6px; height: 6px; }
  ::-webkit-scrollbar-track { background: rgba(255,255,255,0.03); }
  ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 100px; }
  ::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }

  ::selection { background: rgba(99,102,241,0.3); color: white; }

  input[type="date"]::-webkit-calendar-picker-indicator { filter: invert(1); opacity: 0.4; cursor: pointer; }

  * { transition: none; }
  button, a, input, select, textarea { font-family: inherit; }
  a { text-decoration: none; }
  button { cursor: pointer; }
`;
document.head.appendChild(style);

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);