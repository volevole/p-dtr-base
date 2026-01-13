// factories/EntityDetailFactory.js - ИСПРАВЛЕННАЯ ВЕРСИЯ
import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../utils/supabaseClient';
import MediaManager from '../MediaManager';

export function createEntityDetail(config) {
  return function EntityDetailComponent() {
    const {
      entityName,
      entityType,
      tableName,
      fields = [],
      relatedTables = [],
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

    useEffect(() => {
      fetchData();
    }, [id]);

    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Основной запрос
        let query = supabase
          .from(tableName)
          .select('*')
          .eq('id', id);

        if (relatedTables.length > 0) {
          const relatedFields = relatedTables.map(rel => 
            `${rel.table}(${rel.fields || '*'})`
          ).join(',');
          
          query = query.select(`*, ${relatedFields}`);
        }

        const { data, error } = await query.single();

        if (error) throw error;
        if (!data) throw new Error(`${entityName} не найден`);

        setEntity(data);

        // Загружаем связанные данные (если указано)
        if (fetchRelatedData) {
          const related = await fetchRelatedData(data);
          setRelatedData(related);
        }
      } catch (error) {
        console.error(`Error loading ${entityName}:`, error);
      } finally {
        setLoading(false);
      }
    };

    if (loading) return <div style={{ padding: '2rem' }}>Загрузка...</div>;
    if (!entity) return <div style={{ padding: '2rem' }}>{entityName} не найден</div>;

    // Ключевое исправление: правильный путь для кнопки редактирования
    const editPath = `/${entityType}/${id}/edit`;
    const backPath = `/${entityType}s`;

    return (
      <div style={{ padding: '2rem', maxWidth: '1000px', margin: 'auto' }}>
        {/* Навигация и кнопка редактирования */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px' 
        }}>
          <Link to={backPath}>← Назад к списку</Link>
          <button 
            onClick={() => navigate(editPath)}
            style={{
              padding: '8px 16px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '5px'
            }}
          >
            ✏️ Редактировать
          </button>
        </div>

        {/* Заголовок */}
        <h1 style={{ marginBottom: '20px' }}>{entity.name}</h1>

        {/* Основная информация */}
        <div style={{ 
          backgroundColor: '#f8f9fa',
          padding: '20px',
          borderRadius: '8px',
          marginBottom: '30px',
          border: '1px solid #dee2e6'
        }}>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: '180px 1fr',
            gap: '15px',
            alignItems: 'start'
          }}>
            {fields.map(field => {
              if (!entity[field.name]) return null;
              
              return (
                <React.Fragment key={field.name}>
                  <div style={{ 
                    display: 'flex',
                    alignItems: field.type === 'textarea' ? 'flex-start' : 'center',
                    height: '100%',
                    fontWeight: 'bold', 
                    color: '#495057',
                    textAlign: 'left'
                  }}>
                    {field.label}:
                  </div>
                  <div style={{ 
                    color: '#212529',
                    textAlign: 'left',
                    ...(field.type === 'textarea' ? {
                      lineHeight: '1.6',
                      whiteSpace: 'pre-wrap'
                    } : {})
                  }}>
                    {field.render 
                      ? field.render(entity[field.name], entity)
                      : entity[field.name]
                    }
                  </div>
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Кастомный контент */}
        {renderCustomContent && renderCustomContent(entity, relatedData)}

        {/* Медиафайлы */}
        {hasMedia && (
          <MediaManager 
            entityType={entityType}
            entityId={id}
            entityName={entity.name}
            showTitle={true}
            readonly={true}
          />
        )}

        {/* Связанные данные */}
        {renderRelatedData && renderRelatedData(relatedData, entity)}

        {/* Техническая информация */}
        <div style={{ 
          marginTop: '30px', 
          paddingTop: '20px',
          borderTop: '1px solid #dee2e6',
          fontSize: '14px',
          color: '#6c757d'
        }}>
          <p><strong>ID:</strong> {entity.id}</p>
          <p><strong>Создан:</strong> {new Date(entity.created_at).toLocaleString('ru-RU')}</p>
          {entity.updated_at && (
            <p><strong>Обновлен:</strong> {new Date(entity.updated_at).toLocaleString('ru-RU')}</p>
          )}
        </div>
      </div>
    );
  };
}