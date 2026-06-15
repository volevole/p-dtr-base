// EntryDetail.js - адаптивная версия с использованием существующих стилей
import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import MediaManager from './MediaManager';
import API_URL from './config/api';
import './App.css';

function EntryDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [entry, setEntry] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Определяем мобильное устройство
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
    async function fetchData() {
      setLoading(true);

      try {
        // Загружаем данные захода через API
        const response = await fetch(`${API_URL}/api/entries/${id}`);
        const result = await response.json();

        if (!result.success) throw new Error(result.error);
        if (!result.data) throw new Error('Заход не найден');

        setEntry(result.data);
      } catch (error) {
        console.error('Ошибка загрузки данных:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [id]);

  const formatDate = (dateString) => {
    if (!dateString) return 'Нет данных';
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU') + ' ' + date.toLocaleTimeString('ru-RU');
  };

  if (loading) return <div className="detail-container">Загрузка...</div>;
  if (!entry) return <div className="detail-container">Заход не найден</div>;

  return (
    <div className={`detail-container ${isMobile ? 'mobile-view' : ''}`}>
      {/* Навигация */}
      <div className="detail-navigation">
        <Link to="/entries" className="link-text">← Назад к списку</Link>
        <button 
          onClick={() => navigate(`/entry/${id}/edit`)}
          className="action-btn edit-btn"
          title="Редактировать"
        >
          ✏️ 
        </button>
      </div>

      <h1 className="detail-title">
        <small>Заход:</small> {entry.name}
        {!entry.is_active && (
          <span className="detail-subtitle inactive-badge" style={{ 
            marginLeft: '10px',
            backgroundColor: '#dc3545',
            color: 'white',
            padding: '2px 8px',
            borderRadius: '12px',
            fontSize: '14px',
            fontWeight: 'normal'
          }}>
            Неактивен
          </span>
        )}
      </h1>

      {/* ===== АДАПТИВНОЕ ОТОБРАЖЕНИЕ ДАННЫХ ЗАХОДА ===== */}
      <div className="detail-content">
        {/* Десктопная таблица */}
        <table className="detail-table">
          <tbody>
            <tr>
              <td className="detail-label">Название:</td>
              <td className="detail-value">{entry.name}</td>
            </tr>
            
            {entry.description && (
              <tr>
                <td className="detail-label">Описание:</td>
                <td className="detail-value description-text">{entry.description}</td>
              </tr>
            )}
            
            <tr>
              <td className="detail-label">Статус:</td>
              <td className="detail-value">
                {entry.is_active ? (
                  <span style={{ color: '#28a745', fontWeight: 'bold' }}>Активен</span>
                ) : (
                  <span style={{ color: '#dc3545', fontWeight: 'bold' }}>Неактивен</span>
                )}
              </td>
            </tr>
            
            <tr>
              <td className="detail-label">Порядок отображения:</td>
              <td className="detail-value">{entry.display_order}</td>
            </tr>
            
            <tr>
              <td className="detail-label">Дата создания:</td>
              <td className="detail-value">{formatDate(entry.created_at)}</td>
            </tr>
            
            <tr>
              <td className="detail-label">Дата обновления:</td>
              <td className="detail-value">{formatDate(entry.updated_at)}</td>
            </tr>
          </tbody>
        </table>

        {/* Мобильная версия - вертикальные блоки */}
        <div className="mobile-detail">
          <div className="mobile-detail-item">
            <span className="mobile-detail-label">Название:</span>
            <span className="mobile-detail-value">{entry.name}</span>
          </div>
          
          {entry.description && (
            <div className="mobile-detail-item">
              <span className="mobile-detail-label">Описание:</span>
              <span className="mobile-detail-value description-text">{entry.description}</span>
            </div>
          )}
          
          <div className="mobile-detail-item">
            <span className="mobile-detail-label">Статус:</span>
            <span className="mobile-detail-value">
              {entry.is_active ? (
                <span style={{ color: '#28a745', fontWeight: 'bold' }}>Активен</span>
              ) : (
                <span style={{ color: '#dc3545', fontWeight: 'bold' }}>Неактивен</span>
              )}
            </span>
          </div>
          
          <div className="mobile-detail-item">
            <span className="mobile-detail-label">Порядок отображения:</span>
            <span className="mobile-detail-value">{entry.display_order}</span>
          </div>
          
          <div className="mobile-detail-item">
            <span className="mobile-detail-label">Дата создания:</span>
            <span className="mobile-detail-value">{formatDate(entry.created_at)}</span>
          </div>
          
          <div className="mobile-detail-item">
            <span className="mobile-detail-label">Дата обновления:</span>
            <span className="mobile-detail-value">{formatDate(entry.updated_at)}</span>
          </div>
        </div>
      </div>

      {/* Информация о заходе */}
      <div className="relationships-section">
        <h3>Информация о заходе</h3>
        <div className="relationship-card" style={{ padding: '15px' }}>
          <p style={{ color: '#666', margin: 0, lineHeight: '1.6' }}>
            Заход — это вариант выбора стартовой точки алгоритма для поиска основных составляющих дисфункции.
            Например, заход от слабой мышцы или заход от тотального гипертонуса.
          </p>
        </div>
      </div>

      {/* Media Manager */}
      <MediaManager 
        entityType="entry"
        entityId={id}
        entityName={entry.name}
        showTitle={true}
        readonly={true}
      />

      <hr className="separator" />
      <p className="detail-id"><strong>ID захода:</strong> {entry.id}</p>
    </div>
  );
}

export default EntryDetail;