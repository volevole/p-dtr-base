// config.js
export const config = {
//  API_URL: process.env.NODE_ENV === 'production' 
//    ? 'https://p-dtr-base.onrender.com'
//    : process.env.REACT_APP_API_URL || 'https://p-dtr-base.onrender.com'   // 'http://localhost:3001',
  
   API_URL:  'https://p-dtr-base.onrender.com',

  // Определяем, локальный сервер или удаленный
  USE_REMOTE_SERVER: process.env.REACT_APP_USE_REMOTE_SERVER === 'true' || true,
  
  // Режим работы с Яндекс.Диском:
  // 'legacy' - старый способ (через прокси и прямые ссылки)
  // 'embed' - встраивание через iframe (без прямых ссылок)
  // 'direct' - прямая ссылка на публичную страницу
  YANDEX_DISK_MODE: process.env.REACT_APP_YANDEX_DISK_MODE || 'legacy',
  
  // Размер превью для embed-режима: S, M, L, XL, XXL
  YANDEX_PREVIEW_SIZE: process.env.REACT_APP_YANDEX_PREVIEW_SIZE || 'M',
  
  //  для отладки
  ENVIRONMENT: process.env.NODE_ENV || 'development',
  FRONTEND_URL: window.location.origin,
  SERVER_TYPE: process.env.REACT_APP_USE_REMOTE_SERVER ? 'remote' : 'local'
};

console.log('=== CONFIG LOADED ===');
console.log('API_URL:', config.API_URL);
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('REACT_APP_API_URL:', process.env.REACT_APP_API_URL);
console.log('YANDEX_DISK_MODE:', config.YANDEX_DISK_MODE);
console.log('YANDEX_PREVIEW_SIZE:', config.YANDEX_PREVIEW_SIZE);

export default config;