import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import {registerServiceWorker} from './utils/pwa';

createRoot(document.getElementById('root')!).render(<App />);

// Register the service worker in production builds only (avoids stale caches during development).
if (import.meta.env.PROD) {
  window.addEventListener('load', () => {
    void registerServiceWorker();
  });
}
