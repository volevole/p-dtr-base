// utils/environmentInfo.js
import API_URL from '../config/api';
import { CURRENT_VERSION } from '../config/versions';

/**
 * Получение информации о текущем окружении приложения
 * @returns {Object} Объект с информацией об окружении
 */
export const getEnvironmentInfo = () => {
  const isClientSide = typeof window !== 'undefined';
  const currentUrl = isClientSide ? window.location.href : '';
  const apiUrl = API_URL && API_URL.trim() !== '' 
  ? API_URL 
  : '(относительные запросы — same-origin)';
  
  const browserInfo = isClientSide ? {
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    language: navigator.language,
    screenResolution: `${window.screen.width}x${window.screen.height}`,
    viewport: `${window.innerWidth}x${window.innerHeight}`
  } : null;
  
  const appInfo = {
    environment: process.env.NODE_ENV || 'development',
    isProduction: process.env.NODE_ENV === 'production',
    isDevelopment: process.env.NODE_ENV === 'development',
    version: CURRENT_VERSION.version, // 👈 Берем из файла версий
    buildDate: CURRENT_VERSION.date // 👈 Теперь время берется прямо из файла версий
  };
  
  const serverInfo = {
    apiUrl: apiUrl,
    protocol: (apiUrl && typeof apiUrl === 'string' && apiUrl.startsWith('https')) ? 'HTTPS' : 
              (apiUrl && typeof apiUrl === 'string' && apiUrl.startsWith('http')) ? 'HTTP' : 
              'same-origin (HTTPS)',
    hostname: (apiUrl && typeof apiUrl === 'string' && apiUrl.startsWith('http')) 
      ? new URL(apiUrl).hostname 
      : window.location.hostname,   // ← текущий домен
    port: (apiUrl && typeof apiUrl === 'string' && apiUrl.startsWith('http')) 
      ? new URL(apiUrl).port || (apiUrl.startsWith('https') ? 443 : 80) 
      : (window.location.protocol === 'https:' ? 443 : 80)
  };
  
  return {
    isClientSide,
    currentUrl,
    timestamp: new Date().toISOString(),
    app: appInfo,
    server: serverInfo,
    client: isClientSide ? browserInfo : null,
    meta: {
      reactVersion: process.env.REACT_APP_REACT_VERSION || '17+',
      nodeEnv: process.env.NODE_ENV,
      isSSR: !isClientSide,
      localStorageAvailable: isClientSide && typeof localStorage !== 'undefined'
    }
  };
};

/**
 * Получение информации о БД с бэкенда
 * @returns {Promise<Object>}
 */
export const getDatabaseInfo = async () => {
  try {
    const response = await fetch(`${API_URL}/api/db-info`);
    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Ошибка получения информации о БД:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Получение информации в формате для отображения
 */
export const getDisplayEnvironmentInfo = () => {
  const info = getEnvironmentInfo();
  
  // 👈 Проверяем наличие Contact Picker API
  const hasContactPicker = typeof navigator !== 'undefined' && 'contacts' in navigator && 'ContactsManager' in window;

  return {
    'Текущий URL': info.currentUrl || 'Серверная сторона',
    'Окружение': info.app.environment,
    'Версия приложения': info.app.version,
    'API URL': info.server.apiUrl,
    'Хост сервера': info.server.hostname,
    'Протокол': info.server.protocol,
    ...(info.client ? {
      'Разрешение экрана': info.client.screenResolution,
      'Размер окна': info.client.viewport,
      'Платформа': info.client.platform,
      'Язык': info.client.language,
      'API контактов (Android)': hasContactPicker ? '✅ Доступен' : '❌ Недоступен' // 👈 Добавили проверку
    } : {}),
    'Сборка от': new Date(info.app.buildDate).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
    'Текущее время': new Date(info.timestamp).toLocaleString('ru-RU'),
    'React версия': info.meta.reactVersion,
    'Node окружение': info.meta.nodeEnv,
    'Доступен localStorage': info.meta.localStorageAvailable ? 'Да' : 'Нет'
  };
};

/**
 * Копирование информации об окружении в буфер обмена
 */
export const copyEnvironmentInfoToClipboard = async () => {
  try {
    const info = getEnvironmentInfo();
    const text = JSON.stringify(info, null, 2);
    
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    } else {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      return true;
    }
  } catch (error) {
    console.error('Ошибка копирования:', error);
    return false;
  }
};

/**
 * Вывод информации об окружении в консоль
 */
export const logEnvironmentInfo = () => {
  const info = getEnvironmentInfo();
  console.group('Информация об окружении');
  console.log('Основная информация:', {
    isClientSide: info.isClientSide,
    currentUrl: info.currentUrl,
    timestamp: info.timestamp
  });
  console.log('Информация о приложении:', info.app);
  console.log('Информация о сервере:', info.server);
  if (info.client) {
    console.log('Информация о клиенте:', info.client);
  }
  console.log('Дополнительная информация:', info.meta);
  console.groupEnd();
  return info;
};


export default getEnvironmentInfo;