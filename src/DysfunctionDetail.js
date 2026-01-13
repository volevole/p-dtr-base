// DysfunctionDetail.js
import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from './utils/supabaseClient';
import MediaManager from './MediaManager'; 

function DysfunctionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [dysfunction, setDysfunction] = useState(null);
  const [muscles, setMuscles] = useState([]); // Все мышцы (прямые + из групп)
  const [groups, setGroups] = useState([]); // Группы мышц с этой дисфункцией
  const [relationships, setRelationships] = useState([]); // Взаимоотношения мышц
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('info'); // 'info', 'muscles', 'groups', 'relationships'

  useEffect(() => {
    async function fetchData() {
      setLoading(true);

      try {
        // 1. Загружаем данные дисфункции
        const { data: dysfunctionData, error: dysfunctionError } = await supabase
          .from('dysfunctions')
          .select('*')
          .eq('id', id)
          .single();

        if (dysfunctionError) throw dysfunctionError;

        // 2. Параллельно загружаем все связанные данные
        const [
          { data: directMusclesData },
          { data: groupDysfunctionsData },
          { data: relationshipLinksData },
          { data: allGroupsData }
        ] = await Promise.all([
          // Прямые связи мышц с дисфункцией
          supabase
            .from('muscle_dysfunctions')
            .select(`
              muscle:muscles(
                id,
                name_ru,
                name_lat,
                origin,
                insertion,
                indicator,
                notes,
                pain_zones_text,
                display_order
              )
            `)
            .eq('dysfunction_id', id),
          
          // Связи дисфункции с группами мышц
          supabase
            .from('muscle_group_dysfunctions')
            .select(`
              group_id,
              muscle_groups(
                id,
                name,
                description
              )
            `)
            .eq('dysfunction_id', id),
          
          // Связи дисфункции с взаимоотношениями мышц
          supabase
            .from('synergists_dysfunction') 
            .select(`
              relationship_id,
              muscle_relationships(
                id,
                note,
                functions(name)
              )
            `)
            .eq('dysfunction_id', id),
          
          // Все группы мышц для дальнейших запросов
          supabase
            .from('muscle_groups')
            .select('id, name')
        ]);

        // 3. Получаем мышцы из всех групп с этой дисфункцией
        const groupMuscles = [];

        if (groupDysfunctionsData && groupDysfunctionsData.length > 0) {
          
          // Для каждой группы получаем все мышцы
          for (const groupData of groupDysfunctionsData) {
            
            const { data: groupMusclesData, error: groupMusclesError } = await supabase
              .from('muscle_group_membership')
              .select(`
                muscle:muscles(
                  id,
                  name_ru,
                  name_lat,
                  origin,
                  insertion,
                  indicator,
                  notes,
                  pain_zones_text,
                  display_order
                )
              `)
              .eq('group_id', groupData.group_id);
                            
            if (groupMusclesError) {
              console.error('Ошибка загрузки мышц группы:', groupMusclesError);
              continue;
            }
            
            if (groupMusclesData && groupMusclesData.length > 0) {
              
              groupMusclesData.forEach(item => {
                
                if (item.muscle) {
                  // Добавляем информацию о группе к каждой мышце
                  groupMuscles.push({
                    ...item.muscle,
                    viaGroup: true,
                    groupName: groupData.muscle_groups?.name || 'Группа мышц',
                    groupId: groupData.group_id
                  });
                } else {
                  console.warn('У элемента нет поля muscle:', item);
                }
              });
            } else {
              console.warn('В группе нет мышц или данные пустые');
            }
          }
        }

        setDysfunction(dysfunctionData);
        
        // Обрабатываем прямые связи мышц
        const directMuscles = (directMusclesData?.map(item => ({
          ...item.muscle,
          viaGroup: false,
          groupName: null,
          groupId: null
        })) || []);
        
        // Объединяем все мышцы
        const allMuscles = [...directMuscles, ...groupMuscles];

        // Удаляем дубликаты (если мышца есть и в прямой связи, и в групповой)
        const uniqueMuscles = Array.from(new Set(allMuscles.map(m => m.id)))
          .map(muscleId => {
            const muscle = allMuscles.find(m => m.id === muscleId);
            // Если мышца есть и в прямой, и в групповой связи, показываем как прямую
            const muscleInDirect = directMuscles.find(m => m.id === muscleId);
            return muscleInDirect || muscle;
          })
          // Сортируем по display_order
          .sort((a, b) => (a.display_order || 0) - (b.display_order || 0));

        setMuscles(uniqueMuscles);
        
        // Сохраняем группы с этой дисфункцией
        const groupsList = groupDysfunctionsData?.map(item => ({
          id: item.group_id,
          name: item.muscle_groups?.name || 'Группа мышц',
          description: item.muscle_groups?.description
        })) || [];
        setGroups(groupsList);
        
        // Сохраняем взаимоотношения мышц
        const relationshipsList = relationshipLinksData?.map(item => {
          // Формируем полное название: "Функция Примечание"
          const fullTitle = item.muscle_relationships?.functions?.name && item.muscle_relationships?.note
            ? `${item.muscle_relationships.functions.name} ${item.muscle_relationships.note}`.trim()
            : item.muscle_relationships?.note || item.muscle_relationships?.functions?.name || 'Без названия';
          
          return {
            id: item.relationship_id,
            note: item.muscle_relationships?.note || 'Без названия',
            functionName: item.muscle_relationships?.functions?.name || 'Не указано',
            fullTitle: fullTitle
          };
        }) || [];
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
          style={{
            marginLeft: '15px',
            padding: '5px 10px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
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
                {/* Визуальная диагностика */}
                <div style={infoCardStyle}>
                  <h3 style={sectionTitleStyle}>
                    <span role="img" aria-label="eye">👁️</span> Визуальная диагностика
                  </h3>
                  <div style={{ lineHeight: '1.6' }}>
                    {renderMultilineText(dysfunction.visual_diagnosis)}
                  </div>
                </div>

                {/* Провокации */}
                <div style={infoCardStyle}>
                  <h3 style={sectionTitleStyle}>
                    <span role="img" aria-label="test">🧪</span> Провокации
                  </h3>
                  <div style={{ lineHeight: '1.6' }}>
                    {renderMultilineText(dysfunction.provocations_text)}
                  </div>
                </div>

                {/* Алгоритм */}
                <div style={infoCardStyle}>
                  <h3 style={sectionTitleStyle}>
                    <span role="img" aria-label="algorithm">⚙️</span> Алгоритм диагностики
                  </h3>
                  <div style={{ lineHeight: '1.6' }}>
                    {renderMultilineText(dysfunction.main_algorithm)}
                  </div>
                </div>

                {/* Рецепторы */}
                <div style={infoCardStyle}>
                  <h3 style={sectionTitleStyle}>
                    <span role="img" aria-label="receptors">🔬</span> Рецепторы
                  </h3>
                  <div style={{ display: 'grid', gap: '15px' }}>
                    <div>
                      <h4 style={{ marginBottom: '5px', color: '#495057', fontSize: '16px' }}>
                        Рецептор 1:
                      </h4>
                      <div style={{ 
                        backgroundColor: '#e9f5ff', 
                        padding: '10px', 
                        borderRadius: '4px',
                        borderLeft: '4px solid #007bff'
                      }}>
                        {dysfunction.receptor_1 || <span style={{ color: '#999', fontStyle: 'italic' }}>Не указан</span>}
                      </div>
                    </div>
                    <div>
                      <h4 style={{ marginBottom: '5px', color: '#495057', fontSize: '16px' }}>
                        Рецептор 2:
                      </h4>
                      <div style={{ 
                        backgroundColor: '#e9f5ff', 
                        padding: '10px', 
                        borderRadius: '4px',
                        borderLeft: '4px solid #007bff'
                      }}>
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
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', 
                  gap: '20px'
                }}>
                  {muscles.map(muscle => (
                    <div 
                      key={muscle.id}
                      style={{
                        border: '1px solid #ddd',
                        borderRadius: '8px',
                        padding: '20px',
                        backgroundColor: muscle.viaGroup ? '#f0fff4' : '#f9f9f9',
                        transition: 'transform 0.2s, box-shadow 0.2s',
                        borderLeft: muscle.viaGroup ? '4px solid #28a745' : '4px solid #ddd',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.1)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)';
                      }}
                      title={muscle.viaGroup ? `Связь через группу: ${muscle.groupName}` : 'Прямая связь'}
                    >
                      <h3 style={{ marginTop: 0, color: muscle.viaGroup ? '#28a745' : '#333' }}>
                        <Link 
                          to={`/muscle/${muscle.id}`}
                          style={{ 
                            color: 'inherit', 
                            textDecoration: 'none',
                            display: 'flex',
                            alignItems: 'center'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
                          onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
                        >
                          {muscle.name_ru}
                          {muscle.viaGroup && (
                            <span style={{ 
                              fontSize: '12px', 
                              marginLeft: '8px',
                              backgroundColor: '#28a745',
                              color: 'white',
                              padding: '2px 8px',
                              borderRadius: '12px'
                            }}>
                              Группа
                            </span>
                          )}
                        </Link>
                      </h3>
                      
                      {muscle.name_lat && (
                        <div style={{ 
                          fontStyle: 'italic', 
                          color: '#666', 
                          marginBottom: '12px',
                          fontSize: '14px'
                        }}>
                          {muscle.name_lat}
                        </div>
                      )}
                      
                     
                      
                      {muscle.notes && (
                        <div style={{ fontSize: '14px', color: '#555', marginBottom: '8px' }}>
                          <strong>Примечания:</strong> {muscle.notes}
                        </div>
                      )}
                      
                      {muscle.pain_zones_text && (
                        <div style={{ fontSize: '14px', color: '#dc3545', marginBottom: '8px' }}>
                          <strong>Зоны боли:</strong> {muscle.pain_zones_text}
                        </div>
                      )}
                      
                      {muscle.viaGroup && muscle.groupName && (
                        <div style={{ 
                          marginTop: '15px',
                          fontSize: '13px',
                          color: '#28a745',
                          borderTop: '1px solid #e8f5e9',
                          paddingTop: '10px',
                          display: 'flex',
                          alignItems: 'center'
                        }}>
                          <span style={{ fontWeight: 'bold', marginRight: '5px' }}>Связь через группу:</span>
                          <Link 
                            to={`/group/${muscle.groupId}`}
                            style={{ color: '#28a745', textDecoration: 'none' }}
                            onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
                            onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
                          >
                            {muscle.groupName}
                          </Link>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ 
                  textAlign: 'center', 
                  padding: '40px',
                  backgroundColor: '#f8f9fa',
                  borderRadius: '8px',
                  border: '2px dashed #dee2e6'
                }}>
                  <h3>Нет связанных мышц</h3>
                  <p>Эта дисфункция пока не связана ни с какими мышцами</p>
                </div>
              )}
            </div>
          )}

          {/* Вкладка: Группы мышц */}
          {activeTab === 'groups' && groups.length > 0 && (
            <div>
              <h3 style={{ color: '#495057', marginBottom: '20px' }}>
                Группы мышц, связанные с этой дисфункцией
              </h3>
              
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', 
                gap: '20px'
              }}>
                {groups.map(group => (
                  <div 
                    key={group.id}
                    style={{
                      border: '1px solid #007bff',
                      borderRadius: '8px',
                      padding: '20px',
                      backgroundColor: '#e7f3ff',
                      transition: 'transform 0.2s, box-shadow 0.2s',
                      boxShadow: '0 2px 4px rgba(0,123,255,0.1)'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,123,255,0.2)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,123,255,0.1)';
                    }}
                  >
                    <h4 style={{ margin: '0 0 15px 0', color: '#007bff' }}>
                      <Link 
                        to={`/group/${group.id}`}
                        style={{ 
                          color: 'inherit', 
                          textDecoration: 'none',
                          display: 'block'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
                        onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
                      >
                        {group.name}
                      </Link>
                    </h4>
                    
                    {group.description && (
                      <div style={{ 
                        fontSize: '14px', 
                        color: '#495057',
                        lineHeight: '1.5'
                      }}>
                        {group.description}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Вкладка: Взаимоотношения */}
          {activeTab === 'relationships' && relationships.length > 0 && (
            <div>
              <h3 style={{ color: '#495057', marginBottom: '20px' }}>
                Взаимоотношения мышц, связанные с этой дисфункцией
              </h3>
              
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', 
                gap: '20px'
              }}>
                {relationships.map(relationship => (
                  <div 
                    key={relationship.id}
                    style={{
                      border: '1px solid #17a2b8',
                      borderRadius: '8px',
                      padding: '20px',
                      backgroundColor: '#d1ecf1',
                      transition: 'transform 0.2s, box-shadow 0.2s',
                      boxShadow: '0 2px 4px rgba(23,162,184,0.1)'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 4px 8px rgba(23,162,184,0.2)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 2px 4px rgba(23,162,184,0.1)';
                    }}
                  >
                    <h4 style={{ margin: '0 0 15px 0', color: '#0c5460' }}>
                      {relationship.fullTitle}
                    </h4>
                    
                    {relationship.functionName && (
                      <div style={{ 
                        fontSize: '14px', 
                        color: '#0c5460',
                        marginBottom: '10px'
                      }}>
                        <strong>Тип функции:</strong> {relationship.functionName}
                      </div>
                    )}
                    
                    {relationship.note && relationship.note !== relationship.functionName && (
                      <div style={{ 
                        fontSize: '14px', 
                        color: '#0c5460',
                        marginBottom: '10px'
                      }}>
                        <strong>Примечание:</strong> {relationship.note}
                      </div>
                    )}
                    
                    <div style={{ 
                      marginTop: '15px',
                      fontSize: '12px',
                      color: '#6c757d',
                      display: 'flex',
                      justifyContent: 'flex-end'
                    }}>
                      <span style={{ 
                        backgroundColor: '#17a2b8',
                        color: 'white',
                        padding: '4px 12px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: '500'
                      }}>
                        Взаимоотношение мышц
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

	 {/* ========== ДОБАВЛЯЕМ MEDIA MANAGER ДЛЯ ОРГАНА ========== */}
	  <MediaManager 
		entityType="dysfunction"
		entityId={id}
		entityName={dysfunction.name}
		showTitle={true}
		readonly={true}
	  />
	  {/* ========== КОНЕЦ ДОБАВЛЕНИЯ ========== */}


      {/* Информация внизу страницы */}
      <div style={{ 
        marginTop: '40px',
        paddingTop: '20px',
        borderTop: '1px solid #eee',
        fontSize: '12px',
        color: '#999'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <strong>ID дисфункции:</strong> {dysfunction.id}
          </div>
          <div>
            <strong>Связи:</strong> {muscles.length} мышц • {groups.length} групп • {relationships.length} взаимоотношений
          </div>
        </div>
      </div>
    </div>
  );
}

export default DysfunctionDetail;