import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from './supabaseClient';
//import { uploadToYandexDisk } from './yandexDisk';
import MuscleForm from './MuscleForm';
import MediaList from './MediaList';

function MuscleEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [muscle, setMuscle] = useState(null);
  const [media, setMedia] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [debugMessages, setDebugMessages] = useState([]); // Перенесено внутрь компонента

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
    console.log('MuscleEditPage.js  Данные из формы сохранены:', updatedMuscle);
  };

  const handleFileUpload = async (file) => {
    setUploading(true);
    setDebugMessages([]);

    const addDebugMessage = (message) => {
      setDebugMessages(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
    };
    
    try {   
      addDebugMessage(`Начата загрузка на Яндекс.Диск файла: ${file.name} (${file.size} байт)`);
      
      const response = await fetch('http://localhost:3001/api/upload', {
        method: 'POST',
        body: (() => {
          const formData = new FormData();
          formData.append('file', file);
          formData.append('muscleId', id);
		  addDebugMessage(`вызов /api/upload для Яндекс.Диск с: ${formData}`);		  		
          return formData;
        })()
      });

      const result = await response.json();
      
	  addDebugMessage(`От Яндекс.Диск получено : ${result} `);
	  
      if (!result.success) {
        throw new Error(result.error || 'Ошибка загрузки');
      }

      const { data, error } = await supabase
        .from('muscle_media')
        .insert({
          muscle_id: id,
          file_url: result.url,
          file_type: file.type.includes('image') ? 'image' : 'video',
          display_order: media.length + 1
        })
        .select();

      if (error) throw error;
      setMedia(prev => [...prev, ...data]);

    } catch (error) {
      console.error('Upload failed:', error);
      alert(`Ошибка: ${error.message}`);
      return null;
    } finally {	  
      addDebugMessage("Загрузка завершена");
      setUploading(false);
    }
  };

  const updateMediaOrder = async (reorderedMedia) => {
    const updates = reorderedMedia.map((item, index) => (
      supabase
        .from('muscle_media')
        .update({ display_order: index + 1 })
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
      
	  
	   {/* Отладочная информация */}
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
              color: msg.includes('❌') ? 'red' : 'green'
            }}>
              {msg}
            </div>
          ))}
        </div>
        
	  
      <div className="upload-section">
        <input 
          type="file" 
          id="media-upload"
          accept="image/*,video/*"
          onChange={(e) => handleFileUpload(e.target.files[0])}
          disabled={uploading}
        />
        <label htmlFor="media-upload">
          {uploading ? 'Загрузка...' : 'Добавить фото/видео'}
        </label>

       

		  <MediaList 
			items={media} 
			onReorder={updateMediaOrder} 
		  />

		  <button onClick={() => navigate('/', { state: { shouldRefresh: true } })}>
			Вернуться к списку
		  </button>
	  </div>
	  
	  
    </div>
  );
}

export default MuscleEditPage;