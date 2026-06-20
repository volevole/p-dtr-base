// src/TestImage.js
import React, { useState } from 'react';
import API_URL from './config/api';

function TestImage() {
  const [url, setUrl] = useState('https://yadi.sk/d/Wov95KoxoogoBw');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [blobUrl, setBlobUrl] = useState('');

  console.log('[TestImage] API_URL:', API_URL);

  // Вариант 1: через ваш прокси (старый)
  const testProxy = () => {
    setBlobUrl(`${API_URL}/api/yandex-preview?url=${encodeURIComponent(url)}&size=M`);
  };

  // Вариант 2: fetch + blob через ваш прокси (с явным указанием mode)
  const testFetchBlob = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${API_URL}/api/yandex-preview?url=${encodeURIComponent(url)}&size=M&mode=legacy`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      setBlobUrl(objectUrl);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Вариант 3: прямой вызов API Яндекса из браузера
  const testDirectYandexApi = async () => {
    setLoading(true);
    setError('');
    try {
      const apiUrl = `https://cloud-api.yandex.net/v1/disk/public/resources?public_key=${encodeURIComponent(url)}&preview_size=M`;
      const yandexResponse = await fetch(apiUrl);
      if (!yandexResponse.ok) throw new Error(`Yandex API HTTP ${yandexResponse.status}`);
      const yandexData = await yandexResponse.json();
      
      let previewUrl = null;
      if (yandexData.preview) {
        if (typeof yandexData.preview === 'string') {
          previewUrl = yandexData.preview;
        } else if (yandexData.preview.M) {
          previewUrl = yandexData.preview.M;
        }
      }
      
      if (!previewUrl) {
        throw new Error('Preview URL not found');
      }
      
      setBlobUrl(previewUrl);
    } catch (err) {
      console.error('Direct API error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Вариант 4: через общедоступный CORS-прокси
  const testCorsProxy = async () => {
    setLoading(true);
    setError('');
    try {
      const apiUrl = `https://cloud-api.yandex.net/v1/disk/public/resources?public_key=${encodeURIComponent(url)}&preview_size=M`;
      const yandexResponse = await fetch(apiUrl);
      const yandexData = await yandexResponse.json();
      
      let previewUrl = null;
      if (yandexData.preview) {
        if (typeof yandexData.preview === 'string') {
          previewUrl = yandexData.preview;
        } else if (yandexData.preview.M) {
          previewUrl = yandexData.preview.M;
        }
      }
      
      if (!previewUrl) {
        throw new Error('Preview URL not found');
      }
      
      const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(previewUrl)}`;
      setBlobUrl(proxyUrl);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Вариант 5: новый curl-прокси (для продакшена)
  const testCurlProxy = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${API_URL}/api/curl-proxy-image?url=${encodeURIComponent(url)}&size=M`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      setBlobUrl(objectUrl);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Вариант 6: новый curl-прокси для полного файла
    const testCurlFileProxy = async () => {
        setLoading(true);
        setError('');
        try {
            const proxyUrl = `${API_URL}/api/curl-proxy-file?url=${encodeURIComponent(url)}&size=M`;
            //console.log('[testCurlFileProxy] Requesting:', proxyUrl);
            
            const response = await fetch(proxyUrl);
            //console.log('[testCurlFileProxy] Response status:', response.status);
            //console.log('[testCurlFileProxy] Response headers:', [...response.headers.entries()]);
            
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const blob = await response.blob();
            //console.log('[testCurlFileProxy] Blob size:', blob.size, 'type:', blob.type);
            const objectUrl = URL.createObjectURL(blob);
            setBlobUrl(objectUrl);
        } catch (err) {
            console.error('Curl file proxy error:', err);
            setError(err.message);
        } finally {
            setLoading(false);
            }
        };

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Тест проксирования изображений</h1>
      
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
        <button onClick={testProxy}>1. Прямой src (ваш прокси)</button>
        <button onClick={testFetchBlob}>2. Fetch + blob (ваш прокси)</button>
        <button onClick={testDirectYandexApi}>3. Прямой API Яндекс + img</button>
        <button onClick={testCorsProxy}>4. Через CORS-прокси (corsproxy.io)</button>
        <button onClick={testCurlProxy}>5. Новый curl-прокси</button>
        <button onClick={testCurlFileProxy}>6. Новый curl-прокси для файла</button>
      </div>

      <div style={{ marginTop: '20px' }}>
        <h3>Результат:</h3>
        
        {blobUrl && (
          <div>
            <h4>Изображение:</h4>
            <img 
              src={blobUrl}
              alt="Preview"
              style={{ maxWidth: '200px', border: '1px solid #ddd' }}
              onError={(e) => console.log('Error loading image')}
            />
            <p>URL: <code style={{ wordBreak: 'break-all' }}>{blobUrl}</code></p>
          </div>
        )}

        {loading && <p>Загрузка...</p>}
        {error && <p style={{ color: 'red' }}>Ошибка: {error}</p>}
      </div>
      
      <div style={{ marginTop: '20px', padding: '10px', background: '#f0f0f0', borderRadius: '4px' }}>
        <h4>Информация:</h4>
        <p><strong>Текущий режим:</strong> {process.env.REACT_APP_YANDEX_DISK_MODE || 'не задан'}</p>
        <p><strong>API_URL:</strong> {API_URL || 'не задан'}</p>
      </div>
    </div>
  );
}

export default TestImage;