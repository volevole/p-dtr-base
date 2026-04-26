// ReceptorsPage.js - с использованием универсальных классов
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

// Кастомная карточка для рецепторов с универсальными классами
const renderReceptorCard = (receptor, index, actions, totalCount) => {
  return (  
    <div key={receptor.id} className="entity-card">
      <div className="entity-card-header">
        <div className="entity-card-title-section">
          <h3 className="entity-card-title">
            <Link to={`/receptor/${receptor.id}`} className="link-text">
              {receptor.name}
            </Link>
          </h3>
          
          <div className="entity-card-badges">
            {receptor.receptor_classes && (
              <span className="entity-badge badge-primary">
                Класс: {receptor.receptor_classes.name}
              </span>
            )}

            {receptor.location && (
              <span className="entity-badge badge-success">
                Место: {receptor.location}
              </span>
            )}
          </div>
        </div>
        
        <div className="entity-card-actions">
          <button onClick={actions.onCopy} className="entity-action-btn" title="Копировать">
            <HiDuplicate size={14} />
          </button>
          <button onClick={actions.onEdit} className="entity-action-btn" title="Редактировать">
            <FaEdit size={14} />
          </button>
          <button onClick={actions.onDelete} className="entity-action-btn delete-btn" title="Удалить">
            <FaTrash size={14} />
          </button>
        </div>
      </div>

      <div className="entity-card-badges">
        {receptor.own_stimulus && (
          <span className="entity-badge badge-warning">
            Стимул: {receptor.own_stimulus}
          </span>
        )}

        {receptor.antistimulus && (
          <span className="entity-badge badge-danger">
            Антистимул: {receptor.antistimulus}
          </span>
        )}
      </div>

      {receptor.description && (
        <div className="entity-card-description">
          {receptor.description.length > 150 
            ? `${receptor.description.substring(0, 150)}...` 
            : receptor.description}
        </div>
      )}

      <div className="entity-move-buttons">
        <button 
          onClick={actions.onMoveUp} 
          disabled={index === 0}
          className={`entity-move-btn ${index === 0 ? 'disabled' : ''}`}
          title="Переместить выше"
        >
          <FaArrowUp size={10} />
          <span>Вверх</span>
        </button>
        <button 
          onClick={actions.onMoveDown} 
          disabled={index === totalCount - 1}
          className={`entity-move-btn ${index === totalCount - 1 ? 'disabled' : ''}`}
          title="Переместить ниже"
        >
          <FaArrowDown size={10} />
          <span>Вниз</span>
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