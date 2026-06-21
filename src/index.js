//index.js
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import * as serviceWorkerRegistration from './serviceWorkerRegistration'; // ?? ДОБАВИТЬ

import { BrowserRouter } from 'react-router-dom';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);

// ?? ЗАМЕНИТЬ reportWebVitals() на это:
// Если хотите включить Service Worker (PWA):
serviceWorkerRegistration.register();

// Если хотите оставить как было (без PWA):
// serviceWorkerRegistration.unregister();
// reportWebVitals();

// Если нужны и PWA, и reportWebVitals:
reportWebVitals();