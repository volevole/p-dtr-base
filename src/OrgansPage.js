// OrgansPage.js
import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom'; // Добавим Link для ссылок
import { supabase } from './utils/supabaseClient';
import EntityList from './EntityList';
import { 
  FaEdit, 
  FaTrash,
  FaArrowUp,
  FaArrowDown 
} from 'react-icons/fa';
import { HiDuplicate } from 'react-icons/hi';

function OrgansPage() {
  const [organs, setOrgans] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchOrgans();
  }, []);

  const fetchOrgans = async () => {
    try {
      setLoading(true);
      
      // Получаем органы с подсчетом связей с мышцами
      const { data: organsData, error } = await supabase
        .from('organs')
        .select(`
          *,
          muscle_organs(muscle_id)
        `)
        .order('display_order')
        .order('name');

      if (error) throw error;

      // Обрабатываем данные
      const processedOrgans = organsData.map(organ => ({
        ...organ,
        relatedCount: organ.muscle_organs?.length || 0
      }));

      setOrgans(processedOrgans);
    } catch (error) {
      console.error('Ошибка загрузки органов:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (id) => {
    navigate(`/organ/${id}/edit`);
  };

  const handleDelete = async (id) => {
     // Находим орган в массиве по ID
  const organToDelete = organs.find(o => o.id === id);
  
  if (!organToDelete) {
    alert('Орган не найден');
    return;
  }

  // Используем имя органа в confirm
  if (!window.confirm(`Удалить орган "${organToDelete.name}"?`)) return;

    try {
      const { error } = await supabase
        .from('organs')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setOrgans(prev => prev.filter(o => o.id !== id));
    } catch (error) {
      console.error('Ошибка удаления:', error);
      alert('Ошибка при удалении: ' + error.message);
    }
  };

  const handleAdd = async () => {
    try {
      // Получаем максимальный порядок
      const { data: maxOrderData } = await supabase
        .from('organs')
        .select('display_order')
        .order('display_order', { ascending: false })
        .limit(1);

      const maxOrder = maxOrderData?.[0]?.display_order || 0;

      const { data, error } = await supabase
        .from('organs')
        .insert([{
          name: 'Новый орган',
          display_order: maxOrder + 1
        }])
        .select()
        .single();

      if (error) throw error;

      navigate(`/organ/${data.id}/edit`);
    } catch (error) {
      console.error('Ошибка создания:', error);
      alert('Ошибка при создании: ' + error.message);
    }
  };

	const handleCopy = async (id) => {
	  try {
		// Явно выбираем только нужные поля
		const { data: original, error: fetchError } = await supabase
		  .from('organs')
		  .select('name, name_lat, system, description, functions, symptoms, diagnostic, treatment, notes')
		  .eq('id', id)
		  .single();

		if (fetchError) throw fetchError;
		if (!original) throw new Error('Орган не найден');

		// Получаем максимальный порядок
		const { data: maxOrderData, error: orderError } = await supabase
		  .from('organs')
		  .select('display_order')
		  .order('display_order', { ascending: false })
		  .limit(1);

		if (orderError) throw orderError;
		const maxOrder = maxOrderData?.[0]?.display_order || 0;

		const { data: copied, error: insertError } = await supabase
		  .from('organs')
		  .insert([{
			...original,
			name: `${original.name} (копия)`,
			display_order: maxOrder + 1
		  }])
		  .select()
		  .single();

		if (insertError) throw insertError;

		// Обновляем список
		await fetchOrgans();
		
	  } catch (error) {
		console.error('Ошибка копирования:', error);
		alert('Не удалось создать копию: ' + error.message);
	  }
	};

  const handleMove = async (id, direction) => {
    const currentIndex = organs.findIndex(o => o.id === id);
    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    
    if (newIndex < 0 || newIndex >= organs.length) {
      alert('Невозможно переместить - достигнут край списка');
      return;
    }
    
    const newOrgans = [...organs];
    const [removed] = newOrgans.splice(currentIndex, 1);
    newOrgans.splice(newIndex, 0, removed);

    const updatedOrgans = newOrgans.map((organ, index) => ({
      ...organ,
      display_order: index
    }));

    setOrgans(updatedOrgans);

    try {
      const updatePromises = updatedOrgans.map(organ =>
        supabase
          .from('organs')
          .update({ display_order: organ.display_order })
          .eq('id', organ.id)
      );
      await Promise.all(updatePromises);
    } catch (error) {
      console.error('Ошибка сохранения в БД:', error);
      setOrgans(organs); // Откат
      alert('Ошибка сохранения изменений: ' + error.message);
    }
  };

  // Кастомная карточка для органов
  const renderOrganCard = (organ, index, actions) => {
    const totalCount = organs.length ;
	return (	
      <div 
        key={organ.id} 
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
                to={`/organ/${organ.id}`}
                style={{ 
                  color: '#007bff',
                  textDecoration: 'none',
                  fontSize: '18px'
                }}
              >
                {organ.name}
              </Link>
            </h3>
            <div style={{ color: '#6c757d', fontSize: '14px' }}>
              {organ.name_lat}
            </div>
            {organ.system && (
              <div style={{ 
                display: 'inline-block',
                backgroundColor: '#e9ecef',
                padding: '2px 8px',
                borderRadius: '12px',
                fontSize: '12px',
                marginTop: '5px'
              }}>
                {organ.system}
              </div>
            )}
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

	 {/* === ДОБАВЛЕНА СЕКЦИЯ ПРИМЕЧАНИЙ === */}
		  {organ.notes && (
			<div style={{ 
			  fontSize: '14px', 
			  color: '#6c757d',
			  marginBottom: '10px',
			  lineHeight: '1.4',
			  fontStyle: 'italic',
			  backgroundColor: '#f8f9fa',
			  padding: '8px',
			  borderRadius: '4px',
			  borderLeft: '3px solid #6c757d'
			}}>
			  <strong style={{ color: '#495057' }}>Примечание:</strong> {organ.notes.length > 200 
				? `${organ.notes.substring(0, 200)}...` 
				: organ.notes}
			</div>
		  )}

        {organ.description && (
          <div style={{ 
            fontSize: '14px', 
            color: '#495057',
            marginBottom: '10px',
            lineHeight: '1.4'
          }}>
            {organ.description.length > 150 
              ? `${organ.description.substring(0, 150)}...` 
              : organ.description}
          </div>
        )}

        {organ.relatedCount > 0 && (
          <div style={{ marginBottom: '10px' }}>
            <Link 
              to={`/organ/${organ.id}/muscles`}
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
              Связанных мышц: {organ.relatedCount}
            </Link>
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
    total: organs.length,
    withRelations: organs.filter(o => o.relatedCount > 0).length
  };

  // УБРАТЬ поле 'code' из columns - его нет в таблице
  const columns = [
    { field: 'name', label: 'Название', searchable: true },
    { field: 'name_lat', label: 'Латинское название', searchable: true },
    // { field: 'code', label: 'Код', searchable: true }, // УБРАТЬ - нет такого поля
    { field: 'system', label: 'Система', searchable: true }
  ];

  return (
    <EntityList
      entities={organs}
      entityType="organ"
      entityName="Органы"
      onEdit={handleEdit}
      onDelete={handleDelete}
      onAdd={handleAdd}
      onCopy={handleCopy}
      onMove={handleMove}
      stats={stats}
      columns={columns}
      searchPlaceholder="Поиск по названию органа..."
      renderCard={renderOrganCard}
    />
  );
}

export default OrgansPage;