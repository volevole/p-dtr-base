// TestPreview.js
import React, { useState, useRef } from 'react';
import API_URL from './config/api';

function TestPreview() {
  const [url, setUrl] = useState('https://yadi.sk/d/Wov95KoxoogoBw');
  const [previewUrl, setPreviewUrl] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingFile, setLoadingFile] = useState(false);
  const [error, setError] = useState('');
  const [fileError, setFileError] = useState('');
  const [iframeSrc, setIframeSrc] = useState('');
  const [blobUrl, setBlobUrl] = useState('');
  const [embedMode, setEmbedMode] = useState('iframe'); // iframe, object, embed, blob

  const iframeRef = useRef(null);

  // Получение превью
  const testPreview = async () => {
    setLoading(true);
    setError('');
    setPreviewUrl('');
    
    try {
      const response = await fetch(`${API_URL}/api/test-preview?url=${encodeURIComponent(url)}&size=M`);
      const data = await response.json();
      
      if (data.success) {
        setPreviewUrl(data.previewUrl);
      } else {
        setError(data.error || 'Unknown error');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Получение прямой ссылки на файл
  const getFileUrl = async () => {
    setLoadingFile(true);
    setFileError('');
    setFileUrl('');
    
    try {
      const apiUrl = `https://cloud-api.yandex.net/v1/disk/public/resources/download?public_key=${encodeURIComponent(url)}`;
      const response = await fetch(apiUrl);
      
      if (!response.ok) {
        throw new Error(`API returned ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.href) {
        setFileUrl(data.href);
        // Автоматически пробуем blob
        tryBlobLoading(data.href);
      } else {
        setFileError('No download link found');
      }
    } catch (err) {
      setFileError(err.message);
    } finally {
      setLoadingFile(false);
    }
  };

  // Попытка загрузить файл через blob
  const tryBlobLoading = async (downloadUrl) => {
    try {
      const response = await fetch(downloadUrl);
      const blob = await response.blob();
      const blobUrl_ = URL.createObjectURL(blob);
      setBlobUrl(blobUrl_);
      console.log('Blob URL created:', blobUrl_);
    } catch (err) {
      console.error('Blob loading failed:', err);
    }
  };

  // Попытка открыть в iframe с разными параметрами
  const tryIframe = () => {
    setIframeSrc(url);
  };

  // Попытка через object тег
  const objectUrl = fileUrl || url;

  // Попытка через embed тег
  const embedUrl = fileUrl || url;

  // Попытка через Google Docs Viewer
  const googleDocsUrl = fileUrl ? `https://docs.google.com/viewer?url=${encodeURIComponent(fileUrl)}&embedded=true` : '';

  // Сброс blob URL
  const clearBlob = () => {
    if (blobUrl) {
      URL.revokeObjectURL(blobUrl);
      setBlobUrl('');
    }
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1000px', margin: 'auto' }}>
      <h1>Тест Яндекс.Диска — поиск способа открыть файл в браузере</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <label>Public URL:</label>
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          style={{ width: '100%', padding: '8px', marginTop: '5px' }}
        />
      </div>
      
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <button onClick={testPreview} disabled={loading} style={{ padding: '10px 20px' }}>
          {loading ? 'Загрузка...' : 'Получить превью'}
        </button>
        
        <button onClick={getFileUrl} disabled={loadingFile} style={{ padding: '10px 20px' }}>
          {loadingFile ? 'Загрузка...' : 'Получить прямую ссылку'}
        </button>
        
        <button onClick={tryIframe} style={{ padding: '10px 20px' }}>
          Попробовать iframe
        </button>
      </div>
      
      {/* Превью */}
      {previewUrl && (
        <div style={{ marginTop: '20px', border: '1px solid #ddd', padding: '15px', borderRadius: '8px' }}>
          <h3>✅ Превью</h3>
          <img src={previewUrl} alt="Preview" style={{ maxWidth: '100%', border: '1px solid #ddd' }} />
        </div>
      )}
      
      {/* Прямая ссылка на файл */}
      {fileUrl && (
        <div style={{ marginTop: '20px', border: '1px solid #ddd', padding: '15px', borderRadius: '8px' }}>
          <h3>✅ Прямая ссылка на файл</h3>
          <a href={fileUrl} target="_blank" rel="noopener noreferrer">Открыть в новой вкладке (скачивается)</a>
        </div>
      )}
      
      {/* Blob URL */}
      {blobUrl && (
        <div style={{ marginTop: '20px', border: '1px solid #28a745', padding: '15px', borderRadius: '8px', background: '#e8f5e9' }}>
          <h3>🔄 Blob URL (попытка открыть в браузере)</h3>
          <a href={blobUrl} target="_blank" rel="noopener noreferrer">Открыть blob URL в новой вкладке</a>
          <button onClick={clearBlob} style={{ marginLeft: '10px', padding: '5px 10px' }}>Очистить</button>
          <p style={{ fontSize: '12px', color: '#666' }}>Blob URL должен открыть файл в браузере, если тип файла поддерживается</p>
        </div>
      )}
      
      {/* Тест различных способов встраивания */}
      <div style={{ marginTop: '20px', border: '1px solid #ddd', padding: '15px', borderRadius: '8px' }}>
        <h3>🧪 Эксперименты с встраиванием</h3>
        
        <div style={{ marginBottom: '15px' }}>
          <label>Выберите способ:</label>
          <select value={embedMode} onChange={(e) => setEmbedMode(e.target.value)} style={{ marginLeft: '10px', padding: '5px' }}>
            <option value="iframe">iframe</option>
            <option value="object">object</option>
            <option value="embed">embed</option>
            <option value="google">Google Docs Viewer (PDF)</option>
          </select>
        </div>
        
        {embedMode === 'iframe' && (
          <div>
            <h4>iframe с public_url</h4>
            <p><code>{url}</code></p>
            <iframe 
              src={url}
              style={{ width: '100%', height: '400px', border: '1px solid #ccc' }}
              title="iframe"
              sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-modals"
            />
          </div>
        )}
        
        {embedMode === 'object' && objectUrl && (
          <div>
            <h4>object тег</h4>
            <object 
              data={objectUrl} 
              type="application/pdf"
              style={{ width: '100%', height: '400px', border: '1px solid #ccc' }}
              onError={(e) => console.log('Object error', e)}
            >
              <p>Не удалось отобразить файл. <a href={objectUrl}>Скачать</a></p>
            </object>
          </div>
        )}
        
        {embedMode === 'embed' && embedUrl && (
          <div>
            <h4>embed тег</h4>
            <embed 
              src={embedUrl}
              style={{ width: '100%', height: '400px', border: '1px solid #ccc' }}
              type="application/pdf"
            />
          </div>
        )}
        
        {embedMode === 'google' && fileUrl && (
          <div>
            <h4>Google Docs Viewer</h4>
            <p><code>{googleDocsUrl}</code></p>
            <iframe 
              src={googleDocsUrl}
              style={{ width: '100%', height: '400px', border: '1px solid #ccc' }}
              title="Google Docs Viewer"
            />
            <p style={{ fontSize: '12px', color: '#666' }}>Google Docs Viewer может открыть PDF и документы, если файл публично доступен</p>
          </div>
        )}
      </div>
      
      {/* Тест прямого img */}
      <div style={{ marginTop: '20px', border: '1px solid #ddd', padding: '15px', borderRadius: '8px' }}>
        <h3>🖼️ Тест img с public_url (для изображений)</h3>
        <img 
          src={url} 
          alt="Direct"
          style={{ maxWidth: '100%', border: '1px solid #ddd' }}
          onError={(e) => {
            e.target.style.display = 'none';
            e.target.parentElement.innerHTML += '<p style="color:red;">❌ Не удалось загрузить изображение напрямую</p>';
          }}
        />
      </div>
      
      {/* Информация о файле */}
      {fileUrl && (
        <div style={{ marginTop: '20px', padding: '10px', background: '#f0f0f0', borderRadius: '4px', fontSize: '12px' }}>
          <strong>Информация:</strong> Прямая ссылка содержит параметр <code>disposition=attachment</code>, который заставляет браузер скачивать файл, а не открывать его.
        </div>
      )}
    </div>
  );
}

export default TestPreview;