import React, { useEffect, useState } from 'react'
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom'
import { supabase } from './supabaseClient'
import MuscleDetail from './MuscleDetail'

function Home() {
  const [muscles, setMuscles] = useState([])
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    async function fetchMuscles() {
      const { data } = await supabase
        .from('muscles')
        .select('id, name_ru, name_lat, indicator, pain_zones_text')

      setMuscles(data)
    }

    fetchMuscles()
  }, [])

  const filteredMuscles = muscles.filter((m) =>
    m.name_ru.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div style={{ padding: '2rem', maxWidth: '700px', margin: 'auto' }}>
      <h1>Список мышц</h1>

      <input
        type="text"
        placeholder="Поиск по имени мышцы..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        style={{
          width: '100%',
          padding: '0.5rem',
          marginBottom: '1.5rem',
          fontSize: '1rem'
        }}
      />

      <ul>
        {filteredMuscles.length === 0 && <li>Ничего не найдено</li>}
        {filteredMuscles.map((m) => (
          <li key={m.id} style={{ marginBottom: '1rem' }}>
            <Link to={`/muscle/${m.id}`}>
              <strong>{m.name_ru}</strong> ({m.name_lat})
            </Link><br />
            <em>Индикатор :</em> {m.indicator}<br />
            <em>Зона боли :</em> {m.pain_zones_text}<br />
          </li>
        ))}
      </ul>
    </div>
  )
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/muscle/:id" element={<MuscleDetail />} />
      </Routes>
    </Router>
  )
}

export default App
