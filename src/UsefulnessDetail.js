// UsefulnessDetail.js - адаптивная версия с использованием существующих стилей
import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import MediaManager from './MediaManager';
import API_URL from './config/api';
import './App.css';

function UsefulnessDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [usefulness, setUsefulness] = useState(null);
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
        // Загружаем данные полезности через API
        const response = await fetch(`${API_URL}/api/usefulness/${id}`);
        const result = await response.json();

        if (!result.success) throw new Error(result.error);
        if (!result.data) throw new Error('Полезность не найдена');

        setUsefulness(result.data);
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
  if (!usefulness) return <div className="detail-container">Полезность не найдена</div>;

  return (
    <div className={`detail-container ${isMobile ? 'mobile-view' : ''}`}>
      {/* Навигация */}
      <div className="detail-navigation">
        <Link to="/usefulness" className="link-text">← Назад к списку</Link>
        <button 
          onClick={() => navigate(`/usefulness/${id}/edit`)}
          className="action-btn edit-btn"
          title="Редактировать"
        >
          ✏️ 
        </button>
      </div>

      <h1 className="detail-title">
        <small>Полезность:</small> {usefulness.name}
        {!usefulness.is_active && (
          <span className="detail-subtitle inactive-badge" style={{ 
            marginLeft: '10px',
            backgroundColor: '#dc3545',
            color: 'white',
            padding: '2px 8px',
            borderRadius: '12px',
            fontSize: '14px',
            fontWeight: 'normal'
          }}>
            Неактивна
          </span>
        )}
      </h1>

      {/* ===== АДАПТИВНОЕ ОТОБРАЖЕНИЕ ДАННЫХ ПОЛЕЗНОСТИ ===== */}
      <div className="detail-content">
        {/* Десктопная таблица */}
        <table className="detail-table">
          <tbody>
            <tr>
              <td className="detail-label">Название:</td>
              <td className="detail-value">{usefulness.name}</td>
            </tr>
            
            {usefulness.description && (
              <tr>
                <td className="detail-label">Описание:</td>
                <td className="detail-value description-text">{usefulness.description}</td>
              </tr>
            )}
            
            <tr>
              <td className="detail-label">Статус:</td>
              <td className="detail-value">
                {usefulness.is_active ? (
                  <span style={{ color: '#28a745', fontWeight: 'bold' }}>Активна</span>
                ) : (
                  <span style={{ color: '#dc3545', fontWeight: 'bold' }}>Неактивна</span>
                )}
              </td>
            </tr>
            
            <tr>
              <td className="detail-label">Порядок отображения:</td>
              <td className="detail-value">{usefulness.display_order}</td>
            </tr>
            
            <tr>
              <td className="detail-label">Дата создания:</td>
              <td className="detail-value">{formatDate(usefulness.created_at)}</td>
            </tr>
            
            <tr>
              <td className="detail-label">Дата обновления:</td>
              <td className="detail-value">{formatDate(usefulness.updated_at)}</td>
            </tr>
          </tbody>
        </table>

        {/* Мобильная версия - вертикальные блоки */}
        <div className="mobile-detail">
          <div className="mobile-detail-item">
            <span className="mobile-detail-label">Название:</span>
            <span className="mobile-detail-value">{usefulness.name}</span>
          </div>
          
          {usefulness.description && (
            <div className="mobile-detail-item">
              <span className="mobile-detail-label">Описание:</span>
              <span className="mobile-detail-value description-text">{usefulness.description}</span>
            </div>
          )}
          
          <div className="mobile-detail-item">
            <span className="mobile-detail-label">Статус:</span>
            <span className="mobile-detail-value">
              {usefulness.is_active ? (
                <span style={{ color: '#28a745', fontWeight: 'bold' }}>Активна</span>
              ) : (
                <span style={{ color: '#dc3545', fontWeight: 'bold' }}>Неактивна</span>
              )}
            </span>
          </div>
          
          <div className="mobile-detail-item">
            <span className="mobile-detail-label">Порядок отображения:</span>
            <span className="mobile-detail-value">{usefulness.display_order}</span>
          </div>
          
          <div className="mobile-detail-item">
            <span className="mobile-detail-label">Дата создания:</span>
            <span className="mobile-detail-value">{formatDate(usefulness.created_at)}</span>
          </div>
          
          <div className="mobile-detail-item">
            <span className="mobile-detail-label">Дата обновления:</span>
            <span className="mobile-detail-value">{formatDate(usefulness.updated_at)}</span>
          </div>
        </div>
      </div>

      {/* Информация о полезности */}
      <div className="relationships-section">
        <h3>О полезности</h3>
        <div className="relationship-card" style={{ padding: '15px' }}>
          <p style={{ color: '#666', margin: 0, lineHeight: '1.6' }}>
            Полезности — это дополнительные материалы, которые могут пригодиться в работе.
            Здесь можно хранить заметки, ссылки, методики и другую полезную информацию.
          </p>
        </div>
      </div>

      {/* Media Manager - для загрузки медиафайлов */}
      <MediaManager 
        entityType="usefulness"
        entityId={id}
        entityName={usefulness.name}
        showTitle={true}
        readonly={true}
      />

      <hr className="separator" />
      <p className="detail-id"><strong>ID полезности:</strong> {usefulness.id}</p>
    </div>
  );
}

export default UsefulnessDetail;