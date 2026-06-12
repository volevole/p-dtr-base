// src/OrganEditPage.js
import React from 'react';
import { createEntityEdit } from './factories/EntityEditFactory';

// Компонент для дополнительных полей органа
function OrganFormFields({ formData, handleChange, isNew, entity }) {
  return (
    <>
      <div className="form-section">
        <label>Название *</label>
        <input
          type="text"
          name="name"
          value={formData.name || ''}
          onChange={handleChange}
          required
        />
      </div>

      <div className="form-section">
        <label>Латинское название</label>
        <input
          type="text"
          name="name_lat"
          value={formData.name_lat || ''}
          onChange={handleChange}
        />
      </div>

      <div className="form-section">
        <label>Система</label>
        <input
          type="text"
          name="system"
          value={formData.system || ''}
          onChange={handleChange}
          placeholder="Например: Пищеварительная, Дыхательная..."
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

      <div className="form-section">
        <label>Функции</label>
        <textarea
          name="functions"
          value={formData.functions || ''}
          onChange={handleChange}
          rows={3}
          placeholder="Основные функции органа..."
        />
      </div>

      <div className="form-section">
        <label>Симптомы при дисфункции</label>
        <textarea
          name="symptoms"
          value={formData.symptoms || ''}
          onChange={handleChange}
          rows={3}
        />
      </div>

      <div className="form-section">
        <label>Диагностика</label>
        <textarea
          name="diagnostic"
          value={formData.diagnostic || ''}
          onChange={handleChange}
          rows={3}
        />
      </div>

      <div className="form-section">
        <label>Лечение</label>
        <textarea
          name="treatment"
          value={formData.treatment || ''}
          onChange={handleChange}
          rows={3}
        />
      </div>

      <div className="form-section">
        <label>Примечания</label>
        <textarea
          name="notes"
          value={formData.notes || ''}
          onChange={handleChange}
          rows={3}
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

const OrganEditPage = createEntityEdit({
  entityName: 'Орган',
  entityType: 'organ',
  tableName: 'organs',
  fields: [
    { name: 'name', label: 'Название', required: true },
    { name: 'name_lat', label: 'Латинское название' },
    { name: 'system', label: 'Система' },
    { name: 'description', label: 'Описание', type: 'textarea', rows: 5 },
    { name: 'functions', label: 'Функции', type: 'textarea', rows: 3 },
    { name: 'symptoms', label: 'Симптомы дисфункции', type: 'textarea', rows: 3 },
    { name: 'diagnostic', label: 'Диагностика', type: 'textarea', rows: 3 },
    { name: 'treatment', label: 'Лечение', type: 'textarea', rows: 3 },
    { name: 'notes', label: 'Примечания', type: 'textarea', rows: 3 },
    { name: 'display_order', label: 'Порядок отображения', type: 'number', defaultValue: 0 }
  ],
  hasMedia: true,
  renderFormFields: (props) => <OrganFormFields {...props} />
});

export default OrganEditPage;