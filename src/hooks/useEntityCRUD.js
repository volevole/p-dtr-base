// hooks/useEntityCRUD.js
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
//import { supabase } from './supabaseClient';
import { supabase } from '../utils/supabaseClient';

export function useEntityCRUD(config) {
  const { 
    tableName, 
    fields = [], 
    relatedTables = [],
    defaultFormData = {}
  } = config;
  
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = id === 'new';
  
  const [entity, setEntity] = useState(null);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  
  // Инициализация формы
  const initialFormData = fields.reduce((acc, field) => {
    acc[field.name] = field.defaultValue || '';
    return acc;
  }, { ...defaultFormData });
  
  const [formData, setFormData] = useState(initialFormData);

  // Загрузка данных
  const fetchEntity = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from(tableName)
        .select('*')
        .eq('id', id);

      if (relatedTables.length > 0) {
        const relatedFields = relatedTables.map(rel => 
          `${rel.table}(${rel.fields || '*'})`
        ).join(',');
        
        query = query.select(`*, ${relatedFields}`);
      }

      const { data, error } = await query.single();

      if (error) throw error;

      if (data) {
        setEntity(data);
        
        const newFormData = { ...initialFormData };
        fields.forEach(field => {
          newFormData[field.name] = data[field.name] || field.defaultValue || '';
        });
        setFormData(newFormData);
      }
    } catch (error) {
      console.error(`Error loading entity:`, error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Сохранение
  const saveEntity = async (data) => {
    setSaving(true);
    
    try {
      if (isNew) {
        const { data: result, error } = await supabase
          .from(tableName)
          .insert([{
            ...data,
            is_active: true,
            created_at: new Date().toISOString()
          }])
          .select()
          .single();

        if (error) throw error;
        return result;
      } else {
        const { error } = await supabase
          .from(tableName)
          .update({
            ...data,
            updated_at: new Date().toISOString()
          })
          .eq('id', id);

        if (error) throw error;
        return { id };
      }
    } catch (error) {
      console.error(`Error saving entity:`, error);
      throw error;
    } finally {
      setSaving(false);
    }
  };

  // Обработчик изменения полей
  const handleChange = (e) => {
    const { name, value, type } = e.target;
    
    let processedValue = value;
    
    if (type === 'number') {
      processedValue = parseInt(value) || 0;
    } else if (type === 'checkbox') {
      processedValue = e.target.checked;
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: processedValue
    }));
  };

  // Инициализация при монтировании
  useEffect(() => {
    if (!isNew && id) {
      fetchEntity();
    } else {
      setFormData(initialFormData);
    }
  }, [id, isNew]);

  return {
    // Состояния
    isNew,
    entity,
    loading,
    saving,
    formData,
    
    // Методы
    fetchEntity,
    saveEntity,
    handleChange,
    setFormData,
    
    // Вспомогательные
    setFieldValue: (fieldName, value) => {
      setFormData(prev => ({ ...prev, [fieldName]: value }));
    },
    
    // Навигация и идентификаторы
    id,
    navigate
  };
}