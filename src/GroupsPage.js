// GroupsPage.js
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
      
      // Получаем группы с подсчетом мышц и дисфункций
      const { data: groupsData, error } = await supabase
        .from('muscle_groups')
        .select(`
          *,
          muscle_group_membership(muscle_id),
          muscle_group_dysfunctions(dysfunction_id)
        `)
        .order('name');

      if (error) throw error;

      // Обрабатываем данные
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
    // Находим группу в массиве по ID
    const groupToDelete = groups.find(g => g.id === id);
    
    if (!groupToDelete) {
      alert('Группа не найдена');
      return;
    }

    // Проверяем наличие связей
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
      const { data, error } = await supabase
        .from('muscle_groups')
        .insert([{
          name: 'Новая группа',
          description: ''
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
      // Явно выбираем только нужные поля
      const { data: original, error: fetchError } = await supabase
        .from('muscle_groups')
        .select('name, description')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;
      if (!original) throw new Error('Группа не найдена');

      const { data: copied, error: insertError } = await supabase
        .from('muscle_groups')
        .insert([{
          ...original,
          name: `${original.name} (копия)`
        }])
        .select()
        .single();

      if (insertError) throw insertError;

      // Обновляем список
      await fetchGroups();
      
    } catch (error) {
      console.error('Ошибка копирования:', error);
      alert('Не удалось создать копию: ' + error.message);
    }
  };

  // Кастомная карточка для групп
  const renderGroupCard = (group, index, actions) => {
    return (  
      <div 
        key={group.id} 
        style={{ 
          border: '1px solid #dee2e6',
          borderRadius: '8px',
          padding: '15px',
          backgroundColor: 'white',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          marginBottom: '10px'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
          <div style={{ flex: 1 }}>
            <h3 style={{ margin: '0 0 5px 0' }}>
              <Link 
                to={`/group/${group.id}`}
                style={{ 
                  color: '#007bff',
                  textDecoration: 'none',
                  fontSize: '18px'
                }}
              >
                {group.name}
              </Link>
            </h3>
          </div>
          
          <div style={{ display: 'flex', gap: '5px' }}>
            <button 
              onClick={actions.onCopy} 
              title="Копировать" 
              style={{
                padding: '4px 8px',
                backgroundColor: '#f8f9fa',
                border: '1px solid #dee2e6',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              <HiDuplicate size={14} />
            </button>
            <button 
              onClick={actions.onEdit} 
              title="Редактировать" 
              style={{
                padding: '4px 8px',
                backgroundColor: '#f8f9fa',
                border: '1px solid #dee2e6',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              <FaEdit size={14} />
            </button>
            <button 
              onClick={actions.onDelete} 
              title="Удалить" 
              style={{
                padding: '4px 8px',
                backgroundColor: '#f8f9fa',
                border: '1px solid #dee2e6',
                borderRadius: '4px',
                cursor: 'pointer',
                color: '#dc3545'
              }}
            >
              <FaTrash size={14} />
            </button>
          </div>
        </div>

        {/* Описание */}
        {group.description && (
          <div style={{ 
            fontSize: '14px', 
            color: '#495057',
            marginBottom: '15px',
            lineHeight: '1.4'
          }}>
            {group.description.length > 200 
              ? `${group.description.substring(0, 200)}...` 
              : group.description}
          </div>
        )}

        {/* Статистика */}
        <div style={{ 
          display: 'flex', 
          gap: '15px',
          marginBottom: '15px'
        }}>
          {group.muscleCount > 0 && (
            <div style={{ 
              display: 'inline-block',
              backgroundColor: '#e3f2fd',
              color: '#0d6efd',
              padding: '4px 10px',
              borderRadius: '12px',
              fontSize: '12px',
              fontWeight: 'bold'
            }}>
              Мышцы: {group.muscleCount}
            </div>
          )}
          {group.dysfunctionCount > 0 && (
            <div style={{ 
              display: 'inline-block',
              backgroundColor: '#d1ecf1',
              color: '#0c5460',
              padding: '4px 10px',
              borderRadius: '12px',
              fontSize: '12px',
              fontWeight: 'bold'
            }}>
              Дисфункции: {group.dysfunctionCount}
            </div>
          )}
        </div>

        {/* Кнопки действий */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          borderTop: '1px solid #f0f0f0',
          paddingTop: '10px'
        }}>
          <div style={{ display: 'flex', gap: '10px' }}>
            {group.muscleCount > 0 && (
              <Link 
                to={`/group/${group.id}`}
                style={{
                  display: 'inline-block',
                  backgroundColor: '#28a745',
                  color: 'white',
                  padding: '4px 12px',
                  borderRadius: '4px',
                  textDecoration: 'none',
                  fontSize: '12px',
                  fontWeight: 'bold'
                }}
              >
                Просмотр мышц
              </Link>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (loading) return <div style={{ padding: '2rem' }}>Загрузка...</div>;

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
      stats={stats}
      columns={columns}
      searchPlaceholder="Поиск по названию группы..."
      renderCard={renderGroupCard}
    />
  );
}

export default GroupsPage;