// utils/AllMediaPage.js
import React, { useState, useEffect } from 'react';
import MediaViewer from '../MediaViewer';
import { getFileIcon, formatFileSize } from './mediaUtils';
import API_URL from '../config/api';

function AllMediaPage() {
  const [mediaFiles, setMediaFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [showViewer, setShowViewer] = useState(false);
  const [updatingLinks, setUpdatingLinks] = useState(false);
  const [updatingPreviews, setUpdatingPreviews] = useState(false);
  const [updatingItemId, setUpdatingItemId] = useState(null);
  const [toast, setToast] = useState({ show: false, message: '', type: 'info' });

  const showToast = (message, type = 'info') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'info' }), 3000);
  };

  const fetchMediaFiles = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/media/all`);
      const result = await response.json();
      
      if (result.success) {
        setMediaFiles(result.data);
        showToast(`Загружено ${result.data.length} файлов`, 'success');
      } else {
        showToast('Ошибка загрузки: ' + result.error, 'error');
      }
    } catch (error) {
      console.error('Fetch error:', error);
      showToast('Ошибка: ' + error.message, 'error');
      setMediaFiles([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMediaFiles();
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm('Удалить файл?')) return;
    try {
      const response = await fetch(`${API_URL}/api/media/${id}`, { method: 'DELETE' });
      const result = await response.json();
      if (result.success) {
        setMediaFiles(prev => prev.filter(f => f.id !== id));
        showToast('Файл удалён', 'success');
      } else {
        showToast('Ошибка: ' + result.error, 'error');
      }
    } catch (error) {
      showToast('Ошибка: ' + error.message, 'error');
    }
  };

  const handleUpdateDescription = async (id, description) => {
    try {
      const response = await fetch(`${API_URL}/api/media/${id}/update-metadata`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description })
      });
      const result = await response.json();
      if (result.success) {
        setMediaFiles(prev => prev.map(f => f.id === id ? { ...f, description } : f));
        showToast('Описание обновлено', 'success');
      }
    } catch (error) {
      showToast('Ошибка: ' + error.message, 'error');
    }
  };

  // Обновление прямой ссылки для одного файла
  const handleUpdateSingleLink = async (file) => {
    if (!file.public_url) {
      showToast('Нет public_url для этого файла', 'warning');
      return;
    }

    setUpdatingItemId(file.id);
    showToast(`Обновление ссылки для ${file.file_name}...`, 'info');

    try {
      const mediaItems = [{
        id: file.id,
        publicUrl: file.public_url,
        currentFileUrl: file.file_url,
        currentThumbnailUrl: file.thumbnail_url,
        fileName: file.file_name,
        fileType: file.file_type
      }];
      
      const response = await fetch(`${API_URL}/api/refresh-links`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mediaItems })
      });
      
      const result = await response.json();
      
      if (result.success && result.results?.[0]?.success) {
        // Обновляем данные файла в локальном состоянии
        const updated = result.results[0];
        setMediaFiles(prev => prev.map(f => 
          f.id === file.id 
            ? { 
                ...f, 
                file_url: updated.updatedFileUrl || f.file_url,
                thumbnail_url: updated.updatedThumbnailUrl || f.thumbnail_url
              } 
            : f
        ));
        showToast(`Ссылка обновлена для ${file.file_name}`, 'success');
      } else {
        showToast('Ошибка обновления ссылки', 'error');
      }
    } catch (error) {
      showToast('Ошибка: ' + error.message, 'error');
    } finally {
      setUpdatingItemId(null);
    }
  };

  // Обновление превью для одного файла
  const handleUpdateSinglePreview = async (file) => {
    if (!file.public_url) {
      showToast('Нет public_url для этого файла', 'warning');
      return;
    }

    setUpdatingItemId(file.id);
    showToast(`Обновление превью для ${file.file_name}...`, 'info');

    try {
      // Получаем свежее превью через API
      const apiUrl = `https://cloud-api.yandex.net/v1/disk/public/resources?public_key=${encodeURIComponent(file.public_url)}&preview_size=M`;
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
        // Обновляем в базе
        const updateResponse = await fetch(`${API_URL}/api/media/${file.id}/update-metadata`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ thumbnail_url: previewUrl, thumbnail_updated_at: new Date().toISOString() })
        });
        
        const updateResult = await updateResponse.json();
        if (updateResult.success) {
          setMediaFiles(prev => prev.map(f => 
            f.id === file.id 
              ? { ...f, thumbnail_url: previewUrl, thumbnail_updated_at: new Date().toISOString() } 
              : f
          ));
          showToast(`Превью обновлено для ${file.file_name}`, 'success');
        } else {
          showToast('Ошибка сохранения превью', 'error');
        }
      } else {
        showToast('Не удалось получить превью от Яндекса', 'warning');
      }
    } catch (error) {
      showToast('Ошибка: ' + error.message, 'error');
    } finally {
      setUpdatingItemId(null);
    }
  };

  // Массовое обновление ссылок
  const handleUpdateLinks = async () => {
    const filesToUpdate = mediaFiles.filter(f => f.public_url);
    
    if (filesToUpdate.length === 0) {
      showToast('Нет файлов для обновления (нет public_url)', 'warning');
      return;
    }
    
    if (!window.confirm(`Обновить ссылки для ${filesToUpdate.length} файлов?\n\nЭто займёт около ${Math.ceil(filesToUpdate.length * 0.5)} секунд.`)) return;
    
    setUpdatingLinks(true);
    showToast(`Начинаю обновление ${filesToUpdate.length} файлов...`, 'info');
    
    try {
      const mediaItems = filesToUpdate.map(f => ({
        id: f.id,
        publicUrl: f.public_url,
        currentFileUrl: f.file_url,
        currentThumbnailUrl: f.thumbnail_url,
        fileName: f.file_name,
        fileType: f.file_type
      }));
      
      const response = await fetch(`${API_URL}/api/refresh-links`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mediaItems })
      });
      
      const result = await response.json();
      
      if (result.success) {
        const successCount = result.results.filter(r => r.success && r.updated).length;
        showToast(`Обновлено: ${successCount} из ${filesToUpdate.length} файлов`, 'success');
        await fetchMediaFiles();
      } else {
        showToast('Ошибка: ' + result.error, 'error');
      }
    } catch (error) {
      showToast('Ошибка: ' + error.message, 'error');
    } finally {
      setUpdatingLinks(false);
    }
  };

  // Массовое обновление превью
  const handleUpdatePreviews = async () => {
    const filesWithoutPreview = mediaFiles.filter(f => !f.thumbnail_url && f.file_type !== 'image');
    
    if (filesWithoutPreview.length === 0) {
      showToast('Нет файлов без превью', 'info');
      return;
    }
    
    if (!window.confirm(`Обновить превью для ${filesWithoutPreview.length} файлов?`)) return;
    
    setUpdatingPreviews(true);
    showToast(`Обновляю превью для ${filesWithoutPreview.length} файлов...`, 'info');
    
    try {
      // По очереди обновляем каждое превью
      let successCount = 0;
      for (const file of filesWithoutPreview) {
        const apiUrl = `https://cloud-api.yandex.net/v1/disk/public/resources?public_key=${encodeURIComponent(file.public_url)}&preview_size=M`;
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
          await fetch(`${API_URL}/api/media/${file.id}/update-metadata`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ thumbnail_url: previewUrl, thumbnail_updated_at: new Date().toISOString() })
          });
          successCount++;
        }
        
        // Небольшая пауза между запросами
        await new Promise(resolve => setTimeout(resolve, 300));
      }
      
      showToast(`Превью обновлено для ${successCount} файлов`, 'success');
      await fetchMediaFiles();
    } catch (error) {
      showToast('Ошибка: ' + error.message, 'error');
    } finally {
      setUpdatingPreviews(false);
    }
  };

  // Новая функция: открыть тестовую страницу для файла
  const openTestPage = (mediaItem) => {
    //localStorage.setItem('test_media_id', mediaItem.id);
    //window.open('/test-refresh', '_blank');
    // Передаём ID через URL параметр, а не через localStorage
    window.open(`/test-refresh?id=${mediaItem.id}`, '_blank');
  };

  const filteredMedia = mediaFiles.filter(item => {
    if (!filter) return true;
    const search = filter.toLowerCase();
    return (item.file_name || '').toLowerCase().includes(search) ||
           (item.description || '').toLowerCase().includes(search) ||
           (item.file_type || '').toLowerCase().includes(search);
  });

  if (loading) return <div style={{ padding: '2rem' }}>Загрузка...</div>;

  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: 'auto' }}>
      <h1>Все медиафайлы</h1>
      
      {/* Toast уведомления */}
      {toast.show && (
        <div style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          padding: '12px 20px',
          backgroundColor: toast.type === 'error' ? '#dc3545' : toast.type === 'success' ? '#28a745' : '#17a2b8',
          color: 'white',
          borderRadius: '8px',
          zIndex: 1000,
          boxShadow: '0 2px 10px rgba(0,0,0,0.2)'
        }}>
          {toast.message}
        </div>
      )}
      
      {/* Панель управления */}
      <div style={{ marginBottom: '20px', display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap' }}>
        <div><strong>Всего:</strong> {mediaFiles.length}</div>
        
        <button 
          onClick={fetchMediaFiles} 
          style={buttonStyle('#6c757d')}
          title="Перезагрузить список файлов из базы данных"
        >
          🔄 Обновить список
        </button>
        
        <button 
          onClick={handleUpdateLinks} 
          disabled={updatingLinks} 
          style={buttonStyle('#007bff', updatingLinks)}
          title="Обновить прямые ссылки для всех файлов"
        >
          {updatingLinks ? '⏳ Обновление...' : `🔄 Обновить все ссылки (${mediaFiles.filter(f => f.public_url).length})`}
        </button>
        
        <button 
          onClick={handleUpdatePreviews} 
          disabled={updatingPreviews} 
          style={buttonStyle('#17a2b8', updatingPreviews)}
          title="Обновить превью для всех файлов"
        >
          {updatingPreviews ? '⏳ Обновление...' : `🖼️ Обновить все превью (${mediaFiles.filter(f => !f.thumbnail_url).length})`}
        </button>
      </div>

      {/* Поиск */}
      <input
        type="text"
        placeholder="Поиск по названию, описанию, типу..."
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        style={{
          width: '100%',
          padding: '10px',
          fontSize: '16px',
          border: '1px solid #ddd',
          borderRadius: '4px',
          marginBottom: '20px'
        }}
      />

      {/* Статистика */}
      <div style={{ marginBottom: '20px', display: 'flex', gap: '10px', flexWrap: 'wrap', fontSize: '13px' }}>
        <span style={{ padding: '4px 10px', backgroundColor: '#e9ecef', borderRadius: '20px' }}>
          📷 Изображения: {mediaFiles.filter(f => f.file_type === 'image').length}
        </span>
        <span style={{ padding: '4px 10px', backgroundColor: '#e9ecef', borderRadius: '20px' }}>
          🎬 Видео: {mediaFiles.filter(f => f.file_type === 'video').length}
        </span>
        <span style={{ padding: '4px 10px', backgroundColor: '#e9ecef', borderRadius: '20px' }}>
          📄 Документы: {mediaFiles.filter(f => f.file_type === 'document').length}
        </span>
        <span style={{ padding: '4px 10px', backgroundColor: '#fff3cd', borderRadius: '20px' }}>
          ⚠️ Без превью: {mediaFiles.filter(f => !f.thumbnail_url).length}
        </span>
      </div>

      {/* Список файлов с индивидуальными кнопками */}
      {filteredMedia.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
          Медиафайлы не найдены
        </div>
      ) : (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', 
          gap: '15px' 
        }}>
          {filteredMedia.map(item => {
            const isImage = item.file_type === 'image';
            const isVideo = item.file_type === 'video';
            const isPdf = item.file_name?.toLowerCase().endsWith('.pdf');
            const isUpdating = updatingItemId === item.id;
            
            return (
              <div 
                key={item.id}
                style={{
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  backgroundColor: 'white',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                }}
              >
                {/* Миниатюра или иконка */}
                <div 
                  style={{ 
                    height: '150px', 
                    backgroundColor: '#f0f0f0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '48px',
                    cursor: 'pointer',
                    position: 'relative'
                  }}
                  onClick={() => setSelectedMedia(item)}
                >
                  {item.thumbnail_url ? (
                    <img 
                      src={item.thumbnail_url} 
                      alt={item.file_name}
                      style={{ 
                        width: '100%', 
                        height: '100%', 
                        objectFit: 'cover' 
                      }}
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.parentElement.innerHTML = getFileIcon(item.file_type);
                      }}
                    />
                  ) : (
                    getFileIcon(item.file_type)
                  )}
                  
                  {/* Индикатор обновления */}
                  {isUpdating && (
                    <div style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      backgroundColor: 'rgba(0,0,0,0.5)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontSize: '20px'
                    }}>
                      ⏳
                    </div>
                  )}
                </div>
                
                {/* Информация о файле */}
                <div style={{ padding: '10px' }}>
                  <div style={{ 
                    fontWeight: 'bold', 
                    whiteSpace: 'nowrap', 
                    overflow: 'hidden', 
                    textOverflow: 'ellipsis',
                    fontSize: '12px'
                  }} title={item.file_name}>
                    {item.file_name}
                  </div>
                  
                  <div style={{ 
                    fontSize: '11px', 
                    color: '#666', 
                    marginTop: '4px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <span>
                      {isImage ? '🖼️' : isVideo ? '🎬' : isPdf ? '📄' : '📁'}
                    </span>
                    <span>{formatFileSize(item.file_size)}</span>
                  </div>
                  
                  {item.description && (
                    <div style={{ 
                      fontSize: '10px', 
                      color: '#888', 
                      marginTop: '4px',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {item.description}
                    </div>
                  )}
                  
                  {/* Кнопки действий */}
                  <div style={{ 
                    display: 'flex', 
                    gap: '5px', 
                    marginTop: '8px',
                    flexWrap: 'wrap',
                    justifyContent: 'center'
                  }}>
                    <button
                      onClick={() => handleUpdateSingleLink(item)}
                      disabled={isUpdating}
                      style={{
                        padding: '4px 8px',
                        backgroundColor: '#007bff',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: isUpdating ? 'not-allowed' : 'pointer',
                        fontSize: '10px',
                        opacity: isUpdating ? 0.6 : 1
                      }}
                      title="Обновить прямую ссылку на файл"
                    >
                      🔗 Ссылку
                    </button>
                    <button
                      onClick={() => handleUpdateSinglePreview(item)}
                      disabled={isUpdating}
                      style={{
                        padding: '4px 8px',
                        backgroundColor: '#17a2b8',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: isUpdating ? 'not-allowed' : 'pointer',
                        fontSize: '10px',
                        opacity: isUpdating ? 0.6 : 1
                      }}
                      title="Обновить превью"
                    >
                      🖼️ Превью
                    </button>
                    <button
                      onClick={() => openTestPage(item)}
                      style={{
                        padding: '4px 8px',
                        backgroundColor: '#6c757d',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '10px'
                      }}
                      title="Открыть в тестовой странице с 3 вариантами"
                    >
                      🧪 Тест
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      disabled={isUpdating}
                      style={{
                        padding: '4px 8px',
                        backgroundColor: '#dc3545',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: isUpdating ? 'not-allowed' : 'pointer',
                        fontSize: '10px',
                        opacity: isUpdating ? 0.6 : 1
                      }}
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Просмотрщик */}
      {showViewer && selectedMedia && (
        <div style={modalStyle} onClick={() => setShowViewer(false)}>
          <div style={modalContentStyle} onClick={e => e.stopPropagation()}>
            <button onClick={() => setShowViewer(false)} style={closeButtonStyle}>×</button>
            <MediaViewer media={selectedMedia} />
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
  borderRadius: '6px',
  cursor: disabled ? 'not-allowed' : 'pointer',
  fontSize: '14px',
  fontWeight: '500',
  display: 'inline-flex',
  alignItems: 'center',
  gap: '5px',
  transition: 'all 0.2s ease'
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
  position: 'relative',
  backgroundColor: 'white',
  borderRadius: '8px',
  maxWidth: '90vw',
  maxHeight: '90vh',
  overflow: 'auto'
};

const closeButtonStyle = {
  position: 'absolute',
  top: '10px',
  right: '10px',
  backgroundColor: 'rgba(0,0,0,0.5)',
  color: 'white',
  border: 'none',
  borderRadius: '50%',
  width: '30px',
  height: '30px',
  fontSize: '20px',
  cursor: 'pointer',
  zIndex: 1001
};

export default AllMediaPage;