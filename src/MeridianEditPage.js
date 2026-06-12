// src/MeridianEditPage.js
import React from 'react';
import { createEntityEdit } from './factories/EntityEditFactory';

// Компонент для дополнительных полей меридиана
function MeridianFormFields({ formData, handleChange, isNew, entity }) {
  return (
    <>
      <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
        <div className="form-section">
          <label>Название (рус) *</label>
          <input
            type="text"
            name="name"
            value={formData.name || ''}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-section">
          <label>Название (лат)</label>
          <input
            type="text"
            name="name_lat"
            value={formData.name_lat || ''}
            onChange={handleChange}
          />
        </div>
      </div>

      <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
        <div className="form-section">
          <label>Код</label>
          <input
            type="text"
            name="code"
            value={formData.code || ''}
            onChange={handleChange}
            placeholder="Например: LU, LI, ST и т.д."
          />
        </div>

        <div className="form-section">
          <label>Тип</label>
          <input
            type="text"
            name="type"
            value={formData.type || ''}
            onChange={handleChange}
            placeholder="Например: ручной Инь, ножной Ян и т.д."
          />
        </div>
      </div>

      <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
        <div className="form-section">
          <label>Описание</label>
          <textarea
            name="description"
            value={formData.description || ''}
            onChange={handleChange}
            rows={6}
            placeholder="Общее описание меридиана..."
          />
        </div>

        <div className="form-section">
          <label>Ход меридиана</label>
          <textarea
            name="course"
            value={formData.course || ''}
            onChange={handleChange}
            rows={6}
            placeholder="Описание хода меридиана по телу..."
          />
        </div>
      </div>

      <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
        <div className="form-section">
          <label>Функции</label>
          <textarea
            name="functions"
            value={formData.functions || ''}
            onChange={handleChange}
            rows={6}
            placeholder="Основные функции меридиана..."
          />
        </div>

        <div className="form-section">
          <label>Симптомы</label>
          <textarea
            name="symptoms"
            value={formData.symptoms || ''}
            onChange={handleChange}
            rows={6}
            placeholder="Симптомы дисфункции меридиана..."
          />
        </div>
      </div>

      <div className="form-section">
        <label>Примечания</label>
        <textarea
          name="notes"
          value={formData.notes || ''}
          onChange={handleChange}
          rows={4}
          placeholder="Дополнительные примечания..."
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

const MeridianEditPage = createEntityEdit({
  entityName: 'Меридиан',
  entityType: 'meridian',
  tableName: 'meridians',
  fields: [
    { name: 'name', label: 'Название (рус)', required: true },
    { name: 'name_lat', label: 'Название (лат)' },
    { name: 'code', label: 'Код' },
    { name: 'type', label: 'Тип' },
    { name: 'description', label: 'Описание', type: 'textarea', rows: 6 },
    { name: 'course', label: 'Ход меридиана', type: 'textarea', rows: 6 },
    { name: 'functions', label: 'Функции', type: 'textarea', rows: 6 },
    { name: 'symptoms', label: 'Симптомы', type: 'textarea', rows: 6 },
    { name: 'notes', label: 'Примечания', type: 'textarea', rows: 4 },
    { name: 'display_order', label: 'Порядок отображения', type: 'number', defaultValue: 0 }
  ],
  hasMedia: true,
  renderFormFields: (props) => <MeridianFormFields {...props} />
});

export default MeridianEditPage;