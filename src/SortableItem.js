import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import React, { useState, useEffect } from 'react';

export function SortableItem({ id, item, onDelete, onView, onEditDescription }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
  const [imageUrl, setImageUrl] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const url = item.proxyUrl || item.file_url;
    setImageUrl(url);
    setLoading(false);
  }, [item.proxyUrl, item.file_url, item.description]);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    width: '150px',
    height: '150px',
    position: 'relative',
    backgroundColor: '#f8f9fa',
    borderRadius: '8px',
    overflow: 'hidden',
    boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
    cursor: 'grab'
  };

  const handleImageDoubleClick = (e) => {
    e.stopPropagation();
    e.preventDefault();
    if (onView) {
      onView(item);
    }
  };

  const handleDeleteDoubleClick = (e) => {
    e.stopPropagation();
    e.preventDefault();
    if (onDelete) {
      onDelete(item);
    }
  };

  const handleEditDoubleClick = (e) => {
    e.stopPropagation();
    e.preventDefault();
    if (onEditDescription) {
      onEditDescription(item);
    }
  };

  if (loading) {
    return (
      <div style={style}>
        <div style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#666'
        }}>
          Загрузка...
        </div>
      </div>
    );
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {/* Обертка для изображения */}
      <div
        style={{
          width: '100%',
          height: '100%',
          position: 'relative',
          cursor: 'pointer'
        }}
        onDoubleClick={handleImageDoubleClick}
      >
        {item.file_type === 'image' ? (
          <img 
            src={imageUrl}
            alt={item.description || `Изображение мышцы ${id}`}
            style={{ 
              width: '100%',
              height: '100%',
              objectFit: 'cover'
            }}
            onError={(e) => {
              e.target.onerror = null;
              if (item.file_url && e.target.src !== item.file_url) {
                e.target.src = item.file_url;
              } else {
                e.target.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="150" height="150" viewBox="0 0 150 150" fill="%23f0f0f0"><rect width="150" height="150"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%23999" font-family="Arial" font-size="12">Изображение недоступно</text></svg>';
              }
            }}
          />
        ) : (
          <video
            src={item.proxyUrl || item.file_url}
            controls
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover'
            }}
            onError={(e) => {
              e.target.onerror = null;
              if (item.file_url && e.target.src !== item.file_url) {
                e.target.src = item.file_url;
              }
            }}
          />
        )}
      </div>

      {/* Кнопка редактирования описания */}
      <button 
        onDoubleClick={handleEditDoubleClick}
        style={{
          position: 'absolute',
          top: '8px',
          left: '8px',
          background: 'rgba(0,123,255,0.8)',
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
          zIndex: 2
        }}
        title="Двойной клик для редактирования описания"
      >
        ✏️
      </button>

      {/* Кнопка удаления */}
      <button 
        onDoubleClick={handleDeleteDoubleClick}
        style={{
          position: 'absolute',
          top: '8px',
          right: '8px',
          background: 'rgba(255,0,0,0.8)',
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
          zIndex: 2
        }}
        title="Двойной клик для удаления"
      >
        ×
      </button>

      {/* Текущее описание (только для просмотра) */}
      {item.description && (
        <div style={{
          position: 'absolute',
          bottom: '0',
          left: '0',
          right: '0',
          background: 'rgba(0,0,0,0.7)',
          color: 'white',
          padding: '4px',
          fontSize: '10px',
          textAlign: 'center',
          maxHeight: '30px',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap'
        }}
        title={item.description}
        >
          {item.description}
        </div>
      )}
    </div>
  );
}