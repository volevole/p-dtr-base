// utils/environmentInfo.js
import API_URL from '../config/api';
console.log('API_URL imported from Config:', API_URL); // или проверьте путь



/**
 * Получение информации о текущем окружении приложения
 * @returns {Object} Объект с информацией об окружении
 */
export const getEnvironmentInfo = () => {
  // Определяем, фронтенд это или сервер
  const isClientSide = typeof window !== 'undefined';
  
  // Получаем текущий URL
  const currentUrl = isClientSide ? window.location.href : '';
  
  // Получаем базовый URL API
  const apiUrl = API_URL || 'Не настроен';
  
  // Получаем информацию о браузере (только на клиенте)
  const browserInfo = isClientSide ? {
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    language: navigator.language,
    screenResolution: `${window.screen.width}x${window.screen.height}`,
    viewport: `${window.innerWidth}x${window.innerHeight}`
  } : null;
  
  // Информация о приложении
  const appInfo = {
    environment: process.env.NODE_ENV || 'development',
    isProduction: process.env.NODE_ENV === 'production',
    isDevelopment: process.env.NODE_ENV === 'development',
    version: process.env.REACT_APP_VERSION || '1.0.0',
    buildDate: process.env.REACT_APP_BUILD_DATE || new Date().toISOString()
  };
  
  // Информация о сервере (на основе API_URL)
  const serverInfo = {
    apiUrl: apiUrl,
    protocol: apiUrl.startsWith('https') ? 'HTTPS' : 'HTTP',
    hostname: apiUrl ? new URL(apiUrl).hostname : 'Неизвестно',
    port: apiUrl ? new URL(apiUrl).port || (apiUrl.startsWith('https') ? 443 : 80) : null
  };
  
  return {
    // Основная информация
    isClientSide,
    currentUrl,
    timestamp: new Date().toISOString(),
    
    // Информация о приложении
    app: appInfo,
    
    // Информация о сервере
    server: serverInfo,
    
    // Информация о клиенте (только если на клиенте)
    client: isClientSide ? browserInfo : null,
    
    // Дополнительная информация
    meta: {
      reactVersion: process.env.REACT_APP_REACT_VERSION || '17+',
      nodeEnv: process.env.NODE_ENV,
      isSSR: !isClientSide,
      localStorageAvailable: isClientSide && typeof localStorage !== 'undefined'
    }
  };
};

/**
 * Получение информации в формате для отображения
 * @returns {Object} Форматированная информация
 */
export const getDisplayEnvironmentInfo = () => {
  const info = getEnvironmentInfo();
  
  return {
    // Основное
    'Текущий URL': info.currentUrl || 'Серверная сторона',
    'Окружение': info.app.environment,
    'Версия приложения': info.app.version,
    
    // Сервер
    'API URL': info.server.apiUrl,
    'Хост сервера': info.server.hostname,
    'Протокол': info.server.protocol,
    
    // Клиент (если доступно)
    ...(info.client ? {
      'Разрешение экрана': info.client.screenResolution,
      'Размер окна': info.client.viewport,
      'Платформа': info.client.platform,
      'Язык': info.client.language
    } : {}),
    
    // Meta
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
      // Fallback для старых браузеров
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