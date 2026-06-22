// MuscleDysfunctions.js — переписан на Reg.ru API
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import API_URL from './config/api';

function MuscleDysfunctions() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [muscle, setMuscle] = useState(null);
  const [dysfunctions, setDysfunctions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        console.log('[MuscleDysfunctions] заход для мышцы:', id);

        // 1. Получаем данные о мышце
        const muscleResponse = await fetch(`${API_URL}/api/muscle/${id}`);
        const muscleResult = await muscleResponse.json();
        
        if (!muscleResult.success || !muscleResult.data) {
          setLoading(false);
          return;
        }
        
        setMuscle(muscleResult.data);
        
        // 2. Получаем все дисфункции мышцы (через новый эндпоинт)
        const dysfunctionsResponse = await fetch(`${API_URL}/api/muscle/${id}/dysfunctions`);
        const dysfunctionsResult = await dysfunctionsResponse.json();
        
        if (dysfunctionsResult.success) {
          setDysfunctions(dysfunctionsResult.data || []);
        } else {
          console.error('Ошибка загрузки дисфункций:', dysfunctionsResult.error);
          setDysfunctions([]);
        }
        
      } catch (error) {
        console.error('Ошибка загрузки данных:', error);
        setDysfunctions([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  if (loading) return <div style={{ padding: '20px' }}>Загрузка...</div>;
  if (!muscle) return <div style={{ padding: '20px' }}>Мышца не найдена</div>;

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
        <Link to={`/muscle/${id}`} style={linkStyle}>
          ← Назад к мышце
        </Link>
        <Link to="/" style={linkStyle}>
          ← Назад к списку
        </Link>
      </div>
      
      <h2>
        <small>Дисфункции мышцы </small>
        {muscle.name_ru} ({muscle.name_lat})
      </h2>
      
      {dysfunctions.length === 0 ? (
        <p style={{ color: '#666', padding: '20px' }}>Нет данных о дисфункциях</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Название дисфункции</th>
                <th style={thStyle}>Тип связи</th>
                <th style={thStyle}>Источник связи</th>
                <th style={thStyle}>Описание</th>
                <th style={thStyle}>Визуальная диагностика</th>
                <th style={thStyle}>Провокации</th>
                <th style={thStyle}>Алгоритм</th>
                <th style={thStyle}>Рецептор 1</th>
                <th style={thStyle}>Рецептор 2</th>
              </tr>
            </thead>
            <tbody>
              {dysfunctions.map((d) => {
                let sourceType = '';
                let sourceElement = null;
                
                if (d.via === 'direct') {
                  sourceType = 'Прямая связь';
                } else if (d.via === 'group') {
                  sourceType = 'Через группу';
                  sourceElement = d.group_name ? (
                    <Link 
                      to={`/group/${d.group_id}`}
                      style={{ color: '#1976d2', textDecoration: 'none' }}
                    >
                      {d.group_name}
                    </Link>
                  ) : 'Группа мышц';
                } else if (d.via === 'relationship') {
                  sourceType = 'Через взаимоотношение';
                  sourceElement = (
                    <span style={{ fontStyle: 'italic' }}>
                      {d.relationship_name || 'Взаимоотношение'}
                    </span>
                  );
                }
                
                return (
                  <tr key={d.id}>
                    <td style={tdStyle}>
                      <Link 
                        to={`/dysfunction/${d.id}`}
                        style={{ color: '#1976d2', textDecoration: 'none' }}
                      >
                        {d.name}
                      </Link>
                    </td>
                    <td style={tdStyle}>{sourceType}</td>
                    <td style={tdStyle}>{sourceElement || '-'}</td>
                    <td style={tdStyle}>{d.description || '-'}</td>
                    <td style={tdStyle}>{d.visual_diagnosis || '-'}</td>
                    <td style={tdStyle}>{d.provocations_text || '-'}</td>
                    <td style={tdStyle}>{d.main_algorithm || '-'}</td>
                    <td style={tdStyle}>{d.receptor_1 || '-'}</td>
                    <td style={tdStyle}>{d.receptor_2 || '-'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// Стили
const linkStyle = {
  textDecoration: 'none',
  color: '#1976d2',
  display: 'inline-flex',
  alignItems: 'center',
  padding: '5px',
  border: '1px solid #1976d2',
  borderRadius: '4px'
};

const tableStyle = {
  width: '100%',
  borderCollapse: 'collapse',
  marginTop: '20px',
  border: '1px solid #ddd',
  fontSize: '0.9em'
};

const thStyle = {
  padding: '12px',
  border: '1px solid #ddd',
  backgroundColor: '#f2f2f2',
  textAlign: 'left',
  fontSize: '0.9em'
};

const tdStyle = {
  padding: '10px',
  border: '1px solid #ddd',
  textAlign: 'left',
  fontSize: '0.9em'
};

export default MuscleDysfunctions;