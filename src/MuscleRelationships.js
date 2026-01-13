//MuscleRelationships.js
import React, { useState, useEffect } from 'react';
import { supabase } from './utils/supabaseClient';

function MuscleRelationships({ muscleId, muscleName }) {
  const [relationships, setRelationships] = useState([]);
  const [allMuscles, setAllMuscles] = useState([]);
  const [allFunctions, setAllFunctions] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingRelationship, setEditingRelationship] = useState(null);
  const [formData, setFormData] = useState({
    function_id: '',
    note: '',
    synergists: [],
    antagonists: []
  });

  useEffect(() => {
    fetchData();
  }, [muscleId]);

const fetchData = async () => {
  try {
    // Загрузка всех мышц для выпадающих списков
    const { data: musclesData } = await supabase
      .from('muscles')
      .select('id, name_ru, name_lat')
      .order('name_ru');

    // Загрузка всех функций
    const { data: functionsData } = await supabase
      .from('functions')
      .select('id, name')
      .order('name');

    // Загрузка ВСЕХ отношений (без фильтра по muscle_id)
    const { data: allRelationshipsData, error } = await supabase
      .from('muscle_relationships')
      .select(`
        *,
        function:functions(name),
        synergists:muscle_relationship_synergists(
          muscle:muscles(id, name_ru, name_lat)
        ),
        antagonists:muscle_relationship_antagonists(
          muscle:muscles(id, name_ru, name_lat)
        )
      `);

    if (error) throw error;

    // Фильтруем отношения, где текущая мышца есть в синергистах ИЛИ антагонистах
    const filteredRelationships = allRelationshipsData?.filter(relationship => {
      const isSynergist = relationship.synergists?.some(s => s.muscle.id === muscleId) || false;
      const isAntagonist = relationship.antagonists?.some(a => a.muscle.id === muscleId) || false;
      return isSynergist || isAntagonist; // <-- Ключевое изменение!
    }) || [];

    setAllMuscles(musclesData || []);
    setAllFunctions(functionsData || []);
    setRelationships(filteredRelationships);

  } catch (error) {
    console.error('Error fetching data:', error);
    alert('Ошибка загрузки данных: ' + error.message);
  }
};


  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      // Убираем дубликаты и текущую мышцу из formData.synergists
    const uniqueSynergists = [...new Set(formData.synergists.filter(id => id !== muscleId))];
    
    // Всегда добавляем текущую мышцу в синергисты
    const updatedSynergists = [...uniqueSynergists, muscleId];
    const updatedAntagonists = [...new Set(formData.antagonists.filter(id => id !== muscleId))]; // Антагонисты без изменений

      if (editingRelationship) {
        // Редактирование существующего отношения
        const { error } = await supabase
          .from('muscle_relationships')
          .update({
            function_id: formData.function_id,
            note: formData.note
          })
          .eq('id', editingRelationship.id);

        if (error) throw error;

        // Обновляем синергисты (включая текущую мышцу)
        await updateSynergists(editingRelationship.id, updatedSynergists);
        // Обновляем антагонисты
        await updateAntagonists(editingRelationship.id, updatedAntagonists);

      } else {
        // Создание нового отношения (БЕЗ muscle_id)
        const { data, error } = await supabase
          .from('muscle_relationships')
          .insert({
            function_id: formData.function_id,
            note: formData.note
          })
          .select()
          .single();

        if (error) throw error;

        // Добавляем синергистов (включая текущую мышцу) и антагонистов
        await updateSynergists(data.id, updatedSynergists);
        await updateAntagonists(data.id, updatedAntagonists);
      }

      setShowForm(false);
      setEditingRelationship(null);
      setFormData({ function_id: '', note: '', synergists: [], antagonists: [] });
      fetchData(); // Обновляем список

    } catch (error) {
      console.error('Error saving relationship:', error);
      alert('Ошибка при сохранении: ' + error.message);
    }
  };

  const updateSynergists = async (relationshipId, synergistIds) => {
    try {
		
		//console.log('[DEBUG] Updating synergists for relationship', relationshipId);
		//console.log('[DEBUG] Synergist IDs to insert:', synergistIds);
		
		// Проверяем на дубликаты внутри массива
		const uniqueIds = [...new Set(synergistIds)];
		if (uniqueIds.length !== synergistIds.length) {
		  console.warn('[DEBUG] Duplicate muscle IDs in array!', synergistIds);
		}
		
      // Удаляем старые синергисты
      const { error: deleteError } = await supabase
        .from('muscle_relationship_synergists')
        .delete()
        .eq('relationship_id', relationshipId);

      if (deleteError) throw deleteError;

      // Добавляем новые
      if (synergistIds.length > 0) {
        const synergistsData = synergistIds.map(synergistId => ({
          relationship_id: relationshipId,
          synergist_id: synergistId
        }));

        const { error: insertError } = await supabase
          .from('muscle_relationship_synergists')
          .insert(synergistsData);

        if (insertError) throw insertError;
      }
    } catch (error) {
		console.error('Error message on adding syn :', error.message);
      throw new Error(`Ошибка обновления синергистов: ${error.message}`);
    }
  };

  const updateAntagonists = async (relationshipId, antagonistIds) => {
    try {
      // Удаляем старых антагонистов
      const { error: deleteError } = await supabase
        .from('muscle_relationship_antagonists')
        .delete()
        .eq('relationship_id', relationshipId);

      if (deleteError) throw deleteError;

      // Добавляем новых
      if (antagonistIds.length > 0) {
        const antagonistsData = antagonistIds.map(antagonistId => ({
          relationship_id: relationshipId,
          antagonist_id: antagonistId
        }));

        const { error: insertError } = await supabase
          .from('muscle_relationship_antagonists')
          .insert(antagonistsData);

        if (insertError) throw insertError;
      }
    } catch (error) {
      throw new Error(`Ошибка обновления антагонистов: ${error.message}`);
    }
  };

  const handleEdit = (relationship) => {
	  setEditingRelationship(relationship);
	  
	  // Автоматически добавляем текущую мышцу в синергисты
	  const synergists = relationship.synergists?.map(s => s.muscle.id) || [];
	  const antagonists = relationship.antagonists?.map(a => a.muscle.id) || [];
	  
	  // Убеждаемся, что текущая мышца есть в синергистах
	  const updatedSynergists = synergists.includes(muscleId) ? synergists : [...synergists, muscleId];
	  
	  // Убираем текущую мышцу из массива для формы, чтобы она не отображалась в списке выбора
	  const formSynergists = updatedSynergists.filter(id => id !== muscleId);
	  
	  setFormData({
		function_id: relationship.function_id,
		note: relationship.note || '',
		synergists: formSynergists, // Только другие мышцы
		antagonists: antagonists.filter(id => id !== muscleId) // Тоже убираем текущую мышцу
	  });
	  setShowForm(true);
	};

  const handleDelete = async (relationshipId) => {
    if (window.confirm('Удалить это отношение?')) {
      try {
        const { error } = await supabase
          .from('muscle_relationships')
          .delete()
          .eq('id', relationshipId);

        if (error) throw error;
        
        fetchData();
      } catch (error) {
        console.error('Error deleting relationship:', error);
        alert('Ошибка при удалении: ' + error.message);
      }
    }
  };

  const toggleMuscleSelection = (muscleId, type) => {
    setFormData(prev => ({
      ...prev,
      [type]: prev[type].includes(muscleId)
        ? prev[type].filter(id => id !== muscleId)
        : [...prev[type], muscleId]
    }));
  };

  // Функция для получения названий мышц из массива
  const getMuscleNames = (musclesArray) => {
    if (!musclesArray || musclesArray.length === 0) return '—';
    return musclesArray.map(m => `${m.muscle.name_ru} (${m.muscle.name_lat})`).join(', ');
  };

  return (
    <div style={{ marginTop: '30px' }}>
      <h3>Взаимоотношения мышцы "{muscleName}"</h3>
      
      <button 
        onClick={() => setShowForm(!showForm)}
        style={{
          padding: '10px 15px',
          backgroundColor: '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          marginBottom: '20px'
        }}
      >
        {showForm ? 'Отменить' : 'Добавить отношение'}
      </button>

      {showForm && (
        <form onSubmit={handleSubmit} style={{
          border: '1px solid #ddd',
          padding: '20px',
          borderRadius: '8px',
          marginBottom: '20px',
          backgroundColor: '#f9f9f9'
        }}>
          <h4>{editingRelationship ? 'Редактировать' : 'Добавить'} отношение</h4>
          
          <div style={{ marginBottom: '15px' }}>
            <label>Функция:</label>
            <select
              value={formData.function_id}
              onChange={(e) => setFormData({...formData, function_id: e.target.value})}
              style={{ width: '100%', padding: '8px', marginTop: '5px' }}
              required
            >
              <option value="">Выберите функцию</option>
              {allFunctions.map(func => (
                <option key={func.id} value={func.id}>{func.name}</option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label>Примечание:</label>
            <textarea
              value={formData.note}
              onChange={(e) => setFormData({...formData, note: e.target.value})}
              style={{ width: '100%', padding: '8px', marginTop: '5px', minHeight: '60px' }}
              placeholder="Дополнительная информация о отношении"
            />
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label>Синергисты (кроме текущей мышцы):</label>
            <div style={{ maxHeight: '150px', overflowY: 'auto', border: '1px solid #ddd', padding: '10px' }}>
              {allMuscles
                .filter(muscle => muscle.id !== muscleId) // Скрываем текущую мышцу
                .map(muscle => (
                  <div key={muscle.id}>
                    <label>
                      <input
                        type="checkbox"
                        checked={formData.synergists.includes(muscle.id)}
                        onChange={() => toggleMuscleSelection(muscle.id, 'synergists')}
                      />
                      {muscle.name_ru} ({muscle.name_lat})
                    </label>
                  </div>
                ))}
            </div>
            <div style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
              * Текущая мышца "{muscleName}" автоматически добавляется в синергисты
            </div>
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label>Антагонисты:</label>
            <div style={{ maxHeight: '150px', overflowY: 'auto', border: '1px solid #ddd', padding: '10px' }}>
              {allMuscles
                .filter(muscle => muscle.id !== muscleId) // Скрываем текущую мышцу
                .map(muscle => (
                  <div key={muscle.id}>
                    <label>
                      <input
                        type="checkbox"
                        checked={formData.antagonists.includes(muscle.id)}
                        onChange={() => toggleMuscleSelection(muscle.id, 'antagonists')}
                      />
                      {muscle.name_ru} ({muscle.name_lat})
                    </label>
                  </div>
                ))}
            </div>
          </div>

          <button type="submit" style={{
            padding: '10px 20px',
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}>
            {editingRelationship ? 'Обновить' : 'Сохранить'}
          </button>

          {editingRelationship && (
            <button 
              type="button"
              onClick={() => {
                setEditingRelationship(null);
                setFormData({ function_id: '', note: '', synergists: [], antagonists: [] });
              }}
              style={{
                padding: '10px 20px',
                backgroundColor: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                marginLeft: '10px'
              }}
            >
              Отменить редактирование
            </button>
          )}
        </form>
      )}

      <div>
        {relationships.map(relationship => {
          // Определяем роль текущей мышцы в этом отношении
          const isSynergist = relationship.synergists?.some(s => s.muscle.id === muscleId) || false;
          
          return (
            <div key={relationship.id} style={{
              border: '1px solid #ddd',
              padding: '15px',
              borderRadius: '8px',
              marginBottom: '15px',
              backgroundColor: 'white'
            }}>
              <h4 style={{ margin: '0 0 10px 0' }}>
                {relationship.function?.name}
                {relationship.note && ` - ${relationship.note}`}
              </h4>
              
            <div style={{ marginBottom: '10px' }}>
				  <strong>Роль этой мышцы:</strong>{' '}
				  {isSynergist ? (
					<span style={{color: 'green'}}>Синергист</span>
				  ) : (
					<span style={{color: 'red'}}>Антагонист</span>
				  )}
			</div>
              
              <div style={{ marginBottom: '10px' }}>
                <strong>Синергисты:</strong>{' '}
                {getMuscleNames(relationship.synergists)}
              </div>

              <div style={{ marginBottom: '10px' }}>
                <strong>Антагонисты:</strong>{' '}
                {getMuscleNames(relationship.antagonists)}
              </div>

              <div>
                <button 
                  onClick={() => handleEdit(relationship)}
                  style={{
                    padding: '5px 10px',
                    backgroundColor: '#007bff',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    marginRight: '10px'
                  }}
                >
                  Редактировать
                </button>
                <button 
                  onClick={() => handleDelete(relationship.id)}
                  style={{
                    padding: '5px 10px',
                    backgroundColor: '#dc3545',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  Удалить
                </button>
              </div>
            </div>
          );
        })}

        {relationships.length === 0 && !showForm && (
          <p style={{ color: '#666', fontStyle: 'italic' }}>
            Нет добавленных взаимоотношений
          </p>
        )}
      </div>
    </div>
  );
}

export default MuscleRelationships;