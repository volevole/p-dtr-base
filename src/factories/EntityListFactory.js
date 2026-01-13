// factories/EntityListFactory.js (обновленный)
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../utils/supabaseClient';
import EntityList from '../EntityList';

export function createEntityList(config) {
  const {
    entityName,
    entityType,
    tableName,
    columns = [],
    relatedTables = [],
    renderCard,
    statsConfig = {},
    customHandlers = {}, // Для кастомных обработчиков
    extraData = {} // Дополнительные данные для рендера
  } = config;

  return function EntityListComponent() {
    const [entities, setEntities] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    // Кастомные состояния (если нужны)
    const [customState, setCustomState] = useState(extraData.initialState || {});

    useEffect(() => {
      fetchEntities();
    }, []);

    const fetchEntities = async () => {
      try {
        setLoading(true);
        
        let query = supabase
          .from(tableName)
          .select('*')
          .eq('is_active', true)
          .order('display_order');

        if (relatedTables.length > 0) {
          const relatedFields = relatedTables.map(rel => 
            `${rel.table}(${rel.fields || '*'})`
          ).join(',');
          
          query = query.select(`*, ${relatedFields}`);
        }

        // Кастомные условия (если есть)
        if (customHandlers.modifyQuery) {
          query = customHandlers.modifyQuery(query);
        }

        const { data, error } = await query;

        if (error) throw error;
        
        // Кастомная обработка данных (если есть)
        let processedData = data || [];
        if (customHandlers.processData) {
          processedData = customHandlers.processData(data);
        }
        
        setEntities(processedData);
      } catch (error) {
        console.error(`Error loading ${entityName}:`, error);
      } finally {
        setLoading(false);
      }
    };

    const handleEdit = (id) => {
      navigate(`/${entityType}/${id}/edit`);
    };

    const handleDelete = async (id) => {
      // Кастомный обработчик удаления (если есть)
      if (customHandlers.onDelete) {
        return customHandlers.onDelete(id, entities, setEntities);
      }
      
      // Стандартный обработчик
      const entityToDelete = entities.find(e => e.id === id);
      if (!entityToDelete) {
        alert(`${entityName} не найден`);
        return;
      }

      if (!window.confirm(`Удалить "${entityToDelete.name}"?`)) return;

      try {
        const { error } = await supabase
          .from(tableName)
          .delete()
          .eq('id', id);

        if (error) throw error;

        setEntities(prev => prev.filter(e => e.id !== id));
      } catch (error) {
        console.error(`Error deleting ${entityName}:`, error);
        alert(`Ошибка при удалении: ${error.message}`);
      }
    };

    const handleAdd = async () => {
      // Кастомный обработчик добавления
      if (customHandlers.onAdd) {
        return customHandlers.onAdd(navigate);
      }
      
      // Стандартный обработчик
      try {
        const { data: maxOrderData } = await supabase
          .from(tableName)
          .select('display_order')
          .order('display_order', { ascending: false })
          .limit(1);

        const maxOrder = maxOrderData?.[0]?.display_order || 0;

        const { data, error } = await supabase
          .from(tableName)
          .insert([{
            name: `Новый ${entityName}`,
            display_order: maxOrder + 1,
            is_active: true
          }])
          .select()
          .single();

        if (error) throw error;

        navigate(`/${entityType}/${data.id}/edit`);
      } catch (error) {
        console.error(`Error creating ${entityName}:`, error);
        alert(`Ошибка при создании: ${error.message}`);
      }
    };

    const handleCopy = async (id) => {
      // Кастомный обработчик копирования
      if (customHandlers.onCopy) {
        return customHandlers.onCopy(id, entities, fetchEntities);
      }
      
      // Стандартный обработчик
      try {
        const original = entities.find(e => e.id === id);
        if (!original) throw new Error(`${entityName} не найден`);

        // Копируем только нужные поля (исключаем id, created_at и т.д.)
        const copyData = { ...original };
        delete copyData.id;
        delete copyData.created_at;
        delete copyData.updated_at;

        const { data: maxOrderData } = await supabase
          .from(tableName)
          .select('display_order')
          .order('display_order', { ascending: false })
          .limit(1);

        const maxOrder = maxOrderData?.[0]?.display_order || 0;

        const { data: copied, error } = await supabase
          .from(tableName)
          .insert([{
            ...copyData,
            name: `${original.name} (копия)`,
            display_order: maxOrder + 1
          }])
          .select()
          .single();

        if (error) throw error;

        await fetchEntities();
        
      } catch (error) {
        console.error(`Error copying ${entityName}:`, error);
        alert(`Не удалось создать копию: ${error.message}`);
      }
    };

    const handleMove = async (id, direction) => {
      // Кастомный обработчик перемещения
      if (customHandlers.onMove) {
        return customHandlers.onMove(id, direction, entities, setEntities);
      }
      
      // Стандартный обработчик
      const currentIndex = entities.findIndex(e => e.id === id);
      const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
      
      if (newIndex < 0 || newIndex >= entities.length) {
        alert('Невозможно переместить - достигнут край списка');
        return;
      }
      
      const newEntities = [...entities];
      const [removed] = newEntities.splice(currentIndex, 1);
      newEntities.splice(newIndex, 0, removed);

      const updatedEntities = newEntities.map((entity, index) => ({
        ...entity,
        display_order: index
      }));

      setEntities(updatedEntities);

      try {
        const updatePromises = updatedEntities.map(entity =>
          supabase
            .from(tableName)
            .update({ display_order: entity.display_order })
            .eq('id', entity.id)
        );
        await Promise.all(updatePromises);
      } catch (error) {
        console.error('Error saving order to DB:', error);
        setEntities(entities); // Откат
        alert('Ошибка сохранения изменений: ' + error.message);
      }
    };

    if (loading) return <div style={{ padding: '2rem' }}>Загрузка...</div>;

    // Вычисление статистики
    const stats = statsConfig.calculate 
      ? statsConfig.calculate(entities) 
      : { total: entities.length };

    return (
      <EntityList
        entities={entities}
        entityType={entityType}
        entityName={entityName}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onAdd={handleAdd}
        onCopy={handleCopy}
        onMove={handleMove}
        stats={stats}
        columns={columns}
        searchPlaceholder={`Поиск ${entityName.toLowerCase()}...`}
        renderCard={(entity, index, actions) => 
          renderCard(entity, index, actions, entities.length, customState, setCustomState)
        }
      />
    );
  };
}