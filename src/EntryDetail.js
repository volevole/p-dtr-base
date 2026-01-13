// EntryDetail.js
import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from './utils/supabaseClient';
import MediaManager from './MediaManager'; 

function EntryDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [entry, setEntry] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);

      try {
        // Загружаем данные захода
        const { data: entryData, error: entryError } = await supabase
          .from('entries')
          .select('*')
          .eq('id', id)
          .single();

        if (entryError) throw entryError;

        setEntry(entryData);
      } catch (error) {
        console.error('Ошибка загрузки данных:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [id]);

  if (loading) return <div style={{ padding: '2rem' }}>Загрузка...</div>;
  if (!entry) return <div style={{ padding: '2rem' }}>Заход не найден</div>;

  const cellStyle = {         
    paddingTop: '12px',
    padding: '5px',
    verticalAlign: 'top'
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Нет данных';
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU') + ' ' + date.toLocaleTimeString('ru-RU');
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1000px', margin: 'auto' }}>      
      <div style={{ marginBottom: '20px' }}>
        <Link to="/entries">← Назад к списку</Link>
        <button 
          onClick={() => navigate(`/entry/${id}/edit`)}
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
           ✏️ Редактировать
        </button>
      </div>

      <h1>
        <small>Заход:</small> {entry.name}
        {!entry.is_active && (
          <span style={{ 
            marginLeft: '10px',
            backgroundColor: '#dc3545',
            color: 'white',
            padding: '2px 8px',
            borderRadius: '12px',
            fontSize: '14px'
          }}>
            Неактивен
          </span>
        )}
      </h1>

      <table style={{ width: '100%', marginBottom: '30px' }}>
        <tbody>
          <tr>
            <td style={cellStyle}><strong>Название:</strong></td>
            <td style={cellStyle}>{entry.name}</td>
          </tr>
          
          {entry.description && (
            <tr>
              <td style={cellStyle}><strong>Описание:</strong></td>
              <td style={cellStyle}>{entry.description}</td>
            </tr>
          )}
          
          <tr>
            <td style={cellStyle}><strong>Статус:</strong></td>
            <td style={cellStyle}>
              {entry.is_active ? (
                <span style={{ color: '#28a745', fontWeight: 'bold' }}>Активен</span>
              ) : (
                <span style={{ color: '#dc3545', fontWeight: 'bold' }}>Неактивен</span>
              )}
            </td>
          </tr>
          
          <tr>
            <td style={cellStyle}><strong>Порядок отображения:</strong></td>
            <td style={cellStyle}>{entry.display_order}</td>
          </tr>
          
          <tr>
            <td style={cellStyle}><strong>Дата создания:</strong></td>
            <td style={cellStyle}>{formatDate(entry.created_at)}</td>
          </tr>
          
          <tr>
            <td style={cellStyle}><strong>Дата обновления:</strong></td>
            <td style={cellStyle}>{formatDate(entry.updated_at)}</td>
          </tr>
        </tbody>
      </table>

      {/* Можно добавить связанные сущности, если они появятся в будущем */}
      <div style={{ marginTop: '30px' }}>
        <h3>Информация о заходе</h3>
        <p style={{ color: '#666' }}>
          Заход — это вариант выбора стартовой точки алгоритма для поиска основных составляющих дисфункции.
    Например, заход от слабой мышцы или заход от тотального гипертонуса.
        </p>
      </div>

      {/* MEDIA MANAGER ДЛЯ ЗАХОДА */}
      <MediaManager 
        entityType="entry"
        entityId={id}
        entityName={entry.name}
        showTitle={true}
        readonly={true}
      />

      <hr style={{ margin: '30px 0' }} />
      <p><strong>ID захода:</strong> {entry.id}</p>
    </div>
  );
}

export default EntryDetail;