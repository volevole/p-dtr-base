//MuscleEditPage.js
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from './utils/supabaseClient';
import MuscleForm from './MuscleForm';
import { MediaList } from './MediaList';
import MediaViewer from './MediaViewer';
import MuscleRelationships from './MuscleRelationships';
import { 
  getMediaForEntity, 
  uploadMediaForEntity, 
  updateMediaDescription,
  updateMediaOrderHelper,
  deleteMediaFile 
} from './utils/mediaHelper';

function MuscleEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [muscle, setMuscle] = useState(null);
  const [media, setMedia] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [debugMessages, setDebugMessages] = useState([]);
  const [viewingMedia, setViewingMedia] = useState(null);
  const [deleteConfirmItem, setDeleteConfirmItem] = useState(null);
  const [editDescriptionItem, setEditDescriptionItem] = useState(null);
  const [descriptionText, setDescriptionText] = useState('');
  const [showDebugPanel, setShowDebugPanel] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('');

  const API_URL = process.env.NODE_ENV === 'production' 
    ? process.env.REACT_APP_API_URL 
    : 'http://localhost:3001';


	const testConnection = async () => {
	  setConnectionStatus('Проверяем соединение...');
	  
	  try {
		const response = await fetch(`${API_URL}/api/proxy-image`, {
		  method: 'HEAD'
		});
		
		if (response.ok) {
		  setConnectionStatus('✅ Соединение с бэкендом установлено!');
		} else {
		  setConnectionStatus('❌ Ошибка соединения');
		}
	  } catch (error) {
		setConnectionStatus(`❌ Ошибка: ${error.message}`);
	  }
	};

	 // Выносим fetchData из useEffect
	  const fetchData = async () => {
		const { data: muscleData } = await supabase
		  .from('muscles')
		  .select('*')
		  .eq('id', id)
		  .single();

		// Используем нашу утилиту
		const mediaData = await getMediaForEntity('muscle', id);

		setMuscle(muscleData); 
		
		const mediaWithProxy = mediaData.map(item => ({
		  ...item,
		  proxyUrl: item.public_url ? 
			`${API_URL}/api/proxy-image?url=${encodeURIComponent(item.public_url)}` : 
			null
		}));
		
		setMedia(mediaWithProxy || []);
	  };


  // Загрузка данных мышцы
  // В useEffect теперь просто вызываем fetchData
  useEffect(() => {
    fetchData();
  }, [id, API_URL]);
  
  

  const handleSave = (updatedMuscle) => {
    //console.log('MuscleEditPage.js  Данные из формы сохранены:', updatedMuscle);
  };

  const handleDeleteMedia = async (mediaId) => {
	  try {
		// Используем нашу утилиту
		await deleteMediaFile('muscle', id, mediaId);
		
		setMedia(prev => prev.filter(item => item.id !== mediaId));
		setDeleteConfirmItem(null);
	  } catch (error) {
		console.error('Delete failed:', error);
		alert(`Ошибка удаления: ${error.message}`);
	  }
	};

  const handleDeleteClick = (item) => {
    setDeleteConfirmItem(item);
  };

  const confirmDelete = () => {
    if (deleteConfirmItem) {
      handleDeleteMedia(deleteConfirmItem.id);
    }
  };

  const cancelDelete = () => {
    setDeleteConfirmItem(null);
  };

  const handleUpdateDescription = async (mediaId, newDescription) => {
	  try {
		// Пока оставляем старый способ, но логику можно добавить в mediaHelper позже
		/* const { error } = await supabase
		  .from('muscle_media')
		  .update({ description: newDescription })
		  .eq('id', mediaId);
		
		if (error) throw error; */
		
		// Используем нашу универсальную функцию
		await updateMediaDescription('muscle', id, mediaId, newDescription);
		
		
		setMedia(prev => prev.map(item => 
		  item.id === mediaId ? { ...item, description: newDescription } : item
		));
		setEditDescriptionItem(null);
		
	  } catch (error) {
		console.error('Update description failed:', error);
		alert(`Ошибка обновления описания: ${error.message}`);
	  }
	};

  const handleEditDescriptionClick = (item) => {
    setEditDescriptionItem(item);
    setDescriptionText(item.description || '');
  };

  const handleSaveDescription = () => {
    if (editDescriptionItem) {
      handleUpdateDescription(editDescriptionItem.id, descriptionText);
    }
  };

  const handleCancelDescriptionEdit = () => {
    setEditDescriptionItem(null);
    setDescriptionText('');
  };

  const handleFileUpload = async (file) => {
	  setUploading(true);
	  setDebugMessages([]);

	  const addDebugMessage = (message) => {
		setDebugMessages(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
	  };
	  
	  try {   
		addDebugMessage(`Начата загрузка файла: ${file.name} (${file.size} байт)`);
		addDebugMessage(`Используем новую систему загрузки через mediaHelper`);
		
		// Используем нашу утилиту
		const uploadedMedia = await uploadMediaForEntity('muscle', id, file, '');
		
		addDebugMessage(`Файл успешно загружен: ${uploadedMedia.file_name}`);
		
		// Добавляем proxyUrl к новому медиа
		const newMediaWithProxy = {
		  ...uploadedMedia,
		  proxyUrl: uploadedMedia.public_url ? 
			`${API_URL}/api/proxy-image?url=${encodeURIComponent(uploadedMedia.public_url)}` : 
			null
		};
		
		// Обновляем список
		setMedia(prev => [...prev, newMediaWithProxy]);
		addDebugMessage(`Медиа добавлено в список`);

	  } catch (error) {
		console.error('Upload failed:', error);
		alert(`Ошибка: ${error.message}`);
	  } finally {	  
		addDebugMessage("Загрузка завершена");
		setUploading(false);
	  }
	};

  const updateMediaOrder = async (reorderedMedia) => {
  try {
    // Получаем массив ID в новом порядке
    const orderedIds = reorderedMedia.map(item => item.id);
    
    // Используем нашу утилиту
    await updateMediaOrderHelper('muscle', id, orderedIds);
    
    // Обновляем состояние
    setMedia(reorderedMedia);
    
  } catch (error) {
    console.error('Ошибка обновления порядка:', error);
    alert(`Ошибка обновления порядка: ${error.message}`);
  }
};

  // Функция для принудительного обновления ссылок
const handleRefreshLinks = async () => {
  try {
    setRefreshing(true);
    setDebugMessages(prev => [...prev, 'Начато обновление ссылок через API...']);

    // Собираем все public_url для обновления
    const urlsToRefresh = media.map(item => item.public_url).filter(Boolean);
    
    const response = await fetch(`${API_URL}/api/refresh-links`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ urls: urlsToRefresh }),
    });

    const result = await response.json();
    
    if (response.ok) {
      // Добавляем логи о полученном результате
      setDebugMessages(prev => [...prev, `✅ Ответ от бэкенда получен. Найдено результатов: ${result.results.length}`]);
      
      // Обновляем ссылки в состоянии
      const updatedMedia = media.map(item => {
        const refreshed = result.results.find(r => r.originalUrl === item.public_url);
        
        if (refreshed && refreshed.success) {
          // Логируем успешное обновление конкретного файла
          setDebugMessages(prev => [...prev, `🔄 Обновлена ссылка для файла: ${item.file_name}`]);
          return {
            ...item,
            file_url: refreshed.refreshedUrl, // Обновляем ссылку в объекте
            // proxyUrl не обновляем здесь, он зависит от public_url
          };
        } else {
          // Логируем, если ссылка не найдена в результатах
          if (item.public_url) {
            setDebugMessages(prev => [...prev, `⚠️ Не удалось обновить: ${item.file_name}`]);
          }
        }
        return item;
      });
      
      setMedia(updatedMedia);
      setDebugMessages(prev => [...prev, '✅ Обновление состояния завершено']);
      
      // ДОБАВЛЯЕМ КЛЮЧЕВОЙ ЭТАП: Перезагружаем данные из базы, чтобы получить актуальное file_url_updated
      setDebugMessages(prev => [...prev, '🔄 Перезагружаем данные из базы...']);
      await fetchData(); // Вызываем функцию, которую вы вынесли из useEffect
      setDebugMessages(prev => [...prev, '✅ Данные из базы перезагружены']);
      
    } else {
      setDebugMessages(prev => [...prev, `❌ Ошибка API: ${result.error}`]);
    }

  } catch (error) {
    console.error('Refresh failed:', error);
    setDebugMessages(prev => [...prev, `✗ Ошибка: ${error.message}`]);
  } finally {
    setRefreshing(false);
  }
};

 
 
  
  return (
    <div className="edit-page" style={{ maxWidth: '1000px', margin: '0 auto', padding: '20px' }}>
		<Link to="/">← Назад</Link>
		<h2>Редактирование мышцы</h2>

		<MuscleForm 
		  muscle={muscle} 
		  onSave={handleSave}
		/>

      <MuscleRelationships 
        muscleId={id} 
        muscleName={muscle?.name_ru || ''} 
      />

      {/* Блок загруженных картинок */}
      <MediaList 
        items={media} 
        onReorder={updateMediaOrder}
        onDelete={handleDeleteClick}
        onView={(item) => setViewingMedia(item)}
        onEditDescription={handleEditDescriptionClick}
      />

      {/* Блок кнопок */}
      <div className="upload-section" style={{ textAlign: 'center' }}>
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '8px', 
          marginBottom: '20px',
          alignItems: 'center'
        }}>
          <input 
            type="file" 
            id="media-upload"
            accept="image/*,video/*"
            onChange={(e) => handleFileUpload(e.target.files[0])}
            disabled={uploading}
            style={{ display: 'none' }}
          />
          
          <label 
            htmlFor="media-upload"
            style={{
              display: 'inline-block',
              padding: '12px 24px',
              backgroundColor: uploading ? '#ccc' : '#007bff',
              color: 'white',
              borderRadius: '6px',
              cursor: uploading ? 'not-allowed' : 'pointer',
              fontWeight: 'bold',
              textAlign: 'center',
              minWidth: '200px'
            }}
          >
            {uploading ? 'Загрузка...' : 'Выбрать файл'}
          </label>
          
          <div style={{ 
            fontSize: '12px', 
            color: '#666',
            textAlign: 'center'
          }}>
            Файл не выбран
          </div>
          
          <div style={{ 
            fontSize: '14px', 
            color: '#007bff',
            fontWeight: 'bold',
            textAlign: 'center'
          }}>
            Добавить фото/видео
          </div>
        </div>

        {/* Кнопка обновления ссылок */}
        {media.length > 0 && (
          <div style={{ marginBottom: '20px' }}>
            <button 
              onClick={handleRefreshLinks}
              disabled={refreshing || uploading}
			  title='Ссылки на YaDisk устаревают каждые 12 часов, поэтому их периодически нужно обновлять'
              style={{
                padding: '10px 20px',
                backgroundColor: refreshing ? '#6c757d' : '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: (refreshing || uploading) ? 'not-allowed' : 'pointer',
                fontWeight: 'bold'
              }}
            >
              {refreshing ? 'Обновление...' : '🔄 Обновить ссылки YaDisk на фото'}
            </button>
            <div style={{ 
              fontSize: '12px', 
              color: '#666',
              marginTop: '5px'
            }}>
              Если фото не отображаются
            </div>		
          </div>
        )}

        {/* Кнопка отладки - теперь по центру */}
        <div style={{ marginBottom: '20px' }}>
          <button 
            onClick={() => setShowDebugPanel(!showDebugPanel)}
            style={{
              padding: '5px 10px',
              backgroundColor: showDebugPanel ? '#dc3545' : '#17a2b8',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '11px'
            }}
          >
            {showDebugPanel ? '❌ Скрыть отладку' : '🔧 Показать отладку'}
          </button>

          {showDebugPanel && (
            <div style={{
              backgroundColor: '#f8f9fa',
              padding: '15px',
              borderRadius: '4px',
              marginTop: '10px',
              fontSize: '12px',
              fontFamily: 'monospace',
              textAlign: 'left'
            }}>
              <h4>🔧 Информация о подключении:</h4>
              <div><strong>Текущий Frontend:</strong> {window.location.origin}</div>
              <div><strong>Текущий Backend API:</strong> {API_URL}</div>
              <div><strong>Значение NODE_ENV:</strong> {process.env.NODE_ENV}</div>
              <div><strong>Есть на Render вариант Backend с URL:</strong> https://p-dtr-base.onrender.com</div>
              
              <button 
                onClick={testConnection}
                style={{
                  padding: '5px 10px',
                  backgroundColor: '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  marginTop: '10px'
                }}
              >
                Проверить соединение
              </button>
              
              {connectionStatus && (
                <div style={{ 
                  marginTop: '10px', 
                  color: connectionStatus.includes('✅') ? 'green' : 'red',
                  fontWeight: 'bold'
                }}>
                  {connectionStatus}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Горизонтальная линия после кнопки отладки */}
        <div style={{ borderTop: '1px solid #ddd', paddingTop: '10px', marginBottom: '20px' }}></div>

        {/* Кнопка "Вернуться к списку" - выровнена влево */}
        <div style={{ textAlign: 'left' }}>
          <button onClick={() => navigate('/', { state: { shouldRefresh: true } })}>
            Вернуться к списку
          </button>
        </div>
      </div>

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
            maxHeight: '90vh'
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
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }} 
          onClick={cancelDelete}
        >
          <div 
            style={{
              backgroundColor: 'white',
              padding: '25px',
              borderRadius: '12px',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
              maxWidth: '400px',
              width: '90%',
              textAlign: 'center'
            }} 
            onClick={e => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 15px 0', color: '#d32f2f' }}>
              Подтверждение удаления
            </h3>
            <p style={{ margin: '0 0 20px 0', lineHeight: '1.5' }}>
              Вы действительно хотите удалить это {deleteConfirmItem.file_type === 'image' ? 'изображение' : 'видео'}?
            </p>
            <p style={{ 
              margin: '0 0 20px 0', 
              fontSize: '14px', 
              color: '#666',
              fontStyle: 'italic'
            }}>
              Файл: {deleteConfirmItem.file_name || 'Без названия'}
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '15px' }}>
              <button 
                onClick={cancelDelete}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#757575',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  minWidth: '80px'
                }}
              >
                Отмена
              </button>
              <button 
                onClick={confirmDelete}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#d32f2f',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  minWidth: '80px'
                }}
              >
                Удалить
              </button>
            </div>
          </div>
        </div>
      )}

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
            padding: '20px',
            borderRadius: '8px',
            width: '300px'
          }} onClick={e => e.stopPropagation()}>
            <h4 style={{ margin: '0 0 15px 0' }}>Редактирование описания</h4>
            <textarea
              value={descriptionText}
              onChange={(e) => setDescriptionText(e.target.value)}
              placeholder="Введите описание изображения..."
              style={{
                width: '100%',
                height: '80px',
                padding: '8px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                resize: 'vertical',
                marginBottom: '15px'
              }}
              autoFocus
            />
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button 
                onClick={handleCancelDescriptionEdit}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Отмена
              </button>
              <button 
                onClick={handleSaveDescription}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#007bff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Сохранить
              </button>
            </div>
          </div>
        </div>
      )}
      
      <div className="debug-console" style={{
        marginTop: '20px',
        padding: '10px',
        backgroundColor: '#f5f5f5',
        borderRadius: '4px',
        maxHeight: '200px',
        overflowY: 'auto',
        fontFamily: 'monospace'
      }}>
        <h4>Отладочная информация:</h4>
        {debugMessages.map((msg, i) => (
          <div key={i} style={{ 
            padding: '4px',
            borderBottom: '1px solid #eee',
            color: msg.includes('✗') ? 'red' : msg.includes('Ошибка') ? 'red' : 'green'
          }}>
            {msg}
          </div>
        ))}
      </div>	
    </div>
  );
}

export default MuscleEditPage;