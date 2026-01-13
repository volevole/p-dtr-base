// MeridianDetail.js
import React, { useEffect, useState } from 'react';
import { supabase } from './utils/supabaseClient';
import { useParams, Link, useNavigate } from 'react-router-dom';
import MediaManager from './MediaManager';

function MeridianDetail() {
  const { id } = useParams();
   const navigate = useNavigate(); 
  const [meridian, setMeridian] = useState(null);
  const [muscles, setMuscles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);

      try {
        // 1. Загружаем данные меридиана
        const { data: meridianData, error: meridianError } = await supabase
          .from('meridians')
          .select('*')
          .eq('id', id)
          .single();

        if (meridianError) throw meridianError;

        // 2. Загружаем мышцы, связанные с этим меридианом
        const { data: musclesData, error: musclesError } = await supabase
          .from('muscle_meridians')
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
          .eq('meridian_id', id);

        if (musclesError) throw musclesError;

        setMeridian(meridianData);
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
  if (!meridian) return <div style={{ padding: '2rem' }}>Меридиан не найден</div>;

  const cellStyle = {         
    paddingTop: '12px',
    padding: '5px',
    verticalAlign: 'top'
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1000px', margin: 'auto' }}>      
	<div style={{ marginBottom: '20px' }}>
	  <Link to="/meridians">← Назад к списку</Link>
	  <button 
		onClick={() => navigate(`/meridian/${id}/edit`)}
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
        <small>Меридиан : </small> {meridian.name}
        {meridian.name_lat && <span style={{ fontWeight: 'normal' }}> ({meridian.name_lat})</span>}
        {meridian.code && <span style={{ fontWeight: 'normal', marginLeft: '10px' }}>[{meridian.code}]</span>}
      </h1>

      <table style={{ width: '100%', marginBottom: '30px' }}>
        <tbody>
          {meridian.description && (
            <tr>
              <td style={cellStyle}><strong>Описание:</strong></td>
              <td style={cellStyle}>{meridian.description}</td>
            </tr>
          )}
          {meridian.type && (
            <tr>
              <td style={cellStyle}><strong>Тип:</strong></td>
              <td style={cellStyle}>{meridian.type}</td>
            </tr>
          )}
          {meridian.course && (
            <tr>
              <td style={cellStyle}><strong>Ход меридиана:</strong></td>
              <td style={cellStyle}>{meridian.course}</td>
            </tr>
          )}
          {meridian.functions && (
            <tr>
              <td style={cellStyle}><strong>Функции:</strong></td>
              <td style={cellStyle}>{meridian.functions}</td>
            </tr>
          )}
          {meridian.symptoms && (
            <tr>
              <td style={cellStyle}><strong>Симптомы:</strong></td>
              <td style={cellStyle}>{meridian.symptoms}</td>
            </tr>
          )}
          {meridian.notes && (
            <tr>
              <td style={cellStyle}><strong>Примечания:</strong></td>
              <td style={cellStyle}>{meridian.notes}</td>
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
		entityType="meridian"
		entityId={id}
		entityName={meridian.name}
		showTitle={true}
		readonly={true}
	  />
	  {/* ========== КОНЕЦ ДОБАВЛЕНИЯ ========== */}


      <hr style={{ margin: '30px 0' }} />
      <p><strong>ID меридиана:</strong> {meridian.id}</p>
    </div>
  );
}

export default MeridianDetail;