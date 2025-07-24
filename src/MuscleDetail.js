import React, { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { supabase } from './supabaseClient'
import { FaCopy, FaPlus, FaPlusCircle, FaEdit } from 'react-icons/fa'; // Font Awesome

// Вынесенная функция для подсчета дисфункций
async function fetchDysfunctionsCount(muscleId) {
  // Дисфункции самой мышцы
  const { count: muscleCount } = await supabase
    .from('muscle_dysfunctions')
    .select('*', { count: 'exact', head: true })
    .eq('muscle_id', muscleId)

  // Группы мышц, к которым принадлежит мышца
  const { data: groups } = await supabase
    .from('muscle_group_membership')
    .select('group_id')
    .eq('muscle_id', muscleId)

  // Дисфункции групп
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
      {media.map((item) => (
        <div key={item.id} className="media-item">
          {item.file_type === 'image' ? (
            <img 
              src={item.file_url} 
              alt={`Медиа ${item.display_order}`}
              className="media-image"
            />
          ) : (
            <video controls className="media-video">
              <source src={item.file_url} type="video/mp4" />
            </video>
          )}
        </div>
      ))}
    </div>
  );
}


function MuscleDetail() {
  const { id } = useParams()
  const [muscle, setMuscle] = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate();
  const [dysfunctionsCount, setDysfunctionsCount] = useState(0)
  const cellStyle = {         
     paddingTop: '12px',
     padding: '5px',
     verticalAlign: 'top'
    }
	

  useEffect(() => {
    async function fetchData() {
      setLoading(true)

	// Параллельно загружаем основные данные и количество дисфункций
      const [muscleData, count] = await Promise.all([
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
        fetchDysfunctionsCount(id)
      ])

      if (muscleData.error) {
        console.error('Ошибка загрузки:', muscleData.error)
        setLoading(false)
        return
      }
	
      setMuscle(muscleData.data)
      setDysfunctionsCount(count)
      setLoading(false)
    }

    fetchData()
  }, [id])


  if (loading) return <div style={{ padding: '2rem' }}>Загрузка...</div>
  if (!muscle) return <div style={{ padding: '2rem' }}>Мышца не найдена</div>

	// 📌 Достаём данные из объединённого ответа
  const functions = muscle.muscle_functions || []
  const meridians = muscle.muscle_meridians || []
  const organs = muscle.muscle_organs || []
  const nerves = muscle.muscle_nerves || []
  const verts = muscle.muscle_vertebrae || []
  const groups = muscle.muscle_group_membership || []


  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: 'auto' }}>      
	  <div style={{ display: 'flex', gap: '1rem' }}>
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
                //textDecoration: 'none',
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
	 {functions.map((f, idx) => (
          <li key={idx}>
            {f.muscle_groups.name}
            <em><small>{f.muscle_groups.description ? ` –  ${f.muscle_groups.description.note}` : ''}
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
	     {verts[0].vertebrae.name}
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
      </tbody> </table>
      <MuscleMediaGallery muscleId={id} />
	  <hr />
      <p><strong>ID:</strong> {muscle.id}</p>
    </div>
  )
}

export default MuscleDetail
