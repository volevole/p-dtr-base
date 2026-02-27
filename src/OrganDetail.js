// OrganDetail.js - исправленная версия
import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from './utils/supabaseClient';
import MediaManager from './MediaManager'; 
import './App.css';

// Функция для обрезания длинного текста (для мобильной версии)
const truncateText = (text, maxLength = 200) => {
  if (!text) return text;
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

function OrganDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [organ, setOrgan] = useState(null);
  const [muscles, setMuscles] = useState([]);
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
        // 1. Сначала загружаем данные органа
        const { data: organData, error: organError } = await supabase
          .from('organs')
          .select('*')
          .eq('id', id)
          .single();

        if (organError) throw organError;

        // 2. СРАЗУ устанавливаем орган
        setOrgan(organData);

        // 3. Загружаем мышцы, связанные с этим органом
        const { data: musclesData, error: musclesError } = await supabase
          .from('muscle_organs')
          .select(`
            muscle:muscles(
              id,
              name_ru,
              name_lat,
              origin,
              insertion,
              indicator,
              notes,
              pain_zones_text,
              display_order
            )
          `)
          .eq('organ_id', id)
          .order('muscles(display_order)', { ascending: true, nullsFirst: false });

        if (musclesError) throw musclesError;

        // 4. Сортируем мышцы и устанавливаем
        const sortedMuscles = (musclesData?.map(item => item.muscle) || [])
          .sort((a, b) => (a.display_order ?? 999) - (b.display_order ?? 999));
        
        setMuscles(sortedMuscles);
        
      } catch (error) {
        console.error('Ошибка загрузки данных:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [id]);

  if (loading) return <div className="detail-container">Загрузка...</div>;
  if (!organ) return <div className="detail-container">Орган не найден</div>;

  return (
    <div className={`detail-container ${isMobile ? 'mobile-view' : ''}`}>
      {/* Навигация */}
      <div className="detail-navigation">
        <Link to="/organs" className="link-text">← Назад к списку</Link>
        <button 
          onClick={() => navigate(`/organ/${id}/edit`)}
          className="action-btn edit-btn"
          title="Редактировать"
        >
          ✏️
        </button>
      </div>

      <h1 className="detail-title">
        <small>Орган : </small>{organ.name}
        {organ.name_lat && <span className="detail-subtitle"> ({organ.name_lat})</span>}
        {organ.code && <span className="detail-subtitle" style={{ marginLeft: '10px' }}>[{organ.code}]</span>}
      </h1>

      {/* ===== АДАПТИВНОЕ ОТОБРАЖЕНИЕ ДАННЫХ ОРГАНА ===== */}
      <div className="detail-content">
        {/* Десктопная таблица */}
        <table className="detail-table">
          <tbody>
            {organ.system && (
              <tr><td className="detail-label">Система:</td><td className="detail-value">{organ.system}</td></tr>
            )}
            {organ.description && (
              <tr><td className="detail-label">Описание:</td><td className="detail-value description-text">{organ.description}</td></tr>
            )}
            {organ.functions && (
              <tr><td className="detail-label">Функции:</td><td className="detail-value description-text">{organ.functions}</td></tr>
            )}
            {organ.symptoms && (
              <tr><td className="detail-label">Симптомы дисфункции:</td><td className="detail-value description-text">{organ.symptoms}</td></tr>
            )}
            {organ.diagnostic && (
              <tr><td className="detail-label">Диагностика:</td><td className="detail-value description-text">{organ.diagnostic}</td></tr>
            )}
            {organ.treatment && (
              <tr><td className="detail-label">Лечение:</td><td className="detail-value description-text">{organ.treatment}</td></tr>
            )}
            {organ.notes && (
              <tr><td className="detail-label">Примечания:</td><td className="detail-value description-text">{organ.notes}</td></tr>
            )}
          </tbody>
        </table>

        {/* Мобильная версия - вертикальные блоки */}
        <div className="mobile-detail">
          {organ.system && (
            <div className="mobile-detail-item">
              <span className="mobile-detail-label">Система:</span>
              <span className="mobile-detail-value">{organ.system}</span>
            </div>
          )}
          {organ.description && (
            <div className="mobile-detail-item">
              <span className="mobile-detail-label">Описание:</span>
              <span className="mobile-detail-value description-text">{organ.description}</span>
            </div>
          )}
          {organ.functions && (
            <div className="mobile-detail-item">
              <span className="mobile-detail-label">Функции:</span>
              <span className="mobile-detail-value description-text">{organ.functions}</span>
            </div>
          )}
          {organ.symptoms && (
            <div className="mobile-detail-item">
              <span className="mobile-detail-label">Симптомы дисфункции:</span>
              <span className="mobile-detail-value description-text">{organ.symptoms}</span>
            </div>
          )}
          {organ.diagnostic && (
            <div className="mobile-detail-item">
              <span className="mobile-detail-label">Диагностика:</span>
              <span className="mobile-detail-value description-text">{organ.diagnostic}</span>
            </div>
          )}
          {organ.treatment && (
            <div className="mobile-detail-item">
              <span className="mobile-detail-label">Лечение:</span>
              <span className="mobile-detail-value description-text">{organ.treatment}</span>
            </div>
          )}
          {organ.notes && (
            <div className="mobile-detail-item">
              <span className="mobile-detail-label">Примечания:</span>
              <span className="mobile-detail-value description-text">{organ.notes}</span>
            </div>
          )}
        </div>
      </div>

      {/* Связанные мышцы */}
      <div className="relationships-section">
        <h3>
          Связанные мышцы
          <span style={{ fontSize: '14px', color: '#666', marginLeft: '10px' }}>
            ({muscles.length})
          </span>
        </h3>

        {muscles.length === 0 ? (
          <p className="empty-value" style={{ fontStyle: 'italic' }}>Нет связанных мышц</p>
        ) : (
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', 
            gap: '15px',
            marginTop: '15px'
          }}>
            {muscles.map(muscle => (
              <div 
                key={muscle.id}
                className="relationship-card"
                style={{ padding: '15px' }}
              >
                <h4 style={{ margin: '0 0 10px 0' }}>
                  <Link to={`/muscle/${muscle.id}`} className="link-text">
                    {muscle.name_ru}
                  </Link>
                  {muscle.name_lat && (
                    <span style={{ 
                      fontSize: '14px', 
                      color: '#666',
                      marginLeft: '5px',
                      fontWeight: 'normal'
                    }}>
                      ({muscle.name_lat})
                    </span>
                  )}
                </h4>

                {muscle.origin && (
                  <div className="relationship-group" style={{ marginBottom: '5px' }}>
                    <strong>Начало:</strong> {truncateText(muscle.origin, isMobile ? 100 : 200)}
                  </div>
                )}

                {muscle.insertion && (
                  <div className="relationship-group" style={{ marginBottom: '5px' }}>
                    <strong>Прикрепление:</strong> {truncateText(muscle.insertion, isMobile ? 100 : 200)}
                  </div>
                )}

                {muscle.indicator && (
                  <div className="relationship-group" style={{ marginBottom: '5px' }}>
                    <strong>Индикатор:</strong> {muscle.indicator}
                  </div>
                )}

                {muscle.pain_zones_text && (
                  <div className="relationship-group" style={{ marginBottom: '5px' }}>
                    <strong>Зоны боли:</strong> {truncateText(muscle.pain_zones_text, isMobile ? 100 : 200)}
                  </div>
                )}

                {muscle.notes && (
                  <div className="relationship-group" style={{ 
                    marginTop: '10px', 
                    padding: '8px',
                    backgroundColor: '#f0f0f0',
                    borderRadius: '4px',
                    fontSize: '14px'
                  }}>
                    <strong>Примечание:</strong> {truncateText(muscle.notes, isMobile ? 100 : 200)}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Media Manager */}
      <MediaManager 
        entityType="organ"
        entityId={id}
        entityName={organ.name}
        showTitle={true}
        readonly={true}
      />

      <hr className="separator" />
      <p className="detail-id"><strong>ID органа:</strong> {organ.id}</p>
    </div>
  );
}

export default OrganDetail;