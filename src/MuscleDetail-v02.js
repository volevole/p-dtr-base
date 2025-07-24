import React, { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from './supabaseClient'

function MuscleDetail() {
  const { id } = useParams()
  const [muscle, setMuscle] = useState(null)
  const [loading, setLoading] = useState(true)
  const cellStyle = {         
     paddingTop: '12px',
     padding: '5px',
     verticalAlign: 'top'
    }
	

  useEffect(() => {
    async function fetchData() {
      setLoading(true)

	// 🔥 Один запрос вместо шести!
      const { data, error } = await supabase
        .from('muscles')
        .select(`
          *,
          muscle_functions (note, functions(name)),
          muscle_meridians (meridians(name)),
          muscle_organs (organs(name)),
          muscle_nerves (nerve_id, nerves(name, type)),
          muscle_vertebrae (vertebrae(code))
        `)
        .eq('id', id)
        .single()

      if (error) {
        console.error('Ошибка загрузки:', error)
        setLoading(false)
        return
      }

      setMuscle(data)
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


  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: 'auto' }}>
      <Link to="/">← Назад</Link>
      <h1>{muscle.name_ru} <span style={{ fontWeight: 'normal' }}>({muscle.name_lat})</span></h1>
      <table>
      <tr><td style={cellStyle}><strong>Начало :</strong> </td><td style={cellStyle}> {muscle.origin}</td></tr>
      <tr><td style={cellStyle}><strong>Прикрепление :</strong> </td><td style={cellStyle}> {muscle.insertion}</td></tr>
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
            <em>{f.note ? ` –  ${functions[0].note}` : ''} </em>
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
	     {nerves[0].nerves.type ? ` – ${nerves[0].nerves.type}` : ''}	   
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
     <tr><td style={cellStyle}><strong>Зона боли:</strong></td><td style={cellStyle}> {muscle.pain_zones_text}</td></tr>
	  </table>
      <hr />
      <p><strong>ID:</strong> {muscle.id}</p>
    </div>
  )
}

export default MuscleDetail
