import React, { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { supabase } from './supabaseClient'
import { FaCopy, FaPlus, FaPlusCircle, FaEdit } from 'react-icons/fa';

async function fetchDysfunctionsCount(muscleId) {
  const { count: muscleCount } = await supabase
    .from('muscle_dysfunctions')
    .select('*', { count: 'exact', head: true })
    .eq('muscle_id', muscleId)

  const { data: groups } = await supabase
    .from('muscle_group_membership')
    .select('group_id')
    .eq('muscle_id', muscleId)

  let groupCount = 0
  if (groups?.length > 0) {
    const groupIds = groups.map(g => g.group_id)
    const { count } = await supabase
      .from('muscle_group_dysfunctions')
      .select('*', { count: 'exact', head: true })
      .in('group_id', groupIds)
    groupCount = count || 0
  }

  return (muscleCount || 0) + groupCount
}

function MuscleMediaGallery({ muscleId }) {
  const [media, setMedia] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewingMedia, setViewingMedia] = useState(null);

  useEffect(() => {
    const fetchMedia = async () => {
      const { data, error } = await supabase
        .from('muscle_media')
        .select('*')
        .eq('muscle_id', muscleId)
        .order('display_order');

      if (!error) setMedia(data);
      setLoading(false);
    };

    fetchMedia();
  }, [muscleId]);

  if (loading) return <div>Загрузка медиа...</div>;
  if (!media.length) return null;

  return (
    <div className="media-gallery">
      <h3 style={{ margin: '20px 0 10px 0' }}>Медиа материалы</h3>
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', 
        gap: '15px',
        marginTop: '15px'
      }}>
        {media.map((item) => (
          <div 
            key={item.id} 
            className="media-item"
            style={{ 
              border: '1px solid #ddd',
              borderRadius: '8px',
              overflow: 'hidden',
              cursor: 'pointer'
            }}
            onClick={() => setViewingMedia(item)}
          >
            {item.file_type === 'image' ? (
              <img 
                src={item.file_url} 
                alt={item.description || `Медиа ${item.display_order}`}
                style={{ 
                  width: '100%',
                  height: '150px',
                  objectFit: 'cover'
                }}
              />
            ) : (
              <video 
                style={{ 
                  width: '100%',
                  height: '150px',
                  objectFit: 'cover'
                }}
              >
                <source src={item.file_url} type="video/mp4" />
              </video>
            )}
            
            {item.description && (
              <div style={{
                padding: '8px',
                backgroundColor: '#f8f9fa',
                borderTop: '1px solid #eee'
              }}>
                <p style={{ 
                  margin: 0,
                  fontSize: '12px',
                  color: '#666',
                  lineHeight: '1.3'
                }}>
                  {item.description.length > 60 
                    ? `${item.description.substring(0, 60)}...` 
                    : item.description
                  }
                </p>
              </div>
            )}
          </div>
        ))}
      </div>

      {viewingMedia && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.9)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
          }}
          onClick={() => setViewingMedia(null)}
        >
          <div 
            style={{
              maxWidth: '90vw',
              maxHeight: '90vh',
              backgroundColor: 'white',
              borderRadius: '8px',
              overflow: 'hidden'
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ padding: '15px', backgroundColor: '#f8f9fa' }}>
              <button 
                onClick={() => setViewingMedia(null)}
                style={{
                  position: 'absolute',
                  top: '10px',
                  right: '10px',
                  background: 'rgba(0,0,0,0.7)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '50%',
                  width: '30px',
                  height: '30px',
                  cursor: 'pointer',
                  zIndex: 1001
                }}
              >
                ×
              </button>
              
              {viewingMedia.file_type === 'image' ? (
                <img 
                  src={viewingMedia.file_url} 
                  alt={viewingMedia.description || 'Медиа'}
                  style={{ 
                    maxWidth: '100%',
                    maxHeight: '70vh',
                    objectFit: 'contain'
                  }}
                />
              ) : (
                <video 
                  controls
                  style={{ 
                    maxWidth: '100%',
                    maxHeight: '70vh'
                  }}
                >
                  <source src={viewingMedia.file_url} type="video/mp4" />
                </video>
              )}
              
              {viewingMedia.description && (
                <div style={{
                  padding: '15px',
                  backgroundColor: 'white',
                  borderTop: '1px solid ',
                  borderTopColor: '#eee'
                }}>
                  <h4 style={{ margin: '0 0 10px 0' }}>Описание:</h4>
                  <p style={{ margin: 0, lineHeight: '1.4' }}>
                    {viewingMedia.description}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MuscleDetail() {
  const { id } = useParams()
  const [muscle, setMuscle] = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate();
  const [dysfunctionsCount, setDysfunctionsCount] = useState(0)
  const [relationships, setRelationships] = useState([]) // Перенесено сюда
  const cellStyle = {         
     paddingTop: '12px',
     padding: '5px',
     verticalAlign: 'top'
  }

  useEffect(() => {
    async function fetchData() {
      setLoading(true)

      const [muscleData, count, relationshipsData] = await Promise.all([
        supabase
          .from('muscles')
          .select(`
            *,
            muscle_functions (note, functions(name)),
            muscle_meridians (meridians(name)),
            muscle_organs (organs(name)),
            muscle_nerves (nerve_id, nerves(name, type)),
            muscle_group_membership (muscle_groups(name, description, type)),
            muscle_vertebrae (vertebrae(code))
          `)
          .eq('id', id)
          .single(),
        fetchDysfunctionsCount(id),
        // Загрузка отношений
        supabase
          .from('muscle_relationships')
          .select(`
            *,
            function:functions(name),
            synergists:muscle_relationship_synergists(
              muscle:muscles(id, name_ru, name_lat)
            ),
            antagonists:muscle_relationship_antagonists(
              muscle:muscles(id, name_ru, name_lat)
            )
          `)
          .eq('muscle_id', id)
      ]);

      if (muscleData.error) {
        console.error('Ошибка загрузки:', muscleData.error);
        setLoading(false);
        return;
      }
    
      setMuscle(muscleData.data);
      setDysfunctionsCount(count);
      setRelationships(relationshipsData.data || []);
      setLoading(false);
    }

    fetchData();
  }, [id]);

  if (loading) return <div style={{ padding: '2rem' }}>Загрузка...</div>
  if (!muscle) return <div style={{ padding: '2rem' }}>Мышца не найдена</div>

  const functions = muscle.muscle_functions || []
  const meridians = muscle.muscle_meridians || []
  const organs = muscle.muscle_organs || []
  const nerves = muscle.muscle_nerves || []
  const verts = muscle.muscle_vertebrae || []
  const groups = muscle.muscle_group_membership || []

  return (
    <div style={{ padding: '2rem', maxWidth: '1000px', margin: 'auto' }}>      
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '20px' }}>
        <Link className="link-text" to="/">← Назад</Link>
        <button 
          onClick={() => navigate(`/muscle/${id}/edit`)}
          className="action-btn edit-btn"
          style={{ 
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            fontSize: '1rem'
          }}
          title="Редактировать"
        >
          ✏️
        </button>
        {dysfunctionsCount > 0 && (
          <Link 
            to={`/muscle/${id}/dysfunctions`}
            style={{
              color: '#1976d2',
              display: 'inline-flex',
              alignItems: 'center'
            }}
            className="link-text"
          >
            Список дисфункций: {dysfunctionsCount}
          </Link>
        )}		  		  
      </div>
      
      <h1>{muscle.name_ru} <span style={{ fontWeight: 'normal' }}>({muscle.name_lat})</span></h1>
      
      <table><tbody>
        <tr><td style={cellStyle}><strong>Начало :</strong> </td><td style={cellStyle}> {muscle.origin}</td></tr>
        <tr><td style={cellStyle}><strong>Прикрепление :</strong> </td><td style={cellStyle}> {muscle.insertion}</td></tr>
        <tr><td style={cellStyle}> <strong>Группы:</strong></td>
        <td style={cellStyle}>
          {groups.length === 1 ? (
          <>
               {groups[0].muscle_groups.name}
               <em><small>{groups[0].muscle_groups.description ? ` –  ${groups[0].muscle_groups.description}` : ''} 
              <small>{groups[0].muscle_groups.type ? ` –  ${groups[0].muscle_groups.type}` : ''}</small></small>
           </em>
          </>
           ) : (
            <>
           {groups.map((f, idx) => (
            <li key={idx}>
              {f.muscle_groups.name}
              <em><small>{f.muscle_groups.description ? ` –  ${f.muscle_groups.description}` : ''}
                <small>{f.muscle_groups.type ? ` –  ${f.muscle_groups.type}` : ''}</small></small>
            </em>
            </li>
          ))}
        </>
        )}
        </td></tr>
        <tr><td style={cellStyle}> <strong>Функции:</strong></td>
        <td style={cellStyle}>
          {functions.length === 1 ? (
          <>
               {functions[0].functions.name}
               <em>{functions[0].note ? ` –  ${functions[0].note}` : ''} </em>
          </>
           ) : (
            <>
           {functions.map((f, idx) => (
            <li key={idx}>
              {f.functions.name}
              <em>{f.note ? ` –  ${f.note}` : ''} </em>
            </li>
          ))}
        </>
        )}
        </td></tr>
        <tr><td style={cellStyle}><strong>Меридиан:</strong></td>
        <td style={cellStyle}>
          {meridians.length === 1 ? (
          <>
               {meridians[0].meridians.name}
          </>
           ) : (
            <>
           {meridians.map((f, idx) => (
            <li key={idx}>
               {f.meridians.name}
            </li>
          ))}
        </>
        )}
        </td></tr>
        <tr><td style={cellStyle}><strong>Орган :</strong></td>
        <td style={cellStyle}>
          {organs.length === 1 ? (
          <>
               {organs[0].organs.name}
          </>
           ) : (
            <>
           {organs.map((f, idx) => (	
            <li key={idx}>
               {f.organs.name} 
            </li>
          ))}
        </>
        )}
        </td></tr>
        <tr><td style={cellStyle}><strong>Иннервация:</strong></td>
        <td style={cellStyle}>
          {nerves.length === 1 ? (
          <>
               {nerves[0].nerves.name}
               {nerves[0].nerves.type ? ` – (${nerves[0].nerves.type})` : ''}	   
          </>
           ) : (
            <>
           {nerves.map((f, idx) => (	
            <li key={idx}>
              {f.nerves.name} 
              {f.nerves.type ? ` – ${f.nerves.type}` : ''}
            </li>
          ))}
        </>
        )}
        </td></tr>
        <tr><td style={cellStyle}><strong>Позвонок:</strong></td>
        <td style={cellStyle}>
          {verts.length === 1 ? (
          <>	   
               {verts[0].vertebrae.code}
          </>
           ) : (
            <>
           {verts.map((f, idx) => (
            <li key={idx}>
               {f.vertebrae.code}
            </li>
          ))}
        </>
        )}
        </td></tr>
        <tr><td style={cellStyle}><strong>Индикатор:</strong></td><td style={cellStyle}> {muscle.indicator}</td></tr>
        <tr><td style={cellStyle}><strong>Примечание :</strong> </td><td style={cellStyle}> {muscle.notes}</td></tr>
        <tr><td style={cellStyle}><strong>Зона боли:</strong></td><td style={cellStyle}> {muscle.pain_zones_text}</td></tr>
      </tbody></table>

      {/* Блок взаимоотношений - добавлен в правильное место */}
      {relationships.length > 0 && (
        <div style={{ marginTop: '30px' }}>
          <h3>Взаимоотношения мышцы</h3>
          {relationships.map(relationship => (
            <div key={relationship.id} style={{
              border: '1px solid #ddd',
              padding: '15px',
              borderRadius: '8px',
              marginBottom: '15px',
              backgroundColor: '#f9f9f9'
            }}>
              <h4 style={{ margin: '0 0 10px 0' }}>
                {relationship.function?.name}
                {relationship.note && ` - ${relationship.note}`}
              </h4>
              
              {relationship.synergists && relationship.synergists.length > 0 && (
                <div style={{ marginBottom: '10px' }}>
                  <strong>Синергисты:</strong>
                  <ul style={{ margin: '5px 0', paddingLeft: '20px' }}>
                    {relationship.synergists.map(synergist => (
                      <li key={synergist.muscle.id}>
                        {synergist.muscle.name_ru} ({synergist.muscle.name_lat})
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {relationship.antagonists && relationship.antagonists.length > 0 && (
                <div style={{ marginBottom: '10px' }}>
                  <strong>Антагонисты:</strong>
                  <ul style={{ margin: '5px 0', paddingLeft: '20px' }}>
                    {relationship.antagonists.map(antagonist => (
                      <li key={antagonist.muscle.id}>
                        {antagonist.muscle.name_ru} ({antagonist.muscle.name_lat})
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      
      <MuscleMediaGallery muscleId={id} />
      
      <hr style={{ margin: '30px 0' }} />
      <p><strong>ID:</strong> {muscle.id}</p>
    </div>
  )
}

export default MuscleDetail