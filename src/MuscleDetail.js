//MuscleDetail.js
import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from './utils/supabaseClient';
import API_URL from './config/api';
import { FaCopy, FaPlus, FaPlusCircle, FaEdit } from 'react-icons/fa';
import { getMediaForEntity, uploadMediaForEntity } from './utils/mediaHelper';
import MediaManager from './MediaManager'; // ← ДОБАВИТЬ ЭТОТ ИМПОРТ

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


function MuscleDetail() {
  const { id } = useParams()
  const [muscle, setMuscle] = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate();
  const [dysfunctionsCount, setDysfunctionsCount] = useState(0)
  const [relationships, setRelationships] = useState([])
  const cellStyle = {         
     paddingTop: '12px',
     padding: '5px',
     verticalAlign: 'top'
  }

 useEffect(() => {
  async function fetchData() {
    setLoading(true)

    try {
      // Разбиваем запрос на части, чтобы избежать проблем с синтаксисом
      const { data: muscleData, error: muscleError } = await supabase
        .from('muscles')
        .select(`
          *,
          muscle_functions (
            note,
            functions (
              name
            )
          ),
          muscle_meridians (
            meridian_id,
            meridians (
              name,
              code
            )
          ),
          muscle_organs (
            organ_id,
            organs (
              name,
              system
            )
          ),
          muscle_nerves (
            nerve_id,
            nerves (
              name,
              type
            )
          ),
          muscle_group_membership (
            group_id,
            muscle_groups (
              id,
              name,
              description,
              type
            )
          ),
          muscle_vertebrae (
            vertebrae (
              code
            )
          )
        `)
        .eq('id', id)
        .single();

      if (muscleError) throw muscleError;

      // Загрузка счетчика дисфункций
      const count = await fetchDysfunctionsCount(id);

      // Загрузка ВСЕХ взаимоотношений
      const { data: allRelationshipsData, error: relationshipsError } = await supabase
        .from('muscle_relationships')
        .select(`
          *,
          function:functions (
            name
          ),
          synergists:muscle_relationship_synergists (
            muscle:muscles (
              id,
              name_ru,
              name_lat
            )
          ),
          antagonists:muscle_relationship_antagonists (
            muscle:muscles (
              id,
              name_ru,
              name_lat
            )
          )
        `);

      if (relationshipsError) throw relationshipsError;

      // Фильтруем отношения, где текущая мышца участвует
      const filteredRelationships = allRelationshipsData?.filter(relationship => {
        const isSynergist = relationship.synergists?.some(s => s.muscle.id === id) || false;
        const isAntagonist = relationship.antagonists?.some(a => a.muscle.id === id) || false;
        return isSynergist || isAntagonist;
      }) || [];

      setMuscle(muscleData);
      setDysfunctionsCount(count);
      setRelationships(filteredRelationships);
      

      
    } catch (error) {
      console.error('Ошибка загрузки:', error);
    } finally {
      setLoading(false);
    }
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
              <Link 
                to={`/group/${groups[0].muscle_groups.id}`}
                style={{ 
                  color: '#1976d2', 
                  textDecoration: 'none',
                  fontWeight: 'bold'
                }}
              >
                {groups[0].muscle_groups.name}
              </Link>
              <em>
                <small>
                  {groups[0].muscle_groups.description ? ` –  ${groups[0].muscle_groups.description}` : ''} 
                  <small>
                    {groups[0].muscle_groups.type ? ` –  ${groups[0].muscle_groups.type}` : ''}
                  </small>
                </small>
              </em>
            </>
          ) : (
            <ul style={{ margin: 0, paddingLeft: '20px' }}>
              {groups.map((f, idx) => (
                <li key={idx}>
                  <Link 
                    to={`/group/${f.muscle_groups.id}`}
                    style={{ 
                      color: '#1976d2', 
                      textDecoration: 'none',
                      fontWeight: 'bold'
                    }}
                  >
                    {f.muscle_groups.name}
                  </Link>
                  <em>
                    <small>
                      {f.muscle_groups.description ? ` –  ${f.muscle_groups.description}` : ''}
                      <small>
                        {f.muscle_groups.type ? ` –  ${f.muscle_groups.type}` : ''}
                      </small>
                    </small>
                  </em>
                </li>
              ))}
            </ul>
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
			  <Link 
				to={`/meridian/${meridians[0].meridian_id}`}
				style={{ 
				  color: '#1976d2', 
				  textDecoration: 'none',
				  fontWeight: 'bold'
				}}
			  >
				{meridians[0].meridians.name}
			  </Link>
			  {meridians[0].meridians.code && <span> [{meridians[0].meridians.code}]</span>}
			</>
		  ) : (
			<ul style={{ margin: 0, paddingLeft: '20px' }}>
			  {meridians.map((f, idx) => (
				<li key={idx}>
				  <Link 
					to={`/meridian/${f.meridian_id}`}
					style={{ 
					  color: '#1976d2', 
					  textDecoration: 'none',
					  fontWeight: 'bold'
					}}
				  >
					{f.meridians.name}
				  </Link>
				  {f.meridians.code && <span> [{f.meridians.code}]</span>}
				</li>
			  ))}
			</ul>
		  )}
		</td></tr>
		<tr><td style={cellStyle}><strong>Орган :</strong></td>
		<td style={cellStyle}>
		  {organs.length === 1 ? (
			<>
			  <Link 
				to={`/organ/${organs[0].organ_id}`}
				style={{ 
				  color: '#1976d2', 
				  textDecoration: 'none',
				  fontWeight: 'bold'
				}}
			  >
				{organs[0].organs.name}
			  </Link>
			  {organs[0].organs.system && <span> ({organs[0].organs.system})</span>}
			</>
		  ) : (
			<ul style={{ margin: 0, paddingLeft: '20px' }}>
			  {organs.map((f, idx) => (
				<li key={idx}>
				  <Link 
					to={`/organ/${f.organ_id}`}
					style={{ 
					  color: '#1976d2', 
					  textDecoration: 'none',
					  fontWeight: 'bold'
					}}
				  >
					{f.organs.name}
				  </Link>
				  {f.organs.system && <span> ({f.organs.system})</span>}
				</li>
			  ))}
			</ul>
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
			{relationships.map(relationship => {
			  const isSynergist = relationship.synergists?.some(s => s.muscle.id === id) || false;
			  const isAntagonist = relationship.antagonists?.some(a => a.muscle.id === id) || false;
			  
			  return (
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
				  
				  {/* Добавляем отображение роли текущей мышцы */}
				  <div style={{ marginBottom: '10px' }}>
					<strong>Роль этой мышцы:</strong>{' '}
					{isSynergist ? (
					  <span style={{color: 'green'}}>Синергист</span>
					) : isAntagonist ? (
					  <span style={{color: 'red'}}>Антагонист</span>
					) : null}
				  </div>
				  
				  {relationship.synergists && relationship.synergists.length > 0 && (
					<div style={{ marginBottom: '10px' }}>
					  <strong>Синергисты:</strong>
					  <ul style={{ margin: '5px 0', paddingLeft: '20px' }}>
						{relationship.synergists.map(synergist => (
						  <li key={synergist.muscle.id}>
							<Link 
							  to={`/muscle/${synergist.muscle.id}`}
							  style={{ 
								color: '#1976d2', 
								textDecoration: 'none',
								fontWeight: '500'
							  }}
							>
							  {synergist.muscle.name_ru} ({synergist.muscle.name_lat})
							</Link>
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
							<Link 
							  to={`/muscle/${antagonist.muscle.id}`}
							  style={{ 
								color: '#1976d2', 
								textDecoration: 'none',
								fontWeight: '500'
							  }}
							>
							  {antagonist.muscle.name_ru} ({antagonist.muscle.name_lat})
							</Link>
						  </li>
						))}
					  </ul>
					</div>
				  )}
				</div>
			  );
			})}
		  </div>
		)}
      
      {/* ====== ВОТ ЗДЕСЬ ЗАМЕНА: УБИРАЕМ MuscleMediaGallery, ДОБАВЛЯЕМ MediaManager ====== */}
      <MediaManager 
        entityType="muscle"
        entityId={id}
        entityName={muscle?.name_ru || ''}
        showTitle={true}
        readonly={true}
      />
      
      <hr style={{ margin: '30px 0' }} />
      <p><strong>ID:</strong> {muscle.id}</p>
    </div>
  )
}

export default MuscleDetail