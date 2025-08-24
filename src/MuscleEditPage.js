import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from './supabaseClient';
import MuscleForm from './MuscleForm';
import { MediaList } from './MediaList';
import MuscleMediaViewer from './MuscleMediaViewer';
import MuscleRelationships from './MuscleRelationships';

function MuscleEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [muscle, setMuscle] = useState(null);
  const [media, setMedia] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [debugMessages, setDebugMessages] = useState([]);
  const [viewingMedia, setViewingMedia] = useState(null);
  const [deleteConfirmItem, setDeleteConfirmItem] = useState(null);
  const [editDescriptionItem, setEditDescriptionItem] = useState(null); // Для модального окна редактирования
  const [descriptionText, setDescriptionText] = useState(''); // Текст описания

  const API_URL = process.env.NODE_ENV === 'production' 
  ? process.env.REACT_APP_API_URL 
  : 'http://localhost:3001';


  // для отладки
  useEffect(() => {
    //console.log('viewingMedia changed:', viewingMedia);
  }, [viewingMedia]);

  // Загрузка данных мышцы
  useEffect(() => {
    const fetchData = async () => {
      const { data: muscleData } = await supabase
        .from('muscles')
        .select('*')
        .eq('id', id)
        .single();

      const { data: mediaData } = await supabase
        .from('muscle_media')
        .select('*')
        .eq('muscle_id', id)
        .order('display_order');

      setMuscle(muscleData);
      setMedia(mediaData || []);
    };

    fetchData();
  }, [id]);

  const handleSave = (updatedMuscle) => {
    //console.log('MuscleEditPage.js  Данные из формы сохранены:', updatedMuscle);
  };

  const handleDeleteMedia = async (mediaId) => {
    try {
      const { error } = await supabase
        .from('muscle_media')
        .delete()
        .eq('id', mediaId);
      
      if (error) throw error;
      
      setMedia(prev => prev.filter(item => item.id !== mediaId));
      setDeleteConfirmItem(null);
    } catch (error) {
      console.error('Delete failed:', error);
      alert(`Ошибка удаления: ${error.message}`);
    }
  };

  const handleDeleteClick = (item) => {
    //console.log('Delete clicked for item:', item.id);
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
      const { error } = await supabase
        .from('muscle_media')
        .update({ description: newDescription })
        .eq('id', mediaId);
      
      if (error) throw error;
      
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
    //console.log('Edit description clicked for item:', item.id);
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
      addDebugMessage(`Начата загрузка на Яндекс.Диск файла: ${file.name} (${file.size} байт)`);
      
      const formData = new FormData();
      formData.append('file', file);
      formData.append('muscleId', id);
      addDebugMessage(`Вызов /api/upload для Яндекс.Диск`);

      const response = await fetch(`${API_URL}/api/upload`, {
        method: 'POST',
        body: formData
      });

      const result = await response.json();
      
      addDebugMessage(`От Яндекс.Диск получено: ${JSON.stringify(result)}`);
      
      if (!result.success) {
        throw new Error(result.error || 'Ошибка загрузки');
      }

      const { data, error } = await supabase
        .from('muscle_media')
        .insert({
          muscle_id: id,
          file_url: result.url,
          public_url: result.publicUrl,
          file_name: result.fileName,
          file_type: file.type.startsWith('image/') ? 'image' : 'video',
          display_order: media.length
        })
        .select();

      if (error) throw error;
      
      addDebugMessage(`Ссылка сохранена в БД: ${result.url}`);
      setMedia(prev => [...prev, ...data]);

    } catch (error) {
      console.error('Upload failed:', error);
      alert(`Ошибка: ${error.message}`);
    } finally {	  
      addDebugMessage("Загрузка завершена");
      setUploading(false);
    }
  };

  const updateMediaOrder = async (reorderedMedia) => {
    const updates = reorderedMedia.map((item, index) => (
      supabase
        .from('muscle_media')
        .update({ display_order: index })
        .eq('id', item.id)
    ));

    await Promise.all(updates);
    setMedia(reorderedMedia);
  };

  return (
    <div className="edit-page">
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

      
        
	  
      <div className="upload-section">
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
			  style={{ display: 'none' }} // Скрываем стандартный input
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
              <MuscleMediaViewer media={viewingMedia} />
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

        <MediaList 
          items={media.map(item => ({
            ...item,
            proxyUrl: item.file_url ? 
              `/api/proxy-image?url=${encodeURIComponent(item.file_url)}` : 
              null
          }))} 
          onReorder={updateMediaOrder}
          onDelete={handleDeleteClick}
          onView={(item) => setViewingMedia(item)}
          onEditDescription={handleEditDescriptionClick}
        />       
        
        <button onClick={() => navigate('/', { state: { shouldRefresh: true } })}>
          Вернуться к списку
        </button>
      </div>

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
            color: msg.includes('❌') ? 'red' : msg.includes('Ошибка') ? 'red' : 'green'
          }}>
            {msg}
          </div>
        ))}
      </div>	
	  
    </div>
  );
}

export default MuscleEditPage;