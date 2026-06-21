//index.js
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import * as serviceWorkerRegistration from './serviceWorkerRegistration'; // ?? ƒќЅј¬»“№

import { BrowserRouter } from 'react-router-dom';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);

// ?? «јћ≈Ќ»“№ reportWebVitals() на это:
// ≈сли хотите включить Service Worker (PWA):
//serviceWorkerRegistration.register();

// ≈сли хотите оставить как было (без PWA):
// serviceWorkerRegistration.unregister();
// reportWebVitals();

// ƒл€ разработки Ч отключаем Service Worker
if (process.env.NODE_ENV === 'production') {
  serviceWorkerRegistration.register();
} else {
  serviceWorkerRegistration.unregister();
}


// ≈сли нужны и PWA, и reportWebVitals:
reportWebVitals();