// mediaHelper.js
import { supabase } from './supabaseClient';
import API_URL from '../config/api';

/**
 * Конфигурация поддерживаемых типов файлов
 */
export const ALLOWED_FILE_TYPES = {
  image: {
    extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'],
    mimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'],
    maxSize: 10 * 1024 * 1024, // 10MB
    label: 'Изображения'
  },
  video: {
    extensions: ['mp4', 'webm', 'mov', 'avi', 'mkv'],
    mimeTypes: ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo'],
    maxSize: 100 * 1024 * 1024, // 100MB
    label: 'Видео'
  },
  audio: {
    extensions: ['mp3', 'wav', 'ogg', 'm4a', 'flac'],
    mimeTypes: ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/x-m4a', 'audio/flac'],
    maxSize: 50 * 1024 * 1024, // 50MB
    label: 'Аудио'
  },
  document: {
    extensions: ['pdf', 'doc', 'docx', 'txt', 'md'],
    mimeTypes: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'],
    maxSize: 20 * 1024 * 1024, // 20MB
    label: 'Документы'
  }
};

/**
 * Определяет тип файла по расширению или MIME-типу
 */
export const getFileType = (fileName, mimeType = '') => {
  const extension = fileName.split('.').pop().toLowerCase();
  
  for (const [type, config] of Object.entries(ALLOWED_FILE_TYPES)) {
    if (config.extensions.includes(extension)) {
      return type;
    }
  }
  
  for (const [type, config] of Object.entries(ALLOWED_FILE_TYPES)) {
    if (config.mimeTypes.includes(mimeType.toLowerCase())) {
      return type;
    }
  }
  
  return 'document';
};

/**
 * Валидация файла перед загрузкой
 */
export const validateFile = (file) => {
  const extension = file.name.split('.').pop().toLowerCase();
  const fileType = getFileType(file.name, file.type);
  const config = ALLOWED_FILE_TYPES[fileType];
  
  if (!config) {
    throw new Error(`Unsupported file type: ${extension}`);
  }
  
  if (file.size > config.maxSize) {
    const maxSizeMB = config.maxSize / (1024 * 1024);
    throw new Error(`File too large. Maximum for ${config.label}: ${maxSizeMB}MB`);
  }
  
  return {
    type: fileType,
    extension,
    mimeType: file.type,
    size: file.size
  };
};

/**
 * УНИВЕРСАЛЬНОЕ получение медиафайлов для сущности
 * Использует только новую систему (media_files + entity_media)
 */
export const getMediaForEntity = async (entityType, entityId, relationType = 'primary') => {
  try {
    console.log(`[mediaHelper] Getting media for ${entityType} ${entityId}`);
    
    // Используем новый API эндпоинт для всех сущностей
    const response = await fetch(`${API_URL}/api/media/${entityType}/${entityId}?relation_type=${relationType}`);
    
    if (!response.ok) {
      if (response.status === 404) {
        // Если эндпоинт не существует, пробуем прямое обращение к БД
        console.log(`[mediaHelper] API endpoint not found, trying direct DB access`);
        return await getMediaFromDatabase(entityType, entityId);
      }
      const errorText = await response.text();
      throw new Error(`API error: ${response.status} ${errorText}`);
    }
    
    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Unknown error');
    }
    
    return result.data || [];
    
  } catch (error) {
    console.error('[mediaHelper] Error fetching media:', error.message);
    
    // Fallback к прямому обращению в БД
    try {
      return await getMediaFromDatabase(entityType, entityId);
    } catch (fallbackError) {
      console.error('[mediaHelper] Fallback also failed:', fallbackError.message);
      return [];
    }
  }
};

/**
 * УНИВЕРСАЛЬНАЯ загрузка медиафайла
 * Использует только новый эндпоинт
 */
