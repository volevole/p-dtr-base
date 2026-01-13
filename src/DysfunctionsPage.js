// DysfunctionsPage.js
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

function DysfunctionsPage() {
  const [dysfunctions, setDysfunctions] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchDysfunctions();
  }, []);

	const fetchDysfunctions = async () => {
	  try {
		setLoading(true);
		
		// Получаем дисфункции со ВСЕМИ связями
		const { data: dysfunctionsData, error } = await supabase
		  .from('dysfunctions')
		  .select(`
			*,
			muscle_dysfunctions(muscle_id),
			muscle_group_dysfunctions(group_id),
			synergists_dysfunction(relationship_id)
		  `)
		  .order('display_order')
		  .order('name');

		if (error) throw error;

		// Обрабатываем данные - считаем ВСЕ связи
		const processedDysfunctions = dysfunctionsData.map(dysfunction => {
		  const directMuscleCount = dysfunction.muscle_dysfunctions?.length || 0;
		  const groupCount = dysfunction.muscle_group_dysfunctions?.length || 0;
		  const relationshipCount = dysfunction.synergists_dysfunction?.length || 0;
		  
		  // Общее количество связей (любого типа)
		  const totalRelatedCount = directMuscleCount + groupCount + relationshipCount;
		  
		  return {
			...dysfunction,
			relatedCount: totalRelatedCount,
			directMuscleCount: directMuscleCount,
			groupCount: groupCount,
			relationshipCount: relationshipCount
		  };
		});

		setDysfunctions(processedDysfunctions);
	  } catch (error) {
		console.error('Ошибка загрузки дисфункций:', error);
	  } finally {
		setLoading(false);
	  }
	};

  const handleEdit = (id) => {
    navigate(`/dysfunction/${id}/edit`);
  };

  const handleDelete = async (id) => {
    // Находим дисфункцию в массиве по ID
    const dysfunctionToDelete = dysfunctions.find(d => d.id === id);
    
    if (!dysfunctionToDelete) {
      alert('Дисфункция не найдена');
      return;
    }

    // Используем имя дисфункции в confirm
    if (!window.confirm(`Удалить дисфункцию "${dysfunctionToDelete.name}"?`)) return;

    try {
      const { error } = await supabase
        .from('dysfunctions')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setDysfunctions(prev => prev.filter(d => d.id !== id));
    } catch (error) {
      console.error('Ошибка удаления:', error);
      alert('Ошибка при удалении: ' + error.message);
    }
  };

  const handleAdd = async () => {
    try {
      // Получаем максимальный порядок
      const { data: maxOrderData } = await supabase
        .from('dysfunctions')
        .select('display_order')
        .order('display_order', { ascending: false })
        .limit(1);

      const maxOrder = maxOrderData?.[0]?.display_order || 0;

      const { data, error } = await supabase
        .from('dysfunctions')
        .insert([{
          name: 'Новая дисфункция',
          display_order: maxOrder + 1
        }])
        .select()
        .single();

      if (error) throw error;

      navigate(`/dysfunction/${data.id}/edit`);
    } catch (error) {
      console.error('Ошибка создания:', error);
      alert('Ошибка при создании: ' + error.message);
    }
  };

  const handleCopy = async (id) => {
    try {
      // Явно выбираем только нужные поля
      const { data: original, error: fetchError } = await supabase
        .from('dysfunctions')
        .select('name, description, visual_diagnosis, provocations_text, main_algorithm, receptor_1, receptor_2')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;
      if (!original) throw new Error('Дисфункция не найдена');

      // Получаем максимальный порядок
      const { data: maxOrderData, error: orderError } = await supabase
        .from('dysfunctions')
        .select('display_order')
        .order('display_order', { ascending: false })
        .limit(1);

      if (orderError) throw orderError;
      const maxOrder = maxOrderData?.[0]?.display_order || 0;

      const { data: copied, error: insertError } = await supabase
        .from('dysfunctions')
        .insert([{
          ...original,
          name: `${original.name} (копия)`,
          display_order: maxOrder + 1
        }])
        .select()
        .single();

      if (insertError) throw insertError;

      // Обновляем список
      await fetchDysfunctions();
      
    } catch (error) {
      console.error('Ошибка копирования:', error);
      alert('Не удалось создать копию: ' + error.message);
    }
  };

  const handleMove = async (id, direction) => {
    const currentIndex = dysfunctions.findIndex(d => d.id === id);
    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    
    if (newIndex < 0 || newIndex >= dysfunctions.length) {
      alert('Невозможно переместить - достигнут край списка');
      return;
    }
    
    const newDysfunctions = [...dysfunctions];
    const [removed] = newDysfunctions.splice(currentIndex, 1);
    newDysfunctions.splice(newIndex, 0, removed);

    const updatedDysfunctions = newDysfunctions.map((dysfunction, index) => ({
      ...dysfunction,
      display_order: index
    }));

    setDysfunctions(updatedDysfunctions);

    try {
      const updatePromises = updatedDysfunctions.map(dysfunction =>
        supabase
          .from('dysfunctions')
          .update({ display_order: dysfunction.display_order })
          .eq('id', dysfunction.id)
      );
      await Promise.all(updatePromises);
    } catch (error) {
      console.error('Ошибка сохранения в БД:', error);
      setDysfunctions(dysfunctions); // Откат
      alert('Ошибка сохранения изменений: ' + error.message);
    }
  };

  // Кастомная карточка для дисфункций
  const renderDysfunctionCard = (dysfunction, index, actions) => {
    const totalCount = dysfunctions.length;
    
    return (  
      <div 
        key={dysfunction.id} 
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
                to={`/dysfunction/${dysfunction.id}`}
                style={{ 
                  color: '#007bff',
                  textDecoration: 'none',
                  fontSize: '18px'
                }}
              >
                {dysfunction.name}
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

        {/* Секция описания */}
        {dysfunction.description && (
          <div style={{ 
            fontSize: '14px', 
            color: '#495057',
            marginBottom: '10px',
            lineHeight: '1.4'
          }}>
            <strong style={{ color: '#212529' }}>Описание:</strong> {dysfunction.description.length > 150 
              ? `${dysfunction.description.substring(0, 150)}...` 
              : dysfunction.description}
          </div>
        )}

        {/* Визуальная диагностика */}
        {dysfunction.visual_diagnosis && (
          <div style={{ 
            fontSize: '14px', 
            color: '#6c757d',
            marginBottom: '10px',
            lineHeight: '1.4',
            fontStyle: 'italic'
          }}>
            <strong style={{ color: '#495057' }}>Визуальная диагностика:</strong> {dysfunction.visual_diagnosis.length > 150 
              ? `${dysfunction.visual_diagnosis.substring(0, 150)}...` 
              : dysfunction.visual_diagnosis}
          </div>
        )}

        {/* Рецепторы (компактно) */}
        {(dysfunction.receptor_1 || dysfunction.receptor_2) && (
          <div style={{ 
            display: 'flex', 
            gap: '10px', 
            marginBottom: '10px',
            flexWrap: 'wrap'
          }}>
            {dysfunction.receptor_1 && (
              <div style={{ 
                display: 'inline-block',
                backgroundColor: '#e3f2fd',
                color: '#0d6efd',
                padding: '2px 8px',
                borderRadius: '12px',
                fontSize: '12px'
              }}>
                <strong>R1:</strong> {dysfunction.receptor_1}
              </div>
            )}
            {dysfunction.receptor_2 && (
              <div style={{ 
                display: 'inline-block',
                backgroundColor: '#d1ecf1',
                color: '#0c5460',
                padding: '2px 8px',
                borderRadius: '12px',
                fontSize: '12px'
              }}>
                <strong>R2:</strong> {dysfunction.receptor_2}
              </div>
            )}
          </div>
        )}

        {dysfunction.relatedCount > 0 && (
		  <div style={{ marginBottom: '10px' }}>
			<Link 
			  to={`/dysfunction/${dysfunction.id}`}
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
			  Связей: {dysfunction.relatedCount}
			</Link>
			{(dysfunction.groupCount > 0 || dysfunction.relationshipCount > 0) && (
			  <div style={{ 
				fontSize: '11px', 
				color: '#6c757d', 
				marginTop: '3px',
				display: 'flex',
				gap: '10px'
			  }}>
				{dysfunction.directMuscleCount > 0 && (
				  <span>Мышцы: {dysfunction.directMuscleCount}</span>
				)}
				{dysfunction.groupCount > 0 && (
				  <span>Группы: {dysfunction.groupCount}</span>
				)}
				{dysfunction.relationshipCount > 0 && (
				  <span>Взаимоотношения: {dysfunction.relationshipCount}</span>
				)}
			  </div>
			)}
		  </div>
		)}

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
            disabled={index === totalCount - 1}
            title="Переместить ниже"
            style={{
              padding: '4px 8px',
              backgroundColor: index === totalCount - 1 ? '#f8f9fa' : '#007bff',
              color: index === totalCount - 1 ? '#6c757d' : 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: index === totalCount - 1 ? 'not-allowed' : 'pointer',
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
    total: dysfunctions.length,
    withRelations: dysfunctions.filter(d => d.relatedCount > 0).length
  };

  const columns = [
    { field: 'name', label: 'Название', searchable: true },
    { field: 'description', label: 'Описание', searchable: true }
  ];

  return (
    <EntityList
      entities={dysfunctions}
      entityType="dysfunction"
      entityName="Дисфункции"
      onEdit={handleEdit}
      onDelete={handleDelete}
      onAdd={handleAdd}
      onCopy={handleCopy}
      onMove={handleMove}
      stats={stats}
      columns={columns}
      searchPlaceholder="Поиск по названию дисфункции..."
      renderCard={renderDysfunctionCard}
    />
  );
}

export default DysfunctionsPage;