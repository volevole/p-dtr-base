// GroupsPage.js - с использованием универсальных классов
import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from './utils/supabaseClient';
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
      
      const { data: groupsData, error } = await supabase
        .from('muscle_groups')
        .select(`
          *,
          muscle_group_membership(muscle_id),
          muscle_group_dysfunctions(dysfunction_id)
        `)
        .order('display_order', { ascending: true, nullsFirst: false })
        .order('name');

      if (error) throw error;

      const processedGroups = groupsData.map(group => ({
        ...group,
        muscleCount: group.muscle_group_membership?.length || 0,
        dysfunctionCount: group.muscle_group_dysfunctions?.length || 0
      }));

      setGroups(processedGroups);
    } catch (error) {
      console.error('Ошибка загрузки групп:', error);
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

    if (groupToDelete.muscleCount > 0) {
      if (!window.confirm(`Группа "${groupToDelete.name}" содержит ${groupToDelete.muscleCount} мышц. Удалить вместе с ними?`)) return;
    } else {
      if (!window.confirm(`Удалить группу "${groupToDelete.name}"?`)) return;
    }

    try {
      const { error } = await supabase
        .from('muscle_groups')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setGroups(prev => prev.filter(g => g.id !== id));
    } catch (error) {
      console.error('Ошибка удаления:', error);
      alert('Ошибка при удалении: ' + error.message);
    }
  };

  const handleAdd = async () => {
    try {
      // Получаем максимальный порядок
      const { data: maxOrderData } = await supabase
        .from('muscle_groups')
        .select('display_order')
        .order('display_order', { ascending: false })
        .limit(1);

      const maxOrder = maxOrderData?.[0]?.display_order || 0;

      const { data, error } = await supabase
        .from('muscle_groups')
        .insert([{
          name: 'Новая группа',
          description: '',
          display_order: maxOrder + 1
        }])
        .select()
        .single();

      if (error) throw error;

      navigate(`/group/${data.id}/edit`);
    } catch (error) {
      console.error('Ошибка создания:', error);
      alert('Ошибка при создании: ' + error.message);
    }
  };

  const handleCopy = async (id) => {
    try {
      const { data: original, error: fetchError } = await supabase
        .from('muscle_groups')
        .select('name, description, display_order')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;
      if (!original) throw new Error('Группа не найдена');

      // Получаем максимальный порядок
      const { data: maxOrderData } = await supabase
        .from('muscle_groups')
        .select('display_order')
        .order('display_order', { ascending: false })
        .limit(1);

      const maxOrder = maxOrderData?.[0]?.display_order || 0;

      const { data: copied, error: insertError } = await supabase
        .from('muscle_groups')
        .insert([{
          name: `${original.name} (копия)`,
          description: original.description,
          display_order: maxOrder + 1
        }])
        .select()
        .single();

      if (insertError) throw insertError;

      await fetchGroups();
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
      const updatePromises = updatedGroups.map(group =>
        supabase
          .from('muscle_groups')
          .update({ display_order: group.display_order })
          .eq('id', group.id)
      );
      await Promise.all(updatePromises);
    } catch (error) {
      console.error('Ошибка сохранения в БД:', error);
      setGroups(groups);
      alert('Ошибка сохранения изменений: ' + error.message);
    }
  };

// Кастомная карточка для групп с универсальными классами (без дублирующей кнопки)
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

      {/* Описание */}
      {group.description && (
        <div className="entity-card-description">
          {group.description.length > 200 
            ? `${group.description.substring(0, 200)}...` 
            : group.description}
        </div>
      )}

      {/* Статистика в виде бейджей */}
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

      {/* Кнопки перемещения */}
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