export const uploadMediaForEntity = async (entityType, entityId, file, description = '') => {
  try {
    console.log(`[mediaHelper] Uploading file for ${entityType} ${entityId}: ${file.name}`);
    
    const fileInfo = validateFile(file);
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('entityType', entityType);
    formData.append('entityId', entityId);
    formData.append('description', description);
    
    const response = await fetch(`${API_URL}/api/media/upload`, {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API error: ${response.status} ${errorText}`);
    }
    
    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Unknown upload error');
    }
    
    // Возвращаем медиа в совместимом формате
    return {
      id: result.media?.id || result.fileName,
      entity_id: entityId,
      entity_type: entityType,
      file_url: result.publicUrl,
      file_name: result.fileName,
      file_type: fileInfo.type,
      thumbnail_url: result.thumbnailUrl,
      public_url: result.publicUrl,
      description: description,
      display_order: 0,
      duration_seconds: result.durationSeconds,
      width: result.width,
      height: result.height,
      file_size: file.size,
      mime_type: file.type
    };
    
  } catch (error) {
    console.error('[mediaHelper] Upload error:', error);
    throw error;
  }
};

/**
 * УНИВЕРСАЛЬНОЕ удаление медиафайла
 */
export const deleteMediaFile = async (entityType, entityId, mediaId) => {
  try {
    console.log(`[mediaHelper] Deleting media ${mediaId} for ${entityType} ${entityId}`);
    
    const response = await fetch(`${API_URL}/api/media/${mediaId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        entityType: entityType,
        entityId: entityId
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API error: ${response.status} ${errorText}`);
    }
    
    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Unknown delete error');
    }
    
    return result;
    
  } catch (error) {
    console.error('[mediaHelper] Delete error:', error);
    throw error;
  }
};

/**
 * УНИВЕРСАЛЬНОЕ обновление метаданных медиафайла
 */
export const updateMediaDescription = async (entityType, entityId, mediaId, description) => {
  try {
    console.log(`[mediaHelper] Updating description for ${mediaId}`);
    
    const response = await fetch(`${API_URL}/api/media/${mediaId}/update-metadata`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        description,
        // Можем добавить и другие поля при необходимости
      }),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Unknown error');
    }
    
    return result;
    
  } catch (error) {
    console.error('[mediaHelper] Update description error:', error);
    throw error;
  }
};

/**
 * УНИВЕРСАЛЬНОЕ обновление порядка медиафайлов
 */
export const updateMediaOrderHelper = async (entityType, entityId, orderedIds) => {
  try {
    console.log(`[mediaHelper] Updating order for ${entityType} ${entityId}: ${orderedIds.length} items`);
    
    const response = await fetch(`${API_URL}/api/media/reorder`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        entityType: entityType,
        entityId: entityId,
        orderedIds: orderedIds
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API error: ${response.status} ${errorText}`);
    }
    
    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Unknown reorder error');
    }
    
    return result;
    
  } catch (error) {
    console.error('[mediaHelper] Update order error:', error);
    throw error;
  }
};

/**
 * Получение всех доступных медиафайлов для связывания
 */
export const getAvailableMediaFiles = async (search = '', fileType = '', limit = 50, excludeEntityType = null, excludeEntityId = null) => {
  try {
    const params = new URLSearchParams({
      search: search,
      file_type: fileType,
      limit: limit
    });
    
    if (excludeEntityType && excludeEntityId) {
      params.append('exclude_entity_type', excludeEntityType);
      params.append('exclude_entity_id', excludeEntityId);
    }
    
    const response = await fetch(`${API_URL}/api/media/files?${params}`);
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Unknown error');
    }
    
    return result.files || [];
    
  } catch (error) {
    console.error('[mediaHelper] Get available media error:', error);
    return [];
  }
};

/**
 * Связывание существующего медиафайла с сущностью
 */
export const linkMediaToEntity = async (mediaFileId, entityType, entityId, relationType = 'primary') => {
  try {
    console.log(`[mediaHelper] Linking media ${mediaFileId} to ${entityType} ${entityId}`);
    
    const response = await fetch(`${API_URL}/api/media/link`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        mediaFileId,
        entityType,
        entityId,
        relationType
      }),
    });
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Unknown link error');
    }
    
    return result.media;
    
  } catch (error) {
    console.error('[mediaHelper] Link media error:', error);
    throw error;
  }
};

/**
 * Обновление превью через Яндекс API
 */
export const updateYandexPreview = async (mediaId, entityType = null, entityId = null) => {
  try {
    const payload = {};
    if (entityType && entityId) {
      payload.entityType = entityType;
      payload.entityId = entityId;
    }
    
    const response = await fetch(`${API_URL}/api/media/${mediaId}/update-yandex-preview`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Unknown preview update error');
    }
    
    return result;
    
  } catch (error) {
    console.error('[mediaHelper] Update preview error:', error);
    throw error;
  }
};

/**
 * Массовое обновление превью
 */
