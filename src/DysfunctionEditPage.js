// DysfunctionEditPage.js
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import MediaManager from './MediaManager';
import API_URL from './config/api';

// Компонент для выбора мышц
function MuscleSelector({ selectedIds, onToggle, searchTerm, onSearchChange, items }) {
  const filteredItems = items.filter(item =>
    item.name_ru?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.name_lat?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={{ backgroundColor: '#f8f9fa', padding: '15px', borderRadius: '6px', marginBottom: '20px' }}>
      <h4 style={{ marginTop: 0, marginBottom: '15px' }}>Мышцы (прямые связи)</h4>
      <div style={{ marginBottom: '10px' }}>
        <input
          type="text"
          placeholder="Поиск по названию мышцы (рус/лат)..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          style={{ width: '100%', padding: '10px', fontSize: '14px', border: '1px solid #ddd', borderRadius: '4px' }}
        />
      </div>
      <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid #dee2e6', borderRadius: '4px', padding: '10px', backgroundColor: 'white' }}>
        {filteredItems.length === 0 ? (
          <div style={{ color: '#6c757d', fontStyle: 'italic', textAlign: 'center', padding: '20px' }}>
            {searchTerm ? 'Мышцы не найдены' : 'Нет доступных мышц'}
          </div>
        ) : (
          filteredItems.map(item => (
            <div 
              key={item.id}
              style={{
                padding: '10px',
                marginBottom: '8px',
                backgroundColor: selectedIds.includes(item.id) ? '#e3f2fd' : 'transparent',
                border: '1px solid #dee2e6',
                borderRadius: '4px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center'
              }}
              onClick={() => onToggle(item.id)}
            >
              <input
                type="checkbox"
                checked={selectedIds.includes(item.id)}
                onChange={() => onToggle(item.id)}
                style={{ marginRight: '10px' }}
              />
              <div>
                <div style={{ fontWeight: '500' }}>{item.name_ru}</div>
                {item.name_lat && <div style={{ fontSize: '12px', color: '#6c757d' }}>{item.name_lat}</div>}
              </div>
            </div>
          ))
        )}
      </div>
      <div style={{ fontSize: '13px', color: '#495057', marginTop: '10px', padding: '5px 10px', backgroundColor: selectedIds.length > 0 ? '#e8f5e9' : '#f8f9fa', borderRadius: '4px', display: 'inline-block' }}>
        Выбрано мышц: <strong>{selectedIds.length}</strong>
      </div>
    </div>
  );
}

