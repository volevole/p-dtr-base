// ReceptorClassList.js
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom'; // Добавляем useNavigate
import { supabase } from './utils/supabaseClient';
import { 
  FaEdit, 
  FaTrash,
  FaArrowUp,
  FaArrowDown 
} from 'react-icons/fa';
import { HiDuplicate } from 'react-icons/hi';
import EntityList from './EntityList';

function ReceptorClassList() {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate(); // Для навигации

  useEffect(() => {
    fetchClasses();
  }, []);

  const fetchClasses = async () => {
    try {
      const { data, error } = await supabase
        .from('receptor_classes')
        .select(`
          *,
          receptors(count)
        `)
        .eq('is_active', true)
        .order('display_order');

      if (error) throw error;
      
      // Обрабатываем данные для отображения количества рецепторов
      const processedClasses = data.map(cls => ({
        ...cls,
        receptorCount: cls.receptors?.[0]?.count || 0
      }));
      
      setClasses(processedClasses || []);
    } catch (error) {
      console.error('Error loading receptor classes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (id) => {
    navigate(`/receptor-class/${id}/edit`);
  };

  const handleDelete = async (id) => {
    const classToDelete = classes.find(c => c.id === id);
    if (!classToDelete) {
      alert('Класс рецепторов не найден');
      return;
    }

    if (!window.confirm(`Удалить класс "${classToDelete.name}"?`)) return;

    try {
      const { error } = await supabase
        .from('receptor_classes')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setClasses(prev => prev.filter(c => c.id !== id));
    } catch (error) {
      console.error('Error deleting receptor class:', error);
      alert('Ошибка при удалении: ' + error.message);
    }
  };

  const handleAdd = async () => {
    try {
      // Получаем максимальный порядок
      const { data: maxOrderData } = await supabase
        .from('receptor_classes')
        .select('display_order')
        .order('display_order', { ascending: false })
        .limit(1);

      const maxOrder = maxOrderData?.[0]?.display_order || 0;

      const { data, error } = await supabase
        .from('receptor_classes')
        .insert([{
          name: 'Новый класс рецепторов',
          display_order: maxOrder + 1,
          is_active: true
        }])
        .select()
        .single();

      if (error) throw error;

      // Переход на страницу редактирования нового класса
      navigate(`/receptor-class/${data.id}/edit`);
    } catch (error) {
      console.error('Error creating receptor class:', error);
      alert('Ошибка при создании: ' + error.message);
    }
  };

  const handleCopy = async (id) => {
    try {
      const { data: original, error: fetchError } = await supabase
        .from('receptor_classes')
        .select('name, antistimulus, description')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;
      if (!original) throw new Error('Класс рецепторов не найден');

      // Получаем максимальный порядок
      const { data: maxOrderData, error: orderError } = await supabase
        .from('receptor_classes')
        .select('display_order')
        .order('display_order', { ascending: false })
        .limit(1);

      if (orderError) throw orderError;
      const maxOrder = maxOrderData?.[0]?.display_order || 0;

      const { data: copied, error: insertError } = await supabase
        .from('receptor_classes')
        .insert([{
          ...original,
          name: `${original.name} (копия)`,
          display_order: maxOrder + 1,
          is_active: true
        }])
        .select()
        .single();

      if (insertError) throw insertError;

      // Обновляем список
      await fetchClasses();
      
    } catch (error) {
      console.error('Error copying receptor class:', error);
      alert('Не удалось создать копию: ' + error.message);
    }
  };

  const handleMove = async (id, direction) => {
    const currentIndex = classes.findIndex(c => c.id === id);
    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    
    if (newIndex < 0 || newIndex >= classes.length) {
      alert('Невозможно переместить - достигнут край списка');
      return;
    }
    
    const newClasses = [...classes];
    const [removed] = newClasses.splice(currentIndex, 1);
    newClasses.splice(newIndex, 0, removed);

    const updatedClasses = newClasses.map((cls, index) => ({
      ...cls,
      display_order: index
    }));

    setClasses(updatedClasses);

    try {
      const updatePromises = updatedClasses.map(cls =>
        supabase
          .from('receptor_classes')
          .update({ display_order: cls.display_order })
          .eq('id', cls.id)
      );
      await Promise.all(updatePromises);
    } catch (error) {
      console.error('Error saving order to DB:', error);
      setClasses(classes); // Откат
      alert('Ошибка сохранения изменений: ' + error.message);
    }
  };

  // Кастомная карточка для классов рецепторов
  const renderReceptorClassCard = (cls, index, actions) => {
    const totalCount = classes.length;
    
    return (  
      <div 
        key={cls.id} 
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
                to={`/receptor-class/${cls.id}`}
                style={{ 
                  color: '#007bff',
                  textDecoration: 'none',
                  fontSize: '18px'
                }}
              >
                {cls.name}
              </Link>
            </h3>
            
            {cls.antistimulus && (
              <div style={{ 
                display: 'inline-block',
                backgroundColor: '#e3f2fd',
                color: '#007bff',
                padding: '2px 8px',
                borderRadius: '12px',
                fontSize: '12px',
                marginTop: '5px',
                marginRight: '5px'
              }}>
                Антистимул: {cls.antistimulus}
              </div>
            )}

            {cls.receptorCount > 0 && (
              <div style={{ 
                display: 'inline-block',
                backgroundColor: '#28a745',
                color: 'white',
                padding: '2px 8px',
                borderRadius: '12px',
                fontSize: '12px',
                marginTop: '5px'
              }}>
                Рецепторов: {cls.receptorCount}
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

        {cls.description && (
          <div style={{ 
            fontSize: '14px', 
            color: '#495057',
            marginBottom: '10px',
            lineHeight: '1.4'
          }}>
            {cls.description.length > 150 
              ? `${cls.description.substring(0, 150)}...` 
              : cls.description}
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
    total: classes.length,
    withRelations: classes.filter(c => c.receptorCount > 0).length
  };

  const columns = [
    { field: 'name', label: 'Название', searchable: true },
    { field: 'antistimulus', label: 'Антистимул', searchable: true }
  ];

  return (
    <EntityList
      entities={classes}
      entityType="receptor-class"
      entityName="Классы рецепторов"
      onEdit={handleEdit}
      onDelete={handleDelete}
      onAdd={handleAdd}
      onCopy={handleCopy}
      onMove={handleMove}
      stats={stats}
      columns={columns}
      searchPlaceholder="Поиск по названию класса..."
      renderCard={renderReceptorClassCard}
    />
  );
}

export default ReceptorClassList;