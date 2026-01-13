// utils/AllMediaPage.js
import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import MediaViewer from '../MediaViewer';
import { MediaList } from '../MediaList';
import { 
  createProxyUrl, 
  getThumbnailUrl, 
  getFileIcon, 
  formatFileSize,
  isThumbnailExpired,
  needsLinkRefresh,
  processMediaForDisplay 
} from './mediaUtils';
import API_URL from '../config/api';  // Базовый URL API

function AllMediaPage() {
  const [mediaFiles, setMediaFiles] = useState([]);
  const [processedMedia, setProcessedMedia] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [showViewer, setShowViewer] = useState(false);
  const [updatingLinks, setUpdatingLinks] = useState(false);
  const [updatingPreviews, setUpdatingPreviews] = useState(false);
  const [entityConnections, setEntityConnections] = useState({});
  const [expiredThumbnailsOnly, setExpiredThumbnailsOnly] = useState(false);
  const [debugMessages, setDebugMessages] = useState([]);

  useEffect(() => {
    fetchMediaFiles();
  }, []);

  useEffect(() => {
    if (mediaFiles.length > 0) {
      processMediaFiles();
    }
  }, [mediaFiles]);

  // Добавляем сообщение в отладку
  const addDebugMessage = (message) => {
    const timestamp = new Date().toLocaleTimeString('ru-RU');
    setDebugMessages(prev => [...prev, { message, timestamp }].slice(-20));
  };

  // Функция для получения правильного имени поля сущности
  const getEntityFieldName = (entityType) => {
    switch(entityType) {
      case 'muscle': return 'name_ru';
      case 'organ': return 'name';
      case 'meridian': return 'name';
      case 'dysfunction': return 'name';
      case 'muscle_group': return 'name';
      case 'receptor': return 'name';
      case 'receptor_class': return 'name';
      case 'tool': return 'name';
      default: return 'name';
    }
  };

  const fetchMediaFiles = async () => {
    try {
      setLoading(true);
      addDebugMessage('Start fetching media files');
      
      const { data: filesData, error: filesError } = await supabase
        .from('media_files')
        .select('*')
        .order('created_at', { ascending: false });

      if (filesError) throw filesError;
      addDebugMessage(`Fetched ${filesData?.length || 0} media files`);

      const { data: connectionsData, error: connectionsError } = await supabase
        .from('entity_media')
        .select('*')
        .in('media_file_id', filesData.map(f => f.id));

      if (connectionsError) throw connectionsError;
      addDebugMessage(`Fetched ${connectionsData?.length || 0} entity connections`);

      const connectionsByFile = {};
      if (connectionsData) {
        connectionsData.forEach(conn => {
          if (!connectionsByFile[conn.media_file_id]) {
            connectionsByFile[conn.media_file_id] = [];
          }
          connectionsByFile[conn.media_file_id].push(conn);
        });
      }

      // Получаем информацию о сущностях с правильными именами полей
      const entityIdsByType = {};
      connectionsData?.forEach(conn => {
        if (!entityIdsByType[conn.entity_type]) {
          entityIdsByType[conn.entity_type] = new Set();
        }
        entityIdsByType[conn.entity_type].add(conn.entity_id);
      });

      const entityInfo = {};
      for (const [entityType, idSet] of Object.entries(entityIdsByType)) {
        const ids = Array.from(idSet);
        if (ids.length === 0) continue;

        try {
          const tableName = getTableName(entityType);
          const fieldName = getEntityFieldName(entityType);
          
          const { data, error } = await supabase
            .from(tableName)
            .select(`id, ${fieldName}`)
            .in('id', ids);

          if (!error && data) {
            data.forEach(entity => {
              if (!entityInfo[entityType]) {
                entityInfo[entityType] = {};
              }
              entityInfo[entityType][entity.id] = {
                id: entity.id,
                name: entity[fieldName] || `Unknown ${entityType}`
              };
            });
            addDebugMessage(`Loaded ${data.length} ${entityType} entities`);
          }
        } catch (err) {
          addDebugMessage(`Error loading ${entityType} entities: ${err.message}`);
        }
      }

      setMediaFiles(filesData || []);
      setEntityConnections({ connectionsByFile, entityInfo });
      addDebugMessage('Media files processing completed');
      
    } catch (error) {
      addDebugMessage(`Error fetching media: ${error.message}`);
      alert('Ошибка загрузки медиафайлов: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // utils/AllMediaPage.js - исправленная функция processMediaFiles
const processMediaFiles = () => {
  const { connectionsByFile = {}, entityInfo = {} } = entityConnections;
  
  const processed = mediaFiles.map(file => {
    const fileConnections = connectionsByFile[file.id] || [];
    
    const connectionsWithInfo = fileConnections.map(conn => {
      const entityData = entityInfo[conn.entity_type]?.[conn.entity_id];
      const entityName = entityData?.name || `Unknown ${conn.entity_type}`;
      
      return {
        ...conn,
        entity_name: entityName,
        entity_link: getEntityLink(conn.entity_type, conn.entity_id)
      };
    });

    // Используем функцию processMediaForDisplay из общих утилит
    const processedMedia = processMediaForDisplay([file])[0] || file;
    
    // Ключевое исправление для превью
    const currentTime = new Date();
    const thumbnailUpdatedAt = file.thumbnail_updated_at ? new Date(file.thumbnail_updated_at) : null;
    
    // Проверяем, просрочено ли превью (4 часа = 4 * 60 * 60 * 1000 = 14,400,000 ms)
    const isExpired = thumbnailUpdatedAt ? 
      (currentTime - thumbnailUpdatedAt) > 14400000 : 
      !file.thumbnail_url; // Если нет даты обновления и нет thumbnail_url
    
    // Ключевое исправление для ссылок
    // Проверяем, действительна ли ссылка на файл
    // Если file_url существует и не содержит признаков ошибок
    const hasValidFileUrl = file.file_url && 
      file.file_url.includes('https://') && 
      !file.file_url.includes('error') &&
      !file.file_url.includes('expired') &&
      !file.file_url.includes('access_denied') &&
      !file.file_url.includes('<!DOCTYPE');
    
    // Проверяем, нуждается ли ссылка в обновлении
    // Ссылка считается устаревшей, если ее нет или она выглядит недействительной
    const needsRefresh = !hasValidFileUrl;
    
    return {
      ...processedMedia,
      connections: connectionsWithInfo,
      connection_count: fileConnections.length,
      has_expired_thumbnail: isExpired,
      thumbnail_working: checkThumbnailWorking(file),
      needs_link_refresh: needsRefresh, // Используем нашу собственную проверку
      has_valid_file_url: hasValidFileUrl // Добавляем флаг валидности
    };
  });

  setProcessedMedia(processed);
  addDebugMessage(`Processed ${processed.length} media files`);
};

  // Функция для получения имени таблицы по типу сущности
  const getTableName = (entityType) => {
    switch(entityType) {
      case 'muscle': return 'muscles';
      case 'organ': return 'organs';
      case 'meridian': return 'meridians';
      case 'dysfunction': return 'dysfunctions';
      case 'muscle_group': return 'muscle_groups';
      case 'receptor': return 'receptors';
      case 'receptor_class': return 'receptor_classes';
      case 'tool': return 'tools';
      default: return entityType;
    }
  };

  const getEntityLink = (entityType, entityId) => {
    const basePath = getEntityBasePath(entityType);
    return `${basePath}/${entityId}`;
  };

  const getEntityBasePath = (entityType) => {
    switch(entityType) {
      case 'muscle': return '/muscle';
      case 'organ': return '/organ';
      case 'meridian': return '/meridian';
      case 'dysfunction': return '/dysfunction';
      case 'muscle_group': return '/group';
      case 'receptor': return '/receptor';
      case 'receptor_class': return '/receptor-class';
      case 'tool': return '/tool';
      default: return '#';
    }
  };

  const getEntityTypeLabel = (entityType) => {
    switch(entityType) {
      case 'muscle': return 'Мышца';
      case 'organ': return 'Орган';
      case 'meridian': return 'Меридиан';
      case 'dysfunction': return 'Дисфункция';
      case 'muscle_group': return 'Группа мышц';
      case 'receptor': return 'Рецептор';
      case 'receptor_class': return 'Класс рецепторов';
      case 'tool': return 'Инструмент';
      default: return 'Сущность';
    }
  };

  const checkThumbnailWorking = (file) => {
    if (!file.thumbnail_url) return false;
    
    const urlPattern = /^https?:\/\/.+/;
    return urlPattern.test(file.thumbnail_url) && 
           !file.thumbnail_url.includes('error') &&
           !file.thumbnail_url.includes('expired') &&
           !file.thumbnail_url.includes('access_denied') &&
           !file.thumbnail_url.includes('<!DOCTYPE');
  };

  // Функция для обновления превью через серверный API
  const updatePreviewViaServer = async (file) => {
    try {
      addDebugMessage(`Updating preview via server API for: ${file.file_name}`);
      
      const response = await fetch(
        `${API_URL}/api/media/${file.id}/update-yandex-preview`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          }
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        addDebugMessage(`Server API error (${response.status}) for ${file.file_name}: ${errorText.substring(0, 200)}`);
        return null;
      }

      const result = await response.json();
      
      if (result.success) {
        addDebugMessage(`Server API success for ${file.file_name}: changes=${result.changes?.join(', ') || 'none'}`);
        return result;
      } else {
        addDebugMessage(`Server API returned error for ${file.file_name}: ${result.error || 'Unknown error'}`);
        return null;
      }
      
    } catch (error) {
      addDebugMessage(`Error calling server API for ${file.file_name}: ${error.message}`);
      return null;
    }
  };

  // Функция для обновления ссылок через API Яндекса
  const updateYandexLinksForFile = async (file, updateMainLink = false, updateThumbnail = false) => {
    try {
      if (!file.public_url) {
        addDebugMessage(`No public_url for file ${file.file_name}`);
        return null;
      }

      const response = await fetch(`${API_URL}/api/update-yandex-links`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mediaId: file.id,
          fileName: file.file_name,
          fileType: file.file_type,
          publicUrl: file.public_url,
          currentFileUrl: file.file_url,
          currentThumbnailUrl: file.thumbnail_url,
          updateMainLink: updateMainLink,
          updateThumbnail: updateThumbnail,
          silentUpdate: true
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        addDebugMessage(`Yandex links API error for ${file.file_name}: ${errorText.substring(0, 200)}`);
        return null;
      }

      const result = await response.json();
      
      if (result.success) {
        addDebugMessage(`Updated ${file.file_name}: main=${updateMainLink}, thumb=${updateThumbnail}`);
        
        // Ключевое исправление: обновляем thumbnail_updated_at в базе данных
        if (updateThumbnail) {
          try {
            const { error } = await supabase
              .from('media_files')
              .update({ 
                thumbnail_updated_at: new Date().toISOString()
              })
              .eq('id', file.id);
            
            if (error) {
              addDebugMessage(`Warning: Could not update thumbnail_updated_at for ${file.file_name}: ${error.message}`);
            } else {
              addDebugMessage(`Updated thumbnail_updated_at for ${file.file_name}`);
            }
          } catch (err) {
            addDebugMessage(`Error updating thumbnail_updated_at: ${err.message}`);
          }
        }
        
        return {
          updatedFileUrl: result.updatedFileUrl || file.file_url,
          updatedThumbnailUrl: result.updatedThumbnailUrl || file.thumbnail_url
        };
      } else {
        addDebugMessage(`Failed to update ${file.file_name}: ${result.error || 'Unknown error'}`);
        return null;
      }
    } catch (error) {
      addDebugMessage(`Error updating links for ${file.file_name}: ${error.message}`);
      return null;
    }
  };

  // Упрощенный обработчик просмотра медиа
  const handleMediaView = (item) => {
    addDebugMessage(`Opening media viewer for: ${item.file_name}`);
    setSelectedMedia(item);
    setShowViewer(true);
  };

  // Обновление превью после закрытия просмотра
  const handleCloseViewer = () => {
    addDebugMessage('Closing media viewer');
    setShowViewer(false);
    setSelectedMedia(null);
  };

  // Функция для массового обновления превью
const handleUpdatePreviews = async () => {
  const filesToUpdate = filteredMedia.filter(file => 
    file.has_expired_thumbnail || !file.thumbnail_url
  );
  
  if (filesToUpdate.length === 0) {
    alert('Нет файлов с просроченным превью для обновления');
    return;
  }

  const message = `Обновить превью для ${filesToUpdate.length} файлов?`;
  if (!window.confirm(message)) {
    return;
  }

  setUpdatingPreviews(true);
  addDebugMessage(`Starting preview update for ${filesToUpdate.length} files via server API`);

  try {
    let updatedCount = 0;
    let failedCount = 0;

    for (const file of filesToUpdate) {
      try {
        addDebugMessage(`Updating preview via server API for ${file.file_name}`);
        
        // Определяем, что нужно обновить для этого файла
        const needsThumbnailUpdate = file.has_expired_thumbnail || !file.thumbnail_url;
        // Для обновления превью обычно не нужно обновлять основную ссылку
        const needsMainLinkUpdate = false;
        
        const result = await updateYandexLinksForFile(
          file, 
          needsMainLinkUpdate, 
          needsThumbnailUpdate
        );
        
        if (result) {
          updatedCount++;
          setMediaFiles(prev => prev.map(f => 
            f.id === file.id 
              ? { 
                  ...f, 
                  file_url: result.updatedFileUrl || f.file_url,
                  thumbnail_url: result.updatedThumbnailUrl || f.thumbnail_url,
                  thumbnail_updated_at: needsThumbnailUpdate ? new Date().toISOString() : f.thumbnail_updated_at,
                  has_expired_thumbnail: false,
                  needs_link_refresh: false, // Важно: сбрасываем флаг
                  updated_at: new Date().toISOString()
                } 
              : f
          ));
          addDebugMessage(`Successfully updated ${file.file_name}`);
        } else {
          failedCount++;
          addDebugMessage(`Failed to update preview for ${file.file_name}`);
        }

        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        failedCount++;
        addDebugMessage(`Error updating ${file.file_name}: ${error.message}`);
      }
    }

    alert(`Обновление превью завершено!\n\n` +
      `Всего файлов: ${filesToUpdate.length}\n` +
      `Успешно обновлено: ${updatedCount}\n` +
      `Не удалось: ${failedCount}`);
    
    // Обновляем список файлов
    await fetchMediaFiles();
    
  } catch (error) {
    alert('Ошибка при обновлении превью: ' + error.message);
  } finally {
    setUpdatingPreviews(false);
  }
};

  // Умная кнопка обновления ссылок
  const handleUpdateYandexLinks = async () => {
    const filesToUpdate = filteredMedia;
    const count = filesToUpdate.length;
    
    if (count === 0) {
      alert('Нет файлов для обновления');
      return;
    }

    const message = filter 
      ? `Обновить ссылки Яндекс.Диска для ${count} отфильтрованных файлов?`
      : `Обновить ссылки Яндекс.Диска для всех ${count} файлов?`;
    
    if (!window.confirm(message)) {
      return;
    }

    setUpdatingLinks(true);
    addDebugMessage(`Starting link update for ${count} files`);

    try {
      let updatedCount = 0;
      let failedCount = 0;
      let skippedCount = 0;

      for (const file of filesToUpdate) {
        try {
          if (!file.public_url) {
            skippedCount++;
            addDebugMessage(`Skipping ${file.file_name}: no public_url`);
            continue;
          }

          const needsMainLinkUpdate = file.needs_link_refresh;
          const needsThumbnailUpdate = file.has_expired_thumbnail || !file.thumbnail_url;

          if (!needsMainLinkUpdate && !needsThumbnailUpdate) {
            skippedCount++;
            addDebugMessage(`Skipping ${file.file_name}: no updates needed`);
            continue;
          }

          addDebugMessage(`Updating ${file.file_name}: main=${needsMainLinkUpdate}, thumb=${needsThumbnailUpdate}`);

          const result = await updateYandexLinksForFile(
            file, 
            needsMainLinkUpdate, 
            needsThumbnailUpdate
          );
          
          if (result) {
            updatedCount++;
            setMediaFiles(prev => prev.map(f => 
              f.id === file.id 
                ? { 
                    ...f, 
                    file_url: result.updatedFileUrl || f.file_url,
                    thumbnail_url: result.updatedThumbnailUrl || f.thumbnail_url,
                    thumbnail_updated_at: needsThumbnailUpdate ? new Date().toISOString() : f.thumbnail_updated_at,
                    has_expired_thumbnail: false,
                    needs_link_refresh: false,
                    updated_at: new Date().toISOString()
                  } 
                : f
            ));
            addDebugMessage(`Successfully updated ${file.file_name}`);
          } else {
            failedCount++;
            addDebugMessage(`Failed to update ${file.file_name}`);
          }

          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error) {
          failedCount++;
          addDebugMessage(`Error updating ${file.file_name}: ${error.message}`);
        }
      }

      alert(`Обновление завершено!\n\n` +
        `Всего файлов: ${count}\n` +
        `Успешно обновлено: ${updatedCount}\n` +
        `Пропущено: ${skippedCount}\n` +
        `Не удалось: ${failedCount}`);
      
      await fetchMediaFiles();
      
    } catch (error) {
      alert('Ошибка при обновлении ссылок: ' + error.message);
    } finally {
      setUpdatingLinks(false);
    }
  };

  const getUpdateButtonText = () => {
    const count = filteredMedia.length;
    const totalCount = mediaFiles.length;
    
    if (filter || expiredThumbnailsOnly) {
      const suffix = expiredThumbnailsOnly ? 'с просроченным превью' : 'отфильтрованных';
      return `🔄 Обновить ссылки Яндекс.Диска (${suffix} ${count})`;
    }
    
    return `🔄 Обновить ссылки Яндекс.Диска (все ${totalCount})`;
  };

  const getUpdatePreviewsButtonText = () => {
    const expiredCount = processedMedia.filter(f => f.has_expired_thumbnail || !f.thumbnail_url).length;
    const filteredExpiredCount = filteredMedia.filter(f => f.has_expired_thumbnail || !f.thumbnail_url).length;
    
    if (filter || expiredThumbnailsOnly) {
      return `🖼️ Обновить превью (${filteredExpiredCount})`;
    }
    
    return `🖼️ Обновить превью (всего ${expiredCount})`;
  };

  const filteredMedia = processedMedia.filter(item => {
    if (filter) {
      const searchTerm = filter.toLowerCase();
      const fileName = (item.file_name || '').toLowerCase();
      const description = (item.description || '').toLowerCase();
      const fileType = (item.file_type || '').toLowerCase();
      const publicUrl = (item.public_url || '').toLowerCase();
      
      const entitySearch = item.connections?.some(conn => 
        conn.entity_name.toLowerCase().includes(searchTerm) ||
        conn.entity_type.toLowerCase().includes(searchTerm)
      );

      if (!(fileName.includes(searchTerm) || 
            description.includes(searchTerm) ||
            fileType.includes(searchTerm) ||
            publicUrl.includes(searchTerm) ||
            entitySearch)) {
        return false;
      }
    }

    if (expiredThumbnailsOnly && !item.has_expired_thumbnail) {
      return false;
    }

    return true;
  });

  if (loading) return <div style={{ padding: '2rem' }}>Загрузка медиафайлов...</div>;


  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: 'auto' }}>
      <h1>Все медиафайлы</h1>
      
      <div style={{ 
        marginBottom: '20px',
        display: 'flex',
        alignItems: 'center',
        gap: '20px'
      }}>
        <div>
          <strong>Всего файлов:</strong> {mediaFiles.length}
          {filteredMedia.length !== mediaFiles.length && ` (отфильтровано: ${filteredMedia.length})`}
        </div>
        
        <button
          onClick={() => fetchMediaFiles()}
          disabled={loading}
          style={{
            padding: '8px 16px',
            backgroundColor: loading ? '#6c757d' : '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          🔄 Обновить список
        </button>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <input
          type="text"
          placeholder="Поиск по названию файла, описанию, типу или сущности..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          style={{
            width: '100%',
            padding: '10px',
            fontSize: '16px',
            border: '1px solid #ddd',
            borderRadius: '4px'
          }}
        />
      </div>

      {/* Фильтры */}
      <div style={{ 
        display: 'flex', 
        flexWrap: 'wrap',
        gap: '10px',
        marginBottom: '20px'
      }}>
        <button
          onClick={() => {
            setFilter('');
            setExpiredThumbnailsOnly(false);
          }}
          style={{
            padding: '5px 15px',
            backgroundColor: (!filter && !expiredThumbnailsOnly) ? '#007bff' : '#f8f9fa',
            color: (!filter && !expiredThumbnailsOnly) ? 'white' : '#495057',
            border: '1px solid #dee2e6',
            borderRadius: '20px',
            cursor: 'pointer'
          }}
        >
          Все ({mediaFiles.length})
        </button>
        
        {['image', 'video', 'audio', 'document'].map(type => (
          <button
            key={type}
            onClick={() => {
              setFilter(type);
              setExpiredThumbnailsOnly(false);
            }}
            style={{
              padding: '5px 15px',
              backgroundColor: filter === type ? '#007bff' : '#f8f9fa',
              color: filter === type ? 'white' : '#495057',
              border: '1px solid #dee2e6',
              borderRadius: '20px',
              cursor: 'pointer'
            }}
          >
            {type === 'image' ? '🖼️ Изображения' :
             type === 'video' ? '🎬 Видео' :
             type === 'audio' ? '🎵 Аудио' : '📄 Документы'}
          </button>
        ))}
        
        <button
          onClick={() => {
            setFilter('');
            setExpiredThumbnailsOnly(!expiredThumbnailsOnly);
          }}
          style={{
            padding: '5px 15px',
            backgroundColor: expiredThumbnailsOnly ? '#dc3545' : '#f8f9fa',
            color: expiredThumbnailsOnly ? 'white' : '#495057',
            border: '1px solid #dee2e6',
            borderRadius: '20px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '5px'
          }}
        >
          {expiredThumbnailsOnly ? '❌' : '⚠️'}
          Просроченные превью ({processedMedia.filter(f => f.has_expired_thumbnail).length})
        </button>
      </div>

      {/* Блок кнопок управления */}
      <div style={{ 
        marginBottom: '30px',
        padding: '20px',
        backgroundColor: '#f8f9fa',
        borderRadius: '8px',
        border: '1px solid #dee2e6'
      }}>
        <h3 style={{ marginTop: 0, marginBottom: '15px' }}>Управление медиафайлами</h3>
        
        <div style={{ 
          display: 'flex', 
          flexWrap: 'wrap',
          gap: '15px',
          marginBottom: '10px'
        }}>
          {/* Кнопка обновления ссылок */}
          <button
            onClick={handleUpdateYandexLinks}
            disabled={updatingLinks || filteredMedia.length === 0}
            style={{
              padding: '10px 20px',
              backgroundColor: (updatingLinks || filteredMedia.length === 0) ? '#6c757d' : '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: (updatingLinks || filteredMedia.length === 0) ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              flex: '1',
              minWidth: '300px'
            }}
          >
            {updatingLinks ? (
              <>
                <span style={{
                  display: 'inline-block',
                  width: '16px',
                  height: '16px',
                  border: '2px solid #fff',
                  borderTop: '2px solid transparent',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }}></span>
                Обновление ссылок...
              </>
            ) : (
              <>
                {getUpdateButtonText()}
              </>
            )}
          </button>

          {/* Кнопка обновления превью */}
          <button
            onClick={handleUpdatePreviews}
            disabled={updatingPreviews || filteredMedia.length === 0}
            style={{
              padding: '10px 20px',
              backgroundColor: (updatingPreviews || filteredMedia.length === 0) ? '#6c757d' : '#17a2b8',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: (updatingPreviews || filteredMedia.length === 0) ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              flex: '1',
              minWidth: '300px'
            }}
          >
            {updatingPreviews ? (
              <>
                <span style={{
                  display: 'inline-block',
                  width: '16px',
                  height: '16px',
                  border: '2px solid #fff',
                  borderTop: '2px solid transparent',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }}></span>
                Обновление превью...
              </>
            ) : (
              <>
                {getUpdatePreviewsButtonText()}
              </>
            )}
          </button>
        </div>
        
        <div style={{ 
          fontSize: '13px', 
          color: '#666',
          marginTop: '10px',
          padding: '10px',
          backgroundColor: '#e9ecef',
          borderRadius: '4px'
        }}>
          <strong>Информация:</strong><br/>
          • Файлов с просроченным превью: {processedMedia.filter(f => f.has_expired_thumbnail).length}<br/>
          • Файлов без превью: {processedMedia.filter(f => !f.thumbnail_url).length}<br/>
          • Для обновления превью используется серверный API<br/>
          • <strong>Изображения и видео открываются через прокси</strong><br/>
          • Документы открываются в новой вкладке
        </div>
        
        {/* Панель отладки (можно свернуть/развернуть) */}
        <div style={{ marginTop: '20px' }}>
          <button
            onClick={() => {
              const panel = document.getElementById('debug-panel');
              if (panel) {
                panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
              }
            }}
            style={{
              padding: '5px 10px',
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px'
            }}
          >
            {debugMessages.length > 0 ? `📋 Отладка (${debugMessages.length})` : '📋 Отладка'}
          </button>
          
          <div 
            id="debug-panel"
            style={{
              display: 'none',
              marginTop: '10px',
              padding: '10px',
              backgroundColor: '#2d2d2d',
              color: '#f8f9fa',
              borderRadius: '4px',
              maxHeight: '200px',
              overflowY: 'auto',
              fontSize: '11px',
              fontFamily: 'monospace'
            }}
          >
            {debugMessages.length === 0 ? (
              <div>Нет отладочных сообщений</div>
            ) : (
              debugMessages.map((msg, idx) => (
                <div key={idx} style={{ marginBottom: '5px', borderBottom: '1px solid #444', paddingBottom: '5px' }}>
                  <span style={{ color: '#aaa' }}>[{msg.timestamp}]</span> {msg.message}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Отображение медиа */}
      {filteredMedia.length === 0 ? (
        <div style={{ 
          padding: '40px', 
          textAlign: 'center',
          backgroundColor: '#f8f9fa',
          borderRadius: '8px'
        }}>
          {expiredThumbnailsOnly ? 'Нет файлов с просроченным превью' : 
           filter ? 'Медиафайлы не найдены' : 'Медиафайлы отсутствуют'}
        </div>
      ) : (
        <div>
          <MediaList
            items={filteredMedia.map(item => ({
              ...item,
              thumbnailComponent: (
                <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                  {item.has_expired_thumbnail && (
                    <div style={{
                      position: 'absolute',
                      top: '5px',
                      left: '5px',
                      backgroundColor: 'rgba(220, 53, 69, 0.9)',
                      color: 'white',
                      borderRadius: '50%',
                      width: '20px',
                      height: '20px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '10px',
                      fontWeight: 'bold',
                      zIndex: 10,
                      cursor: 'help'
                    }}
                    title="Превью просрочено"
                    >
                      ⚠️
                    </div>
                  )}
                  
                  {item.connection_count > 0 && (
                    <div style={{
                      position: 'absolute',
                      top: '5px',
                      right: '5px',
                      backgroundColor: 'rgba(0, 123, 255, 0.9)',
                      color: 'white',
                      borderRadius: '50%',
                      width: '24px',
                      height: '24px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      cursor: 'help',
                      zIndex: 10
                    }}
                    title={item.connections.map(c => 
                      `${getEntityTypeLabel(c.entity_type)}: ${c.entity_name}`
                    ).join('\n')}
                    >
                      {item.connection_count}
                    </div>
                  )}
                  
                  {/* Индикатор устаревшей ссылки */}
                  {item.needs_link_refresh && (
                    <div style={{
                      position: 'absolute',
                      bottom: '5px',
                      left: '5px',
                      backgroundColor: 'rgba(255, 193, 7, 0.9)',
                      color: 'black',
                      borderRadius: '50%',
                      width: '18px',
                      height: '18px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '9px',
                      fontWeight: 'bold',
                      zIndex: 10,
                      cursor: 'help'
                    }}
                    title="Ссылка на файл устарела"
                    >
                      🔗
                    </div>
                  )}
                </div>
              )
            }))}
            onDelete={async (id) => {
              if (!window.confirm('Вы уверены, что хотите удалить этот медиафайл и все его связи?')) {
                return;
              }

              try {
                addDebugMessage(`Deleting media file ${id}`);
                
                const { error: connectionsError } = await supabase
                  .from('entity_media')
                  .delete()
                  .eq('media_file_id', id);

                if (connectionsError) throw connectionsError;

                const { error: fileError } = await supabase
                  .from('media_files')
                  .delete()
                  .eq('id', id);

                if (fileError) throw fileError;

                setMediaFiles(prev => prev.filter(file => file.id !== id));
                addDebugMessage(`Media file ${id} deleted successfully`);
                alert('Медиафайл и все его связи удалены!');
              } catch (error) {
                addDebugMessage(`Error deleting media file ${id}: ${error.message}`);
                alert('Ошибка при удалении: ' + error.message);
              }
            }}
            onView={handleMediaView}
            onEditDescription={async (item, newDescription) => {
              try {
                const { error } = await supabase
                  .from('media_files')
                  .update({ description: newDescription })
                  .eq('id', item.id);

                if (error) throw error;

                setMediaFiles(prev => prev.map(f => 
                  f.id === item.id ? { ...f, description: newDescription } : f
                ));

                alert('Описание обновлено!');
              } catch (error) {
                alert('Ошибка при обновлении описания: ' + error.message);
              }
            }}
          />

		{/* Таблица с детальной информацией */}
		<div style={{ marginTop: '30px' }}>
		  <h3>Детальная информация о файлах</h3>
		  <div style={{ 
			overflowX: 'auto',
			marginTop: '15px'
		  }}>
			<table style={{
			  width: '100%',
			  borderCollapse: 'collapse',
			  backgroundColor: 'white',
			  borderRadius: '8px',
			  overflow: 'hidden',
			  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
			}}>
			  <thead>
				<tr style={{ backgroundColor: '#f8f9fa' }}>
				  <th style={{ padding: '8px', textAlign: 'left', borderBottom: '2px solid #dee2e6', width: '60px' }}>Превью</th>
				  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>Файл</th>
				  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>Тип</th>
				  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>Размер</th>
				  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>Статус превью</th>
				  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>Статус ссылки</th>
				  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>Связи</th>
				  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>Создан</th>
				</tr>
			  </thead>
			  <tbody>
				{filteredMedia.map(item => (
				  <tr key={item.id} style={{ borderBottom: '1px solid #dee2e6' }}>
					<td style={{ padding: '8px', verticalAlign: 'middle' }}>
					  <div 
						style={{
						  width: '50px',
						  height: '50px',
						  backgroundColor: '#f5f5f5',
						  borderRadius: '4px',
						  overflow: 'hidden',
						  display: 'flex',
						  alignItems: 'center',
						  justifyContent: 'center',
						  cursor: item.thumbnailUrl ? 'pointer' : 'default'
						}}
						onClick={() => item.thumbnailUrl && handleMediaView(item)}
						title={item.thumbnailUrl ? "Просмотреть медиа" : "Нет превью"}
					  >
						{item.thumbnailUrl ? (
						  <img 
							src={item.thumbnailUrl} 
							alt={item.file_name}
							style={{
							  width: '100%',
							  height: '100%',
							  objectFit: 'cover'
							}}
							onError={(e) => {
							  e.target.style.display = 'none';
							  e.target.parentElement.innerHTML = getFileIcon(item.file_type);
							  e.target.parentElement.style.fontSize = '20px';
							}}
						  />
						) : (
						  <div style={{ fontSize: '20px' }}>
							{getFileIcon(item.file_type)}
						  </div>
						)}
						
						{item.has_expired_thumbnail && (
						  <div style={{
							position: 'absolute',
							top: '-3px',
							left: '-3px',
							backgroundColor: '#dc3545',
							color: 'white',
							borderRadius: '50%',
							width: '12px',
							height: '12px',
							fontSize: '8px',
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
							fontWeight: 'bold'
						  }}
						  title="Превью просрочено"
						  >
							⚠
						  </div>
						)}
					  </div>
					</td>
					<td style={{ padding: '12px' }}>
					  <div style={{ fontWeight: 'bold', textAlign: 'left' }}> {item.file_name}</div>
					  {item.description && (
						<div style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
						  {item.description}
						</div>
					  )}
					</td>
					<td style={{ padding: '12px' }}>
					  {item.file_type === 'image' ? '🖼️' :
					   item.file_type === 'video' ? '🎬' :
					   item.file_type === 'audio' ? '🎵' : '📄'} {item.file_type}
					</td>
					<td style={{ padding: '12px' }}>{formatFileSize(item.file_size)}</td>
					<td style={{ padding: '12px' }}>
					  {item.has_expired_thumbnail ? (
						<span style={{ color: '#dc3545', fontWeight: 'bold' }}>⚠️ Просрочено</span>
					  ) : item.thumbnail_url ? (
						<span style={{ color: '#28a745' }}>✓ OK</span>
					  ) : (
						<span style={{ color: '#6c757d' }}>⸺ Нет превью</span>
					  )}
					</td>
					<td style={{ padding: '12px' }}>
					  {item.needs_link_refresh ? (
						<span style={{ color: '#ffc107', fontWeight: 'bold' }}>⚠️ Устарела</span>
					  ) : item.file_url ? (
						<span style={{ color: '#28a745' }}>✓ OK</span>
					  ) : (
						<span style={{ color: '#6c757d' }}>⸺ Нет ссылки</span>
					  )}
					</td>
					<td style={{ padding: '12px' }}>
					  {item.connection_count > 0 ? (
						<div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
						  {item.connections.slice(0, 3).map((conn, idx) => (
							<a
							  key={idx}
							  href={conn.entity_link}
							  target="_blank"
							  rel="noopener noreferrer"
							  title={`${getEntityTypeLabel(conn.entity_type)}: ${conn.entity_name}`}
							  style={{
								display: 'inline-block',
								padding: '3px 8px',
								backgroundColor: '#e3f2fd',
								color: '#007bff',
								borderRadius: '12px',
								fontSize: '11px',
								textDecoration: 'none',
								whiteSpace: 'nowrap'
							  }}
							>
							  {conn.entity_type.substring(0, 3)}
							</a>
						  ))}
						  {item.connection_count > 3 && (
							<span style={{
							  padding: '3px 8px',
							  backgroundColor: '#f8f9fa',
							  color: '#6c757d',
							  borderRadius: '12px',
							  fontSize: '11px'
							}}>
							  +{item.connection_count - 3}
							</span>
						  )}
						</div>
					  ) : (
						<span style={{ color: '#6c757d', fontStyle: 'italic' }}>Нет связей</span>
					  )}
					</td>
					<td style={{ padding: '12px', fontSize: '12px', color: '#666' }}>
					  {new Date(item.created_at).toLocaleDateString('ru-RU')}
					</td>
				  </tr>
				))}
			  </tbody>
			</table>
		  </div>
		</div>
        </div>
      )}

      {/* Модальное окно для просмотра медиа */}
      {showViewer && selectedMedia && (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.8)',
      zIndex: 1000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }} onClick={handleCloseViewer}>
      <div style={{
        position: 'relative',
        backgroundColor: 'white',
        borderRadius: '8px',
        maxWidth: '90vw',
        maxHeight: '90vh',
        overflow: 'auto'
      }} onClick={e => e.stopPropagation()}>
        <button
          onClick={handleCloseViewer}
          style={{
            position: 'absolute',
            top: '10px',
            right: '10px',
            backgroundColor: 'rgba(0,0,0,0.5)',
            color: 'white',
            border: 'none',
            borderRadius: '50%',
            width: '30px',
            height: '30px',
            fontSize: '20px',
            cursor: 'pointer',
            zIndex: 1001
          }}
        >
          ×
        </button>
        
        <div style={{ padding: '20px' }}>
          {/* Передаем selectedMedia напрямую в MediaViewer */}
          <MediaViewer media={selectedMedia} />
          
          {selectedMedia.connections && selectedMedia.connections.length > 0 && (
            <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
              <h4>Связанные сущности:</h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '10px' }}>
                {selectedMedia.connections.map((conn, idx) => (
                  <a
                    key={idx}
                    href={conn.entity_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      padding: '8px 12px',
                      backgroundColor: 'white',
                      border: '1px solid #dee2e6',
                      borderRadius: '6px',
                      textDecoration: 'none',
                      color: '#007bff',
                      fontSize: '14px'
                    }}
                  >
                    {getEntityTypeLabel(conn.entity_type)}: {conn.entity_name}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )}

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        .media-item:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 8px rgba(0,0,0,0.15);
        }
        
        a:hover {
          text-decoration: underline;
        }
      `}</style>
    </div>
  );
}

export default AllMediaPage;