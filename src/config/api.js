// src/config/api.js

// Режим API: 'local' (локальный сервер) или 'remote' (удаленный)
// Приоритет: REACT_APP_API_MODE > REACT_APP_USE_REMOTE_SERVER > NODE_ENV
const apiMode = process.env.REACT_APP_API_MODE; // 'local' или 'remote'
const useRemoteServer = process.env.REACT_APP_USE_REMOTE_SERVER === 'true';

// Базовые URL для разных режимов
const URLS = {
  local: 'http://localhost:3001',
  //remote: 'https://p-dtr-base.onrender.com'
  remote: 'http://194.226.165.244:3001'  
};

// Определяем базовый URL
let baseURL;

if (process.env.NODE_ENV === 'production') {
  // Продакшен — всегда удаленный сервер
  baseURL = URLS.remote;
} else {
  // Разработка — приоритет у REACT_APP_API_MODE
  if (apiMode === 'local') {
    baseURL = URLS.local;
  } else if (apiMode === 'remote') {
    baseURL = URLS.remote;
  } else if (useRemoteServer) {
    // Старый способ для обратной совместимости
    baseURL = URLS.remote;
  } else {
    baseURL = URLS.local;
  }
}

const API_URL = baseURL;

// Объект с дополнительными настройками
const config = {
  // Базовый URL для API
  API_URL: API_URL,
  
  // Режим работы с Яндекс.Диском:
  // 'legacy' - старый способ (через прокси и прямые ссылки)
  // 'embed' - встраивание через iframe (без прямых ссылок)
  // 'direct' - прямая ссылка на публичную страницу
  YANDEX_DISK_MODE: process.env.REACT_APP_YANDEX_DISK_MODE || 'embed',  // сменил default на embed
  
  // Размер превью для embed-режима: S, M, L, XL, XXL
  YANDEX_PREVIEW_SIZE: process.env.REACT_APP_YANDEX_PREVIEW_SIZE || 'M',
  
  // Текущий режим API (для отладки)
  API_MODE: apiMode || (useRemoteServer ? 'remote' : 'local'),
  ENVIRONMENT: process.env.NODE_ENV || 'development'
};

if (typeof window !== 'undefined') {
  window.YANDEX_DISK_MODE = config.YANDEX_DISK_MODE;
  window.YANDEX_PREVIEW_SIZE = config.YANDEX_PREVIEW_SIZE;
  window.API_MODE = config.API_MODE;
}

console.log(`[API Config] NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`[API Config] API_MODE: ${config.API_MODE}`);
console.log(`[API Config] API_URL: ${API_URL}`);
console.log(`[API Config] YANDEX_DISK_MODE: ${config.YANDEX_DISK_MODE}`);
console.log(`[API Config] YANDEX_PREVIEW_SIZE: ${config.YANDEX_PREVIEW_SIZE}`);

// Экспортируем и строку (для обратной совместимости), и объект (для новых настроек)
export default API_URL;
export { config };