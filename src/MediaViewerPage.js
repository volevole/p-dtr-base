// MediaViewerPage.js
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import MediaViewer from './MediaViewer';
import API_URL from './config/api';

function MediaViewerPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [media, setMedia] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchMedia = async () => {
      try {
        const response = await fetch(`${API_URL}/api/media-file/${id}`);
        const data = await response.json();
        
        if (data.success) {
          setMedia(data.file);
        } else {
          setError(data.error || 'Media not found');
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    
    if (id) {
      fetchMedia();
    }
  }, [id]);

  if (loading) return <div style={{ padding: '2rem' }}>Загрузка...</div>;
  if (error) return <div style={{ padding: '2rem', color: 'red' }}>Ошибка: {error}</div>;
  if (!media) return <div style={{ padding: '2rem' }}>Медиафайл не найден</div>;

  return (
    <div style={{ 
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'black',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 1000
    }}>
      {/* Кнопка закрытия */}
      <button 
        onClick={() => navigate(-1)}
        style={{
          position: 'absolute',
          top: '20px',
          right: '20px',  // ← меняем с left на right
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
        ← Назад
      </button>
      
      {/* Контент на весь экран */}
      <div style={{ 
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'auto'
      }}>
        <MediaViewer media={media} />
      </div>
    </div>
  );
}

export default MediaViewerPage;