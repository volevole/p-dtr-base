// hooks/useMediaManager.js
import { useState, useEffect, useCallback } from 'react';
import API_URL from '../config/api';


/**
 * Хук для управления медиафайлами сущности
 * @param {string} entityType - Тип сущности (organ, muscle, muscle_group и т.д.)
 * @param {string} entityId - ID сущности
 * @returns {Object} - Объект с состоянием и методами для работы с медиа
 */
export const useMediaManager = (entityType, entityId, options = {}) => {
  const { readonly = false } = options; // ← Новый параметр
  const [media, setMedia] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [refreshingLinks, setRefreshingLinks] = useState(false);
  const [updatingPreviews, setUpdatingPreviews] = useState(false);
  const [error, setError] = useState(null);
  const [debugMessages, setDebugMessages] = useState([]);

  // Добавление сообщения в лог
  const addDebugMessage = useCallback((message) => {
    setDebugMessages(prev => [...prev, `${new Date().toLocaleTimeString('ru-RU')} ${message}`]);
  }, []);

  // Очистка логов
  const clearDebugMessages = useCallback(() => {
    setDebugMessages([]);
  }, []);

  // Загрузка медиафайлов
// hooks/useMediaManager.js - ИСПРАВЛЯЕМ только проблему с мышцами
const fetchMedia = useCallback(async () => {
  if (!entityType || !entityId) return;
  
  try {
    setLoading(true);
    setError(null);
    addDebugMessage('🔄 Загрузка медиафайлов...');
    
    // ======= ИСПРАВЛЕНИЕ: Для всех сущностей используем универсальный API =======
    // Убираем специальную логику для мышц
    
    // Сначала пробуем универсальный API эндпоинт
    const response = await fetch(`${API_URL}/api/media/${entityType}/${entityId}`);
    
    if (!response.ok) {
      // Если эндпоинт не существует или ошибка
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Unknown error');
    }
    
    // Обрабатываем медиа для отображения
    const processedMedia = processMediaForDisplay(result.data || []);
    setMedia(processedMedia);
    addDebugMessage(`✅ Загружено ${processedMedia.length} медиафайлов (универсальный API)`);
    
  } catch (err) {
    const errorMsg = `❌ Ошибка загрузки медиа: ${err.message}`;
    setError(err.message);
    addDebugMessage(errorMsg);
    console.error('Error fetching media:', err);
    
    // Устанавливаем пустой массив в случае ошибки
    setMedia([]);
  } finally {
    setLoading(false);
  }
}, [entityType, entityId, addDebugMessage]);


  // Загрузка файла
const uploadFile = async (file, description = '') => {
  try {
    setUploading(true);
    setError(null);
    addDebugMessage(`📤 Начало загрузки: ${file.name}`);
    
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
    
    const uploadedMedia = {
      id: result.media?.id || result.fileName,
      entity_id: entityId,
      entity_type: entityType,
      file_url: result.publicUrl,
      file_name: result.fileName,
      file_type: file.name.split('.').pop().toLowerCase().match(/(jpg|jpeg|png|gif|webp|svg)$/i) ? 'image' :
                file.name.split('.').pop().toLowerCase().match(/(mp4|webm|mov|avi|mkv)$/i) ? 'video' :
                file.name.split('.').pop().toLowerCase().match(/(mp3|wav|ogg|m4a|flac)$/i) ? 'audio' : 'document',
      thumbnail_url: result.thumbnailUrl, // ← ЗДЕСЬ получаем thumbnailUrl с сервера
      public_url: result.publicUrl,
      description: description,
      display_order: 0,
      duration_seconds: result.durationSeconds,
      width: result.width,
      height: result.height,
      file_size: file.size
    };
    
    setMedia(prev => [...prev, uploadedMedia]);
    addDebugMessage(`✅ Файл загружен: ${result.fileName}`);
    
    // ВАЖНОЕ ИСПРАВЛЕНИЕ №1: Проверяем, есть ли превью
    const fileExt = file.name.split('.').pop().toLowerCase();
    const isVideo = ['mp4', 'webm', 'mov', 'avi', 'mkv'].includes(fileExt);
    const isPdf = fileExt === 'pdf';
    const isDocument = ['doc', 'docx', 'txt', 'md'].includes(fileExt);
    
    // Если это PDF/видео/документ И нет превью от Яндекса
    if ((isVideo || isPdf || isDocument) && !result.thumbnailUrl) {
      addDebugMessage(`🔄 Яндекс не предоставил превью для ${file.name}. Запускаем отложенное создание...`);
      
      // Отложенный запуск создания превью (ждать 3 секунды после загрузки)
      setTimeout(async () => {
        try {
          addDebugMessage(`🔄 Запуск создания превью для ${file.name} через 3 секунды...`);
          
          // Используем общий эндпоинт для обновления превью
          const previewResponse = await fetch(`${API_URL}/api/update-media-previews`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              mediaIds: [uploadedMedia.id],
              entityType: entityType,
              entityId: entityId
            }),
          });
          
          if (previewResponse.ok) {
            const previewResult = await previewResponse.json();
            if (previewResult.success) {
              addDebugMessage(`✅ Превью создано для ${file.name}`);
              
              // Обновляем превью в локальном состоянии
              const updatedThumbnail = previewResult.results?.[0]?.changes?.includes('thumbnail');
              if (updatedThumbnail) {
                // Обновляем медиа, чтобы показать новое превью
                await fetchMedia();
                addDebugMessage(`🔄 Обновление списка медиа для отображения нового превью`);
              }
            }
          }
        } catch (error) {
          console.warn('Auto-preview generation failed:', error);
          addDebugMessage(`⚠️ Автоматическое создание превью не удалось: ${error.message}`);
        }
      }, 3000); // 3 секунды задержки
    }
    
    return uploadedMedia;
    
  } catch (err) {
    const errorMsg = `❌ Ошибка загрузки: ${err.message}`;
    setError(err.message);
    addDebugMessage(errorMsg);
    throw err;
  } finally {
    setUploading(false);
  }
};
  // Удаление файла
  const deleteFile = async (mediaId) => {
    try {
      setError(null);
      addDebugMessage(`🗑️ Удаление медиафайла ${mediaId}...`);
      
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
      
      setMedia(prev => prev.filter(item => item.id !== mediaId));
      addDebugMessage(`✅ Медиафайл удален: ${mediaId}`);
      
    } catch (err) {
      const errorMsg = `❌ Ошибка удаления: ${err.message}`;
      setError(err.message);
      addDebugMessage(errorMsg);
      throw err;
    }
  };

  // Обновление порядка
  const updateOrder = async (orderedIds) => {
    try {
      setError(null);
      addDebugMessage(`🔄 Обновление порядка медиафайлов...`);
      
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
      
      // Обновляем локальное состояние
      const reorderedMedia = orderedIds.map(id => 
        media.find(item => item.id === id)
      ).filter(Boolean);
      
      setMedia(reorderedMedia);
      addDebugMessage(`✅ Порядок обновлен для ${orderedIds.length} файлов`);
      
    } catch (err) {
      const errorMsg = `❌ Ошибка обновления порядка: ${err.message}`;
      setError(err.message);
      addDebugMessage(errorMsg);
      throw err;
    }
  };

  // Обновление описания
  const updateDescription = async (mediaId, description, duration = null, width = null, height = null) => {
    try {
      setError(null);
      addDebugMessage(`📝 Обновление описания для ${mediaId}...`);
      
      const updateData = { description };
      if (duration !== null) updateData.duration_seconds = duration;
      if (width !== null) updateData.width = width;
      if (height !== null) updateData.height = height;
      
      const response = await fetch(`${API_URL}/api/media/${mediaId}/update-metadata`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Unknown error');
      }
      
      // Обновляем локальное состояние
      setMedia(prev => prev.map(item => 
        item.id === mediaId ? { 
          ...item, 
          description,
          duration_seconds: duration,
          width: width,
          height: height
        } : item
      ));
      
      addDebugMessage(`✅ Описание обновлено для ${mediaId}`);
      
    } catch (err) {
      const errorMsg = `❌ Ошибка обновления описания: ${err.message}`;
      setError(err.message);
      addDebugMessage(errorMsg);
      throw err;
    }
  };

  // Обновление превью
  const updatePreviews = async () => {
    try {
      setUpdatingPreviews(true);
      setError(null);
      addDebugMessage('🔄 Обновление превью...');
      
      // Фильтруем медиа, которым нужны превью
      const mediaNeedingPreviews = media.filter(item => 
        (item.file_type === 'document' && !item.thumbnail_url) ||
        (item.file_type === 'video' && (!item.thumbnail_url || !item.duration_seconds))
      );
      
      if (mediaNeedingPreviews.length === 0) {
        addDebugMessage('ℹ️ Нет медиафайлов, требующих обновления превью');
        return { updated: 0, results: [] };
      }
      
      addDebugMessage(`📊 Найдено ${mediaNeedingPreviews.length} файлов для обновления превью`);
      
      const response = await fetch(`${API_URL}/api/update-media-previews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mediaIds: mediaNeedingPreviews.map(item => item.id),
          entityType: entityType,
          entityId: entityId
        }),
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Unknown preview update error');
      }
      
      // Обновляем локальное состояние для успешно обновленных файлов
      if (result.results) {
        result.results.forEach(r => {
          if (r.success && r.changes && r.changes.includes('thumbnail')) {
            addDebugMessage(`✅ Превью обновлено: ${r.file_name}`);
          }
        });
      }
      
      // Перезагружаем медиа
      await fetchMedia();
      
      addDebugMessage(`✅ Обновление превью завершено: ${result.updated} файлов обновлено`);
      
      return result;
      
    } catch (err) {
      const errorMsg = `❌ Ошибка обновления превью: ${err.message}`;
      setError(err.message);
      addDebugMessage(errorMsg);
      throw err;
    } finally {
      setUpdatingPreviews(false);
    }
  };

  // Обновление ссылок
  const refreshLinks = async () => {
    try {
      setRefreshingLinks(true);
      setError(null);
      addDebugMessage('🔄 Обновление ссылок...');
      
      const mediaToRefresh = media.filter(item => item.public_url);
      
      if (mediaToRefresh.length === 0) {
        addDebugMessage('ℹ️ Нет медиафайлов для обновления ссылок');
        return { updated: 0, results: [] };
      }
      
      addDebugMessage(`📊 Обновление ссылок для ${mediaToRefresh.length} файлов`);
      
      const refreshData = {
        entityType: entityType,
        entityId: entityId,
        mediaItems: mediaToRefresh.map(item => ({
          id: item.id,
          fileName: item.file_name,
          fileType: item.file_type,
          publicUrl: item.public_url,
          currentFileUrl: item.file_url,
          currentThumbnailUrl: item.thumbnail_url
        }))
      };
      
      const response = await fetch(`${API_URL}/api/refresh-links`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(refreshData),
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Unknown refresh error');
      }
      
      // Перезагружаем медиа для получения обновленных ссылок
      await fetchMedia();
      
      addDebugMessage(`✅ Обновление ссылок завершено: ${result.updated} файлов обновлено`);
      
      return result;
      
    } catch (err) {
      const errorMsg = `❌ Ошибка обновления ссылок: ${err.message}`;
      setError(err.message);
      addDebugMessage(errorMsg);
      throw err;
    } finally {
      setRefreshingLinks(false);
    }
  };

  // Получение доступных медиафайлов для связывания
  const getAvailableMedia = async (search = '', fileType = '', limit = 50) => {
    try {
      addDebugMessage(`🔍 Поиск доступных медиафайлов: "${search}", тип: ${fileType}`);
      
      const params = new URLSearchParams({
        search: search,
        file_type: fileType,
        exclude_entity_type: entityType,
        exclude_entity_id: entityId,
        limit: limit
      });
      
      const response = await fetch(`${API_URL}/api/media/files?${params}`);
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Unknown error');
      }
      
      addDebugMessage(`📊 Найдено ${result.count} доступных медиафайлов`);
      
      return result.files || [];
      
    } catch (err) {
      const errorMsg = `❌ Ошибка поиска медиафайлов: ${err.message}`;
      addDebugMessage(errorMsg);
      console.error('Error getting available media:', err);
      return [];
    }
  };

  // Связывание существующего медиафайла
  const linkMedia = async (mediaFileId, relationType = 'primary') => {
    try {
      addDebugMessage(`🔗 Связывание медиафайла ${mediaFileId}...`);
      
      const response = await fetch(`${API_URL}/api/media/link`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mediaFileId,
          entityType: entityType,
          entityId: entityId,
          relationType: relationType
        }),
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Unknown link error');
      }
      
      // Добавляем связанный файл в локальное состояние
      setMedia(prev => [...prev, result.media]);
      addDebugMessage(`✅ Медиафайл связан: ${result.media.file_name}`);
      
      return result;
      
    } catch (err) {
      const errorMsg = `❌ Ошибка связывания медиафайла: ${err.message}`;
      addDebugMessage(errorMsg);
      throw err;
    }
  };

  // Форматирование размера файла
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Создание proxy URL для отображения
  const createProxyUrl = (publicUrl) => {
    if (!publicUrl) return null;
    return `${API_URL}/api/proxy-image?url=${encodeURIComponent(publicUrl)}`;
  };

  // Получение URL превью
// улучшенная функция getThumbnailUrl
const getThumbnailUrl = (mediaItem) => {
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

  // Обработка медиа для отображения
  const processMediaForDisplay = (mediaArray) => {
    if (!Array.isArray(mediaArray)) return [];
    
    return mediaArray.map(item => ({
      ...item,
      proxyUrl: createProxyUrl(item.public_url),
      thumbnailUrl: getThumbnailUrl(item)
    }));
  };

  // Загрузка медиа при изменении entityType или entityId
  useEffect(() => {
    if (entityType && entityId) {
      fetchMedia();
    }
  }, [entityType, entityId, fetchMedia]);

  // hooks/useMediaManager.js - КОРРЕКТНЫЙ возврат в конце файла
return {
  // Состояние
  media: processMediaForDisplay(media),
  loading,
  uploading,
  refreshingLinks,
  updatingPreviews,
  error,
  debugMessages,
  
  // Методы
  fetchMedia,
  uploadFile,
  deleteFile,
  updateOrder,
  updateDescription,
  updatePreviews,
  refreshLinks,
  getAvailableMedia,
  linkMedia,
  formatFileSize,
  
  // Вспомогательные
  addDebugMessage,
  clearDebugMessages,
  createProxyUrl,
  getThumbnailUrl,  
  getFileIcon: (fileType) => {  // ← Новая функция
    switch(fileType) {
      case 'image': return '🖼️';
      case 'video': return '🎬';
      case 'audio': return '🎵';
      case 'document': return '📄';
      default: return '📁';
    }
  },
// Добавляем флаг readonly
    readonly  
}
};