import React from 'react';
import ReactDOM from 'react-dom/client';
import './mocks/google'; // Enable mock google objects for local development
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
