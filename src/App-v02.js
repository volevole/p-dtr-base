import React, { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import { Link } from 'react-router-dom'
import { Edit, Trash2 } from 'lucide-react' // ✅ Иконки из библиотеки

function App() {
  const [muscles, setMuscles] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchMuscles() {
      setLoading(true)

      // Загружаем все мышцы
      const { data: muscleList, error: muscleError } = await supabase
        .from('muscles')
        .select('*')
        .order('name_ru')

      if (muscleError) {
        console.error(muscleError)
        setLoading(false)
        return
      }

      // Загружаем все связи с меридианами
      const { data: merLinks, error: merError } = await supabase
        .from('muscle_meridians')
        .select('muscle_id, meridians(name)')

      if (merError) console.error(merError)

      // Загружаем все связи с органами
      const { data: orgLinks, error: orgError } = await supabase
        .from('muscle_organs')
        .select('muscle_id, organs(name)')

      if (orgError) console.error(orgError)

      // Объединяем всё в массив объектов
      const enrichedMuscles = muscleList.map((m) => ({
        ...m,
        meridians: merLinks
          ?.filter((link) => link.muscle_id === m.id)
          .map((link) => link.meridians?.name),
        organs: orgLinks
          ?.filter((link) => link.muscle_id === m.id)
          .map((link) => link.organs?.name),
      }))

      setMuscles(enrichedMuscles)
      setLoading(false)
    }

    fetchMuscles()
  }, [])

  if (loading) return <div style={{ padding: '2rem' }}>Загрузка...</div>

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

            {m.meridians && m.meridians.length > 0 && (
              <>
                <em>Меридианы:</em>
                {m.meridians.length === 1 ? (
                  <> {m.meridians[0]}<br></br></>
                ) : (
                  <ul style={{ marginTop: 0, marginBottom: 0 }}>
                    {m.meridians.map((name, idx) => (
                      <li key={idx}>{name}</li>
                    ))}
                  </ul>
                )}
              </>
            )}

            {m.organs && m.organs.length > 0 && (
              <>
                <em>Органы:</em>
                {m.organs.length === 1 ? (
                  <> {m.organs[0]}<br></br></>
                ) : (
                  <ul style={{ marginTop: 0, marginBottom: 0 }}>
                    {m.organs.map((name, idx) => (
                      <li key={idx}>{name}</li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}

export default App