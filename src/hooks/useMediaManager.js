// hooks/useMediaManager.js
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../utils/supabaseClient';
import API_URL from '../config/api';

/**
 * Хук для управления медиафайлами сущности
 * @param {string} entityType - Тип сущности (organ, muscle, muscle_group и т.д.)
 * @param {string} entityId - ID сущности
 * @returns {Object} - Объект с состоянием и методами для работы с медиа
 */
export const useMediaManager = (entityType, entityId, options = {}) => {
  const { readonly = false } = options;
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
	const fetchMedia = useCallback(async () => {
	  if (!entityType || !entityId) return;
	  
	  try {
		setLoading(true);
		setError(null);
		addDebugMessage('🔄 Загрузка медиафайлов...');
		
		// Универсальный API эндпоинт
		const response = await fetch(`${API_URL}/api/media/${entityType}/${entityId}`);
		
		if (!response.ok) {
		  throw new Error(`HTTP error! status: ${response.status}`);
		}
		
		const result = await response.json();
		
		if (!result.success) {
		  throw new Error(result.error || 'Unknown error');
		}
		
		// ДЕБАГ: выводим данные, полученные с сервера
		console.log('Данные медиа с сервера:', result.data);
		addDebugMessage(`📊 Получено ${result.data?.length || 0} медиафайлов с сервера`);
		
		// Проверяем наличие поля thumbnail_updated_at в первом элементе
		if (result.data && result.data.length > 0) {
		  const firstItem = result.data[0];
		  console.log('Первый медиафайл:', {
			id: firstItem.id,
			file_name: firstItem.file_name,
			thumbnail_url: firstItem.thumbnail_url,
			thumbnail_updated_at: firstItem.thumbnail_updated_at,
			hasThumbnailUpdatedAt: 'thumbnail_updated_at' in firstItem,
			allFields: Object.keys(firstItem)
		  });
		  
		  addDebugMessage(`🔍 Проверка полей первого файла:`);
		  addDebugMessage(`   - thumbnail_url: ${firstItem.thumbnail_url ? 'есть' : 'нет'}`);
		  addDebugMessage(`   - thumbnail_updated_at: ${firstItem.thumbnail_updated_at || 'НЕТ'}`);
		  addDebugMessage(`   - Все поля: ${Object.keys(firstItem).join(', ')}`);
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
        thumbnail_url: result.thumbnailUrl,
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
      
      // Автоматическое создание превью для видео/PDF/документов
      const fileExt = file.name.split('.').pop().toLowerCase();
      const isVideo = ['mp4', 'webm', 'mov', 'avi', 'mkv'].includes(fileExt);
      const isPdf = fileExt === 'pdf';
      const isDocument = ['doc', 'docx', 'txt', 'md'].includes(fileExt);
      
      if ((isVideo || isPdf || isDocument) && !result.thumbnailUrl) {
        addDebugMessage(`🔄 Яндекс не предоставил превью для ${file.name}. Запускаем отложенное создание...`);
        
        setTimeout(async () => {
          try {
            addDebugMessage(`🔄 Запуск создания превью для ${file.name} через 3 секунды...`);
            
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
                
                // Обновляем локальное состояние
                await fetchMedia();
                addDebugMessage(`🔄 Обновление списка медиа для отображения нового превью`);
              }
            }
          } catch (error) {
            console.warn('Auto-preview generation failed:', error);
            addDebugMessage(`⚠️ Автоматическое создание превью не удалось: ${error.message}`);
          }
        }, 3000);
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

  // ЕДИНАЯ функция проверки устаревания превью
  const isThumbnailExpired = (mediaItem) => {
    if (!mediaItem) return true;
    
    // Для изображений: никогда не устаревают
    if (mediaItem.file_type === 'image') {
      return false;
    }
    
    // Если нет превью - считается устаревшим
    if (!mediaItem.thumbnail_url) {
      return true;
    }
    
    // Если нет даты обновления превью - считается устаревшим
    if (!mediaItem.thumbnail_updated_at) {
      return true;
    }
    
    // Проверяем устаревание (4 часа = 4 * 60 * 60 * 1000 = 14,400,000 ms)
    const currentTime = new Date();
    const thumbnailUpdatedAt = new Date(mediaItem.thumbnail_updated_at);
    const hoursDiff = (currentTime - thumbnailUpdatedAt) / (1000 * 60 * 60);
    
    return hoursDiff > 4;
  };

  // Проверка работоспособности превью
  const checkThumbnailWorking = (item) => {
    if (!item.thumbnail_url) return false;
    
    const urlPattern = /^https?:\/\/.+/;
    return urlPattern.test(item.thumbnail_url) && 
           !item.thumbnail_url.includes('error') &&
           !item.thumbnail_url.includes('expired') &&
           !item.thumbnail_url.includes('access_denied') &&
           !item.thumbnail_url.includes('<!DOCTYPE');
  };

 // Обновленная функция updatePreviews с подробной отладкой
	const updatePreviews = async () => {
	  try {
		setUpdatingPreviews(true);
		setError(null);
		addDebugMessage('🔄 Обновление превью через массовый API...');
		
		// Правильно фильтруем медиа: ТОЛЬКО файлы с устаревшими превью
		const mediaNeedingPreviews = media.filter(item => {
		  return isThumbnailExpired(item);
		});
		
		if (mediaNeedingPreviews.length === 0) {
		  alert('ℹ️ Нет файлов с устаревшими или отсутствующими превью');
		  addDebugMessage('ℹ️ Нет файлов с устаревшими превью для обновления');
		  return { updated: 0, results: [] };
		}
		
		const confirmUpdate = window.confirm(
		  `Обновить превью для ${mediaNeedingPreviews.length} файлов?\n\n` +
		  `Это займет примерно ${Math.ceil(mediaNeedingPreviews.length * 0.5)} секунд.`
		);
		
		if (!confirmUpdate) {
		  addDebugMessage('❌ Обновление превью отменено пользователем');
		  return;
		}
		
		addDebugMessage(`📊 Найдено ${mediaNeedingPreviews.length} файлов для обновления превью`);
		
		const mediaIds = mediaNeedingPreviews.map(item => item.id);
		
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
		  const errorText = await response.text();
		  throw new Error(`Server error: ${response.status} ${errorText}`);
		}
		
		const result = await response.json();
		
		if (!result.success) {
		  throw new Error(result.error || 'Unknown preview update error');
		}
		
		const successCount = result.results.filter(r => r.success).length;
		const failCount = result.total - successCount;
		
		// КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Полностью обновляем медиа с сервера
		// Вместо частичного обновления локального состояния
		if (successCount > 0) {
		  addDebugMessage(`✅ ${successCount} превью обновлено на сервере. Запрашиваем свежие данные...`);
		  
		  // 1. Полностью перезагружаем медиа с сервера
		  await fetchMedia();
		  
		  // 2. Принудительно обновляем превью в DOM для видимого эффекта
		  setTimeout(() => {
			// Создаем событие для принудительного обновления изображений
			const event = new CustomEvent('media-thumbnails-updated', {
			  detail: { mediaIds }
			});
			window.dispatchEvent(event);
			
			addDebugMessage('🔄 Отправлен сигнал обновления превью в DOM');
		  }, 500);
		}
		
		let message = `Обновление превью завершено!\n\n` +
		  `Всего файлов: ${result.total}\n` +
		  `Успешно обновлено: ${successCount}\n` +
		  `Не удалось: ${failCount}`;
		
		if (failCount > 0) {
		  const failedFiles = result.results
			.filter(r => !r.success)
			.map(r => `• ${r.file_name || r.mediaId}: ${r.error || r.message}`)
			.join('\n');
		  
		  message += `\n\nНе удалось обновить:\n${failedFiles}`;
		}
		
		alert(message);
		
		addDebugMessage(`✅ Обновление превью завершено: ${successCount} файлов обновлено`);
		
		return result;
		
	  } catch (err) {
		const errorMsg = `❌ Ошибка обновления превью: ${err.message}`;
		setError(err.message);
		addDebugMessage(errorMsg);
		alert(`Ошибка при обновлении превью: ${err.message}`);
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
      addDebugMessage('🔄 Обновление ссылок Яндекс Диска...');
      
      const mediaToRefresh = media.filter(item => item.public_url);
      
      if (mediaToRefresh.length === 0) {
        alert('ℹ️ Нет медиафайлов для обновления ссылок');
        return { updated: 0, results: [] };
      }
      
      const confirmUpdate = window.confirm(
        `Обновить ссылки Яндекс Диска для ${mediaToRefresh.length} файлов?\n\n` +
        `Это займет примерно ${Math.ceil(mediaToRefresh.length * 0.5)} секунд.`
      );
      
      if (!confirmUpdate) {
        addDebugMessage('❌ Обновление ссылок отменено пользователем');
        return;
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
        const errorText = await response.text();
        throw new Error(`Server error: ${response.status} ${errorText}`);
      }
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Unknown link refresh error');
      }
      
      const successCount = result.results.filter(r => r.success).length;
      const failCount = result.total - successCount;
      
      // Перезагружаем медиа для получения обновленных ссылок
      await fetchMedia();
      
      let message = `Обновление ссылок завершено!\n\n` +
        `Всего файлов: ${result.total}\n` +
        `Успешно обновлено: ${successCount}\n` +
        `Не удалось: ${failCount}`;
      
      if (failCount > 0) {
        const failedFiles = result.results
          .filter(r => !r.success)
          .map(r => `• ${r.fileName || r.mediaId}: ${r.error || r.message}`)
          .join('\n');
        
        message += `\n\nНе удалось обновить:\n${failedFiles}`;
      }
      
      alert(message);
      
      addDebugMessage(`✅ Обновление ссылок завершено: ${successCount} файлов обновлено`);
      
      return result;
      
    } catch (err) {
      const errorMsg = `❌ Ошибка обновления ссылок: ${err.message}`;
      setError(err.message);
      addDebugMessage(errorMsg);
      alert(`Ошибка при обновлении ссылок: ${err.message}`);
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
	 const getThumbnailUrl = (mediaItem) => {
	  if (!mediaItem) return null;
	  
	  // Используем thumbnail_updated_at для обхода кэша
	  // Добавляем timestamp к URL для принудительного обновления
	  const cacheBuster = mediaItem.thumbnail_updated_at 
		? `?t=${new Date(mediaItem.thumbnail_updated_at).getTime()}` 
		: `?t=${Date.now()}`;
	  
	  // Для изображений: используем file_url как основной источник
	  if (mediaItem.file_type === 'image' && mediaItem.file_url) {
		const proxyUrl = createProxyUrl(mediaItem.file_url);
		return proxyUrl ? `${proxyUrl}${cacheBuster}` : null;
	  }
	  
	  // Для остальных типов: пробуем thumbnail_url
	  if (mediaItem.thumbnail_url) {
		const proxyUrl = createProxyUrl(mediaItem.thumbnail_url);
		return proxyUrl ? `${proxyUrl}${cacheBuster}` : null;
	  }
	  
	  // Для изображений без file_url: используем public_url
	  if (mediaItem.file_type === 'image' && mediaItem.public_url) {
		const proxyUrl = createProxyUrl(mediaItem.public_url);
		return proxyUrl ? `${proxyUrl}${cacheBuster}` : null;
	  }
	  
	  return null;
	};

  // Обработка медиа для отображения
  const processMediaForDisplay = (mediaArray) => {
    if (!Array.isArray(mediaArray)) return [];
    
    return mediaArray.map(item => ({
      ...item,
      proxyUrl: createProxyUrl(item.public_url),
      thumbnailUrl: getThumbnailUrl(item),
      // Добавляем флаг устаревания для удобства
      isThumbnailExpired: isThumbnailExpired(item)
    }));
  };

  // Загрузка медиа при изменении entityType или entityId
  useEffect(() => {
    if (entityType && entityId) {
      fetchMedia();
    }
  }, [entityType, entityId, fetchMedia]);

  // КОРРЕКТНЫЙ возврат в конце файла
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
    isThumbnailExpired, // Используем единую функцию
    checkThumbnailWorking,
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
    getFileIcon: (fileType) => {
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
  };
};