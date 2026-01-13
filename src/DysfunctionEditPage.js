// DysfunctionEditPage.js
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from './utils/supabaseClient';
import MediaManager from './MediaManager';
import API_URL from './config/api';

function DysfunctionEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [dysfunction, setDysfunction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Основные поля дисфункции
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    visual_diagnosis: '',
    provocations_text: '',
    main_algorithm: '',
    receptor_1: '',
    receptor_2: ''
  });
  
  // Данные для выбора связей
  const [allMuscles, setAllMuscles] = useState([]);
  const [allGroups, setAllGroups] = useState([]);
  const [allRelationships, setAllRelationships] = useState([]); // Взаимоотношения мышц
  
  // Выбранные связи
  const [selectedMuscles, setSelectedMuscles] = useState([]);
  const [selectedGroups, setSelectedGroups] = useState([]);
  const [selectedRelationships, setSelectedRelationships] = useState([]); // Выбранные взаимоотношения
  
  // Фильтры для поиска
  const [muscleSearch, setMuscleSearch] = useState('');
  const [groupSearch, setGroupSearch] = useState('');
  const [relationshipSearch, setRelationshipSearch] = useState('');

 

  useEffect(() => {
    fetchAllData();
  }, [id]);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      
      // 1. Загружаем данные дисфункции
      const { data: dysfunctionData, error: dysfunctionError } = await supabase
        .from('dysfunctions')
        .select('*')
        .eq('id', id)
        .single();

      if (dysfunctionError) throw dysfunctionError;

      // 2. Параллельно загружаем все остальные данные
      const [
        { data: musclesData },
        { data: groupsData },
        { data: relationshipsData },
        { data: currentMuscleLinks },
        { data: currentGroupLinks },
        { data: currentRelationshipLinks }
      ] = await Promise.all([
        // Все мышцы для выбора
        supabase
          .from('muscles')
          .select('id, name_ru, name_lat')
          .order('name_ru'),
        
        // Все группы мышц для выбора
        supabase
          .from('muscle_groups')
          .select('id, name, description')
          .order('name'),
        
        // Все взаимоотношения мышц для выбора
        supabase
          .from('muscle_relationships')
          .select(`
            id,
            note,
            function_id,
            functions(name)
          `)
          .order('note'),
        
        // Текущие связи дисфункции с мышцами
        supabase
          .from('muscle_dysfunctions')
          .select('muscle_id')
          .eq('dysfunction_id', id),
        
        // Текущие связи дисфункции с группами мышц
        supabase
          .from('muscle_group_dysfunctions')
          .select('group_id')
          .eq('dysfunction_id', id),
        
        // Текущие связи дисфункции с взаимоотношениями мышц
        supabase
          .from('synergists_dysfunction')
          .select('relationship_id')
          .eq('dysfunction_id', id)
      ]);

      if (dysfunctionData) {
        setDysfunction(dysfunctionData);
        setFormData({
          name: dysfunctionData.name || '',
          description: dysfunctionData.description || '',
          visual_diagnosis: dysfunctionData.visual_diagnosis || '',
          provocations_text: dysfunctionData.provocations_text || '',
          main_algorithm: dysfunctionData.main_algorithm || '',
          receptor_1: dysfunctionData.receptor_1 || '',
          receptor_2: dysfunctionData.receptor_2 || ''
        });
      }

      // Обрабатываем данные о мышцах
      setAllMuscles(musclesData || []);
      
      // Обрабатываем данные о группах
      setAllGroups(groupsData || []);
      
      // Обрабатываем данные о взаимоотношениях
      setAllRelationships(relationshipsData || []);
      
      // Устанавливаем текущие выбранные связи
      setSelectedMuscles(currentMuscleLinks?.map(link => link.muscle_id) || []);
      setSelectedGroups(currentGroupLinks?.map(link => link.group_id) || []);
      
      // Устанавливаем выбранные взаимоотношения
      setSelectedRelationships(currentRelationshipLinks?.map(link => link.relationship_id) || []);

    } catch (error) {
      console.error('Ошибка загрузки данных:', error);
      alert('Ошибка загрузки данных: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Управление выбором мышц
  const handleMuscleToggle = (muscleId) => {
    setSelectedMuscles(prev => 
      prev.includes(muscleId)
        ? prev.filter(id => id !== muscleId)
        : [...prev, muscleId]
    );
  };

  // Управление выбором групп
  const handleGroupToggle = (groupId) => {
    setSelectedGroups(prev => 
      prev.includes(groupId)
        ? prev.filter(id => id !== groupId)
        : [...prev, groupId]
    );
  };

  // Управление выбором взаимоотношений
  const handleRelationshipToggle = (relationshipId) => {
    setSelectedRelationships(prev => 
      prev.includes(relationshipId)
        ? prev.filter(id => id !== relationshipId)
        : [...prev, relationshipId]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      // 1. Обновляем основные данные дисфункции
      const { error: updateError } = await supabase
        .from('dysfunctions')
        .update({
          name: formData.name,
          description: formData.description,
          visual_diagnosis: formData.visual_diagnosis,
          provocations_text: formData.provocations_text,
          main_algorithm: formData.main_algorithm,
          receptor_1: formData.receptor_1,
          receptor_2: formData.receptor_2,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (updateError) throw updateError;

      // 2. Обновляем связи с мышцами (прямые)
      // Удаляем старые связи
      const { error: deleteMuscleLinksError } = await supabase
        .from('muscle_dysfunctions')
        .delete()
        .eq('dysfunction_id', id);

      if (deleteMuscleLinksError) throw deleteMuscleLinksError;

      // Добавляем новые связи (если есть выбранные мышцы)
      if (selectedMuscles.length > 0) {
        const muscleLinks = selectedMuscles.map(muscleId => ({
          dysfunction_id: id,
          muscle_id: muscleId
        }));

        const { error: insertMuscleLinksError } = await supabase
          .from('muscle_dysfunctions')
          .insert(muscleLinks);

        if (insertMuscleLinksError) throw insertMuscleLinksError;
      }

      // 3. Обновляем связи с группами мышц
      // Удаляем старые связи
      const { error: deleteGroupLinksError } = await supabase
        .from('muscle_group_dysfunctions')
        .delete()
        .eq('dysfunction_id', id);

      if (deleteGroupLinksError) throw deleteGroupLinksError;

      // Добавляем новые связи (если есть выбранные группы)
      if (selectedGroups.length > 0) {
        const groupLinks = selectedGroups.map(groupId => ({
          dysfunction_id: id,
          group_id: groupId
        }));

        const { error: insertGroupLinksError } = await supabase
          .from('muscle_group_dysfunctions')
          .insert(groupLinks);

        if (insertGroupLinksError) throw insertGroupLinksError;
      }

      // 4. Обновляем связи с взаимоотношениями мышц
      // Удаляем старые связи
      const { error: deleteRelationshipsError } = await supabase
        .from('synergists_dysfunction')
        .delete()
        .eq('dysfunction_id', id);

      if (deleteRelationshipsError) throw deleteRelationshipsError;

      // Добавляем новые связи (если есть выбранные взаимоотношения)
      if (selectedRelationships.length > 0) {
        const relationshipLinks = selectedRelationships.map(relationshipId => ({
          dysfunction_id: id,
          relationship_id: relationshipId
        }));

        const { error: insertRelationshipsError } = await supabase
          .from('synergists_dysfunction')
          .insert(relationshipLinks);

        if (insertRelationshipsError) throw insertRelationshipsError;
      }

      alert('Дисфункция успешно обновлена!');
      navigate(`/dysfunction/${id}`);
    } catch (error) {
      console.error('Ошибка сохранения:', error);
      alert('Ошибка при сохранении: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  // Фильтрация мышц
  const filteredMuscles = allMuscles.filter(muscle =>
    muscle.name_ru?.toLowerCase().includes(muscleSearch.toLowerCase()) ||
    muscle.name_lat?.toLowerCase().includes(muscleSearch.toLowerCase())
  );

  // Фильтрация групп
  const filteredGroups = allGroups.filter(group =>
    group.name?.toLowerCase().includes(groupSearch.toLowerCase()) ||
    group.description?.toLowerCase().includes(groupSearch.toLowerCase())
  );

  // Фильтрация взаимоотношений
  const filteredRelationships = allRelationships.filter(relationship =>
    relationship.note?.toLowerCase().includes(relationshipSearch.toLowerCase()) ||
    relationship.functions?.name?.toLowerCase().includes(relationshipSearch.toLowerCase())
  );

  if (loading) return <div style={{ padding: '2rem' }}>Загрузка...</div>;
  if (!dysfunction) return <div style={{ padding: '2rem' }}>Дисфункция не найдена</div>;

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
      <div style={{ marginBottom: '20px' }}>
        <Link to={`/dysfunction/${id}`}>← Назад к просмотру дисфункции</Link>
      </div>

      <h2>Редактирование дисфункции: {dysfunction.name}</h2>

      <form onSubmit={handleSubmit} style={{ marginBottom: '40px' }}>
        {/* Основные поля дисфункции */}
        <div style={{ 
          backgroundColor: '#f8f9fa', 
          padding: '20px', 
          borderRadius: '8px',
          marginBottom: '30px'
        }}>
          <h3 style={{ marginTop: '0', marginBottom: '20px' }}>Основная информация</h3>
          
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
              Название:
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              style={{ 
                width: '100%', 
                padding: '10px', 
                fontSize: '16px',
                border: '1px solid #ddd',
                borderRadius: '4px'
              }}
              required
            />
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
              Описание:
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              style={{ 
                width: '100%', 
                padding: '10px', 
                fontSize: '16px',
                minHeight: '120px',
                resize: 'vertical',
                border: '1px solid #ddd',
                borderRadius: '4px'
              }}
              placeholder="Общее описание дисфункции..."
            />
          </div>

          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: '1fr 1fr', 
            gap: '20px',
            marginBottom: '15px'
          }}>
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                Визуальная диагностика:
              </label>
              <textarea
                name="visual_diagnosis"
                value={formData.visual_diagnosis}
                onChange={handleInputChange}
                style={{ 
                  width: '100%', 
                  padding: '10px', 
                  fontSize: '16px',
                  minHeight: '100px',
                  resize: 'vertical',
                  border: '1px solid #ddd',
                  borderRadius: '4px'
                }}
                placeholder="Признаки для визуальной диагностики..."
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                Текст провокаций:
              </label>
              <textarea
                name="provocations_text"
                value={formData.provocations_text}
                onChange={handleInputChange}
                style={{ 
                  width: '100%', 
                  padding: '10px', 
                  fontSize: '16px',
                  minHeight: '100px',
                  resize: 'vertical',
                  border: '1px solid #ddd',
                  borderRadius: '4px'
                }}
                placeholder="Текст для проведения провокаций..."
              />
            </div>
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
              Основной алгоритм:
            </label>
            <textarea
              name="main_algorithm"
              value={formData.main_algorithm}
              onChange={handleInputChange}
              style={{ 
                width: '100%', 
                padding: '10px', 
                fontSize: '16px',
                minHeight: '120px',
                resize: 'vertical',
                border: '1px solid #ddd',
                borderRadius: '4px'
              }}
              placeholder="Основной алгоритм диагностики и лечения..."
            />
          </div>

          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: '1fr 1fr', 
            gap: '20px',
            marginBottom: '15px'
          }}>
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                Рецептор 1:
              </label>
              <input
                type="text"
                name="receptor_1"
                value={formData.receptor_1}
                onChange={handleInputChange}
                style={{ 
                  width: '100%', 
                  padding: '10px', 
                  fontSize: '16px',
                  border: '1px solid #ddd',
                  borderRadius: '4px'
                }}
                placeholder="Первый рецептор..."
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                Рецептор 2:
              </label>
              <input
                type="text"
                name="receptor_2"
                value={formData.receptor_2}
                onChange={handleInputChange}
                style={{ 
                  width: '100%', 
                  padding: '10px', 
                  fontSize: '16px',
                  border: '1px solid #ddd',
                  borderRadius: '4px'
                }}
                placeholder="Второй рецептор..."
              />
            </div>
          </div>
        </div>

        {/* Секция выбора связей */}
        <div style={{ 
          backgroundColor: '#fff', 
          padding: '20px', 
          borderRadius: '8px',
          marginBottom: '30px',
          border: '1px solid #dee2e6'
        }}>
          <h3 style={{ marginTop: '0', marginBottom: '20px' }}>Связи дисфункции</h3>
          
          {/* Мышцы */}
          <div style={{ 
            backgroundColor: '#f8f9fa', 
            padding: '15px', 
            borderRadius: '6px',
            marginBottom: '20px'
          }}>
            <h4 style={{ marginTop: '0', marginBottom: '15px' }}>Мышцы (прямые связи)</h4>
            <div style={{ marginBottom: '10px' }}>
              <input
                type="text"
                placeholder="Поиск по названию мышцы (рус/лат)..."
                value={muscleSearch}
                onChange={(e) => setMuscleSearch(e.target.value)}
                style={{ 
                  width: '100%', 
                  padding: '10px', 
                  fontSize: '14px',
                  border: '1px solid #ddd',
                  borderRadius: '4px'
                }}
              />
            </div>
            <div style={{ 
              maxHeight: '200px', 
              overflowY: 'auto',
              border: '1px solid #dee2e6',
              borderRadius: '4px',
              padding: '10px',
              backgroundColor: 'white'
            }}>
              {filteredMuscles.length === 0 ? (
                <div style={{ 
                  color: '#6c757d', 
                  fontStyle: 'italic',
                  textAlign: 'center',
                  padding: '20px'
                }}>
                  {muscleSearch ? 'Мышцы не найдены' : 'Нет доступных мышц'}
                </div>
              ) : (
                filteredMuscles.map(muscle => (
                  <div 
                    key={muscle.id}
                    style={{
                      padding: '10px',
                      marginBottom: '8px',
                      backgroundColor: selectedMuscles.includes(muscle.id) ? '#e3f2fd' : 'transparent',
                      border: '1px solid #dee2e6',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      transition: 'all 0.2s ease'
                    }}
                    onClick={() => handleMuscleToggle(muscle.id)}
                    onMouseEnter={(e) => {
                      if (!selectedMuscles.includes(muscle.id)) {
                        e.currentTarget.style.backgroundColor = '#f8f9fa';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!selectedMuscles.includes(muscle.id)) {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedMuscles.includes(muscle.id)}
                      onChange={() => handleMuscleToggle(muscle.id)}
                      style={{ marginRight: '10px' }}
                    />
                    <div>
                      <div style={{ fontWeight: '500' }}>{muscle.name_ru}</div>
                      {muscle.name_lat && (
                        <div style={{ fontSize: '12px', color: '#6c757d' }}>
                          {muscle.name_lat}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
            <div style={{ 
              fontSize: '13px', 
              color: '#495057', 
              marginTop: '10px',
              padding: '5px 10px',
              backgroundColor: selectedMuscles.length > 0 ? '#e8f5e9' : '#f8f9fa',
              borderRadius: '4px',
              display: 'inline-block'
            }}>
              Выбрано мышц: <strong>{selectedMuscles.length}</strong>
            </div>
          </div>

          {/* Группы мышц */}
          <div style={{ 
            backgroundColor: '#f8f9fa', 
            padding: '15px', 
            borderRadius: '6px',
            marginBottom: '20px'
          }}>
            <h4 style={{ marginTop: '0', marginBottom: '15px' }}>Группы мышц</h4>
            <div style={{ marginBottom: '10px' }}>
              <input
                type="text"
                placeholder="Поиск по названию или описанию группы..."
                value={groupSearch}
                onChange={(e) => setGroupSearch(e.target.value)}
                style={{ 
                  width: '100%', 
                  padding: '10px', 
                  fontSize: '14px',
                  border: '1px solid #ddd',
                  borderRadius: '4px'
                }}
              />
            </div>
            <div style={{ 
              maxHeight: '200px', 
              overflowY: 'auto',
              border: '1px solid #dee2e6',
              borderRadius: '4px',
              padding: '10px',
              backgroundColor: 'white'
            }}>
              {filteredGroups.length === 0 ? (
                <div style={{ 
                  color: '#6c757d', 
                  fontStyle: 'italic',
                  textAlign: 'center',
                  padding: '20px'
                }}>
                  {groupSearch ? 'Группы не найдены' : 'Нет доступных групп'}
                </div>
              ) : (
                filteredGroups.map(group => (
                  <div 
                    key={group.id}
                    style={{
                      padding: '10px',
                      marginBottom: '8px',
                      backgroundColor: selectedGroups.includes(group.id) ? '#d1ecf1' : 'transparent',
                      border: '1px solid #dee2e6',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      transition: 'all 0.2s ease'
                    }}
                    onClick={() => handleGroupToggle(group.id)}
                    onMouseEnter={(e) => {
                      if (!selectedGroups.includes(group.id)) {
                        e.currentTarget.style.backgroundColor = '#f8f9fa';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!selectedGroups.includes(group.id)) {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedGroups.includes(group.id)}
                      onChange={() => handleGroupToggle(group.id)}
                      style={{ marginRight: '10px' }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: '500' }}>{group.name}</div>
                      {group.description && (
                        <div style={{ fontSize: '12px', color: '#6c757d' }}>
                          {group.description.length > 100 
                            ? `${group.description.substring(0, 100)}...` 
                            : group.description}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
            <div style={{ 
              fontSize: '13px', 
              color: '#495057', 
              marginTop: '10px',
              padding: '5px 10px',
              backgroundColor: selectedGroups.length > 0 ? '#e8f5e9' : '#f8f9fa',
              borderRadius: '4px',
              display: 'inline-block'
            }}>
              Выбрано групп: <strong>{selectedGroups.length}</strong>
            </div>
          </div>

          {/* Взаимоотношения мышц */}
          <div style={{ 
            backgroundColor: '#f8f9fa', 
            padding: '15px', 
            borderRadius: '6px'
          }}>
            <h4 style={{ marginTop: '0', marginBottom: '15px' }}>Взаимоотношения мышц (синергисты/антагонисты)</h4>
            <div style={{ marginBottom: '10px' }}>
              <input
                type="text"
                placeholder="Поиск по названию или функции..."
                value={relationshipSearch}
                onChange={(e) => setRelationshipSearch(e.target.value)}
                style={{ 
                  width: '100%', 
                  padding: '10px', 
                  fontSize: '14px',
                  border: '1px solid #ddd',
                  borderRadius: '4px'
                }}
              />
            </div>
            <div style={{ 
              maxHeight: '200px', 
              overflowY: 'auto',
              border: '1px solid #dee2e6',
              borderRadius: '4px',
              padding: '10px',
              backgroundColor: 'white'
            }}>
              {filteredRelationships.length === 0 ? (
                <div style={{ 
                  color: '#6c757d', 
                  fontStyle: 'italic',
                  textAlign: 'center',
                  padding: '20px'
                }}>
                  {relationshipSearch ? 'Взаимоотношения не найдены' : 'Нет доступных взаимоотношений'}
                </div>
              ) : (
                filteredRelationships.map(relationship => {
                  const fullTitle = relationship.functions?.name 
                    ? `${relationship.functions.name} ${relationship.note || ''}`.trim()
                    : relationship.note || 'Без названия';                  
                  
                  return (
                    <div 
                      key={relationship.id}
                      style={{
                        padding: '10px',
                        marginBottom: '8px',
                        backgroundColor: selectedRelationships.includes(relationship.id) ? '#d1ecf1' : 'transparent',
                        border: '1px solid #dee2e6',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                      onClick={() => handleRelationshipToggle(relationship.id)}
                      onMouseEnter={(e) => {
                        if (!selectedRelationships.includes(relationship.id)) {
                          e.currentTarget.style.backgroundColor = '#f8f9fa';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!selectedRelationships.includes(relationship.id)) {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <input
                          type="checkbox"
                          checked={selectedRelationships.includes(relationship.id)}
                          onChange={() => handleRelationshipToggle(relationship.id)}
                          style={{ marginRight: '10px' }}
                        />
                        <div>
                          <div style={{ fontWeight: '500', marginBottom: '3px' }}>{fullTitle}</div>
                          {relationship.functions?.name && (
                            <div style={{ fontSize: '11px', color: '#6c757d', backgroundColor: '#e9ecef', padding: '2px 6px', borderRadius: '3px', display: 'inline-block' }}>
                              Функция: {relationship.functions.name}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            <div style={{ 
              fontSize: '13px', 
              color: '#495057', 
              marginTop: '10px',
              padding: '5px 10px',
              backgroundColor: selectedRelationships.length > 0 ? '#e8f5e9' : '#f8f9fa',
              borderRadius: '4px',
              display: 'inline-block'
            }}>
              Выбрано взаимоотношений: <strong>{selectedRelationships.length}</strong>
            </div>
          </div>
        </div>

        {/* Кнопка сохранения */}
        <div style={{ textAlign: 'center' }}>
          <button
            type="submit"
            disabled={saving}
            style={{
              padding: '12px 30px',
              backgroundColor: saving ? '#6c757d' : '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: saving ? 'not-allowed' : 'pointer',
              fontSize: '16px',
              fontWeight: 'bold',
              minWidth: '200px',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              if (!saving) e.target.style.backgroundColor = '#218838';
            }}
            onMouseLeave={(e) => {
              if (!saving) e.target.style.backgroundColor = '#28a745';
            }}
          >
            {saving ? '⏳ Сохранение...' : '💾 Сохранить изменения дисфункции'}
          </button>
        </div>
      </form>

      {/* Используем универсальный MediaManager для дисфункции */}
      <MediaManager 
        entityType="dysfunction"
        entityId={id}
        entityName={dysfunction.name}
        API_URL={API_URL}
      />
    </div>
  );
}

export default DysfunctionEditPage;