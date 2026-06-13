// MediaViewer.js - с поддержкой режимов
import React, { useState, useEffect } from 'react';
import API_URL, { config } from './config/api';

function MediaViewer({ media }) {
  const [imageError, setImageError] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [audioError, setAudioError] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [blobUrl, setBlobUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);

// Добавьте в начало компонента MediaViewer
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const handleZoomIn = () => setScale(prev => Math.min(prev + 0.5, 5));
  const handleZoomOut = () => setScale(prev => Math.max(prev - 0.5, 1));
  const handleReset = () => { setScale(1); setPosition({ x: 0, y: 0 }); };

  const handleMouseDown = (e) => {
    if (scale > 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    }
  };

  const handleMouseMove = (e) => {
    if (isDragging && scale > 1) {
      setPosition({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    }
  };

  const handleMouseUp = () => setIsDragging(false);

  // Для touch (мобильные)
  const handleTouchStart = (e) => {
    if (scale > 1 && e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({ x: e.touches[0].clientX - position.x, y: e.touches[0].clientY - position.y });
    }
  };

  const handleTouchMove = (e) => {
    if (isDragging && scale > 1 && e.touches.length === 1) {
      //e.preventDefault();
      setPosition({ x: e.touches[0].clientX - dragStart.x, y: e.touches[0].clientY - dragStart.y });
    }
  };

  const handleTouchEnd = () => setIsDragging(false);


  // Определяем мобильное устройство
  useEffect(() => {
    setIsMobile(/iPhone|iPad|iPod|Android/i.test(navigator.userAgent));
  }, []);

  // Загружаем файл через blob (только для embed-режима)
  useEffect(() => {
    const loadFileViaBlob = async () => {
      const publicUrl = media.public_url;
      
      // Для legacy режима — используем прямые ссылки из БД
      if (config.YANDEX_DISK_MODE !== 'embed') {
        setBlobUrl(media.file_url || media.public_url);
        return;
      }
      
      if (!publicUrl) {
        setBlobUrl(media.file_url);
        return;
      }

      setLoading(true);
      setLoadError(false);

      try {
        const apiUrl = `https://cloud-api.yandex.net/v1/disk/public/resources/download?public_key=${encodeURIComponent(publicUrl)}`;
        const response = await fetch(apiUrl);
        const data = await response.json();
        
        if (!data.href) {
          throw new Error('Не удалось получить прямую ссылку');
        }
        
        const fileResponse = await fetch(data.href);
        const blob = await fileResponse.blob();
        const url = URL.createObjectURL(blob);
        setBlobUrl(url);
        
      } catch (err) {
        console.error('Error loading file via blob:', err);
        setLoadError(true);
        setBlobUrl(media.file_url || media.public_url);
      } finally {
        setLoading(false);
      }
    };

    loadFileViaBlob();

    return () => {
      if (blobUrl && blobUrl.startsWith('blob:')) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [media.public_url, media.file_url]);

  const formatDuration = (seconds) => {
    if (!seconds) return '';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const getFileTypeName = () => {
    switch (media.file_type) {
      case 'image': return 'Изображение';
      case 'video': return 'Видео';
      case 'audio': return 'Аудио';
      case 'document': return 'Документ';
      default: return 'Файл';
    }
  };

  const renderFileIcon = () => {
    switch (media.file_type) {
      case 'image': return '🖼️';
      case 'video': return '🎬';
      case 'audio': return '🎵';
      case 'document': return '📄';
      default: return '📎';
    }
  };

  const isVideo = media.file_type === 'video' || media.file_name?.match(/\.(mp4|webm|mov|avi|mkv)$/i);
  const isPdf = media.file_name?.toLowerCase().endsWith('.pdf');
  const isImage = media.file_type === 'image' || media.file_name?.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i);
  const displayUrl = blobUrl || media.file_url || media.public_url;

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <div style={{ fontSize: '48px', marginBottom: '10px' }}>⏳</div>
        <p>Загрузка файла...</p>
      </div>
    );
  }

  if (loadError || (!displayUrl && !media.public_url)) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <div style={{ fontSize: '48px', marginBottom: '10px' }}>❌</div>
        <p>Не удалось загрузить файл</p>
        {media.public_url && (
          <a href={media.public_url} target="_blank" rel="noopener noreferrer" style={{ padding: '10px 20px', backgroundColor: '#007bff', color: 'white', textDecoration: 'none', borderRadius: '4px' }}>
            Открыть на Яндекс.Диске
          </a>
        )}
      </div>
    );
  }

  const renderVideo = () => {
    if (videoError) {
      return (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <div style={{ fontSize: '48px' }}>🎬</div>
          <div>Видео не загрузилось</div>
          {media.public_url && (
            <a href={media.public_url} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-block', marginTop: '20px', padding: '10px 20px', backgroundColor: '#007bff', color: 'white', textDecoration: 'none', borderRadius: '4px' }}>
              Открыть на Яндекс.Диске
            </a>
          )}
        </div>
      );
    }

    return (
      <div>
        <video controls style={{ maxWidth: '100%', maxHeight: '70vh' }} onError={() => setVideoError(true)}>
          <source src={displayUrl} />
        </video>
        <div style={{ marginTop: '15px', padding: '10px', backgroundColor: '#f8f9fa', borderRadius: '6px', textAlign: 'left' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
            {media.duration_seconds && <div><strong>Длительность:</strong> {formatDuration(media.duration_seconds)}</div>}
            {media.file_size && <div><strong>Размер:</strong> {formatFileSize(media.file_size)}</div>}
            {media.width && media.height && <div><strong>Разрешение:</strong> {media.width} × {media.height}</div>}
          </div>
        </div>
      </div>
    );
  };

  const renderAudio = () => {
    if (audioError) {
      return (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <div style={{ fontSize: '48px' }}>🎵</div>
          <div>Аудио не загрузилось</div>
          {media.public_url && (
            <a href={media.public_url} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-block', marginTop: '20px', padding: '10px 20px', backgroundColor: '#007bff', color: 'white', textDecoration: 'none', borderRadius: '4px' }}>
              Открыть на Яндекс.Диске
            </a>
          )}
        </div>
      );
    }

    return (
      <div>
        <div style={{ padding: '20px', backgroundColor: '#f8f9fa', borderRadius: '8px', marginBottom: '15px', textAlign: 'center' }}>
          <div style={{ fontSize: '48px' }}>🎵</div>
          <div style={{ fontWeight: 'bold' }}>{media.file_name}</div>
        </div>
        <audio controls style={{ width: '100%' }} onError={() => setAudioError(true)}>
          <source src={displayUrl} />
        </audio>
        {media.file_size && (
          <div style={{ marginTop: '10px', padding: '10px', backgroundColor: '#f8f9fa', borderRadius: '6px', textAlign: 'center' }}>
            <strong>Размер:</strong> {formatFileSize(media.file_size)}
          </div>
        )}
      </div>
    );
  };

  const renderDocument = () => {
    if (isPdf) {
      return (
        <div>
          <div style={{ fontWeight: 'bold', textAlign: 'center', marginBottom: '10px' }}>{media.file_name}</div>
          <iframe src={displayUrl} style={{ width: '100%', height: '70vh', border: '1px solid #ddd', borderRadius: '8px' }} title={media.file_name} />
          <div style={{ textAlign: 'center', marginTop: '10px' }}>
            <a href={media.public_url || displayUrl} target="_blank" rel="noopener noreferrer">Открыть на Яндекс.Диске</a>
          </div>
        </div>
      );
    }
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <div style={{ fontSize: '64px' }}>{renderFileIcon()}</div>
        <div style={{ fontWeight: 'bold', marginBottom: '10px' }}>{media.file_name}</div>
        <a href={media.public_url || displayUrl} target="_blank" rel="noopener noreferrer" style={{ padding: '10px 20px', backgroundColor: '#007bff', color: 'white', textDecoration: 'none', borderRadius: '4px' }}>
          Открыть файл
        </a>
      </div>
    );
  };

 const renderImage = () => {
  if (imageError) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <div style={{ fontSize: '48px' }}>🖼️</div>
        <div>Изображение не загрузилось</div>
        {media.public_url && (
          <a href={media.public_url} target="_blank" rel="noopener noreferrer">Открыть на Яндекс.Диске</a>
        )}
      </div>
    );
  }

  return (
      <div style={{ 
        position: 'relative', 
        width: '100%', 
        height: '100%', 
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        {/* Кнопки зума */}
        <div style={{
          position: 'absolute',
          top: '60px',
          right: '20px',
          zIndex: 20,
          display: 'flex',
          gap: '10px',
          backgroundColor: 'rgba(0,0,0,0.5)',
          padding: '8px',
          borderRadius: '8px'
        }}>
          <button onClick={handleZoomIn} style={{ padding: '8px 12px', fontSize: '18px', cursor: 'pointer' }}>➕</button>
          <button onClick={handleZoomOut} style={{ padding: '8px 12px', fontSize: '18px', cursor: 'pointer' }}>➖</button>
          <button onClick={handleReset} style={{ padding: '8px 12px', fontSize: '14px', cursor: 'pointer' }}>⟳</button>
        </div>
        
        <div
          style={{ 
            width: '100%', 
            height: '100%', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            cursor: scale > 1 ? 'grab' : 'default',
            overflow: 'hidden'
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <img
            src={displayUrl}
            alt={media.description || "Изображение"}
            style={{
              transform: `scale(${scale}) translate(${position.x / scale}px, ${position.y / scale}px)`,
              transition: isDragging ? 'none' : 'transform 0.2s',
              maxWidth: '100%',
              maxHeight: '100%',
              objectFit: 'contain'
            }}
            draggable={false}
          />
        </div>
      </div>
    );
  };

  const renderMediaContent = () => {
    if (isVideo) return renderVideo();
    if (media.file_type === 'audio') return renderAudio();
    if (isPdf || media.file_type === 'document') return renderDocument();
    return renderImage();
  };


  
  // MediaViewer.js — обёртка
 // MediaViewer.js — возвращаем структуру с единой информационной панелью
  return (
    <div style={{ 
      position: 'relative',
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'black'
    }}>
      {/* Контент (изображение/видео/документ) */}
      <div style={{ 
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        height: '100%'
      }}>
        {renderMediaContent()}
      </div>
      
     {/* Единая информационная панель — справа от центра */}
    <div style={{
      position: 'absolute',
      bottom: '20px',
      right: '20px',
      maxWidth: '400px',  // ограничиваем ширину
      backgroundColor: 'rgba(9, 165, 79, 0.01)',
      color: 'white',
      padding: '10px 15px',
      borderRadius: '8px',
      fontSize: '13px',
      zIndex: 10,
      backdropFilter: 'blur(8px)',
      textAlign: 'right'  // текст выровнять вправо
    }}>
      {media.description && (
        <div style={{ marginBottom: '8px', padding: '8px', borderRadius: '6px', fontSize: '14px', textAlign: 'right' }}>            
          {media.description}
        </div>
      )}        
      <div style={{ fontSize: '11px', opacity: 0.7, display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-end' }}>
        <span>{media.file_name}</span>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <span>{media.file_type === 'image' ? '🖼️ Изображение' : media.file_type === 'video' ? '🎬 Видео' : '📄 Документ'}</span>
          {media.width && media.height && <span>📐 {media.width}×{media.height} px</span>}
          {media.file_size && <span>💾 {(media.file_size / 1024).toFixed(1)} KB</span>}
          {media.duration_seconds && <span>⏱️ {Math.floor(media.duration_seconds / 60)}:{String(media.duration_seconds % 60).padStart(2, '0')}</span>}
        </div>
      </div>
    </div>
    </div>
  );
}

export default MediaViewer;