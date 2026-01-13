// ReceptorsPage.js
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

// Кастомная карточка для рецепторов
const renderReceptorCard = (receptor, index, actions, totalCount) => {
  return (  
    <div 
      key={receptor.id} 
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
              to={`/receptor/${receptor.id}`}
              style={{ 
                color: '#007bff',
                textDecoration: 'none',
                fontSize: '18px'
              }}
            >
              {receptor.name}
            </Link>
          </h3>
          
          {receptor.receptor_classes && (
            <div style={{ 
              display: 'inline-block',
              backgroundColor: '#e3f2fd',
              color: '#007bff',
              padding: '2px 8px',
              borderRadius: '12px',
              fontSize: '12px',
              marginTop: '5px',
              marginRight: '5px'
            }}>
              Класс: {receptor.receptor_classes.name}
            </div>
          )}

          {receptor.location && (
            <div style={{ 
              display: 'inline-block',
              backgroundColor: '#28a745',
              color: 'white',
              padding: '2px 8px',
              borderRadius: '12px',
              fontSize: '12px',
              marginTop: '5px',
              marginRight: '5px'
            }}>
              Место: {receptor.location}
            </div>
          )}
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

      <div style={{ marginBottom: '10px' }}>
        {receptor.own_stimulus && (
          <div style={{ 
            display: 'inline-block',
            backgroundColor: '#fff3cd',
            color: '#856404',
            padding: '2px 8px',
            borderRadius: '12px',
            fontSize: '12px',
            marginRight: '5px',
            marginBottom: '5px'
          }}>
            Стимул: {receptor.own_stimulus}
          </div>
        )}

        {receptor.antistimulus && (
          <div style={{ 
            display: 'inline-block',
            backgroundColor: '#f8d7da',
            color: '#721c24',
            padding: '2px 8px',
            borderRadius: '12px',
            fontSize: '12px',
            marginBottom: '5px'
          }}>
            Антистимул: {receptor.antistimulus}
          </div>
        )}
      </div>

      {receptor.description && (
        <div style={{ 
          fontSize: '14px', 
          color: '#495057',
          marginBottom: '10px',
          lineHeight: '1.4'
        }}>
          {receptor.description.length > 150 
            ? `${receptor.description.substring(0, 150)}...` 
            : receptor.description}
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

const ReceptorsPage = createEntityList({
  entityName: 'Рецепторы',
  entityType: 'receptor',
  tableName: 'receptors',
  columns: [
    { field: 'name', label: 'Название', searchable: true },
    { field: 'location', label: 'Место нахождения', searchable: true },
    { field: 'own_stimulus', label: 'Стимул', searchable: true },
    { field: 'antistimulus', label: 'Антистимул', searchable: true }
  ],
  relatedTables: [
    { table: 'receptor_classes', fields: 'name' }
  ],
  statsConfig: {
    calculate: (entities) => ({
      total: entities.length,
      withClass: entities.filter(r => r.class_id).length,
      withLocation: entities.filter(r => r.location).length
    })
  },
  renderCard: renderReceptorCard
});

export default ReceptorsPage;