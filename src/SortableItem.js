// SortableItem.js
import React, { useState, useEffect } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import API_URL from './config/api';

export function SortableItem({ 
  id, 
  item, 
  onDelete, 
  onView, 
  onEditDescription
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const [thumbnailError, setThumbnailError] = useState(false);
  const [imageError, setImageError] = useState(false);

  // Увеличиваем высоту для 4 строк информации
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    width: '150px',
    height: '250px', // Увеличили с 210px до 240px
    position: 'relative',
    backgroundColor: '#f8f9fa',
    borderRadius: '8px',
    overflow: 'hidden',
    boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
    cursor: 'grab',
    display: 'flex',
    flexDirection: 'column',
  };


  // Функция для получения URL для thumbnail
  const getThumbnailUrl = () => {
    // Если есть thumbnail_url от Яндекс.Диска
    if (item.thumbnail_url) {
      return `${API_URL}/api/proxy-image?url=${encodeURIComponent(item.thumbnail_url)}`;
    }
    
    // Для изображений используем само изображение
    if (item.file_type === 'image' && item.public_url) {
      return `${API_URL}/api/proxy-image?url=${encodeURIComponent(item.public_url)}`;
    }
    
    return null;
  };

  // Функция для получения URL для изображения
  const getImageUrl = () => {
    if (item.proxyUrl) {
      return item.proxyUrl;
    }
    
    if (item.file_type === 'image' && item.public_url) {
      return `${API_URL}/api/proxy-image?url=${encodeURIComponent(item.public_url)}`;
    }
    
    return item.file_url;
  };

  // Функция для рендеринга thumbnail
  const renderThumbnail = () => {
    const thumbnailUrl = getThumbnailUrl();
    const imageUrl = getImageUrl();
    
    // Для видео с thumbnail от Яндекс.Диска
    if (item.file_type === 'video' && thumbnailUrl && !thumbnailError) {
      return (
        <div style={{ position: 'relative', width: '100%', height: '100%' }}>
          <img
            src={thumbnailUrl}
            alt="Video thumbnail"
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            onError={() => setThumbnailError(true)}
          />
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            fontSize: '24px',
            color: 'white',
            background: 'rgba(0,0,0,0.5)',
            borderRadius: '50%',
            width: '40px',
            height: '40px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            ▶
          </div>
          {/* Длительность видео */}
          {item.duration_seconds && (
            <div style={{
              position: 'absolute',
              bottom: '5px',
              right: '5px',
              background: 'rgba(0,0,0,0.7)',
              color: 'white',
              padding: '2px 6px',
              borderRadius: '3px',
              fontSize: '10px'
            }}>
              {formatDuration(item.duration_seconds)}
            </div>
          )}
        </div>
      );
    }
    
    // Для PDF с thumbnail от Яндекс.Диска
    if (item.file_type === 'document' && thumbnailUrl && !thumbnailError) {
      return (
        <img
          src={thumbnailUrl}
          alt="Document preview"
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          onError={() => setThumbnailError(true)}
        />
      );
    }
    
    // Для видео без thumbnail (иконка)
    if (item.file_type === 'video') {
      return (
        <div style={{
          width: '100%',
          height: '100%',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative'
        }}>
          <div style={{ fontSize: '32px', color: 'white' }}>▶</div>
          {item.duration_seconds && (
            <div style={{
              position: 'absolute',
              bottom: '5px',
              right: '5px',
              background: 'rgba(0,0,0,0.7)',
              color: 'white',
              padding: '2px 6px',
              borderRadius: '3px',
              fontSize: '10px'
            }}>
              {formatDuration(item.duration_seconds)}
            </div>
          )}
        </div>
      );
    }
    
    // Для изображений
    if (item.file_type === 'image') {
      if (imageUrl && !imageError) {
        return (
          <img
            src={imageUrl}
            alt={item.description || `Изображение ${item.id}`}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            onError={() => setImageError(true)}
          />
        );
      } else {
        // Fallback на иконку
        return (
          <div style={{
            width: '100%',
            height: '100%',
            backgroundColor: '#f0f0f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '24px'
          }}>
            {getFileTypeIcon(item.file_type)}
          </div>
        );
      }
    }
    
    // Для остальных типов файлов - иконка
    return (
      <div style={{
        width: '100%',
        height: '100%',
        backgroundColor: '#f0f0f0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '24px'
      }}>
        {getFileTypeIcon(item.file_type)}
      </div>
    );
  };

  // Функция для получения иконки типа файла
  const getFileTypeIcon = (fileType) => {
    switch (fileType) {
      case 'image':
        return '🖼️';
      case 'video':
        return '🎬';
      case 'audio':
        return '🎵';
      case 'document':
        return '📄';
      default:
        return '📎';
    }
  };

  // Функция для форматирования даты
  const formatDate = (dateString) => {
    if (!dateString) return 'Не обновлялась';
    
    try {
      const date = new Date(dateString);
      const now = new Date();
      const isToday = date.toDateString() === now.toDateString();
      
      if (isToday) {
        return `Сегодня в ${date.toLocaleTimeString('ru-RU', { 
          hour: '2-digit', 
          minute: '2-digit' 
        })}`;
      } else {
        return date.toLocaleDateString('ru-RU', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        });
      }
    } catch (error) {
      return 'Ошибка даты';
    }
  };

  // Функция для форматирования длительности
  const formatDuration = (seconds) => {
    if (!seconds) return '';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Функция для форматирования размера файла
  const formatFileSize = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  // Обработчики событий
  const handleDoubleClickDelete = (e) => {
    e.preventDefault();
    e.stopPropagation();
    onDelete(item);
  };

  const handleDoubleClickEdit = (e) => {
    e.preventDefault();
    e.stopPropagation();
    onEditDescription(item);
  };

  const handleDoubleClickView = (e) => {
    e.preventDefault();
    e.stopPropagation();
    onView(item);
  };

  // Получаем информацию о типе файла
  const getFileTypeDisplay = () => {
    switch (item.file_type) {
      case 'image':
        return 'Изображение';
      case 'video':
        return 'Видео';
      case 'audio':
        return 'Аудио';
      case 'document':
        return 'Документ';
      default:
        return 'Файл';
    }
  };

  // Функция для сокращения имени файла (убираем префикс)
  const getShortFileName = () => {
    if (!item.file_name) return 'Без названия';
    
    // Убираем префикс типа "organ_00d45015-6527-4507-bba0-e6de8f783ba7_1767266616752.jpg"
    const parts = item.file_name.split('_');
    
    if (parts.length > 2) {
      // Оставляем только последнюю часть с timestamp и расширением
      const timestampPart = parts[parts.length - 1];
      const extension = timestampPart.split('.').pop();
      const timestamp = timestampPart.split('.')[0];
      
      // Форматируем дату из timestamp, если это timestamp
      if (timestamp.length >= 13) {
        try {
          const date = new Date(parseInt(timestamp));
          const formattedDate = date.toLocaleDateString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
          });
          return `Загружен ${formattedDate}.${extension}`;
        } catch (e) {
          // Если не удалось распарсить timestamp
        }
      }
      
      // Или показываем только расширение
      return `Файл.${extension}`;
    }
    
    // Или показываем оригинальное имя, если оно короткое
    if (item.file_name.length > 20) {
      return item.file_name.substring(0, 17) + '...';
    }
    
    return item.file_name;
  };

  // Сбрасываем состояние ошибок при смене item
  useEffect(() => {
    setThumbnailError(false);
    setImageError(false);
  }, [item.id]);

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      role="button"
      tabIndex={0}
      aria-disabled={false}
      aria-roledescription="sortable"
    >
      {/* Контейнер для thumbnail */}
      <div 
        style={{ 
          width: '100%', 
          height: '150px', 
          position: 'relative', 
          cursor: 'pointer',
          flexShrink: 0
        }} 
        onDoubleClick={handleDoubleClickView}
        title="Двойной клик для просмотра"
      >
        {renderThumbnail()}
        
        {/* Иконка типа файла в углу */}
        <div style={{
          position: 'absolute',
          top: '8px',
          left: '8px',
          background: 'rgba(0, 0, 0, 0.6)',
          color: 'white',
          borderRadius: '4px',
          padding: '2px 6px',
          fontSize: '10px',
          fontWeight: 'bold',
          zIndex: 2
        }}>
          {getFileTypeIcon(item.file_type)}
        </div>
        
        {/* Кнопка редактирования описания */}
        <button
          title="Двойной клик для редактирования описания"
          style={{
            position: 'absolute',
            top: '8px',
            left: '40px',
            background: 'rgba(0, 123, 255, 0.8)',
            color: 'white',
            border: 'none',
            borderRadius: '50%',
            width: '24px',
            height: '24px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '12px',
            zIndex: 2,
          }}
          onDoubleClick={handleDoubleClickEdit}
        >
          ✏️
        </button>
        
        {/* Кнопка удаления */}
        <button
          title="Двойной клик для удаления"
          style={{
            position: 'absolute',
            top: '8px',
            right: '8px',
            background: 'rgba(255, 0, 0, 0.8)',
            color: 'white',
            border: 'none',
            borderRadius: '50%',
            width: '24px',
            height: '24px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '14px',
            zIndex: 2,
          }}
          onDoubleClick={handleDoubleClickDelete}
        >
          ×
        </button>
        
        {/* Описание файла */}
        {item.description && (
          <div
            title={item.description}
            style={{
              position: 'absolute',
              bottom: '0px',
              left: '0px',
              right: '0px',
              background: 'rgba(0, 0, 0, 0.7)',
              color: 'white',
              padding: '4px',
              fontSize: '10px',
              textAlign: 'center',
              maxHeight: '30px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {item.description}
          </div>
        )}
        
        {/* Размер файла */}
        {item.file_size && (
          <div style={{
            position: 'absolute',
            bottom: '4px',
            right: '4px',
            background: 'rgba(0, 0, 0, 0.6)',
            color: 'white',
            padding: '1px 4px',
            borderRadius: '3px',
            fontSize: '9px',
            zIndex: 1
          }}>
            {formatFileSize(item.file_size)}
          </div>
        )}
      </div>
      
      {/* Блок с информацией - УВЕЛИЧЕН для 4 строк */}
      <div style={{ 
        padding: '10px 8px 8px 8px', // Увеличили верхний padding
        fontSize: '10px',
        color: '#444',
        lineHeight: '1.5', // Увеличили межстрочный интервал
        backgroundColor: 'white',
        flexGrow: 1,
        borderTop: '1px solid #eee',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        minHeight: '90px' // Минимальная высота для 4 строк
      }}>
        {/* Первая строка: Тип файла */}
        <div style={{ marginBottom: '4px' }}>
          <span style={{ fontWeight: 'bold', color: '#333' }}>Тип:</span> 
          <span style={{ marginLeft: '4px' }}>{getFileTypeDisplay()}</span>
        </div>
        
        {/* Вторая строка: Длительность видео ИЛИ Размеры изображения */}
        {item.duration_seconds ? (
          <div style={{ marginBottom: '4px' }}>
            <span style={{ fontWeight: 'bold', color: '#333' }}>Длительность:</span> 
            <span style={{ marginLeft: '4px' }}>{formatDuration(item.duration_seconds)}</span>
          </div>
        ) : item.width && item.height ? (
          <div style={{ marginBottom: '4px' }}>
            <span style={{ fontWeight: 'bold', color: '#333' }}>Размеры:</span> 
            <span style={{ marginLeft: '4px' }}>{item.width} × {item.height}px</span>
          </div>
        ) : (
          <div style={{ marginBottom: '4px', minHeight: '16px' }}>
            {/* Пустая строка для выравнивания */}
          </div>
        )}
        
        {/* Третья строка: Дата загрузки */}
        <div style={{ marginBottom: '4px' }}>
          <span style={{ fontWeight: 'bold', color: '#333' }}>Загружен:</span> 
          <span style={{ marginLeft: '4px' }}>{formatDate(item.created_at)}</span>
        </div>
        
        {/* Четвертая строка: Имя файла (в самом конце) */}
        <div style={{ 
          marginTop: 'auto', // Прижимаем к низу
          paddingTop: '3px',
          borderTop: '1px dashed #eee',
          fontSize: '9px',
          color: '#888'
        }}>
          <div style={{ 
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}>
            {getShortFileName()}
          </div>
        </div>
        
        {/* Пятая строка (опционально): Дата обновления, если отличается от загрузки */}
        {item.updated_at && item.updated_at !== item.created_at && (
          <div style={{ 
            marginTop: '2px',
            fontSize: '9px',
            color: '#999',
            fontStyle: 'italic'
          }}>
            <span>Обновлен: </span>
            <span>{formatDate(item.updated_at)}</span>
          </div>
        )}
      </div>
    </div>
  );
}