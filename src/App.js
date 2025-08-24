import React, { useEffect, useState } from 'react'
import { Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom'
import { supabase } from './supabaseClient'
import { FaCopy, FaPlus, FaPlusCircle, FaPlusSquare } from 'react-icons/fa'; // Font Awesome
import { HiDuplicate } from 'react-icons/hi'; // Hero Icons
import MuscleDetail from './MuscleDetail'      
import MuscleEditPage from './MuscleEditPage'
import MuscleDysfunctions from './MuscleDysfunctions'
import './App.css'; // Ваши стили должны быть последними

function MuscleList({ muscles, onEdit, onDelete, onAdd, onCopy, onMove }) {
  const [searchTerm, setSearchTerm] = useState('')

  const filteredMuscles = muscles.filter((m) =>
    m.name_ru.toLowerCase().includes(searchTerm.toLowerCase())
  )  

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: 'auto' }}>
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
    
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h1>Список мышц</h1>
        <button 
          onClick={onAdd}
          className="action-btn add-btn"
          style={{ marginLeft: '0', alignItems: 'center' }}
        >
          <FaPlusSquare size={14} title="Добавить мышцу" />
          <span style={{ marginLeft: '4px' }}></span>  
        </button>
      </div>
      
      <ul style={{ listStyleType: 'none', paddingLeft: 0 }}>
        {filteredMuscles.length === 0 && <li>Ничего не найдено</li>}
        {filteredMuscles.map((m, index) => (  
          <li key={m.id} style={{ marginBottom: '1.5rem', borderBottom: '1px solid #ddd', paddingBottom: '1rem' }}>      
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Link to={`/muscle/${m.id}`}>
                <strong>{m.name_ru}</strong> ({m.name_lat})
              </Link>
              <div>
                <button onClick={() => onCopy(m.id)} title="Копировать" className="action-btn copy-btn">
                  <HiDuplicate size={12} title="Копировать" />
                </button> 	
                <button onClick={() => onEdit(m.id)} title="Редактировать" className="action-btn edit-btn">✏️</button>	  
                <button onClick={() => onDelete(m.id)} title="Удалить" className="action-btn delete-btn">🗑️</button>
                <button onClick={() => onMove(m.id, 'up')} disabled={index === 0} title="Переместить выше" className="action-btn move-btn">↑</button>
                <button onClick={() => onMove(m.id, 'down')} disabled={index === muscles.length - 1} title="Переместить ниже" className="action-btn move-btn">↓</button>  
              </div>
            </div>

            
			  {/* Контейнер с двумя "столбцами" */}
			  <div style={{ display: 'flex', marginTop: '0.5rem' }}>
				{/* Левый столбец */}
				<div style={{ flex: 1 }}>
				  {/* Меридианы */}
				  {m.meridians?.length > 0 && (
					<div>
					  <em>Меридианы:</em>{' '}
					  {m.meridians.length === 1
						? m.meridians[0]
						: (
						  <ul style={{ marginTop: 0, marginBottom: 0 }}>
							{m.meridians.map((name, idx) => <li key={idx}>{name}</li>)}
						  </ul>
						)}
					</div>
				  )}

				  {/* Органы */}
				  {m.organs?.length > 0 && (
					<div style={{ marginTop: '0.5rem' }}>
					  <em>Органы:</em>{' '}
					  {m.organs.length === 1
						? m.organs[0]
						: (
						  <ul style={{ marginTop: 0, marginBottom: 0 }}>
							{m.organs.map((name, idx) => <li key={idx}>{name}</li>)}
						  </ul>
						)}
					</div>
				  )}
				</div>

				{/* Правый столбец */}
				<div style={{ flex: 1, textAlign: 'right' }}>
				  {/* Дисфункции */}
				  {m.dysfunctionsCount > 0 && (
					<div>
					  <Link 
						to={`/muscle/${m.id}/dysfunctions`} 
						className="link-text">
						<em >Дисфункций: {m.dysfunctionsCount}</em>
					  </Link>
					</div>
				  )}
				</div>
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
  const navigate = useNavigate();
  const location = useLocation();

// Добавьте этот эффект для обработки обновления данных
	  useEffect(() => {
		if (location.state?.shouldRefresh) {
		  fetchMuscles();
		  // Очищаем состояние, чтобы не срабатывало при каждом рендере
		  navigate('.', { replace: true, state: {} });
		}
	  }, [location.state]);


// Вынесите функцию fetchMuscles из другого useEffect, чтобы можно было её переиспользовать
  
async function fetchMuscles() {
  // В функции fetchMuscles замените запрос dysfunctionsCount на:
  setLoading(true);

  try {
    // Получаем список мышц
    const { data: muscleList, error: muscleError } = await supabase
      .from('muscles')
      .select('*')
      .order('display_order')
      .order('name_ru');

    if (muscleError) throw muscleError;

    // Параллельно загружаем все связанные данные
    const [
      { data: merLinks },
      { data: orgLinks },
      { data: dysfunctionsData },
      { data: groupMemberships },
      { data: groupDysfunctions }
    ] = await Promise.all([
      supabase.from('muscle_meridians').select('muscle_id, meridians(name)'),
      supabase.from('muscle_organs').select('muscle_id, organs(name)'),
      supabase.from('muscle_dysfunctions').select('muscle_id, dysfunctions(id)'),
      supabase.from('muscle_group_membership').select('muscle_id, muscle_groups(id)'),
      supabase.from('muscle_group_dysfunctions').select('group_id, dysfunctions(id)')
    ]);

    // Создаем карты для быстрого доступа
    const muscleDysfunctionsMap = {};
    dysfunctionsData?.forEach(item => {
      muscleDysfunctionsMap[item.muscle_id] = (muscleDysfunctionsMap[item.muscle_id] || 0) + 1;
    });

    const groupDysfunctionsMap = {};
    groupDysfunctions?.forEach(item => {
      groupDysfunctionsMap[item.group_id] = (groupDysfunctionsMap[item.group_id] || 0) + 1;
    });

    const muscleGroupsMap = {};
    groupMemberships?.forEach(item => {
      if (!muscleGroupsMap[item.muscle_id]) {
        muscleGroupsMap[item.muscle_id] = [];
      }
      muscleGroupsMap[item.muscle_id].push(item.muscle_groups.id);
    });

    // Обогащаем данные мышц
    const enriched = muscleList.map((m) => {
      const groupDysfunctionsCount = (muscleGroupsMap[m.id] || []).reduce((sum, groupId) => {
        return sum + (groupDysfunctionsMap[groupId] || 0);
      }, 0);

      return {
        ...m,
        meridians: merLinks?.filter(l => l.muscle_id === m.id).map(l => l.meridians?.name),
        organs: orgLinks?.filter(l => l.muscle_id === m.id).map(l => l.organs?.name),
        dysfunctionsCount: (muscleDysfunctionsMap[m.id] || 0) + groupDysfunctionsCount
      };
    });

    setMuscles(enriched);
  } catch (error) {
    console.error('Ошибка загрузки данных:', error);
  } finally {
    setLoading(false);
  }
}



  useEffect(() => {
	
	  

	
   const initializeApp = async () => {
      try {
        // Синхронизация кеша схемы при загрузке приложения
        await supabase.rpc('sync_columns_cache');
        console.log('Схема БД синхронизирована');
      } catch (error) {
        console.error('Ошибка синхронизации схемы:', error);
      }
    };
    
    initializeApp();
    fetchMuscles()
  }, [])

  const handleEdit = (id) => {
    console.log('Edit:', id)
    // можно будет здесь делать переход или открывать модальное окно
    navigate(`/muscle/${id}/edit`)
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

	const handleAdd = async () => {
	  // Создаем новую пустую мышцу
	  const { data, error } = await supabase
		.from('muscles')
		.insert([{ 
		  name_ru: 'Новая мышца',
		  name_lat: '',
		  origin: '',
		  insertion: '',
		  indicator: '',
		  pain_zones_text: '',
		  notes: ''
		}])
		.select()
		.single();

	  if (error) {
		console.error('Ошибка создания:', error);
		return;
	  }

	  // Перенаправляем на редактирование
	  navigate(`/muscle/${data.id}/edit`);
	};

	const handleCopy = async (muscleId) => {
  try {
    // 1. Получаем исходную мышцу
    const { data: original } = await supabase
      .from('muscles')
      .select('*')
      .eq('id', muscleId)
      .single();

    // 2. Подготавливаем данные для копии
    const { id, created_at, ...copyData } = original;

    // 3. Создаем копию с пометкой
    const { data: copiedMuscle, error: insertError } = await supabase
      .from('muscles')
      .insert([{ 
        ...copyData,
        name_ru: `${copyData.name_ru} (копия)`
      }])
      .select()
      .single();

    if (insertError) throw insertError;

    // 4. Копируем все связи
    await copyMuscleRelations(muscleId, copiedMuscle.id);

    // 5. Перенаправляем на редактирование
    navigate(`/muscle/${copiedMuscle.id}/edit`, {
      state: { 
        copiedData: {
          ...copiedMuscle,
          meridians: original.meridians,
          organs: original.organs
        }
      }
    });

  } catch (error) {
    console.error('Ошибка копирования:', error);
    alert('Не удалось создать копию');
  }
};

	// Функция для копирования связей
	const copyMuscleRelations = async (sourceId, targetId) => {
  const relations = [
    'muscle_group_membership',
    'muscle_dysfunctions',
    'muscle_meridians',
    'muscle_organs',
    'muscle_nerves',
    'muscle_vertebrae',
    'muscle_functions' // Добавляем эту таблицу
  ];

  for (const table of relations) {
    const { data: links } = await supabase
      .from(table)
      .select('*')
      .eq('muscle_id', sourceId);

    if (links?.length > 0) {
      const newLinks = links.map(link => ({
        ...link,
        muscle_id: targetId
		// ,
        // id: undefined // Убираем id, чтобы создать новую запись
      }));
		
      await supabase.from(table).insert(newLinks);
    }
  }
};

	//Функция перестановки порядка мышц
	const moveMuscle = async (id, direction) => {
  const currentIndex = muscles.findIndex(m => m.id === id);
  if (currentIndex === -1) return;

  const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
  if (newIndex < 0 || newIndex >= muscles.length) return;

  // Создаем копию массива с обновленными порядками
  const updatedMuscles = [...muscles];
  const tempOrder = updatedMuscles[currentIndex].display_order;
  const newOrder = updatedMuscles[newIndex].display_order;

  try {
    // Обновляем первую мышцу
    const { error: error1 } = await supabase
      .from('muscles')
      .update({ display_order: newOrder })
      .eq('id', updatedMuscles[currentIndex].id);

    // Обновляем вторую мышцу
    const { error: error2 } = await supabase
      .from('muscles')
      .update({ display_order: tempOrder })
      .eq('id', updatedMuscles[newIndex].id);

    if (error1 || error2) {
      throw error1 || error2;
    }

    // Обновляем локальное состояние
    updatedMuscles[currentIndex].display_order = newOrder;
    updatedMuscles[newIndex].display_order = tempOrder;
    
    setMuscles(updatedMuscles.sort((a, b) => a.display_order - b.display_order));
    
  } catch (error) {
    console.error('Ошибка обновления порядка:', error);
    alert('Не удалось изменить порядок');
  }
};
	
	
  if (loading) return <div style={{ padding: '2rem' }}>Загрузка...</div>

  return (   
<>
    {/* Остальной ваш код (роуты и т.д.) */}
    <Routes>
      <Route
        path="/"
        element={<MuscleList muscles={muscles} onEdit={handleEdit} 
		onDelete={handleDelete} onAdd={handleAdd}  
		onCopy={handleCopy} onMove={moveMuscle} />}
      />
      <Route path="/muscle/:id" element={<MuscleDetail />} />
      <Route path="/muscle/:id/edit" element={<MuscleEditPage />} />
	  <Route path="/muscle/:id/dysfunctions" element={<MuscleDysfunctions />} />
    </Routes>
</>
  )
}


export default App
