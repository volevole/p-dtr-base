// MediaViewerPage.js
// Страница для просмотра медиафайлов (изображения и видео)
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
        console.log('[MediaViewerPage] Fetching media with id:', id);
        const response = await fetch(`${API_URL}/api/media-file/${id}`);
        const data = await response.json();
        console.log('[MediaViewerPage] Response:', data);
        
        if (data.success) {
          setMedia(data.file);
        } else {
          setError(data.error || 'Media not found');
        }
      } catch (err) {
        console.error('[MediaViewerPage] Error:', err);
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
    <div style={{ padding: '20px' }}>
      {/* Кнопка "Назад" */}
      <button 
        onClick={() => navigate(-1)}
        style={{
          marginBottom: '20px',
          padding: '8px 16px',
          backgroundColor: '#6c757d',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px'
        }}
      >
        ← Назад
      </button>
      
      <MediaViewer media={media} />
    </div>
  );
}

export default MediaViewerPage;