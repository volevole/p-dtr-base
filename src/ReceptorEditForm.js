// ReceptorEditForm.js
import React, { useState, useEffect } from 'react';
import { supabase } from './utils/supabaseClient';

function ReceptorEditForm({ formData, handleChange, isNew, entity }) {
  const [receptorClasses, setReceptorClasses] = useState([]);
  const [loadingClasses, setLoadingClasses] = useState(true);

  useEffect(() => {
    fetchReceptorClasses();
  }, []);

  const fetchReceptorClasses = async () => {
    try {
      const { data, error } = await supabase
        .from('receptor_classes')
        .select('id, name')
        .eq('is_active', true)
        .order('display_order');

      if (error) throw error;
      setReceptorClasses(data || []);
    } catch (error) {
      console.error('Error loading receptor classes:', error);
    } finally {
      setLoadingClasses(false);
    }
  };

  return (
    <>
      <div style={{ marginBottom: '15px' }}>
        <label style={{ display: 'block', marginBottom: '5px' }}>
          Название рецептора:
          <span style={{ color: '#dc3545' }}> *</span>
        </label>
        <input
          type="text"
          name="name"
          value={formData.name || ''}
          onChange={handleChange}
          style={{ width: '100%', padding: '8px', fontSize: '16px' }}
          placeholder="Например: Мышечное веретено, Сухожильный орган Гольджи..."
          required
        />
      </div>

      <div style={{ marginBottom: '15px' }}>
        <label style={{ display: 'block', marginBottom: '5px' }}>
          Класс рецепторов:
        </label>
        <select
          name="class_id"
          value={formData.class_id || ''}
          onChange={handleChange}
          style={{ width: '100%', padding: '8px', fontSize: '16px' }}
          disabled={loadingClasses}
        >
          <option value="">-- Выберите класс --</option>
          {receptorClasses.map(cls => (
            <option key={cls.id} value={cls.id}>
              {cls.name}
            </option>
          ))}
        </select>
        {loadingClasses && (
          <small style={{ color: '#6c757d', display: 'block', marginTop: '5px' }}>
            Загрузка классов...
          </small>
        )}
      </div>

      <div style={{ marginBottom: '15px' }}>
        <label style={{ display: 'block', marginBottom: '5px' }}>
          Место нахождения:
        </label>
        <input
          type="text"
          name="location"
          value={formData.location || ''}
          onChange={handleChange}
          style={{ width: '100%', padding: '8px', fontSize: '16px' }}
          placeholder="Например: Мышечная ткань, Сухожилия, Кожа..."
        />
      </div>

      <div style={{ marginBottom: '15px' }}>
        <label style={{ display: 'block', marginBottom: '5px' }}>
          Собственный стимул:
        </label>
        <input
          type="text"
          name="own_stimulus"
          value={formData.own_stimulus || ''}
          onChange={handleChange}
          style={{ width: '100%', padding: '8px', fontSize: '16px' }}
          placeholder="Что активирует этот рецептор?"
        />
      </div>

      <div style={{ marginBottom: '15px' }}>
        <label style={{ display: 'block', marginBottom: '5px' }}>
          Антистимул:
        </label>
        <input
          type="text"
          name="antistimulus"
          value={formData.antistimulus || ''}
          onChange={handleChange}
          style={{ width: '100%', padding: '8px', fontSize: '16px' }}
          placeholder="Что является антистимулом для этого рецептора?"
        />
      </div>

      <div style={{ marginBottom: '15px' }}>
        <label style={{ display: 'block', marginBottom: '5px' }}>
          Порядок отображения:
        </label>
        <input
          type="number"
          name="display_order"
          value={formData.display_order || 0}
          onChange={handleChange}
          style={{ width: '100%', padding: '8px', fontSize: '16px' }}
          min="0"
        />
        <small style={{ color: '#6c757d', display: 'block', marginTop: '5px' }}>
          Чем меньше число, тем выше в списке
        </small>
      </div>

      <div style={{ marginBottom: '15px' }}>
        <label style={{ display: 'block', marginBottom: '5px' }}>
          Подробное описание:
        </label>
        <textarea
          name="description"
          value={formData.description || ''}
          onChange={handleChange}
          style={{ 
            width: '100%', 
            padding: '8px', 
            fontSize: '16px',
            minHeight: '200px',
            resize: 'vertical'
          }}
          placeholder="Опишите особенности этого рецептора, его функции, характеристики, значение в организме..."
        />
      </div>
    </>
  );
}

export default ReceptorEditForm;