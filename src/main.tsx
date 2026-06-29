import React from 'react';
import ReactDOM from 'react-dom/client';
import {RootNavigator} from './navigation/RootNavigator';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RootNavigator />
  </React.StrictMode>,
);
