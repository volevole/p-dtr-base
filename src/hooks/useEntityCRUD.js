// hooks/useEntityCRUD.js - исправленная версия
import { useState, useEffect } from 'react';
import { useParams, useNavigate }  from 'react-router-dom';
import API_URL from '../config/api';

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
  
  const initialFormData = fields.reduce((acc, field) => {
    acc[field.name] = field.defaultValue || '';
    return acc;
  }, { ...defaultFormData });
  
  const [formData, setFormData] = useState(initialFormData);

  // Определяем URL в зависимости от tableName
  const getListUrl = () => `/api/${tableName}`;           // /api/receptors
  const getSingleUrl = (id) => `/api/${tableName}/${id}`; // /api/receptors/:id
  const getReorderUrl = () => `/api/${tableName}/reorder`;

  const fetchEntity = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}${getSingleUrl(id)}`);
      const result = await response.json();
      if (!result.success) throw new Error(result.error);
      
      const data = result.data;
      if (data) {
        setEntity(data);
        const newFormData = { ...initialFormData };
        fields.forEach(field => {
          newFormData[field.name] = data[field.name] ?? field.defaultValue ?? '';
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

  const saveEntity = async (data) => {
    setSaving(true);
    try {
      if (isNew) {
        const response = await fetch(`${API_URL}${getListUrl()}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        const result = await response.json();
        if (!result.success) throw new Error(result.error);
        return result;
      } else {
        const response = await fetch(`${API_URL}${getSingleUrl(id)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        const result = await response.json();
        if (!result.success) throw new Error(result.error);
        return { id };
      }
    } catch (error) {
      console.error(`Error saving entity:`, error);
      throw error;
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    let processedValue = value;
    if (type === 'number') {
      processedValue = parseInt(value) || 0;
    } else if (type === 'checkbox') {
      processedValue = e.target.checked;
    }
    setFormData(prev => ({ ...prev, [name]: processedValue }));
  };

  useEffect(() => {
    if (!isNew && id) {
      fetchEntity();
    } else {
      setFormData(initialFormData);
    }
  }, [id, isNew]);

  return {
    isNew,
    entity,
    loading,
    saving,
    formData,
    fetchEntity,
    saveEntity,
    handleChange,
    setFormData,
    setFieldValue: (fieldName, value) => {
      setFormData(prev => ({ ...prev, [fieldName]: value }));
    },
    id,
    navigate
  };
}