export const updateMultiplePreviews = async (mediaIds, entityType, entityId) => {
  try {
    const response = await fetch(`${API_URL}/api/update-media-previews`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        mediaIds,
        entityType,
        entityId
      }),
    });
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Unknown bulk preview update error');
    }
    
    return result;
    
  } catch (error) {
    console.error('[mediaHelper] Bulk update preview error:', error);
    throw error;
  }
};

/**
 * Обновление ссылок на файлы
 */
export const refreshMediaLinks = async (entityType, entityId, mediaItems = []) => {
  try {
    const response = await fetch(`${API_URL}/api/refresh-links`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        entityType,
        entityId,
        mediaItems
      }),
    });
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Unknown refresh error');
    }
    
    return result;
    
  } catch (error) {
    console.error('[mediaHelper] Refresh links error:', error);
    throw error;
  }
};

/**
 * Получение информации о поддерживаемых типах сущностей
 */
export const getSupportedEntities = async () => {
  try {
    const response = await fetch(`${API_URL}/api/media/supported-entities`);
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Unknown error');
    }
    
    return result.entities || [];
    
  } catch (error) {
    console.error('[mediaHelper] Get supported entities error:', error);
    return [];
  }
};

/**
 * Проверка подключения к API
 */
export const checkMediaApiConnection = async () => {
  try {
    const response = await fetch(`${API_URL}/api/check-token`);
    
    if (response.ok) {
      const result = await response.json();
      return {
        connected: true,
        tokenValid: result.tokenValid || false,
        message: 'API доступен'
      };
    } else {
      return {
        connected: false,
        message: `API недоступен: ${response.status}`
      };
    }
  } catch (error) {
    return {
      connected: false,
      message: `Ошибка подключения: ${error.message}`
    };
  }
};

/**
 * Форматирование размера файла
 */
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Создание proxy URL для отображения медиа
 */
export const createProxyUrl = (publicUrl) => {
  if (!publicUrl) return null;
  return `${API_URL}/api/proxy-image?url=${encodeURIComponent(publicUrl)}`;
};

/**
 * Получение URL превью для медиафайла
 */
export const getThumbnailUrl = (mediaItem) => {
  if (!mediaItem) return null;
  
  if (mediaItem.thumbnail_url) {
    return createProxyUrl(mediaItem.thumbnail_url);
  }
  
  if (mediaItem.file_type === 'image' && mediaItem.public_url) {
    return createProxyUrl(mediaItem.public_url);
  }
  
  return null;
};

/**
 * Добавление proxy URL к медиафайлам для отображения
 */
export const processMediaForDisplay = (mediaArray) => {
  if (!Array.isArray(mediaArray)) return [];
  
  return mediaArray.map(item => ({
    ...item,
    proxyUrl: createProxyUrl(item.public_url),
    thumbnailUrl: getThumbnailUrl(item)
  }));
};

/**
 * Получение иконки для типа файла
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
 * Получение информации о поддерживаемых форматах
 */
export const getSupportedFormatsInfo = () => {
  const formats = [];
  
  for (const [type, config] of Object.entries(ALLOWED_FILE_TYPES)) {
    formats.push({
      type,
      label: config.label,
      extensions: config.extensions.join(', '),
      maxSizeMB: config.maxSize / (1024 * 1024)
    });
  }
  
  return formats;
};

/**
 * Прямой доступ к БД (fallback метод)
 */
const getMediaFromDatabase = async (entityType, entityId) => {
  try {
    // Для всех сущностей используем новую систему
    const { data, error } = await supabase
      .from('media_files')
      .select(`
        *,
        entity_media!inner (
          display_order,
          relation_type,
          created_at
        )
      `)
      .eq('entity_media.entity_type', entityType)
      .eq('entity_media.entity_id', entityId)
      .eq('entity_media.relation_type', 'primary')
      .order('entity_media.display_order');

    if (error) throw error;

    // Форматируем в совместимом формате
    return data.map(item => ({
      id: item.id,
      entity_id: entityId,
      entity_type: entityType,
      file_url: item.file_url,
      file_name: item.file_name,
      file_type: item.file_type,
      public_url: item.public_url,
      description: item.description,
      display_order: item.entity_media[0]?.display_order || 0,
      created_at: item.entity_media[0]?.created_at || item.created_at,
      updated_at: item.updated_at,
      thumbnail_url: item.thumbnail_url,
      duration_seconds: item.duration_seconds,
      width: item.width,
      height: item.height,
      file_size: item.file_size,
      mime_type: item.mime_type
    }));
    
  } catch (error) {
    console.error('[mediaHelper] Direct DB access failed:', error.message);
    return [];
  }
};