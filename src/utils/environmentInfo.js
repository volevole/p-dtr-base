// utils/environmentInfo.js
import API_URL from '../config/api';

/**
 * Получение информации о текущем окружении приложения
 * @returns {Object} Объект с информацией об окружении
 */
export const getEnvironmentInfo = () => {
  const isClientSide = typeof window !== 'undefined';
  const currentUrl = isClientSide ? window.location.href : '';
  const apiUrl = API_URL || 'Не настроен';
  
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
    version: process.env.REACT_APP_VERSION || '1.0.0',
    buildDate: process.env.REACT_APP_BUILD_DATE || new Date().toISOString()
  };
  
  const serverInfo = {
    apiUrl: apiUrl,
    protocol: (apiUrl && typeof apiUrl === 'string' && apiUrl.startsWith('https')) ? 'HTTPS' : 
              (apiUrl && typeof apiUrl === 'string' && apiUrl.startsWith('http')) ? 'HTTP' : 'Неизвестно',
    hostname: (apiUrl && typeof apiUrl === 'string' && apiUrl.startsWith('http')) 
      ? new URL(apiUrl).hostname 
      : 'Неизвестно',
    port: (apiUrl && typeof apiUrl === 'string' && apiUrl.startsWith('http')) 
      ? new URL(apiUrl).port || (apiUrl.startsWith('https') ? 443 : 80) 
      : null
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
      'Язык': info.client.language
    } : {}),
    'Сборка от': new Date(info.app.buildDate).toLocaleString('ru-RU'),
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