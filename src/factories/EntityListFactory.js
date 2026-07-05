// src/factories/EntityListFactory.js
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FaEdit, 
  FaTrash, 
  FaPlus, 
  FaSearch, 
  FaTimes,
  FaArrowUp,
  FaArrowDown
} from 'react-icons/fa';
import { HiDuplicate } from 'react-icons/hi';
import API_URL from '../config/api';

const styles = {
  container: { padding: '2rem', maxWidth: '1400px', margin: 'auto' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' },
  searchBox: { display: 'flex', gap: '0.5rem', alignItems: 'center' },
  searchInput: { padding: '0.5rem', fontSize: '1rem', border: '1px solid #ddd', borderRadius: '4px', width: '250px' },
  addButton: { backgroundColor: '#28a745', color: 'white', border: 'none', padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' },
  stats: { display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' },
  statCard: { backgroundColor: '#f8f9fa', padding: '0.75rem 1.5rem', borderRadius: '8px', border: '1px solid #dee2e6' },
  list: { 
    display: 'grid', 
    gridTemplateColumns: 'repeat(auto-fill, minmax(500px, 1fr))', 
    gap: '1rem' 
  },
  loading: { textAlign: 'center', padding: '2rem', fontSize: '1.2rem', color: '#666' },
  empty: { textAlign: 'center', padding: '3rem', backgroundColor: '#f8f9fa', borderRadius: '8px', color: '#666' }
};

// Стили для сообщения об ошибке сети
const networkErrorStyles = {
  container: {
    backgroundColor: '#f8d7da',
    color: '#721c24',
    padding: '20px',
    borderRadius: '8px',
    marginBottom: '20px',
    border: '1px solid #f5c6cb',
    textAlign: 'center'
  },
  icon: { fontSize: '48px', marginBottom: '10px' },
  title: { margin: '0 0 10px 0' },
  text: { margin: 0 },
  button: {
    marginTop: '15px',
    padding: '10px 25px',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '16px'
  }
};

export function createEntityList({
  entityName,
  entityType,
  tableName,
  columns = [],
  relatedTables = [],
  statsConfig = null,
  renderCard,
  enableMove = true
}) {
  return function EntityListPage() {
    const navigate = useNavigate();
    const [items, setItems] = useState([]);
    const [filteredItems, setFilteredItems] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState(null);
    const [networkError, setNetworkError] = useState(false); // 👈 НОВОЕ СОСТОЯНИЕ

    const loadItems = useCallback(async () => {
      try {
        setLoading(true);
        setNetworkError(false); // Сбрасываем ошибку при новом запросе
        
        const response = await fetch(`${API_URL}/api/${tableName}`);
        
        // Проверяем HTTP статус
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
          setItems(result.data);
          setFilteredItems(result.data);
          
          if (statsConfig && statsConfig.calculate) {
            setStats(statsConfig.calculate(result.data));
          }
        } else {
          throw new Error(result.error || 'Ошибка загрузки данных');
        }
      } catch (error) {
        console.error(`Ошибка загрузки ${entityName.toLowerCase()}ов:`, error);
        setNetworkError(true);
        setItems([]);
        setFilteredItems([]);
        setStats(null);
      } finally {
        setLoading(false);
      }
    }, [tableName, entityName]);

    useEffect(() => {
      loadItems();
    }, [loadItems]);

    useEffect(() => {
      if (!searchTerm.trim()) {
        setFilteredItems(items);
        return;
      }
      
      const searchFields = columns.filter(c => c.searchable).map(c => c.field);
      if (searchFields.length === 0) return;
      
      const filtered = items.filter(item => 
        searchFields.some(field => 
          String(item[field] || '').toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
      setFilteredItems(filtered);
    }, [searchTerm, items, columns]);

    const handleDelete = async (id) => {
      if (!window.confirm(`Вы уверены, что хотите удалить эту ${entityName.toLowerCase()}?`)) return;
      
      try {
        for (const relation of relatedTables) {
          await fetch(`${API_URL}/api/${relation.table}?${entityType}_id=${id}`, { method: 'DELETE' });
        }
        
        const response = await fetch(`${API_URL}/api/${tableName}/${id}`, { method: 'DELETE' });
        const result = await response.json();
        
        if (result.success) {
          await loadItems();
        } else {
          alert('Ошибка при удалении: ' + result.error);
        }
      } catch (error) {
        console.error('Ошибка удаления:', error);
        alert('Ошибка при удалении');
      }
    };

    const handleCopy = async (id) => {
      try {
        const response = await fetch(`${API_URL}/api/${tableName}/${id}/copy`, { method: 'POST' });
        const result = await response.json();
        
        if (result.success) {
          await loadItems();
        } else {
          alert('Ошибка при копировании: ' + result.error);
        }
      } catch (error) {
        console.error('Ошибка копирования:', error);
        alert('Ошибка при копировании');
      }
    };

    const handleMoveUp = async (index) => {
      if (index === 0) return;
      
      const newOrder = [...filteredItems];
      [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
      const orderedIds = newOrder.map(item => item.id);
      
      try {
        const response = await fetch(`${API_URL}/api/${tableName}/reorder`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderedIds })
        });
        
        if (response.ok) {
          setFilteredItems(newOrder);
          await loadItems();
        }
      } catch (error) {
        console.error('Ошибка перемещения:', error);
      }
    };

    const handleAdd = async () => {
      try {
        const response = await fetch(`${API_URL}/api/${tableName}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: `Новый ${entityName}` })
        });
        const result = await response.json();
        
        if (result.success) {
          navigate(`/${entityType}/${result.id}/edit`);
        } else {
          alert('Ошибка при создании: ' + result.error);
        }
      } catch (error) {
        console.error('Ошибка создания:', error);
        alert('Ошибка при создании: ' + error.message);
      }
    };

    const handleMoveDown = async (index) => {
      if (index === filteredItems.length - 1) return;
      
      const newOrder = [...filteredItems];
      [newOrder[index + 1], newOrder[index]] = [newOrder[index], newOrder[index + 1]];
      const orderedIds = newOrder.map(item => item.id);
      
      try {
        const response = await fetch(`${API_URL}/api/${tableName}/reorder`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderedIds })
        });
        
        if (response.ok) {
          setFilteredItems(newOrder);
          await loadItems();
        }
      } catch (error) {
        console.error('Ошибка перемещения:', error);
      }
    };

    // ==== РЕНДЕРИНГ ====

    // Показываем загрузку
    if (loading) {
      return <div style={styles.loading}>Загрузка...</div>;
    }

    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <div style={styles.searchBox}>
            <FaSearch />
            <input
              type="text"
              placeholder={`${entityName} поиск...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={styles.searchInput}
            />
            {searchTerm && (
              <FaTimes 
                style={{ cursor: 'pointer', color: '#999' }}
                onClick={() => setSearchTerm('')}
              />
            )}
          </div>
          
          <button onClick={handleAdd} style={styles.addButton}>
            <FaPlus /> Добавить {entityName.toLowerCase()}
          </button>
        </div>

        {/* ОШИБКА СЕТИ */}
      {networkError && (
        <div style={{
          backgroundColor: '#f8d7da',
          color: '#721c24',
          padding: '20px',
          borderRadius: '8px',
          marginBottom: '20px',
          border: '1px solid #f5c6cb',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '10px' }}>📡</div>
          <h3 style={{ margin: '0 0 10px 0' }}>Связь с сервером потеряна</h3>
          <p style={{ margin: '0 0 5px 0' }}>
            Не удалось загрузить данные. Проверьте подключение к интернету.
          </p>
          <p style={{ margin: '0 0 15px 0', fontSize: '14px', color: '#856404' }}>
            💡 Если интернет есть, возможно сервер временно недоступен.
            <br />
            Проверьте доступность сервера по ссылке ниже:
          </p>

          {/* Ссылка для проверки сервера */}
          <div style={{
            backgroundColor: '#fff',
            padding: '10px 15px',
            borderRadius: '6px',
            display: 'inline-block',
            marginBottom: '15px',
            marginRight: '15px',
            border: '1px solid #f5c6cb'
          }}>
            <a
              href={`${API_URL}/api/media/supported-entities`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: '#0056b3',
                textDecoration: 'none',
                fontWeight: 'bold',
                fontSize: '14px',
                wordBreak: 'break-all'
              }}
              onMouseEnter={(e) => e.target.style.textDecoration = 'underline'}
              onMouseLeave={(e) => e.target.style.textDecoration = 'none'}
            >
              🔗 Проверить сервер
            </a>
            <span style={{ fontSize: '12px', color: '#666', display: 'block', marginTop: '4px' }}>
              {API_URL}/api/media/supported-entities
            </span>
          </div>

          <div style={{ marginTop: '15px' }}>      
          <button
            onClick={loadItems}
            style={{
              marginTop: '10px',
              padding: '10px 25px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '16px'
            }}
            onMouseEnter={(e) => e.target.style.backgroundColor = '#0056b3'}
            onMouseLeave={(e) => e.target.style.backgroundColor = '#007bff'}
          >
            🔄 Повторить попытку
          </button>
          </div>
        </div>
      )}

        {/* СТАТИСТИКА (только если нет ошибки сети) */}
        {!networkError && stats && (
          <div style={styles.stats}>
            {Object.entries(stats).map(([key, value]) => (
              <div key={key} style={styles.statCard}>
                <strong>{key === 'total' ? 'Всего' : key === 'withRelations' ? 'Со связями' : key}:</strong> {value}
              </div>
            ))}
          </div>
        )}

        {/* СПИСОК */}
        <div style={styles.list}>
          {!networkError && filteredItems.length === 0 ? (
            // Пустое состояние (только если нет ошибки сети)
            <div style={styles.empty}>
              <p>Нет ничего из {entityName}</p>
              <button onClick={handleAdd} style={styles.addButton}>
                <FaPlus /> Добавить первый {entityName.toLowerCase()}
              </button>
            </div>
          ) : (
            !networkError && filteredItems.map((item, index) => {
              const actions = {
                onCopy: () => handleCopy(item.id),
                onEdit: () => navigate(`/${entityType}/${item.id}/edit`),
                onDelete: () => handleDelete(item.id),
                onMoveUp: enableMove ? () => handleMoveUp(index) : null,
                onMoveDown: enableMove ? () => handleMoveDown(index) : null
              };
              
              return renderCard(item, index, actions, filteredItems.length);
            })
          )}
        </div>
      </div>
    );
  };
}