// EntriesPage.js - адаптивная версия с использованием фабрики
import React from 'react';
import { Link } from 'react-router-dom';
import { createEntityList } from './factories/EntityListFactory';
import { 
  FaEdit, 
  FaTrash,
  FaArrowUp,
  FaArrowDown 
} from 'react-icons/fa';
import { HiDuplicate } from 'react-icons/hi';
import './App.css';

// Функция для обрезания длинного текста
const truncateText = (text, maxLength = 200) => {
  if (!text) return null;
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

// Кастомная карточка для заходов (в едином стиле entity-card)
const renderEntryCard = (entry, index, actions, totalCount) => {
  const isMobile = window.innerWidth <= 768;
  
  return (  
    <div key={entry.id} className="entity-card">
      <div className="entity-card-header">
        <div className="entity-card-title-section">
          <h3 className="entity-card-title">
            <Link to={`/entry/${entry.id}`} className="link-text">
              {entry.name}
            </Link>
          </h3>
          {!entry.is_active && (
            <span className="entity-badge badge-danger" style={{ marginTop: '5px' }}>
              Неактивен
            </span>
          )}
        </div>
        
        {/* 👈 СКРЫВАЕМ КНОПКИ ДЕЙСТВИЙ, ЕСЛИ НЕТ ПРАВ */}
        {actions.canEdit && (
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
        )}
      </div>

      {entry.description && (
        <div className="entity-card-description">
          {truncateText(entry.description, isMobile ? 100 : 200)}
        </div>
      )}

      {entry.created_at && (
        <div className="entity-card-meta">
          Создан: {new Date(entry.created_at).toLocaleDateString('ru-RU')}
        </div>
      )}

      {/* 👈 СКРЫВАЕМ КНОПКИ ПЕРЕМЕЩЕНИЯ, ЕСЛИ НЕТ ПРАВ */}
      {actions.canEdit && (
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
      )}
    </div>
  );
};

const EntriesPage = createEntityList({
  entityName: 'Заход',
  entityType: 'entry',
  tableName: 'entries',
  columns: [
    { field: 'name', label: 'Название захода', searchable: true },
    { field: 'description', label: 'Описание', searchable: true }
  ],
  relatedTables: [],
  statsConfig: {
    calculate: (entities) => ({
      total: entities.length,
      active: entities.filter(e => e.is_active).length,
      inactive: entities.filter(e => !e.is_active).length
    })
  },
  renderCard: renderEntryCard,
  enableMove: true
});

export default EntriesPage;