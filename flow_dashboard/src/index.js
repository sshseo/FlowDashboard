import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// PWA Service Worker Registration
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // PWA 환경에서도 작동하도록 절대 경로 사용
    const swUrl = `${window.location.origin}/sw.js`;

    navigator.serviceWorker.register(swUrl, {
      scope: '/'
    })
      .then((registration) => {
        console.log('SW registered: ', registration);
        console.log('SW scope: ', registration.scope);

        // 즉시 활성화
        if (registration.waiting) {
          registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        }
      })
      .catch((registrationError) => {
        console.log('SW registration failed: ', registrationError);
      });
  });
}
