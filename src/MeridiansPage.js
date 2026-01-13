// MeridiansPage.js
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

function MeridiansPage() {
  const [meridians, setMeridians] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchMeridians();
  }, []);

  const fetchMeridians = async () => {
    try {
      setLoading(true);
      
      // Получаем меридианы с подсчетом связей с мышцами
      const { data: meridiansData, error } = await supabase
        .from('meridians')
        .select(`
          *,
          muscle_meridians(muscle_id)
        `)
        .order('display_order')
        .order('name');

      if (error) throw error;

      // Обрабатываем данные
      const processedMeridians = meridiansData.map(meridian => ({
        ...meridian,
        relatedCount: meridian.muscle_meridians?.length || 0
      }));

      setMeridians(processedMeridians);
    } catch (error) {
      console.error('Ошибка загрузки меридианов:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (id) => {
    navigate(`/meridian/${id}/edit`);
  };

  const handleDelete = async (id) => {
    // Находим меридиан в массиве по ID
    const meridianToDelete = meridians.find(m => m.id === id);
    
    if (!meridianToDelete) {
      alert('Меридиан не найден');
      return;
    }

    // Используем имя меридиана в confirm
    if (!window.confirm(`Удалить меридиан "${meridianToDelete.name}"?`)) return;

    try {
      const { error } = await supabase
        .from('meridians')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setMeridians(prev => prev.filter(m => m.id !== id));
    } catch (error) {
      console.error('Ошибка удаления:', error);
      alert('Ошибка при удалении: ' + error.message);
    }
  };

  const handleAdd = async () => {
    try {
      // Получаем максимальный порядок
      const { data: maxOrderData } = await supabase
        .from('meridians')
        .select('display_order')
        .order('display_order', { ascending: false })
        .limit(1);

      const maxOrder = maxOrderData?.[0]?.display_order || 0;

      const { data, error } = await supabase
        .from('meridians')
        .insert([{
          name: 'Новый меридиан',
          code: 'NEW',
          display_order: maxOrder + 1
        }])
        .select()
        .single();

      if (error) throw error;

      navigate(`/meridian/${data.id}/edit`);
    } catch (error) {
      console.error('Ошибка создания:', error);
      alert('Ошибка при создании: ' + error.message);
    }
  };

  const handleCopy = async (id) => {
    try {
      // Явно выбираем только нужные поля
      const { data: original, error: fetchError } = await supabase
        .from('meridians')
        .select('name, code, description, name_lat, type, course, functions, symptoms, notes')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;
      if (!original) throw new Error('Меридиан не найден');

      // Получаем максимальный порядок
      const { data: maxOrderData, error: orderError } = await supabase
        .from('meridians')
        .select('display_order')
        .order('display_order', { ascending: false })
        .limit(1);

      if (orderError) throw orderError;
      const maxOrder = maxOrderData?.[0]?.display_order || 0;

      const { data: copied, error: insertError } = await supabase
        .from('meridians')
        .insert([{
          ...original,
          name: `${original.name} (копия)`,
          code: original.code ? `${original.code}_COPY` : 'COPY',
          display_order: maxOrder + 1
        }])
        .select()
        .single();

      if (insertError) throw insertError;

      // Обновляем список
      await fetchMeridians();
      
    } catch (error) {
      console.error('Ошибка копирования:', error);
      alert('Не удалось создать копию: ' + error.message);
    }
  };

  const handleMove = async (id, direction) => {
    const currentIndex = meridians.findIndex(m => m.id === id);
    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    
    if (newIndex < 0 || newIndex >= meridians.length) {
      alert('Невозможно переместить - достигнут край списка');
      return;
    }
    
    const newMeridians = [...meridians];
    const [removed] = newMeridians.splice(currentIndex, 1);
    newMeridians.splice(newIndex, 0, removed);

    const updatedMeridians = newMeridians.map((meridian, index) => ({
      ...meridian,
      display_order: index
    }));

    setMeridians(updatedMeridians);

    try {
      const updatePromises = updatedMeridians.map(meridian =>
        supabase
          .from('meridians')
          .update({ display_order: meridian.display_order })
          .eq('id', meridian.id)
      );
      await Promise.all(updatePromises);
    } catch (error) {
      console.error('Ошибка сохранения в БД:', error);
      setMeridians(meridians); // Откат
      alert('Ошибка сохранения изменений: ' + error.message);
    }
  };

  // Кастомная карточка для меридианов
  const renderMeridianCard = (meridian, index, actions) => {
    const totalCount = meridians.length;
    
    return (  
      <div 
        key={meridian.id} 
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
                to={`/meridian/${meridian.id}`}
                style={{ 
                  color: '#007bff',
                  textDecoration: 'none',
                  fontSize: '18px'
                }}
              >
                {meridian.name}
              </Link>
            </h3>
            <div style={{ color: '#6c757d', fontSize: '14px' }}>
              {meridian.name_lat}
            </div>
            <div style={{ display: 'flex', gap: '10px', marginTop: '5px', flexWrap: 'wrap' }}>
              {meridian.code && (
                <div style={{ 
                  display: 'inline-block',
                  backgroundColor: '#e3f2fd',
                  color: '#0d6efd',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  fontSize: '12px',
                  fontWeight: 'bold'
                }}>
                  Код: {meridian.code}
                </div>
              )}
              {meridian.type && (
                <div style={{ 
                  display: 'inline-block',
                  backgroundColor: '#d1ecf1',
                  color: '#0c5460',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  fontSize: '12px'
                }}>
                  {meridian.type}
                </div>
              )}
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

        {/* Секция примечаний */}
        {meridian.notes && (
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
            <strong style={{ color: '#495057' }}>Примечание:</strong> {meridian.notes.length > 200 
              ? `${meridian.notes.substring(0, 200)}...` 
              : meridian.notes}
          </div>
        )}

        {/* Краткое описание курса меридиана */}
        {meridian.course && (
          <div style={{ 
            fontSize: '14px', 
            color: '#495057',
            marginBottom: '10px',
            lineHeight: '1.4'
          }}>
            <strong style={{ color: '#212529' }}>Курс:</strong> {meridian.course.length > 150 
              ? `${meridian.course.substring(0, 150)}...` 
              : meridian.course}
          </div>
        )}

        {/* Функции */}
        {meridian.functions && (
          <div style={{ 
            fontSize: '14px', 
            color: '#495057',
            marginBottom: '10px',
            lineHeight: '1.4'
          }}>
            <strong style={{ color: '#212529' }}>Функции:</strong> {meridian.functions.length > 150 
              ? `${meridian.functions.substring(0, 150)}...` 
              : meridian.functions}
          </div>
        )}

        {meridian.relatedCount > 0 && (
          <div style={{ marginBottom: '10px' }}>
            <Link 
              to={`/meridian/${meridian.id}/muscles`}
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
              Связанных мышц: {meridian.relatedCount}
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
    total: meridians.length,
    withRelations: meridians.filter(m => m.relatedCount > 0).length
  };

  const columns = [
    { field: 'name', label: 'Название', searchable: true },
    { field: 'name_lat', label: 'Латинское название', searchable: true },
    { field: 'code', label: 'Код', searchable: true },
    { field: 'type', label: 'Тип', searchable: true }
  ];

  return (
    <EntityList
      entities={meridians}
      entityType="meridian"
      entityName="Меридианы"
      onEdit={handleEdit}
      onDelete={handleDelete}
      onAdd={handleAdd}
      onCopy={handleCopy}
      onMove={handleMove}
      stats={stats}
      columns={columns}
      searchPlaceholder="Поиск по названию меридиана..."
      renderCard={renderMeridianCard}
    />
  );
}

export default MeridiansPage;