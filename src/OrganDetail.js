// src/OrganDetail.js
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createEntityDetail } from './factories/EntityDetailFactory';
import MediaManager from './MediaManager';
import API_URL from './config/api';
import './App.css';

// Функция для обрезания длинного текста
const truncateText = (text, maxLength = 200) => {
  if (!text) return text;
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

// Компонент для отображения связанных мышц
function RelatedMuscles({ organId }) {
  const [muscles, setMuscles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    async function fetchMuscles() {
      if (!organId) return;
      
      try {
        setLoading(true);
        const response = await fetch(`${API_URL}/api/organ/${organId}/muscles`);
        const result = await response.json();
        
        if (result.success) {
          setMuscles(result.data || []);
        }
      } catch (error) {
        console.error('Ошибка загрузки связанных мышц:', error);
      } finally {
        setLoading(false);
      }
    }
    
    fetchMuscles();
  }, [organId]);

  if (loading) {
    return <p>Загрузка связанных мышц...</p>;
  }

  if (muscles.length === 0) {
    return <p className="empty-value" style={{ fontStyle: 'italic' }}>Нет связанных мышц</p>;
  }

  return (
    <div style={{ 
      display: 'grid', 
      gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', 
      gap: '15px',
      marginTop: '15px'
    }}>
      {muscles.map(muscle => (
        <div 
          key={muscle.id}
          className="relationship-card"
          style={{ padding: '15px', border: '1px solid #e0e0e0', borderRadius: '8px' }}
        >
          <h4 style={{ margin: '0 0 10px 0' }}>
            <Link to={`/muscle/${muscle.id}`} className="link-text">
              {muscle.name_ru}
            </Link>
            {muscle.name_lat && (
              <span style={{ 
                fontSize: '14px', 
                color: '#666',
                marginLeft: '5px',
                fontWeight: 'normal'
              }}>
                ({muscle.name_lat})
              </span>
            )}
          </h4>

          {muscle.origin && (
            <div style={{ marginBottom: '5px' }}>
              <strong>Начало:</strong> {truncateText(muscle.origin, isMobile ? 100 : 200)}
            </div>
          )}

          {muscle.insertion && (
            <div style={{ marginBottom: '5px' }}>
              <strong>Прикрепление:</strong> {truncateText(muscle.insertion, isMobile ? 100 : 200)}
            </div>
          )}

          {muscle.indicator && (
            <div style={{ marginBottom: '5px' }}>
              <strong>Индикатор:</strong> {muscle.indicator}
            </div>
          )}

          {muscle.pain_zones_text && (
            <div style={{ marginBottom: '5px' }}>
              <strong>Зоны боли:</strong> {truncateText(muscle.pain_zones_text, isMobile ? 100 : 200)}
            </div>
          )}

          {muscle.notes && (
            <div style={{ 
              marginTop: '10px', 
              padding: '8px',
              backgroundColor: '#f0f0f0',
              borderRadius: '4px',
              fontSize: '14px'
            }}>
              <strong>Примечание:</strong> {truncateText(muscle.notes, isMobile ? 100 : 200)}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// Компонент для отображения медиа
function OrganMedia({ entityId, entityName }) {
  return (
    <MediaManager 
      entityType="organ"
      entityId={entityId}
      entityName={entityName}
      showTitle={true}
      readonly={true}
    />
  );
}

// Функции-рендереры для фабрики (без хуков)
const renderRelationships = (organ, setRelationshipsLoaded) => {
  // Уведомляем фабрику, что отношения загружены (если нужно)
  setRelationshipsLoaded(true);
  
  return <RelatedMuscles organId={organ?.id} />;
};

const renderMedia = (entity, isMobile) => {
  return <OrganMedia entityId={entity?.id} entityName={entity?.name} />;
};

const OrganDetail = createEntityDetail({
  entityName: 'Орган',
  entityType: 'organ',
  tableName: 'organs',
  listPath: '/organs',
  fields: [
    { name: 'name', label: 'Название' },
    { name: 'name_lat', label: 'Латинское название' },
    { name: 'system', label: 'Система' },
    { name: 'description', label: 'Описание', type: 'textarea' },
    { name: 'functions', label: 'Функции', type: 'textarea' },
    { name: 'symptoms', label: 'Симптомы дисфункции', type: 'textarea' },
    { name: 'diagnostic', label: 'Диагностика', type: 'textarea' },
    { name: 'treatment', label: 'Лечение', type: 'textarea' },
    { name: 'notes', label: 'Примечания', type: 'textarea' },
    { name: 'display_order', label: 'Порядок отображения' }
  ],
  sections: [
    {
      title: 'Связанные мышцы',
      component: renderRelationships
    },
    {
      title: 'Медиафайлы',
      component: renderMedia
    }
  ]
});

export default OrganDetail;