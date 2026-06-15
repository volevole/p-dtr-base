// MediaManager.js
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMediaManager } from './hooks/useMediaManager';
import { MediaList } from './MediaList';
import MediaViewer from './MediaViewer';
import API_URL, { config } from './config/api'


console.log('[MediaManager] YANDEX_DISK_MODE from config:', config.YANDEX_DISK_MODE);
console.log('[MediaManager] YANDEX_PREVIEW_SIZE from config:', config.YANDEX_PREVIEW_SIZE);

/**
 * Универсальный компонент для управления медиафайлами
 * @param {Object} props
 * @param {string} props.entityType - Тип сущности (organ, muscle и т.д.)
 * @param {string} props.entityId - ID сущности
 * @param {string} props.entityName - Название сущности (для заголовка)
 * @param {boolean} props.showTitle - Показывать заголовок (по умолчанию true)
 * @param {string} props.className - Дополнительные CSS классы
 * @param {Object} props.style - Дополнительные стили
 */

function MediaManager({ 
  entityType, 
  entityId, 
  entityName = '',
  showTitle = true,
  className = '',
  style = {},
  readonly = false,
  viewMode = 'inline'  // новый пропс: 'modal' или 'inline'  после успешной отладки везде используем 'inline'
}) {
  // Используем хук для управления медиа
  const {
    media,
    loading,
    uploading,
    refreshingLinks,
    updatingPreviews,
    error,
    debugMessages,
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
    addDebugMessage,
    getThumbnailUrl,    
    getFileIcon,        
    clearDebugMessages
  } = useMediaManager(entityType, entityId);

  // Добавляем замер времени загрузки
    useEffect(() => {
      let startTime = 0;
      
      if (loading) {
        startTime = performance.now();
        console.log(`[MediaManager] ⏱️ Начало загрузки для ${entityType}/${entityId}`);
      } else if (!loading && media.length > 0) {
        const duration = performance.now() - startTime;
        console.log(`[MediaManager] ⏱️ Загрузка завершена за ${duration.toFixed(0)} мс, загружено ${media.length} файлов`);
      }
    }, [loading, media, entityType, entityId]);

  // Состояние компонента
  const [viewingMedia, setViewingMedia] = useState(null);
  const [deleteConfirmItem, setDeleteConfirmItem] = useState(null);
  const [editDescriptionItem, setEditDescriptionItem] = useState(null);
  const [descriptionText, setDescriptionText] = useState('');
  const [durationSeconds, setDurationSeconds] = useState(null);
  const [width, setWidth] = useState(null);
  const [height, setHeight] = useState(null);
  const [showDebugPanel, setShowDebugPanel] = useState(false);
  const [showAddMediaModal, setShowAddMediaModal] = useState(false);
  const [availableMedia, setAvailableMedia] = useState([]);
  const [loadingMedia, setLoadingMedia] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFileType, setSelectedFileType] = useState('');
  const [autoScrollDebug, setAutoScrollDebug] = useState(true);

  const navigate = useNavigate();

  // Реф для автоматической прокрутки логов
  const debugEndRef = useRef(null);

  // Автоматическая прокрутка при новых сообщениях
  useEffect(() => {
    if (debugEndRef.current && autoScrollDebug) {
      debugEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [debugMessages, autoScrollDebug]);

  // Обработчик клика по кнопке "Показать/скрыть отладку"
  const handleToggleDebugPanel = () => {
    setShowDebugPanel(!showDebugPanel);
  };

  // Загрузка доступных медиафайлов для связывания
  const loadAvailableMedia = async () => {
    try {
      setLoadingMedia(true);
      const files = await getAvailableMedia(searchTerm, selectedFileType, 50);
      setAvailableMedia(files);
    } catch (error) {
      console.error('Ошибка загрузки доступных медиа:', error);
      setAvailableMedia([]);
    } finally {
      setLoadingMedia(false);
    }
  };

  // Обработчик загрузки файла
  const handleFileUpload = async (file) => {
    if (readonly) return;
    try {
      await uploadFile(file, '');
    } catch (error) {
      alert(`Ошибка загрузки handleFileUpload: ${error.message}`);
    }
  };

  // Обработчик удаления файла
  const handleDeleteMedia = async (mediaId) => {
    if (readonly) return;
    try {
      await deleteFile(mediaId);
      setDeleteConfirmItem(null);
    } catch (error) {
      alert(`Ошибка удаления: ${error.message}`);
    }
  };

  // Обработчик клика на удаление
  const handleDeleteClick = (item) => {
    if (readonly) return;
    setDeleteConfirmItem(item);
  };

  // Подтверждение удаления
  const confirmDelete = () => {
    if (readonly) return;
    if (deleteConfirmItem) {
      handleDeleteMedia(deleteConfirmItem.id);
    }
  };

  // Отмена удаления
  const cancelDelete = () => {
    setDeleteConfirmItem(null);
  };

  // Начало редактирования описания
  const handleEditDescriptionClick = (item) => {
    if (readonly) return;
    setEditDescriptionItem(item);
    setDescriptionText(item.description || '');
    setDurationSeconds(item.duration_seconds || null);
    setWidth(item.width || null);
    setHeight(item.height || null);
  };

  // Сохранение описания
  const handleSaveDescription = () => {
    if (readonly) return;
    if (editDescriptionItem) {
      updateDescription(
        editDescriptionItem.id, 
        descriptionText,
        durationSeconds,
        width,
        height
      );
      setEditDescriptionItem(null);
    }
  };

  // Отмена редактирования описания
  const handleCancelDescriptionEdit = () => {
    setEditDescriptionItem(null);
    setDescriptionText('');
  };

  // Обновление порядка медиафайлов
  const handleUpdateMediaOrder = async (reorderedMedia) => {
    if (readonly) return;
    try {
      const orderedIds = reorderedMedia.map(item => item.id);
      await updateOrder(orderedIds);
    } catch (error) {
      alert(`Ошибка обновления порядка: ${error.message}`);
    }
  };

  // Обработчик связывания медиафайла
  const handleLinkMedia = async (mediaFileId) => {
    if (readonly) return;
    try {
      await linkMedia(mediaFileId);
      setShowAddMediaModal(false);
      setSearchTerm('');
      setSelectedFileType('');
    } catch (error) {
      alert(`Ошибка связывания: ${error.message}`);
    }
  };

  // Обработчик открытия модального окна
  const handleAddMediaClick = () => {
    if (readonly) return;
    setShowAddMediaModal(true);
    loadAvailableMedia();
  };

  // Используем debounce для поиска
  useEffect(() => {
    if (showAddMediaModal) {
      const timer = setTimeout(() => {
        loadAvailableMedia();
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [searchTerm, selectedFileType, showAddMediaModal]);

  // ============ ФУНКЦИЯ РЕНДЕРИНГА МЕДИА ============

// Функция для рендеринга сетки превью (общая для всех режимов)
const renderMediaGrid = (withControls = false) => {
  if (loading && media.length === 0) {
    return (
      <div style={{ 
        textAlign: 'center', 
        padding: '40px', 
        backgroundColor: '#f8f9fa', 
        borderRadius: '8px',
        marginBottom: '20px'
      }}>
        <div style={{ fontSize: '48px', marginBottom: '10px' }}>⏳</div>
        <p>Загрузка медиафайлов...</p>
      </div>
    );
  }

  if (media.length === 0) {
    return (
      <div style={{ 
        textAlign: 'center', 
        padding: '40px', 
        backgroundColor: '#f8f9fa', 
        borderRadius: '8px',
        marginBottom: '20px'
      }}>
        <div style={{ fontSize: '48px', marginBottom: '10px' }}>📷</div>
        <p>Нет медиафайлов</p>
      </div>
    );
  }

  return (
    <div style={{ 
      display: 'grid', 
      gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', 
      gap: '15px',
      marginBottom: '20px'
    }}>
      {media.map(item => {
        const thumbnailUrl = getThumbnailUrl(item);
        
        return (
          <div 
            key={item.id}
            style={{
              border: '1px solid #ddd',
              borderRadius: '8px',
              overflow: 'hidden',
              backgroundColor: 'white',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onClick={() => setViewingMedia(item)}
          >
            {/* Превью */}
            <div style={{ 
              height: '120px', 
              backgroundColor: '#f0f0f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '24px',
              overflow: 'hidden'
            }}>
              {thumbnailUrl ? (
                <img 
                  src={thumbnailUrl}
                  alt=""
                  style={{ 
                    width: '100%', 
                    height: '100%', 
                    objectFit: 'cover' 
                  }}
                  key={`thumb-${item.id}-${item.thumbnail_updated_at || 'no-date'}`}
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.parentElement.innerHTML = getFileIcon(item.file_type);
                  }}
                />
              ) : (
                getFileIcon(item.file_type)
              )}
            </div>
            
            {/* Информация о файле */}
            <div style={{ padding: '10px' }}>
              <div style={{ 
                fontWeight: 'bold', 
                whiteSpace: 'nowrap', 
                overflow: 'hidden', 
                textOverflow: 'ellipsis',
                fontSize: '12px'
              }}>
                {item.file_name}
              </div>
              
              <div style={{ 
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '11px',
                color: '#666',
                marginTop: '4px'
              }}>
                <span style={{
                  padding: '2px 6px',
                  backgroundColor: '#e9f7fe',
                  borderRadius: '4px',
                  fontWeight: 'bold'
                }}>
                  {item.file_type === 'image' ? 'Изобр.' :
                   item.file_type === 'video' ? 'Видео' :
                   item.file_type === 'audio' ? 'Аудио' : 'Док.'}
                </span>
                
                {item.file_size && (
                  <span>{formatFileSize(item.file_size)}</span>
                )}
              </div>
              
              {item.description && (
                <div style={{
                  marginTop: '4px',
                  fontSize: '10px',
                  color: '#888',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}>
                  {item.description}
                </div>
              )}
            </div>
            
            {/* Кнопки управления (только если withControls=true) */}
            {withControls && (
              <div style={{ 
                display: 'flex', 
                gap: '5px', 
                padding: '8px',
                borderTop: '1px solid #eee',
                backgroundColor: '#fafafa'
              }}>
                <button
                  onClick={() => handleEditDescriptionClick(item)}
                  style={{
                    flex: 1,
                    padding: '4px 8px',
                    backgroundColor: '#007bff',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '11px'
                  }}
                >
                  ✏️ Описание
                </button>
                <button
                  onClick={() => handleDeleteClick(item)}
                  style={{
                    flex: 1,
                    padding: '4px 8px',
                    backgroundColor: '#dc3545',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '11px'
                  }}
                >
                  🗑️ Удалить
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

  // MediaManager.js — исправленная функция renderMediaContent

// В renderMediaContent:
const renderMediaContent = () => {
  if (readonly) {
    // Режим только чтения: только сетка без кнопок
    return renderMediaGrid(false);
  } else {
    // Режим редактирования: сетка с кнопками + DnD
    return (
      <div>
        {renderMediaGrid(true)}
        
        <div style={{ marginTop: '20px', borderTop: '2px solid #eee', paddingTop: '20px' }}>
          <h4 style={{ marginBottom: '10px' }}>Управление файлами (перетаскивание для сортировки)</h4>
          <MediaList 
            items={media}
            onReorder={handleUpdateMediaOrder}
            onDelete={handleDeleteClick}
            onView={(item) => setViewingMedia(item)}
            onEditDescription={handleEditDescriptionClick}
            getThumbnailUrl={getThumbnailUrl}
          />
        </div>
      </div>
    );
  }
};




// ============ КОНЕЦ ФУНКЦИИ РЕНДЕРИНГА МЕДИА ============




  // Если нет entityType или entityId, не рендерим компонент
  if (!entityType || !entityId) {
    return (
      <div style={{ padding: '20px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
        <p style={{ color: '#666', textAlign: 'center' }}>
          Для работы медиаменеджера требуется entityType и entityId
        </p>
      </div>
    );
  }

  // Если загрузка и показывается отдельный блок загрузки
  if (loading && media.length === 0) {
    return (
      <div style={{ 
        borderTop: '2px solid #dee2e6', 
        paddingTop: '30px', 
        marginTop: '30px',
        ...style 
      }} className={className}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          {showTitle && <h3 style={{ margin: 0 }}>Медиафайлы {entityName}</h3>}
           
			  <button
				onClick={handleToggleDebugPanel}
				style={{
				  padding: '8px 16px',
				  backgroundColor: showDebugPanel ? '#6c757d' : '#f8f9fa',
				  color: showDebugPanel ? 'white' : '#495057',
				  border: '1px solid #dee2e6',
				  borderRadius: '6px',
				  cursor: 'pointer',
				  fontSize: '14px',
				  fontWeight: '500',
				  display: 'flex',
				  alignItems: 'center',
				  gap: '8px',
				  transition: 'all 0.2s ease'
				}}
				title="Показать/скрыть панель отладки"
			  >
				<span>{showDebugPanel ? '🔧' : '🔨'}</span>
				<span>{showDebugPanel ? 'Скрыть отладку' : 'Показать отладку'}</span>
			  </button>
		    
        </div>
        
        <div style={{ 
          textAlign: 'center', 
          padding: '40px', 
          backgroundColor: '#f8f9fa', 
          borderRadius: '8px' 
        }}>
          <div style={{ fontSize: '48px', marginBottom: '10px' }}>⏳</div>
          <p>Загрузка медиафайлов...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ 
      borderTop: '2px solid #dee2e6', 
      paddingTop: '30px', 
      marginTop: '30px',
      ...style 
    }} className={className}>
      
      {/* Заголовок с кнопкой отладки */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        {showTitle && <h3 style={{ margin: 0 }}>Медиафайлы {entityName}</h3>}
        
        {/* Кнопка отладки - всегда видна (даже в readonly) */}
        <button
          onClick={handleToggleDebugPanel}
          style={{
            padding: '8px 16px',
            backgroundColor: showDebugPanel ? '#6c757d' : '#f8f9fa',
            color: showDebugPanel ? 'white' : '#495057',
            border: '1px solid #dee2e6',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.2s ease'
          }}
          title="Показать/скрыть панель отладки"
        >
          <span>{showDebugPanel ? '🔧' : '🔨'}</span>
          <span>{showDebugPanel ? 'Скрыть отладку' : 'Показать отладку'}</span>
        </button>
      </div>
      
      <p style={{ color: '#666', marginBottom: '20px' }}>
        {readonly ? 'Медиафайлы (только просмотр)' : 'Загрузите изображения, видео или документы'}
      </p>

      {/* Панель отладки */}
      {showDebugPanel && (
        <div style={{ 
          marginBottom: '20px',
          border: '1px solid #dee2e6',
          borderRadius: '8px',
          overflow: 'hidden'
        }}>
          <div style={{ 
            backgroundColor: '#f8f9fa',
            padding: '15px',
            borderBottom: '1px solid #dee2e6',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div style={{ fontWeight: 'bold', color: '#495057' }}>
              Логи отладки ({debugMessages.length} сообщений)
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '14px' }}>
                <input
                  type="checkbox"
                  checked={autoScrollDebug}
                  onChange={(e) => setAutoScrollDebug(e.target.checked)}
                  style={{ margin: 0 }}
                />
                Автопрокрутка
              </label>
              <button
                onClick={clearDebugMessages}
                style={{
                  padding: '4px 12px',
                  backgroundColor: '#dc3545',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Очистить логи
              </button>
            </div>
          </div>
          
          <div style={{ 
            backgroundColor: '#212529',
            color: '#f8f9fa',
            fontFamily: 'Monaco, Consolas, monospace',
            fontSize: '13px',
            padding: '15px',
            maxHeight: '400px',
            overflowY: 'auto',
            whiteSpace: 'pre-wrap',
            lineHeight: '1.5'
          }}>
            {debugMessages.length === 0 ? (
              <div style={{ color: '#6c757d', fontStyle: 'italic' }}>
                Нет сообщений отладки. Действия с медиафайлами появятся здесь.
              </div>
            ) : (
              debugMessages.map((msg, index) => (
                <div key={index} style={{ marginBottom: '8px' }}>
                  {msg}
                </div>
              ))
            )}
            <div ref={debugEndRef} />
          </div>
        </div>
      )}

      {/* Отображаем медиафайлы через функцию renderMediaContent */}
      {renderMediaContent()}

      {/* Основные кнопки действий с медиа - ТОЛЬКО если не readonly */}
      {!readonly && (
        <div style={{ 
          display: 'flex', 
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          marginTop: '30px',
          padding: '25px',
          backgroundColor: '#f8f9fa',
          borderRadius: '10px',
          gap: '40px',
          flexWrap: 'wrap'
        }}>
          {/* Левая часть: Основные кнопки */}
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '15px',
            flex: '1 1 300px',
            maxWidth: '350px'
          }}>
            {/* Кнопка 1: Загрузить файл */}
            <div>
              <input 
                type="file" 
                id={`${entityType}-media-upload`}
                accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt,.md"
                onChange={(e) => handleFileUpload(e.target.files[0])}
                disabled={uploading}
                style={{ display: 'none' }}
              />
              
              <button
                onClick={() => document.getElementById(`${entityType}-media-upload`).click()}
                disabled={uploading}
                style={{
                  display: 'inline-block',
                  padding: '14px 20px',
                  backgroundColor: uploading ? '#ccc' : '#007bff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: uploading ? 'not-allowed' : 'pointer',
                  fontWeight: 'bold',
                  fontSize: '16px',
                  textAlign: 'center',
                  width: '100%',
                  boxShadow: '0 3px 10px rgba(0, 123, 255, 0.3)',
                  transition: 'all 0.2s ease',
                  minHeight: '50px'
                }}
                onMouseEnter={(e) => {
                  if (!uploading) e.target.style.backgroundColor = '#0056b3';
                }}
                onMouseLeave={(e) => {
                  if (!uploading) e.target.style.backgroundColor = '#007bff';
                }}
              >
                {uploading ? '📤 Загрузка...' : '📁 Загрузить файл'}
              </button>
              <div style={{ 
                fontSize: '13px', 
                color: '#666',
                marginTop: '8px',
                textAlign: 'center'
              }}>
                Выберите файл с компьютера
              </div>
            </div>

            {/* Кнопка 2: Добавить медиа */}
            <div>
              <button
                onClick={handleAddMediaClick}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  padding: '14px 20px',
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  fontSize: '16px',
                  width: '100%',
                  boxShadow: '0 3px 10px rgba(108, 117, 125, 0.3)',
                  transition: 'all 0.2s ease',
                  minHeight: '50px'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#5a6268';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = '#6c757d';
                }}
              >
                <span>➕</span>
                <span>Добавить медиа</span>
              </button>
              <div style={{ 
                fontSize: '13px', 
                color: '#666',
                marginTop: '8px',
                textAlign: 'center'
              }}>
                Добавить существующий файл
              </div>
            </div>
          </div>

          {/* Правая часть: Сервисные кнопки */}
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '15px',
            flex: '1 1 300px',
            maxWidth: '350px'
          }}>
            {/* Кнопка обновления превью */}
            {media.length > 0 && (
              <div>
                <button 
                  onClick={updatePreviews}
                  disabled={updatingPreviews || uploading}
                  title="Обновить отсутствующие превью для PDF и видео файлов"
                  style={{
                    padding: '12px 18px',
                    backgroundColor: updatingPreviews ? '#e2e3e5' : '#e9f7fe',
                    color: updatingPreviews ? '#6c757d' : '#17a2b8',
                    border: '1px solid #b6d4fe',
                    borderRadius: '8px',
                    cursor: (updatingPreviews || uploading) ? 'not-allowed' : 'pointer',
                    fontWeight: 'bold',
                    fontSize: '15px',
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    transition: 'all 0.2s ease',
                    minWidth: '200px'
                  }}
                  onMouseEnter={(e) => {
                    if (!updatingPreviews && !uploading) {
                      e.target.style.backgroundColor = '#d1ecf1';
                      e.target.style.borderColor = '#bee5eb';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!updatingPreviews && !uploading) {
                      e.target.style.backgroundColor = '#e9f7fe';
                      e.target.style.borderColor = '#b6d4fe';
                    }
                  }}
                >
                  {updatingPreviews ? (
                    <>
                      <span>⏳</span>
                      <span>Обновление...</span>
                    </>
                  ) : (
                    <>
                      <span>🔄</span>
                      <span>Обновить превью</span>
                    </>
                  )}
                </button>
                <div style={{ 
                  fontSize: '13px', 
                  color: '#666',
                  marginTop: '8px',
                  textAlign: 'center'
                }}>
                  Для PDF и видео без превью
                </div>
              </div>
            )}

            {/* Кнопка обновления ссылок */}
            {media.length > 0 && (
              <div>
                <button 
                  onClick={refreshLinks}
                  disabled={refreshingLinks || uploading}
                  title="Ссылки на Яндекс Диске устаревают каждые 12 часов, их нужно периодически обновлять"
                  style={{
                    padding: '12px 18px',
                    backgroundColor: refreshingLinks ? '#e2e3e5' : '#f0f9ff',
                    color: refreshingLinks ? '#6c757d' : '#28a745',
                    border: '1px solid #c3e6cb',
                    borderRadius: '8px',
                    cursor: (refreshingLinks || uploading) ? 'not-allowed' : 'pointer',
                    fontWeight: 'bold',
                    fontSize: '15px',
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    transition: 'all 0.2s ease',
                    minWidth: '200px'
                  }}
                  onMouseEnter={(e) => {
                    if (!refreshingLinks && !uploading) {
                      e.target.style.backgroundColor = '#d4edda';
                      e.target.style.borderColor = '#c3e6cb';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!refreshingLinks && !uploading) {
                      e.target.style.backgroundColor = '#f0f9ff';
                      e.target.style.borderColor = '#c3e6cb';
                    }
                  }}
                >
                  {refreshingLinks ? (
                    <>
                      <span>⏳</span>
                      <span>Обновление...</span>
                    </>
                  ) : (
                    <>
                      <span>🔄</span>
                      <span>Обновить ссылки Яндекс Диска</span>
                    </>
                  )}
                </button>
                <div style={{ 
                  fontSize: '13px', 
                  color: '#666',
                  marginTop: '8px',
                  textAlign: 'center'
                }}>
                  Обновить устаревшие ссылки на файлы и превью
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Модальные окна */}

      {/* Модальное окно просмотра медиа — полноэкранное */}
    {viewingMedia && (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'black',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000
      }} onClick={() => setViewingMedia(null)}>
        <div style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }} onClick={e => e.stopPropagation()}>
          
          {/* Кнопка закрытия */}
          <button 
            onClick={() => setViewingMedia(null)}
            style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              zIndex: 100,
              padding: '8px 16px',
              backgroundColor: 'rgba(0,0,0,0.5)',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '16px'
            }}
          >
            ✖ Закрыть
          </button>
          
          {/* Контент на весь экран */}
          <MediaViewer media={viewingMedia} />
        </div>
      </div>
    )}

      {/* Модальное окно подтверждения удаления */}
      {deleteConfirmItem && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }} onClick={cancelDelete}>
          <div style={{
            backgroundColor: 'white',
            padding: '25px',
            borderRadius: '12px',
            textAlign: 'center'
          }} onClick={e => e.stopPropagation()}>
            <h3 style={{ color: '#d32f2f' }}>Подтверждение удаления</h3>
            <p>Удалить {deleteConfirmItem.file_type === 'image' ? 'изображение' : 'файл'}?</p>
            <p style={{ fontSize: '14px', color: '#666' }}>
              {deleteConfirmItem.file_name}
            </p>
            <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', marginTop: '20px' }}>
              <button onClick={cancelDelete} style={{ padding: '10px 20px', backgroundColor: '#757575', color: 'white', border: 'none', borderRadius: '6px' }}>
                Отмена
              </button>
              <button onClick={confirmDelete} style={{ padding: '10px 20px', backgroundColor: '#d32f2f', color: 'white', border: 'none', borderRadius: '6px' }}>
                Удалить
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно редактирования описания */}
      {editDescriptionItem && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }} onClick={handleCancelDescriptionEdit}>
          <div style={{
            backgroundColor: 'white',
            padding: '25px',
            borderRadius: '8px',
            width: '400px',
            maxWidth: '90vw',
            maxHeight: '90vh',
            overflowY: 'auto'
          }} onClick={e => e.stopPropagation()}>
            <h4 style={{ marginBottom: '20px', color: '#333' }}>
              Редактирование медиафайла
            </h4>
            
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                Описание:
              </label>
              <textarea
                value={descriptionText}
                onChange={(e) => setDescriptionText(e.target.value)}
                placeholder="Введите описание файла..."
                style={{
                  width: '100%',
                  height: '100px',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  resize: 'vertical',
                  fontSize: '14px'
                }}
                autoFocus
              />
            </div>
            
            {editDescriptionItem.file_type === 'video' && (
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                  Длительность видео (секунды):
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={durationSeconds || ''}
                  onChange={(e) => setDurationSeconds(e.target.value ? parseInt(e.target.value) : null)}
                  placeholder="Например: 120"
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '14px'
                  }}
                />
              </div>
            )}
            
            {(editDescriptionItem.file_type === 'video' || editDescriptionItem.file_type === 'image') && (
              <div style={{ 
                marginBottom: '20px',
                padding: '15px',
                backgroundColor: '#f8f9fa',
                borderRadius: '4px'
              }}>
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: '1fr 1fr', 
                  gap: '15px',
                  marginBottom: '15px'
                }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                      Ширина (px):
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={width || ''}
                      onChange={(e) => setWidth(e.target.value ? parseInt(e.target.value) : null)}
                      placeholder="Например: 1920"
                      style={{
                        width: '100%',
                        padding: '10px',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        fontSize: '14px'
                      }}
                    />
                  </div>
                  
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                      Высота (px):
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={height || ''}
                      onChange={(e) => setHeight(e.target.value ? parseInt(e.target.value) : null)}
                      placeholder="Например: 1080"
                      style={{
                        width: '100%',
                        padding: '10px',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        fontSize: '14px'
                      }}
                    />
                  </div>
                </div>
              </div>
            )}
            
            {editDescriptionItem.file_size && (
              <div style={{ 
                marginBottom: '20px',
                padding: '10px',
                backgroundColor: '#e9f7fe',
                borderRadius: '4px',
                fontSize: '13px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#0066cc' }}>Размер файла:</span>
                  <span style={{ fontWeight: '500' }}>
                    {formatFileSize(editDescriptionItem.file_size)}
                  </span>
                </div>
              </div>
            )}
            
            <div style={{ 
              display: 'flex', 
              gap: '15px', 
              justifyContent: 'flex-end',
              marginTop: '25px'
            }}>
              <button 
                onClick={handleCancelDescriptionEdit}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                Отмена
              </button>
              <button 
                onClick={handleSaveDescription}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#007bff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                Сохранить
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Модальное окно для добавления существующего медиа */}
      {showAddMediaModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1001
        }} onClick={() => setShowAddMediaModal(false)}>
          <div style={{
            backgroundColor: 'white',
            padding: '30px',
            borderRadius: '12px',
            maxWidth: '900px',
            width: '90vw',
            maxHeight: '80vh',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
          }} onClick={e => e.stopPropagation()}>
            <h3 style={{ marginTop: 0, marginBottom: '20px' }}>
              Выберите медиафайл для добавления
            </h3>
            
            {/* Фильтры поиска */}
            <div style={{ 
              marginBottom: '20px',
              display: 'flex',
              gap: '15px',
              flexWrap: 'wrap'
            }}>
              <div style={{ flex: 1, minWidth: '250px' }}>
                <input
                  type="text"
                  placeholder="Поиск по названию или описанию..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 15px',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                />
              </div>
              
              <div style={{ minWidth: '150px' }}>
                <select
                  value={selectedFileType}
                  onChange={(e) => setSelectedFileType(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 15px',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    fontSize: '14px',
                    backgroundColor: 'white'
                  }}
                >
                  <option value="">Все типы</option>
                  <option value="image">Изображения</option>
                  <option value="video">Видео</option>
                  <option value="audio">Аудио</option>
                  <option value="document">Документы</option>
                </select>
              </div>
              
              <button
                onClick={loadAvailableMedia}
                disabled={loadingMedia}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#17a2b8',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >
                {loadingMedia ? '🔄 Поиск...' : '🔍 Обновить'}
              </button>
            </div>
            
            {/* Список медиафайлов */}
            <div style={{ 
              flex: 1,
              overflowY: 'auto',
              border: '1px solid #eee',
              borderRadius: '6px',
              padding: '10px',
              backgroundColor: '#f8f9fa'
            }}>
              {loadingMedia ? (
                <div style={{ 
                  textAlign: 'center', 
                  padding: '40px',
                  color: '#666'
                }}>
                  Загрузка медиафайлов...
                </div>
              ) : availableMedia.length === 0 ? (
                <div style={{ 
                  textAlign: 'center', 
                  padding: '40px',
                  color: '#666'
                }}>
                  {searchTerm || selectedFileType 
                    ? 'Медиафайлы не найдены по вашему запросу' 
                    : 'Нет доступных медиафайлов для добавления'}
                </div>
              ) : (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                  gap: '15px'
                }}>
                  {availableMedia.map(file => (
                    <div 
                      key={file.id}
                      style={{
                        border: '1px solid #ddd',
                        borderRadius: '8px',
                        overflow: 'hidden',
                        backgroundColor: 'white',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                      onClick={() => handleLinkMedia(file.id)}
                      onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'}
                      onMouseLeave={(e) => e.currentTarget.style.boxShadow = 'none'}
                    >
                      {/* Превью */}
                      <div style={{ 
						  height: '120px', 
						  backgroundColor: '#f0f0f0',
						  display: 'flex',
						  alignItems: 'center',
						  justifyContent: 'center',
						  fontSize: '24px',
						  overflow: 'hidden'
						}}>
						  {(() => {
							// Используем функцию getThumbnailUrl из хука
							const thumbnailUrl = getThumbnailUrl(file);
							
							if (thumbnailUrl) {
							  return (
								<img 
								  src={thumbnailUrl}
								  alt=""
								  style={{ 
									width: '100%', 
									height: '100%', 
									objectFit: 'cover' 
								  }}
								  onError={(e) => {
									// Если изображение не загрузилось, показываем иконку
									e.target.style.display = 'none';
									e.target.parentElement.innerHTML = getFileIcon(file.file_type);
								  }}
								/>
							  );
							} else {
							  return getFileIcon(file.file_type);
							}
						  })()}
						</div>
                      
                      {/* Информация */}
                      <div style={{ 
                        padding: '10px',
                        fontSize: '12px'
                      }}>
                        <div style={{ 
                          fontWeight: 'bold',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          marginBottom: '4px'
                        }}  title={file.file_name} >
                          {file.file_name}
                        </div>
                        
                        <div style={{ 
                          display: 'flex',
                          justifyContent: 'space-between',
                          fontSize: '11px',
                          color: '#666'
                        }}>
                          <span style={{
                            padding: '2px 6px',
                            backgroundColor: '#e9f7fe',
                            borderRadius: '4px',
                            fontWeight: 'bold'
                          }}>
                            {file.file_type === 'image' ? 'Изобр.' :
                             file.file_type === 'video' ? 'Видео' :
                             file.file_type === 'audio' ? 'Аудио' : 'Док.'}
                          </span>
                          
                          {file.file_size && (
                            <span>
                              {formatFileSize(file.file_size)}
                            </span>
                          )}
                        </div>
                        
                        {file.description && (
                          <div style={{
                            marginTop: '4px',
                            fontSize: '10px',
                            color: '#888',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}>
                            {file.description}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {/* Кнопки */}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between',
              marginTop: '20px',
              paddingTop: '20px',
              borderTop: '1px solid #eee'
            }}>
              <button 
                onClick={() => setShowAddMediaModal(false)}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >
                Отмена
              </button>
              
              <div style={{ 
                fontSize: '13px', 
                color: '#666',
                textAlign: 'right'
              }}>
                Найдено: {availableMedia.length} файлов
                <br />
                <span style={{ fontSize: '12px' }}>
                  Кликните на файл для добавления
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MediaManager;