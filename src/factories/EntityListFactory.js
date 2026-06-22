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

export function createEntityList({
  entityName,
  entityType,
  tableName,
  columns = [],
  relatedTables = [],
  statsConfig = null,
  renderCard,  // теперь снова полная карточка
  enableMove = true
}) {
  return function EntityListPage() {
    const navigate = useNavigate();
    const [items, setItems] = useState([]);
    const [filteredItems, setFilteredItems] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState(null);

    const loadItems = useCallback(async () => {
      try {
        setLoading(true);
        const response = await fetch(`${API_URL}/api/${tableName}`);
        const result = await response.json();
        
        if (result.success) {
          setItems(result.data);
          setFilteredItems(result.data);
          
          if (statsConfig && statsConfig.calculate) {
            setStats(statsConfig.calculate(result.data));
          }
        }
      } catch (error) {
        console.error(`Ошибка загрузки ${entityName.toLowerCase()}ов:`, error);
      } finally {
        setLoading(false);
      }
    }, [tableName]);

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

    //Создание нового
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

    if (loading) return <div style={styles.loading}>Загрузка...</div>;

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

        {stats && (
          <div style={styles.stats}>
            {Object.entries(stats).map(([key, value]) => (
              <div key={key} style={styles.statCard}>
                <strong>{key === 'total' ? 'Всего' : key === 'withRelations' ? 'Со связями' : key}:</strong> {value}
              </div>
            ))}
          </div>
        )}

        <div style={styles.list}>
          {filteredItems.length === 0 ? (
            <div style={styles.empty}>
              <p>Нет ничего из {entityName}</p>
              <button onClick={handleAdd} style={styles.addButton}>
                <FaPlus /> Добавить первый {entityName.toLowerCase()}
              </button>
            </div>
          ) : (
            filteredItems.map((item, index) => {
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