// Компонент для выбора групп
function GroupSelector({ selectedIds, onToggle, searchTerm, onSearchChange, items }) {
  const filteredItems = items.filter(item =>
    item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.description && item.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div style={{ backgroundColor: '#f8f9fa', padding: '15px', borderRadius: '6px', marginBottom: '20px' }}>
      <h4 style={{ marginTop: 0, marginBottom: '15px' }}>Группы мышц</h4>
      <div style={{ marginBottom: '10px' }}>
        <input
          type="text"
          placeholder="Поиск по названию или описанию группы..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          style={{ width: '100%', padding: '10px', fontSize: '14px', border: '1px solid #ddd', borderRadius: '4px' }}
        />
      </div>
      <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid #dee2e6', borderRadius: '4px', padding: '10px', backgroundColor: 'white' }}>
        {filteredItems.length === 0 ? (
          <div style={{ color: '#6c757d', fontStyle: 'italic', textAlign: 'center', padding: '20px' }}>
            {searchTerm ? 'Группы не найдены' : 'Нет доступных групп'}
          </div>
        ) : (
          filteredItems.map(item => (
            <div 
              key={item.id}
              style={{
                padding: '10px',
                marginBottom: '8px',
                backgroundColor: selectedIds.includes(item.id) ? '#d1ecf1' : 'transparent',
                border: '1px solid #dee2e6',
                borderRadius: '4px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center'
              }}
              onClick={() => onToggle(item.id)}
            >
              <input
                type="checkbox"
                checked={selectedIds.includes(item.id)}
                onChange={() => onToggle(item.id)}
                style={{ marginRight: '10px' }}
              />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: '500' }}>{item.name}</div>
                {item.description && (
                  <div style={{ fontSize: '12px', color: '#6c757d' }}>
                    {item.description.length > 100 ? `${item.description.substring(0, 100)}...` : item.description}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
      <div style={{ fontSize: '13px', color: '#495057', marginTop: '10px', padding: '5px 10px', backgroundColor: selectedIds.length > 0 ? '#e8f5e9' : '#f8f9fa', borderRadius: '4px', display: 'inline-block' }}>
        Выбрано групп: <strong>{selectedIds.length}</strong>
      </div>
    </div>
  );
}

// Компонент для выбора взаимоотношений
function RelationshipSelector({ selectedIds, onToggle, searchTerm, onSearchChange, items }) {
  const filteredItems = items.filter(item => {
    const fullTitle = item.functions?.name 
      ? `${item.functions.name} ${item.note || ''}`.trim()
      : item.note || 'Без названия';
    return fullTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.functions?.name && item.functions.name.toLowerCase().includes(searchTerm.toLowerCase()));
  });

  return (
    <div style={{ backgroundColor: '#f8f9fa', padding: '15px', borderRadius: '6px', marginBottom: '20px' }}>
      <h4 style={{ marginTop: 0, marginBottom: '15px' }}>Взаимоотношения мышц (синергисты/антагонисты)</h4>
      <div style={{ marginBottom: '10px' }}>
        <input
          type="text"
          placeholder="Поиск по названию или функции..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          style={{ width: '100%', padding: '10px', fontSize: '14px', border: '1px solid #ddd', borderRadius: '4px' }}
        />
      </div>
      <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid #dee2e6', borderRadius: '4px', padding: '10px', backgroundColor: 'white' }}>
        {filteredItems.length === 0 ? (
          <div style={{ color: '#6c757d', fontStyle: 'italic', textAlign: 'center', padding: '20px' }}>
            {searchTerm ? 'Взаимоотношения не найдены' : 'Нет доступных взаимоотношений'}
          </div>
        ) : (
          filteredItems.map(item => {
            const fullTitle = item.functions?.name 
              ? `${item.functions.name} ${item.note || ''}`.trim()
              : item.note || 'Без названия';
            return (
              <div 
                key={item.id}
                style={{
                  padding: '10px',
                  marginBottom: '8px',
                  backgroundColor: selectedIds.includes(item.id) ? '#d1ecf1' : 'transparent',
                  border: '1px solid #dee2e6',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
                onClick={() => onToggle(item.id)}
              >
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(item.id)}
                    onChange={() => onToggle(item.id)}
                    style={{ marginRight: '10px' }}
                  />
                  <div>
                    <div style={{ fontWeight: '500', marginBottom: '3px' }}>{fullTitle}</div>
                    {item.functions?.name && (
                      <div style={{ fontSize: '11px', color: '#6c757d', backgroundColor: '#e9ecef', padding: '2px 6px', borderRadius: '3px', display: 'inline-block' }}>
                        Функция: {item.functions.name}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
      <div style={{ fontSize: '13px', color: '#495057', marginTop: '10px', padding: '5px 10px', backgroundColor: selectedIds.length > 0 ? '#e8f5e9' : '#f8f9fa', borderRadius: '4px', display: 'inline-block' }}>
        Выбрано взаимоотношений: <strong>{selectedIds.length}</strong>
      </div>
    </div>
  );
}

function DysfunctionEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
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
    receptor_2: '',
    display_order: 0
  });
  
  // Данные для выбора связей
  const [allMuscles, setAllMuscles] = useState([]);
  const [allGroups, setAllGroups] = useState([]);
  const [allRelationships, setAllRelationships] = useState([]);
  
  // Выбранные связи
  const [selectedMuscles, setSelectedMuscles] = useState([]);
  const [selectedGroups, setSelectedGroups] = useState([]);
  const [selectedRelationships, setSelectedRelationships] = useState([]);
  
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
      const dysfunctionRes = await fetch(`${API_URL}/api/dysfunctions/${id}`);
      const dysfunctionData = await dysfunctionRes.json();
      if (!dysfunctionData.success) throw new Error(dysfunctionData.error);

      // 2. Загружаем все остальные данные параллельно
      const [musclesRes, groupsRes, relationshipsRes, currentMusclesRes, currentGroupsRes, currentRelationshipsRes] = await Promise.all([
        fetch(`${API_URL}/api/muscles`),
        fetch(`${API_URL}/api/groups`),
        fetch(`${API_URL}/api/relationships`),
        fetch(`${API_URL}/api/dysfunctions/${id}/muscles`),
        fetch(`${API_URL}/api/dysfunctions/${id}/muscle-groups`),
        fetch(`${API_URL}/api/dysfunctions/${id}/relationships`)
      ]);

      const musclesData = await musclesRes.json();
      const groupsData = await groupsRes.json();
      const relationshipsData = await relationshipsRes.json();
      const currentMusclesData = await currentMusclesRes.json();
      const currentGroupsData = await currentGroupsRes.json();
      const currentRelationshipsData = await currentRelationshipsRes.json();

      if (dysfunctionData.data) {
        setFormData({
          name: dysfunctionData.data.name || '',
          description: dysfunctionData.data.description || '',
          visual_diagnosis: dysfunctionData.data.visual_diagnosis || '',
          provocations_text: dysfunctionData.data.provocations_text || '',
          main_algorithm: dysfunctionData.data.main_algorithm || '',
          receptor_1: dysfunctionData.data.receptor_1 || '',
          receptor_2: dysfunctionData.data.receptor_2 || '',
          display_order: dysfunctionData.data.display_order || 0
        });
      }

      setAllMuscles(musclesData.success ? musclesData.data : []);
      setAllGroups(groupsData.success ? groupsData.data : []);
      setAllRelationships(relationshipsData.success ? relationshipsData.data : []);
      
      setSelectedMuscles(currentMusclesData.success ? currentMusclesData.data.map(m => m.id) : []);
      setSelectedGroups(currentGroupsData.success ? currentGroupsData.data.map(g => g.id) : []);
      setSelectedRelationships(currentRelationshipsData.success ? currentRelationshipsData.data.map(r => r.id) : []);

    } catch (error) {
      console.error('Ошибка загрузки данных:', error);
      alert('Ошибка загрузки данных: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      // 1. Обновляем основные данные дисфункции
      const updateRes = await fetch(`${API_URL}/api/dysfunctions/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const updateData = await updateRes.json();
      if (!updateData.success) throw new Error(updateData.error);

      // 2. Обновляем связи с мышцами
      // Удаляем старые
      await fetch(`${API_URL}/api/dysfunctions/${id}/muscles`, { method: 'DELETE' });
      // Добавляем новые
      if (selectedMuscles.length > 0) {
        await fetch(`${API_URL}/api/dysfunctions/${id}/muscles`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ muscleIds: selectedMuscles })
        });
      }

      // 3. Обновляем связи с группами
      await fetch(`${API_URL}/api/dysfunctions/${id}/muscle-groups`, { method: 'DELETE' });
      if (selectedGroups.length > 0) {
        await fetch(`${API_URL}/api/dysfunctions/${id}/muscle-groups`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ groupIds: selectedGroups })
        });
      }

      // 4. Обновляем связи с взаимоотношениями
      await fetch(`${API_URL}/api/dysfunctions/${id}/relationships`, { method: 'DELETE' });
      if (selectedRelationships.length > 0) {
        await fetch(`${API_URL}/api/dysfunctions/${id}/relationships`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ relationshipIds: selectedRelationships })
        });
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

  const handleMuscleToggle = (muscleId) => {
    setSelectedMuscles(prev => 
      prev.includes(muscleId) ? prev.filter(id => id !== muscleId) : [...prev, muscleId]
    );
  };

  const handleGroupToggle = (groupId) => {
    setSelectedGroups(prev => 
      prev.includes(groupId) ? prev.filter(id => id !== groupId) : [...prev, groupId]
    );
  };

  const handleRelationshipToggle = (relationshipId) => {
    setSelectedRelationships(prev => 
      prev.includes(relationshipId) ? prev.filter(id => id !== relationshipId) : [...prev, relationshipId]
    );
  };

  if (loading) return <div style={{ padding: '2rem' }}>Загрузка...</div>;

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
      <div style={{ marginBottom: '20px' }}>
        <Link to={`/dysfunction/${id}`}>← Назад к просмотру дисфункции</Link>
      </div>

      <h2>Редактирование дисфункции</h2>

      <form onSubmit={handleSubmit}>
        {/* Основные поля */}
        <div style={{ backgroundColor: '#f8f9fa', padding: '20px', borderRadius: '8px', marginBottom: '30px' }}>
          <h3 style={{ marginTop: 0, marginBottom: '20px' }}>Основная информация</h3>
          
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Название *</label>
            <input type="text" name="name" value={formData.name} onChange={handleInputChange} style={{ width: '100%', padding: '10px' }} required />
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Описание</label>
            <textarea name="description" value={formData.description} onChange={handleInputChange} rows={6} style={{ width: '100%', padding: '10px' }} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '15px' }}>
            <div>
              <label>Визуальная диагностика</label>
              <textarea name="visual_diagnosis" value={formData.visual_diagnosis} onChange={handleInputChange} rows={4} style={{ width: '100%', padding: '10px' }} />
            </div>
            <div>
              <label>Провокации</label>
              <textarea name="provocations_text" value={formData.provocations_text} onChange={handleInputChange} rows={4} style={{ width: '100%', padding: '10px' }} />
            </div>
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label>Основной алгоритм</label>
            <textarea name="main_algorithm" value={formData.main_algorithm} onChange={handleInputChange} rows={6} style={{ width: '100%', padding: '10px' }} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '15px' }}>
            <div>
              <label>Рецептор 1</label>
              <input type="text" name="receptor_1" value={formData.receptor_1} onChange={handleInputChange} style={{ width: '100%', padding: '10px' }} />
            </div>
            <div>
              <label>Рецептор 2</label>
              <input type="text" name="receptor_2" value={formData.receptor_2} onChange={handleInputChange} style={{ width: '100%', padding: '10px' }} />
            </div>
          </div>

          <div>
            <label>Порядок отображения</label>
            <input type="number" name="display_order" value={formData.display_order} onChange={handleInputChange} min="0" style={{ width: '100%', padding: '10px' }} />
          </div>
        </div>

        {/* Связи */}
        <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', marginBottom: '30px', border: '1px solid #dee2e6' }}>
          <h3 style={{ marginTop: 0, marginBottom: '20px' }}>Связи дисфункции</h3>
          
          <MuscleSelector
            selectedIds={selectedMuscles}
            onToggle={handleMuscleToggle}
            searchTerm={muscleSearch}
            onSearchChange={setMuscleSearch}
            items={allMuscles}
          />

          <GroupSelector
            selectedIds={selectedGroups}
            onToggle={handleGroupToggle}
            searchTerm={groupSearch}
            onSearchChange={setGroupSearch}
            items={allGroups}
          />

          <RelationshipSelector
            selectedIds={selectedRelationships}
            onToggle={handleRelationshipToggle}
            searchTerm={relationshipSearch}
            onSearchChange={setRelationshipSearch}
            items={allRelationships}
          />
        </div>

        {/* Кнопка сохранения */}
        <div style={{ textAlign: 'center' }}>
          <button type="submit" disabled={saving} style={{
            padding: '12px 30px',
            backgroundColor: saving ? '#6c757d' : '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: saving ? 'not-allowed' : 'pointer',
            fontSize: '16px',
            fontWeight: 'bold'
          }}>
            {saving ? '⏳ Сохранение...' : '💾 Сохранить изменения'}
          </button>
        </div>
      </form>

      <MediaManager 
        entityType="dysfunction"
        entityId={id}
        entityName={formData.name || 'Дисфункция'}
        API_URL={API_URL}
      />
    </div>
  );
}

export default DysfunctionEditPage;