// MuscleRelationships.js
import React, { useState, useEffect, useRef } from 'react';
import API_URL from './config/api';

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

  const formRef = useRef(null);

  useEffect(() => {
    fetchData();
  }, [muscleId]);

  const scrollToForm = () => {
    setTimeout(() => {
      if (formRef.current) {
        formRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };

  const fetchData = async () => {
    try {
      const musclesRes = await fetch(`${API_URL}/api/muscles`);
      const musclesResult = await musclesRes.json();
      if (musclesResult.success) {
        const sortedMuscles = (musclesResult.data || []).sort((a, b) => 
          (a.display_order || 999) - (b.display_order || 999)
        );
        setAllMuscles(sortedMuscles);
      }

      const functionsRes = await fetch(`${API_URL}/api/dictionaries/functions`);
      const functionsResult = await functionsRes.json();
      if (functionsResult.success) {
        setAllFunctions(functionsResult.data || []);
      }

      const relRes = await fetch(`${API_URL}/api/muscle/${muscleId}/relationships`);
      const relResult = await relRes.json();
      if (relResult.success) {
        setRelationships(relResult.data || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      alert('Ошибка загрузки данных: ' + error.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const uniqueSynergists = [...new Set(formData.synergists.filter(id => id !== muscleId))];
      const updatedSynergists = [...uniqueSynergists, muscleId];
      const updatedAntagonists = [...new Set(formData.antagonists.filter(id => id !== muscleId))];

      let url = `${API_URL}/api/relationships`;
      let method = 'POST';

      if (editingRelationship) {
        url = `${API_URL}/api/relationships/${editingRelationship.id}`;
        method = 'PUT';
      }

      const payload = {
        function_id: formData.function_id,
        note: formData.note,
        synergists: updatedSynergists,
        antagonists: updatedAntagonists
      };

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const result = await response.json();

      if (!result.success) throw new Error(result.error);

      setShowForm(false);
      setEditingRelationship(null);
      setFormData({ function_id: '', note: '', synergists: [], antagonists: [] });
      fetchData();
    } catch (error) {
      console.error('Error saving relationship:', error);
      alert('Ошибка при сохранении: ' + error.message);
    }
  };

  const handleEdit = (relationship) => {
    setEditingRelationship(relationship);
    
    const synergists = relationship.synergists?.map(s => s.muscle_id) || [];
    const antagonists = relationship.antagonists?.map(a => a.muscle_id) || [];
    
    const updatedSynergists = synergists.includes(muscleId) ? synergists : [...synergists, muscleId];
    const formSynergists = updatedSynergists.filter(id => id !== muscleId);
    
    setFormData({
      function_id: relationship.function_id,
      note: relationship.note || '',
      synergists: formSynergists,
      antagonists: antagonists.filter(id => id !== muscleId)
    });
    setShowForm(true);
    scrollToForm();
  };

  const handleDelete = async (relationshipId) => {
    if (window.confirm('Удалить это отношение?')) {
      try {
        const response = await fetch(`${API_URL}/api/relationships/${relationshipId}`, {
          method: 'DELETE'
        });
        const result = await response.json();
        if (!result.success) throw new Error(result.error);
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

  const getMuscleNames = (musclesArray) => {
    if (!musclesArray || musclesArray.length === 0) return '—';
    return musclesArray.map(m => `${m.name_ru} (${m.name_lat})`).join(', ');
  };

  const handleToggleForm = () => {
    setShowForm(!showForm);
    if (!showForm) {
      // Сбрасываем редактирование, если открываем форму для добавления
      setEditingRelationship(null);
      setFormData({ function_id: '', note: '', synergists: [], antagonists: [] });
      scrollToForm();
    }
  };

  return (
    <div style={{ marginTop: '30px' }}>
      <h3>Взаимоотношения мышцы "{muscleName}"</h3>
      
      <button 
        onClick={handleToggleForm}
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
        <form 
          ref={formRef}
          onSubmit={handleSubmit} 
          style={{
            border: '1px solid #ddd',
            padding: '20px',
            borderRadius: '8px',
            marginBottom: '20px',
            backgroundColor: '#f9f9f9'
          }}
        >
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
                .filter(muscle => muscle.id !== muscleId)
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
                .filter(muscle => muscle.id !== muscleId)
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
          const isSynergist = relationship.synergists?.some(s => s.muscle_id === muscleId) || false;
          
          return (
            <div key={relationship.id} style={{
              border: '1px solid #ddd',
              padding: '15px',
              borderRadius: '8px',
              marginBottom: '15px',
              backgroundColor: 'white'
            }}>
              <h4 style={{ margin: '0 0 10px 0' }}>
                {relationship.function_name}
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