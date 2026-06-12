// GroupEditPage.js - полностью на новой БД
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import API_URL from './config/api';
import MediaManager from './MediaManager';
import './App.css';

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
      // 1. Загружаем данные группы
      const groupRes = await fetch(`${API_URL}/api/group/${id}`);
      const groupResult = await groupRes.json();
      if (!groupResult.success) throw new Error(groupResult.error);
      
      const groupData = groupResult.data;
      setGroup(groupData);
      setFormData({
        name: groupData.name || '',
        type: groupData.type || '',
        description: groupData.description || ''
      });

      // 2. Загружаем все мышцы (справочник)
      const musclesRes = await fetch(`${API_URL}/api/muscles`);
      const musclesResult = await musclesRes.json();
      if (musclesResult.success) {
        setAllMuscles(musclesResult.data || []);
      }

      // 3. Загружаем мышцы, уже входящие в группу
      const membersRes = await fetch(`${API_URL}/api/group/${id}/members`);
      const membersResult = await membersRes.json();
      if (membersResult.success) {
        // Преобразуем ID к строке для единообразия
        setSelectedMuscles(membersResult.data.map(id => String(id)));
      }
      
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
    const muscleIdStr = String(muscleId);
    setSelectedMuscles(prev => 
      prev.includes(muscleIdStr)
        ? prev.filter(id => id !== muscleIdStr)
        : [...prev, muscleIdStr]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      // 1. Обновляем данные группы
      const updateRes = await fetch(`${API_URL}/api/group/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const updateResult = await updateRes.json();
      if (!updateResult.success) throw new Error(updateResult.error);

      // 2. Обновляем состав группы (отправляем исходные UUID, без преобразования)
      const updateMembersRes = await fetch(`${API_URL}/api/group/${id}/members`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ muscleIds: selectedMuscles })
      });
      const updateMembersResult = await updateMembersRes.json();
      if (!updateMembersResult.success) throw new Error(updateMembersResult.error);

      alert('Группа мышц успешно обновлена!');
      navigate(`/group/${id}`);
    } catch (error) {
      console.error('Error saving group:', error);
      alert(`Ошибка при сохранении: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="detail-container">Загрузка...</div>;
  if (!group) return <div className="detail-container">Группа не найдена</div>;

  return (
    <div className="detail-container">
      <div className="detail-navigation">
        <Link to={`/group/${id}`} className="link-text">← Назад к просмотру группы</Link>
      </div>

      <h2 className="detail-title">Редактирование группы мышц: {group.name}</h2>

      <form onSubmit={handleSubmit} className="muscle-form">
        <div className="form-section">
          <h3>Основная информация</h3>
          
          <div className="form-section">
            <label>Название группы:</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              required
            />
          </div>

          <div className="form-section">
            <label>Тип группы:</label>
            <input
              type="text"
              name="type"
              value={formData.type || ''}
              onChange={handleInputChange}
              placeholder="Например: функциональная, анатомическая, часть одной мышцы и т.д."
            />
          </div>

          <div className="form-section">
            <label>Описание:</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows={5}
            />
          </div>
        </div>

        <div className="form-section">
          <h3>Состав группы</h3>
          
          <div className="multi-select-container">
            {allMuscles.length > 0 ? (
              allMuscles.map(muscle => {
                const muscleIdStr = String(muscle.id);
                const isChecked = selectedMuscles.includes(muscleIdStr);
                return (
                  <div key={muscle.id} className="multi-select-item">
                    <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', width: '100%' }}>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleMuscleSelection(muscle.id)}
                        style={{ marginRight: '12px' }}
                      />
                      <div>
                        <div style={{ fontWeight: 'bold' }}>{muscle.name_ru}</div>
                        <div style={{ fontSize: '12px', color: '#666' }}>{muscle.name_lat}</div>
                      </div>
                    </label>
                  </div>
                );
              })
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
          </div>
        </div>

        <div className="form-actions">
          <button
            type="submit"
            disabled={saving}
            className="save-button"
          >
            {saving ? '⏳ Сохранение...' : '💾 Сохранить изменения группы'}
          </button>
        </div>
      </form>

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