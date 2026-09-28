// src/TestRefreshLinks.js
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import API_URL from './config/api';

// Worker для pdf.js — через CDN (не требует копирования файла)
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

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

  // ===== Состояния для react-pdf =====
  const [pdfNumPages, setPdfNumPages] = useState(null);
  const [pdfPageNumber, setPdfPageNumber] = useState(1);
  const [pdfScale, setPdfScale] = useState(1.0);
  const [pdfBlobUrl, setPdfBlobUrl] = useState(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState(null);

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
      console.log('[fetchFileInfo] Response data:', data);

      if (data.success) {
        console.log('[fetchFileInfo] File data:', data.file);
        const file = data.file;
        
        const connectionsResponse = await fetch(`${API_URL}/api/media-connections/${id}`);
        const connectionsData = await connectionsResponse.json();
        
        const fileWithConnections = {
          ...file,
          connections: connectionsData.success ? connectionsData.data : []
        };
        
        setMediaInfo(fileWithConnections);
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
      console.error('Error fetching file info:', err);
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
      const apiUrl = `https://cloud-api.yandex.net/v1/disk/public/resources/download?public_key=${encodeURIComponent(publicUrl)}`;
      const response = await fetch(apiUrl);
      const data = await response.json();
      
      if (!data.href) {
        throw new Error('Не удалось получить прямую ссылку от API');
      }
      
      const newFileUrl = data.href;
      const now = new Date().toISOString();
      
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

  // Вариант 1: iframe (прокси + blob)
  const showInIframe = async () => {
    if (!publicUrl) {
      setError('Нет public_url');
      return;
    }

    setLoading(true);
    setBlobData(null);
    setError('');

    try {
      const proxyUrl = `${API_URL}/api/curl-proxy-file?url=${encodeURIComponent(publicUrl)}&size=M`;
      const response = await fetch(proxyUrl);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      
      setBlobData({
        url: blobUrl,
        size: blob.size,
        type: blob.type,
        name: fileName
      });
      
      setDisplayMode('iframe');
      setModalOpen(false);
    } catch (err) {
      setError(`Ошибка: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Вариант 2: img/video тег (прокси + blob)
  const showInMediaTag = async () => {
    if (!publicUrl) {
      setError('Нет public_url');
      return;
    }

    setLoading(true);
    setBlobData(null);
    setError('');

    try {
      const proxyUrl = `${API_URL}/api/curl-proxy-file?url=${encodeURIComponent(publicUrl)}&size=M`;
      const response = await fetch(proxyUrl);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      
      setBlobData({
        url: blobUrl,
        size: blob.size,
        type: blob.type,
        name: fileName
      });
      
      setDisplayMode('media');
      setModalOpen(false);
    } catch (err) {
      setError(`Ошибка: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Вариант 3: модальное окно (прокси + blob)
  const showInModal = async () => {
    if (!publicUrl) {
      setError('Нет public_url');
      return;
    }

    setLoading(true);
    setBlobData(null);
    setError('');

    try {
      const proxyUrl = `${API_URL}/api/curl-proxy-file?url=${encodeURIComponent(publicUrl)}&size=M`;
      const response = await fetch(proxyUrl);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      
      setBlobData({
        url: blobUrl,
        size: blob.size,
        type: blob.type,
        name: fileName
      });
      
      setModalOpen(true);
      setDisplayMode(null);
    } catch (err) {
      setError(`Ошибка: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // ===== Вариант 4: react-pdf =====
  const showViaReactPdf = async () => {
    if (!publicUrl) {
      setError('Нет public_url');
      return;
    }

    setPdfLoading(true);
    setPdfError(null);
    setPdfBlobUrl(null);
    setPdfNumPages(null);
    setPdfPageNumber(1);
    setPdfScale(1.0);

    try {
      const proxyUrl = `${API_URL}/api/curl-proxy-file?url=${encodeURIComponent(publicUrl)}&size=M`;
      const response = await fetch(proxyUrl);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      
      setPdfBlobUrl(blobUrl);
      setDisplayMode('react-pdf');
      setModalOpen(false);
    } catch (err) {
      setPdfError(`Ошибка загрузки: ${err.message}`);
    } finally {
      setPdfLoading(false);
    }
  };

  const clearBlob = () => {
    if (blobData) {
      URL.revokeObjectURL(blobData.url);
      setBlobData(null);
    }
    if (pdfBlobUrl) {
      URL.revokeObjectURL(pdfBlobUrl);
      setPdfBlobUrl(null);
      setPdfNumPages(null);
      setPdfPageNumber(1);
      setPdfScale(1.0);
      setPdfError(null);
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
            {durationSeconds && <div><strong>Длительность:</strong> {durationSeconds} сек.</div>}
            <div><strong>Описание:</strong> {description || '—'}</div>
            <div><strong>Активен:</strong> {isActive ? '✅ да' : '❌ нет'}</div>
            <div><strong>Создан:</strong> {formatDate(createdAt)}</div>
          </div>
          
          <div style={{ marginTop: '10px' }}>
            <div><strong>Public URL:</strong> <code style={{ wordBreak: 'break-all', fontSize: '12px' }}>{publicUrl}</code></div>
          </div>

          {/* Блок связей */}
          <div style={{ marginTop: '20px', paddingTop: '15px', borderTop: '2px solid #b0c4de' }}>
            <h4 style={{ marginBottom: '10px', color: '#0d47a1' }}>🔗 Связи медиафайла с сущностями</h4>
            
            {mediaInfo.connections && mediaInfo.connections.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {mediaInfo.connections.map((conn, idx) => {
                  const isEntityMissing = !conn.entity_name || conn.entity_name === 'null' || conn.entity_name === '';
                  return (
                    <div key={idx} style={{
                      padding: '8px 12px',
                      backgroundColor: isEntityMissing ? '#fff3cd' : 'white',
                      borderRadius: '4px',
                      border: isEntityMissing ? '1px solid #ffc107' : '1px solid #dee2e6',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: '13px'
                    }}>
                      <span>
                        <strong style={{ color: '#0d47a1' }}>
                          {conn.entity_type === 'muscle' ? '💪' :
                           conn.entity_type === 'organ' ? '🫀' :
                           conn.entity_type === 'meridian' ? '🌀' :
                           conn.entity_type === 'dysfunction' ? '⚠️' :
                           conn.entity_type === 'muscle_group' ? '👥' :
                           conn.entity_type === 'entry' ? '🚪' : '📌'} 
                          {conn.entity_type}
                        </strong>
                        {isEntityMissing ? (
                          <span style={{ color: '#856404', fontWeight: 'bold', marginLeft: '8px' }}>
                            {conn.entity_id}
                            <span style={{ fontSize: '11px', marginLeft: '5px' }}>(сущность не найдена)</span>
                          </span>
                        ) : (
                          <Link 
                            to={`/${conn.entity_type === 'muscle_group' ? 'group' : conn.entity_type}/${conn.entity_id}`}
                            style={{ color: '#007bff', textDecoration: 'none', fontWeight: '500', marginLeft: '8px' }}
                          >
                            {conn.entity_name || conn.entity_id}
                          </Link>
                        )}
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {isEntityMissing && (
                          <button
                            onClick={async () => {
                              if (window.confirm(`Удалить связь с несуществующей сущностью ${conn.entity_type}?`)) {
                                const response = await fetch(`${API_URL}/api/media/${mediaId}`, {
                                  method: 'DELETE',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ entityType: conn.entity_type, entityId: conn.entity_id })
                                });
                                const result = await response.json();
                                if (result.success) {
                                  alert('✅ Связь удалена');
                                  fetchFileInfo(mediaId);
                                } else {
                                  alert('❌ Ошибка: ' + result.error);
                                }
                              }
                            }}
                            style={{
                              padding: '4px 12px',
                              backgroundColor: '#dc3545',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '12px'
                            }}
                          >
                            🗑️ Удалить связь
                          </button>
                        )}
                        <span style={{ fontSize: '11px', color: '#999' }}>ID: {conn.entity_id}</span>
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ padding: '12px', backgroundColor: '#fff3cd', borderRadius: '4px', color: '#856404', fontSize: '13px' }}>
                ⚠️ Нет связанных сущностей
              </div>
            )}
          </div>
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
          <div style={{ marginBottom: '15px' }}>
            <small>Тут используется ссылка, полученная налету из API Яндекс-Диска, а не текущая ссылка из БД</small>
          </div>
          
          <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
            <button 
              onClick={showInIframe} 
              disabled={loading} 
              style={buttonStyle('#007bff')}
              title="Вариант 1: PDF загружается через прокси (same-origin blob) и вставляется в iframe."
            >
              📦 Вариант 1: iframe (прокси + blob)
            </button>
            
            <button 
              onClick={showInMediaTag} 
              disabled={loading} 
              style={buttonStyle('#28a745')}
              title="Вариант 2: изображение/видео через прокси (same-origin blob) в теге img/video."
            >
              🖼️ Вариант 2: img/video тег (прокси + blob)
            </button>
            
            <button 
              onClick={showInModal} 
              disabled={loading} 
              style={buttonStyle('#6c757d')}
              title="Вариант 3: то же, что Варианты 1 и 2, но в модальном окне."
            >
              🪟 Вариант 3: Модальное окно (прокси + blob)
            </button>
            
            <button 
              onClick={showViaReactPdf} 
              disabled={loading || pdfLoading} 
              style={buttonStyle('#9c27b0', loading || pdfLoading)}
              title="Вариант 4: рендеринг PDF через react-pdf (pdf.js) на canvas. Работает на Android."
            >
              {pdfLoading ? '⏳ Загрузка...' : '📱 Вариант 4: react-pdf'}
            </button>
            
            {(displayMode || blobData || pdfBlobUrl) && (
              <button 
                onClick={clearBlob} 
                style={buttonStyle('#dc3545')}
                title={`Закрыть просмотр и освободить память.
Нажимать после каждого варианта перед открытием следующего.`}
              >
                ✖ Очистить
              </button>
            )}
          </div>
          
          {/* Описание вариантов */}
          <div style={{ marginTop: '20px', padding: '15px', background: '#fff', borderRadius: '6px', fontSize: '13px', lineHeight: '1.6' }}>
            <h4 style={{ margin: '0 0 10px 0', color: '#495057' }}>📋 Описание вариантов</h4>
            
            <div style={{ marginBottom: '15px', padding: '10px', background: '#fff3cd', borderRadius: '4px', fontSize: '12px', color: '#856404' }}>
              ⚠️ <strong>Важно:</strong> варианты 1–3 на Android <strong>не отображают PDF в iframe</strong> — это ограничение мобильных браузеров. Используйте Вариант 4 (react-pdf).
            </div>
            
            <div style={{ display: 'grid', gap: '10px' }}>
              <div style={{ padding: '8px', background: '#e3f2fd', borderRadius: '4px' }}>
                <strong style={{ color: '#007bff' }}>📦 Вариант 1: iframe (прокси + blob)</strong>
                <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                  Работает на десктопе. На Android — не отображает PDF.
                </div>
              </div>

              <div style={{ padding: '8px', background: '#e8f5e9', borderRadius: '4px' }}>
                <strong style={{ color: '#28a745' }}>🖼️ Вариант 2: img/video тег (прокси + blob)</strong>
                <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                  Работает для изображений и видео на всех платформах.
                </div>
              </div>

              <div style={{ padding: '8px', background: '#f5f5f5', borderRadius: '4px' }}>
                <strong style={{ color: '#6c757d' }}>🪟 Вариант 3: Модальное окно (прокси + blob)</strong>
                <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                  Работает на десктопе. На Android — не отображает PDF.
                </div>
              </div>

              <div style={{ padding: '8px', background: '#f3e5f5', borderRadius: '4px', borderLeft: '4px solid #9c27b0' }}>
                <strong style={{ color: '#9c27b0' }}>📱 Вариант 4: react-pdf</strong>
                <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                  PDF рендерится на клиенте через <code>pdf.js</code>. Работает на всех платформах, включая Android. Есть навигация по страницам и масштабирование.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Вариант 1: iframe */}
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

      {/* Вариант 2: img/video */}
      {displayMode === 'media' && blobData && (
        <div style={{ marginBottom: '20px', border: '1px solid #ddd', borderRadius: '8px', overflow: 'hidden' }}>
          <div style={{ padding: '10px', background: '#f0f0f0', borderBottom: '1px solid #ddd' }}>
            <strong>🖼️ Просмотр через {isVideo ? 'video' : 'img'} тег</strong>
          </div>
          <div style={{ textAlign: 'center', padding: '15px', background: '#fafafa' }}>
            {isVideo ? (
              <video src={blobData.url} controls style={{ maxWidth: '100%', maxHeight: '500px' }} />
            ) : (
              <img src={blobData.url} alt={blobData.name} style={{ maxWidth: '100%', maxHeight: '500px', objectFit: 'contain' }} />
            )}
          </div>
        </div>
      )}

      {/* ===== Вариант 4: react-pdf ===== */}
      {displayMode === 'react-pdf' && pdfBlobUrl && (
        <div style={{ 
          marginBottom: '20px', 
          border: '1px solid #ddd', 
          borderRadius: '8px', 
          overflow: 'hidden',
          backgroundColor: '#f8f9fa'
        }}>
          {/* Заголовок с управлением */}
          <div style={{ 
            padding: '10px 15px', 
            background: '#f0f0f0', 
            borderBottom: '1px solid #ddd',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '10px'
          }}>
            <strong>📱 Вариант 4: react-pdf</strong>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <button
                onClick={() => setPdfPageNumber(prev => Math.max(prev - 1, 1))}
                disabled={pdfPageNumber <= 1}
                style={{
                  padding: '4px 10px',
                  cursor: pdfPageNumber <= 1 ? 'not-allowed' : 'pointer',
                  backgroundColor: pdfPageNumber <= 1 ? '#e9ecef' : '#007bff',
                  color: pdfPageNumber <= 1 ? '#6c757d' : 'white',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '12px'
                }}
              >
                ◀ Назад
              </button>
              
              <span style={{ fontSize: '13px' }}>
                Стр. <strong>{pdfPageNumber}</strong> из <strong>{pdfNumPages || '...'}</strong>
              </span>
              
              <button
                onClick={() => setPdfPageNumber(prev => Math.min(prev + 1, pdfNumPages || 1))}
                disabled={!pdfNumPages || pdfPageNumber >= pdfNumPages}
                style={{
                  padding: '4px 10px',
                  cursor: (!pdfNumPages || pdfPageNumber >= pdfNumPages) ? 'not-allowed' : 'pointer',
                  backgroundColor: (!pdfNumPages || pdfPageNumber >= pdfNumPages) ? '#e9ecef' : '#007bff',
                  color: (!pdfNumPages || pdfPageNumber >= pdfNumPages) ? '#6c757d' : 'white',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '12px'
                }}
              >
                Вперёд ▶
              </button>
              
              <div style={{ borderLeft: '1px solid #ccc', height: '20px', margin: '0 5px' }} />
              
              <button
                onClick={() => setPdfScale(prev => Math.max(prev - 0.25, 0.5))}
                style={{
                  padding: '4px 10px',
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
              >
                ➖
              </button>
              
              <span style={{ fontSize: '13px' }}>{Math.round(pdfScale * 100)}%</span>
              
              <button
                onClick={() => setPdfScale(prev => Math.min(prev + 0.25, 3.0))}
                style={{
                  padding: '4px 10px',
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
              >
                ➕
              </button>
            </div>
          </div>
          
          {/* PDF Document */}
          <div style={{ 
            padding: '15px', 
            backgroundColor: '#e9ecef',
            maxHeight: '80vh',
            overflow: 'auto',
            textAlign: 'center'
          }}>
            {pdfError && (
              <div style={{ padding: '15px', backgroundColor: '#f8d7da', color: '#721c24', borderRadius: '4px', marginBottom: '10px' }}>
                ❌ {pdfError}
              </div>
            )}
            
            <Document
              file={pdfBlobUrl}
              onLoadSuccess={({ numPages }) => {
                console.log('[react-pdf] Loaded, pages:', numPages);
                setPdfNumPages(numPages);
              }}
              onLoadError={(error) => {
                console.error('[react-pdf] Load error:', error);
                setPdfError(`Ошибка рендеринга: ${error.message}`);
              }}
              loading={
                <div style={{ padding: '20px' }}>
                  <div style={{ fontSize: '32px' }}>⏳</div>
                  <p>Загрузка PDF...</p>
                </div>
              }
            >
              <Page
                pageNumber={pdfPageNumber}
                scale={pdfScale}
                renderTextLayer={true}
                renderAnnotationLayer={true}
                loading={
                  <div style={{ padding: '20px' }}>
                    <div style={{ fontSize: '24px' }}>⏳</div>
                    <p>Загрузка страницы...</p>
                  </div>
                }
              />
            </Document>
          </div>
          
          {/* Информация о файле */}
          <div style={{ 
            padding: '10px 15px', 
            backgroundColor: '#f8f9fa', 
            borderTop: '1px solid #ddd',
            fontSize: '12px',
            color: '#666'
          }}>
            <strong>Файл:</strong> {fileName}
            {fileSize && <span style={{ marginLeft: '15px' }}><strong>Размер:</strong> {formatFileSize(fileSize)}</span>}
          </div>
        </div>
      )}

      {/* Модальное окно (Вариант 3) */}
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