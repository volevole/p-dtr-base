// MediaList.js — без прокси, прямые ссылки
import React from 'react';
import { DndContext, closestCenter } from '@dnd-kit/core';
import { 
  SortableContext, 
  horizontalListSortingStrategy, 
  arrayMove 
} from '@dnd-kit/sortable';
import { SortableItem } from './SortableItem';

export function MediaList({ items, onReorder, onDelete, onView, onEditDescription, getThumbnailUrl }) {

//   // Функция для получения URL thumbnail (ПРЯМЫЕ ССЫЛКИ, без прокси)
//  const getThumbnailUrl = (item) => {
//   // Для изображений используем thumbnail_url (превью от Яндекса)
//   if (item.thumbnail_url) {
//     // Очищаем URL от параметров, оставляем только базовый
//     const cleanUrl = item.thumbnail_url.split('?')[0];
//     const cacheBuster = item.thumbnail_updated_at 
//       ? `?t=${new Date(item.thumbnail_updated_at).getTime()}` 
//       : `?t=${Date.now()}`;
//     return `${cleanUrl}${cacheBuster}`;
//   }
  
//   // Fallback: если нет thumbnail_url, используем file_url (только для изображений)
//   if (item.file_type === 'image' && item.file_url) {
//     const cleanUrl = item.file_url.split('?')[0];
//     const cacheBuster = item.thumbnail_updated_at 
//       ? `?t=${new Date(item.thumbnail_updated_at).getTime()}` 
//       : `?t=${Date.now()}`;
//     return `${cleanUrl}${cacheBuster}`;
//   }
  
//   return null;
// };

  const formatFileSize = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const getFileTypeIcon = (fileType) => {
    switch (fileType) {
      case 'image': return '🖼️';
      case 'video': return '🎬';
      case 'audio': return '🎵';
      case 'document': return '📄';
      default: return '📎';
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

  // Подготавливаем items с precomputed thumbnailUrl
  const processedItems = items.map(item => ({
    ...item,
    thumbnailUrl: getThumbnailUrl ? getThumbnailUrl(item) : null,
    formattedSize: formatFileSize(item.file_size),
    fileTypeIcon: getFileTypeIcon(item.file_type)
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
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}