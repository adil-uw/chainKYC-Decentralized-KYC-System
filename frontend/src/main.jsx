import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import ErrorBoundary from './components/ErrorBoundary';
import App from './App';
import './index.css';

const rootEl = document.getElementById('root');
if (!rootEl) {
  document.body.innerHTML = '<div style="padding:2rem;background:#0a0e17;color:#ef4444;">#root not found</div>';
  throw new Error('#root not found');
}

// Keep root visible (dark bg) even before React paints
rootEl.style.minHeight = '100vh';
rootEl.style.backgroundColor = '#0a0e17';
rootEl.style.color = '#e2e8f0';

try {
  const root = ReactDOM.createRoot(rootEl);
  root.render(
    <React.StrictMode>
      <ErrorBoundary>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </ErrorBoundary>
    </React.StrictMode>
  );
} catch (err) {
  console.error('ChainKYC bootstrap error:', err);
  rootEl.innerHTML = [
    '<div style="padding:2rem;background:#0a0e17;color:#e2e8f0;font-family:system-ui;min-height:100vh;">',
    '<h1 style="color:#ef4444;">Failed to load</h1>',
    '<pre style="background:#1e293b;padding:1rem;border-radius:8px;overflow:auto;color:#e2e8f0;">',
    (err?.message || String(err)).replace(/</g, '&lt;'),
    '</pre>',
    '</div>'
  ].join('');
}
