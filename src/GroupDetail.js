// GroupDetail.js - полностью на новой БД
import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import API_URL from './config/api';
import MediaManager from './MediaManager';
import './App.css';

function GroupDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [muscles, setMuscles] = useState([]);
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
        // 1. Загружаем данные группы
        const groupRes = await fetch(`${API_URL}/api/group/${id}`);
        const groupResult = await groupRes.json();
        if (!groupResult.success) throw new Error(groupResult.error);
        setGroup(groupResult.data);

        // 2. Загружаем мышцы группы (с сортировкой по display_order)
        const membersRes = await fetch(`${API_URL}/api/group/${id}/members`);
        const membersResult = await membersRes.json();
        
        if (membersResult.success && membersResult.data.length > 0) {
          // Загружаем полные данные для каждой мышцы
          const musclesPromises = membersResult.data.map(async (muscleId) => {
            const muscleRes = await fetch(`${API_URL}/api/muscle/${muscleId}`);
            const muscleResult = await muscleRes.json();
            return muscleResult.success ? muscleResult.data : null;
          });
          
          const musclesData = await Promise.all(musclesPromises);
          setMuscles(musclesData.filter(m => m !== null));
        } else {
          setMuscles([]);
        }
      } catch (error) {
        console.error('Error loading group:', error);
        alert('Ошибка загрузки данных: ' + error.message);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [id]);

  if (loading) return <div className="detail-container">Загрузка...</div>;
  if (!group) return <div className="detail-container">Группа не найдена</div>;

  return (
    <div className={`detail-container ${isMobile ? 'mobile-view' : ''}`}>
      <div className="detail-navigation">
        <Link to="/groups" className="link-text">← Назад к списку групп</Link>
        <button 
          onClick={() => navigate(`/group/${id}/edit`)}
          className="action-btn edit-btn"
          title="Редактировать"
        >
          ✏️
        </button>
      </div>

      <h1 className="detail-title">{group.name}</h1>
      
      <div className="detail-content">
        <table className="detail-table">
          <tbody>
            <tr><td className="detail-label">Тип:</td><td className="detail-value">{group.type || 'Не указан'}</td></tr>
            {group.description && (
              <tr><td className="detail-label">Описание:</td><td className="detail-value description-text">{group.description}</td></tr>
            )}
          </tbody>
        </table>
        
        <div className="mobile-detail">
          <div className="mobile-detail-item">
            <span className="mobile-detail-label">Тип:</span>
            <span className="mobile-detail-value">{group.type || 'Не указан'}</span>
          </div>
          {group.description && (
            <div className="mobile-detail-item">
              <span className="mobile-detail-label">Описание:</span>
              <span className="mobile-detail-value description-text">{group.description}</span>
            </div>
          )}
        </div>
      </div>

      <div className="relationships-section">
        <h3>Мышцы в группе ({muscles.length})</h3>
        {muscles.length > 0 ? (
          <div className="muscle-grid">
            {muscles.map(muscle => (
              <div key={muscle.id} className="muscle-card">
                <h4 className="muscle-card-title">
                  <Link to={`/muscle/${muscle.id}`} className="link-text">
                    {muscle.name_ru}
                  </Link>
                  {muscle.name_lat && (
                    <span className="muscle-card-subtitle"> ({muscle.name_lat})</span>
                  )}
                </h4>
                {muscle.origin && (
                  <div className="muscle-card-detail">
                    <strong>Начало:</strong> {muscle.origin.length > 100 ? muscle.origin.substring(0, 100) + '...' : muscle.origin}
                  </div>
                )}
                {muscle.insertion && (
                  <div className="muscle-card-detail">
                    <strong>Прикрепление:</strong> {muscle.insertion.length > 100 ? muscle.insertion.substring(0, 100) + '...' : muscle.insertion}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="empty-value">В группе нет мышц</p>
        )}
      </div>

      <MediaManager 
        entityType="muscle_group"
        entityId={id}
        entityName={group.name}
        showTitle={true}
        readonly={true}
      />

      <hr className="separator" />
      <p className="detail-id"><strong>ID группы:</strong> {group.id}</p>
    </div>
  );
}

export default GroupDetail;