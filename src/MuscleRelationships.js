//MuscleRelationships.js
import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

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

    // Загрузка существующих отношений
    const { data: relationshipsData } = await supabase
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
      `)
      .eq('muscle_id', muscleId);

    setAllMuscles(musclesData || []);
    setAllFunctions(functionsData || []);
    setRelationships(relationshipsData || []);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
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

        // Обновляем синергисты
        await updateSynergists(editingRelationship.id, formData.synergists);
        // Обновляем антагонисты
        await updateAntagonists(editingRelationship.id, formData.antagonists);

      } else {
        // Создание нового отношения
        const { data, error } = await supabase
          .from('muscle_relationships')
          .insert({
            muscle_id: muscleId,
            function_id: formData.function_id,
            note: formData.note
          })
          .select()
          .single();

        if (error) throw error;

        // Добавляем синергистов и антагонистов
        await updateSynergists(data.id, formData.synergists);
        await updateAntagonists(data.id, formData.antagonists);
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
    // Удаляем старые синергисты
    await supabase
      .from('muscle_relationship_synergists')
      .delete()
      .eq('relationship_id', relationshipId);

    // Добавляем новые
    if (synergistIds.length > 0) {
      const synergistsData = synergistIds.map(synergistId => ({
        relationship_id: relationshipId,
        synergist_id: synergistId
      }));

      const { error } = await supabase
        .from('muscle_relationship_synergists')
        .insert(synergistsData);

      if (error) throw error;
    }
  };

  const updateAntagonists = async (relationshipId, antagonistIds) => {
    // Удаляем старых антагонистов
    await supabase
      .from('muscle_relationship_antagonists')
      .delete()
      .eq('relationship_id', relationshipId);

    // Добавляем новых
    if (antagonistIds.length > 0) {
      const antagonistsData = antagonistIds.map(antagonistId => ({
        relationship_id: relationshipId,
        antagonist_id: antagonistId
      }));

      const { error } = await supabase
        .from('muscle_relationship_antagonists')
        .insert(antagonistsData);

      if (error) throw error;
    }
  };

  const handleEdit = (relationship) => {
    setEditingRelationship(relationship);
    setFormData({
      function_id: relationship.function_id,
      note: relationship.note || '',
      synergists: relationship.synergists.map(s => s.muscle.id),
      antagonists: relationship.antagonists.map(a => a.muscle.id)
    });
    setShowForm(true);
  };

  const handleDelete = async (relationshipId) => {
    if (window.confirm('Удалить это отношение?')) {
      const { error } = await supabase
        .from('muscle_relationships')
        .delete()
        .eq('id', relationshipId);

      if (error) {
        console.error('Error deleting relationship:', error);
        alert('Ошибка при удалении: ' + error.message);
      } else {
        fetchData();
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
            <label>Синергисты:</label>
            <div style={{ maxHeight: '150px', overflowY: 'auto', border: '1px solid #ddd', padding: '10px' }}>
              {allMuscles.map(muscle => (
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
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label>Антагонисты:</label>
            <div style={{ maxHeight: '150px', overflowY: 'auto', border: '1px solid #ddd', padding: '10px' }}>
              {allMuscles.map(muscle => (
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
        {relationships.map(relationship => (
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
            
            {relationship.synergists.length > 0 && (
              <div style={{ marginBottom: '10px' }}>
                <strong>Синергисты:</strong>
                <ul style={{ margin: '5px 0', paddingLeft: '20px' }}>
                  {relationship.synergists.map(synergist => (
                    <li key={synergist.muscle.id}>
                      {synergist.muscle.name_ru} ({synergist.muscle.name_lat})
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {relationship.antagonists.length > 0 && (
              <div style={{ marginBottom: '10px' }}>
                <strong>Антагонисты:</strong>
                <ul style={{ margin: '5px 0', paddingLeft: '20px' }}>
                  {relationship.antagonists.map(antagonist => (
                    <li key={antagonist.muscle.id}>
                      {antagonist.muscle.name_ru} ({antagonist.muscle.name_lat})
                    </li>
                  ))}
                </ul>
              </div>
            )}

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
        ))}

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