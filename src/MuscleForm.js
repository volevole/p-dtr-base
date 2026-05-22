// src/MuscleForm.js — полностью на новой БД (через API)
import React, { useState, useEffect } from 'react';
import API_URL from './config/api';

export default function MuscleForm({ muscle, onSave }) {
  const [formData, setFormData] = useState({
    name_ru: '',
    name_lat: '',
    origin: '',
    insertion: '',
    indicator: '',
    pain_zones_text: '',
    notes: '',
    display_order: 0
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

  // Загрузка справочников (один раз)
  useEffect(() => {
    loadDictionaries();
  }, []);

  // Загрузка данных мышцы при изменении muscle.id
  useEffect(() => {
    if (muscle) {
      // Основные данные
      setFormData({
        name_ru: muscle.name_ru || '',
        name_lat: muscle.name_lat || '',
        origin: muscle.origin || '',
        insertion: muscle.insertion || '',
        indicator: muscle.indicator || '',
        pain_zones_text: muscle.pain_zones_text || '',
        notes: muscle.notes || '',
        display_order: muscle.display_order || 0
      });

      // Загружаем связи для этой мышцы
      loadRelatedData(muscle.id);
    }
  }, [muscle]);

  // Загрузка справочников через API
  const loadDictionaries = async () => {
    try {
      const endpoints = [
        '/api/dictionaries/groups',
        '/api/dictionaries/dysfunctions',
        '/api/dictionaries/meridians',
        '/api/dictionaries/organs',
        '/api/dictionaries/nerves',
        '/api/dictionaries/functions',
        '/api/dictionaries/vertebrae'
      ];

      const responses = await Promise.all(endpoints.map(url => fetch(`${API_URL}${url}`)));
      const results = await Promise.all(responses.map(r => r.json()));

      setGroups(results[0].data || []);
      setDysfunctions(results[1].data || []);
      setMeridians(results[2].data || []);
      setOrgans(results[3].data || []);
      setNerves(results[4].data || []);
      setFuncts(results[5].data || []);
      setVertebrae(results[6].data || []);
    } catch (error) {
      console.error('Ошибка загрузки справочников:', error);
    }
  };

  // Загрузка связей для конкретной мышцы
  const loadRelatedData = async (muscleId) => {
    try {
      const response = await fetch(`${API_URL}/api/muscle/${muscleId}/relations`);
      const result = await response.json();

      if (result.success) {
        setSelectedGroups(result.data.groups || []);
        setSelectedDysfunctions(result.data.dysfunctions || []);
        setSelectedMeridians(result.data.meridians || []);
        setSelectedOrgans(result.data.organs || []);
        setSelectedNerves(result.data.nerves || []);
        setSelectedFuncts(result.data.functions || []);
        setSelectedVertebrae(result.data.vertebrae || []);
      }
    } catch (error) {
      console.error('Ошибка загрузки связей:', error);
    }
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

    try {
      // 1. Сохраняем основные данные
      const updateResponse = await fetch(`${API_URL}/api/muscle/${muscle.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const updateResult = await updateResponse.json();
      if (!updateResult.success) throw new Error(updateResult.error);

      // 2. Сохраняем связи
      const relationsResponse = await fetch(`${API_URL}/api/muscle/${muscle.id}/relations`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          groups: selectedGroups,
          dysfunctions: selectedDysfunctions,
          meridians: selectedMeridians,
          organs: selectedOrgans,
          nerves: selectedNerves,
          functions: selectedFuncts,
          vertebrae: selectedVertebrae
        })
      });
      const relationsResult = await relationsResponse.json();
      if (!relationsResult.success) throw new Error(relationsResult.error);

      // 3. Успешное сохранение
      onSave({ ...muscle, ...formData });
      alert('Данные сохранены!');
    } catch (error) {
      console.error('Ошибка сохранения:', error);
      alert(`Ошибка сохранения: ${error.message}`);
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
          rows={7}
        />
      </div>

      <div className="form-group">
        <label>Порядок отображения</label>
        <input
          type="number"
          name="display_order"
          value={formData.display_order}
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