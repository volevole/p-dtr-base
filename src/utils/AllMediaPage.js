// utils/AllMediaPage.js
import React, { useState, useEffect } from 'react';
import MediaViewer from '../MediaViewer';
import { getFileIcon, formatFileSize } from './mediaUtils';
import API_URL, { config } from '../config/api';

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
  const [forceUpdating, setForceUpdating] = useState(false);
  
  const [findingOrphaned, setFindingOrphaned] = useState(false);
  const [orphanedFiles, setOrphanedFiles] = useState([]);
  const [showOrphaned, setShowOrphaned] = useState(false);
  const [orphanedPreviews, setOrphanedPreviews] = useState({});
  const [loadingPreviews, setLoadingPreviews] = useState({});
  const [deletingOrphaned, setDeletingOrphaned] = useState({});  //индикатор процесса удаления осиротевшего файла
  const [deletingTimer, setDeletingTimer] = useState({});  //состояние для хранения elapsed времени каждого удаляемого файла

  const isCurlMode = config.YANDEX_DISK_MODE === 'curl';

  const showToast = (message, type = 'info') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'info' }), 3000);
  };

  const isPreviewExpired = (file) => {
    if (!file.thumbnail_url) return true;
    if (!file.thumbnail_updated_at) return true;
    const updatedAt = new Date(file.thumbnail_updated_at);
    const now = new Date();
    const daysDiff = (now - updatedAt) / (1000 * 60 * 60 * 24);
    return daysDiff > 7;
  };

  const handleForceUpdatePreviews = async () => {
    const filesToUpdate = mediaFiles;
    if (filesToUpdate.length === 0) {
      showToast('Нет файлов для обновления', 'info');
      return;
    }
    if (!window.confirm(`ПРИНУДИТЕЛЬНО обновить превью для ${filesToUpdate.length} файлов?\n\nЭто может занять несколько минут.`)) return;
    setForceUpdating(true);
    showToast(`Принудительное обновление превью для ${filesToUpdate.length} файлов...`, 'info');
    try {
      const mediaIds = filesToUpdate.map(f => f.id);
      const response = await fetch(`${API_URL}/api/update-media-previews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mediaIds, entityType: 'all', entityId: null, force: true })
      });
      const result = await response.json();
      if (result.success) {
        const successCount = result.results.filter(r => r.success).length;
        showToast(`Принудительно обновлено превью для ${successCount} файлов`, 'success');
        await fetchMediaFiles();
      } else {
        showToast('Ошибка: ' + result.error, 'error');
      }
    } catch (error) {
      showToast('Ошибка: ' + error.message, 'error');
    } finally {
      setForceUpdating(false);
    }
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

  // Функция для загрузки превью осиротевших файлов:
  const loadOrphanedPreview = async (file) => {
    if (orphanedPreviews[file.path]) return;
    if (loadingPreviews[file.path]) return;
    
    setLoadingPreviews(prev => ({ ...prev, [file.path]: true }));
    
    try {
      // 1. Получаем public_url через наш эндпоинт
      const response = await fetch(
        `${API_URL}/api/yandex/file-preview?path=${encodeURIComponent(file.path)}`
      );
      const data = await response.json();
      
      if (data.success && data.publicUrl) {
        // 2. Формируем URL для превью через существующие эндпоинты
        let previewUrl;
        if (isCurlMode) {
          previewUrl = `${API_URL}/api/curl-proxy-image?url=${encodeURIComponent(data.publicUrl)}&size=${config.YANDEX_PREVIEW_SIZE || 'M'}`;
        } else {
          previewUrl = `${API_URL}/api/yandex-preview?url=${encodeURIComponent(data.publicUrl)}&size=${config.YANDEX_PREVIEW_SIZE || 'M'}&mode=embed`;
        }
        
        setOrphanedPreviews(prev => ({ 
          ...prev, 
          [file.path]: previewUrl 
        }));
      }
    } catch (error) {
      console.error('Error loading preview:', error);
    } finally {
      setLoadingPreviews(prev => ({ ...prev, [file.path]: false }));
    }
  };

  useEffect(() => {
    fetchMediaFiles();
  }, []);

  // Функция для получения URL превью в зависимости от режима
  const getPreviewUrl = (item) => {
    if (!item.public_url) return null;
    if (isCurlMode) {
      return `${API_URL}/api/curl-proxy-image?url=${encodeURIComponent(item.public_url)}&size=${config.YANDEX_PREVIEW_SIZE || 'M'}`;
    }
    // Для embed режима — используем thumbnail_url из БД
    return item.thumbnail_url || null;
  };
    //  основательное удаление медиа из всех таблиц
  const handleDelete = async (id) => {
    if (!window.confirm('Удалить медиафайл (все его связи с сущностями и строку описания медиафайла) ?')) 
      {return;}
    try {
      // Не передаём entityType и entityId — значит полное удаление
      const response = await fetch(`${API_URL}/api/media/${id}`, { 
        method: 'DELETE' 
      });
      const result = await response.json();
      
      if (result.success) {
        setMediaFiles(prev => prev.filter(f => f.id !== id));
        showToast('Медиафайл удалён', 'success');
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
        const updated = result.results[0];
        setMediaFiles(prev => prev.map(f => 
          f.id === file.id 
            ? { ...f, file_url: updated.updatedFileUrl || f.file_url, thumbnail_url: updated.updatedThumbnailUrl || f.thumbnail_url } 
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

  const handleUpdateSinglePreview = async (file) => {
    if (!file.public_url) {
      showToast('Нет public_url для этого файла', 'warning');
      return;
    }
    setUpdatingItemId(file.id);
    showToast(`Обновление превью для ${file.file_name}...`, 'info');
    try {
      const response = await fetch(`${API_URL}/api/update-media-previews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mediaIds: [file.id], entityType: 'all', entityId: null })
      });
      const result = await response.json();
      if (result.success && result.results?.[0]?.success) {
        await fetchMediaFiles();
        showToast(`Превью обновлено для ${file.file_name}`, 'success');
      } else {
        const error = result.results?.[0]?.error || 'Ошибка обновления превью';
        showToast(error, 'error');
      }
    } catch (error) {
      showToast('Ошибка: ' + error.message, 'error');
    } finally {
      setUpdatingItemId(null);
    }
  };

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

  const handleUpdatePreviews = async () => {
    const filesToUpdate = mediaFiles.filter(f => isPreviewExpired(f));
    if (filesToUpdate.length === 0) {
      showToast('Нет файлов с устаревшими или отсутствующими превью', 'info');
      return;
    }
    if (!window.confirm(`Обновить превью для ${filesToUpdate.length} файлов?`)) return;
    setUpdatingPreviews(true);
    showToast(`Обновляю превью для ${filesToUpdate.length} файлов...`, 'info');
    try {
      const mediaIds = filesToUpdate.map(f => f.id);
      const response = await fetch(`${API_URL}/api/update-media-previews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mediaIds, entityType: 'all', entityId: null })
      });
      const result = await response.json();
      if (result.success) {
        const successCount = result.results.filter(r => r.success).length;
        showToast(`Превью обновлено для ${successCount} файлов`, 'success');
        await fetchMediaFiles();
      } else {
        showToast('Ошибка: ' + result.error, 'error');
      }
    } catch (error) {
      showToast('Ошибка: ' + error.message, 'error');
    } finally {
      setUpdatingPreviews(false);
    }
  };

  const openTestPage = (mediaItem) => {
    window.open(`/test-refresh?id=${mediaItem.id}`, '_blank');
  };

  const filteredMedia = mediaFiles.filter(item => {
    if (!filter) return true;
    const search = filter.toLowerCase();
    return (item.file_name || '').toLowerCase().includes(search) ||
           (item.description || '').toLowerCase().includes(search) ||
           (item.file_type || '').toLowerCase().includes(search);
  });

  // Найти файлы на Яндекс.Диске, которых нет в БД
  const handleFindOrphaned = async () => {
    // Первый вопрос: предупреждение о времени выполнения
    if (!window.confirm(
      '🔍 Поиск файлов без записей в БД\n\n' +
      'Это может занять некоторое время, так как нужно:\n' +
      '1. Получить список всех файлов с Яндекс.Диска\n' +
      '2. Сравнить их с записями в базе данных\n\n' +
      'Продолжить?'
    )) {
      return;
    }

    setFindingOrphaned(true);
    setOrphanedFiles([]);
    setShowOrphaned(false);

    try {
      // Шаг 1: Получаем список файлов с Яндекс.Диска
      const response = await fetch(`${API_URL}/api/media/orphaned`);
      const data = await response.json();
      
      if (!data.success) {
        alert('❌ Ошибка: ' + data.error);
        return;
      }

      // Второй вопрос: показать промежуточные результаты
      const totalYandex = data.totalYandexFiles || 0;
      const totalDb = data.totalDbFiles || 0;
      const orphanedCount = data.orphanedCount || 0;
      const orphanedSizeMB = data.orphanedSizeMB || '0';

      if (orphanedCount === 0) {
        alert(
          '✅ Отлично! Все файлы на Яндекс.Диске имеют записи в БД.\n\n' +
          `📊 Всего на Яндекс.Диске: ${totalYandex}\n` +
          `📊 Всего в БД: ${totalDb}`
        );
        setOrphanedFiles([]);
        setShowOrphaned(false);
        return;
      }

      // Третий вопрос: показать найденные файлы и спросить, показывать ли список
      const shouldShow = window.confirm(
        `🔍 Найдено ${orphanedCount} файлов на Яндекс.Диске без записей в БД\n\n` +
        `📊 Всего на Яндекс.Диске: ${totalYandex}\n` +
        `📊 Всего в БД: ${totalDb}\n` +
        `📦 Общий размер: ${orphanedSizeMB} MB\n\n` +
        `Показать список файлов?`
      );

      if (shouldShow) {
        setOrphanedFiles(data.orphanedFiles || []);
        setShowOrphaned(true);
        
        // Четвёртый вопрос: спросить, что делать с найденными файлами
        const action = window.confirm(
          `🗑️ Что делать с найденными файлами?\n\n` +
          `Нажмите "OK" — чтобы перейти к управлению файлами (удаление с ЯД)\n` +
          `Нажмите "Отмена" — чтобы просто закрыть список`
        );
        
        if (action) {
          // Прокрутить к списку файлов
          document.getElementById('orphaned-files-section')?.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start' 
          });
        }
      } else {
        setOrphanedFiles([]);
        setShowOrphaned(false);
      }

    } catch (error) {
      console.error('Error finding orphaned files:', error);
      alert('❌ Ошибка: ' + error.message);
    } finally {
      setFindingOrphaned(false);
    }
  };

  if (loading) return <div style={{ padding: '2rem' }}>Загрузка...</div>;

  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: 'auto' }}>
      <h1>Все медиафайлы</h1>
      
      {/* Информационный блок о режиме */}
      <div style={{
        marginBottom: '20px',
        padding: '12px 20px',
        backgroundColor: isCurlMode ? '#e3f2fd' : '#f5f5f5',
        border: isCurlMode ? '1px solid #90caf9' : '1px solid #e0e0e0',
        borderRadius: '8px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '20px' }}>{isCurlMode ? '🔄' : '📦'}</span>
          <div>
            <strong style={{ color: isCurlMode ? '#0d47a1' : '#424242' }}>
              {isCurlMode ? 'Режим curl:' : 'Режим embed:'}
            </strong>
            <span style={{ marginLeft: '8px', color: isCurlMode ? '#1565c0' : '#616161' }}>
              {isCurlMode 
                ? 'Превью и ссылки обновляются на лету через curl-proxy, не из базы данных.'
                : 'Превью и ссылки берутся из базы данных (thumbnail_url и file_url).'
              }
            </span>
          </div>
        </div>
        <div style={{ fontSize: '13px', color: isCurlMode ? '#1565c0' : '#616161', paddingLeft: '36px' }}>
          <span style={{ fontWeight: '500' }}>📌 Удаление файла:</span>
          удаляется только запись из базы данных.
          Физический файл на Яндекс.Диске остаётся и его нужно удалять вручную через интерфейс Яндекс.Диска.
        </div>
      </div>

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
        
        <button onClick={fetchMediaFiles} style={buttonStyle('#6c757d')} title="Перезагрузить список файлов из базы данных">
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
          title="Обновить превью для файлов с устаревшими или отсутствующими превью (включая изображения)"
        >
          {updatingPreviews ? '⏳ Обновление...' : `🖼️ Обновить устаревшие (${mediaFiles.filter(f => isPreviewExpired(f)).length})`}
        </button>

        <button 
          onClick={handleForceUpdatePreviews} 
          disabled={forceUpdating || updatingPreviews} 
          style={buttonStyle('#dc3545', forceUpdating || updatingPreviews)}
          title="ПРИНУДИТЕЛЬНО обновить превью для ВСЕХ файлов (включая изображения)"
        >
          {forceUpdating ? '⏳ Обновление...' : `⚡ Принудительно (${mediaFiles.length})`}
        </button>

        {/* 🔍 НОВАЯ КНОПКА: Найти файлы без записей в БД */}
        <button 
          onClick={handleFindOrphaned} 
          disabled={findingOrphaned} 
          style={buttonStyle('#ff9800', findingOrphaned)}
          title="Найти файлы на Яндекс.Диске, которых нет в базе данных"
        >
          {findingOrphaned ? '⏳ Поиск...' : '🔍 Найти файлы без записей в БД'}
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
        <span style={{ padding: '4px 10px', backgroundColor: '#e9ecef', borderRadius: '20px' }}>
        🔗 Всего связей: {mediaFiles.reduce((sum, f) => sum + Number(f.connection_count || 0), 0)}
      </span>
        <span style={{ padding: '4px 10px', backgroundColor: '#fff3cd', borderRadius: '20px' }}>
          ⚠️ Без превью: {mediaFiles.filter(f => !f.thumbnail_url && f.file_type !== 'image').length}
        </span>
        <span style={{ padding: '4px 10px', backgroundColor: '#fff3cd', borderRadius: '20px' }}>
          ⚠️ Требуют обновления превью: {mediaFiles.filter(f => isPreviewExpired(f)).length}
        </span>
      </div>

      {/* Секция с найденными файлами без записей в БД */}
      {showOrphaned && orphanedFiles.length > 0 && (
        <div 
          id="orphaned-files-section"
          style={{ 
            marginBottom: '20px', 
            padding: '15px', 
            background: '#fff3cd', 
            borderRadius: '8px',
            border: '1px solid #ffc107'
          }}
        >
          <h3 style={{ margin: '0 0 10px 0', color: '#856404' }}>
            📁 Файлы на Яндекс.Диске без записей в БД ({orphanedFiles.length})
          </h3>
          <p style={{ fontSize: '13px', color: '#856404', marginBottom: '10px' }}>
            Эти файлы занимают место на Яндекс.Диске, но не используются в приложении.
            Вы можете удалить их, чтобы освободить место.
          </p>
          
          <div style={{ maxHeight: '500px', overflow: 'auto', background: 'white', borderRadius: '4px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: '#f8f9fa', position: 'sticky', top: 0 }}>
                  <th style={{ padding: '8px', textAlign: 'left', borderBottom: '2px solid #dee2e6', width: '80px' }}>Превью</th>
                  <th style={{ padding: '8px', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>Имя файла</th>
                  <th style={{ padding: '8px', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>Папка</th>
                  <th style={{ padding: '8px', textAlign: 'right', borderBottom: '2px solid #dee2e6' }}>Размер</th>
                  <th style={{ padding: '8px', textAlign: 'center', borderBottom: '2px solid #dee2e6' }}>Действие</th>
                </tr>
              </thead>
              <tbody>
                {orphanedFiles.map((file, index) => {
                  const previewUrl = orphanedPreviews[file.path];
                  const isLoading = loadingPreviews[file.path];
                  
                  // Загружаем превью при первом показе (с задержкой, чтобы не перегружать API)
                  if (!previewUrl && !isLoading) {
                    setTimeout(() => loadOrphanedPreview(file), 100 * (index + 1));
                  }
                  
                  return (
                    <tr key={index} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '8px', textAlign: 'center' }}>
                        {isLoading ? (
                          <span style={{ fontSize: '12px', color: '#999' }}>⏳</span>
                        ) : previewUrl ? (
                          <img 
                            src={previewUrl}
                            alt={file.name}
                            style={{ 
                              width: '50px', 
                              height: '50px', 
                              objectFit: 'cover',
                              borderRadius: '4px',
                              border: '1px solid #ddd',
                              backgroundColor: '#f8f9fa'
                            }}
                            onError={(e) => {
                              e.target.style.display = 'none';
                              const parent = e.target.parentElement;
                              if (parent) {
                                const fallback = document.createElement('span');
                                fallback.textContent = '🖼️';
                                fallback.style.fontSize = '24px';
                                fallback.style.opacity = '0.3';
                                parent.appendChild(fallback);
                              }
                            }}
                          />
                        ) : (
                          <span style={{ fontSize: '24px', opacity: 0.3 }}>🖼️</span>
                        )}
                      </td>
                      <td style={{ padding: '8px', wordBreak: 'break-all', fontSize: '12px' }}>
                        {file.name}
                      </td>
                      <td style={{ padding: '8px' }}>
                        <span style={{ 
                          background: '#e9ecef', 
                          padding: '2px 8px', 
                          borderRadius: '4px',
                          fontSize: '11px'
                        }}>
                          {file.folder}
                        </span>
                      </td>
                      <td style={{ padding: '8px', textAlign: 'right' }}>
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </td>
                      <td style={{ padding: '8px', textAlign: 'center' }}>
                        <button 
                          onClick={async () => {
                            if (window.confirm(`Удалить из папки "${file.folder}" файл "${file.name}" с Яндекс.Диска?`)) {
                              // Засекаем время начала
                              const startTime = Date.now();
                              
                              // Устанавливаем статус "удаляется" для этого файла
                              setDeletingOrphaned(prev => ({ ...prev, [file.path]: true }));
                              
                              // Запускаем таймер для обновления счётчика
                              const timerInterval = setInterval(() => {
                                const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
                                setDeletingTimer(prev => ({ ...prev, [file.path]: elapsed }));
                              }, 1000);
                              
                              try {
                                const response = await fetch(
                                  `${API_URL}/api/yandex/file?path=${encodeURIComponent(file.path)}`,
                                  { method: 'DELETE' }
                                );
                                const result = await response.json();
                                
                                // Останавливаем таймер
                                clearInterval(timerInterval);
                                
                                // Вычисляем время выполнения
                                const endTime = Date.now();
                                const elapsedSeconds = ((endTime - startTime) / 1000).toFixed(1);
                                
                                // Удаляем таймер из состояния
                                setDeletingTimer(prev => {
                                  const newState = { ...prev };
                                  delete newState[file.path];
                                  return newState;
                                });
                                
                                if (result.success) {
                                  alert(`✅ Файл "${file.name}" удалён с Яндекс.Диска за ${elapsedSeconds} секунд`);
                                  console.log(`✅ Файл "${file.name}" удалён с Яндекс.Диска за ${elapsedSeconds} секунд`);
                                  // Обновляем список
                                  setOrphanedFiles(prev => prev.filter(f => f.path !== file.path));
                                  // Удаляем превью из кеша
                                  setOrphanedPreviews(prev => {
                                    const newPreviews = { ...prev };
                                    delete newPreviews[file.path];
                                    return newPreviews;
                                  });
                                } else {
                                  alert(`❌ Ошибка: ${result.error || 'Неизвестная ошибка'} (прошло ${elapsedSeconds} сек.)`);
                                }
                              } catch (error) {
                                // Останавливаем таймер в случае ошибки
                                clearInterval(timerInterval);
                                
                                const endTime = Date.now();
                                const elapsedSeconds = ((endTime - startTime) / 1000).toFixed(1);
                                
                                setDeletingTimer(prev => {
                                  const newState = { ...prev };
                                  delete newState[file.path];
                                  return newState;
                                });
                                
                                alert(`❌ Ошибка: ${error.message} (прошло ${elapsedSeconds} сек.)`);
                              } finally {
                                // Снимаем статус "удаляется"
                                setDeletingOrphaned(prev => {
                                  const newState = { ...prev };
                                  delete newState[file.path];
                                  return newState;
                                });
                                // Очищаем таймер, если вдруг остался
                                clearInterval(timerInterval);
                              }
                            }
                          }}
                          disabled={deletingOrphaned[file.path]}
                          style={{ 
                            padding: '4px 12px', 
                            backgroundColor: deletingOrphaned[file.path] ? '#6c757d' : '#dc3545', 
                            color: 'white', 
                            border: 'none', 
                            borderRadius: '4px',
                            cursor: deletingOrphaned[file.path] ? 'wait' : 'pointer',
                            fontSize: '12px',
                            minWidth: '120px'
                          }}
                          onMouseEnter={(e) => {
                            if (!deletingOrphaned[file.path]) {
                              e.target.style.backgroundColor = '#c82333';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!deletingOrphaned[file.path]) {
                              e.target.style.backgroundColor = '#dc3545';
                            }
                          }}
                        >
                          {deletingOrphaned[file.path] 
                            ? `⏳ ${deletingTimer[file.path] || 0} сек...` 
                            : '🗑️ Удалить'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          
          <div style={{ marginTop: '10px', display: 'flex', gap: '10px' }}>
            <button 
              onClick={() => {
                if (window.confirm(`Удалить ВСЕ ${orphanedFiles.length} файлов с Яндекс.Диска? Это действие необратимо!`)) {
                  alert('⚠️ Функция массового удаления будет добавлена позже');
                }
              }}
              style={{ 
                padding: '6px 16px', 
                backgroundColor: '#dc3545', 
                color: 'white', 
                border: 'none', 
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '13px'
              }}
            >
              🗑️ Удалить все
            </button>
            <button 
              onClick={() => setShowOrphaned(false)}
              style={{ 
                padding: '6px 16px', 
                backgroundColor: '#6c757d', 
                color: 'white', 
                border: 'none', 
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '13px'
              }}
            >
              ✖ Закрыть
            </button>
          </div>
        </div>
      )}




      {/* Список файлов */}
      {filteredMedia.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
          Медиафайлы не найдены
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '15px' }}>
          {filteredMedia.map(item => {
            const isImage = item.file_type === 'image';
            const isVideo = item.file_type === 'video';
            const isPdf = item.file_name?.toLowerCase().endsWith('.pdf');
            const isUpdating = updatingItemId === item.id;
            const previewUrl = getPreviewUrl(item);
            const isUsingCurl = isCurlMode && previewUrl;
            
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
                {/* Миниатюра */}
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
                  {previewUrl ? (
                    <img 
                      src={previewUrl} 
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
                  
                  {isUsingCurl && (
                    <div style={{
                      position: 'absolute',
                      bottom: '4px',
                      right: '4px',
                      backgroundColor: 'rgba(0,123,255,0.85)',
                      color: 'white',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      fontSize: '9px',
                      fontWeight: 'bold',
                      zIndex: 5,
                      letterSpacing: '0.3px'
                    }}>
                      🔄 on-the-fly
                    </div>
                  )}
                  
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
                
                {/* Информация */}
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
                    <span>{isImage ? '🖼️' : isVideo ? '🎬' : isPdf ? '📄' : '📁'}</span>
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
                  
                  {/* Количество связей */}
                    <div style={{ 
                      fontSize: '10px', 
                      marginTop: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      {item.connection_count > 0 ? (
                        <span 
                          style={{ 
                            color: '#28a745',
                            cursor: 'help',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '3px'
                          }}
                          title="Количество сущностей, связанных с этим медиафайлом"
                        >
                          🔗 {item.connection_count} 
                          <span style={{ color: '#888', fontSize: '9px' }}>
                            {item.connection_count === 1 ? 'связь' : 'связей'}
                          </span>
                        </span>
                      ) : (
                        <span style={{ color: '#999', fontSize: '9px' }}>
                          нет связей
                        </span>
                      )}
                    </div>

                  {/* Кнопки */}
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
                      title="Обновить прямую ссылку на файл, хранимую в БД"
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
                      title="Обновить ссылку на превью, хранимую в БД"
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
                      title="Открыть Тестовую страницу с вариантами отображения и подробностями о медиафайле"
                    >
                      🧪 Тест-Инфо
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
                      title="Удалить строку описания медиафайла и все его связи с сущностями"
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