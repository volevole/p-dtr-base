// ReceptorClassEditPage.js
import React, { useState, useEffect } from 'react';
import { createEntityEdit } from './factories/EntityEditFactory';
import API_URL from './config/api';

// Компонент для загрузки дополнительных данных (если нужно)
function ReceptorClassFormFields({ formData, handleChange, isNew, entity }) {
  // Можно добавить специфические поля, если нужно
  return (
    <>
      <div className="form-section">
        <label>Название класса *</label>
        <input
          type="text"
          name="name"
          value={formData.name || ''}
          onChange={handleChange}
          required
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
        <label>Описание</label>
        <textarea
          name="description"
          value={formData.description || ''}
          onChange={handleChange}
          rows={5}
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

const ReceptorClassEditPage = createEntityEdit({
  entityName: 'Класс рецепторов',
  entityType: 'receptor_class',
  tableName: 'receptor-classes',
  fields: [
    { name: 'name', label: 'Название', required: true },
    { name: 'antistimulus', label: 'Антистимул' },
    { name: 'description', label: 'Описание', type: 'textarea', rows: 5 },
    { name: 'display_order', label: 'Порядок отображения', type: 'number', defaultValue: 0 }
  ],
  hasMedia: true,
  renderFormFields: (props) => <ReceptorClassFormFields {...props} />
});

export default ReceptorClassEditPage;