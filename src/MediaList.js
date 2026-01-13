// MediaList.js
import React from 'react';
import { DndContext, closestCenter } from '@dnd-kit/core';
import { 
  SortableContext, 
  horizontalListSortingStrategy, 
  arrayMove 
} from '@dnd-kit/sortable';
import { SortableItem } from './SortableItem';
import API_URL from './config/api';

export function MediaList({ items, onReorder, onDelete, onView, onEditDescription }) {
  

  /**
   * Получает URL для thumbnail медиафайла
   * @param {Object} item - Объект медиа
   * @returns {string|null} - URL thumbnail или null
   */
  const getThumbnailUrl = (item) => {
    // Если есть thumbnail_url, используем его через прокси
    if (item.thumbnail_url) {
      return `${API_URL}/api/proxy-image?url=${encodeURIComponent(item.thumbnail_url)}`;
    }
    
    // Если это изображение и есть public_url, используем его как thumbnail
    if (item.file_type === 'image' && item.public_url) {
      return `${API_URL}/api/proxy-image?url=${encodeURIComponent(item.public_url)}`;
    }
    
    return null;
  };

  /**
   * Получает иконку для типа файла
   * @param {string} fileType - Тип файла
   * @returns {string} - Эмодзи-иконка
   */
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

  /**
   * Рендерит thumbnail для медиафайла
   * @param {Object} item - Объект медиа
   * @returns {JSX.Element} - React элемент thumbnail
   */
  const renderThumbnail = (item) => {
    const thumbnailUrl = getThumbnailUrl(item);
    
    // Для видео с thumbnail
    if (item.file_type === 'video' && thumbnailUrl) {
      return (
        <div style={{ 
          position: 'relative', 
          width: '100%', 
          height: '100%',
          borderRadius: '4px',
          overflow: 'hidden'
        }}>
          <img 
            src={thumbnailUrl} 
            alt="Video thumbnail" 
            style={{ 
              width: '100%', 
              height: '100%', 
              objectFit: 'cover',
              filter: 'brightness(0.8)'
            }} 
          />
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            fontSize: '24px',
            color: 'white',
            textShadow: '0 2px 4px rgba(0,0,0,0.5)',
            background: 'rgba(0,0,0,0.3)',
            borderRadius: '50%',
            width: '40px',
            height: '40px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            ▶
          </div>
        </div>
      );
    }
    
    // Для видео без thumbnail (иконка)
    if (item.file_type === 'video' && !thumbnailUrl) {
      return (
        <div style={{
          width: '100%',
          height: '100%',
          backgroundColor: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '4px'
        }}>
          <div style={{ 
            fontSize: '32px', 
            color: 'white',
            textShadow: '0 2px 4px rgba(0,0,0,0.3)'
          }}>
            ▶
          </div>
        </div>
      );
    }
    
    // Для изображений с thumbnail
    if (thumbnailUrl) {
      return (
        <img 
          src={thumbnailUrl} 
          alt="" 
          style={{ 
            width: '100%', 
            height: '100%', 
            objectFit: 'cover',
            borderRadius: '4px'
          }} 
          onError={(e) => {
            // Fallback на иконку если изображение не загрузилось
            e.target.style.display = 'none';
            e.target.parentNode.innerHTML = `
              <div style="
                width: 100%;
                height: 100%;
                background-color: #f8f9fa;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 4px;
                font-size: 24px;
              ">
                ${getFileTypeIcon(item.file_type)}
              </div>
            `;
          }}
        />
      );
    }
    
    // Для остальных типов файлов - иконка
    return (
      <div style={{
        width: '100%',
        height: '100%',
        backgroundColor: '#f8f9fa',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: '4px',
        fontSize: '24px'
      }}>
        {getFileTypeIcon(item.file_type)}
      </div>
    );
  };

  /**
   * Форматирует размер файла в читаемый вид
   * @param {number} bytes - Размер в байтах
   * @returns {string} - Форматированный размер
   */
  const formatFileSize = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  /**
   * Получает название типа файла на русском
   * @param {string} fileType - Тип файла
   * @returns {string} - Название типа
   */
  const getFileTypeName = (fileType) => {
    switch (fileType) {
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

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (active.id !== over.id) {
      const oldIndex = items.findIndex(item => item.id === active.id);
      const newIndex = items.findIndex(item => item.id === over.id);
      const newItems = arrayMove(items, oldIndex, newIndex);
      onReorder(newItems);
    }
  };

  // Обрабатываем items перед передачей в SortableItem
  const processedItems = items.map(item => ({
  ...item,
  // Добавляем вспомогательные данные
  fileTypeName: getFileTypeName(item.file_type), // ваша функция
  formattedSize: formatFileSize(item.file_size) // ваша функция
}));

  return (
    <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={items} strategy={horizontalListSortingStrategy}>
        <div style={{ 
          display: 'flex', 
          gap: '15px', 
          flexWrap: 'wrap',
          padding: '10px'
        }}>
          {processedItems.map(item => (
            <SortableItem 
              key={item.id} 
              id={item.id} 
              item={item}
              onDelete={onDelete}
              onView={onView}
              onEditDescription={onEditDescription}
              thumbnailComponent={item.thumbnailComponent}
              fileTypeName={item.fileTypeName}
              formattedSize={item.formattedSize}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}