import React from 'react';
import {createRoot} from 'react-dom/client';
import {RootNavigator} from './navigation/RootNavigator';
import './styles.css';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Elemento root non trovato');
}

createRoot(rootElement).render(
  <React.StrictMode>
    <RootNavigator />
  </React.StrictMode>,
);
