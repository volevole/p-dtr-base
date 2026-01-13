// EntityList.js
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  FaSearch,
  FaFilter,
  FaPlusSquare,
  FaHeart,
  FaProjectDiagram,
  FaChartBar,
  FaList,
  FaEdit,
  FaTrash,
  FaCopy,
  FaArrowUp,
  FaArrowDown
} from 'react-icons/fa';
import { HiDuplicate } from 'react-icons/hi';

function EntityList({ 
  entities, 
  entityType, 
  onEdit, 
  onDelete, 
  onAdd, 
  onCopy, 
  onMove,
  stats,
  columns,
  renderCard,
  searchPlaceholder = "Поиск...",
  entityName = "Элементы",
  defaultSort = "default"
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filterBy, setFilterBy] = useState('all');
  const [sortBy, setSortBy] = useState(defaultSort);

  // Фильтрация и поиск
  const filteredEntities = entities.filter((entity) => {
    // Поиск по всем полям поиска
    const matchesSearch = columns.some(col => 
      col.searchable && 
      entity[col.field]?.toString().toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    // Фильтры (если есть специфичные фильтры для типа сущности)
    switch(filterBy) {
      case 'withRelations':
        // Для групп проверяем наличие дисфункций
        if (entityType === 'group') {
          return matchesSearch && (entity.dysfunctionCount > 0 || entity.dysfunctionCount > 0);
        }
        // Для остальных - relatedCount
        return matchesSearch && entity.relatedCount > 0;
      case 'withoutRelations':
        // Для групп проверяем отсутствие дисфункций
        if (entityType === 'group') {
          return matchesSearch && (!entity.dysfunctionCount || entity.dysfunctionCount === 0);
        }
        return matchesSearch && (!entity.relatedCount || entity.relatedCount === 0);
      default:
        return matchesSearch;
    }
  });

  // Сортировка
  const sortedEntities = [...filteredEntities].sort((a, b) => {
    switch(sortBy) {
      case 'name':
        return (a.name_ru || a.name || '').localeCompare(b.name_ru || b.name || '');
      case 'created':
        return new Date(b.created_at) - new Date(a.created_at);
      case 'updated':
        return new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at);
      default:
        return a.display_order - b.display_order;
    }
  });

  // Иконка для типа сущности
  const getEntityIcon = () => {
    switch(entityType) {
      case 'organ': return FaHeart;
      case 'meridian': return FaProjectDiagram;
      case 'dysfunction': return FaChartBar;
      case 'muscle': return FaList;
      default: return FaList;
    }
  };

  const EntityIcon = getEntityIcon();

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1 style={{ margin: 0, display: 'flex', alignItems: 'center' }}>
            <EntityIcon style={{ marginRight: '10px' }} />
            {entityName}
          </h1>
          {stats && (
            <div style={{ fontSize: '14px', color: '#6c757d', marginTop: '5px' }}>
              Всего: {stats.total || entities.length}
              {entityType === 'group' && stats.withDysfunctions !== undefined 
                ? ` | С дисфункциями: ${stats.withDysfunctions}`
                : stats.withRelations !== undefined && ` | Со связями: ${stats.withRelations}`
              }
              {stats.withMeridians !== undefined && ` | С меридианами: ${stats.withMeridians}`}
              {stats.withOrgans !== undefined && ` | С органами: ${stats.withOrgans}`}
              {stats.withDysfunctions !== undefined && entityType !== 'group' && ` | С дисфункциями: ${stats.withDysfunctions}`}
            </div>
          )}
        </div>
        
        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            onClick={() => setShowFilters(!showFilters)}
            style={{
              padding: '8px 16px',
              backgroundColor: showFilters ? '#6c757d' : '#f8f9fa',
              color: showFilters ? 'white' : '#495057',
              border: '1px solid #dee2e6',
              borderRadius: '4px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <FaFilter style={{ marginRight: '5px' }} />
            Фильтры
          </button>
          
          <button 
            onClick={onAdd}
            style={{
              padding: '8px 16px',
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <FaPlusSquare style={{ marginRight: '5px' }} />
            Добавить
          </button>
        </div>
      </div>

      {/* Строка поиска и фильтров */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <FaSearch style={{
            position: 'absolute',
            left: '10px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: '#6c757d'
          }} />
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '0.5rem 0.5rem 0.5rem 35px',
              fontSize: '1rem',
              border: '1px solid #dee2e6',
              borderRadius: '4px'
            }}
          />
        </div>

        {showFilters && (
          <div style={{ display: 'flex', gap: '10px', width: '100%', flexWrap: 'wrap' }}>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              style={{
                padding: '8px 16px',
                border: '1px solid #dee2e6',
                borderRadius: '4px',
                backgroundColor: 'white',
                cursor: 'pointer'
              }}
            >
              <option value="order">По порядку</option>
              <option value="name">По названию</option>
              <option value="created">По дате создания</option>
              <option value="updated">По дате изменения</option>
            </select>

            <button
              onClick={() => {
                setFilterBy('all');
                setSearchTerm('');
              }}
              style={{
                padding: '8px 16px',
                backgroundColor: '#6c757d',
                color: 'white',
                border: '1px solid #6c757d',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Сбросить все
            </button>
          </div>
        )}
      </div>

      {/* Список сущностей */}
      {sortedEntities.length === 0 ? (
        <div style={{ 
          textAlign: 'center', 
          padding: '40px',
          backgroundColor: '#f8f9fa',
          borderRadius: '8px',
          border: '2px dashed #dee2e6'
        }}>
          <h3>Ничего не найдено</h3>
          <p>Попробуйте изменить поисковый запрос или фильтры</p>
          {/* Кнопка "Создать первый элемент" показываем только если ВСЕГО нет элементов */}
          {filterBy === 'all' && searchTerm === '' && entities.length === 0 && onAdd && (
            <button 
              onClick={onAdd}
              style={{
                marginTop: '15px',
                padding: '10px 20px',
                backgroundColor: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Создать первый элемент
            </button>
          )}
          {/* Кнопка "Сбросить фильтры" если фильтры активны */}
          {(filterBy !== 'all' || searchTerm !== '') && (
            <button 
              onClick={() => {
                setFilterBy('all');
                setSearchTerm('');
              }}
              style={{
                marginTop: '15px',
                padding: '10px 20px',
                backgroundColor: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Сбросить фильтры
            </button>
          )}
        </div>
      ) : (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))',
          gap: '20px'
        }}>
          {sortedEntities.map((entity, index) => (
            renderCard ? (
              renderCard(entity, index, {
                onEdit: () => onEdit && onEdit(entity.id),
                onDelete: () => onDelete && onDelete(entity.id),
                onCopy: () => onCopy && onCopy(entity.id),
                onMoveUp: () => onMove && onMove(entity.id, 'up'),
                onMoveDown: () => onMove && onMove(entity.id, 'down')				  
              })
            ) : (
              <div 
                key={entity.id} 
                style={{ 
                  border: '1px solid #dee2e6',
                  borderRadius: '8px',
                  padding: '15px',
                  backgroundColor: 'white',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ margin: '0 0 5px 0' }}>
                      <Link 
                        to={`/${entityType}/${entity.id}`}
                        style={{ 
                          color: '#007bff',
                          textDecoration: 'none',
                          fontSize: '18px'
                        }}
                      >
                        {entity.name_ru || entity.name}
                      </Link>
                    </h3>
                    {entity.name_lat && (
                      <div style={{ color: '#6c757d', fontSize: '14px' }}>
                        {entity.name_lat}
                      </div>
                    )}
                    {entity.code && (
                      <div style={{ color: '#6c757d', fontSize: '12px', marginTop: '2px' }}>
                        Код: {entity.code}
                      </div>
                    )}
                  </div>
                  
                  <div style={{ display: 'flex', gap: '5px' }}>
                    {onCopy && (
                      <button 
                        onClick={() => onCopy(entity.id)} 
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
                    )}
                    {onEdit && (
                      <button 
                        onClick={() => onEdit(entity.id)} 
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
                    )}
                    {onDelete && (
                      <button 
                        onClick={() => onDelete(entity.id)} 
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
                    )}
                  </div>
                </div>

                {/* Контент сущности */}
                <div style={{ marginTop: '10px' }}>
                  {entity.description && (
                    <div style={{ 
                      fontSize: '14px', 
                      color: '#495057',
                      marginBottom: '10px',
                      lineHeight: '1.4'
                    }}>
                      {entity.description.length > 150 
                        ? `${entity.description.substring(0, 150)}...` 
                        : entity.description}
                    </div>
                  )}

                  {entity.relatedCount > 0 && (
                    <div style={{ 
                      display: 'inline-block',
                      backgroundColor: '#e3f2fd',
                      color: '#007bff',
                      padding: '4px 12px',
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: 'bold'
                    }}>
                      Связей: {entity.relatedCount}
                    </div>
                  )}
                </div>

                {/* Кнопки перемещения */}
                {onMove && (
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'flex-end', 
                    gap: '5px',
                    marginTop: '15px',
                    borderTop: '1px solid #f0f0f0',
                    paddingTop: '10px'
                  }}>
                    <button 
                      onClick={() => onMove(entity.id, 'up')} 
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
                      onClick={() => onMove(entity.id, 'down')} 
                      disabled={index === entities.length - 1}
                      title="Переместить ниже"
                      style={{
                        padding: '4px 8px',
                        backgroundColor: index === entities.length - 1 ? '#f8f9fa' : '#007bff',
                        color: index === entities.length - 1 ? '#6c757d' : 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: index === entities.length - 1 ? 'not-allowed' : 'pointer',
                        fontSize: '12px',
                        display: 'flex',
                        alignItems: 'center'
                      }}
                    >
                      <FaArrowDown size={10} />
                    </button>
                  </div>
                )}
              </div>
            )
          ))}
        </div>
      )}
    </div>
  );
}

export default EntityList;