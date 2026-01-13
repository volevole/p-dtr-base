// MuscleDysfunctions.js
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from './utils/supabaseClient';

function MuscleDysfunctions() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [muscle, setMuscle] = useState(null);
  const [dysfunctions, setDysfunctions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [groupNames, setGroupNames] = useState({});

  useEffect(() => {
    const fetchData = async () => {
      try {
        // 1. Получаем данные о мышце
        const { data: muscleData } = await supabase
          .from('muscles')
          .select('*')
          .eq('id', id)
          .single();

        if (!muscleData) {
          setLoading(false);
          return;
        }

        // 2. Параллельно загружаем все нужные данные
        const [
          { data: directDysfunctions },
          { data: muscleGroups },
          { data: groupDysfunctions },
          { data: allGroups },
          { data: relationshipsData },
          { data: relationshipsDysfunctions }
        ] = await Promise.all([
          // Дисфункции самой мышцы (прямые связи)
          supabase
            .from('muscle_dysfunctions')
            .select(`
              dysfunctions: dysfunction_id (
                id, name, description, 
                visual_diagnosis, provocations_text, 
                main_algorithm, receptor_1, receptor_2
              )
            `)
            .eq('muscle_id', id),
          
          // Группы, к которым принадлежит мышца
          supabase
            .from('muscle_group_membership')
            .select('group_id, muscle_groups(name)')
            .eq('muscle_id', id),
          
          // Дисфункции всех групп мышц
          supabase
            .from('muscle_group_dysfunctions')
            .select(`
              group_id,
              dysfunctions: dysfunction_id (
                id, name, description, 
                visual_diagnosis, provocations_text, 
                main_algorithm, receptor_1, receptor_2
              )
            `),
            
          // Все группы мышц для получения имен
          supabase
            .from('muscle_groups')
            .select('id, name'),
            
          // Взаимоотношения, в которых участвует эта мышца
          supabase
            .from('relationship_muscles')
            .select(`
              relationship_id,
              muscle_relationships(
                id,
                note,
                functions(name)
              )
            `)
            .eq('muscle_id', id),
            
          // Все дисфункции связанные с взаимоотношениями
          supabase
            .from('synergists_dysfunction')
            .select(`
              relationship_id,
              dysfunctions: dysfunction_id (
                id, name, description, 
                visual_diagnosis, provocations_text, 
                main_algorithm, receptor_1, receptor_2
              )
            `)
        ]);

        // Создаем карту имен групп
        const groupsMap = {};
        allGroups?.forEach(group => {
          groupsMap[group.id] = group.name;
        });

        setGroupNames(groupsMap);
        setMuscle(muscleData);

        // 1. Дисфункции самой мышцы (прямые связи)
        const direct = directDysfunctions?.map(d => ({
          ...d.dysfunctions,
          groupName: null,
          groupId: null,
          relationshipName: null,
          relationshipId: null,
          via: 'direct'
        })) || [];

        // 2. Дисфункции групп (фильтруем только группы этой мышцы)
        const fromGroups = groupDysfunctions
          ?.filter(gd => muscleGroups?.some(mg => mg.group_id === gd.group_id))
          ?.map(gd => ({
            ...gd.dysfunctions,
            groupName: groupsMap[gd.group_id] || 'Группа мышц',
            groupId: gd.group_id,
            relationshipName: null,
            relationshipId: null,
            via: 'group'
          })) || [];

        // 3. Дисфункции через взаимоотношения мышц
        const fromRelationships = [];
        if (relationshipsData && relationshipsDysfunctions) {
          // Создаем карту дисфункций по relationship_id
          const dysfunctionByRelationship = {};
          relationshipsDysfunctions?.forEach(rd => {
            if (rd.dysfunctions) {
              if (!dysfunctionByRelationship[rd.relationship_id]) {
                dysfunctionByRelationship[rd.relationship_id] = [];
              }
              dysfunctionByRelationship[rd.relationship_id].push(rd.dysfunctions);
            }
          });
          
          // Для каждого взаимоотношения мышцы добавляем дисфункции
          relationshipsData?.forEach(rel => {
            if (rel.muscle_relationships && dysfunctionByRelationship[rel.relationship_id]) {
              const relationshipName = rel.muscle_relationships.functions?.name && rel.muscle_relationships.note
                ? `${rel.muscle_relationships.functions.name} ${rel.muscle_relationships.note}`.trim()
                : rel.muscle_relationships.note || rel.muscle_relationships.functions?.name || 'Взаимоотношение';
              
              dysfunctionByRelationship[rel.relationship_id].forEach(dysfunction => {
                fromRelationships.push({
                  ...dysfunction,
                  groupName: null,
                  groupId: null,
                  relationshipName: relationshipName,
                  relationshipId: rel.relationship_id,
                  via: 'relationship'
                });
              });
            }
          });
        }

        // Объединяем все дисфункции
        const allDysfunctions = [...direct, ...fromGroups, ...fromRelationships];
        
        // Убираем дубликаты (если одна дисфункция приходит из нескольких источников)
        const uniqueDysfunctions = Array.from(new Set(allDysfunctions.map(d => d.id)))
          .map(id => {
            const dysfunctionsWithSameId = allDysfunctions.filter(d => d.id === id);
            // Если дисфункция есть в нескольких источниках, приоритет: direct > group > relationship
            if (dysfunctionsWithSameId.some(d => d.via === 'direct')) {
              return dysfunctionsWithSameId.find(d => d.via === 'direct');
            } else if (dysfunctionsWithSameId.some(d => d.via === 'group')) {
              return dysfunctionsWithSameId.find(d => d.via === 'group');
            } else {
              return dysfunctionsWithSameId[0];
            }
          });

        setDysfunctions(uniqueDysfunctions);
        
      } catch (error) {
        console.error('Ошибка загрузки:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  if (loading) return <div>Загрузка...</div>;
  if (!muscle) return <div>Мышца не найдена</div>;

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
      
      <h2><small>Дисфункции мышцы </small>{muscle.name_ru} ({muscle.name_lat}) </h2>
      
      {dysfunctions.length === 0 ? (
        <p>Нет данных о дисфункциях</p>
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
                let sourceElement = null;
                let sourceType = '';
                
                if (d.via === 'direct') {
                  sourceType = 'Прямая связь';
                } else if (d.via === 'group' && d.groupId) {
                  sourceType = 'Через группу';
                  sourceElement = (
                    <Link 
                      to={`/group/${d.groupId}`}
                      style={{ color: '#1976d2', textDecoration: 'none' }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {d.groupName || 'Группа мышц'}
                    </Link>
                  );
                } else if (d.via === 'relationship' && d.relationshipName) {
                  sourceType = 'Через взаимоотношение';
                  sourceElement = (
                    <span style={{ fontStyle: 'italic' }}>
                      {d.relationshipName}
                    </span>
                  );
                }
                
                return (
                  <tr key={`${d.id}-${d.via}-${d.groupId || d.relationshipId}`}>
                    <td style={tdStyle}>
                      <Link 
                        to={`/dysfunction/${d.id}`}
                        style={{ color: '#1976d2', textDecoration: 'none' }}
                      >
                        {d.name}
                      </Link>
                    </td>
                    <td style={tdStyle}>{sourceType}</td>
                    <td style={tdStyle}>
                      {sourceElement || (d.groupName || '-')}
                    </td>
                    <td style={tdStyle}>{d.description}</td>
                    <td style={tdStyle}>{d.visual_diagnosis}</td>
                    <td style={tdStyle}>{d.provocations_text}</td>
                    <td style={tdStyle}>{d.main_algorithm}</td>
                    <td style={tdStyle}>{d.receptor_1}</td>
                    <td style={tdStyle}>{d.receptor_2}</td>
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