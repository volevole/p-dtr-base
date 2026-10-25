// EntryDetail.js
import React from 'react';
import { createEntityDetail } from './factories/EntityDetailFactory';

const EntryDetail = createEntityDetail({
  entityName: 'Заход',
  entityType: 'entry',
  tableName: 'entries',
  listPath: '/entries',
  fields: [
    { name: 'name', label: 'Название' },
    { name: 'description', label: 'Описание', type: 'textarea' },
    { 
      name: 'is_active', 
      label: 'Статус',
      render: (value) => (
        value ? <span style={{ color: '#28a745', fontWeight: 'bold' }}>Активен</span> 
              : <span style={{ color: '#dc3545', fontWeight: 'bold' }}>Неактивен</span>
      )
    },
    { name: 'display_order', label: 'Порядок отображения' },
    { 
      name: 'created_at', 
      label: 'Дата создания',
      render: (value) => new Date(value).toLocaleString('ru-RU')
    },
    { 
      name: 'updated_at', 
      label: 'Дата обновления',
      render: (value) => new Date(value).toLocaleString('ru-RU')
    }
  ],
  hasMedia: true,
  // Добавляем кастомный блок с информацией
  renderCustomContent: (entity, relatedData) => (
    <div className="relationships-section">
      <h3>Информация о заходе</h3>
      <div className="relationship-card" style={{ padding: '15px' }}>
        <p style={{ color: '#666', margin: 0, lineHeight: '1.6' }}>
          Заход — это вариант выбора стартовой точки алгоритма для поиска основных составляющих дисфункции.
          Например, заход от слабой мышцы или заход от тотального гипертонуса.
        </p>
      </div>
    </div>
  )
});

export default EntryDetail;