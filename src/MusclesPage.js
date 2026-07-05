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
  const [networkError, setNetworkError] = useState(false); // 👈 НОВОЕ СОСТОЯНИЕ
  const navigate = useNavigate();

  useEffect(() => {
    fetchMuscles();
  }, []);

  // === ЗАГРУЗКА СПИСКА ===
  const fetchMuscles = async () => {
    try {
      setLoading(true);
      setNetworkError(false); // Сбрасываем ошибку при новом запросе
      
      const response = await fetch(`${API_URL}/api/muscles`);
      
      // Проверяем HTTP статус
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        setMuscles(result.data);
      } else {
        console.error('Ошибка загрузки:', result.error);
        setMuscles([]);
      }
    } catch (error) {
      console.error('Ошибка загрузки мышц:', error);
      setNetworkError(true);
      setMuscles([]);
    } finally {
      setLoading(false);
    }
  };

  // === УДАЛЕНИЕ ===
  const handleDelete = async (id) => {
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

  // === РЕДАКТИРОВАНИЕ ===
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
        await fetchMuscles();
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
      await fetchMuscles();
      alert('Ошибка сохранения изменений: ' + error.message);
    }
  };

  // === КАРТОЧКА ===
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

  // === РЕНДЕРИНГ ===

  // Показываем загрузку
  if (loading) {
    return <div className="detail-container">Загрузка...</div>;
  }

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
    <>
      {/* ОШИБКА СЕТИ */}
      {networkError && (
        <div style={{
          backgroundColor: '#f8d7da',
          color: '#721c24',
          padding: '20px',
          borderRadius: '8px',
          marginBottom: '20px',
          border: '1px solid #f5c6cb',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '10px' }}>📡</div>
          <h3 style={{ margin: '0 0 10px 0' }}>Связь с сервером потеряна</h3>
          <p style={{ margin: '0 0 5px 0' }}>
            Не удалось загрузить данные. Проверьте подключение к интернету.
          </p>
          <p style={{ margin: '0 0 15px 0', fontSize: '14px', color: '#856404' }}>
            💡 Если интернет есть, возможно сервер временно недоступен.
            <br />
            Проверьте доступность сервера по ссылке ниже:
          </p>

          <div style={{
            backgroundColor: '#fff',
            padding: '10px 15px',
            borderRadius: '6px',
            display: 'inline-block',
            marginBottom: '15px',
            border: '1px solid #f5c6cb'
          }}>
            <a
              href={`${API_URL}/api/media/supported-entities`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: '#0056b3',
                textDecoration: 'none',
                fontWeight: 'bold',
                fontSize: '14px',
                wordBreak: 'break-all'
              }}
              onMouseEnter={(e) => e.target.style.textDecoration = 'underline'}
              onMouseLeave={(e) => e.target.style.textDecoration = 'none'}
            >
              🔗 Проверить сервер
            </a>
            <span style={{ fontSize: '12px', color: '#666', display: 'block', marginTop: '4px' }}>
              {API_URL}/api/media/supported-entities
            </span>
          </div>

          <div style={{ marginTop: '15px' }}>
            <button
              onClick={fetchMuscles}
              style={{
                padding: '10px 25px',
                backgroundColor: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '16px'
              }}
              onMouseEnter={(e) => e.target.style.backgroundColor = '#0056b3'}
              onMouseLeave={(e) => e.target.style.backgroundColor = '#007bff'}
            >
              🔄 Повторить попытку
            </button>
          </div>
        </div>
      )}

      {/* ОСНОВНОЙ КОНТЕНТ — только если нет ошибки сети */}
      {!networkError && (
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
      )}
    </>
  );
}

export default MusclesPage;