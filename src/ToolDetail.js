// ToolDetail.js - адаптивная версия с использованием существующих стилей
import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from './utils/supabaseClient';
import MediaManager from './MediaManager';
import './App.css';

function ToolDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tool, setTool] = useState(null);
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
      const { data, error } = await supabase
        .from('tools')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setTool(data);
    } catch (error) {
      console.error('Error loading tool:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="detail-container">Загрузка...</div>;
  if (!tool) return <div className="detail-container">Инструмент не найден</div>;

  return (
    <div className={`detail-container ${isMobile ? 'mobile-view' : ''}`}>
      {/* Навигация */}
      <div className="detail-navigation">
        <Link to="/tools" className="link-text">← Назад к списку</Link>
        <button 
          onClick={() => navigate(`/tool/${id}/edit`)}
          className="action-btn edit-btn"
          title="Редактировать"
        >
          ✏️ Редактировать
        </button>
      </div>

      <h1 className="detail-title">{tool.name}</h1>

      {/* ===== АДАПТИВНОЕ ОТОБРАЖЕНИЕ ДАННЫХ ИНСТРУМЕНТА ===== */}
      <div className="detail-content">
        {/* Десктопная таблица */}
        <table className="detail-table">
          <tbody>
            {tool.display_order > 0 && (
              <tr>
                <td className="detail-label">Порядок отображения:</td>
                <td className="detail-value">{tool.display_order}</td>
              </tr>
            )}

            {tool.description && (
              <tr>
                <td className="detail-label">Описание:</td>
                <td className="detail-value description-text">{tool.description}</td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Мобильная версия - вертикальные блоки */}
        <div className="mobile-detail">
          {tool.display_order > 0 && (
            <div className="mobile-detail-item">
              <span className="mobile-detail-label">Порядок отображения:</span>
              <span className="mobile-detail-value">{tool.display_order}</span>
            </div>
          )}

          {tool.description && (
            <div className="mobile-detail-item">
              <span className="mobile-detail-label">Описание:</span>
              <span className="mobile-detail-value description-text">{tool.description}</span>
            </div>
          )}
        </div>
      </div>

      {/* Media Manager */}
      <MediaManager 
        entityType="tool"
        entityId={id}
        entityName={tool.name}
        showTitle={true}
        readonly={true}
      />

      {/* Дополнительная информация */}
      <div className="separator" style={{ marginTop: '30px' }} />
      <div className="detail-id">
        <p><strong>ID инструмента:</strong> {tool.id}</p>
        <p><strong>Создан:</strong> {new Date(tool.created_at).toLocaleString('ru-RU')}</p>
        {tool.updated_at && (
          <p><strong>Обновлен:</strong> {new Date(tool.updated_at).toLocaleString('ru-RU')}</p>
        )}
      </div>
    </div>
  );
}

export default ToolDetail;