// SortableItem.js — исправленная версия
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

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    width: '150px',
    height: '250px',
    position: 'relative',
    backgroundColor: '#f8f9fa',
    borderRadius: '8px',
    overflow: 'hidden',
    boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
    cursor: 'grab',
    display: 'flex',
    flexDirection: 'column',
  };

  // Используем готовый thumbnailUrl из item
  const thumbnailUrl = item.thumbnailUrl;
  const fileTypeIcon = item.fileTypeIcon;
  const formattedSize = item.formattedSize;

  // Функция для рендеринга thumbnail
 // SortableItem.js — никакой логики получения URL, только отображение
const renderThumbnail = () => {
  // thumbnailUrl уже вычислен в MediaList и передан через item
  const thumbnailUrl = item.thumbnailUrl;
  
  if (thumbnailUrl) {
    return (
      <img
        src={thumbnailUrl}
        alt=""
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        onError={(e) => {
          e.target.style.display = 'none';
          e.target.parentElement.innerHTML = getFileTypeIcon(item.file_type);
        }}
      />
    );
  }
  
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
};

  // Вспомогательные функции
  const getFileTypeIcon = (fileType) => {
    switch (fileType) {
      case 'image': return '🖼️';
      case 'video': return '🎬';
      case 'audio': return '🎵';
      case 'document': return '📄';
      default: return '📎';
    }
  };

  const formatDuration = (seconds) => {
    if (!seconds) return '';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Не обновлялась';
    const date = new Date(dateString);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    if (isToday) {
      return `Сегодня в ${date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`;
    }
    return date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const getShortFileName = () => {
  if (!item.file_name) return 'Без названия';
  
  // Получаем оригинальное имя файла (последнюю часть после последнего '_')
  const parts = item.file_name.split('_');
  
  // Если есть timestamp (число из 13 цифр в конце), берём имя до него
  for (let i = parts.length - 1; i >= 0; i--) {
    if (/^\d+$/.test(parts[i]) && parts[i].length >= 13) {
      // Это timestamp, берём всё, что до него
      const nameParts = parts.slice(0, i);
      if (nameParts.length > 0) {
        return nameParts.join('_');
      }
      break;
    }
  }
  
  // Если не нашли timestamp, показываем оригинальное имя (обрезаем если длинное)
  if (item.file_name.length > 30) {
    return item.file_name.substring(0, 27) + '...';
  }
  
  return item.file_name;
};

  const getFileTypeDisplay = () => {
    switch (item.file_type) {
      case 'image': return 'Изображение';
      case 'video': return 'Видео';
      case 'audio': return 'Аудио';
      case 'document': return 'Документ';
      default: return 'Файл';
    }
  };

  useEffect(() => {
    setThumbnailError(false);
    setImageError(false);
  }, [item.id, item.thumbnail_url]);

  // Обработчики с двойным кликом
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

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      role="button"
      tabIndex={0}
    >
      <div 
        style={{ 
          width: '100%', 
          height: '150px', 
          position: 'relative', 
          cursor: 'pointer',
          flexShrink: 0
        }} 
        onDoubleClick={handleDoubleClickView}
      >
        {renderThumbnail()}
  
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
          {fileTypeIcon || getFileTypeIcon(item.file_type)}
        </div>
        
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
            {formattedSize}
          </div>
        )}
      </div>
      
      <div style={{ 
        padding: '10px 8px 8px 8px',
        fontSize: '10px',
        color: '#444',
        lineHeight: '1.5',
        backgroundColor: 'white',
        flexGrow: 1,
        borderTop: '1px solid #eee',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        minHeight: '90px'
      }}>
        <div style={{ marginBottom: '4px' }}>
          <span style={{ fontWeight: 'bold', color: '#333' }}>Тип:</span> 
          <span style={{ marginLeft: '4px' }}>{getFileTypeDisplay()}</span>
        </div>
        
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
          <div style={{ marginBottom: '4px', minHeight: '16px' }} />
        )}
        
        <div style={{ marginBottom: '4px' }}>
          <span style={{ fontWeight: 'bold', color: '#333' }}>Загружен:</span> 
          <span style={{ marginLeft: '4px' }}>{formatDate(item.created_at)}</span>
        </div>
        
        <div style={{ 
          marginTop: 'auto',
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