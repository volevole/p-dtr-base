// TestYandexPreview.js
import React, { useState, useEffect } from 'react';
import { supabase } from './utils/supabaseClient';
import API_URL from './config/api';

function TestYandexPreview() {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  
  useEffect(() => {
    fetchFiles();
  }, []);

  const fetchFiles = async () => {
    const { data, error } = await supabase
      .from('media_files')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (!error) {
      setFiles(data || []);
    }
  };

  const updatePreview = async (mediaId) => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/media/${mediaId}/update-yandex-preview`, {
        method: 'POST'
      });
      
      const result = await response.json();
      
      setResults(prev => [...prev, {
        mediaId,
        success: result.success,
        changes: result.changes || [],
        hasPreview: result.hasPreview,
        timestamp: new Date().toISOString()
      }]);
      
      // Обновляем список файлов
      fetchFiles();
      
    } catch (error) {
      setResults(prev => [...prev, {
        mediaId,
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      }]);
    } finally {
      setLoading(false);
    }
  };

  const updateAll = async () => {
    setLoading(true);
    const newResults = [];
    
    for (const file of files) {
      try {
        const response = await fetch(`${API_URL}/api/media/${file.id}/update-yandex-preview`, {
          method: 'POST'
        });
        
        const result = await response.json();
        newResults.push({
          mediaId: file.id,
          fileName: file.file_name,
          success: result.success,
          changes: result.changes || [],
          hasPreview: result.hasPreview
        });
        
        // Пауза между запросами
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (error) {
        newResults.push({
          mediaId: file.id,
          fileName: file.file_name,
          success: false,
          error: error.message
        });
      }
    }
    
    setResults(newResults);
    setLoading(false);
    fetchFiles();
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h2>Тест Яндекс.Диск превью</h2>
      
      <button 
        onClick={updateAll}
        disabled={loading}
        style={{ 
          padding: '10px 20px', 
          marginBottom: '20px',
          backgroundColor: loading ? '#ccc' : '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: loading ? 'not-allowed' : 'pointer'
        }}
      >
        {loading ? 'Обновление...' : 'Обновить все файлы'}
      </button>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        <div>
          <h3>Файлы</h3>
          {files.map(file => (
            <div key={file.id} style={{ 
              padding: '10px', 
              marginBottom: '10px', 
              border: '1px solid #ddd',
              borderRadius: '4px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <div><strong>{file.file_name}</strong></div>
                <div style={{ fontSize: '12px', color: '#666' }}>
                  {file.file_type} • {file.thumbnail_url ? 'Есть превью' : 'Нет превью'}
                  {file.duration_seconds && ` • ${file.duration_seconds} сек`}
                </div>
              </div>
              <button
                onClick={() => updatePreview(file.id)}
                disabled={loading}
                style={{ 
                  padding: '5px 10px',
                  fontSize: '12px',
                  backgroundColor: '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '3px',
                  cursor: 'pointer'
                }}
              >
                Обновить
              </button>
            </div>
          ))}
        </div>
        
        <div>
          <h3>Результаты</h3>
          {results.map((result, index) => (
            <div key={index} style={{ 
              padding: '10px', 
              marginBottom: '10px', 
              border: '1px solid #ddd',
              borderRadius: '4px',
              backgroundColor: result.success ? '#d4edda' : '#f8d7da'
            }}>
              <div><strong>Файл:</strong> {result.fileName || result.mediaId}</div>
              <div><strong>Статус:</strong> {result.success ? '✅ Успех' : '❌ Ошибка'}</div>
              {result.changes && result.changes.length > 0 && (
                <div><strong>Изменения:</strong> {result.changes.join(', ')}</div>
              )}
              {result.hasPreview && (
                <div><strong>Превью:</strong> доступно</div>
              )}
              {result.error && (
                <div><strong>Ошибка:</strong> {result.error}</div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default TestYandexPreview;