// OrganEditPage.js
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from './utils/supabaseClient';
import { MediaList } from './MediaList';
import MediaViewer from './MediaViewer';
import { 
  getMediaForEntity, 
  uploadMediaForEntity,
  deleteMediaFile,
  updateMediaDescription,
  updateMediaOrderHelper,
  processMediaForDisplay
} from './utils/mediaHelper';

function OrganEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [organ, setOrgan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [media, setMedia] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [viewingMedia, setViewingMedia] = useState(null);
  const [deleteConfirmItem, setDeleteConfirmItem] = useState(null);
  const [editDescriptionItem, setEditDescriptionItem] = useState(null);
  const [descriptionText, setDescriptionText] = useState('');
  const [durationSeconds, setDurationSeconds] = useState(null);
  const [width, setWidth] = useState(null);
  const [height, setHeight] = useState(null);
  const [debugMessages, setDebugMessages] = useState([]);
  const [refreshingLinks, setRefreshingLinks] = useState(false);
  const [updatingPreviews, setUpdatingPreviews] = useState(false);
  const [showDebugPanel, setShowDebugPanel] = useState(false);
  const [showAddMediaModal, setShowAddMediaModal] = useState(false);
	const [availableMedia, setAvailableMedia] = useState([]);
	const [loadingMedia, setLoadingMedia] = useState(false);
	const [searchTerm, setSearchTerm] = useState('');
	const [selectedFileType, setSelectedFileType] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    name_lat: '',
    system: '',
    description: '',
    functions: '',
    symptoms: '',
    diagnostic: '',
    treatment: '',
    notes: ''
  });

  // API URL для фронтенда
  const API_URL = process.env.NODE_ENV === 'production' 
    ? process.env.REACT_APP_API_URL 
    : 'http://localhost:3001';

  useEffect(() => {
    fetchOrganData();
    fetchMediaData();
  }, [id]);

  // Загрузка данных органа
  const fetchOrganData = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('organs')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      if (data) {
        setOrgan(data);
        setFormData({
          name: data.name || '',
          name_lat: data.name_lat || '',
          system: data.system || '',
          description: data.description || '',
          functions: data.functions || '',
          symptoms: data.symptoms || '',
          diagnostic: data.diagnostic || '',
          treatment: data.treatment || '',
          notes: data.notes || ''
        });
      }
    } catch (error) {
      console.error('Ошибка загрузки органа:', error);
      alert('Ошибка загрузки данных: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Загрузка медиафайлов органа
  const fetchMediaData = async () => {
    try {
      // Используем новую систему через mediaHelper
      const mediaData = await getMediaForEntity('organ', id);
      
      // Обрабатываем медиа для отображения (добавляем proxyUrl)
      const processedMedia = processMediaForDisplay(mediaData);
      setMedia(processedMedia);
      
    } catch (error) {
      console.error('Ошибка загрузки медиа:', error);
      setDebugMessages(prev => [...prev, `❌ Media loading error: ${error.message}`]);
    }
  };

  // Обработчик изменения полей формы
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Сохранение изменений органа
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const { error } = await supabase
        .from('organs')
        .update({
          name: formData.name,
          name_lat: formData.name_lat,
          system: formData.system,
          description: formData.description,
          functions: formData.functions,
          symptoms: formData.symptoms,  // Исправлено с data на formData
          diagnostic: formData.diagnostic,  // Исправлено с data на formData
          treatment: formData.treatment,  // Исправлено с data на formData
          notes: formData.notes  // Исправлено с data на formData
        })
        .eq('id', id);

      if (error) throw error;

      alert('Орган успешно обновлен!');
      navigate(`/organ/${id}`);
    } catch (error) {
      console.error('Ошибка сохранения:', error);
      alert('Ошибка при сохранении: ' + error.message);
    } finally {
      setSaving(false);
    }
  };


  // ==================== ФУНКЦИИ ДЛЯ РАБОТЫ С МЕДИА ====================

  // Загрузка нового медиафайла
  const handleFileUpload = async (file) => {
    setUploading(true);
    setDebugMessages(prev => [...prev, `📤 Start upload: ${file.name}`]);

    try {
      // Используем новую систему через mediaHelper
      const uploadedMedia = await uploadMediaForEntity('organ', id, file, '');
      
      setDebugMessages(prev => [...prev, `✅ File uploaded: ${uploadedMedia.file_name}`]);
      
      // Обрабатываем для отображения
      const processedMedia = processMediaForDisplay([uploadedMedia]);
      
      // Добавляем к существующим медиа
      setMedia(prev => [...prev, ...processedMedia]);
      
    } catch (error) {
      console.error('Ошибка загрузки:', error);
      setDebugMessages(prev => [...prev, `❌ Upload error: ${error.message}`]);
      alert(`Ошибка: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  // Удаление медиафайла
  const handleDeleteMedia = async (mediaId) => {
    try {
      await deleteMediaFile('organ', id, mediaId);
      setMedia(prev => prev.filter(item => item.id !== mediaId));
      setDeleteConfirmItem(null);
    } catch (error) {
      console.error('Delete failed:', error);
      alert(`Ошибка удаления: ${error.message}`);
    }
  };

  // Обработчик клика на удаление
  const handleDeleteClick = (item) => {
    setDeleteConfirmItem(item);
  };

  // Подтверждение удаления
  const confirmDelete = () => {
    if (deleteConfirmItem) {
      handleDeleteMedia(deleteConfirmItem.id);
    }
  };

  // Отмена удаления
  const cancelDelete = () => {
    setDeleteConfirmItem(null);
  };

	// Вспомогательная функция для форматирования размера файла
	const formatFileSize = (bytes) => {
	  if (bytes === 0) return '0 Bytes';
	  
	  const k = 1024;
	  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
	  const i = Math.floor(Math.log(bytes) / Math.log(k));
	  
	  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
	};

  // Обновление описания медиафайла
  const handleUpdateDescription = async (mediaId, newDescription, duration, width, height) => {
	  try {
		// Создаем объект обновления
		const updateData = {
		  description: newDescription
		};
		
		// Добавляем поля в зависимости от типа файла
		if (duration !== null && duration !== undefined) {
		  updateData.duration_seconds = duration;
		}
		
		if (width !== null && width !== undefined) {
		  updateData.width = width;
		}
		
		if (height !== null && height !== undefined) {
		  updateData.height = height;
		}
		
		// Отправляем обновление на сервер
		const response = await fetch(`${API_URL}/api/media/${mediaId}/update-metadata`, {
		  method: 'PUT',
		  headers: {
			'Content-Type': 'application/json',
		  },
		  body: JSON.stringify(updateData),
		});

		if (!response.ok) {
		  throw new Error(`HTTP error! status: ${response.status}`);
		}

		const result = await response.json();
		
		if (!result.success) {
		  throw new Error(result.error || 'Unknown error');
		}
		
		// Обновляем состояние
		setMedia(prev => prev.map(item => 
		  item.id === mediaId ? { 
			...item, 
			description: newDescription,
			duration_seconds: duration,
			width: width,
			height: height
		  } : item
		));
		
		setEditDescriptionItem(null);
		
	  } catch (error) {
		console.error('Update description failed:', error);
		alert(`Ошибка обновления: ${error.message}`);
	  }
	};

  // Начало редактирования описания
  const handleEditDescriptionClick = (item) => {
	  setEditDescriptionItem(item);
	  setDescriptionText(item.description || '');
	  setDurationSeconds(item.duration_seconds || null);
	  setWidth(item.width || null);
	  setHeight(item.height || null);
	};

  // Сохранение описания
  const handleSaveDescription = () => {
	  if (editDescriptionItem) {
		handleUpdateDescription(
		  editDescriptionItem.id, 
		  descriptionText,
		  durationSeconds,
		  width,
		  height
		);
	  }
	};

  // Отмена редактирования описания
  const handleCancelDescriptionEdit = () => {
    setEditDescriptionItem(null);
    setDescriptionText('');
  };

  // Обновление порядка медиафайлов
  const handleUpdateMediaOrder = async (reorderedMedia) => {
    try {
      const orderedIds = reorderedMedia.map(item => item.id);
      await updateMediaOrderHelper('organ', id, orderedIds);
      setMedia(reorderedMedia);
    } catch (error) {
      console.error('Ошибка обновления порядка:', error);
      alert(`Ошибка обновления порядка: ${error.message}`);
    }
  };

	// Функция для загрузки доступных медиафайлов
	const loadAvailableMedia = async () => {
	  setLoadingMedia(true);
	  try {
		const response = await fetch(`${API_URL}/api/media/files?${new URLSearchParams({
		  search: searchTerm,
		  file_type: selectedFileType,
		  exclude_entity_type: 'organ',
		  exclude_entity_id: id,
		  limit: 50
		})}`);
		
		const result = await response.json();
		
		if (result.success) {
		  setAvailableMedia(result.files || []);
		} else {
		  setAvailableMedia([]);
		  setDebugMessages(prev => [...prev, `❌ Ошибка загрузки медиа: ${result.error}`]);
		}
	  } catch (error) {
		console.error('Ошибка загрузки доступных медиа:', error);
		setAvailableMedia([]);
	  } finally {
		setLoadingMedia(false);
	  }
	};

	// Функция для связывания медиафайла
	const handleLinkMedia = async (mediaFileId) => {
	  try {
		setDebugMessages(prev => [...prev, `🔗 Связывание медиафайла ${mediaFileId} с органом`]);
		
		const response = await fetch(`${API_URL}/api/media/link`, {
		  method: 'POST',
		  headers: {
			'Content-Type': 'application/json',
		  },
		  body: JSON.stringify({
			mediaFileId,
			entityType: 'organ',
			entityId: id,
			relationType: 'primary'
		  }),
		});
		
		const result = await response.json();
		
		if (result.success) {
		  setDebugMessages(prev => [...prev, `✅ Медиафайл успешно связан: ${result.media.file_name}`]);
		  
		  // Обрабатываем новое медиа для отображения
		  const processedMedia = processMediaForDisplay([result.media]);
		  
		  // Добавляем к существующим медиа
		  setMedia(prev => [...prev, ...processedMedia]);
		  
		  // Закрываем модальное окно
		  setShowAddMediaModal(false);
		  
		  // Очищаем поиск
		  setSearchTerm('');
		  setSelectedFileType('');
		  
		} else {
		  setDebugMessages(prev => [...prev, `❌ Ошибка связывания: ${result.error}`]);
		  alert(`Ошибка: ${result.error}`);
		}
	  } catch (error) {
		console.error('Ошибка связывания медиафайла:', error);
		setDebugMessages(prev => [...prev, `❌ Ошибка связывания: ${error.message}`]);
		alert(`Ошибка: ${error.message}`);
	  }
	};

	// Обновляем функцию открытия модального окна
	const handleAddMediaClick = () => {
	  setShowAddMediaModal(true);
	  loadAvailableMedia();
	};

	// Используем debounce для поиска
	useEffect(() => {
	  if (showAddMediaModal) {
		const timer = setTimeout(() => {
		  loadAvailableMedia();
		}, 500);
		
		return () => clearTimeout(timer);
	  }
	}, [searchTerm, selectedFileType, showAddMediaModal]);


  // ==================== НОВЫЕ ФУНКЦИИ ====================

  // Функция для обновления отсутствующих превью (для PDF и видео)
// OrganEditPage.js - исправляем функцию handleUpdatePreviews

const handleUpdatePreviews = async () => {
  try {
    setUpdatingPreviews(true);
    setDebugMessages(prev => [...prev, '🔄 Starting preview update...']);

    // ИСПРАВЛЕННАЯ ФИЛЬТРАЦИЯ:
    // РАНЬШЕ БЫЛО: фильтровали только документы без превью
    // СЕЙЧАС: фильтруем ВСЕ файлы, у которых нет превью ИЛИ нет длительности (для видео)
    
    const mediaNeedingPreviews = media.filter(item => {
      const needsPreview = 
        // Документы без превью
        (item.file_type === 'document' && !item.thumbnail_url) ||
        // Видео без превью ИЛИ без длительности
        (item.file_type === 'video' && (!item.thumbnail_url || !item.duration_seconds));
      
      if (needsPreview) {
        console.log(`File needs preview: ${item.file_name} (${item.file_type})`);
        setDebugMessages(prev => [...prev, `📄 ${item.file_name} needs preview`]);
      }
      
      return needsPreview;
    });

    if (mediaNeedingPreviews.length === 0) {
      setDebugMessages(prev => [...prev, 'ℹ️ No media needs preview updates']);
      return;
    }

    setDebugMessages(prev => [...prev, `📊 Found ${mediaNeedingPreviews.length} media files needing preview updates`]);

    // Логируем детали
    mediaNeedingPreviews.forEach(item => {
      setDebugMessages(prev => [...prev, 
        `🔍 ${item.file_name}: тип=${item.file_type}, превью=${item.thumbnail_url ? 'есть' : 'нет'}, длительность=${item.duration_seconds || 'нет'}`
      ]);
    });

    // Вызываем API
    const response = await fetch(`${API_URL}/api/update-media-previews`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mediaIds: mediaNeedingPreviews.map(item => item.id),
        entityType: 'organ',
        entityId: id
      }),
    });

    const result = await response.json();
    
    if (response.ok) {
      setDebugMessages(prev => [...prev, `✅ Preview update completed: ${result.updated} files updated`]);
      
      // Детальные логи результатов
      if (result.results) {
        result.results.forEach(r => {
          if (r.success) {
            setDebugMessages(prev => [...prev, `✅ ${r.file_name}: ${r.message}`]);
            console.log(`✅ ${r.file_name}:`, r.changes);
          } else {
            setDebugMessages(prev => [...prev, `⚠️ ${r.file_name}: ${r.error || r.message}`]);
            console.log(`⚠️ ${r.file_name}:`, r.error);
          }
        });
      }
      
      // Перезагружаем медиа
      await fetchMediaData();
      
      setDebugMessages(prev => [...prev, '✅ Media data reloaded from database']);
      
    } else {
      setDebugMessages(prev => [...prev, `❌ API Error: ${result.error}`]);
    }

  } catch (error) {
    console.error('Preview update failed:', error);
    setDebugMessages(prev => [...prev, `❌ Error: ${error.message}`]);
  } finally {
    setUpdatingPreviews(false);
  }
};

  // Функция для обновления устаревающих ссылок на Яндекс Диске

const handleRefreshLinks = async () => {
  try {
    setRefreshingLinks(true);
    setDebugMessages(prev => [...prev, '🔄 Starting refresh of ALL links (files + previews)...']);

    // Собираем ВСЕ медиафайлы для обновления
    const mediaToRefresh = media.filter(item => item.public_url);
    
    if (mediaToRefresh.length === 0) {
      setDebugMessages(prev => [...prev, 'ℹ️ No media files to refresh']);
      return;
    }

    // Создаем специальный объект для передачи всех данных
    const refreshData = {
      entityType: 'organ',
      entityId: id,
      mediaItems: mediaToRefresh.map(item => ({
        id: item.id,
        fileName: item.file_name,
        fileType: item.file_type,
        publicUrl: item.public_url,
        currentFileUrl: item.file_url,
        currentThumbnailUrl: item.thumbnail_url
      }))
    };

    console.log('Sending refresh data:', refreshData);
    setDebugMessages(prev => [...prev, `📊 Refreshing ${mediaToRefresh.length} media files`]);

    // Используем УЖЕ СУЩЕСТВУЮЩИЙ эндпоинт /api/refresh-links, но передаем больше данных
    const response = await fetch(`${API_URL}/api/refresh-links`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(refreshData),
    });

    const result = await response.json();
    
    if (response.ok) {
      setDebugMessages(prev => [...prev, `✅ Links refresh completed: ${result.updated || 0} files updated`]);
      
      // Подробные логи результатов
      if (result.results) {
        result.results.forEach(r => {
          if (r.success) {
            const changes = r.changes || [];
            if (changes.length > 0) {
              setDebugMessages(prev => [...prev, `✅ ${r.fileName || r.file_name}: обновлено - ${changes.join(', ')}`]);
            } else {
              setDebugMessages(prev => [...prev, `ℹ️ ${r.fileName || r.file_name}: без изменений`]);
            }
          } else {
            setDebugMessages(prev => [...prev, `⚠️ ${r.fileName || r.file_name}: ${r.error || 'Ошибка'}`]);
          }
        });
      }
      
      // Перезагружаем данные из базы
      await fetchMediaData();
      setDebugMessages(prev => [...prev, '✅ Database data reloaded with fresh links']);
      
    } else {
      setDebugMessages(prev => [...prev, `❌ API error: ${result.error || 'Unknown error'}`]);
    }

  } catch (error) {
    console.error('Refresh failed:', error);
    setDebugMessages(prev => [...prev, `❌ Error: ${error.message}`]);
  } finally {
    setRefreshingLinks(false);
  }
};

  // ==================== РЕНДЕРИНГ ====================

  if (loading) return <div style={{ padding: '2rem' }}>Загрузка...</div>;
  if (!organ) return <div style={{ padding: '2rem' }}>Орган не найден</div>;

  return (
    <div className="edit-page" style={{ maxWidth: '1000px', margin: '0 auto', padding: '20px' }}>
      <div style={{ marginBottom: '20px' }}>
        <Link to={`/organ/${id}`}>← Назад к просмотру органа</Link>
      </div>

      <h2>Редактирование органа: {organ.name}</h2>

      {/* Форма редактирования органа */}
      <form onSubmit={handleSubmit} style={{ marginBottom: '40px' }}>
        <div style={{ 
          backgroundColor: '#f8f9fa', 
          padding: '20px', 
          borderRadius: '8px',
          marginBottom: '20px'
        }}>
          <h3>Основная информация</h3>
          
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px' }}>
              Название (рус):
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              style={{ width: '100%', padding: '8px', fontSize: '16px' }}
              required
            />
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px' }}>
              Название (лат):
            </label>
            <input
              type="text"
              name="name_lat"
              value={formData.name_lat}
              onChange={handleInputChange}
              style={{ width: '100%', padding: '8px', fontSize: '16px' }}
            />
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px' }}>
              Система:
            </label>
            <input
              type="text"
              name="system"
              value={formData.system}
              onChange={handleInputChange}
              style={{ width: '100%', padding: '8px', fontSize: '16px' }}
            />
          </div>
        </div>

        {/* Текстовые поля */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              Описание:
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              style={{ 
                width: '100%', 
                padding: '8px', 
                fontSize: '16px',
                minHeight: '150px',
                resize: 'vertical'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              Функции:
            </label>
            <textarea
              name="functions"
              value={formData.functions}
              onChange={handleInputChange}
              style={{ 
                width: '100%', 
                padding: '8px', 
                fontSize: '16px',
                minHeight: '150px',
                resize: 'vertical'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              Симптомы дисфункции:
            </label>
            <textarea
              name="symptoms"
              value={formData.symptoms}
              onChange={handleInputChange}
              style={{ 
                width: '100%', 
                padding: '8px', 
                fontSize: '16px',
                minHeight: '150px',
                resize: 'vertical'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              Диагностика:
            </label>
            <textarea
              name="diagnostic"
              value={formData.diagnostic}
              onChange={handleInputChange}
              style={{ 
                width: '100%', 
                padding: '8px', 
                fontSize: '16px',
                minHeight: '150px',
                resize: 'vertical'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              Лечение:
            </label>
            <textarea
              name="treatment"
              value={formData.treatment}
              onChange={handleInputChange}
              style={{ 
                width: '100%', 
                padding: '8px', 
                fontSize: '16px',
                minHeight: '150px',
                resize: 'vertical'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              Примечания:
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleInputChange}
              style={{ 
                width: '100%', 
                padding: '8px', 
                fontSize: '16px',
                minHeight: '150px',
                resize: 'vertical'
              }}
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          style={{
            padding: '10px 20px',
            backgroundColor: saving ? '#6c757d' : '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: saving ? 'not-allowed' : 'pointer',
            fontSize: '16px'
          }}
        >
          {saving ? 'Сохранение...' : 'Сохранить изменения органа'}
        </button>
      </form>


	{/* ==================== БЛОК МЕДИА ==================== */}
	<div style={{ 
	  borderTop: '2px solid #dee2e6', 
	  paddingTop: '30px', 
	  marginTop: '30px' 
	}}>
	  <h3>Медиафайлы органа</h3>
	  <p style={{ color: '#666', marginBottom: '20px' }}>
		Загрузите изображения, видео или документы для этого органа
	  </p>

	  {/* Блок загруженных медиа */}
	  {media.length > 0 ? (
		<MediaList 
		  items={media}
		  onReorder={handleUpdateMediaOrder}
		  onDelete={handleDeleteClick}
		  onView={(item) => setViewingMedia(item)}
		  onEditDescription={handleEditDescriptionClick}
		/>
	  ) : (
		<div style={{ 
		  textAlign: 'center', 
		  padding: '40px', 
		  backgroundColor: '#f8f9fa', 
		  borderRadius: '8px',
		  marginBottom: '20px'
		}}>
		  <div style={{ fontSize: '48px', marginBottom: '10px' }}>📷</div>
		  <p>Нет загруженных медиафайлов</p>
		</div>
	  )}

	  {/* Основные кнопки действий с медиа */}
	  <div style={{ 
		display: 'flex', 
		alignItems: 'flex-start',
		justifyContent: 'space-between',
		marginTop: '30px',
		padding: '25px',
		backgroundColor: '#f8f9fa',
		borderRadius: '10px',
		gap: '40px', // Увеличили расстояние между блоками
		flexWrap: 'wrap'
	  }}>
		{/* Левая часть: Основные кнопки */}
		<div style={{ 
		  display: 'flex', 
		  flexDirection: 'column', 
		  gap: '15px',
		  flex: '1 1 300px',
		  maxWidth: '350px'
		}}>
		  {/* Кнопка 1: Загрузить файл */}
		  <div>
			<input 
			  type="file" 
			  id="organ-media-upload"
			  accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt,.md"
			  onChange={(e) => handleFileUpload(e.target.files[0])}
			  disabled={uploading}
			  style={{ display: 'none' }}
			/>
			
			{/* Заменяем label на button с обработчиком клика */}
			<button
			  onClick={() => document.getElementById('organ-media-upload').click()}
			  disabled={uploading}
			  style={{
				display: 'inline-block',
				padding: '14px 20px',
				backgroundColor: uploading ? '#ccc' : '#007bff',
				color: 'white',
				border: 'none',
				borderRadius: '8px',
				cursor: uploading ? 'not-allowed' : 'pointer',
				fontWeight: 'bold',
				fontSize: '16px',
				textAlign: 'center',
				width: '100%',
				boxShadow: '0 3px 10px rgba(0, 123, 255, 0.3)',
				transition: 'all 0.2s ease',
				minHeight: '50px' // Фиксированная высота для выравнивания
			  }}
			  onMouseEnter={(e) => {
				if (!uploading) e.target.style.backgroundColor = '#0056b3';
			  }}
			  onMouseLeave={(e) => {
				if (!uploading) e.target.style.backgroundColor = '#007bff';
			  }}
			>
			  {uploading ? '📤 Загрузка...' : '📁 Загрузить файл'}
			</button>
			<div style={{ 
			  fontSize: '13px', 
			  color: '#666',
			  marginTop: '8px',
			  textAlign: 'center'
			}}>
			  Выберите файл с компьютера
			</div>
		  </div>

		  {/* Кнопка 2: Добавить медиа  */}
		  <div>
			<button
			  onClick={handleAddMediaClick}
			  style={{
				display: 'inline-block',
				padding: '15px',
				backgroundColor: '#6c757d',
				color: 'white',
				border: 'none',
				borderRadius: '8px',
				cursor: 'pointer',
				fontWeight: 'bold',
				fontSize: '16px',
				boxShadow: '0 3px 10px rgba(108, 117, 125, 0.3)',
				transition: 'all 0.2s ease',
				opacity: 0.7,
				height: '52px',
				display: 'flex',
				alignItems: 'center',
				width: '100%',
				justifyContent: 'center',
				gap: '10px'
			  }}
			  onMouseEnter={(e) => {
				e.target.style.backgroundColor = '#5a6268';
				e.target.style.opacity = '0.9';
			  }}
			  onMouseLeave={(e) => {
				e.target.style.backgroundColor = '#6c757d';
				e.target.style.opacity = '0.7';
			  }}
			>
			  <span>➕</span>
			  <span>Добавить медиа</span>
			</button>
			<div style={{ 
			  fontSize: '13px', 
			  color: '#666',
			  marginTop: '8px',
			  textAlign: 'center'
			}}>
			  Добавить ссылку на медиа 
			</div>
		  </div>
		</div>

		{/* Правая часть: Сервисные кнопки */}
		<div style={{ 
		  display: 'flex', 
		  flexDirection: 'column', 
		  gap: '15px',
		  flex: '1 1 300px', // Минимальная ширина 300px
		  maxWidth: '350px' // Ограничиваем ширину
		}}>
		  {/* Кнопка обновления превью */}
		  {media.length > 0 && (
			<div>
			  <button 
				onClick={handleUpdatePreviews}
				disabled={updatingPreviews || uploading}
				title="Обновить отсутствующие превью для PDF и видео файлов"
				style={{
				  padding: '12px 18px', // Уменьшили горизонтальный padding
				  backgroundColor: updatingPreviews ? '#e2e3e5' : '#e9f7fe',
				  color: updatingPreviews ? '#6c757d' : '#17a2b8',
				  border: '1px solid #b6d4fe',
				  borderRadius: '8px',
				  cursor: (updatingPreviews || uploading) ? 'not-allowed' : 'pointer',
				  fontWeight: 'bold',
				  fontSize: '15px',
				  width: '100%',
				  display: 'flex',
				  alignItems: 'center',
				  justifyContent: 'center',
				  gap: '8px',
				  transition: 'all 0.2s ease',
				  minWidth: '200px' // Минимальная ширина кнопки
				}}
				onMouseEnter={(e) => {
				  if (!updatingPreviews && !uploading) {
					e.target.style.backgroundColor = '#d1ecf1';
					e.target.style.borderColor = '#bee5eb';
				  }
				}}
				onMouseLeave={(e) => {
				  if (!updatingPreviews && !uploading) {
					e.target.style.backgroundColor = '#e9f7fe';
					e.target.style.borderColor = '#b6d4fe';
				  }
				}}
			  >
				{updatingPreviews ? (
				  <>
					<span>⏳</span>
					<span>Обновление...</span>
				  </>
				) : (
				  <>
					<span>🔄</span>
					<span>Обновить превью</span>
				  </>
				)}
			  </button>
			  <div style={{ 
				fontSize: '13px', 
				color: '#666',
				marginTop: '8px',
				textAlign: 'center'
			  }}>
				Для PDF и видео без превью
			  </div>
			</div>
		  )}

		  {/* Кнопка обновления ссылок */}
		  {media.length > 0 && (
			<div>
			  <button 
				onClick={handleRefreshLinks}
				disabled={refreshingLinks || uploading}
				title="Ссылки на Яндекс Диске устаревают каждые 12 часов, их нужно периодически обновлять"
				style={{
				  padding: '12px 18px', // Уменьшили горизонтальный padding
				  backgroundColor: refreshingLinks ? '#e2e3e5' : '#f0f9ff',
				  color: refreshingLinks ? '#6c757d' : '#28a745',
				  border: '1px solid #c3e6cb',
				  borderRadius: '8px',
				  cursor: (refreshingLinks || uploading) ? 'not-allowed' : 'pointer',
				  fontWeight: 'bold',
				  fontSize: '15px',
				  width: '100%',
				  display: 'flex',
				  alignItems: 'center',
				  justifyContent: 'center',
				  gap: '8px',
				  transition: 'all 0.2s ease',
				  minWidth: '200px' // Минимальная ширина кнопки
				}}
				onMouseEnter={(e) => {
				  if (!refreshingLinks && !uploading) {
					e.target.style.backgroundColor = '#d4edda';
					e.target.style.borderColor = '#c3e6cb';
				  }
				}}
				onMouseLeave={(e) => {
				  if (!refreshingLinks && !uploading) {
					e.target.style.backgroundColor = '#f0f9ff';
					e.target.style.borderColor = '#c3e6cb';
				  }
				}}
			  >
				{refreshingLinks ? (
				  <>
					<span>⏳</span>
					<span>Обновление...</span>
				  </>
				) : (
				  <>
					<span>🔄</span>
					<span>Обновить ссылки Яндекс Диска</span>
				  </>
				)}
			  </button>
			  <div style={{ 
				fontSize: '13px', 
				color: '#666',
				marginTop: '8px',
				textAlign: 'center'
			  }}>
				Обновить устаревшие ссылки на файлы и превью
			  </div>
			</div>
		  )}
		</div>
	  </div>

	  {/* Кнопка показать/скрыть отладку */}
	  <div style={{ 
		marginTop: '25px',
		textAlign: 'center'
	  }}>
		<button 
		  onClick={() => setShowDebugPanel(!showDebugPanel)}
		  style={{
			padding: '8px 16px',
			backgroundColor: showDebugPanel ? '#dc3545' : '#6c757d',
			color: 'white',
			border: 'none',
			borderRadius: '6px',
			cursor: 'pointer',
			fontSize: '14px',
			fontWeight: 'bold',
			transition: 'all 0.2s ease'
		  }}
		  onMouseEnter={(e) => e.target.style.backgroundColor = showDebugPanel ? '#c82333' : '#5a6268'}
		  onMouseLeave={(e) => e.target.style.backgroundColor = showDebugPanel ? '#dc3545' : '#6c757d'}
		>
		  {showDebugPanel ? '❌ Скрыть отладку' : '🔧 Показать отладку'}
		</button>
	  </div>

	  {/* Панель отладки */}
	  {showDebugPanel && debugMessages.length > 0 && (
		<div style={{
		  marginTop: '20px',
		  padding: '20px',
		  backgroundColor: '#f5f5f5',
		  borderRadius: '8px',
		  fontSize: '13px',
		  fontFamily: 'monospace',
		  maxHeight: '200px',
		  overflowY: 'auto',
		  border: '1px solid #dee2e6'
		}}>
		  <h4 style={{ marginTop: '0', marginBottom: '15px', color: '#495057' }}>
			🐞 Логи медиа-операций
		  </h4>
		  <div style={{ 
			display: 'flex', 
			flexDirection: 'column',
			gap: '8px'
		  }}>
			{debugMessages.map((msg, i) => (
			  <div key={i} style={{ 
				padding: '8px 10px',
				backgroundColor: i % 2 === 0 ? 'white' : '#f8f9fa',
				borderRadius: '4px',
				borderLeft: '3px solid ' + 
				  (msg.includes('❌') ? '#dc3545' : 
				   msg.includes('✅') ? '#28a745' : 
				   msg.includes('🔄') ? '#17a2b8' : 
				   msg.includes('⚠️') ? '#ffc107' : 
				   msg.includes('📊') ? '#6f42c1' : 
				   msg.includes('📤') ? '#fd7e14' : 
				   '#6c757d'),
				color: msg.includes('❌') ? '#dc3545' : 'inherit'
			  }}>
				<div style={{ 
				  display: 'flex', 
				  justifyContent: 'space-between',
				  alignItems: 'center'
				}}>
				  <span>{msg}</span>
				  <span style={{ 
					fontSize: '11px', 
					color: '#999',
					fontFamily: 'monospace'
				  }}>
					{new Date().toLocaleTimeString('ru-RU', { 
					  hour: '2-digit', 
					  minute: '2-digit',
					  second: '2-digit' 
					})}
				  </span>
				</div>
			  </div>
			))}
		  </div>
		</div>
	  )}
	</div>

   

      {/* Модальные окна */}
      {viewingMedia && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }} onClick={() => setViewingMedia(null)}>
          <div style={{
            backgroundColor: 'white',
            padding: '20px',
            borderRadius: '8px',
            maxWidth: '90vw',
            maxHeight: '90vh',
            overflow: 'auto'
          }} onClick={e => e.stopPropagation()}>
            <MediaViewer media={viewingMedia} />
            <button 
              onClick={() => setViewingMedia(null)}
              style={{
                marginTop: '10px',
                padding: '8px 16px',
                backgroundColor: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Закрыть
            </button>
          </div>
        </div>
      )}

      {deleteConfirmItem && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }} onClick={cancelDelete}>
          <div style={{
            backgroundColor: 'white',
            padding: '25px',
            borderRadius: '12px',
            textAlign: 'center'
          }} onClick={e => e.stopPropagation()}>
            <h3 style={{ color: '#d32f2f' }}>Подтверждение удаления</h3>
            <p>Удалить {deleteConfirmItem.file_type === 'image' ? 'изображение' : 'файл'}?</p>
            <p style={{ fontSize: '14px', color: '#666' }}>
              {deleteConfirmItem.file_name}
            </p>
            <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', marginTop: '20px' }}>
              <button onClick={cancelDelete} style={{ padding: '10px 20px', backgroundColor: '#757575', color: 'white', border: 'none', borderRadius: '6px' }}>
                Отмена
              </button>
              <button onClick={confirmDelete} style={{ padding: '10px 20px', backgroundColor: '#d32f2f', color: 'white', border: 'none', borderRadius: '6px' }}>
                Удалить
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ОрганEditPage.js - обновляем модальное окно редактирования */}

	{editDescriptionItem && (
	  <div style={{
		position: 'fixed',
		top: 0,
		left: 0,
		right: 0,
		bottom: 0,
		backgroundColor: 'rgba(0,0,0,0.7)',
		display: 'flex',
		alignItems: 'center',
		justifyContent: 'center',
		zIndex: 1000
	  }} onClick={handleCancelDescriptionEdit}>
		<div style={{
		  backgroundColor: 'white',
		  padding: '25px',
		  borderRadius: '8px',
		  width: '400px',
		  maxWidth: '90vw',
		  maxHeight: '90vh',
		  overflowY: 'auto'
		}} onClick={e => e.stopPropagation()}>
		  <h4 style={{ marginBottom: '20px', color: '#333' }}>
			Редактирование медиафайла
		  </h4>
		  
		  {/* Базовое описание */}
		  <div style={{ marginBottom: '20px' }}>
			<label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
			  Описание:
			</label>
			<textarea
			  value={descriptionText}
			  onChange={(e) => setDescriptionText(e.target.value)}
			  placeholder="Введите описание файла..."
			  style={{
				width: '100%',
				height: '100px',
				padding: '10px',
				border: '1px solid #ddd',
				borderRadius: '4px',
				resize: 'vertical',
				fontSize: '14px'
			  }}
			  autoFocus
			/>
		  </div>
		  
		  {/* Поля для метаданных в зависимости от типа файла */}
		  {editDescriptionItem.file_type === 'video' && (
			<div style={{ marginBottom: '20px' }}>
			  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
				Длительность видео (секунды):
			  </label>
			  <input
				type="number"
				min="0"
				step="1"
				value={durationSeconds || ''}
				onChange={(e) => setDurationSeconds(e.target.value ? parseInt(e.target.value) : null)}
				placeholder="Например: 120"
				style={{
				  width: '100%',
				  padding: '10px',
				  border: '1px solid #ddd',
				  borderRadius: '4px',
				  fontSize: '14px'
				}}
			  />
			  <div style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
				Введите длительность в секундах
			  </div>
			</div>
		  )}
		  
		  {(editDescriptionItem.file_type === 'video' || editDescriptionItem.file_type === 'image') && (
			<div style={{ 
			  marginBottom: '20px',
			  padding: '15px',
			  backgroundColor: '#f8f9fa',
			  borderRadius: '4px'
			}}>
			  <div style={{ 
				display: 'grid', 
				gridTemplateColumns: '1fr 1fr', 
				gap: '15px',
				marginBottom: '15px'
			  }}>
				<div>
				  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
					Ширина (px):
				  </label>
				  <input
					type="number"
					min="0"
					step="1"
					value={width || ''}
					onChange={(e) => setWidth(e.target.value ? parseInt(e.target.value) : null)}
					placeholder="Например: 1920"
					style={{
					  width: '100%',
					  padding: '10px',
					  border: '1px solid #ddd',
					  borderRadius: '4px',
					  fontSize: '14px'
					}}
				  />
				</div>
				
				<div>
				  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
					Высота (px):
				  </label>
				  <input
					type="number"
					min="0"
					step="1"
					value={height || ''}
					onChange={(e) => setHeight(e.target.value ? parseInt(e.target.value) : null)}
					placeholder="Например: 1080"
					style={{
					  width: '100%',
					  padding: '10px',
					  border: '1px solid #ddd',
					  borderRadius: '4px',
					  fontSize: '14px'
					}}
				  />
				</div>
			  </div>
			  
			  <div style={{ fontSize: '12px', color: '#666' }}>
				{editDescriptionItem.file_type === 'video' 
				  ? 'Размер видео (например: 1920x1080 для Full HD)' 
				  : 'Размер изображения'}
			  </div>
			</div>
		  )}
		  
		  {/* Размер файла (только для информации) */}
		  {editDescriptionItem.file_size && (
			<div style={{ 
			  marginBottom: '20px',
			  padding: '10px',
			  backgroundColor: '#e9f7fe',
			  borderRadius: '4px',
			  fontSize: '13px'
			}}>
			  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
				<span style={{ color: '#0066cc' }}>Размер файла:</span>
				<span style={{ fontWeight: '500' }}>
				  {formatFileSize(editDescriptionItem.file_size)}
				</span>
			  </div>
			  <div style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
				Формат: {editDescriptionItem.mime_type || 'неизвестно'}
			  </div>
			</div>
		  )}
		  
		  <div style={{ 
			display: 'flex', 
			gap: '15px', 
			justifyContent: 'flex-end',
			marginTop: '25px'
		  }}>
			<button 
			  onClick={handleCancelDescriptionEdit}
			  style={{
				padding: '10px 20px',
				backgroundColor: '#6c757d',
				color: 'white',
				border: 'none',
				borderRadius: '4px',
				cursor: 'pointer',
				fontSize: '14px',
				fontWeight: '500'
			  }}
			>
			  Отмена
			</button>
			<button 
			  onClick={handleSaveDescription}
			  style={{
				padding: '10px 20px',
				backgroundColor: '#007bff',
				color: 'white',
				border: 'none',
				borderRadius: '4px',
				cursor: 'pointer',
				fontSize: '14px',
				fontWeight: '500'
			  }}
			>
			  Сохранить все поля
			</button>
		  </div>
		</div>
	  </div>
	)}
	
	
	{/* Модальное окно для добавления существующего медиа */}
	{showAddMediaModal && (
	  <div style={{
		position: 'fixed',
		top: 0,
		left: 0,
		right: 0,
		bottom: 0,
		backgroundColor: 'rgba(0,0,0,0.8)',
		display: 'flex',
		alignItems: 'center',
		justifyContent: 'center',
		zIndex: 1001
	  }} onClick={() => setShowAddMediaModal(false)}>
		<div style={{
		  backgroundColor: 'white',
		  padding: '30px',
		  borderRadius: '12px',
		  maxWidth: '900px',
		  width: '90vw',
		  maxHeight: '80vh',
		  overflow: 'hidden',
		  display: 'flex',
		  flexDirection: 'column'
		}} onClick={e => e.stopPropagation()}>
		  <h3 style={{ marginTop: 0, marginBottom: '20px' }}>
			Выберите медиафайл для добавления
		  </h3>
		  
		  {/* Фильтры поиска */}
		  <div style={{ 
			marginBottom: '20px',
			display: 'flex',
			gap: '15px',
			flexWrap: 'wrap'
		  }}>
			<div style={{ flex: 1, minWidth: '250px' }}>
			  <input
				type="text"
				placeholder="Поиск по названию или описанию..."
				value={searchTerm}
				onChange={(e) => setSearchTerm(e.target.value)}
				style={{
				  width: '100%',
				  padding: '10px 15px',
				  border: '1px solid #ddd',
				  borderRadius: '6px',
				  fontSize: '14px'
				}}
			  />
			</div>
			
			<div style={{ minWidth: '150px' }}>
			  <select
				value={selectedFileType}
				onChange={(e) => setSelectedFileType(e.target.value)}
				style={{
				  width: '100%',
				  padding: '10px 15px',
				  border: '1px solid #ddd',
				  borderRadius: '6px',
				  fontSize: '14px',
				  backgroundColor: 'white'
				}}
			  >
				<option value="">Все типы</option>
				<option value="image">Изображения</option>
				<option value="video">Видео</option>
				<option value="audio">Аудио</option>
				<option value="document">Документы</option>
			  </select>
			</div>
			
			<button
			  onClick={loadAvailableMedia}
			  disabled={loadingMedia}
			  style={{
				padding: '10px 20px',
				backgroundColor: '#17a2b8',
				color: 'white',
				border: 'none',
				borderRadius: '6px',
				cursor: 'pointer',
				fontWeight: 'bold'
			  }}
			>
			  {loadingMedia ? '🔄 Поиск...' : '🔍 Обновить'}
			</button>
		  </div>
		  
		  {/* Список медиафайлов */}
		  <div style={{ 
			flex: 1,
			overflowY: 'auto',
			border: '1px solid #eee',
			borderRadius: '6px',
			padding: '10px',
			backgroundColor: '#f8f9fa'
		  }}>
			{loadingMedia ? (
			  <div style={{ 
				textAlign: 'center', 
				padding: '40px',
				color: '#666'
			  }}>
				Загрузка медиафайлов...
			  </div>
			) : availableMedia.length === 0 ? (
			  <div style={{ 
				textAlign: 'center', 
				padding: '40px',
				color: '#666'
			  }}>
				{searchTerm || selectedFileType 
				  ? 'Медиафайлы не найдены по вашему запросу' 
				  : 'Нет доступных медиафайлов для добавления'}
			  </div>
			) : (
			  <div style={{
				display: 'grid',
				gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
				gap: '15px'
			  }}>
				{availableMedia.map(file => (
				  <div 
					key={file.id}
					style={{
					  border: '1px solid #ddd',
					  borderRadius: '8px',
					  overflow: 'hidden',
					  backgroundColor: 'white',
					  cursor: 'pointer',
					  transition: 'all 0.2s ease'
					}}
					onClick={() => handleLinkMedia(file.id)}
					onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'}
					onMouseLeave={(e) => e.currentTarget.style.boxShadow = 'none'}
				  >
					{/* Превью */}
					<div style={{ 
					  height: '120px', 
					  backgroundColor: '#f0f0f0',
					  display: 'flex',
					  alignItems: 'center',
					  justifyContent: 'center',
					  fontSize: '24px'
					}}>
					  {file.thumbnail_url ? (
						<img 
						  src={`${API_URL}/api/proxy-image?url=${encodeURIComponent(file.thumbnail_url)}`}
						  alt=""
						  style={{ 
							width: '100%', 
							height: '100%', 
							objectFit: 'cover' 
						  }}
						/>
					  ) : (
						<div>
						  {file.file_type === 'image' ? '🖼️' :
						   file.file_type === 'video' ? '🎬' :
						   file.file_type === 'audio' ? '🎵' : '📄'}
						</div>
					  )}
					</div>
					
					{/* Информация */}
					<div style={{ 
					  padding: '10px',
					  fontSize: '12px'
					}}>
					  <div style={{ 
						fontWeight: 'bold',
						whiteSpace: 'nowrap',
						overflow: 'hidden',
						textOverflow: 'ellipsis',
						marginBottom: '4px'
					  }}>
						{file.file_name}
					  </div>
					  
					  <div style={{ 
						display: 'flex',
						justifyContent: 'space-between',
						fontSize: '11px',
						color: '#666'
					  }}>
						<span style={{
						  padding: '2px 6px',
						  backgroundColor: '#e9f7fe',
						  borderRadius: '4px',
						  fontWeight: 'bold'
						}}>
						  {file.file_type === 'image' ? 'Изобр.' :
						   file.file_type === 'video' ? 'Видео' :
						   file.file_type === 'audio' ? 'Аудио' : 'Док.'}
						</span>
						
						{file.file_size && (
						  <span>
							{formatFileSize(file.file_size)}
						  </span>
						)}
					  </div>
					  
					  {file.description && (
						<div style={{
						  marginTop: '4px',
						  fontSize: '10px',
						  color: '#888',
						  whiteSpace: 'nowrap',
						  overflow: 'hidden',
						  textOverflow: 'ellipsis'
						}}>
						  {file.description}
						</div>
					  )}
					</div>
				  </div>
				))}
			  </div>
			)}
		  </div>
		  
		  {/* Кнопки */}
		  <div style={{ 
			display: 'flex', 
			justifyContent: 'space-between',
			marginTop: '20px',
			paddingTop: '20px',
			borderTop: '1px solid #eee'
		  }}>
			<button 
			  onClick={() => setShowAddMediaModal(false)}
			  style={{
				padding: '10px 20px',
				backgroundColor: '#6c757d',
				color: 'white',
				border: 'none',
				borderRadius: '6px',
				cursor: 'pointer',
				fontWeight: 'bold'
			  }}
			>
			  Отмена
			</button>
			
			<div style={{ 
			  fontSize: '13px', 
			  color: '#666',
			  textAlign: 'right'
			}}>
			  Найдено: {availableMedia.length} файлов
			  <br />
			  <span style={{ fontSize: '12px' }}>
				Кликните на файл для добавления
			  </span>
			</div>
		  </div>
		</div>
	  </div>
	)}

	
    </div>
  );
}

export default OrganEditPage;