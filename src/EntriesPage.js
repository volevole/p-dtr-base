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

// Кастомная карточка для заходов (полностью рисует карточку, как и раньше)
const renderEntryCard = (entry, index, actions, totalCount) => {
  // Определяем мобильное устройство через медиа-запрос в CSS
  const isMobile = window.innerWidth <= 768;
  
  return (  
    <div 
      key={entry.id} 
      className="entry-card"
    >
      {/* Верхняя часть с заголовком и кнопками */}
      <div className="entry-card-header">
        <div className="entry-card-title-section">
          <h3 className="entry-card-title">
            <Link 
              to={`/entry/${entry.id}`}
              className="link-text"
            >
              {entry.name}
            </Link>
          </h3>
          {!entry.is_active && (
            <span className="entry-card-inactive">Неактивен</span>
          )}
        </div>
        
        <div className="entry-card-actions">
          <button 
            onClick={actions.onCopy} 
            className="entry-card-action-btn"
            title="Копировать"
          >
            <HiDuplicate size={14} />
          </button>
          <button 
            onClick={actions.onEdit} 
            className="entry-card-action-btn"
            title="Редактировать"
          >
            <FaEdit size={14} />
          </button>
          <button 
            onClick={actions.onDelete} 
            className="entry-card-action-btn delete-btn"
            title="Удалить"
          >
            <FaTrash size={14} />
          </button>
        </div>
      </div>

      {/* Описание */}
      {entry.description && (
        <div className="entry-card-description">
          {truncateText(entry.description, isMobile ? 100 : 200)}
        </div>
      )}

      {/* Дата создания */}
      {entry.created_at && (
        <div className="entry-card-date">
          Создан: {new Date(entry.created_at).toLocaleDateString('ru-RU')}
        </div>
      )}

      {/* Кнопки перемещения */}
      <div className="entry-card-move-buttons">
        <button 
          onClick={actions.onMoveUp} 
          disabled={index === 0}
          className={`entry-card-move-btn ${index === 0 ? 'disabled' : ''}`}
          title="Переместить выше"
        >
          <FaArrowUp size={10} />
        </button>
        <button 
          onClick={actions.onMoveDown} 
          disabled={index === totalCount - 1}
          className={`entry-card-move-btn ${index === totalCount - 1 ? 'disabled' : ''}`}
          title="Переместить ниже"
        >
          <FaArrowDown size={10} />
        </button>
      </div>
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
  relatedTables: [], // у заходов пока нет связанных таблиц
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