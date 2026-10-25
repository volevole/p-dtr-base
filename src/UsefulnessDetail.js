// UsefulnessDetail.js
import React from 'react';
import { createEntityDetail } from './factories/EntityDetailFactory';

const UsefulnessDetail = createEntityDetail({
  entityName: 'Полезность',
  entityType: 'usefulness',
  tableName: 'usefulness',
  listPath: '/usefulness',
  fields: [
    { name: 'name', label: 'Название' },
    { name: 'description', label: 'Описание', type: 'textarea' },
    { 
      name: 'is_active', 
      label: 'Статус',
      render: (value) => (
        value ? <span style={{ color: '#28a745', fontWeight: 'bold' }}>Активна</span> 
              : <span style={{ color: '#dc3545', fontWeight: 'bold' }}>Неактивна</span>
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
  renderCustomContent: (entity, relatedData) => (
    <div className="relationships-section">
      <h3>О полезности</h3>
      <div className="relationship-card" style={{ padding: '15px' }}>
        <p style={{ color: '#666', margin: 0, lineHeight: '1.6' }}>
          Полезности — это дополнительные материалы, которые могут пригодиться в работе.
          Здесь можно хранить заметки, ссылки, методики и другую полезную информацию.
        </p>
      </div>
    </div>
  )
});

export default UsefulnessDetail;