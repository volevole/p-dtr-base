// config.js
export const config = {
//  API_URL: process.env.NODE_ENV === 'production' 
//    ? 'https://p-dtr-base.onrender.com'
//    : process.env.REACT_APP_API_URL || 'https://p-dtr-base.onrender.com'   // 'http://localhost:3001',
  
   API_URL:  'https://p-dtr-base.onrender.com',



  // Определяем, локальный сервер или удаленный
  USE_REMOTE_SERVER: process.env.REACT_APP_USE_REMOTE_SERVER === 'true' || true,
  
  // Информация для отладки
  ENVIRONMENT: process.env.NODE_ENV || 'development',
  FRONTEND_URL: window.location.origin,
  SERVER_TYPE: process.env.REACT_APP_USE_REMOTE_SERVER ? 'remote' : 'local'
};

console.log('=== CONFIG LOADED ===');
console.log('API_URL:', config.API_URL);
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('REACT_APP_API_URL:', process.env.REACT_APP_API_URL);

export default config;