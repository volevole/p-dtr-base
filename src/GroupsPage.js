// GroupsPage.js - полностью на новой БД
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

function GroupsPage() {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/groups`);
      const result = await response.json();
      
      if (result.success) {
        setGroups(result.data);
      } else {
        console.error('Ошибка загрузки групп:', result.error);
        setGroups([]);
      }
    } catch (error) {
      console.error('Ошибка загрузки групп:', error);
      setGroups([]);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (id) => {
    navigate(`/group/${id}/edit`);
  };

  const handleDelete = async (id) => {
    const groupToDelete = groups.find(g => g.id === id);
    if (!groupToDelete) {
      alert('Группа не найдена');
      return;
    }

    let confirmMessage = `Удалить группу "${groupToDelete.name}"?`;
    if (groupToDelete.muscleCount > 0) {
      confirmMessage = `Группа "${groupToDelete.name}" содержит ${groupToDelete.muscleCount} мышц. Удалить вместе с ними?`;
    }

    if (!window.confirm(confirmMessage)) return;

    try {
      const response = await fetch(`${API_URL}/api/group/${id}`, {
        method: 'DELETE'
      });
      const result = await response.json();

      if (result.success) {
        setGroups(prev => prev.filter(g => g.id !== id));
        if (result.muscleCount > 0) {
          alert(`Группа удалена. Удалено ${result.muscleCount} связанных мышц.`);
        }
      } else {
        throw new Error(result.error || 'Unknown error');
      }
    } catch (error) {
      console.error('Ошибка удаления:', error);
      alert('Ошибка при удалении: ' + error.message);
    }
  };

  const handleAdd = async () => {
    try {
      const response = await fetch(`${API_URL}/api/groups`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Новая группа', description: '' })
      });
      const result = await response.json();

      if (result.success) {
        navigate(`/group/${result.id}/edit`);
      } else {
        throw new Error(result.error || 'Unknown error');
      }
    } catch (error) {
      console.error('Ошибка создания:', error);
      alert('Ошибка при создании: ' + error.message);
    }
  };

  const handleCopy = async (id) => {
    try {
      const response = await fetch(`${API_URL}/api/group/${id}/copy`, {
        method: 'POST'
      });
      const result = await response.json();

      if (result.success) {
        await fetchGroups();
        alert('Группа скопирована');
      } else {
        throw new Error(result.error || 'Unknown error');
      }
    } catch (error) {
      console.error('Ошибка копирования:', error);
      alert('Не удалось создать копию: ' + error.message);
    }
  };

  const handleMove = async (id, direction) => {
    const currentIndex = groups.findIndex(g => g.id === id);
    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    
    if (newIndex < 0 || newIndex >= groups.length) {
      alert('Невозможно переместить - достигнут край списка');
      return;
    }
    
    const newGroups = [...groups];
    const [removed] = newGroups.splice(currentIndex, 1);
    newGroups.splice(newIndex, 0, removed);

    const updatedGroups = newGroups.map((group, index) => ({
      ...group,
      display_order: index
    }));

    setGroups(updatedGroups);

    try {
      const response = await fetch(`${API_URL}/api/groups/reorder`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderedIds: updatedGroups.map(g => g.id) })
      });
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Reorder failed');
      }
    } catch (error) {
      console.error('Ошибка сохранения порядка:', error);
      await fetchGroups();
      alert('Ошибка сохранения изменений: ' + error.message);
    }
  };

  const renderGroupCard = (group, index, actions) => {
    const totalCount = groups.length;
    
    return (  
      <div key={group.id} className="entity-card">
        <div className="entity-card-header">
          <div className="entity-card-title-section">
            <h3 className="entity-card-title">
              <Link to={`/group/${group.id}`} className="link-text">
                {group.name}
              </Link>
            </h3>
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

        {group.description && (
          <div className="entity-card-description">
            {group.description.length > 200 
              ? `${group.description.substring(0, 200)}...` 
              : group.description}
          </div>
        )}

        <div className="entity-card-badges">
          {group.muscleCount > 0 && (
            <span className="entity-badge badge-primary">
              Мышцы: {group.muscleCount}
            </span>
          )}
          {group.dysfunctionCount > 0 && (
            <span className="entity-badge badge-info">
              Дисфункции: {group.dysfunctionCount}
            </span>
          )}
        </div>

        <div className="entity-move-buttons">
          <div style={{ display: 'flex', gap: '8px', marginLeft: 'auto' }}>
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
    total: groups.length,
    withMuscles: groups.filter(g => g.muscleCount > 0).length,
    withDysfunctions: groups.filter(g => g.dysfunctionCount > 0).length
  };

  const columns = [
    { field: 'name', label: 'Название', searchable: true },
    { field: 'description', label: 'Описание', searchable: true }
  ];

  return (
    <EntityList
      entities={groups}
      entityType="group"
      entityName="Группы мышц"
      onEdit={handleEdit}
      onDelete={handleDelete}
      onAdd={handleAdd}
      onCopy={handleCopy}
      onMove={handleMove}
      stats={stats}
      columns={columns}
      searchPlaceholder="Поиск по названию группы..."
      renderCard={renderGroupCard}
      defaultSort="display_order"
    />
  );
}

export default GroupsPage;