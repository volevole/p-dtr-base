// MuscleEditPage.js
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from './utils/supabaseClient';
import MuscleForm from './MuscleForm';
import MuscleRelationships from './MuscleRelationships';
import MediaManager from './MediaManager';
import API_URL from './config/api';

function MuscleEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [muscle, setMuscle] = useState(null);
  const [loading, setLoading] = useState(true);

  

  // Загрузка данных мышцы
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const { data: muscleData, error } = await supabase
          .from('muscles')
          .select('*')
          .eq('id', id)
          .single();

        if (error) throw error;
        setMuscle(muscleData);
        
      } catch (error) {
        console.error('Error loading muscle:', error);
        alert('Ошибка загрузки данных: ' + error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  const handleSave = (updatedMuscle) => {
    console.log('Muscle data saved:', updatedMuscle);
    // Обновляем локальные данные
    setMuscle(updatedMuscle);
  };

  if (loading) {
    return <div style={{ padding: '2rem' }}>Загрузка...</div>;
  }

  if (!muscle) {
    return (
      <div style={{ padding: '2rem' }}>
        <div style={{ marginBottom: '20px' }}>
          <Link to="/">← Назад к списку</Link>
        </div>
        <h2>Мышца не найдена</h2>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
      <div style={{ marginBottom: '20px' }}>
        <Link to={`/muscle/${id}`}>← Назад к просмотру мышцы</Link>
        <span style={{ margin: '0 10px' }}>|</span>
        <Link to="/">Вернуться к списку</Link>
      </div>

      <h2>Редактирование мышцы: {muscle.name_ru || muscle.name_lat || 'Без названия'}</h2>

      <MuscleForm 
        muscle={muscle} 
        onSave={handleSave}
      />

      <MuscleRelationships 
        muscleId={id} 
        muscleName={muscle.name_ru || ''} 
      />

      {/* Используем универсальный MediaManager */}
      <MediaManager 
        entityType="muscle"
        entityId={id}
        entityName={muscle.name_ru || ''}
        API_URL={API_URL}
      />
    </div>
  );
}

export default MuscleEditPage;