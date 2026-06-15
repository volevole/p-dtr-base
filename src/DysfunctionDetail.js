// DysfunctionDetail.js
import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import API_URL from './config/api';
import MediaManager from './MediaManager';

function DysfunctionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [dysfunction, setDysfunction] = useState(null);
  const [muscles, setMuscles] = useState([]);
  const [groups, setGroups] = useState([]);
  const [relationships, setRelationships] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('info');

  useEffect(() => {
    async function fetchData() {
      setLoading(true);

      try {
        // 1. Загружаем данные дисфункции
        const dysfunctionRes = await fetch(`${API_URL}/api/dysfunctions/${id}`);
        const dysfunctionData = await dysfunctionRes.json();                  

        if (!dysfunctionData.success) throw new Error(dysfunctionData.error);
        
        // 2. Загружаем прямые связи
        
        const [directMusclesRes, groupsRes, relationshipsRes] = await Promise.all([
          
          fetch(`${API_URL}/api/dysfunctions/${id}/muscles`),
          fetch(`${API_URL}/api/dysfunctions/${id}/muscle-groups`),
          fetch(`${API_URL}/api/dysfunctions/${id}/relationships`)
        ]);
        
        const directMusclesData = await directMusclesRes.json();
        const groupsData = await groupsRes.json();
        const relationshipsData = await relationshipsRes.json();
        
        const directMuscles = directMusclesData.success ? directMusclesData.data : [];
        const groupDysfunctions = groupsData.success ? groupsData.data : [];
        const relationshipLinks = relationshipsData.success ? relationshipsData.data : [];

        // 3. Получаем мышцы из всех групп
        const groupMuscles = [];
        
        if (groupDysfunctions && groupDysfunctions.length > 0) {
          for (const group of groupDysfunctions) {
            const groupMusclesRes = await fetch(`${API_URL}/api/muscle-groups/${group.id}/muscles`);
            const groupMusclesData = await groupMusclesRes.json();
            
            if (groupMusclesData.success && groupMusclesData.data) {
              groupMusclesData.data.forEach(muscle => {
                groupMuscles.push({
                  ...muscle,
                  viaGroup: true,
                  groupName: group.name || 'Группа мышц',
                  groupId: group.id
                });
              });
            }
          }
        }

        setDysfunction(dysfunctionData.data);
        
        // Обрабатываем прямые связи
        const directMusclesList = directMuscles.map(muscle => ({
          ...muscle,
          viaGroup: false,
          groupName: null,
          groupId: null
        }));
        
        // Объединяем все мышцы
        const allMuscles = [...directMusclesList, ...groupMuscles];
        
        // Удаляем дубликаты
        const uniqueMuscles = Array.from(new Set(allMuscles.map(m => m.id)))
          .map(muscleId => {
            const muscle = allMuscles.find(m => m.id === muscleId);
            const muscleInDirect = directMusclesList.find(m => m.id === muscleId);
            return muscleInDirect || muscle;
          })
          .sort((a, b) => (a.display_order || 0) - (b.display_order || 0));

        setMuscles(uniqueMuscles);
        
        // Сохраняем группы
        const groupsList = groupDysfunctions.map(group => ({
          id: group.id,
          name: group.name || 'Группа мышц',
          description: group.description
        }));
        setGroups(groupsList);
        
        // Сохраняем взаимоотношения
        const relationshipsList = relationshipLinks.map(relationship => {
          const fullTitle = relationship.function_name && relationship.note
            ? `${relationship.function_name} ${relationship.note}`.trim()
            : relationship.note || relationship.function_name || 'Без названия';
          
          return {
            id: relationship.id,
            note: relationship.note || 'Без названия',
            functionName: relationship.function_name || 'Не указано',
            fullTitle: fullTitle
          };
        });
        setRelationships(relationshipsList);

      } catch (error) {
        console.error('Ошибка загрузки данных:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [id]);

  if (loading) return <div style={{ padding: '2rem' }}>Загрузка...</div>;
  if (!dysfunction) return <div style={{ padding: '2rem' }}>Дисфункция не найдена</div>;

  // Функция для отображения многострочного текста
  const renderMultilineText = (text) => {
    if (!text) return <span style={{ color: '#999', fontStyle: 'italic' }}>Не указано</span>;
    
    return text.split('\n').map((line, index) => (
      <React.Fragment key={index}>
        {line}
        {index < text.split('\n').length - 1 && <br />}
      </React.Fragment>
    ));
  };

  const tabButtonStyle = (isActive) => ({
    padding: '10px 20px',
    backgroundColor: isActive ? '#007bff' : '#f8f9fa',
    color: isActive ? 'white' : '#495057',
    border: '1px solid #dee2e6',
    borderBottom: isActive ? 'none' : '1px solid #dee2e6',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: isActive ? '600' : '400',
    borderRadius: '8px 8px 0 0',
    marginRight: '5px'
  });

  const infoCardStyle = {
    backgroundColor: 'white',
    border: '1px solid #e0e0e0',
    borderRadius: '8px',
    padding: '20px',
    marginBottom: '20px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
  };

  const sectionTitleStyle = {
    color: '#495057',
    borderBottom: '2px solid #007bff',
    paddingBottom: '8px',
    marginBottom: '15px',
    fontSize: '18px'
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: 'auto' }}>      
      <div style={{ marginBottom: '20px' }}>
        <Link to="/dysfunctions">← Назад к списку</Link>
        <button 
          onClick={() => navigate(`/dysfunction/${id}/edit`)}
          className="action-btn edit-btn"
          
        >
          ✏️ 
        </button>
      </div>

      <h1 style={{ marginBottom: '10px' }}>
        <small style={{ fontSize: '16px', color: '#666' }}>Дисфункция:</small><br />
        {dysfunction.name}
      </h1>

      {/* Вкладки */}
      <div style={{ marginBottom: '30px' }}>
        <div style={{ display: 'flex', borderBottom: '1px solid #dee2e6' }}>
          <button 
            style={tabButtonStyle(activeTab === 'info')}
            onClick={() => setActiveTab('info')}
          >
            📋 Основная информация
          </button>
          <button 
            style={tabButtonStyle(activeTab === 'muscles')}
            onClick={() => setActiveTab('muscles')}
          >
            💪 Связанные мышцы ({muscles.length})
          </button>
          {groups.length > 0 && (
            <button 
              style={tabButtonStyle(activeTab === 'groups')}
              onClick={() => setActiveTab('groups')}
            >
              👥 Группы мышц ({groups.length})
            </button>
          )}
          {relationships.length > 0 && (
            <button 
              style={tabButtonStyle(activeTab === 'relationships')}
              onClick={() => setActiveTab('relationships')}
            >
              🤝 Взаимоотношения ({relationships.length})
            </button>
          )}
        </div>

        {/* Содержимое вкладок */}
        <div style={{ 
          border: '1px solid #dee2e6', 
          borderTop: 'none', 
          borderRadius: '0 0 8px 8px',
          padding: '30px',
          backgroundColor: '#f8f9fa',
          minHeight: '300px'
        }}>
          {/* Вкладка: Основная информация */}
          {activeTab === 'info' && (
            <div>
              <div style={infoCardStyle}>
                <h3 style={sectionTitleStyle}>Описание дисфункции</h3>
                <div style={{ lineHeight: '1.6', fontSize: '16px' }}>
                  {renderMultilineText(dysfunction.description)}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '20px' }}>
                <div style={infoCardStyle}>
                  <h3 style={sectionTitleStyle}>👁️ Визуальная диагностика</h3>
                  <div style={{ lineHeight: '1.6' }}>
                    {renderMultilineText(dysfunction.visual_diagnosis)}
                  </div>
                </div>

                <div style={infoCardStyle}>
                  <h3 style={sectionTitleStyle}>🧪 Провокации</h3>
                  <div style={{ lineHeight: '1.6' }}>
                    {renderMultilineText(dysfunction.provocations_text)}
                  </div>
                </div>

                <div style={infoCardStyle}>
                  <h3 style={sectionTitleStyle}>⚙️ Алгоритм диагностики</h3>
                  <div style={{ lineHeight: '1.6' }}>
                    {renderMultilineText(dysfunction.main_algorithm)}
                  </div>
                </div>

                <div style={infoCardStyle}>
                  <h3 style={sectionTitleStyle}>🔬 Рецепторы</h3>
                  <div style={{ display: 'grid', gap: '15px' }}>
                    <div>
                      <h4 style={{ marginBottom: '5px', color: '#495057', fontSize: '16px' }}>Рецептор 1:</h4>
                      <div style={{ backgroundColor: '#e9f5ff', padding: '10px', borderRadius: '4px', borderLeft: '4px solid #007bff' }}>
                        {dysfunction.receptor_1 || <span style={{ color: '#999', fontStyle: 'italic' }}>Не указан</span>}
                      </div>
                    </div>
                    <div>
                      <h4 style={{ marginBottom: '5px', color: '#495057', fontSize: '16px' }}>Рецептор 2:</h4>
                      <div style={{ backgroundColor: '#e9f5ff', padding: '10px', borderRadius: '4px', borderLeft: '4px solid #007bff' }}>
                        {dysfunction.receptor_2 || <span style={{ color: '#999', fontStyle: 'italic' }}>Не указан</span>}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Вкладка: Связанные мышцы */}
          {activeTab === 'muscles' && (
            <div>
              <div style={{ marginBottom: '20px' }}>
                <h3 style={{ color: '#495057', marginBottom: '15px' }}>
                  Всего связанных мышц: {muscles.length}
                  {groups.length > 0 && (
                    <span style={{ fontSize: '14px', color: '#666', marginLeft: '10px' }}>
                      (из них {muscles.filter(m => m.viaGroup).length} через группы)
                    </span>
                  )}
                </h3>
              </div>

              {muscles.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '20px' }}>
                  {muscles.map(muscle => (
                    <div 
                      key={muscle.id}
                      style={{
                        border: '1px solid #ddd',
                        borderRadius: '8px',
                        padding: '20px',
                        backgroundColor: muscle.viaGroup ? '#f0fff4' : '#f9f9f9',
                        borderLeft: muscle.viaGroup ? '4px solid #28a745' : '4px solid #ddd',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                      }}
                    >
                      <h3 style={{ marginTop: 0 }}>
                        <Link to={`/muscle/${muscle.id}`} style={{ color: muscle.viaGroup ? '#28a745' : '#333', textDecoration: 'none' }}>
                          {muscle.name_ru || muscle.name}
                          {muscle.viaGroup && (
                            <span style={{ fontSize: '12px', marginLeft: '8px', backgroundColor: '#28a745', color: 'white', padding: '2px 8px', borderRadius: '12px' }}>
                              Группа
                            </span>
                          )}
                        </Link>
                      </h3>
                      {muscle.name_lat && <div style={{ fontStyle: 'italic', color: '#666' }}>{muscle.name_lat}</div>}
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '40px' }}>Нет связанных мышц</div>
              )}
            </div>
          )}

          {/* Вкладка: Группы мышц */}
          {activeTab === 'groups' && groups.length > 0 && (
            <div>
              <h3>Группы мышц, связанные с этой дисфункцией</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
                {groups.map(group => (
                  <div key={group.id} style={{ border: '1px solid #007bff', borderRadius: '8px', padding: '20px', backgroundColor: '#e7f3ff' }}>
                    <Link to={`/group/${group.id}`} style={{ color: '#007bff', textDecoration: 'none', fontSize: '18px', fontWeight: 'bold' }}>
                      {group.name}
                    </Link>
                    {group.description && <div style={{ marginTop: '10px', color: '#495057' }}>{group.description}</div>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Вкладка: Взаимоотношения */}
          {activeTab === 'relationships' && relationships.length > 0 && (
            <div>
              <h3>Взаимоотношения мышц, связанные с этой дисфункцией</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '20px' }}>
                {relationships.map(relationship => (
                  <div key={relationship.id} style={{ border: '1px solid #17a2b8', borderRadius: '8px', padding: '20px', backgroundColor: '#d1ecf1' }}>
                    <h4 style={{ margin: '0 0 10px 0', color: '#0c5460' }}>{relationship.fullTitle}</h4>
                    {relationship.functionName && <div><strong>Тип функции:</strong> {relationship.functionName}</div>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <MediaManager 
        entityType="dysfunction"
        entityId={id}
        entityName={dysfunction.name}
        showTitle={true}
        readonly={true}
      />

      <div style={{ marginTop: '40px', paddingTop: '20px', borderTop: '1px solid #eee', fontSize: '12px', color: '#999' }}>
        <div><strong>ID дисфункции:</strong> {dysfunction.id}</div>
      </div>
    </div>
  );
}

export default DysfunctionDetail;