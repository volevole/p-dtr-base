// OrganDetail.js
import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from './utils/supabaseClient';
import MediaManager from './MediaManager'; 

function OrganDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [organ, setOrgan] = useState(null);
  const [muscles, setMuscles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);

      try {
        // 1. Загружаем данные органа
        const { data: organData, error: organError } = await supabase
          .from('organs')
          .select('*')
          .eq('id', id)
          .single();

        if (organError) throw organError;

        // 2. Загружаем мышцы, связанные с этим органом
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
              pain_zones_text
            )
          `)
          .eq('organ_id', id);

        if (musclesError) throw musclesError;

        setOrgan(organData);
        setMuscles(musclesData?.map(item => item.muscle) || []);
      } catch (error) {
        console.error('Ошибка загрузки данных:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [id]);

  if (loading) return <div style={{ padding: '2rem' }}>Загрузка...</div>;
  if (!organ) return <div style={{ padding: '2rem' }}>Орган не найден</div>;

  const cellStyle = {         
    paddingTop: '12px',
    padding: '5px',
    verticalAlign: 'top'
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1000px', margin: 'auto' }}>      
	<div style={{ marginBottom: '20px' }}>
	  <Link to="/organs">← Назад к списку</Link>
	  <button 
		onClick={() => navigate(`/organ/${id}/edit`)}
		style={{
		  marginLeft: '15px',
		  padding: '5px 10px',
		  backgroundColor: '#007bff',
		  color: 'white',
		  border: 'none',
		  borderRadius: '4px',
		  cursor: 'pointer'
		}}
	  >
		 ✏️
	  </button>
	</div>


      <h1>
        <small>Орган : </small>{organ.name}
        {organ.name_lat && <span style={{ fontWeight: 'normal' }}> ({organ.name_lat})</span>}
        {organ.code && <span style={{ fontWeight: 'normal', marginLeft: '10px' }}>[{organ.code}]</span>}
      </h1>

      <table style={{ width: '100%', marginBottom: '30px' }}>
        <tbody>
          {organ.system && (
            <tr>
              <td style={cellStyle}><strong>Система:</strong></td>
              <td style={cellStyle}>{organ.system}</td>
            </tr>
          )}
          {organ.description && (
            <tr>
              <td style={cellStyle}><strong>Описание:</strong></td>
              <td style={cellStyle}>{organ.description}</td>
            </tr>
          )}
          {organ.functions && (
            <tr>
              <td style={cellStyle}><strong>Функции:</strong></td>
              <td style={cellStyle}>{organ.functions}</td>
            </tr>
          )}
          {organ.symptoms && (
            <tr>
              <td style={cellStyle}><strong>Симптомы дисфункции:</strong></td>
              <td style={cellStyle}>{organ.symptoms}</td>
            </tr>
          )}
          {organ.diagnostic && (
            <tr>
              <td style={cellStyle}><strong>Диагностика:</strong></td>
              <td style={cellStyle}>{organ.diagnostic}</td>
            </tr>
          )}
          {organ.treatment && (
            <tr>
              <td style={cellStyle}><strong>Лечение:</strong></td>
              <td style={cellStyle}>{organ.treatment}</td>
            </tr>
          )}
          {organ.notes && (
            <tr>
              <td style={cellStyle}><strong>Примечания:</strong></td>
              <td style={cellStyle}>{organ.notes}</td>
            </tr>
          )}
        </tbody>
      </table>

      <div style={{ marginTop: '30px' }}>
        <h2>
          Связанные мышцы
          <span style={{ fontSize: '14px', color: '#666', marginLeft: '10px' }}>
            ({muscles.length})
          </span>
        </h2>

        {muscles.length === 0 ? (
          <p style={{ color: '#666', fontStyle: 'italic' }}>Нет связанных мышц</p>
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
                style={{
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  padding: '15px',
                  backgroundColor: '#f9f9f9'
                }}
              >
                <h3 style={{ margin: '0 0 10px 0' }}>
                  <Link 
                    to={`/muscle/${muscle.id}`}
                    style={{ 
                      color: '#1976d2', 
                      textDecoration: 'none'
                    }}
                  >
                    {muscle.name_ru}
                  </Link>
                  {muscle.name_lat && (
                    <span style={{ 
                      fontSize: '14px', 
                      color: '#666',
                      marginLeft: '5px'
                    }}>
                      ({muscle.name_lat})
                    </span>
                  )}
                </h3>

                {muscle.origin && (
                  <div style={{ marginBottom: '5px' }}>
                    <strong>Начало:</strong> {muscle.origin}
                  </div>
                )}

                {muscle.insertion && (
                  <div style={{ marginBottom: '5px' }}>
                    <strong>Прикрепление:</strong> {muscle.insertion}
                  </div>
                )}

                {muscle.indicator && (
                  <div style={{ marginBottom: '5px' }}>
                    <strong>Индикатор:</strong> {muscle.indicator}
                  </div>
                )}

                {muscle.pain_zones_text && (
                  <div style={{ marginBottom: '5px' }}>
                    <strong>Зоны боли:</strong> {muscle.pain_zones_text}
                  </div>
                )}

                {muscle.notes && (
                  <div style={{ 
                    marginTop: '10px', 
                    padding: '8px',
                    backgroundColor: '#f0f0f0',
                    borderRadius: '4px',
                    fontSize: '14px'
                  }}>
                    <strong>Примечание:</strong> {muscle.notes}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

	 {/* ========== ДОБАВЛЯЕМ MEDIA MANAGER ДЛЯ ОРГАНА ========== */}
	  <MediaManager 
		entityType="organ"
		entityId={id}
		entityName={organ.name}
		showTitle={true}
		readonly={true}
	  />
	  {/* ========== КОНЕЦ ДОБАВЛЕНИЯ ========== */}


      <hr style={{ margin: '30px 0' }} />
      <p><strong>ID органа:</strong> {organ.id}</p>
    </div>
  );
}

export default OrganDetail;