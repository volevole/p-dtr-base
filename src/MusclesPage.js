// MusclesPage.js - ПОЛНОСТЬЮ НА НОВОЙ БД
import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import API_URL from './config/api';
import EntityList from './EntityList';
import { 
  FaEdit, 
  FaTrash,
  FaArrowUp,
  FaArrowDown 
} from 'react-icons/fa';
import { HiDuplicate } from 'react-icons/hi';
import './App.css';

function MusclesPage() {
  const [muscles, setMuscles] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchMuscles();
  }, []);

  // === ЗАГРУЗКА СПИСКА ===
  const fetchMuscles = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/muscles`);
      const result = await response.json();
      if (result.success) {
        setMuscles(result.data);
      } else {
        console.error('Ошибка загрузки:', result.error);
        setMuscles([]);
      }
    } catch (error) {
      console.error('Ошибка загрузки мышц:', error);
      setMuscles([]);
    } finally {
      setLoading(false);
    }
  };

  // === УДАЛЕНИЕ ===
  const handleDelete = async (id) => {
    // Находим мышцу по ID в текущем списке
  const muscleToDelete = muscles.find(m => m.id === id);
  const muscleName = muscleToDelete?.name_ru || 'эту мышцу';

  if (!window.confirm(`Удалить мышцу "${muscleName}"?`)) return;

    try {
      const response = await fetch(`${API_URL}/api/muscle/${id}`, {
        method: 'DELETE',
      });
      const result = await response.json();

      if (result.success) {
        setMuscles(prev => prev.filter(m => m.id !== id));
      } else {
        throw new Error(result.error || 'Unknown error');
      }
    } catch (error) {
      console.error('Ошибка удаления:', error);
      alert('Ошибка при удалении: ' + error.message);
    }
  };

  // === РЕДАКТИРОВАНИЕ (перенаправление) ===
  const handleEdit = (id) => {
    navigate(`/muscle/${id}/edit`);
  };

  // === ДОБАВЛЕНИЕ ===
  const handleAdd = async () => {
    try {
      const response = await fetch(`${API_URL}/api/muscles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name_ru: 'Новая мышца' })
      });
      const result = await response.json();

      if (result.success) {
        navigate(`/muscle/${result.id}/edit`);
      } else {
        throw new Error(result.error || 'Unknown error');
      }
    } catch (error) {
      console.error('Ошибка создания:', error);
      alert('Ошибка при создании: ' + error.message);
    }
  };

  // === КОПИРОВАНИЕ ===
  const handleCopy = async (id) => {
    try {
      const response = await fetch(`${API_URL}/api/muscle/${id}/copy`, {
        method: 'POST',
      });
      const result = await response.json();

      if (result.success) {
        await fetchMuscles(); // обновляем список
        navigate(`/muscle/${result.id}/edit`);
      } else {
        throw new Error(result.error || 'Unknown error');
      }
    } catch (error) {
      console.error('Ошибка копирования:', error);
      alert('Не удалось создать копию: ' + error.message);
    }
  };

  // === ПЕРЕМЕЩЕНИЕ ===
  const handleMove = async (id, direction) => {
    const currentIndex = muscles.findIndex(m => m.id === id);
    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    
    if (newIndex < 0 || newIndex >= muscles.length) {
      alert('Невозможно переместить - достигнут край списка');
      return;
    }
    
    const newMuscles = [...muscles];
    const [removed] = newMuscles.splice(currentIndex, 1);
    newMuscles.splice(newIndex, 0, removed);

    const updatedMuscles = newMuscles.map((muscle, index) => ({
      ...muscle,
      display_order: index
    }));

    // Оптимистичное обновление UI
    setMuscles(updatedMuscles);

    try {
      const response = await fetch(`${API_URL}/api/muscles/reorder`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderedIds: updatedMuscles.map(m => m.id) })
      });
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Reorder failed');
      }
    } catch (error) {
      console.error('Ошибка сохранения порядка:', error);
      await fetchMuscles(); // откат к серверному состоянию
      alert('Ошибка сохранения изменений: ' + error.message);
    }
  };

  // === КАРТОЧКА (без изменений) ===
  const renderMuscleCard = (muscle, index, actions) => {
    const totalCount = muscles.length;
    
    return (  
      <div key={muscle.id} className="entity-card">
        <div className="entity-card-header">
          <div className="entity-card-title-section">
            <h3 className="entity-card-title">
              <Link to={`/muscle/${muscle.id}`} className="link-text">
                {muscle.name_ru}
              </Link>
            </h3>
            <div className="entity-card-description" style={{ color: '#6c757d', fontSize: '14px', marginTop: '4px' }}>
              {muscle.name_lat}
            </div>
            
            <div className="entity-card-badges">
              {muscle.meridians?.length > 0 && (
                <span className="entity-badge badge-primary">
                  Меридианы: {muscle.meridians.join(', ')}
                </span>
              )}

              {muscle.organs?.length > 0 && (
                <span className="entity-badge" style={{ backgroundColor: '#f3e5f5', color: '#6a1b9a' }}>
                  Органы: {muscle.organs.join(', ')}
                </span>
              )}
            </div>
          </div>
          
          <div className="entity-card-actions">
            <button onClick={actions.onCopy} className="entity-action-btn" title="Копировать">
              <HiDuplicate size={14} />
            </button>
            <button onClick={actions.onEdit} className="entity-action-btn" title="Редактировать">
              <FaEdit size={14} />
            </button>
            <button onClick={actions.onDelete} className="entity-action-btn delete-btn" title="Удалить">
              <FaTrash size={14} />
            </button>
          </div>
        </div>

        <div className="entity-move-buttons" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          {muscle.dysfunctionsCount > 0 && (
            <Link 
              to={`/muscle/${muscle.id}/dysfunctions`}
              style={{
                display: 'inline-block',
                backgroundColor: '#dc3545',
                color: 'white',
                padding: '4px 12px',
                borderRadius: '4px',
                textDecoration: 'none',
                fontSize: '12px',
                fontWeight: 'bold'
              }}
            >
              Дисфункций: {muscle.dysfunctionsCount}
            </Link>
          )}
          
          <div style={{ display: 'flex', gap: '8px' }}>
            <button 
              onClick={actions.onMoveUp} 
              disabled={index === 0}
              className={`entity-move-btn up-btn ${index === 0 ? 'disabled' : ''}`}
              title="Переместить выше"
            >
              <FaArrowUp size={10} />
              <span>Вверх</span>
            </button>
            <button 
              onClick={actions.onMoveDown} 
              disabled={index === totalCount - 1}
              className={`entity-move-btn down-btn ${index === totalCount - 1 ? 'disabled' : ''}`}
              title="Переместить ниже"
            >
              <FaArrowDown size={10} />
              <span>Вниз</span>
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (loading) return <div className="detail-container">Загрузка...</div>;

  const stats = {
    total: muscles.length,
    withRelations: muscles.filter(m => 
      (m.meridians?.length > 0) || 
      (m.organs?.length > 0) || 
      (m.dysfunctionsCount > 0) ||
      (m.relatedCount > 0)
    ).length,
    withMeridians: muscles.filter(m => m.meridians?.length > 0).length,
    withOrgans: muscles.filter(m => m.organs?.length > 0).length,
    withDysfunctions: muscles.filter(m => m.dysfunctionsCount > 0).length
  };

  const columns = [
    { field: 'name_ru', label: 'Название (рус)', searchable: true },
    { field: 'name_lat', label: 'Название (лат)', searchable: true }
  ];

  return (
    <EntityList
      entities={muscles}
      entityType="muscle"
      entityName="Мышцы"
      onEdit={handleEdit}
      onDelete={handleDelete}
      onAdd={handleAdd}
      onCopy={handleCopy}
      onMove={handleMove}
      stats={stats}
      columns={columns}
      searchPlaceholder="Поиск по названию мышцы..."
      renderCard={renderMuscleCard}
      defaultSort="display_order" 
    />
  );
}

export default MusclesPage;