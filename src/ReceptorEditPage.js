// ReceptorEditPage.js
import React, { useState, useEffect } from 'react';
import { createEntityEdit } from './factories/EntityEditFactory';
import API_URL from './config/api';

// Компонент для загрузки справочников
function ReceptorFormFields({ formData, handleChange, isNew, entity }) {
  const [receptorClasses, setReceptorClasses] = useState([]);

  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const response = await fetch(`${API_URL}/api/receptor-classes`);
        const result = await response.json();
        if (result.success) {
          setReceptorClasses(result.data || []);
        }
      } catch (error) {
        console.error('Error loading classes:', error);
      }
    };
    fetchClasses();
  }, []);

  return (
    <>
      <div className="form-section">
        <label>Название рецептора *</label>
        <input
          type="text"
          name="name"
          value={formData.name || ''}
          onChange={handleChange}
          required
        />
      </div>

      <div className="form-section">
        <label>Класс рецепторов</label>
        <select name="class_id" value={formData.class_id || ''} onChange={handleChange}>
          <option value="">-- Не выбран --</option>
          {receptorClasses.map(cls => (
            <option key={cls.id} value={cls.id}>{cls.name}</option>
          ))}
        </select>
      </div>

      <div className="form-section">
        <label>Место нахождения</label>
        <input
          type="text"
          name="location"
          value={formData.location || ''}
          onChange={handleChange}
        />
      </div>

      <div className="form-section">
        <label>Собственный стимул</label>
        <input
          type="text"
          name="own_stimulus"
          value={formData.own_stimulus || ''}
          onChange={handleChange}
        />
      </div>

      <div className="form-section">
        <label>Антистимул</label>
        <input
          type="text"
          name="antistimulus"
          value={formData.antistimulus || ''}
          onChange={handleChange}
        />
      </div>

      <div className="form-section">
        <label>Паттерн ингибиции</label>
        <textarea
          name="inhibition_pattern"
          value={formData.inhibition_pattern || ''}
          onChange={handleChange}
          rows={4}
        />
      </div>

      <div className="form-section">
        <label>Описание</label>
        <textarea
          name="description"
          value={formData.description || ''}
          onChange={handleChange}
          rows={6}
        />
      </div>

      <div className="form-group">
        <label>Порядок отображения</label>
        <input
          type="number"
          name="display_order"
          value={formData.display_order || 0}
          onChange={handleChange}
          min="0"
        />
      </div>
    </>
  );
}

const ReceptorEditPage = createEntityEdit({
  entityName: 'Рецептор',
  entityType: 'receptor',
  tableName: 'receptors',
  fields: [
    { name: 'name', label: 'Название', required: true },
    { name: 'class_id', label: 'Класс рецепторов' },
    { name: 'location', label: 'Место нахождения' },
    { name: 'own_stimulus', label: 'Собственный стимул' },
    { name: 'antistimulus', label: 'Антистимул' },
    { name: 'inhibition_pattern', label: 'Паттерн ингибиции', type: 'textarea', rows: 4 },
    { name: 'description', label: 'Описание', type: 'textarea', rows: 6 },
    { name: 'display_order', label: 'Порядок отображения', type: 'number', defaultValue: 0 }
  ],
  hasMedia: true,
  renderFormFields: (props) => <ReceptorFormFields {...props} />
});

export default ReceptorEditPage;