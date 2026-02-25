// MuscleDetail.js - адаптивная версия с использованием CSS классов
import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from './utils/supabaseClient';
import API_URL from './config/api';
import { FaCopy, FaPlus, FaPlusCircle, FaEdit } from 'react-icons/fa';
import { getMediaForEntity, uploadMediaForEntity } from './utils/mediaHelper';
import MediaManager from './MediaManager';
import './App.css';

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
  
  useEffect(() => {
    async function fetchData() {
      setLoading(true)

      try {
        // 1. Сначала загружаем данные мышцы
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

        // 2. Устанавливаем данные мышцы СРАЗУ после их получения
        setMuscle(muscleData);

        // 3. Загружаем количество дисфункций
        const count = await fetchDysfunctionsCount(id);
        setDysfunctionsCount(count);

        // 4. Загружаем отношения
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
                name_lat,
                display_order
              )
            ),
            antagonists:muscle_relationship_antagonists (
              muscle:muscles (
                id,
                name_ru,
                name_lat,
                display_order
              )
            )
          `);

        if (relationshipsError) throw relationshipsError;

        // 5. Фильтруем и сортируем отношения
        const filteredRelationships = allRelationshipsData?.filter(relationship => {
          const isSynergist = relationship.synergists?.some(s => s.muscle.id === id) || false;
          const isAntagonist = relationship.antagonists?.some(a => a.muscle.id === id) || false;
          return isSynergist || isAntagonist;
        }) || [];

        const sortedRelationships = filteredRelationships.map(rel => ({
		  ...rel,
		  synergists: (rel.synergists || []).sort((a, b) => {
			const orderA = a.muscle.display_order ?? 999;
			const orderB = b.muscle.display_order ?? 999;
			return orderA - orderB;
		  }),
		  antagonists: (rel.antagonists || []).sort((a, b) => {
			const orderA = a.muscle.display_order ?? 999;
			const orderB = b.muscle.display_order ?? 999;
			return orderA - orderB;
		  })
		}));

        setRelationships(sortedRelationships);
        
      } catch (error) {
        console.error('Ошибка загрузки:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [id]);

  if (loading) return <div className="detail-container">Загрузка...</div>
  if (!muscle) return <div className="detail-container">Мышца не найдена</div>

  const functions = muscle.muscle_functions || []
  const meridians = muscle.muscle_meridians || []
  const organs = muscle.muscle_organs || []
  const nerves = muscle.muscle_nerves || []
  const verts = muscle.muscle_vertebrae || []
  const groups = muscle.muscle_group_membership || []

  // Функция для рендеринга групп
  const renderGroups = () => {
    if (groups.length === 0) return <span className="empty-value">—</span>;
    
    if (groups.length === 1) {
      return (
        <>
          <Link to={`/group/${groups[0].muscle_groups.id}`} className="link-text bold-link">
            {groups[0].muscle_groups.name}
          </Link>
          <em className="small-text">
            {groups[0].muscle_groups.description && ` – ${truncateText(groups[0].muscle_groups.description, isMobile ? 50 : 200)}`}
            {groups[0].muscle_groups.type && ` (${groups[0].muscle_groups.type})`}
          </em>
        </>
      );
    }
    
    return (
      <ul className="detail-list">
        {groups.map((f, idx) => (
          <li key={idx}>
            <Link to={`/group/${f.muscle_groups.id}`} className="link-text bold-link">
              {f.muscle_groups.name}
            </Link>
            <em className="small-text">
              {f.muscle_groups.description && ` – ${truncateText(f.muscle_groups.description, isMobile ? 50 : 200)}`}
              {f.muscle_groups.type && ` (${f.muscle_groups.type})`}
            </em>
          </li>
        ))}
      </ul>
    );
  };

  // Функция для рендеринга функций
  const renderFunctions = () => {
    if (functions.length === 0) return <span className="empty-value">—</span>;
    
    if (functions.length === 1) {
      return (
        <>
          {functions[0].functions.name}
          {functions[0].note && <em className="small-text"> – {truncateText(functions[0].note, isMobile ? 50 : 200)}</em>}
        </>
      );
    }
    
    return (
      <ul className="detail-list">
        {functions.map((f, idx) => (
          <li key={idx}>
            {f.functions.name}
            {f.note && <em className="small-text"> – {truncateText(f.note, isMobile ? 50 : 200)}</em>}
          </li>
        ))}
      </ul>
    );
  };

  // Функция для рендеринга меридианов
  const renderMeridians = () => {
    if (meridians.length === 0) return <span className="empty-value">—</span>;
    
    if (meridians.length === 1) {
      return (
        <>
          <Link to={`/meridian/${meridians[0].meridian_id}`} className="link-text bold-link">
            {meridians[0].meridians.name}
          </Link>
          {meridians[0].meridians.code && <span className="code-badge"> [{meridians[0].meridians.code}]</span>}
        </>
      );
    }
    
    return (
      <ul className="detail-list">
        {meridians.map((f, idx) => (
          <li key={idx}>
            <Link to={`/meridian/${f.meridian_id}`} className="link-text bold-link">
              {f.meridians.name}
            </Link>
            {f.meridians.code && <span className="code-badge"> [{f.meridians.code}]</span>}
          </li>
        ))}
      </ul>
    );
  };

  // Функция для рендеринга органов
  const renderOrgans = () => {
    if (organs.length === 0) return <span className="empty-value">—</span>;
    
    if (organs.length === 1) {
      return (
        <>
          <Link to={`/organ/${organs[0].organ_id}`} className="link-text bold-link">
            {organs[0].organs.name}
          </Link>
          {organs[0].organs.system && <span className="system-badge"> ({organs[0].organs.system})</span>}
        </>
      );
    }
    
    return (
      <ul className="detail-list">
        {organs.map((f, idx) => (
          <li key={idx}>
            <Link to={`/organ/${f.organ_id}`} className="link-text bold-link">
              {f.organs.name}
            </Link>
            {f.organs.system && <span className="system-badge"> ({f.organs.system})</span>}
          </li>
        ))}
      </ul>
    );
  };

  // Функция для рендеринга нервов
  const renderNerves = () => {
    if (nerves.length === 0) return <span className="empty-value">—</span>;
    
    if (nerves.length === 1) {
      return (
        <>
          {nerves[0].nerves.name}
          {nerves[0].nerves.type && <span className="type-badge"> ({nerves[0].nerves.type})</span>}
        </>
      );
    }
    
    return (
      <ul className="detail-list">
        {nerves.map((f, idx) => (
          <li key={idx}>
            {f.nerves.name} 
            {f.nerves.type && <span className="type-badge"> ({f.nerves.type})</span>}
          </li>
        ))}
      </ul>
    );
  };

  // Функция для рендеринга позвонков
  const renderVertebrae = () => {
    if (verts.length === 0) return <span className="empty-value">—</span>;
    
    if (verts.length === 1) {
      return <span className="vertebrae-code">{verts[0].vertebrae.code}</span>;
    }
    
    return (
      <ul className="detail-list">
        {verts.map((f, idx) => (
          <li key={idx}>{f.vertebrae.code}</li>
        ))}
      </ul>
    );
  };

  return (
    <div className={`detail-container ${isMobile ? 'mobile-view' : ''}`}>
      {/* Навигация */}
      <div className="detail-navigation">
        <Link className="link-text" to="/">← Назад</Link>
        <button 
          onClick={() => navigate(`/muscle/${id}/edit`)}
          className="action-btn edit-btn"
          title="Редактировать"
        >
          ✏️
        </button>
        {dysfunctionsCount > 0 && (
          <Link to={`/muscle/${id}/dysfunctions`} className="link-text">
            Список дисфункций: {dysfunctionsCount}
          </Link>
        )}
      </div>
      
      <h1 className="detail-title">
        {muscle.name_ru} 
        <span className="detail-subtitle">({muscle.name_lat})</span>
      </h1>
      
      {/* Адаптивное отображение - либо таблица, либо вертикальные блоки */}
      <div className="detail-content">
        <table className="detail-table">
          <tbody>
            <tr><td className="detail-label">Описание:</td><td className="detail-value description-text">{muscle.notes || <span className="empty-value">—</span>}</td></tr>
            <tr><td className="detail-label">Начало:</td><td className="detail-value">{muscle.origin || <span className="empty-value">—</span>}</td></tr>
            <tr><td className="detail-label">Прикрепление:</td><td className="detail-value">{muscle.insertion || <span className="empty-value">—</span>}</td></tr>
            <tr><td className="detail-label">Группы:</td><td className="detail-value">{renderGroups()}</td></tr>
            <tr><td className="detail-label">Функции:</td><td className="detail-value">{renderFunctions()}</td></tr>
            <tr><td className="detail-label">Меридиан:</td><td className="detail-value">{renderMeridians()}</td></tr>
            <tr><td className="detail-label">Орган:</td><td className="detail-value">{renderOrgans()}</td></tr>
            <tr><td className="detail-label">Иннервация:</td><td className="detail-value">{renderNerves()}</td></tr>
            <tr><td className="detail-label">Позвонок:</td><td className="detail-value">{renderVertebrae()}</td></tr>
            <tr><td className="detail-label">Индикатор:</td><td className="detail-value">{muscle.indicator || <span className="empty-value">—</span>}</td></tr>
            <tr><td className="detail-label">Зона боли:</td><td className="detail-value">{muscle.pain_zones_text || <span className="empty-value">—</span>}</td></tr>
          </tbody>
        </table>
        
        {/* Вертикальная версия для мобильных (будет показана через CSS медиа-запросы) */}
        <div className="mobile-detail">
          <div className="mobile-detail-item">
            <span className="mobile-detail-label">Описание:</span>
            <span className="mobile-detail-value description-text">{muscle.notes || <span className="empty-value">—</span>}</span>
          </div>
          <div className="mobile-detail-item">
            <span className="mobile-detail-label">Начало:</span>
            <span className="mobile-detail-value">{muscle.origin || <span className="empty-value">—</span>}</span>
          </div>
          <div className="mobile-detail-item">
            <span className="mobile-detail-label">Прикрепление:</span>
            <span className="mobile-detail-value">{muscle.insertion || <span className="empty-value">—</span>}</span>
          </div>
          <div className="mobile-detail-item">
            <span className="mobile-detail-label">Группы:</span>
            <span className="mobile-detail-value">{renderGroups()}</span>
          </div>
          <div className="mobile-detail-item">
            <span className="mobile-detail-label">Функции:</span>
            <span className="mobile-detail-value">{renderFunctions()}</span>
          </div>
          <div className="mobile-detail-item">
            <span className="mobile-detail-label">Меридиан:</span>
            <span className="mobile-detail-value">{renderMeridians()}</span>
          </div>
          <div className="mobile-detail-item">
            <span className="mobile-detail-label">Орган:</span>
            <span className="mobile-detail-value">{renderOrgans()}</span>
          </div>
          <div className="mobile-detail-item">
            <span className="mobile-detail-label">Иннервация:</span>
            <span className="mobile-detail-value">{renderNerves()}</span>
          </div>
          <div className="mobile-detail-item">
            <span className="mobile-detail-label">Позвонок:</span>
            <span className="mobile-detail-value">{renderVertebrae()}</span>
          </div>
          <div className="mobile-detail-item">
            <span className="mobile-detail-label">Индикатор:</span>
            <span className="mobile-detail-value">{muscle.indicator || <span className="empty-value">—</span>}</span>
          </div>
          <div className="mobile-detail-item">
            <span className="mobile-detail-label">Зона боли:</span>
            <span className="mobile-detail-value">{muscle.pain_zones_text || <span className="empty-value">—</span>}</span>
          </div>
        </div>
      </div>

    {/* Блок взаимоотношений */}
	{relationships.length > 0 && (
	  <div className="relationships-section">
		<h3>Взаимоотношения мышцы</h3>
		{relationships.map(relationship => {
		  const isSynergist = relationship.synergists?.some(s => s.muscle.id === id) || false;
		  const isAntagonist = relationship.antagonists?.some(a => a.muscle.id === id) || false;		  
		  
		  
		  return (
			<div key={relationship.id} className="relationship-card">
			  <h4 className="relationship-title">
				{relationship.function?.name}
				{relationship.note && ` - ${truncateText(relationship.note, isMobile ? 50 : 200)}`}
			  </h4>
			  
			  <div className="relationship-role">
				<strong>Роль этой мышцы:</strong>{' '}
				{isSynergist ? (
				  <span className="role-synergist">Синергист</span>
				) : isAntagonist ? (
				  <span className="role-antagonist">Антагонист</span>
				) : null}
			  </div>
			  
			  {relationship.synergists && relationship.synergists.length > 0 && (
				<div className="relationship-group">
				  <strong>Синергисты:</strong>
				  <ul className="relationship-list">
					{relationship.synergists.map(synergist => (
					  <li key={synergist.muscle.id}>
						<Link to={`/muscle/${synergist.muscle.id}`} className="link-text">
						  {synergist.muscle.name_ru} ({synergist.muscle.name_lat})
						</Link>
					  </li>
					))}
				  </ul>
				</div>
			  )}

			  {relationship.antagonists && relationship.antagonists.length > 0 && (
				<div className="relationship-group">
				  <strong>Антагонисты:</strong>
				  <ul className="relationship-list">
					{relationship.antagonists.map(antagonist => (
					  <li key={antagonist.muscle.id}>
						<Link to={`/muscle/${antagonist.muscle.id}`} className="link-text">
						  {antagonist.muscle.name_ru} ({antagonist.muscle.name_lat})
						  {/* ВРЕМЕННО: показываем порядок */}
						  <span style={{ fontSize: '10px', color: '#999', marginLeft: '5px' }}>
							[{antagonist.muscle.display_order || '?'}]
						  </span>
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
      
      <hr className="separator" />
      <p className="detail-id"><strong>ID:</strong> {muscle.id}</p>
    </div>
  );
}

export default MuscleDetail;