// src/appointments/specializationFields.js
import React from 'react';

// Цвета для статусов
const getToothColor = (status) => {
  switch (status) {
    case 'caries': return '#dc3545'; // Красный
    case 'treated': return '#28a745'; // Зеленый
    case 'missing': return '#6c757d'; // Серый
    default: return '#f8f9fa'; // Светлый
  }
};

// Компонент для отрисовки карты зубов
const TeethMap = ({ data, onChange }) => {
  const upperTeeth = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
  const lowerTeeth = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];

  const toggleTooth = (num) => {
    const statuses = ['healthy', 'caries', 'treated', 'missing'];
    const current = data[num] || 'healthy';
    const nextIndex = (statuses.indexOf(current) + 1) % statuses.length;
    onChange({ ...data, [num]: statuses[nextIndex] });
  };

  const renderRow = (teeth) => (
    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', justifyContent: 'center', marginBottom: '10px' }}>
      {teeth.map(num => {
        const status = data[num] || 'healthy';
        return (
          <div 
            key={num}
            onClick={() => toggleTooth(num)}
            title={`Зуб ${num}: ${status}`}
            style={{ 
              width: '36px', height: '36px', 
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              backgroundColor: getToothColor(status), 
              border: '1px solid #999', borderRadius: '4px', cursor: 'pointer',
              fontSize: '12px', fontWeight: 'bold', color: status === 'healthy' ? '#333' : 'white',
              userSelect: 'none'
            }}
          >
            {num}
          </div>
        );
      })}
    </div>
  );

  return (
    <div>
      {renderRow(upperTeeth)}
      <div style={{ width: '100%', height: '1px', backgroundColor: '#ccc', margin: '10px 0' }}></div>
      {renderRow(lowerTeeth)}
      <div style={{ marginTop: '15px', fontSize: '12px', color: '#666', display: 'flex', gap: '15px', flexWrap: 'wrap', justifyContent: 'center' }}>
        <span>⬜ Здоровый</span>
        <span style={{color: '#dc3545'}}>🟥 Кариес</span>
        <span style={{color: '#28a745'}}>🟩 Пролечен</span>
        <span style={{color: '#6c757d'}}>⬛ Отсутствует</span>
      </div>
    </div>
  );
};

// Компонент для офтальмолога
const EyeMap = ({ data, onChange }) => {
  const handleEyeChange = (eye, field, value) => {
    onChange({
      ...data,
      [eye]: { ...(data[eye] || {}), [field]: value }
    });
  };

  return (
    <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
      {['left', 'right'].map(eye => (
        <div key={eye} style={{ flex: 1, minWidth: '250px', padding: '15px', border: '1px solid #ddd', borderRadius: '8px', backgroundColor: '#fafafa' }}>
          <h4 style={{ marginTop: 0, textAlign: 'center' }}>{eye === 'left' ? 'Левый глаз (OS)' : 'Правый глаз (OD)'}</h4>
          <div style={{ marginBottom: '10px' }}>
            <label style={{ fontSize: '12px', display: 'block', marginBottom: '4px' }}>Острота зрения</label>
            <input 
              type="text" 
              placeholder="Например, 1.0"
              value={data[eye]?.vision || ''}
              onChange={e => handleEyeChange(eye, 'vision', e.target.value)}
              style={{ width: '100%', padding: '6px', border: '1px solid #ccc', borderRadius: '4px' }}
            />
          </div>
          <div>
            <label style={{ fontSize: '12px', display: 'block', marginBottom: '4px' }}>Внутриглазное давление</label>
            <input 
              type="text" 
              placeholder="Например, 18 мм рт.ст."
              value={data[eye]?.pressure || ''}
              onChange={e => handleEyeChange(eye, 'pressure', e.target.value)}
              style={{ width: '100%', padding: '6px', border: '1px solid #ccc', borderRadius: '4px' }}
            />
          </div>
        </div>
      ))}
    </div>
  );
};

// Компонент для массажиста
const MassageFields = ({ data, onChange }) => {
  return (
    <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
      <div style={{ flex: 1 }}>
        <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: 'bold', color: '#0056b3' }}>Используемое масло</label>
        <select 
          value={data.oil || ''} 
          onChange={e => onChange({ ...data, oil: e.target.value })}
          style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
        >
          <option value="">Не указано</option>
          <option value="client">Масло клиента</option>
          <option value="master">Масло мастера</option>
          <option value="none">Без масла (сухой массаж)</option>
        </select>
      </div>
      <div style={{ flex: 2 }}>
        <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: 'bold', color: '#0056b3' }}>Комментарий по специализации</label>
        <input 
          type="text" 
          value={data.notes || ''} 
          onChange={e => onChange({ ...data, notes: e.target.value })}
          placeholder="Особенности выполнения..."
          style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
        />
      </div>
    </div>
  );
};

// Главный конфигуратор
export const SPECIALIZATION_CONFIG = {
  // Ключи должны точно совпадать с полем code в таблице appt_specializations
  'dentist': { title: 'Стоматология', icon: '🦷', component: TeethMap },
  'ophthalmologist': { title: 'Офтальмология', icon: '👁️', component: EyeMap },
  'massage': { title: 'Массаж', icon: '💆', component: MassageFields },
  
  // Для остальных специализаций мы можем пока не делать уникальных полей, 
  // но если они появятся, мы просто добавим их сюда:
  // 'pdtr': { title: 'П-ДТР', icon: '🌀', component: PdtrFields },
  // 'hairdresser': { title: 'Парикмахер', icon: '✂️', component: HairFields },
};

export const renderSpecializationField = (code, data, onChange) => {
  const config = SPECIALIZATION_CONFIG[code];
  if (!config) return <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>Для данной услуги нет специфических полей.</div>;
  
  const Component = config.component;
  return <Component data={data || {}} onChange={onChange} />;
};