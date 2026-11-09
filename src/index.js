// src/index.js
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import * as serviceWorkerRegistration from './serviceWorkerRegistration';
import { AuthProvider } from './context/AuthContext';
import { BrowserRouter } from 'react-router-dom';

const root = ReactDOM.createRoot(document.getElementById('root'));

// 👈 ПРОВЕРКА: Если это локал и мы в корне (без /larchik), показываем заглушку
const isLocalRoot = process.env.NODE_ENV === 'development' && window.location.pathname === '/';

if (isLocalRoot) {
  root.render(
    <div style={{ padding: '50px', textAlign: 'center', fontFamily: 'sans-serif', backgroundColor: '#f8f9fa', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <h1 style={{ color: '#0056b3', marginBottom: '10px' }}>Ларчик P-DTR</h1>
      <h2 style={{ color: '#6c757d', marginBottom: '20px' }}>Локальная разработка</h2>
      <p style={{ fontSize: '16px', color: '#333', marginBottom: '30px', maxWidth: '400px' }}>
        Вы находитесь на локальном сервере. Основное приложение доступно по адресу с приставкой <strong>/larchik</strong>.
      </p>
      <a href="/larchik" style={{ padding: '12px 24px', backgroundColor: '#007bff', color: 'white', textDecoration: 'none', borderRadius: '6px', fontWeight: 'bold', fontSize: '16px' }}>
        Перейти в приложение
      </a>
    </div>
  );
} else {
  // 👈 НА ПРОДЕ ИЛИ ПО ПРАВИЛЬНОМУ ПУТИ ЗАПУСКАЕМ ОСНОВНОЕ ПРИЛОЖЕНИЕ
  root.render(
    <React.StrictMode>
      <BrowserRouter basename="/larchik">
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </React.StrictMode>
  );
}

if (process.env.NODE_ENV === 'production') {
  serviceWorkerRegistration.register();
} else {
  serviceWorkerRegistration.unregister();
}

reportWebVitals();