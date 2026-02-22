// MuscleDetail.js - с использованием CSS классов
import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from './utils/supabaseClient';
import API_URL from './config/api';
import { FaCopy, FaPlus, FaPlusCircle, FaEdit } from 'react-icons/fa';
import { getMediaForEntity, uploadMediaForEntity } from './utils/mediaHelper';
import MediaManager from './MediaManager';
import './App.css'; // Убедитесь, что стили подключены

// Функция для обрезания длинного текста (только для определенных полей)
const truncateText = (text, maxLength = 200) => {
  if (!text) return text;
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

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
  
  // Определяем мобильное устройство для адаптивных стилей
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  // Минимальные инлайн-стили только для отступов (их нет в CSS)
  const containerStyle = {
    padding: isMobile ? '1rem' : '2rem',
    maxWidth: '1000px',
    margin: 'auto'
  };

  useEffect(() => {
    async function fetchData() {
      setLoading(true)

      try {
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

        const count = await fetchDysfunctionsCount(id);

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

  if (loading) return <div style={containerStyle}>Загрузка...</div>
  if (!muscle) return <div style={containerStyle}>Мышца не найдена</div>

  const functions = muscle.muscle_functions || []
  const meridians = muscle.muscle_meridians || []
  const organs = muscle.muscle_organs || []
  const nerves = muscle.muscle_nerves || []
  const verts = muscle.muscle_vertebrae || []
  const groups = muscle.muscle_group_membership || []

  // Функция для рендеринга групп
  const renderGroups = () => {
    if (groups.length === 0) return <span style={{ color: '#999' }}>—</span>;
    
    if (groups.length === 1) {
      return (
        <>
          <Link 
            to={`/group/${groups[0].muscle_groups.id}`}
            className="link-text"
            style={{ fontWeight: 'bold' }}
          >
            {groups[0].muscle_groups.name}
          </Link>
          <em>
            <small>
              {groups[0].muscle_groups.description 
                ? ` – ${truncateText(groups[0].muscle_groups.description, isMobile ? 50 : 200)}` 
                : ''} 
              {groups[0].muscle_groups.type 
                ? ` (${groups[0].muscle_groups.type})` 
                : ''}
            </small>
          </em>
        </>
      );
    }
    
    return (
      <ul style={{ margin: 0, paddingLeft: isMobile ? '15px' : '20px' }}>
        {groups.map((f, idx) => (
          <li key={idx}>
            <Link 
              to={`/group/${f.muscle_groups.id}`}
              className="link-text"
              style={{ fontWeight: 'bold' }}
            >
              {f.muscle_groups.name}
            </Link>
            <em>
              <small>
                {f.muscle_groups.description 
                  ? ` – ${truncateText(f.muscle_groups.description, isMobile ? 50 : 200)}` 
                  : ''}
                {f.muscle_groups.type 
                  ? ` (${f.muscle_groups.type})` 
                  : ''}
              </small>
            </em>
          </li>
        ))}
      </ul>
    );
  };

  // Функция для рендеринга функций
  const renderFunctions = () => {
    if (functions.length === 0) return <span style={{ color: '#999' }}>—</span>;
    
    if (functions.length === 1) {
      return (
        <>
          {functions[0].functions.name}
          {functions[0].note && <em> – {truncateText(functions[0].note, isMobile ? 50 : 200)}</em>}
        </>
      );
    }
    
    return (
      <ul style={{ margin: 0, paddingLeft: isMobile ? '15px' : '20px' }}>
        {functions.map((f, idx) => (
          <li key={idx}>
            {f.functions.name}
            {f.note && <em> – {truncateText(f.note, isMobile ? 50 : 200)}</em>}
          </li>
        ))}
      </ul>
    );
  };

  // Функция для рендеринга меридианов
  const renderMeridians = () => {
    if (meridians.length === 0) return <span style={{ color: '#999' }}>—</span>;
    
    if (meridians.length === 1) {
      return (
        <>
          <Link 
            to={`/meridian/${meridians[0].meridian_id}`}
            className="link-text"
            style={{ fontWeight: 'bold' }}
          >
            {meridians[0].meridians.name}
          </Link>
          {meridians[0].meridians.code && <span> [{meridians[0].meridians.code}]</span>}
        </>
      );
    }
    
    return (
      <ul style={{ margin: 0, paddingLeft: isMobile ? '15px' : '20px' }}>
        {meridians.map((f, idx) => (
          <li key={idx}>
            <Link 
              to={`/meridian/${f.meridian_id}`}
              className="link-text"
              style={{ fontWeight: 'bold' }}
            >
              {f.meridians.name}
            </Link>
            {f.meridians.code && <span> [{f.meridians.code}]</span>}
          </li>
        ))}
      </ul>
    );
  };

  // Функция для рендеринга органов
  const renderOrgans = () => {
    if (organs.length === 0) return <span style={{ color: '#999' }}>—</span>;
    
    if (organs.length === 1) {
      return (
        <>
          <Link 
            to={`/organ/${organs[0].organ_id}`}
            className="link-text"
            style={{ fontWeight: 'bold' }}
          >
            {organs[0].organs.name}
          </Link>
          {organs[0].organs.system && <span> ({organs[0].organs.system})</span>}
        </>
      );
    }
    
    return (
      <ul style={{ margin: 0, paddingLeft: isMobile ? '15px' : '20px' }}>
        {organs.map((f, idx) => (
          <li key={idx}>
            <Link 
              to={`/organ/${f.organ_id}`}
              className="link-text"
              style={{ fontWeight: 'bold' }}
            >
              {f.organs.name}
            </Link>
            {f.organs.system && <span> ({f.organs.system})</span>}
          </li>
        ))}
      </ul>
    );
  };

  // Функция для рендеринга нервов
  const renderNerves = () => {
    if (nerves.length === 0) return <span style={{ color: '#999' }}>—</span>;
    
    if (nerves.length === 1) {
      return (
        <>
          {nerves[0].nerves.name}
          {nerves[0].nerves.type && <span> ({nerves[0].nerves.type})</span>}
        </>
      );
    }
    
    return (
      <ul style={{ margin: 0, paddingLeft: isMobile ? '15px' : '20px' }}>
        {nerves.map((f, idx) => (
          <li key={idx}>
            {f.nerves.name} 
            {f.nerves.type && <span> ({f.nerves.type})</span>}
          </li>
        ))}
      </ul>
    );
  };

  // Функция для рендеринга позвонков
  const renderVertebrae = () => {
    if (verts.length === 0) return <span style={{ color: '#999' }}>—</span>;
    
    if (verts.length === 1) {
      return <>{verts[0].vertebrae.code}</>;
    }
    
    return (
      <ul style={{ margin: 0, paddingLeft: isMobile ? '15px' : '20px' }}>
        {verts.map((f, idx) => (
          <li key={idx}>{f.vertebrae.code}</li>
        ))}
      </ul>
    );
  };

  return (
    <div style={containerStyle}>
      {/* Навигация */}
      <div style={{ 
        display: 'flex', 
        gap: isMobile ? '0.5rem' : '1rem', 
        alignItems: 'center', 
        marginBottom: '20px',
        flexWrap: 'wrap'
      }}>
        <Link className="link-text" to="/">← Назад</Link>
        <button 
          onClick={() => navigate(`/muscle/${id}/edit`)}
          className="action-btn edit-btn"
          title="Редактировать"
        >
          ✏️
        </button>
        {dysfunctionsCount > 0 && (
          <Link 
            to={`/muscle/${id}/dysfunctions`}
            className="link-text"
          >
            Список дисфункций: {dysfunctionsCount}
          </Link>
        )}
      </div>
      
      <h1 style={{ fontSize: isMobile ? '1.5rem' : '2rem' }}>
        {muscle.name_ru} 
        <span style={{ fontWeight: 'normal', fontSize: isMobile ? '1rem' : '1.5rem' }}>
          ({muscle.name_lat})
        </span>
      </h1>
      
      {/* Таблица с данными - используем стандартные HTML стили */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <tbody>
            {/* Описание первым */}
            <tr>
              <td style={{ 
                paddingTop: '12px',
                padding: '5px',
                verticalAlign: 'top',
                fontWeight: 'bold',
                width: isMobile ? '100px' : '150px'
              }}>
                Описание:
              </td>
              <td style={{ 
                paddingTop: '12px',
                padding: '5px',
                verticalAlign: 'top',
                whiteSpace: 'pre-wrap',
                wordWrap: 'break-word',
                lineHeight: '1.5'
              }}>
                {muscle.notes || <span style={{ color: '#999' }}>—</span>}
              </td>
            </tr>
            
            {/* Остальные поля */}
            <tr>
              <td style={{ paddingTop: '12px', padding: '5px', verticalAlign: 'top', fontWeight: 'bold' }}>Начало:</td>
              <td style={{ paddingTop: '12px', padding: '5px', verticalAlign: 'top' }}>
                {muscle.origin || <span style={{ color: '#999' }}>—</span>}
              </td>
            </tr>
            <tr>
              <td style={{ paddingTop: '12px', padding: '5px', verticalAlign: 'top', fontWeight: 'bold' }}>Прикрепление:</td>
              <td style={{ paddingTop: '12px', padding: '5px', verticalAlign: 'top' }}>
                {muscle.insertion || <span style={{ color: '#999' }}>—</span>}
              </td>
            </tr>
            <tr>
              <td style={{ paddingTop: '12px', padding: '5px', verticalAlign: 'top', fontWeight: 'bold' }}>Группы:</td>
              <td style={{ paddingTop: '12px', padding: '5px', verticalAlign: 'top' }}>{renderGroups()}</td>
            </tr>
            <tr>
              <td style={{ paddingTop: '12px', padding: '5px', verticalAlign: 'top', fontWeight: 'bold' }}>Функции:</td>
              <td style={{ paddingTop: '12px', padding: '5px', verticalAlign: 'top' }}>{renderFunctions()}</td>
            </tr>
            <tr>
              <td style={{ paddingTop: '12px', padding: '5px', verticalAlign: 'top', fontWeight: 'bold' }}>Меридиан:</td>
              <td style={{ paddingTop: '12px', padding: '5px', verticalAlign: 'top' }}>{renderMeridians()}</td>
            </tr>
            <tr>
              <td style={{ paddingTop: '12px', padding: '5px', verticalAlign: 'top', fontWeight: 'bold' }}>Орган:</td>
              <td style={{ paddingTop: '12px', padding: '5px', verticalAlign: 'top' }}>{renderOrgans()}</td>
            </tr>
            <tr>
              <td style={{ paddingTop: '12px', padding: '5px', verticalAlign: 'top', fontWeight: 'bold' }}>Иннервация:</td>
              <td style={{ paddingTop: '12px', padding: '5px', verticalAlign: 'top' }}>{renderNerves()}</td>
            </tr>
            <tr>
              <td style={{ paddingTop: '12px', padding: '5px', verticalAlign: 'top', fontWeight: 'bold' }}>Позвонок:</td>
              <td style={{ paddingTop: '12px', padding: '5px', verticalAlign: 'top' }}>{renderVertebrae()}</td>
            </tr>
            <tr>
              <td style={{ paddingTop: '12px', padding: '5px', verticalAlign: 'top', fontWeight: 'bold' }}>Индикатор:</td>
              <td style={{ paddingTop: '12px', padding: '5px', verticalAlign: 'top' }}>
                {muscle.indicator || <span style={{ color: '#999' }}>—</span>}
              </td>
            </tr>
            <tr>
              <td style={{ paddingTop: '12px', padding: '5px', verticalAlign: 'top', fontWeight: 'bold' }}>Зона боли:</td>
              <td style={{ paddingTop: '12px', padding: '5px', verticalAlign: 'top' }}>
                {muscle.pain_zones_text 
                  ? truncateText(muscle.pain_zones_text, isMobile ? 100 : 500) 
                  : <span style={{ color: '#999' }}>—</span>}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Блок взаимоотношений */}
      {relationships.length > 0 && (
        <div style={{ marginTop: '30px' }}>
          <h3>Взаимоотношения мышцы</h3>
          {relationships.map(relationship => {
            const isSynergist = relationship.synergists?.some(s => s.muscle.id === id) || false;
            const isAntagonist = relationship.antagonists?.some(a => a.muscle.id === id) || false;
            
            return (
              <div key={relationship.id} style={{
                border: '1px solid #ddd',
                padding: isMobile ? '10px' : '15px',
                borderRadius: '8px',
                marginBottom: '15px',
                backgroundColor: '#f9f9f9'
              }}>
                <h4 style={{ margin: '0 0 10px 0', fontSize: isMobile ? '1rem' : '1.2rem' }}>
                  {relationship.function?.name}
                  {relationship.note && ` - ${truncateText(relationship.note, isMobile ? 50 : 200)}`}
                </h4>
                
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
                    <ul style={{ margin: '5px 0', paddingLeft: isMobile ? '15px' : '20px' }}>
                      {relationship.synergists.map(synergist => (
                        <li key={synergist.muscle.id}>
                          <Link 
                            to={`/muscle/${synergist.muscle.id}`}
                            className="link-text"
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
                    <ul style={{ margin: '5px 0', paddingLeft: isMobile ? '15px' : '20px' }}>
                      {relationship.antagonists.map(antagonist => (
                        <li key={antagonist.muscle.id}>
                          <Link 
                            to={`/muscle/${antagonist.muscle.id}`}
                            className="link-text"
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
      
      {/* MediaManager */}
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
  );
}

export default MuscleDetail;