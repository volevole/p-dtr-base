// src/config/api.js

// Определяем, нужно ли использовать удаленный сервер
const useRemoteServer = process.env.REACT_APP_USE_REMOTE_SERVER === 'true';

// Базовый URL в зависимости от окружения и настройки
let baseURL;

if (process.env.NODE_ENV === 'production') {
  // Продакшен — всегда удаленный сервер
  baseURL = 'https://p-dtr-base.onrender.com';
} else {
  // Разработка — смотрим на REACT_APP_USE_REMOTE_SERVER
  if (useRemoteServer) {
    baseURL = 'https://p-dtr-base.onrender.com';
  } else {
    baseURL = 'http://localhost:3001';
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
  YANDEX_DISK_MODE: process.env.REACT_APP_YANDEX_DISK_MODE || 'legacy',
  
  // Размер превью для embed-режима: S, M, L, XL, XXL
  YANDEX_PREVIEW_SIZE: process.env.REACT_APP_YANDEX_PREVIEW_SIZE || 'M',
};

if (typeof window !== 'undefined') {
  window.YANDEX_DISK_MODE = config.YANDEX_DISK_MODE;
  window.YANDEX_PREVIEW_SIZE = config.YANDEX_PREVIEW_SIZE;
}

console.log(`[API Config] NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`[API Config] REACT_APP_USE_REMOTE_SERVER: ${useRemoteServer}`);
console.log(`[API Config] API_URL: ${API_URL}`);
console.log(`[API Config] YANDEX_DISK_MODE: ${config.YANDEX_DISK_MODE}`);
console.log(`[API Config] YANDEX_PREVIEW_SIZE: ${config.YANDEX_PREVIEW_SIZE}`);

// Экспортируем и строку (для обратной совместимости), и объект (для новых настроек)
export default API_URL;
export { config };