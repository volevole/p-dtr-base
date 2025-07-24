import React, { useEffect, useState } from 'react'
import { Routes, Route, Link } from 'react-router-dom'
import { supabase } from './supabaseClient'
import { useNavigate } from 'react-router-dom';
import MuscleDetail from './MuscleDetail'
import MuscleEditPage from './MuscleEditPage'

function MuscleList({ muscles, onEdit, onDelete }) {
  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: 'auto' }}>
      <h1>Список мышц</h1>
      <ul style={{ listStyleType: 'none', paddingLeft: 0 }}>
        {muscles.map((m) => (
          <li key={m.id} style={{ marginBottom: '1rem' }}>
            <Link to={`/muscle/${m.id}`}>
              <strong>{m.name_ru}</strong> ({m.name_lat})
            </Link>
            <br />

            {m.meridians?.length > 0 && (
              <>
                <em>Меридианы:</em>
                {m.meridians.length === 1 ? (
                  <> {m.meridians[0]}<br /></>
                ) : (
                  <ul style={{ marginTop: 0, marginBottom: 0 }}>
                    {m.meridians.map((name, idx) => (
                      <li key={idx}>{name}</li>
                    ))}
                  </ul>
                )}
              </>
            )}

            {m.organs?.length > 0 && (
              <>
                <em>Органы:</em>
                {m.organs.length === 1 ? (
                  <> {m.organs[0]}<br /></>
                ) : (
                  <ul style={{ marginTop: 0, marginBottom: 0 }}>
                    {m.organs.map((name, idx) => (
                      <li key={idx}>{name}</li>
                    ))}
                  </ul>
                )}
              </>
            )}

            {/* Кнопки редактирования и удаления */}
            <div style={{ marginTop: '0.5rem' }}>
              <button onClick={() => onEdit(m.id)} title="Редактировать">✏️</button>
              <button onClick={() => onDelete(m.id)} title="Удалить" style={{ marginLeft: '0.5rem' }}>🗑️</button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

function App() {
  const [muscles, setMuscles] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchMuscles() {
      setLoading(true)

      const { data: muscleList, error: muscleError } = await supabase
        .from('muscles')
        .select('*')
        .order('name_ru')

      if (muscleError) {
        console.error(muscleError)
        setLoading(false)
        return
      }

      const { data: merLinks, error: merError } = await supabase
        .from('muscle_meridians')
        .select('muscle_id, meridians(name)')

      const { data: orgLinks, error: orgError } = await supabase
        .from('muscle_organs')
        .select('muscle_id, organs(name)')

      const enriched = muscleList.map((m) => ({
        ...m,
        meridians: merLinks?.filter((l) => l.muscle_id === m.id).map((l) => l.meridians?.name),
        organs: orgLinks?.filter((l) => l.muscle_id === m.id).map((l) => l.organs?.name),
      }))

      setMuscles(enriched)
      setLoading(false)
    }

    fetchMuscles()
  }, [])

  const handleEdit = (id) => {
    console.log('Edit:', id)
    // можно будет здесь делать переход или открывать модальное окно
  }

  const handleDelete = async (id) => {
    const confirmed = window.confirm('Вы уверены, что хотите удалить мышцу?')
    if (!confirmed) return

    const { error } = await supabase.from('muscles').delete().eq('id', id)
    if (error) {
      console.error(error)
      return
    }

    setMuscles((prev) => prev.filter((m) => m.id !== id))
  }

  if (loading) return <div style={{ padding: '2rem' }}>Загрузка...</div>

  return (
    <Routes>
      <Route
        path="/"
        element={<MuscleList muscles={muscles} onEdit={handleEdit} onDelete={handleDelete} />}  />
      <Route path="/muscle/:id" element={<MuscleDetail />} />
    </Routes>
  )
}

export default App
