// ReceptorDetail.js - адаптивная версия с использованием существующих стилей
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

function ReceptorDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [receptor, setReceptor] = useState(null);
  const [receptorClass, setReceptorClass] = useState(null);
  const [receptorPairs, setReceptorPairs] = useState([]);
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
      // Сначала устанавливаем receptor
      const { data: receptorData, error: receptorError } = await supabase
        .from('receptors')
        .select('*')
        .eq('id', id)
        .single();

      if (receptorError) throw receptorError;

      setReceptor(receptorData);

      // Загружаем класс рецептора
      let classData = null;
      if (receptorData.class_id) {
        const { data: classDataResponse, error: classError } = await supabase
          .from('receptor_classes')
          .select('*')
          .eq('id', receptorData.class_id)
          .single();

        if (!classError) {
          classData = classDataResponse;
        }
      }

      // Загружаем парные рецепторы
      const { data: pairsData, error: pairsError } = await supabase
        .from('receptor_pairs')
        .select(`
          *,
          paired_receptor:receptors!receptor_pairs_paired_receptor_id_fkey(*),
          paired_class:receptor_classes!receptor_pairs_paired_class_id_fkey(*)
        `)
        .eq('receptor_id', id)
        .order('created_at');

      if (pairsError) throw pairsError;

      setReceptorClass(classData);
      setReceptorPairs(pairsData || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPairDisplayName = (pair) => {
    if (pair.paired_receptor) {
      return pair.paired_receptor.name;
    } else if (pair.paired_class) {
      return pair.paired_class.name + ' (весь класс)';
    }
    return 'Не указано';
  };

  const getPairTypeLabel = (pairType) => {
    switch (pairType) {
      case 'receptor': return 'Парный рецептор';
      case 'class': return 'Парный класс';
      default: return pairType || 'Не указан';
    }
  };

  if (loading) return <div className="detail-container">Загрузка...</div>;
  if (!receptor) return <div className="detail-container">Рецептор не найден</div>;

  return (
    <div className={`detail-container ${isMobile ? 'mobile-view' : ''}`}>
      {/* Навигация */}
      <div className="detail-navigation">
        <Link to="/receptors" className="link-text">← Назад к списку</Link>
        <button 
          onClick={() => navigate(`/receptor/${id}/edit`)}
          className="action-btn edit-btn"
          title="Редактировать"
        >
          ✏️ Редактировать
        </button>
      </div>

      <h1 className="detail-title">{receptor.name}</h1>

      {/* ===== АДАПТИВНОЕ ОТОБРАЖЕНИЕ ДАННЫХ РЕЦЕПТОРА ===== */}
      <div className="detail-content">
        {/* Десктопная таблица */}
        <table className="detail-table">
          <tbody>
            {receptorClass && (
              <tr>
                <td className="detail-label">Класс рецепторов:</td>
                <td className="detail-value">
                  <Link to={`/receptor-class/${receptorClass.id}`} className="link-text">
                    {receptorClass.name}
                  </Link>
                </td>
              </tr>
            )}

            {receptor.location && (
              <tr>
                <td className="detail-label">Место нахождения:</td>
                <td className="detail-value">{receptor.location}</td>
              </tr>
            )}

            {receptor.own_stimulus && (
              <tr>
                <td className="detail-label">Собственный стимул:</td>
                <td className="detail-value">{receptor.own_stimulus}</td>
              </tr>
            )}

            {receptor.antistimulus && (
              <tr>
                <td className="detail-label">Антистимул:</td>
                <td className="detail-value">{receptor.antistimulus}</td>
              </tr>
            )}

            {receptor.inhibition_pattern && (
              <tr>
                <td className="detail-label">Паттерн ингибиции:</td>
                <td className="detail-value description-text">{receptor.inhibition_pattern}</td>
              </tr>
            )}

            {receptor.display_order > 0 && (
              <tr>
                <td className="detail-label">Порядок отображения:</td>
                <td className="detail-value">{receptor.display_order}</td>
              </tr>
            )}

            {receptor.description && (
              <tr>
                <td className="detail-label">Описание:</td>
                <td className="detail-value description-text">{receptor.description}</td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Мобильная версия - вертикальные блоки */}
        <div className="mobile-detail">
          {receptorClass && (
            <div className="mobile-detail-item">
              <span className="mobile-detail-label">Класс рецепторов:</span>
              <span className="mobile-detail-value">
                <Link to={`/receptor-class/${receptorClass.id}`} className="link-text">
                  {receptorClass.name}
                </Link>
              </span>
            </div>
          )}

          {receptor.location && (
            <div className="mobile-detail-item">
              <span className="mobile-detail-label">Место нахождения:</span>
              <span className="mobile-detail-value">{receptor.location}</span>
            </div>
          )}

          {receptor.own_stimulus && (
            <div className="mobile-detail-item">
              <span className="mobile-detail-label">Собственный стимул:</span>
              <span className="mobile-detail-value">{receptor.own_stimulus}</span>
            </div>
          )}

          {receptor.antistimulus && (
            <div className="mobile-detail-item">
              <span className="mobile-detail-label">Антистимул:</span>
              <span className="mobile-detail-value">{receptor.antistimulus}</span>
            </div>
          )}

          {receptor.inhibition_pattern && (
            <div className="mobile-detail-item">
              <span className="mobile-detail-label">Паттерн ингибиции:</span>
              <span className="mobile-detail-value description-text">{receptor.inhibition_pattern}</span>
            </div>
          )}

          {receptor.display_order > 0 && (
            <div className="mobile-detail-item">
              <span className="mobile-detail-label">Порядок отображения:</span>
              <span className="mobile-detail-value">{receptor.display_order}</span>
            </div>
          )}

          {receptor.description && (
            <div className="mobile-detail-item">
              <span className="mobile-detail-label">Описание:</span>
              <span className="mobile-detail-value description-text">{receptor.description}</span>
            </div>
          )}
        </div>
      </div>

      {/* Парные рецепторы */}
      {receptorPairs.length > 0 && (
        <div className="relationships-section">
          <h3>
            Парные рецепторы и классы
            <span style={{ fontSize: '14px', color: '#666', marginLeft: '10px' }}>
              ({receptorPairs.length})
            </span>
          </h3>
          
          <div className="muscle-grid">
            {receptorPairs.map(pair => (
              <div 
                key={pair.id}
                className="relationship-card"
                style={{ padding: '15px' }}
              >
                <div className="relationship-group" style={{ marginBottom: '10px' }}>
                  <strong>Тип пары:</strong> {getPairTypeLabel(pair.pair_type)}
                </div>
                
                <div className="relationship-group" style={{ marginBottom: '10px' }}>
                  <strong>Парная сущность:</strong> {getPairDisplayName(pair)}
                  {pair.paired_receptor && (
                    <Link 
                      to={`/receptor/${pair.paired_receptor.id}`}
                      className="link-text"
                      style={{ marginLeft: '5px' }}
                    >
                      (перейти)
                    </Link>
                  )}
                  {pair.paired_class && (
                    <Link 
                      to={`/receptor-class/${pair.paired_class.id}`}
                      className="link-text"
                      style={{ marginLeft: '5px' }}
                    >
                      (перейти)
                    </Link>
                  )}
                </div>
                
                {pair.notes && (
                  <div className="muscle-card-notes">
                    <strong>Примечания:</strong> {truncateText(pair.notes, isMobile ? 100 : 200)}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Media Manager */}
      <MediaManager 
        entityType="receptor"
        entityId={id}
        entityName={receptor.name}
        showTitle={true}
        readonly={true}
      />

      {/* Дополнительная информация */}
      <div className="separator" style={{ marginTop: '30px' }} />
      <div className="detail-id">
        <p><strong>ID рецептора:</strong> {receptor.id}</p>
        <p><strong>Создан:</strong> {new Date(receptor.created_at).toLocaleString('ru-RU')}</p>
        {receptor.updated_at && (
          <p><strong>Обновлен:</strong> {new Date(receptor.updated_at).toLocaleString('ru-RU')}</p>
        )}
      </div>
    </div>
  );
}

export default ReceptorDetail;