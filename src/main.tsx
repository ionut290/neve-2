import React from 'react';
import {createRoot} from 'react-dom/client';
import {App} from './App';
import {AppErrorBoundary} from './components/AppErrorBoundary';
import {registerServiceWorker} from './lib/pwa';
import './styles.css';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Elemento root non trovato');
}

createRoot(rootElement).render(
  <React.StrictMode>
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  </React.StrictMode>,
);

registerServiceWorker();
