// src/index.js
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import * as serviceWorkerRegistration from './serviceWorkerRegistration';
import { AuthProvider } from './context/AuthContext'; // 👈 ДОБАВИЛИ ИМПОРТ

import { BrowserRouter } from 'react-router-dom';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <BrowserRouter basename="/larchik">
      <AuthProvider>        {/* 👈 ОБЕРНУЛИ App В ПРОВАЙДЕР */}
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);

if (process.env.NODE_ENV === 'production') {
  serviceWorkerRegistration.register();
} else {
  serviceWorkerRegistration.unregister();
}

reportWebVitals();