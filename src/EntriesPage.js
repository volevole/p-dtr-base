// EntriesPage.js
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

function EntriesPage() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchEntries();
  }, []);

  const fetchEntries = async () => {
    try {
      setLoading(true);
      
      // Получаем заходы
      const { data: entriesData, error } = await supabase
        .from('entries')
        .select('*')
        .order('display_order')
        .order('name');

      if (error) throw error;

      setEntries(entriesData || []);
    } catch (error) {
      console.error('Ошибка загрузки заходов:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (id) => {
    navigate(`/entry/${id}/edit`);
  };

  const handleDelete = async (id) => {
    // Находим заход в массиве по ID
    const entryToDelete = entries.find(e => e.id === id);
    
    if (!entryToDelete) {
      alert('Заход не найден');
      return;
    }

    // Используем имя захода в confirm
    if (!window.confirm(`Удалить заход "${entryToDelete.name}"?`)) return;

    try {
      const { error } = await supabase
        .from('entries')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setEntries(prev => prev.filter(e => e.id !== id));
    } catch (error) {
      console.error('Ошибка удаления:', error);
      alert('Ошибка при удалении: ' + error.message);
    }
  };

  const handleAdd = async () => {
    try {
      // Получаем максимальный порядок
      const { data: maxOrderData } = await supabase
        .from('entries')
        .select('display_order')
        .order('display_order', { ascending: false })
        .limit(1);

      const maxOrder = maxOrderData?.[0]?.display_order || 0;

      const { data, error } = await supabase
        .from('entries')
        .insert([{
          name: 'Новый заход',
          display_order: maxOrder + 1
        }])
        .select()
        .single();

      if (error) throw error;

      navigate(`/entry/${data.id}/edit`);
    } catch (error) {
      console.error('Ошибка создания:', error);
      alert('Ошибка при создании: ' + error.message);
    }
  };

  const handleCopy = async (id) => {
    try {
      // Явно выбираем только нужные поля
      const { data: original, error: fetchError } = await supabase
        .from('entries')
        .select('name, description')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;
      if (!original) throw new Error('Заход не найден');

      // Получаем максимальный порядок
      const { data: maxOrderData, error: orderError } = await supabase
        .from('entries')
        .select('display_order')
        .order('display_order', { ascending: false })
        .limit(1);

      if (orderError) throw orderError;
      const maxOrder = maxOrderData?.[0]?.display_order || 0;

      const { data: copied, error: insertError } = await supabase
        .from('entries')
        .insert([{
          ...original,
          name: `${original.name} (копия)`,
          display_order: maxOrder + 1
        }])
        .select()
        .single();

      if (insertError) throw insertError;

      // Обновляем список
      await fetchEntries();
      
    } catch (error) {
      console.error('Ошибка копирования:', error);
      alert('Не удалось создать копию: ' + error.message);
    }
  };

  const handleMove = async (id, direction) => {
    const currentIndex = entries.findIndex(e => e.id === id);
    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    
    if (newIndex < 0 || newIndex >= entries.length) {
      alert('Невозможно переместить - достигнут край списка');
      return;
    }
    
    const newEntries = [...entries];
    const [removed] = newEntries.splice(currentIndex, 1);
    newEntries.splice(newIndex, 0, removed);

    const updatedEntries = newEntries.map((entry, index) => ({
      ...entry,
      display_order: index
    }));

    setEntries(updatedEntries);

    try {
      const updatePromises = updatedEntries.map(entry =>
        supabase
          .from('entries')
          .update({ display_order: entry.display_order })
          .eq('id', entry.id)
      );
      await Promise.all(updatePromises);
    } catch (error) {
      console.error('Ошибка сохранения в БД:', error);
      setEntries(entries); // Откат
      alert('Ошибка сохранения изменений: ' + error.message);
    }
  };

  // Кастомная карточка для заходов
  const renderEntryCard = (entry, index, actions) => {
    const totalCount = entries.length;
    return (  
      <div 
        key={entry.id} 
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
                to={`/entry/${entry.id}`}
                style={{ 
                  color: '#007bff',
                  textDecoration: 'none',
                  fontSize: '18px'
                }}
              >
                {entry.name}
              </Link>
            </h3>
            {!entry.is_active && (
              <div style={{ 
                display: 'inline-block',
                backgroundColor: '#dc3545',
                color: 'white',
                padding: '2px 8px',
                borderRadius: '12px',
                fontSize: '12px',
                marginTop: '5px'
              }}>
                Неактивен
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

        {/* Примечание */}
        {entry.description && (
          <div style={{ 
            fontSize: '14px', 
            color: '#495057',
            marginBottom: '10px',
            lineHeight: '1.4'
          }}>
            {entry.description.length > 150 
              ? `${entry.description.substring(0, 150)}...` 
              : entry.description}
          </div>
        )}

        {/* Дата создания */}
        <div style={{ 
          fontSize: '12px', 
          color: '#6c757d',
          marginBottom: '10px'
        }}>
          Создан: {new Date(entry.created_at).toLocaleDateString('ru-RU')}
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
    total: entries.length,
    active: entries.filter(e => e.is_active).length,
    inactive: entries.filter(e => !e.is_active).length
  };

  const columns = [
    { field: 'name', label: 'Название захода', searchable: true },
    { field: 'description', label: 'Описание', searchable: true }
  ];

  return (
    <EntityList
      entities={entries}
      entityType="entry"
      entityName="Заходы"
      onEdit={handleEdit}
      onDelete={handleDelete}
      onAdd={handleAdd}
      onCopy={handleCopy}
      onMove={handleMove}
      stats={stats}
      columns={columns}
      searchPlaceholder="Поиск по названию захода..."
      renderCard={renderEntryCard}
    />
  );
}

export default EntriesPage;