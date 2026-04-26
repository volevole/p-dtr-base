// MusclesPage.js - с использованием универсальных классов
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

function MusclesPage() {
  const [muscles, setMuscles] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchMuscles();
  }, []);

  const fetchMuscles = async () => {
    try {
      setLoading(true);      

      const { data: muscleList, error: muscleError } = await supabase
        .from('muscles')
        .select('*')
        .order('display_order')
        .order('name_ru');

      if (muscleError) {
        console.error('Ошибка загрузки мышц:', muscleError);
        throw muscleError;
      }

      const [
        { data: merLinks },
        { data: orgLinks },
        { data: dysfunctionsData },
        { data: groupMemberships },
        { data: groupDysfunctions }
      ] = await Promise.all([
        supabase.from('muscle_meridians').select('muscle_id, meridians(name)'),
        supabase.from('muscle_organs').select('muscle_id, organs(name)'),
        supabase.from('muscle_dysfunctions').select('muscle_id, dysfunctions(id)'),
        supabase.from('muscle_group_membership').select('muscle_id, muscle_groups(id)'),
        supabase.from('muscle_group_dysfunctions').select('group_id, dysfunctions(id)')
      ]);

      const muscleDysfunctionsMap = {};
      dysfunctionsData?.forEach(item => {
        muscleDysfunctionsMap[item.muscle_id] = (muscleDysfunctionsMap[item.muscle_id] || 0) + 1;
      });

      const groupDysfunctionsMap = {};
      groupDysfunctions?.forEach(item => {
        groupDysfunctionsMap[item.group_id] = (groupDysfunctionsMap[item.group_id] || 0) + 1;
      });

      const muscleGroupsMap = {};
      groupMemberships?.forEach(item => {
        if (!muscleGroupsMap[item.muscle_id]) {
          muscleGroupsMap[item.muscle_id] = [];
        }
        muscleGroupsMap[item.muscle_id].push(item.muscle_groups.id);
      });

      const enriched = muscleList.map((m) => {
        const groupDysfunctionsCount = (muscleGroupsMap[m.id] || []).reduce((sum, groupId) => {
          return sum + (groupDysfunctionsMap[groupId] || 0);
        }, 0);

        return {
          ...m,
          meridians: merLinks?.filter(l => l.muscle_id === m.id).map(l => l.meridians?.name),
          organs: orgLinks?.filter(l => l.muscle_id === m.id).map(l => l.organs?.name),
          dysfunctionsCount: (muscleDysfunctionsMap[m.id] || 0) + groupDysfunctionsCount,
          relatedCount: (
            (merLinks?.filter(l => l.muscle_id === m.id).length || 0) +
            (orgLinks?.filter(l => l.muscle_id === m.id).length || 0) +
            ((muscleDysfunctionsMap[m.id] || 0) + groupDysfunctionsCount)
          )
        };
      });

      setMuscles(enriched);
    } catch (error) {
      console.error('Ошибка загрузки мышц:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (id) => {
    navigate(`/muscle/${id}/edit`);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Удалить мышцу?')) return;

    try {
      const { error } = await supabase
        .from('muscles')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setMuscles(prev => prev.filter(m => m.id !== id));
    } catch (error) {
      console.error('Ошибка удаления:', error);
      alert('Ошибка при удалении: ' + error.message);
    }
  };

  const handleAdd = async () => {
    try {
      const { data: maxOrderData } = await supabase
        .from('muscles')
        .select('display_order')
        .order('display_order', { ascending: false })
        .limit(1);

      const maxOrder = maxOrderData?.[0]?.display_order || 0;

      const { data, error } = await supabase
        .from('muscles')
        .insert([{
          name_ru: 'Новая мышца',
          display_order: maxOrder + 1
        }])
        .select()
        .single();

      if (error) throw error;

      navigate(`/muscle/${data.id}/edit`);
    } catch (error) {
      console.error('Ошибка создания:', error);
      alert('Ошибка при создании: ' + error.message);
    }
  };

  const handleCopy = async (id) => {
    try {
      const { data: original } = await supabase
        .from('muscles')
        .select('*')
        .eq('id', id)
        .single();

      const { id: originalId, created_at, ...copyData } = original;

      const { data: maxOrderData } = await supabase
        .from('muscles')
        .select('display_order')
        .order('display_order', { ascending: false })
        .limit(1);

      const maxOrder = maxOrderData?.[0]?.display_order || 0;

      const { data: copied, error } = await supabase
        .from('muscles')
        .insert([{
          ...copyData,
          name_ru: `${copyData.name_ru} (копия)`,
          display_order: maxOrder + 1
        }])
        .select()
        .single();

      if (error) throw error;

      await copyMuscleRelations(id, copied.id);

      navigate(`/muscle/${copied.id}/edit`);
    } catch (error) {
      console.error('Ошибка копирования:', error);
      alert('Не удалось создать копию');
    }
  };

  const copyMuscleRelations = async (sourceId, targetId) => {
    const relations = [
      'muscle_group_membership',
      'muscle_dysfunctions',
      'muscle_meridians',
      'muscle_organs',
      'muscle_nerves',
      'muscle_vertebrae',
      'muscle_functions'
    ];

    for (const table of relations) {
      const { data: links } = await supabase
        .from(table)
        .select('*')
        .eq('muscle_id', sourceId);

      if (links?.length > 0) {
        const newLinks = links.map(link => ({
          ...link,
          muscle_id: targetId
        }));
        
        await supabase.from(table).insert(newLinks);
      }
    }
  };

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
      const updatePromises = updatedMuscles.map(muscle =>
        supabase
          .from('muscles')
          .update({ display_order: muscle.display_order })
          .eq('id', muscle.id)
      );
      await Promise.all(updatePromises);
    } catch (error) {
      console.error('Ошибка сохранения в БД:', error);
      setMuscles(muscles);
      alert('Ошибка сохранения изменений: ' + error.message);
    }
  };

  // Кастомная карточка для мышц с универсальными классами
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