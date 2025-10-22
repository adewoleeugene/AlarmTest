
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { Workbox } from 'workbox-window';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

// Register service worker
if ('serviceWorker' in navigator) {
  const wb = new Workbox('/sw.js');
  
  wb.addEventListener('controlling', () => {
    // Service worker is controlling the page
    console.log('Service worker is now controlling the page');
  });
  
  wb.addEventListener('waiting', () => {
    // New service worker is waiting
    console.log('New service worker is waiting');
    
    // Show update notification to user
    if (confirm('A new version of the app is available. Would you like to update?')) {
      wb.messageSkipWaiting();
    }
  });
  
  wb.addEventListener('activated', (event) => {
    if (!event.isUpdate) {
      // First time activation
      console.log('Service worker activated for the first time');
    } else {
      // Update activation
      console.log('Service worker updated and activated');
      // Reload the page to use the new service worker
      window.location.reload();
    }
  });
  
  wb.register().catch((error) => {
    console.error('Service worker registration failed:', error);
  });
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
