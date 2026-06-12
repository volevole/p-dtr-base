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
            <a href={media.public_url} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-block', marginTop: '20px', padding: '10px 20px', backgroundColor: '#007bff', color: 'white', textDecoration: 'none', borderRadius: '4px' }}>
              Открыть на Яндекс.Диске
            </a>
          )}
        </div>
      );
    }

    return (
      <div>
        <img src={displayUrl} alt={media.description || "Изображение"} style={{ maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain' }} onError={() => setImageError(true)} />
        <div style={{ marginTop: '15px', padding: '10px', backgroundColor: '#f8f9fa', borderRadius: '6px', textAlign: 'left' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
            {media.width && media.height && <div><strong>Размеры:</strong> {media.width} × {media.height}px</div>}
            {media.file_size && <div><strong>Размер файла:</strong> {formatFileSize(media.file_size)}</div>}
          </div>
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

  return (
    <div style={{ textAlign: 'center', maxWidth: '800px', margin: '0 auto' }}>
      {renderMediaContent()}
      
      {media.description && (
        <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '6px', textAlign: 'left' }}>
          <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>Описание:</div>
          <div>{media.description}</div>
        </div>
      )}
      
      <div style={{ marginTop: '15px', fontSize: '12px', color: '#999', fontStyle: 'italic', padding: '10px', backgroundColor: '#f5f5f5', borderRadius: '6px', textAlign: 'left' }}>
        <div><strong>Имя файла:</strong> {media.file_name}</div>
        <div><strong>Тип:</strong> {getFileTypeName()}</div>
        {media.created_at && <div><strong>Загружен:</strong> {new Date(media.created_at).toLocaleString('ru-RU')}</div>}
        <div><strong>Режим:</strong> {config.YANDEX_DISK_MODE === 'embed' ? 'blob (on-the-fly)' : 'legacy (cached)'}</div>
      </div>
    </div>
  );
}

export default MediaViewer;