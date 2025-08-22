// MuscleMediaViewer.js
import React from 'react';

function MuscleMediaViewer({ media }) {
  return (
    <div style={{ textAlign: 'center' }}>
      {media.file_type === 'video' ? (
        <video 
          controls 
          style={{ 
            maxWidth: '100%', 
            maxHeight: '70vh',
            objectFit: 'contain'
          }}
        >
          <source src={media.proxyUrl || media.file_url} />
          Ваш браузер не поддерживает видео.
        </video>
      ) : (
        <img 
          src={media.proxyUrl || media.file_url}
          alt={media.description || "Muscle media"}
          style={{ 
            maxWidth: '100%', 
            maxHeight: '70vh',
            objectFit: 'contain'
          }}
          onError={(e) => {
            e.target.onerror = null;
            if (media.file_url && e.target.src !== media.file_url) {
              e.target.src = media.file_url;
            }
          }}
        />
      )}
      
      {/* Отображение описания под медиа */}
      {media.description && (
        <div style={{
          marginTop: '15px',
          padding: '10px',
          backgroundColor: '#f8f9fa',
          borderRadius: '4px',
          maxWidth: '600px',
          margin: '15px auto 0'
        }}>
          <strong>Описание:</strong> {media.description}
        </div>
      )}
    </div>
  );
}

export default MuscleMediaViewer;