// src/MeridiansPage.js
import React from 'react';
import { Link } from 'react-router-dom';
import { 
  FaEdit, 
  FaTrash,
  FaArrowUp,
  FaArrowDown
} from 'react-icons/fa';
import { HiDuplicate } from 'react-icons/hi';
import { createEntityList } from './factories/EntityListFactory';

// Функция для обрезания длинного текста
const truncateText = (text, maxLength = 150) => {
  if (!text) return null;
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

// Кастомная карточка для меридианов
const renderMeridianCard = (meridian, index, actions, totalCount) => {
  const relatedCount = meridian.muscle_meridians?.length || 0;
  
  return (  
    <div 
      key={meridian.id} 
      style={{ 
        border: '1px solid #dee2e6',
        borderRadius: '8px',
        padding: '15px',
        backgroundColor: 'white',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        marginBottom: '10px'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
        <div style={{ flex: 1 }}>
          <h3 style={{ margin: '0 0 5px 0' }}>
            <Link 
              to={`/meridian/${meridian.id}`}
              style={{ 
                color: '#007bff',
                textDecoration: 'none',
                fontSize: '18px'
              }}
            >
              {meridian.name}
            </Link>
          </h3>
          
          {meridian.name_lat && (
            <div style={{ color: '#6c757d', fontSize: '14px', marginBottom: '5px' }}>
              {meridian.name_lat}
            </div>
          )}

          <div style={{ display: 'flex', gap: '10px', marginTop: '5px', flexWrap: 'wrap' }}>
            {meridian.code && (
              <div style={{ 
                display: 'inline-block',
                backgroundColor: '#e3f2fd',
                color: '#0d6efd',
                padding: '2px 8px',
                borderRadius: '12px',
                fontSize: '12px',
                fontWeight: 'bold'
              }}>
                Код: {meridian.code}
              </div>
            )}
            {meridian.type && (
              <div style={{ 
                display: 'inline-block',
                backgroundColor: '#d1ecf1',
                color: '#0c5460',
                padding: '2px 8px',
                borderRadius: '12px',
                fontSize: '12px'
              }}>
                {meridian.type}
              </div>
            )}
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: '5px' }}>
          <button 
            onClick={actions.onCopy} 
            title="Копировать" 
            style={{
              padding: '4px 8px',
              backgroundColor: '#f8f9fa',
              border: '1px solid #dee2e6',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            <HiDuplicate size={14} />
          </button>
          <button 
            onClick={actions.onEdit} 
            title="Редактировать" 
            style={{
              padding: '4px 8px',
              backgroundColor: '#f8f9fa',
              border: '1px solid #dee2e6',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            <FaEdit size={14} />
          </button>
          <button 
            onClick={actions.onDelete} 
            title="Удалить" 
            style={{
              padding: '4px 8px',
              backgroundColor: '#f8f9fa',
              border: '1px solid #dee2e6',
              borderRadius: '4px',
              cursor: 'pointer',
              color: '#dc3545'
            }}
          >
            <FaTrash size={14} />
          </button>
        </div>
      </div>

      {/* Описание (укороченное) */}
      {meridian.description && (
        <div style={{ 
          fontSize: '14px', 
          color: '#495057',
          marginBottom: '10px',
          lineHeight: '1.4'
        }}>
          <strong style={{ color: '#212529' }}>Описание:</strong> {truncateText(meridian.description, 150)}
        </div>
      )}

      {/* Ход меридиана (укороченный) */}
      {meridian.course && (
        <div style={{ 
          fontSize: '14px', 
          color: '#495057',
          marginBottom: '10px',
          lineHeight: '1.4'
        }}>
          <strong style={{ color: '#212529' }}>Ход:</strong> {truncateText(meridian.course, 120)}
        </div>
      )}

      {/* Функции (укороченные) */}
      {meridian.functions && (
        <div style={{ 
          fontSize: '14px', 
          color: '#495057',
          marginBottom: '10px',
          lineHeight: '1.4'
        }}>
          <strong style={{ color: '#212529' }}>Функции:</strong> {truncateText(meridian.functions, 120)}
        </div>
      )}

      {/* Симптомы (укороченные) */}
      {meridian.symptoms && (
        <div style={{ 
          fontSize: '14px', 
          color: '#495057',
          marginBottom: '10px',
          lineHeight: '1.4'
        }}>
          <strong style={{ color: '#212529' }}>Симптомы:</strong> {truncateText(meridian.symptoms, 120)}
        </div>
      )}

      {/* Примечания (укороченные) */}
      {meridian.notes && (
        <div style={{ 
          fontSize: '14px', 
          color: '#6c757d',
          marginBottom: '10px',
          lineHeight: '1.4',
          fontStyle: 'italic',
          backgroundColor: '#f8f9fa',
          padding: '8px',
          borderRadius: '4px',
          borderLeft: '3px solid #6c757d'
        }}>
          <strong style={{ color: '#495057' }}>Примечание:</strong> {truncateText(meridian.notes, 200)}
        </div>
      )}

      {/* Связи с мышцами */}
      {relatedCount > 0 && (
        <div style={{ marginBottom: '10px' }}>
          <Link 
            to={`/meridian/${meridian.id}/muscles`}
            style={{
              display: 'inline-block',
              backgroundColor: '#28a745',
              color: 'white',
              padding: '4px 12px',
              borderRadius: '4px',
              textDecoration: 'none',
              fontSize: '12px',
              fontWeight: 'bold'
            }}
          >
            Связанных мышц: {relatedCount}
          </Link>
        </div>
      )}

      {/* Кнопки перемещения */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'flex-end', 
        gap: '5px',
        marginTop: '15px',
        borderTop: '1px solid #f0f0f0',
        paddingTop: '10px'
      }}>
        <button 
          onClick={actions.onMoveUp} 
          disabled={index === 0}
          title="Переместить выше"
          style={{
            padding: '4px 8px',
            backgroundColor: index === 0 ? '#f8f9fa' : '#007bff',
            color: index === 0 ? '#6c757d' : 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: index === 0 ? 'not-allowed' : 'pointer',
            fontSize: '12px',
            display: 'flex',
            alignItems: 'center'
          }}
        >
          <FaArrowUp size={10} />
        </button>
        <button 
          onClick={actions.onMoveDown} 
          disabled={index === totalCount - 1}
          title="Переместить ниже"
          style={{
            padding: '4px 8px',
            backgroundColor: index === totalCount - 1 ? '#f8f9fa' : '#007bff',
            color: index === totalCount - 1 ? '#6c757d' : 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: index === totalCount - 1 ? 'not-allowed' : 'pointer',
            fontSize: '12px',
            display: 'flex',
            alignItems: 'center'
          }}
        >
          <FaArrowDown size={10} />
        </button>
      </div>
    </div>
  );
};

const MeridiansPage = createEntityList({
  entityName: 'Меридиан',
  entityType: 'meridian',
  tableName: 'meridians',
  columns: [
    { field: 'name', label: 'Название', searchable: true },
    { field: 'name_lat', label: 'Латинское название', searchable: true },
    { field: 'code', label: 'Код', searchable: true },
    { field: 'type', label: 'Тип', searchable: true }
  ],
  relatedTables: [
    { table: 'muscle_meridians', fields: 'muscle_id' }
  ],
  statsConfig: {
    calculate: (entities) => ({
      total: entities.length,
      withRelations: entities.filter(m => (m.muscle_meridians?.length || 0) > 0).length
    })
  },
  renderCard: renderMeridianCard
});

export default MeridiansPage;