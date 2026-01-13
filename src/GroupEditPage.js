// GroupEditPage.js
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from './utils/supabaseClient';
import MediaManager from './MediaManager';
import API_URL from './config/api';

function GroupEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    type: '',
    description: ''
  });
  
  const [allMuscles, setAllMuscles] = useState([]);
  const [selectedMuscles, setSelectedMuscles] = useState([]);

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    setLoading(true);

    try {
      // Загрузка данных группы
      const { data: groupData, error: groupError } = await supabase
        .from('muscle_groups')
        .select('*')
        .eq('id', id)
        .single();

      if (groupError) throw groupError;

      // Загрузка всех мышц
      const { data: musclesData, error: musclesError } = await supabase
        .from('muscles')
        .select('id, name_ru, name_lat')
        .order('name_ru');

      if (musclesError) throw musclesError;

      // Загрузка мышц, которые уже в группе
      const { data: groupMusclesData, error: membershipError } = await supabase
        .from('muscle_group_membership')
        .select('muscle_id')
        .eq('group_id', id);

      if (membershipError) throw membershipError;

      if (groupData) {
        setGroup(groupData);
        setFormData({
          name: groupData.name || '',
          type: groupData.type || '',
          description: groupData.description || ''
        });
      }

      setAllMuscles(musclesData || []);
      setSelectedMuscles(groupMusclesData?.map(item => item.muscle_id) || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      alert('Ошибка загрузки данных: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const toggleMuscleSelection = (muscleId) => {
    setSelectedMuscles(prev => 
      prev.includes(muscleId)
        ? prev.filter(id => id !== muscleId)
        : [...prev, muscleId]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      // Обновление данных группы
      const { error: updateError } = await supabase
        .from('muscle_groups')
        .update({
          name: formData.name,
          type: formData.type,
          description: formData.description,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (updateError) throw updateError;

      // Обновление состава группы
      // Удаляем старые связи
      const { error: deleteError } = await supabase
        .from('muscle_group_membership')
        .delete()
        .eq('group_id', id);

      if (deleteError) throw deleteError;

      // Добавляем новые связи
      if (selectedMuscles.length > 0) {
        const membershipData = selectedMuscles.map(muscleId => ({
          group_id: id,
          muscle_id: muscleId,
          created_at: new Date().toISOString()
        }));

        const { error: insertError } = await supabase
          .from('muscle_group_membership')
          .insert(membershipData);

        if (insertError) throw insertError;
      }

      alert('Группа мышц успешно обновлена!');
      navigate(`/group/${id}`);
    } catch (error) {
      console.error('Error saving group:', error);
      alert(`Ошибка при сохранении: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div style={{ padding: '2rem' }}>Загрузка...</div>;
  if (!group) return <div style={{ padding: '2rem' }}>Группа не найдена</div>;

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '20px' }}>
      <div style={{ marginBottom: '20px' }}>
        <Link to={`/group/${id}`}>← Назад к просмотру группы</Link>
      </div>

      <h2>Редактирование группы мышц: {group.name}</h2>

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
              Название группы:
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
              Тип группы:
            </label>
            <input
              type="text"
              name="type"
              value={formData.type}
              onChange={handleInputChange}
              style={{ width: '100%', padding: '8px', fontSize: '16px' }}
              placeholder="Например: функциональная, анатомическая и т.д."
            />
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px' }}>
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
        </div>

        <div style={{ 
          backgroundColor: '#f8f9fa', 
          padding: '20px', 
          borderRadius: '8px',
          marginBottom: '20px'
        }}>
          <h3>Состав группы</h3>
          
          <div style={{ 
            maxHeight: '300px', 
            overflowY: 'auto', 
            border: '1px solid #ddd', 
            padding: '15px',
            marginTop: '10px',
            backgroundColor: 'white'
          }}>
            {allMuscles.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {allMuscles.map(muscle => (
                  <div key={muscle.id} style={{ 
                    padding: '10px', 
                    border: '1px solid #e0e0e0',
                    borderRadius: '4px',
                    backgroundColor: selectedMuscles.includes(muscle.id) ? '#e7f4ff' : 'white'
                  }}>
                    <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={selectedMuscles.includes(muscle.id)}
                        onChange={() => toggleMuscleSelection(muscle.id)}
                        style={{ 
                          marginRight: '12px',
                          width: '18px',
                          height: '18px',
                          cursor: 'pointer'
                        }}
                      />
                      <div>
                        <div style={{ fontWeight: 'bold' }}>{muscle.name_ru}</div>
                        <div style={{ fontSize: '14px', color: '#666' }}>{muscle.name_lat}</div>
                      </div>
                    </label>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
                Нет доступных мышц
              </div>
            )}
          </div>
          
          <div style={{ 
            fontSize: '14px', 
            color: '#666', 
            marginTop: '10px',
            padding: '10px',
            backgroundColor: '#e9f7fe',
            borderRadius: '4px'
          }}>
            Выбрано: <strong>{selectedMuscles.length}</strong> мышц
            {selectedMuscles.length > 0 && (
              <div style={{ fontSize: '12px', marginTop: '5px' }}>
                {allMuscles
                  .filter(muscle => selectedMuscles.includes(muscle.id))
                  .map(muscle => muscle.name_ru)
                  .join(', ')}
              </div>
            )}
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          style={{
            padding: '12px 24px',
            backgroundColor: saving ? '#6c757d' : '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: saving ? 'not-allowed' : 'pointer',
            fontSize: '16px',
            fontWeight: 'bold',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            if (!saving) e.target.style.backgroundColor = '#218838';
          }}
          onMouseLeave={(e) => {
            if (!saving) e.target.style.backgroundColor = '#28a745';
          }}
        >
          {saving ? '⏳ Сохранение...' : '💾 Сохранить изменения группы'}
        </button>
      </form>

      {/* Используем универсальный MediaManager для группы мышц */}
      <MediaManager 
        entityType="muscle_group"
        entityId={id}
        entityName={group.name}
        API_URL={API_URL}
      />
    </div>
  );
}

export default GroupEditPage;