import React, { useState, useEffect } from 'react';
import { supabase } from './utils/supabaseClient';

export default function MuscleForm({ muscle, onSave }) {
  // Основные данные мышцы
  const [formData, setFormData] = useState({
    name_ru: '',
    name_lat: '',
    origin: '',
    insertion: '',
    indicator: '',
    pain_zones_text: '',
    notes: ''
  });

  // Связанные данные
  const [groups, setGroups] = useState([]);
  const [selectedGroups, setSelectedGroups] = useState([]);
  const [dysfunctions, setDysfunctions] = useState([]);
  const [selectedDysfunctions, setSelectedDysfunctions] = useState([]);
  const [meridians, setMeridians] = useState([]);
  const [selectedMeridians, setSelectedMeridians] = useState([]);
  const [organs, setOrgans] = useState([]);
  const [selectedOrgans, setSelectedOrgans] = useState([]);
  const [nerves, setNerves] = useState([]);
  const [selectedNerves, setSelectedNerves] = useState([]);
  const [vertebrae, setVertebrae] = useState([]);
  const [selectedVertebrae, setSelectedVertebrae] = useState([]);
  const [functs, setFuncts] = useState([]);
  const [selectedFuncts, setSelectedFuncts] = useState([]);

  // Загрузка данных при монтировании
  useEffect(() => {
    if (muscle) {
      // Загружаем основные данные
      setFormData({
        name_ru: muscle.name_ru || '',
        name_lat: muscle.name_lat || '',
        origin: muscle.origin || '',
        insertion: muscle.insertion || '',
        indicator: muscle.indicator || '',
        pain_zones_text: muscle.pain_zones_text || '',
		display_order: muscle.display_order || '',
        notes: muscle.notes || ''
      });

      // Загружаем связанные данные
      loadRelatedData();
    }

    // Загружаем справочники
    loadDictionaries();
  }, [muscle]);

  const loadDictionaries = async () => {
  // Загружаем все справочники параллельно
  const [
    { data: groupsData },
    { data: dysfunctionsData },
    { data: meridiansData },
    { data: organsData },
    { data: nervesData },
    { data: functsData },
    { data: vertebraeData }
  ] = await Promise.all([
    supabase.from('muscle_groups').select('*'),
    supabase.from('dysfunctions').select('*'),
    supabase.from('meridians').select('*'),
    supabase.from('organs').select('*'),
    supabase.from('nerves').select('id, name, type'), // Добавляем поле type
    supabase.from('functions').select('*'),
    supabase.from('vertebrae').select('*')
  ]);

  setGroups(groupsData || []);
  setDysfunctions(dysfunctionsData || []);
  setMeridians(meridiansData || []);
  setOrgans(organsData || []);
  setNerves(nervesData || []);
  setFuncts(functsData || []);
  setVertebrae(vertebraeData || []);
};

  const loadRelatedData = async () => {
  if (!muscle) return;

  // Загружаем все связи параллельно
  const [
    { data: groupsData },
    { data: dysfunctionsData },
    { data: meridiansData },
    { data: organsData },
    { data: nervesData },
    { data: functsData },
    { data: vertebraeData }
  ] = await Promise.all([
    supabase.from('muscle_group_membership').select('group_id').eq('muscle_id', muscle.id),
    supabase.from('muscle_dysfunctions').select('dysfunction_id').eq('muscle_id', muscle.id),
    supabase.from('muscle_meridians').select('meridian_id').eq('muscle_id', muscle.id),
    supabase.from('muscle_organs').select('organ_id').eq('muscle_id', muscle.id),
    supabase.from('muscle_nerves').select('nerve_id').eq('muscle_id', muscle.id),
    supabase.from('muscle_functions').select('function_id, note').eq('muscle_id', muscle.id),
    supabase.from('muscle_vertebrae').select('vertebra_id').eq('muscle_id', muscle.id)
  ]);

  setSelectedGroups(groupsData?.map(g => g.group_id) || []);
  setSelectedDysfunctions(dysfunctionsData?.map(d => d.dysfunction_id) || []);
  setSelectedMeridians(meridiansData?.map(m => m.meridian_id) || []);
  setSelectedOrgans(organsData?.map(o => o.organ_id) || []);
  setSelectedNerves(nervesData?.map(n => n.nerve_id) || []);
  setSelectedFuncts(functsData?.map(f => ({ id: f.function_id, note: f.note || '' })) || []);
  setSelectedVertebrae(vertebraeData?.map(v => v.vertebra_id) || []);
};

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleMultiSelectChange = (type, value, checked) => {
  const setters = {
    group: setSelectedGroups,
    dysfunction: setSelectedDysfunctions,
    meridian: setSelectedMeridians,
    organ: setSelectedOrgans,
    nerve: setSelectedNerves,
    funct: setSelectedFuncts,
    vertebra: setSelectedVertebrae
  };

  const stateSetters = {
    group: selectedGroups,
    dysfunction: selectedDysfunctions,
    meridian: selectedMeridians,
    organ: selectedOrgans,
    nerve: selectedNerves,
    funct: selectedFuncts,
    vertebra: selectedVertebrae
  };

  if (type === 'funct') {
    if (checked) {
      setters[type]([...stateSetters[type], { id: value.id, note: value.note }]);
    } else {
      setters[type](stateSetters[type].filter(item => item.id !== value.id));
    }
  } else {
    if (checked) {
      setters[type]([...stateSetters[type], value]);
    } else {
      setters[type](stateSetters[type].filter(item => item !== value));
    }
  }
};

  const handleSubmit = async (e) => {

	e.preventDefault();
	
	console.log('Отправляемые данные:', {
	  formData,
	  selectedGroups,
	  selectedDysfunctions,
	  selectedMeridians,
	  selectedOrgans,
	  selectedNerves,
	  selectedFuncts,
	  selectedVertebrae
	});

  
  try {

// const { data: columns } = await supabase
  // .rpc('get_columns', { table_name: 'muscles' });

console.log('Начинаем сохранять для :', muscle.id);

    // 1. Проверка подключения
    const { error: pingError } = await supabase
      .from('muscles')
      .select('*')
      .limit(1);
    
    if (pingError) throw new Error('Нет соединения с Supabase');

    // 2. Сохраняем основные данные
    const { data, error } = await supabase
      .from('muscles')
      .update(formData)
      .eq('id', muscle.id)
      .select()
      .single();
	 console.log('Сохранили таблицу :', 'muscles');

    if (error) throw error;
	
	// 3. Обновляем все связи
    await Promise.all([
      updateRelations('muscle_group_membership', 'group_id', selectedGroups),
      updateRelations('muscle_dysfunctions', 'dysfunction_id', selectedDysfunctions),
      updateRelations('muscle_meridians', 'meridian_id', selectedMeridians),
      updateRelations('muscle_organs', 'organ_id', selectedOrgans),
      updateRelations('muscle_nerves', 'nerve_id', selectedNerves),
	  updateRelations('muscle_functions', 'function_id', selectedFuncts),
      updateRelations('muscle_vertebrae', 'vertebra_id', selectedVertebrae)
    ]);
	

    // 4. Успешное сохранение
    onSave(data);
    alert('Данные сохранены!');
    
  } catch (error) {
    console.error('Детали ошибки:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    
    alert(`Ошибка сохранения: ${error.message}`);
  }
};

  const updateRelations = async (table, foreignKey, selectedItems) => {
  console.log("Обновляем связи в таблице ", table);
  
  // Удаляем все существующие связи
  await supabase
    .from(table)
    .delete()
    .eq('muscle_id', muscle.id);

  // Добавляем новые связи
  if (selectedItems.length > 0) {
    // Специальная обработка для функций
    if (table === 'muscle_functions') {
      await supabase
        .from(table)
        .insert(
          selectedItems.map(item => ({
            muscle_id: muscle.id,
            [foreignKey]: item.id,
            note: item.note || null
          }))
        );
    } else {
      await supabase
        .from(table)
        .insert(
          selectedItems.map(item => ({
            muscle_id: muscle.id,
            [foreignKey]: typeof item === 'object' ? item.id : item
          }))
        );
    }
  }
};

	const handleFunctionNoteChange = (functionId, note) => {
	  setSelectedFuncts(prev => 
		prev.map(item => 
		  item.id === functionId ? { ...item, note } : item
		)
	  );
	};

  const renderMultiSelect = (items, selectedItems, type, label) => {
  // Для функций
  if (type === 'funct') {
    return (
      <div className="form-section">
        <label>{label}</label>
        <div className="multi-select-container">
          {items.map(item => {
            const isSelected = selectedItems.some(si => si.id === item.id);
            const selectedItem = selectedItems.find(si => si.id === item.id);
            
            return (
              <div key={item.id} className="multi-select-item">
                <input
                  type="checkbox"
                  id={`${type}-${item.id}`}
                  checked={isSelected}
                  onChange={(e) => handleMultiSelectChange(
                    type, 
                    { id: item.id, note: selectedItem?.note || '' },
                    e.target.checked
                  )}
                />
                <label htmlFor={`${type}-${item.id}`}>
                  {item.name || item.code}
                </label>
                
                {isSelected && (
                  <input
                    type="text"
                    value={selectedItem?.note || ''}
                    onChange={(e) => handleFunctionNoteChange(item.id, e.target.value)}
                    placeholder="Примечание"
                    className="function-note-input"
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Для нервов (объединяем name и type)
  if (type === 'nerve') {
    return (
      <div className="form-section">
        <label>{label}</label>
        <div className="multi-select-container">
          {items.map(item => (
            <div key={item.id} className="multi-select-item">
              <input
                type="checkbox"
                id={`${type}-${item.id}`}
                checked={selectedItems.includes(item.id)}
                onChange={(e) => handleMultiSelectChange(type, item.id, e.target.checked)}
              />
              <label htmlFor={`${type}-${item.id}`}>
                {`${item.name}${item.type ? ` (${item.type})` : ''}`}
              </label>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Стандартная обработка для других типов
  return (
    <div className="form-section">
      <label>{label}</label>
      <div className="multi-select-container">
        {items.map(item => (
          <div key={item.id} className="multi-select-item">
            <input
              type="checkbox"
              id={`${type}-${item.id}`}
              checked={selectedItems.includes(item.id)}
              onChange={(e) => handleMultiSelectChange(type, item.id, e.target.checked)}
            />
            <label htmlFor={`${type}-${item.id}`}>
              {item.name || item.code}
            </label>
          </div>
        ))}
      </div>
    </div>
  );
};

  return (
    <form onSubmit={handleSubmit} className="muscle-form">
      <div className="form-section">
        <label>Название (рус)</label>
        <input
          type="text"
          name="name_ru"
          value={formData.name_ru}
          onChange={handleInputChange}
          required
        />
      </div>

      <div className="form-section">
        <label>Название (лат)</label>
        <input
          type="text"
          name="name_lat"
          value={formData.name_lat}
          onChange={handleInputChange}
        />
      </div>

      <div className="form-section">
        <label>Начало</label>
        <textarea
          name="origin"
          value={formData.origin}
          onChange={handleInputChange}
          rows={3}
        />
      </div>

      <div className="form-section">
        <label>Прикрепление</label>
        <textarea
          name="insertion"
          value={formData.insertion}
          onChange={handleInputChange}
          rows={3}
        />
      </div>

      <div className="form-section">
        <label>Индикатор</label>
        <input
          type="text"
          name="indicator"
          value={formData.indicator}
          onChange={handleInputChange}
        />
      </div>

      <div className="form-section">
        <label>Зоны боли</label>
        <textarea
          name="pain_zones_text"
          value={formData.pain_zones_text}
          onChange={handleInputChange}
          rows={3}
        />
      </div>

      <div className="form-section">
        <label>Примечания</label>
        <textarea
          name="notes"
          value={formData.notes}
          onChange={handleInputChange}
          rows={3}
        />
      </div>
	  
	  
	  <div className="form-group">
        <label>Порядок отображения</label>
        <input
          type="number"
          name="display_order"
          value={formData.display_order || 0}
          onChange={handleInputChange}
          min="0"
        />
      </div>

      {renderMultiSelect(groups, selectedGroups, 'group', 'Группы мышц')}
      {renderMultiSelect(dysfunctions, selectedDysfunctions, 'dysfunction', 'Дисфункции')}
      {renderMultiSelect(meridians, selectedMeridians, 'meridian', 'Меридианы')}
      {renderMultiSelect(organs, selectedOrgans, 'organ', 'Органы')}
      {renderMultiSelect(nerves, selectedNerves, 'nerve', 'Нервы')}
      {renderMultiSelect(vertebrae, selectedVertebrae, 'vertebra', 'Позвонки')}
      {renderMultiSelect(functs, selectedFuncts, 'funct', 'Функции')}	  

      <div className="form-actions">
        <button type="submit" className="save-button">
          Сохранить
        </button>
      </div>
    </form>
  );
}