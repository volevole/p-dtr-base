// MusclesPage.js
import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom'; // Добавили Link
import { supabase } from './utils/supabaseClient';
import EntityList from './EntityList';
import { 
  FaEdit, 
  FaTrash,
  FaArrowUp,
  FaArrowDown 
} from 'react-icons/fa'; // Добавили иконки
import { HiDuplicate } from 'react-icons/hi'; // Добавили HiDuplicate


function MusclesPage() {
  const [muscles, setMuscles] = useState([]);
  const [loading, setLoading] = useState(true);
  //const [renderKey, setRenderKey] = useState(0); // ПЕРЕМЕСТИТЬ СЮДА!
  const navigate = useNavigate();

  useEffect(() => {
    fetchMuscles();
  }, []);

  const fetchMuscles = async () => {
    try {
      setLoading(true);      

      // Получаем мышцы со всеми связями
      const { data: muscleList, error: muscleError } = await supabase
        .from('muscles')
        .select('*')
        .order('display_order')  // Проверяем что сортировка по display_order
        .order('name_ru');

      if (muscleError) {
        console.error('Ошибка загрузки мышц:', muscleError);
        throw muscleError;
      }

      // Проверяем есть ли display_order
      if (muscleList && muscleList.length > 0) {
        const firstMuscle = muscleList[0];
        
      }

      // Параллельно загружаем все связанные данные
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

      // Создаем карты для быстрого доступа
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

      // Обогащаем данные мышц
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
      // Получаем максимальный порядок
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

      // Получаем максимальный порядок
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

      // Копируем связи (ваша существующая функция copyMuscleRelations)
      await copyMuscleRelations(id, copied.id);

      navigate(`/muscle/${copied.id}/edit`);
    } catch (error) {
      console.error('Ошибка копирования:', error);
      alert('Не удалось создать копию');
    }
  };

  // Ваша существующая функция
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
		setMuscles(muscles); // Откат
		alert('Ошибка сохранения изменений: ' + error.message);
	  }
	};

  // Кастомная карточка для мышц
  const renderMuscleCard = (muscle, index, actions) => {
    return (
      <div 
        key={muscle.id} 
        style={{ 
          border: '1px solid #dee2e6',
          borderRadius: '8px',
          padding: '15px',
          backgroundColor: 'white',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
          <div style={{ flex: 1 }}>
            <h3 style={{ margin: '0 0 5px 0' }}>
              <Link 
                to={`/muscle/${muscle.id}`}
                style={{ 
                  color: '#007bff',
                  textDecoration: 'none',
                  fontSize: '18px'
                }}
              >
                {muscle.name_ru}
              </Link>
            </h3>
            <div style={{ color: '#6c757d', fontSize: '14px' }}>
              {muscle.name_lat}
            </div>
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

        {/* Детали мышцы */}
        <div style={{ display: 'flex', gap: '20px', marginBottom: '15px' }}>
          <div style={{ flex: 1 }}>
            {muscle.meridians?.length > 0 && (
              <div style={{ marginBottom: '8px' }}>
                <strong style={{ fontSize: '12px', color: '#6c757d' }}>Меридианы:</strong>
                <div style={{ fontSize: '14px' }}>
                  {muscle.meridians.map((name, idx) => (
                    <span key={idx} style={{
                      display: 'inline-block',
                      backgroundColor: '#e3f2fd',
                      padding: '2px 8px',
                      borderRadius: '12px',
                      fontSize: '12px',
                      marginRight: '5px',
                      marginTop: '3px'
                    }}>
                      {name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {muscle.organs?.length > 0 && (
              <div>
                <strong style={{ fontSize: '12px', color: '#6c757d' }}>Органы:</strong>
                <div style={{ fontSize: '14px' }}>
                  {muscle.organs.map((name, idx) => (
                    <span key={idx} style={{
                      display: 'inline-block',
                      backgroundColor: '#f3e5f5',
                      padding: '2px 8px',
                      borderRadius: '12px',
                      fontSize: '12px',
                      marginRight: '5px',
                      marginTop: '3px'
                    }}>
                      {name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div style={{ width: '120px', textAlign: 'right' }}>
            {muscle.dysfunctionsCount > 0 && (
              <div style={{ marginBottom: '10px' }}>
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
              </div>
            )}
          </div>
        </div>

        {/* Кнопки перемещения */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'flex-end', 
          gap: '5px',
          marginTop: '15px',
          borderTop: '1px solid #f0f0f0',
          paddingTop: '10px'
        }}>
          <button 
            onClick={actions.onMoveUp} 
            disabled={index === 0}
            title="Переместить выше"
            style={{
              padding: '4px 8px',
              backgroundColor: index === 0 ? '#f8f9fa' : '#007bff',
              color: index === 0 ? '#6c757d' : 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: index === 0 ? 'not-allowed' : 'pointer',
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <FaArrowUp size={10} />
          </button>
          <button 
            onClick={actions.onMoveDown} 
            disabled={index === muscles.length - 1}
            title="Переместить ниже"
            style={{
              padding: '4px 8px',
              backgroundColor: index === muscles.length - 1 ? '#f8f9fa' : '#007bff',
              color: index === muscles.length - 1 ? '#6c757d' : 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: index === muscles.length - 1 ? 'not-allowed' : 'pointer',
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <FaArrowDown size={10} />
          </button>
        </div>
      </div>
    );
  };

  if (loading) return <div style={{ padding: '2rem' }}>Загрузка...</div>;

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
      //key={`muscles_list_${renderKey}`} // Используем renderKey здесь
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