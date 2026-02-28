// EntriesPage.js - адаптивная версия
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

function EntriesPage() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  
  // Определяем мобильное устройство
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    fetchEntries();
  }, []);

  const fetchEntries = async () => {
    try {
      setLoading(true);
      
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
    const entryToDelete = entries.find(e => e.id === id);
    
    if (!entryToDelete) {
      alert('Заход не найден');
      return;
    }

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
      const { data: original, error: fetchError } = await supabase
        .from('entries')
        .select('name, description')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;
      if (!original) throw new Error('Заход не найден');

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
      setEntries(entries);
      alert('Ошибка сохранения изменений: ' + error.message);
    }
  };

  // Адаптивная карточка для заходов
  const renderEntryCard = (entry, index, actions) => {
    const totalCount = entries.length;
    
    return (  
      <div 
        key={entry.id} 
        className="entry-card"
      >
        {/* Верхняя часть с заголовком и кнопками */}
        <div className="entry-card-header">
          <div className="entry-card-title-section">
            <h3 className="entry-card-title">
              <Link 
                to={`/entry/${entry.id}`}
                className="link-text"
              >
                {entry.name}
              </Link>
            </h3>
            {!entry.is_active && (
              <span className="entry-card-inactive">Неактивен</span>
            )}
          </div>
          
          <div className="entry-card-actions">
            <button 
              onClick={actions.onCopy} 
              className="entry-card-action-btn"
              title="Копировать"
            >
              <HiDuplicate size={14} />
            </button>
            <button 
              onClick={actions.onEdit} 
              className="entry-card-action-btn"
              title="Редактировать"
            >
              <FaEdit size={14} />
            </button>
            <button 
              onClick={actions.onDelete} 
              className="entry-card-action-btn delete-btn"
              title="Удалить"
            >
              <FaTrash size={14} />
            </button>
          </div>
        </div>

        {/* Описание */}
        {entry.description && (
          <div className="entry-card-description">
            {entry.description.length > (isMobile ? 100 : 200) 
              ? `${entry.description.substring(0, isMobile ? 100 : 200)}...` 
              : entry.description}
          </div>
        )}

        {/* Дата создания */}
        <div className="entry-card-date">
          Создан: {new Date(entry.created_at).toLocaleDateString('ru-RU')}
        </div>

        {/* Кнопки перемещения */}
        <div className="entry-card-move-buttons">
          <button 
            onClick={actions.onMoveUp} 
            disabled={index === 0}
            className={`entry-card-move-btn ${index === 0 ? 'disabled' : ''}`}
            title="Переместить выше"
          >
            <FaArrowUp size={10} />
          </button>
          <button 
            onClick={actions.onMoveDown} 
            disabled={index === totalCount - 1}
            className={`entry-card-move-btn ${index === totalCount - 1 ? 'disabled' : ''}`}
            title="Переместить ниже"
          >
            <FaArrowDown size={10} />
          </button>
        </div>
      </div>
    );
  };

  if (loading) return <div className="detail-container">Загрузка...</div>;

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