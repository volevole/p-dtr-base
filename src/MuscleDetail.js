// MuscleDetail.js - использует справочники для отображения названий
import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import API_URL from './config/api';
import { FaEdit } from 'react-icons/fa';
import MediaManager from './MediaManager';
import './App.css';

const truncateText = (text, maxLength = 200) => {
  if (!text) return text;
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

function MuscleDetail() {
  const { id } = useParams();
  const [muscle, setMuscle] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const [dysfunctionsCount, setDysfunctionsCount] = useState(0);
  const [relationships, setRelationships] = useState([]);
  
  // Справочники
  const [groupsDict, setGroupsDict] = useState({});
  const [functionsDict, setFunctionsDict] = useState({});
  const [meridiansDict, setMeridiansDict] = useState({});
  const [organsDict, setOrgansDict] = useState({});
  const [nervesDict, setNervesDict] = useState({});
  const [vertebraeDict, setVertebraeDict] = useState({});
  
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
    async function loadDictionaries() {
      try {
        // Загружаем все справочники параллельно
        const [groupsRes, functionsRes, meridiansRes, organsRes, nervesRes, vertebraeRes] = await Promise.all([
          fetch(`${API_URL}/api/dictionaries/groups`),
          fetch(`${API_URL}/api/dictionaries/functions`),
          fetch(`${API_URL}/api/dictionaries/meridians`),
          fetch(`${API_URL}/api/dictionaries/organs`),
          fetch(`${API_URL}/api/dictionaries/nerves`),
          fetch(`${API_URL}/api/dictionaries/vertebrae`)
        ]);
        
        const groupsData = await groupsRes.json();
        const functionsData = await functionsRes.json();
        const meridiansData = await meridiansRes.json();
        const organsData = await organsRes.json();
        const nervesData = await nervesRes.json();
        const vertebraeData = await vertebraeRes.json();
        
        // Преобразуем в Map для быстрого доступа по ID
        const groupsMap = {};
        (groupsData.data || []).forEach(g => { groupsMap[g.id] = g.name; });
        
        const functionsMap = {};
        (functionsData.data || []).forEach(f => { functionsMap[f.id] = f.name; });
        
        const meridiansMap = {};
        (meridiansData.data || []).forEach(m => { meridiansMap[m.id] = { name: m.name, code: m.code }; });
        
        const organsMap = {};
        (organsData.data || []).forEach(o => { organsMap[o.id] = { name: o.name, system: o.system }; });
        
        const nervesMap = {};
        (nervesData.data || []).forEach(n => { nervesMap[n.id] = { name: n.name, type: n.type }; });
        
        const vertebraeMap = {};
        (vertebraeData.data || []).forEach(v => { vertebraeMap[v.id] = v.code; });
        
        setGroupsDict(groupsMap);
        setFunctionsDict(functionsMap);
        setMeridiansDict(meridiansMap);
        setOrgansDict(organsMap);
        setNervesDict(nervesMap);
        setVertebraeDict(vertebraeMap);
      } catch (error) {
        console.error('Error loading dictionaries:', error);
      }
    }
    
    async function fetchData() {
      setLoading(true);
      try {
        // Загружаем справочники
        await loadDictionaries();
        
        // 1. Основные данные мышцы
        const muscleRes = await fetch(`${API_URL}/api/muscle/${id}`);
        const muscleResult = await muscleRes.json();
        if (!muscleResult.success) throw new Error(muscleResult.error);
        
        // 2. Связи
        const relationsRes = await fetch(`${API_URL}/api/muscle/${id}/relations`);
        const relationsResult = await relationsRes.json();
        
        const fullMuscle = {
          ...muscleResult.data,
          muscle_groups: relationsResult.data?.groups || [],
          muscle_functions: relationsResult.data?.functions || [],
          muscle_meridians: relationsResult.data?.meridians || [],
          muscle_organs: relationsResult.data?.organs || [],
          muscle_nerves: relationsResult.data?.nerves || [],
          muscle_vertebrae: relationsResult.data?.vertebrae || []
        };
        
        setMuscle(fullMuscle);
        
        // 3. Количество дисфункций
        const dysRes = await fetch(`${API_URL}/api/muscle/${id}/dysfunctions-count`);
        const dysResult = await dysRes.json();
        if (dysResult.success) {
          setDysfunctionsCount(dysResult.count);
        }
        
        // 4. Отношения
        const relRes = await fetch(`${API_URL}/api/muscle/${id}/relationships`);
        const relResult = await relRes.json();
        if (relResult.success) {
          setRelationships(relResult.data || []);
        }
      } catch (error) {
        console.error('Error loading muscle:', error);
        alert('Ошибка загрузки данных: ' + error.message);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [id]);

  if (loading) return <div className="detail-container">Загрузка...</div>;
  if (!muscle) return <div className="detail-container">Мышца не найдена</div>;

  // Функции рендеринга с использованием справочников
  const renderGroups = () => {
    const groups = muscle.muscle_groups || [];
    if (groups.length === 0) return <span className="empty-value">—</span>;
    
    if (groups.length === 1) {
      const groupId = groups[0];
      return (
        <>
          <Link to={`/group/${groupId}`} className="link-text bold-link">
            {groupsDict[groupId] || groupId}
          </Link>
        </>
      );
    }
    
    return (
      <ul className="detail-list">
        {groups.map((groupId, idx) => (
          <li key={idx}>
            <Link to={`/group/${groupId}`} className="link-text bold-link">
              {groupsDict[groupId] || groupId}
            </Link>
          </li>
        ))}
      </ul>
    );
  };

  const renderFunctions = () => {
    const functions = muscle.muscle_functions || [];
    if (functions.length === 0) return <span className="empty-value">—</span>;
    
    if (functions.length === 1) {
      const func = functions[0];
      return (
        <>
          {functionsDict[func.id] || func.id}
          {func.note && <em className="small-text"> – {func.note}</em>}
        </>
      );
    }
    
    return (
      <ul className="detail-list">
        {functions.map((func, idx) => (
          <li key={idx}>
            {functionsDict[func.id] || func.id}
            {func.note && <em className="small-text"> – {func.note}</em>}
          </li>
        ))}
      </ul>
    );
  };

  const renderMeridians = () => {
    const meridians = muscle.muscle_meridians || [];
    if (meridians.length === 0) return <span className="empty-value">—</span>;
    
    if (meridians.length === 1) {
      const meridianId = meridians[0];
      const meridian = meridiansDict[meridianId] || {};
      return (
        <>
          <Link to={`/meridian/${meridianId}`} className="link-text bold-link">
            {meridian.name || meridianId}
          </Link>
          {meridian.code && <span className="code-badge"> [{meridian.code}]</span>}
        </>
      );
    }
    
    return (
      <ul className="detail-list">
        {meridians.map((meridianId, idx) => {
          const meridian = meridiansDict[meridianId] || {};
          return (
            <li key={idx}>
              <Link to={`/meridian/${meridianId}`} className="link-text bold-link">
                {meridian.name || meridianId}
              </Link>
              {meridian.code && <span className="code-badge"> [{meridian.code}]</span>}
            </li>
          );
        })}
      </ul>
    );
  };

  const renderOrgans = () => {
    const organs = muscle.muscle_organs || [];
    if (organs.length === 0) return <span className="empty-value">—</span>;
    
    if (organs.length === 1) {
      const organId = organs[0];
      const organ = organsDict[organId] || {};
      return (
        <>
          <Link to={`/organ/${organId}`} className="link-text bold-link">
            {organ.name || organId}
          </Link>
          {organ.system && <span className="system-badge"> ({organ.system})</span>}
        </>
      );
    }
    
    return (
      <ul className="detail-list">
        {organs.map((organId, idx) => {
          const organ = organsDict[organId] || {};
          return (
            <li key={idx}>
              <Link to={`/organ/${organId}`} className="link-text bold-link">
                {organ.name || organId}
              </Link>
              {organ.system && <span className="system-badge"> ({organ.system})</span>}
            </li>
          );
        })}
      </ul>
    );
  };

  const renderNerves = () => {
    const nerves = muscle.muscle_nerves || [];
    if (nerves.length === 0) return <span className="empty-value">—</span>;
    
    if (nerves.length === 1) {
      const nerveId = nerves[0];
      const nerve = nervesDict[nerveId] || {};
      return (
        <>
          {nerve.name || nerveId}
          {nerve.type && <span className="type-badge"> ({nerve.type})</span>}
        </>
      );
    }
    
    return (
      <ul className="detail-list">
        {nerves.map((nerveId, idx) => {
          const nerve = nervesDict[nerveId] || {};
          return (
            <li key={idx}>
              {nerve.name || nerveId}
              {nerve.type && <span className="type-badge"> ({nerve.type})</span>}
            </li>
          );
        })}
      </ul>
    );
  };

  const renderVertebrae = () => {
    const vertebrae = muscle.muscle_vertebrae || [];
    if (vertebrae.length === 0) return <span className="empty-value">—</span>;
    
    if (vertebrae.length === 1) {
      const vertebraId = vertebrae[0];
      return <span className="vertebrae-code">{vertebraeDict[vertebraId] || vertebraId}</span>;
    }
    
    return (
      <ul className="detail-list">
        {vertebrae.map((vertebraId, idx) => (
          <li key={idx}>{vertebraeDict[vertebraId] || vertebraId}</li>
        ))}
      </ul>
    );
  };

  return (
    <div className={`detail-container ${isMobile ? 'mobile-view' : ''}`}>
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
        
        <div className="mobile-detail">
          <div className="mobile-detail-item"><span className="mobile-detail-label">Описание:</span><span className="mobile-detail-value description-text">{muscle.notes || <span className="empty-value">—</span>}</span></div>
          <div className="mobile-detail-item"><span className="mobile-detail-label">Начало:</span><span className="mobile-detail-value">{muscle.origin || <span className="empty-value">—</span>}</span></div>
          <div className="mobile-detail-item"><span className="mobile-detail-label">Прикрепление:</span><span className="mobile-detail-value">{muscle.insertion || <span className="empty-value">—</span>}</span></div>
          <div className="mobile-detail-item"><span className="mobile-detail-label">Группы:</span><span className="mobile-detail-value">{renderGroups()}</span></div>
          <div className="mobile-detail-item"><span className="mobile-detail-label">Функции:</span><span className="mobile-detail-value">{renderFunctions()}</span></div>
          <div className="mobile-detail-item"><span className="mobile-detail-label">Меридиан:</span><span className="mobile-detail-value">{renderMeridians()}</span></div>
          <div className="mobile-detail-item"><span className="mobile-detail-label">Орган:</span><span className="mobile-detail-value">{renderOrgans()}</span></div>
          <div className="mobile-detail-item"><span className="mobile-detail-label">Иннервация:</span><span className="mobile-detail-value">{renderNerves()}</span></div>
          <div className="mobile-detail-item"><span className="mobile-detail-label">Позвонок:</span><span className="mobile-detail-value">{renderVertebrae()}</span></div>
          <div className="mobile-detail-item"><span className="mobile-detail-label">Индикатор:</span><span className="mobile-detail-value">{muscle.indicator || <span className="empty-value">—</span>}</span></div>
          <div className="mobile-detail-item"><span className="mobile-detail-label">Зона боли:</span><span className="mobile-detail-value">{muscle.pain_zones_text || <span className="empty-value">—</span>}</span></div>
        </div>
      </div>

      {relationships.length > 0 && (
        <div className="relationships-section">
          <h3>Взаимоотношения мышцы</h3>
          {relationships.map(relationship => {
            const isSynergist = relationship.synergists?.some(s => s.muscle_id === id) || false;
            const isAntagonist = relationship.antagonists?.some(a => a.muscle_id === id) || false;
            
            return (
              <div key={relationship.id} className="relationship-card">
                <h4 className="relationship-title">
                  {relationship.function_name}
                  {relationship.note && ` - ${truncateText(relationship.note, isMobile ? 50 : 200)}`}
                </h4>
                <div className="relationship-role">
                  <strong>Роль этой мышцы:</strong>{' '}
                  {isSynergist ? <span className="role-synergist">Синергист</span> : <span className="role-antagonist">Антагонист</span>}
                </div>
                {relationship.synergists && relationship.synergists.length > 0 && (
                  <div className="relationship-group">
                    <strong>Синергисты:</strong>
                    <ul className="relationship-list">
                      {relationship.synergists.map(synergist => (
                        <li key={synergist.muscle_id}>
                          <Link to={`/muscle/${synergist.muscle_id}`} className="link-text">
                            {synergist.name_ru} ({synergist.name_lat})
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
                        <li key={antagonist.muscle_id}>
                          <Link to={`/muscle/${antagonist.muscle_id}`} className="link-text">
                            {antagonist.name_ru} ({antagonist.name_lat})
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

      <MediaManager 
        entityType="muscle"
        entityId={id}
        entityName={muscle?.name_ru || ''}
        showTitle={true}
        readonly={true}
        viewMode="inline"   // <-- добавляем эту строку для теста
      />
      
      <hr className="separator" />
      <p className="detail-id"><strong>ID:</strong> {muscle.id}</p>
    </div>
  );
}

export default MuscleDetail;