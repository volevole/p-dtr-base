// factories/EntityDetailFactory.js - исправленная версия
import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import API_URL from '../config/api';
import MediaManager from '../MediaManager';

export function createEntityDetail(config) {
  return function EntityDetailComponent() {
    const {
      entityName,
      entityType,
      tableName,
      fields = [],
      hasMedia = true,
      renderCustomContent = null,
      fetchRelatedData = null,
      renderRelatedData = null
    } = config;

    const { id } = useParams();
    const navigate = useNavigate();
    const [entity, setEntity] = useState(null);
    const [relatedData, setRelatedData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
      const checkMobile = () => setIsMobile(window.innerWidth <= 768);
      checkMobile();
      window.addEventListener('resize', checkMobile);
      return () => window.removeEventListener('resize', checkMobile);
    }, []);

    useEffect(() => {
      fetchData();
    }, [id]);

    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${API_URL}/api/${tableName}/${id}`);
        const result = await response.json();
        if (!result.success) throw new Error(result.error);
        if (!result.data) throw new Error(`${entityName} не найден`);

        setEntity(result.data);

        if (fetchRelatedData) {
          const related = await fetchRelatedData(result.data);
          setRelatedData(related);
        }
      } catch (error) {
        console.error(`Error loading ${entityName}:`, error);
      } finally {
        setLoading(false);
      }
    };

    if (loading) return <div className="detail-container">Загрузка...</div>;
    if (!entity) return <div className="detail-container">{entityName} не найден</div>;

    return (
      <div className={`detail-container ${isMobile ? 'mobile-view' : ''}`}>
        <div className="detail-navigation">
          <Link to={config.listPath || `/${entityType}s`} className="link-text">← Назад к списку</Link>
          <button 
            onClick={() => navigate(`/${entityType}/${id}/edit`)}
            className="action-btn edit-btn"
            title="Редактировать"
          >
            ✏️
          </button>
        </div>

        <h1 className="detail-title">{entity.name}</h1>

        <div className="detail-content">
          <table className="detail-table">
            <tbody>
              {fields.map(field => {
                const value = entity[field.name];
                if (!value && value !== 0) return null;
                return (
                  <tr key={field.name}>
                    <td className="detail-label">{field.label}:</td>
                    <td className={`detail-value ${field.type === 'textarea' ? 'description-text' : ''}`}>
                      {field.render ? field.render(value, entity) : value}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          
          <div className="mobile-detail">
            {fields.map(field => {
              const value = entity[field.name];
              if (!value && value !== 0) return null;
              return (
                <div key={field.name} className="mobile-detail-item">
                  <span className="mobile-detail-label">{field.label}:</span>
                  <span className={`mobile-detail-value ${field.type === 'textarea' ? 'description-text' : ''}`}>
                    {field.render ? field.render(value, entity) : value}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {renderCustomContent && renderCustomContent(entity, relatedData)}

        {hasMedia && (
          <MediaManager 
            entityType={entityType}
            entityId={id}
            entityName={entity.name}
            showTitle={true}
            readonly={true}
          />
        )}

        {renderRelatedData && renderRelatedData(relatedData, entity)}

        <hr className="separator" />
        <p className="detail-id"><strong>ID:</strong> {entity.id}</p>
        <p className="detail-id"><strong>Создан:</strong> {new Date(entity.created_at).toLocaleString('ru-RU')}</p>
        {entity.updated_at && (
          <p className="detail-id"><strong>Обновлен:</strong> {new Date(entity.updated_at).toLocaleString('ru-RU')}</p>
        )}
      </div>
    );
  };
}