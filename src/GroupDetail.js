// GroupDetail.js
import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from './utils/supabaseClient';
import MediaManager from './MediaManager'; 

function GroupDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [muscles, setMuscles] = useState([]);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);

      const { data: groupData } = await supabase
        .from('muscle_groups')
        .select('*')
        .eq('id', id)
        .single();

      const { data: musclesData } = await supabase
        .from('muscle_group_membership')
        .select(`
          muscle_id,
          muscles (
            id,
            name_ru,
            name_lat
          )
        `)
        .eq('group_id', id);

      setGroup(groupData);
      setMuscles(musclesData?.map(item => item.muscles) || []);
      setLoading(false);
    }

    fetchData();
  }, [id]);

  if (loading) return <div style={{ padding: '2rem' }}>Загрузка...</div>;
  if (!group) return <div style={{ padding: '2rem' }}>Группа не найдена</div>;

  return (
    <div style={{ padding: '2rem', maxWidth: '1000px', margin: 'auto' }}>
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '20px' }}>
        <Link to="/">← Назад к списку</Link>
        <button 
          onClick={() => navigate(`/group/${id}/edit`)}
          style={{ 
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

      <h1>{group.name}</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <strong>Тип:</strong> {group.type || 'Не указан'}
      </div>

      {group.description && (
        <div style={{ 
          backgroundColor: '#f5f5f5', 
          padding: '15px', 
          borderRadius: '5px',
          marginBottom: '20px'
        }}>
          <strong>Описание:</strong>
          <p>{group.description}</p>
        </div>
      )}

      <h3>Мышцы в группе ({muscles.length})</h3>
      {muscles.length > 0 ? (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {muscles.map(muscle => (
            <li key={muscle.id} style={{ marginBottom: '10px' }}>
              <Link 
                to={`/muscle/${muscle.id}`}
                style={{ 
                  display: 'block',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '5px',
                  textDecoration: 'none',
                  color: '#333',
                  backgroundColor: '#f9f9f9'
                }}
              >
                <strong>{muscle.name_ru}</strong> ({muscle.name_lat})
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p>В группе нет мышц</p>
      )}

	 {/* ========== ДОБАВЛЯЕМ MEDIA MANAGER ДЛЯ ОРГАНА ========== */}
		  <MediaManager 
			entityType="muscle_group"
			entityId={id}
			entityName={group.name}
			showTitle={true}
			readonly={true}
		  />
		  {/* ========== КОНЕЦ ДОБАВЛЕНИЯ ========== */}

      <hr style={{ margin: '30px 0' }} />
      <p><strong>ID группы:</strong> {group.id}</p>
    </div>
  );
}

export default GroupDetail;