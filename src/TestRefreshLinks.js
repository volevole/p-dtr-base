// src/TestRefreshLinks.js
import React, { useState, useEffect } from 'react';
import API_URL from './config/api';

function TestRefreshLinks() {
  // Получаем ID из URL параметра (работает в любом случае)
  const getMediaIdFromUrl = () => {
    const params = new URLSearchParams(window.location.search);
    return params.get('id');
  };
  
  const [mediaId, setMediaId] = useState(getMediaIdFromUrl() || 'ebfc29b0-9d6d-4e5f-b8db-d1a5485542f7');
  const [mediaInfo, setMediaInfo] = useState(null);
  const [publicUrl, setPublicUrl] = useState('');
  const [currentFileUrl, setCurrentFileUrl] = useState('');
  const [currentThumbnailUrl, setCurrentThumbnailUrl] = useState('');
  const [fileName, setFileName] = useState('');
  const [fileType, setFileType] = useState('');
  const [fileSize, setFileSize] = useState(null);
  const [mimeType, setMimeType] = useState('');
  const [width, setWidth] = useState(null);
  const [height, setHeight] = useState(null);
  const [durationSeconds, setDurationSeconds] = useState(null);
  const [description, setDescription] = useState('');
  const [displayOrder, setDisplayOrder] = useState(0);
  const [createdAt, setCreatedAt] = useState('');
  const [updatedAt, setUpdatedAt] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [thumbnailUpdatedAt, setThumbnailUpdatedAt] = useState('');
  const [fileUrlUpdatedAt, setFileUrlUpdatedAt] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [blobData, setBlobData] = useState(null);
  const [displayMode, setDisplayMode] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [refreshResult, setRefreshResult] = useState(null);

  // Получить информацию о файле из БД по ID
  const fetchFileInfo = async (id) => {
    if (!id) {
      setError('Введите ID медиафайла');
      return;
    }

    setLoading(true);
    setError('');
    setMediaInfo(null);

    try {
      const response = await fetch(`${API_URL}/api/media-file/${id}`);
      const data = await response.json();

      if (data.success) {
        const file = data.file;
        setMediaInfo(file);
        setPublicUrl(file.public_url || '');
        setCurrentFileUrl(file.file_url || '');
        setCurrentThumbnailUrl(file.thumbnail_url || '');
        setFileName(file.file_name || '');
        setFileType(file.file_type || '');
        setFileSize(file.file_size);
        setMimeType(file.mime_type || '');
        setWidth(file.width);
        setHeight(file.height);
        setDurationSeconds(file.duration_seconds);
        setDescription(file.description || '');
        setDisplayOrder(file.display_order || 0);
        setCreatedAt(file.created_at);
        setUpdatedAt(file.updated_at);
        setIsActive(file.is_active !== false);
        setThumbnailUpdatedAt(file.thumbnail_updated_at);
		setFileUrlUpdatedAt(file.file_url_updated_at);
      } else {
        setError(data.error || 'Файл не найден');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // При загрузке страницы
  useEffect(() => {
    const idFromUrl = getMediaIdFromUrl();
    if (idFromUrl && idFromUrl !== mediaId) {
      setMediaId(idFromUrl);
      fetchFileInfo(idFromUrl);
    } else if (mediaId) {
      fetchFileInfo(mediaId);
    }
  }, []);

   // Обновить прямую ссылку для одного файла
	const refreshSingleFile = async () => {
	  if (!mediaId || !publicUrl) {
		setError('Нет данных для обновления');
		return;
	  }

	  setLoading(true);
	  setError('');
	  setRefreshResult(null);

	  try {
		// 1. Получаем свежую прямую ссылку от API Яндекса
		const apiUrl = `https://cloud-api.yandex.net/v1/disk/public/resources/download?public_key=${encodeURIComponent(publicUrl)}`;
		const response = await fetch(apiUrl);
		const data = await response.json();
		
		if (!data.href) {
		  throw new Error('Не удалось получить прямую ссылку от API');
		}
		
		const newFileUrl = data.href;
		const now = new Date().toISOString();
		
		// 2. Сохраняем в базу
		const updateResponse = await fetch(`${API_URL}/api/media/${mediaId}/update-metadata`, {
		  method: 'PUT',
		  headers: { 'Content-Type': 'application/json' },
		  body: JSON.stringify({ 
			file_url: newFileUrl,
			file_url_updated_at: now
		  })
		});
		
		const updateResult = await updateResponse.json();
		
		if (updateResult.success) {
		  setRefreshResult({ 
			success: true, 
			message: 'Прямая ссылка обновлена',
			oldFileUrl: currentFileUrl,
			newFileUrl: newFileUrl,
			updatedAt: now
		  });
		  // Обновляем информацию о файле
		  setTimeout(() => fetchFileInfo(mediaId), 1000);
		} else {
		  setError('Ошибка сохранения ссылки');
		}
	  } catch (err) {
		setError(err.message);
	  } finally {
		setLoading(false);
	  }
	};

  // Обновить только превью
  const refreshSinglePreview = async () => {
    if (!mediaId || !publicUrl) {
      setError('Нет данных для обновления');
      return;
    }

    setLoading(true);
    setError('');
    setRefreshResult(null);

    try {
      const apiUrl = `https://cloud-api.yandex.net/v1/disk/public/resources?public_key=${encodeURIComponent(publicUrl)}&preview_size=M`;
      const response = await fetch(apiUrl);
      const data = await response.json();
      
      let previewUrl = null;
      if (data.preview) {
        if (typeof data.preview === 'string') {
          previewUrl = data.preview;
        } else if (data.preview.M) {
          previewUrl = data.preview.M;
        } else if (data.preview.S) {
          previewUrl = data.preview.S;
        }
      }
      
      if (previewUrl) {
        const updateResponse = await fetch(`${API_URL}/api/media/${mediaId}/update-metadata`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ thumbnail_url: previewUrl, thumbnail_updated_at: new Date().toISOString() })
        });
        
        const updateResult = await updateResponse.json();
        if (updateResult.success) {
          setRefreshResult({ success: true, message: 'Превью обновлено', previewUrl });
          fetchFileInfo(mediaId);
        } else {
          setError('Ошибка сохранения превью');
        }
      } else {
        setError('Не удалось получить превью от Яндекса');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Загрузить файл через blob
  const loadFileViaBlob = async () => {
    if (!publicUrl) {
      setError('Нет public_url');
      return;
    }

    setLoading(true);
    setBlobData(null);
    setError('');

    try {
      const apiUrl = `https://cloud-api.yandex.net/v1/disk/public/resources/download?public_key=${encodeURIComponent(publicUrl)}`;
      const response = await fetch(apiUrl);
      const data = await response.json();
      
      if (!data.href) {
        throw new Error('Не удалось получить прямую ссылку');
      }
      
      const fileResponse = await fetch(data.href);
      const blob = await fileResponse.blob();
      const blobUrl = URL.createObjectURL(blob);
      
      setBlobData({
        url: blobUrl,
        size: blob.size,
        type: blob.type,
        name: fileName
      });
      
      return blobUrl;
    } catch (err) {
      setError(`Ошибка: ${err.message}`);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const showInIframe = async () => {
    const url = await loadFileViaBlob();
    if (url) {
      setDisplayMode('iframe');
      setModalOpen(false);
    }
  };

  const showInMediaTag = async () => {
    const url = await loadFileViaBlob();
    if (url) {
      setDisplayMode('media');
      setModalOpen(false);
    }
  };

  const showInModal = async () => {
    const url = await loadFileViaBlob();
    if (url) {
      setModalOpen(true);
      setDisplayMode(null);
    }
  };

  const clearBlob = () => {
    if (blobData) {
      URL.revokeObjectURL(blobData.url);
      setBlobData(null);
    }
    setDisplayMode(null);
    setModalOpen(false);
  };

  const isVideo = fileName?.match(/\.(mp4|webm|mov|avi|mkv)$/i);
  const isPdf = fileName?.match(/\.pdf$/i);
  const isImage = fileType === 'image' || fileName?.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i);

  const formatDate = (dateString) => {
    if (!dateString) return 'Нет данных';
    return new Date(dateString).toLocaleString('ru-RU');
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: 'auto' }}>
      <h1>Тест открытия файлов через blob</h1>
      <p style={{ color: '#666', marginBottom: '20px' }}>
        Эксперименты с отображением файлов внутри страницы
      </p>

      {/* ID файла */}
      <div style={{ marginBottom: '20px', padding: '15px', background: '#f8f9fa', borderRadius: '8px' }}>
        <h3>ID медиафайла</h3>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            type="text"
            value={mediaId}
            onChange={(e) => setMediaId(e.target.value)}
            style={{ flex: 1, padding: '10px', fontSize: '14px', fontFamily: 'monospace' }}
          />
          <button onClick={() => fetchFileInfo(mediaId)} disabled={loading} style={{ padding: '10px 20px' }}>
            {loading ? 'Загрузка...' : 'Загрузить'}
          </button>
        </div>
        {getMediaIdFromUrl() && (
          <p style={{ fontSize: '12px', color: '#28a745', marginTop: '10px' }}>
            ✅ Загружен файл из URL параметра id={getMediaIdFromUrl()}
          </p>
        )}
      </div>

      {/* Информация о файле */}
     {mediaInfo && (
	  <div style={{ marginBottom: '20px', padding: '15px', background: '#e3f2fd', borderRadius: '8px', overflow: 'auto' }}>
		<h3>📄 Полная информация о файле</h3>
		
		<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '10px', fontSize: '13px' }}>
		  <div><strong>ID:</strong> <code>{mediaInfo.id}</code></div>
		  <div><strong>Имя файла:</strong> {fileName}</div>
		  <div><strong>Тип:</strong> {fileType} {isVideo && '(видео)'} {isPdf && '(PDF)'} {isImage && '(изображение)'}</div>
		  <div><strong>MIME тип:</strong> {mimeType || 'не указан'}</div>
		  <div><strong>Размер:</strong> {formatFileSize(fileSize)}</div>
		  {width && height && <div><strong>Разрешение:</strong> {width} x {height} px</div>}
		  {durationSeconds && <div><strong>Длительность:</strong> {durationSeconds} сек. ({Math.floor(durationSeconds / 60)} мин {durationSeconds % 60} сек)</div>}
		  <div><strong>Описание:</strong> {description || '—'}</div>
		  <div><strong>Порядок отображения:</strong> {displayOrder}</div>
		  <div><strong>Активен:</strong> {isActive ? '✅ да' : '❌ нет'}</div>
		  <div><strong>Создан:</strong> {formatDate(createdAt)}</div>
		  <div><strong>Обновлён:</strong> {formatDate(updatedAt)}</div>
		  <div><strong>Прямая ссылка обновлена:</strong> {formatDate(fileUrlUpdatedAt)}</div>
		  <div><strong>Превью обновлено:</strong> {formatDate(thumbnailUpdatedAt)}</div>
		</div>
		
		<div style={{ marginTop: '10px' }}>
		  <div><strong>Public URL:</strong> <code style={{ wordBreak: 'break-all', fontSize: '12px' }}>{publicUrl}</code></div>
		  {currentFileUrl && (
			<div><strong>Текущий file_url:</strong> <code style={{ wordBreak: 'break-all', fontSize: '12px' }}>{currentFileUrl}</code></div>
		  )}
		  <div><strong>Текущий thumbnail_url:</strong> {currentThumbnailUrl ? (
			<code style={{ wordBreak: 'break-all', fontSize: '12px' }}>{currentThumbnailUrl}</code>
		  ) : (
			<span style={{ color: '#999' }}>отсутствует</span>
		  )}</div>
		</div>
		
		{/* Превью */}
		{currentThumbnailUrl && (
		  <div style={{ marginTop: '15px', textAlign: 'center' }}>
			<strong>Превью (из базы данных):</strong><br/>
			<img 
			  src={currentThumbnailUrl} 
			  alt="Current thumbnail"
			  style={{ maxWidth: '200px', maxHeight: '150px', border: '1px solid #ddd', marginTop: '5px' }}
			  onError={(e) => {
				e.target.style.display = 'none';
				const parent = e.target.parentElement;
				const errorDiv = document.createElement('div');
				errorDiv.style.color = '#dc3545';
				errorDiv.style.fontSize = '12px';
				errorDiv.style.marginTop = '5px';
				errorDiv.innerHTML = '❌ Не удалось загрузить превью. Возможно, ссылка устарела.';
				if (!parent.querySelector('.error-message')) {
				  errorDiv.className = 'error-message';
				  parent.appendChild(errorDiv);
				}
			  }}
			/>
		  </div>
		)}
		
		{/* Прямая ссылка для просмотра */}
		{currentFileUrl && (
		  <div style={{ marginTop: '15px', textAlign: 'center' }}>
			<strong>Просмотр файла (из базы данных):</strong><br/>
			{isVideo ? (
			  <video 
				src={currentFileUrl}
				controls
				style={{ maxWidth: '100%', maxHeight: '300px', marginTop: '5px' }}
				onError={(e) => {
				  e.target.style.display = 'none';
				  const parent = e.target.parentElement;
				  const errorDiv = document.createElement('div');
				  errorDiv.style.color = '#dc3545';
				  errorDiv.style.fontSize = '12px';
				  errorDiv.style.marginTop = '5px';
				  errorDiv.innerHTML = '❌ Не удалось загрузить видео. Возможно, ссылка устарела.';
				  if (!parent.querySelector('.error-message-video')) {
					errorDiv.className = 'error-message-video';
					parent.appendChild(errorDiv);
				  }
				}}
			  />
			) : isImage ? (
			  <img 
				src={currentFileUrl}
				alt="Current file"
				style={{ maxWidth: '100%', maxHeight: '300px', border: '1px solid #ddd', marginTop: '5px' }}
				onError={(e) => {
				  e.target.style.display = 'none';
				  const parent = e.target.parentElement;
				  const errorDiv = document.createElement('div');
				  errorDiv.style.color = '#dc3545';
				  errorDiv.style.fontSize = '12px';
				  errorDiv.style.marginTop = '5px';
				  errorDiv.innerHTML = '❌ Не удалось загрузить изображение. Возможно, ссылка устарела.';
				  if (!parent.querySelector('.error-message-image')) {
					errorDiv.className = 'error-message-image';
					parent.appendChild(errorDiv);
				  }
				}}
			  />
			) : isPdf ? (
			  <button 
				onClick={() => {
				  setBlobData({ url: currentFileUrl, name: fileName });
				  setModalOpen(true);
				  setDisplayMode(null);
				}}
				style={buttonStyle('#007bff')}
			  >
				📄 Показать PDF в модальном окне
			  </button>
			) : (
			  <a href={currentFileUrl} target="_blank" rel="noopener noreferrer" style={buttonStyle('#28a745')}>
				📥 Скачать файл
			  </a>
			)}
		  </div>
		)}
	  </div>
	)}

      {/* Кнопки действий */}
      {publicUrl && (
        <div style={{ marginBottom: '20px', padding: '15px', background: '#e8f5e9', borderRadius: '8px' }}>
          <h3>Действия</h3>
          <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
            <button onClick={refreshSingleFile} disabled={loading} style={buttonStyle('#007bff')}>
              🔗 Обновить прямую ссылку
            </button>
            <button onClick={refreshSinglePreview} disabled={loading} style={buttonStyle('#17a2b8')}>
              🖼️ Обновить превью
            </button>
          </div>
        </div>
      )}

      {/* Результат обновления */}
     {refreshResult && (
		  <div style={{ marginBottom: '20px', padding: '15px', background: '#d1ecf1', borderRadius: '8px', overflow: 'auto' }}>
			<h3>🔄 Результат обновления</h3>
			{refreshResult.message && <p><strong>{refreshResult.message}</strong></p>}
			{refreshResult.newFileUrl && (
			  <>
				<p><strong>Новая прямая ссылка:</strong></p>
				<code style={{ wordBreak: 'break-all', fontSize: '11px', display: 'block', marginBottom: '10px' }}>
				  {refreshResult.newFileUrl}
				</code>
				<p><strong>Дата обновления:</strong> {new Date(refreshResult.updatedAt).toLocaleString('ru-RU')}</p>
			  </>
			)}
			{refreshResult.previewUrl && (
			  <>
				<p><strong>Новое превью:</strong></p>
				<code style={{ wordBreak: 'break-all', fontSize: '11px', display: 'block', marginBottom: '10px' }}>
				  {refreshResult.previewUrl}
				</code>
				<img 
				  src={refreshResult.previewUrl} 
				  alt="New preview"
				  style={{ maxWidth: '200px', maxHeight: '150px', border: '1px solid #ddd', marginTop: '5px' }}
				  onError={(e) => { e.target.style.display = 'none'; }}
				/>
			  </>
			)}
		  </div>
		)}

      {/* Ошибки */}
      {error && (
        <div style={{ padding: '15px', background: '#f8d7da', color: '#721c24', borderRadius: '8px', marginBottom: '20px' }}>
          <strong>❌ Ошибка:</strong> {error}
        </div>
      )}

      {/* Эксперименты с отображением */}
      {publicUrl && (
        <div style={{ marginBottom: '20px', padding: '15px', background: '#f0f0f0', borderRadius: '8px' }}>
          <h3>🧪 Эксперименты с отображением</h3>
		  <div style={{ marginBottom: '15px' }}><small>Тут используется ссылка, полученная налету из API Яндекс-Диска, а не текущая ссылка из БД</small> </div>
          <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
            <button onClick={showInIframe} disabled={loading} style={buttonStyle('#007bff')}>
              📦 Вариант 1: iframe
            </button>
            <button onClick={showInMediaTag} disabled={loading} style={buttonStyle('#28a745')}>
              🖼️ Вариант 2: img/video тег
            </button>
            <button onClick={showInModal} disabled={loading} style={buttonStyle('#6c757d')}>
              🪟 Вариант 3: Модальное окно
            </button>
            {(displayMode || blobData) && (
              <button onClick={clearBlob} style={buttonStyle('#dc3545')}>
                Очистить
              </button>
            )}
          </div>
        </div>
      )}

      {/* Отображение выбранного варианта */}
      {displayMode === 'iframe' && blobData && (
        <div style={{ marginBottom: '20px', border: '1px solid #ddd', borderRadius: '8px', overflow: 'hidden' }}>
          <div style={{ padding: '10px', background: '#f0f0f0', borderBottom: '1px solid #ddd' }}>
            <strong>📦 Просмотр через iframe</strong>
          </div>
          <iframe 
            src={blobData.url}
            style={{ width: '100%', height: '500px', border: 'none' }}
            title={blobData.name}
          />
        </div>
      )}

      {displayMode === 'media' && blobData && (
        <div style={{ marginBottom: '20px', border: '1px solid #ddd', borderRadius: '8px', overflow: 'hidden' }}>
          <div style={{ padding: '10px', background: '#f0f0f0', borderBottom: '1px solid #ddd' }}>
            <strong>🖼️ Просмотр через {isVideo ? 'video' : 'img'} тег</strong>
          </div>
          <div style={{ textAlign: 'center', padding: '15px', background: '#fafafa' }}>
            {isVideo ? (
              <video 
                src={blobData.url}
                controls
                style={{ maxWidth: '100%', maxHeight: '500px' }}
              />
            ) : (
              <img 
                src={blobData.url}
                alt={blobData.name}
                style={{ maxWidth: '100%', maxHeight: '500px', objectFit: 'contain' }}
              />
            )}
          </div>
        </div>
      )}

      {/* Модальное окно */}
      {modalOpen && blobData && (
        <div style={modalStyle} onClick={() => setModalOpen(false)}>
          <div style={modalContentStyle} onClick={e => e.stopPropagation()}>
            <div style={{ padding: '10px', background: '#f0f0f0', borderBottom: '1px solid #ddd', display: 'flex', justifyContent: 'space-between' }}>
              <strong>🪟 Модальное окно — {blobData.name}</strong>
              <button onClick={() => setModalOpen(false)} style={{ padding: '5px 15px' }}>✖</button>
            </div>
            <div style={{ textAlign: 'center', padding: '15px' }}>
              {isVideo ? (
                <video src={blobData.url} controls style={{ maxWidth: '100%', maxHeight: '70vh' }} />
              ) : isPdf ? (
                <iframe src={blobData.url} style={{ width: '100%', height: '70vh' }} title={blobData.name} />
              ) : (
                <img src={blobData.url} alt={blobData.name} style={{ maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain' }} />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const buttonStyle = (bgColor, disabled = false) => ({
  padding: '8px 16px',
  backgroundColor: disabled ? '#6c757d' : bgColor,
  color: 'white',
  border: 'none',
  borderRadius: '4px',
  cursor: disabled ? 'not-allowed' : 'pointer',
  fontSize: '14px',
  margin: '0 5px 5px 0'
});

const modalStyle = {
  position: 'fixed',
  top: 0, left: 0, right: 0, bottom: 0,
  backgroundColor: 'rgba(0,0,0,0.8)',
  zIndex: 1000,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '20px'
};

const modalContentStyle = {
  backgroundColor: 'white',
  borderRadius: '8px',
  maxWidth: '90vw',
  maxHeight: '90vh',
  overflow: 'auto',
  position: 'relative'
};

export default TestRefreshLinks;