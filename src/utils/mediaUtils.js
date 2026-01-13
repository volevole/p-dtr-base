// utils/mediaUtils.js
/**
 * Общие утилиты для работы с медиа
 */
import API_URL from '../config/api';  // Базовый URL API

// utils/mediaUtils.js
/**
 * Общие утилиты для работы с медиа
 * На основе кода из useMediaManager.js
 */

/**
 * Создает proxy URL для отображения
 * @param {string} publicUrl - публичный URL
 * @returns {string|null} proxy URL
 */
export const createProxyUrl = (publicUrl) => {
  if (!publicUrl) return null;
  return `${API_URL}/api/proxy-image?url=${encodeURIComponent(publicUrl)}`;
};

/**
 * Получает URL превью для медиа
 * @param {Object} mediaItem - объект медиа
 * @returns {string|null} URL превью
 */
export const getThumbnailUrl = (mediaItem) => {
  if (!mediaItem) return null;
  
  // Для изображений: используем file_url как основной источник
  if (mediaItem.file_type === 'image' && mediaItem.file_url) {
    return createProxyUrl(mediaItem.file_url);
  }
  
  // Для остальных типов: пробуем thumbnail_url
  if (mediaItem.thumbnail_url) {
    return createProxyUrl(mediaItem.thumbnail_url);
  }
  
  // Для изображений без file_url: используем public_url
  if (mediaItem.file_type === 'image' && mediaItem.public_url) {
    return createProxyUrl(mediaItem.public_url);
  }
  
  return null;
};

/**
 * Получает иконку для типа файла
 * @param {string} fileType - тип файла
 * @returns {string} эмодзи-иконка
 */
export const getFileIcon = (fileType) => {
  switch(fileType) {
    case 'image': return '🖼️';
    case 'video': return '🎬';
    case 'audio': return '🎵';
    case 'document': return '📄';
    default: return '📁';
  }
};

/**
 * Форматирует размер файла
 * @param {number} bytes - размер в байтах
 * @returns {string} отформатированный размер
 */
export const formatFileSize = (bytes) => {
  if (!bytes) return 'Неизвестно';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Проверяет, просрочено ли превью
 * @param {Object} file - объект файла
 * @returns {boolean} true если превью просрочено
 */
export const isThumbnailExpired = (file) => {
  if (!file.thumbnail_url) return true;
  
  const isYandexTempLink = file.thumbnail_url.includes('downloader.disk.yandex.ru') && 
                          (file.thumbnail_url.includes('tknv=v3') || file.thumbnail_url.includes('&limit='));
  
  const hasErrorPattern = file.thumbnail_url.includes('error') || 
                         file.thumbnail_url.includes('expired') ||
                         file.thumbnail_url.includes('access_denied') ||
                         file.thumbnail_url.includes('<!DOCTYPE');
  
  // Дополнительная проверка на временные параметры
  const urlParams = new URLSearchParams(file.thumbnail_url.split('?')[1]);
  const tknvParam = urlParams.get('tknv');
  const limitParam = urlParams.get('limit');
  
  const hasTemporaryParams = tknvParam || limitParam;
  
  // Проверяем дату обновления thumbnail
  if (file.thumbnail_updated_at) {
    const thumbnailUpdatedAt = new Date(file.thumbnail_updated_at);
    const now = new Date();
    const hoursSinceUpdate = (now - thumbnailUpdatedAt) / (1000 * 60 * 60);
    
    // Если превью обновлялось больше 4 часов назад и есть временные параметры
    if (hoursSinceUpdate > 4 && hasTemporaryParams) {
      return true;
    }
  }
  
  return isYandexTempLink || hasErrorPattern || hasTemporaryParams;
};

/**
 * Проверяет, нуждается ли ссылка в обновлении
 * @param {Object} file - объект файла
 * @returns {boolean} true если ссылка устарела
 */

export const needsLinkRefresh = (file) => {
  if (!file.file_url) return true;
  
  const isYandexTempLink = file.file_url.includes('downloader.disk.yandex.ru') && 
                          (file.file_url.includes('tknv=v3') || file.file_url.includes('&limit='));
  
  const hasErrorPattern = file.file_url.includes('error') || 
                         file.file_url.includes('expired') ||
                         file.file_url.includes('access_denied') ||
                         file.file_url.includes('<!DOCTYPE');
  
  // Дополнительная проверка: ссылка считается устаревшей, если ей больше 4 часов
  // и она содержит временный токен
  const urlParams = new URLSearchParams(file.file_url.split('?')[1]);
  const tknvParam = urlParams.get('tknv');
  const limitParam = urlParams.get('limit');
  
  // Если есть tknv параметр или limit, считаем ссылку временной
  const hasTemporaryParams = tknvParam || limitParam;
  
  // Также проверяем дату обновления файла
  if (file.updated_at) {
    const updatedAt = new Date(file.updated_at);
    const now = new Date();
    const hoursSinceUpdate = (now - updatedAt) / (1000 * 60 * 60);
    
    // Если файл обновлялся больше 4 часов назад и есть временные параметры
    if (hoursSinceUpdate > 4 && hasTemporaryParams) {
      return true;
    }
  }
  
  return isYandexTempLink || hasErrorPattern || hasTemporaryParams;
};

/**
 * Обрабатывает медиафайлы для отображения (добавляет proxyUrl и thumbnailUrl)
 * @param {Array} mediaArray - массив медиафайлов
 * @returns {Array} обработанные медиафайлы
 */
export const processMediaForDisplay = (mediaArray) => {
  if (!Array.isArray(mediaArray)) return [];
  
  return mediaArray.map(item => ({
    ...item,
    proxyUrl: createProxyUrl(item.public_url),
    thumbnailUrl: getThumbnailUrl(item)
  }));
};