// ReceptorClassDetail.js - адаптивная версия с использованием существующих стилей
import React, { useState, useEffect } from 'react';
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

function ReceptorClassDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [receptorClass, setReceptorClass] = useState(null);
  const [receptors, setReceptors] = useState([]);
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
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      // Загрузка класса рецепторов
      const { data: classData, error: classError } = await supabase
        .from('receptor_classes')
        .select('*')
        .eq('id', id)
        .single();

      if (classError) throw classError;

      // Загрузка рецепторов этого класса с сортировкой по display_order
      const { data: receptorsData, error: receptorsError } = await supabase
        .from('receptors')
        .select('*')
        .eq('class_id', id)
        .eq('is_active', true)
        .order('display_order', { ascending: true, nullsFirst: false });

      if (receptorsError) throw receptorsError;

      setReceptorClass(classData);
      setReceptors(receptorsData || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="detail-container">Загрузка...</div>;
  if (!receptorClass) return <div className="detail-container">Класс рецепторов не найден</div>;

  return (
    <div className={`detail-container ${isMobile ? 'mobile-view' : ''}`}>
      {/* Навигация */}
      <div className="detail-navigation">
        <Link to="/receptor-classes" className="link-text">← Назад к списку</Link>
        <button 
          onClick={() => navigate(`/receptor-class/${id}/edit`)}
          className="action-btn edit-btn"
          title="Редактировать"
        >
          ✏️ Редактировать
        </button>
      </div>

      <h1 className="detail-title">{receptorClass.name}</h1>

      {/* ===== АДАПТИВНОЕ ОТОБРАЖЕНИЕ ДАННЫХ КЛАССА ===== */}
      <div className="detail-content">
        {/* Десктопная таблица */}
        <table className="detail-table">
          <tbody>
            {receptorClass.antistimulus && (
              <tr>
                <td className="detail-label">Антистимул:</td>
                <td className="detail-value description-text">{receptorClass.antistimulus}</td>
              </tr>
            )}
            
            {receptorClass.description && (
              <tr>
                <td className="detail-label">Описание:</td>
                <td className="detail-value description-text">{receptorClass.description}</td>
              </tr>
            )}
            
            {receptorClass.display_order > 0 && (
              <tr>
                <td className="detail-label">Порядок отображения:</td>
                <td className="detail-value">{receptorClass.display_order}</td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Мобильная версия - вертикальные блоки */}
        <div className="mobile-detail">
          {receptorClass.antistimulus && (
            <div className="mobile-detail-item">
              <span className="mobile-detail-label">Антистимул:</span>
              <span className="mobile-detail-value description-text">{receptorClass.antistimulus}</span>
            </div>
          )}
          
          {receptorClass.description && (
            <div className="mobile-detail-item">
              <span className="mobile-detail-label">Описание:</span>
              <span className="mobile-detail-value description-text">{receptorClass.description}</span>
            </div>
          )}
          
          {receptorClass.display_order > 0 && (
            <div className="mobile-detail-item">
              <span className="mobile-detail-label">Порядок отображения:</span>
              <span className="mobile-detail-value">{receptorClass.display_order}</span>
            </div>
          )}
        </div>
      </div>

      {/* Media Manager */}
      <MediaManager 
        entityType="receptor_class"
        entityId={id}
        entityName={receptorClass.name}
        showTitle={true}
        readonly={true}
      />

      {/* Рецепторы этого класса */}
      <div className="relationships-section">
        <h3>
          Рецепторы этого класса
          <span style={{ fontSize: '14px', color: '#666', marginLeft: '10px' }}>
            ({receptors.length})
          </span>
        </h3>

        {receptors.length === 0 ? (
          <div className="empty-value" style={{ 
            padding: '20px', 
            backgroundColor: '#f8f9fa',
            borderRadius: '8px',
            textAlign: 'center',
            fontStyle: 'italic'
          }}>
            Нет рецепторов в этом классе
          </div>
        ) : (
          <div className="muscle-grid">
            {receptors.map(receptor => (
              <div 
                key={receptor.id}
                className="relationship-card"
                style={{ padding: '15px' }}
              >
                <h4 style={{ margin: '0 0 10px 0' }}>
                  <Link 
                    to={`/receptor/${receptor.id}`}
                    className="link-text"
                  >
                    {receptor.name}
                  </Link>
                </h4>

                <div className="muscle-card-detail">
                  {receptor.location && (
                    <div className="relationship-group" style={{ marginBottom: '5px' }}>
                      <strong>Место нахождения:</strong> {truncateText(receptor.location, isMobile ? 100 : 200)}
                    </div>
                  )}

                  {receptor.own_stimulus && (
                    <div className="relationship-group" style={{ marginBottom: '5px' }}>
                      <strong>Собственный стимул:</strong> {truncateText(receptor.own_stimulus, isMobile ? 100 : 200)}
                    </div>
                  )}

                  {receptor.antistimulus && (
                    <div className="relationship-group" style={{ marginBottom: '5px' }}>
                      <strong>Антистимул:</strong> {truncateText(receptor.antistimulus, isMobile ? 100 : 200)}
                    </div>
                  )}
                </div>

                {receptor.description && (
                  <div className="muscle-card-notes">
                    {truncateText(receptor.description, isMobile ? 100 : 200)}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Дополнительная информация */}
      <div className="separator" style={{ marginTop: '30px' }} />
      <div className="detail-id">
        <p><strong>ID класса:</strong> {receptorClass.id}</p>
        <p><strong>Создан:</strong> {new Date(receptorClass.created_at).toLocaleString('ru-RU')}</p>
        {receptorClass.updated_at && (
          <p><strong>Обновлен:</strong> {new Date(receptorClass.updated_at).toLocaleString('ru-RU')}</p>
        )}
      </div>
    </div>
  );
}

export default ReceptorClassDetail;