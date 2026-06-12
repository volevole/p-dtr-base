// src/DysfunctionsPage.js
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

const truncateText = (text, maxLength = 150) => {
  if (!text) return null;
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

// Полная кастомная карточка (как было раньше, работало красиво)
const renderDysfunctionCard = (dysfunction, index, actions, totalCount) => {
  const directMuscleCount = dysfunction.muscle_dysfunctions?.length || 0;
  const groupCount = dysfunction.muscle_group_dysfunctions?.length || 0;
  const relationshipCount = dysfunction.synergists_dysfunction?.length || 0;
  const totalRelatedCount = directMuscleCount + groupCount + relationshipCount;
  
  return (  
    <div 
      key={dysfunction.id} 
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
              to={`/dysfunction/${dysfunction.id}`}
              style={{ color: '#007bff', textDecoration: 'none', fontSize: '18px' }}
            >
              {dysfunction.name}
            </Link>
          </h3>
        </div>
        
        <div style={{ display: 'flex', gap: '5px' }}>
          <button onClick={actions.onCopy} title="Копировать" style={{ padding: '4px 8px', backgroundColor: '#f8f9fa', border: '1px solid #dee2e6', borderRadius: '4px', cursor: 'pointer' }}>
            <HiDuplicate size={14} />
          </button>
          <button onClick={actions.onEdit} title="Редактировать" style={{ padding: '4px 8px', backgroundColor: '#f8f9fa', border: '1px solid #dee2e6', borderRadius: '4px', cursor: 'pointer' }}>
            <FaEdit size={14} />
          </button>
          <button onClick={actions.onDelete} title="Удалить" style={{ padding: '4px 8px', backgroundColor: '#f8f9fa', border: '1px solid #dee2e6', borderRadius: '4px', cursor: 'pointer', color: '#dc3545' }}>
            <FaTrash size={14} />
          </button>
        </div>
      </div>

      {dysfunction.description && (
        <div style={{ fontSize: '14px', color: '#495057', marginBottom: '10px', lineHeight: '1.4' }}>
          <strong>Описание:</strong> {truncateText(dysfunction.description, 150)}
        </div>
      )}

      {dysfunction.visual_diagnosis && (
        <div style={{ fontSize: '14px', color: '#6c757d', marginBottom: '10px', lineHeight: '1.4', fontStyle: 'italic' }}>
          <strong>Визуальная диагностика:</strong> {truncateText(dysfunction.visual_diagnosis, 120)}
        </div>
      )}

      {dysfunction.provocations_text && (
        <div style={{ fontSize: '14px', color: '#495057', marginBottom: '10px', lineHeight: '1.4' }}>
          <strong>Провокации:</strong> {truncateText(dysfunction.provocations_text, 120)}
        </div>
      )}

      {(dysfunction.receptor_1 || dysfunction.receptor_2) && (
        <div style={{ display: 'flex', gap: '10px', marginBottom: '10px', flexWrap: 'wrap' }}>
          {dysfunction.receptor_1 && (
            <div style={{ display: 'inline-block', backgroundColor: '#e3f2fd', color: '#0d6efd', padding: '2px 8px', borderRadius: '12px', fontSize: '12px' }}>
              <strong>R1:</strong> {dysfunction.receptor_1}
            </div>
          )}
          {dysfunction.receptor_2 && (
            <div style={{ display: 'inline-block', backgroundColor: '#d1ecf1', color: '#0c5460', padding: '2px 8px', borderRadius: '12px', fontSize: '12px' }}>
              <strong>R2:</strong> {dysfunction.receptor_2}
            </div>
          )}
        </div>
      )}

      {totalRelatedCount > 0 && (
        <div style={{ marginBottom: '10px' }}>
          <Link 
            to={`/dysfunction/${dysfunction.id}`}
            style={{ display: 'inline-block', backgroundColor: '#28a745', color: 'white', padding: '4px 12px', borderRadius: '4px', textDecoration: 'none', fontSize: '12px', fontWeight: 'bold' }}
          >
            Связей: {totalRelatedCount}
          </Link>
          {(groupCount > 0 || relationshipCount > 0) && (
            <div style={{ fontSize: '11px', color: '#6c757d', marginTop: '3px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              {directMuscleCount > 0 && <span>Мышцы: {directMuscleCount}</span>}
              {groupCount > 0 && <span>Группы: {groupCount}</span>}
              {relationshipCount > 0 && <span>Взаимоотношения: {relationshipCount}</span>}
            </div>
          )}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '5px', marginTop: '15px', borderTop: '1px solid #f0f0f0', paddingTop: '10px' }}>
        <button 
          onClick={actions.onMoveUp} 
          disabled={index === 0}
          title="Переместить выше"
          style={{ padding: '4px 8px', backgroundColor: index === 0 ? '#f8f9fa' : '#007bff', color: index === 0 ? '#6c757d' : 'white', border: 'none', borderRadius: '4px', cursor: index === 0 ? 'not-allowed' : 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center' }}
        >
          <FaArrowUp size={10} />
        </button>
        <button 
          onClick={actions.onMoveDown} 
          disabled={index === totalCount - 1}
          title="Переместить ниже"
          style={{ padding: '4px 8px', backgroundColor: index === totalCount - 1 ? '#f8f9fa' : '#007bff', color: index === totalCount - 1 ? '#6c757d' : 'white', border: 'none', borderRadius: '4px', cursor: index === totalCount - 1 ? 'not-allowed' : 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center' }}
        >
          <FaArrowDown size={10} />
        </button>
      </div>
    </div>
  );
};

const DysfunctionsPage = createEntityList({
  entityName: 'Дисфункция',
  entityType: 'dysfunction',
  tableName: 'dysfunctions',
  columns: [
    { field: 'name', label: 'Название', searchable: true },
    { field: 'description', label: 'Описание', searchable: true }
  ],
  relatedTables: [
    { table: 'muscle_dysfunctions', fields: 'muscle_id' },
    { table: 'muscle_group_dysfunctions', fields: 'group_id' },
    { table: 'synergists_dysfunction', fields: 'relationship_id' }
  ],
  statsConfig: {
    calculate: (entities) => ({
      total: entities.length,
      withRelations: entities.filter(d => 
        (d.muscle_dysfunctions?.length || 0) > 0 ||
        (d.muscle_group_dysfunctions?.length || 0) > 0 ||
        (d.synergists_dysfunction?.length || 0) > 0
      ).length
    })
  },
  renderCard: renderDysfunctionCard
});

export default DysfunctionsPage;