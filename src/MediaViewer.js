// MediaViewer.js - исправленная версия с улучшенным просмотром документов
import React, { useState, useEffect } from 'react';
import API_URL from './config/api';

function MediaViewer({ media }) {
  // Состояния для отслеживания ошибок загрузки
  const [imageError, setImageError] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [audioError, setAudioError] = useState(false);
  const [thumbnailError, setThumbnailError] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Определяем мобильное устройство
  useEffect(() => {
    setIsMobile(/iPhone|iPad|iPod|Android/i.test(navigator.userAgent));
  }, []);

  // Функция для получения URL медиа через прокси
  const getMediaUrl = () => {
    // Используем proxyUrl если есть
    if (media.proxyUrl) {
      return media.proxyUrl;
    }
    
    // Для изображений используем public_url через прокси
    if (media.file_type === 'image' && media.public_url) {
      return `${API_URL}/api/proxy-image?url=${encodeURIComponent(media.public_url)}`;
    }
    
    // Для других типов используем public_url напрямую
    if (media.public_url) {
      return media.public_url;
    }
    
    return media.file_url;
  };

  // Функция для получения thumbnail URL
  const getThumbnailUrl = () => {
    // Если есть thumbnail_url от Яндекс.Диска
    if (media.thumbnail_url) {
      return `${API_URL}/api/proxy-image?url=${encodeURIComponent(media.thumbnail_url)}`;
    }
    
    return null;
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

  // Функция для получения названия типа файла
  const getFileTypeName = () => {
    switch (media.file_type) {
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

  // Функция для рендеринга иконки типа файла
  const renderFileIcon = () => {
    switch (media.file_type) {
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

  // Сбрасываем ошибки при смене медиа
  useEffect(() => {
    setImageError(false);
    setVideoError(false);
    setAudioError(false);
    setThumbnailError(false);
  }, [media.id]);

  const mediaUrl = getMediaUrl();
  const thumbnailUrl = getThumbnailUrl();

  // Рендеринг видео
  const renderVideo = () => {
    if (videoError) {
      return (
        <div style={{
          width: '100%',
          height: '400px',
          backgroundColor: '#f0f0f0',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '8px',
          padding: '20px'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>🎬</div>
          <div style={{ fontSize: '16px', color: '#666', textAlign: 'center' }}>
            Видео не загрузилось
          </div>
          <a 
            href={mediaUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            style={{
              marginTop: '20px',
              padding: '10px 20px',
              backgroundColor: '#007bff',
              color: 'white',
              textDecoration: 'none',
              borderRadius: '4px'
            }}
          >
            Открыть видео в новой вкладке
          </a>
        </div>
      );
    }

    return (
      <div style={{ position: 'relative' }}>
        {/* Видео с thumbnail как poster */}
        <video 
          controls 
          poster={thumbnailUrl && !thumbnailError ? thumbnailUrl : undefined}
          style={{ 
            maxWidth: '100%', 
            maxHeight: '70vh',
            objectFit: 'contain',
            backgroundColor: (thumbnailUrl && !thumbnailError) ? 'transparent' : '#f0f0f0',
            borderRadius: '8px'
          }}
          onError={() => setVideoError(true)}
        >
          <source src={mediaUrl} />
          Ваш браузер не поддерживает видео.
        </video>
        
        {/* Информация о видео */}
        <div style={{
          marginTop: '15px',
          padding: '10px',
          backgroundColor: '#f8f9fa',
          borderRadius: '6px',
          textAlign: 'left'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
            {media.duration_seconds && (
              <div>
                <strong>Длительность:</strong> {formatDuration(media.duration_seconds)}
              </div>
            )}
            {media.file_size && (
              <div>
                <strong>Размер:</strong> {formatFileSize(media.file_size)}
              </div>
            )}
            {media.width && media.height && (
              <div>
                <strong>Разрешение:</strong> {media.width} × {media.height}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Рендеринг аудио
  const renderAudio = () => {
    if (audioError) {
      return (
        <div style={{
          padding: '30px',
          backgroundColor: '#f8f9fa',
          borderRadius: '8px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>🎵</div>
          <div style={{ fontWeight: 'bold', marginBottom: '10px' }}>{media.file_name}</div>
          <div style={{ color: '#666', marginBottom: '20px' }}>Аудиофайл не загрузился</div>
          <a 
            href={mediaUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            style={{
              padding: '10px 20px',
              backgroundColor: '#007bff',
              color: 'white',
              textDecoration: 'none',
              borderRadius: '4px'
            }}
          >
            Открыть аудио в новой вкладке
          </a>
        </div>
      );
    }

    return (
      <div>
        <div style={{
          padding: '20px',
          backgroundColor: '#f8f9fa',
          borderRadius: '8px',
          marginBottom: '15px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '10px' }}>🎵</div>
          <div style={{ fontWeight: 'bold' }}>{media.file_name}</div>
        </div>
        
        <audio 
          controls 
          style={{ width: '100%' }}
          onError={() => setAudioError(true)}
        >
          <source src={mediaUrl} />
          Ваш браузер не поддерживает аудио.
        </audio>
        
        {media.file_size && (
          <div style={{ 
            marginTop: '10px', 
            padding: '10px',
            backgroundColor: '#f8f9fa',
            borderRadius: '6px',
            textAlign: 'center'
          }}>
            <strong>Размер:</strong> {formatFileSize(media.file_size)}
          </div>
        )}
      </div>
    );
  };

  // ИСПРАВЛЕННАЯ ФУНКЦИЯ РЕНДЕРИНГА ДОКУМЕНТА
// Рендеринг документа
const renderDocument = () => {
  // Определяем, PDF ли это
  const isPdf = media.file_name.toLowerCase().endsWith('.pdf');
  
  // Для PDF - используем разный подход для мобильных и десктопа
  if (isPdf) {
    if (isMobile) {
      // МОБИЛЬНЫЕ: Google Docs Viewer
      const pdfViewerUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(mediaUrl)}&embedded=true`;
      
      return (
        <div style={{ padding: '0', backgroundColor: '#f5f5f5', borderRadius: '8px' }}>
          <div style={{ 
            fontWeight: 'bold', 
            fontSize: '16px', 
            marginBottom: '10px',
            padding: '15px 15px 0 15px',
            wordBreak: 'break-all',
            textAlign: 'center'
          }}>
            {media.file_name}
          </div>
          
          {/* Информация о файле */}
          <div style={{ 
            fontSize: '14px', 
            color: '#666',
            margin: '0 15px 15px 15px',
            padding: '10px',
            backgroundColor: 'white',
            borderRadius: '6px',
            textAlign: 'left'
          }}>
            <div style={{ marginBottom: '5px' }}>
              <strong>Тип:</strong> PDF документ
            </div>
            {media.file_size && (
              <div style={{ marginBottom: '5px' }}>
                <strong>Размер:</strong> {formatFileSize(media.file_size)}
              </div>
            )}
          </div>
          
          {/* Просмотр PDF через Google Docs Viewer (только для мобильных) */}
          <div style={{ textAlign: 'center', padding: '0 15px 15px 15px' }}>
            <iframe
              src={pdfViewerUrl}
              style={{
                width: '100%',
                height: '70vh',
                border: '1px solid #ddd',
                borderRadius: '8px'
              }}
              title={media.file_name}
            />
          </div>
          
          {/* Кнопка скачивания (запасной вариант) */}
          <div style={{ 
            textAlign: 'center', 
            padding: '0 15px 15px 15px'
          }}>
            <a 
              href={mediaUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              download
              style={{
                padding: '12px 24px',
                backgroundColor: '#28a745',
                color: 'white',
                textDecoration: 'none',
                borderRadius: '6px',
                fontWeight: 'bold',
                display: 'inline-block'
              }}
            >
              📥 Скачать PDF
            </a>
          </div>
        </div>
      );
    } else {
      // ДЕСКТОП: прямая ссылка (как было раньше)
      return (
        <div style={{ padding: '30px', backgroundColor: '#f5f5f5', borderRadius: '8px' }}>
          <div style={{ fontSize: '64px', marginBottom: '15px', textAlign: 'center' }}>{renderFileIcon()}</div>
          <div style={{ 
            fontWeight: 'bold', 
            fontSize: '18px', 
            marginBottom: '10px',
            wordBreak: 'break-all',
            textAlign: 'center'
          }}>
            {media.file_name}
          </div>
          
          <div style={{ 
            fontSize: '14px', 
            color: '#666',
            marginBottom: '20px',
            padding: '10px',
            backgroundColor: 'white',
            borderRadius: '6px',
            textAlign: 'left'
          }}>
            <div style={{ marginBottom: '5px' }}>
              <strong>Тип:</strong> PDF документ
            </div>
            {media.file_size && (
              <div style={{ marginBottom: '5px' }}>
                <strong>Размер:</strong> {formatFileSize(media.file_size)}
              </div>
            )}
          </div>
          
          <div style={{ textAlign: 'center' }}>
            <a 
              href={mediaUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              style={{
                padding: '12px 24px',
                backgroundColor: '#007bff',
                color: 'white',
                textDecoration: 'none',
                borderRadius: '6px',
                fontWeight: 'bold',
                display: 'inline-block'
              }}
            >
              Открыть PDF
            </a>
          </div>
        </div>
      );
    }
  }
  
  // Для других документов (не PDF)
  return (
    <div style={{ padding: '30px', backgroundColor: '#f5f5f5', borderRadius: '8px' }}>
      <div style={{ fontSize: '64px', marginBottom: '15px', textAlign: 'center' }}>{renderFileIcon()}</div>
      <div style={{ 
        fontWeight: 'bold', 
        fontSize: '18px', 
        marginBottom: '10px',
        wordBreak: 'break-all',
        textAlign: 'center'
      }}>
        {media.file_name}
      </div>
      
      <div style={{ 
        fontSize: '14px', 
        color: '#666',
        marginBottom: '20px',
        padding: '10px',
        backgroundColor: 'white',
        borderRadius: '6px',
        textAlign: 'left'
      }}>
        <div style={{ marginBottom: '5px' }}>
          <strong>Тип:</strong> {getFileTypeName()}
        </div>
        {media.file_size && (
          <div style={{ marginBottom: '5px' }}>
            <strong>Размер:</strong> {formatFileSize(media.file_size)}
          </div>
        )}
        {media.thumbnail_url && !thumbnailError && (
          <div style={{ marginBottom: '5px' }}>
            <strong>Превью:</strong> доступно от Яндекс.Диска
          </div>
        )}
      </div>
      
      <div style={{ 
        textAlign: 'center',
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        gap: '10px',
        justifyContent: 'center'
      }}>
        <a 
          href={mediaUrl} 
          target="_blank" 
          rel="noopener noreferrer"
          download
          style={{
            padding: '12px 24px',
            backgroundColor: '#28a745',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '6px',
            fontWeight: 'bold',
            display: 'inline-block',
            flex: isMobile ? '1' : '0 1 auto'
          }}
        >
          📥 Скачать файл
        </a>
        <a 
          href={mediaUrl} 
          target="_blank" 
          rel="noopener noreferrer"
          style={{
            padding: '12px 24px',
            backgroundColor: '#007bff',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '6px',
            fontWeight: 'bold',
            display: 'inline-block',
            flex: isMobile ? '1' : '0 1 auto'
          }}
        >
          ↗ Открыть в новой вкладке
        </a>
      </div>
    </div>
  );
};

  // Рендеринг изображения
  const renderImage = () => {
    if (imageError) {
      return (
        <div style={{
          width: '100%',
          height: '400px',
          backgroundColor: '#f8f9fa',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '8px',
          padding: '20px'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>🖼️</div>
          <div style={{ fontSize: '16px', color: '#666', marginBottom: '20px', textAlign: 'center' }}>
            Изображение не загрузилось
          </div>
          <a 
            href={mediaUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            style={{
              padding: '10px 20px',
              backgroundColor: '#007bff',
              color: 'white',
              textDecoration: 'none',
              borderRadius: '4px'
            }}
          >
            Открыть изображение в новой вкладке
          </a>
        </div>
      );
    }

    return (
      <div style={{ position: 'relative' }}>
        <img 
          src={mediaUrl}
          alt={media.description || "Изображение"}
          style={{ 
            maxWidth: '100%', 
            maxHeight: '70vh',
            objectFit: 'contain',
            borderRadius: '8px'
          }}
          onError={() => setImageError(true)}
        />
        
        {/* Информация об изображении */}
        <div style={{
          marginTop: '15px',
          padding: '10px',
          backgroundColor: '#f8f9fa',
          borderRadius: '6px',
          textAlign: 'left'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
            {media.width && media.height && (
              <div>
                <strong>Размеры:</strong> {media.width} × {media.height}px
              </div>
            )}
            {media.file_size && (
              <div>
                <strong>Размер файла:</strong> {formatFileSize(media.file_size)}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Выбираем что рендерить в зависимости от типа файла
  const renderMediaContent = () => {
    switch (media.file_type) {
      case 'video':
        return renderVideo();
      case 'audio':
        return renderAudio();
      case 'document':
        return renderDocument();
      case 'image':
      default:
        return renderImage();
    }
  };

  return (
    <div style={{ textAlign: 'center', maxWidth: '800px', margin: '0 auto' }}>
      {renderMediaContent()}
      
      {/* Описание файла */}
      {media.description && (
        <div style={{
          marginTop: '20px',
          padding: '15px',
          backgroundColor: '#f8f9fa',
          borderRadius: '6px',
          textAlign: 'left'
        }}>
          <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>Описание:</div>
          <div>{media.description}</div>
        </div>
      )}
      
      {/* Дополнительная информация */}
      <div style={{
        marginTop: '15px',
        fontSize: '12px',
        color: '#999',
        fontStyle: 'italic',
        padding: '10px',
        backgroundColor: '#f5f5f5',
        borderRadius: '6px',
        textAlign: 'left'
      }}>
        <div style={{ marginBottom: '5px' }}>
          <strong>Имя файла:</strong> {media.file_name}
        </div>
        <div style={{ marginBottom: '5px' }}>
          <strong>Тип:</strong> {getFileTypeName()} ({media.file_type})
        </div>
        <div>
          <strong>Загружен:</strong> {new Date(media.created_at).toLocaleString('ru-RU')}
        </div>
      </div>
    </div>
  );
}

export default MediaViewer;