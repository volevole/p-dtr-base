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
  const handleChange = (path, value) => {
    onChange({ ...data, [path]: value });
  };

   // 1. Хелпер для рендера текстового поля (подпись сверху, кнопка внутри поля)
  const renderField = (label, path, placeholder = '', options = []) => {
    const listId = `list-${path}`;
    return (
      <div style={{ marginBottom: '10px' }}>
        <label style={{ fontSize: '12px', display: 'block', marginBottom: '4px', color: '#495057' }}>{label}</label>
        
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <input 
            type="text" 
            list={options.length > 0 ? listId : undefined}
            placeholder={placeholder}
            value={data[path] || ''}
            onChange={e => handleChange(path, e.target.value)}
            style={{ 
              width: '100%', 
              padding: '6px', 
              paddingRight: placeholder ? '28px' : '6px', // 👈 Оставляем место справа под кнопку, если есть плейсхолдер
              border: '1px solid #ccc', 
              borderRadius: '4px', 
              boxSizing: 'border-box' 
            }}
          />

          {/* 👈 Кнопка магии ВНУТРИ поля */}
          {placeholder && !data[path] && (
            <button 
              type="button"
              onClick={() => handleChange(path, placeholder)}
              title="Вставить шаблон"
              style={{ 
                position: 'absolute', 
                right: '6px', 
                background: 'none', 
                border: 'none', 
                cursor: 'pointer', 
                fontSize: '14px', 
                padding: 0, 
                color: '#007bff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              ✨
            </button>
          )}
        </div>

        {options.length > 0 && (
          <datalist id={listId}>
            {options.map((opt, i) => <option key={i} value={opt} />)}
          </datalist>
        )}
      </div>
    );
  };

  // 2. Хелпер для рендера поля в одну строку
  const renderInlineField = (label, path, placeholder = '', options = []) => {
    const listId = `list-inline-${path}`;
    return (
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
        <label style={{ fontSize: '12px', color: '#495057', marginRight: '8px', whiteSpace: 'nowrap' }}>{label}</label>
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <input 
            type="text" 
            list={options.length > 0 ? listId : undefined}
            placeholder={placeholder}
            value={data[path] || ''}
            onChange={e => handleChange(path, e.target.value)}
            style={{ width: '80px', padding: '6px', paddingRight: '20px', border: '1px solid #ccc', borderRadius: '4px', boxSizing: 'border-box' }}
          />
          {/* Кнопка шаблона для инлайн-поля */}
          {placeholder && !data[path] && (
            <button 
              type="button"
              onClick={() => handleChange(path, placeholder)}
              title="Вставить шаблон"
              style={{ position: 'absolute', right: '2px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '10px', padding: 0, color: '#007bff' }}
            >
              ✨
            </button>
          )}
        </div>
        {options.length > 0 && (
          <datalist id={listId}>
            {options.map((opt, i) => <option key={i} value={opt} />)}
          </datalist>
        )}
      </div>
    );
  };

  // 3. Общий стиль для всех блоков
  const blockStyle = { padding: '15px', border: '1px solid #dee2e6', backgroundColor: '#f8f9fa', borderRadius: '8px' };
  const blockTitleStyle = { margin: '0 0 15px 0', color: '#495057', fontSize: '15px', fontWeight: 'bold', borderBottom: '1px solid #dee2e6', paddingBottom: '5px' };
  const eyeTitleStyle = { fontWeight: 'bold', fontSize: '13px', marginBottom: '10px', color: '#0056b3', backgroundColor: '#e3f2fd', padding: '4px 8px', borderRadius: '4px', display: 'inline-block' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
      
      {/* БЛОК 1: Острота зрения */}
      <div style={blockStyle}>
        <h4 style={blockTitleStyle}>Острота зрения</h4>
        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '200px' }}>
            <div style={eyeTitleStyle}>OD (Правый)</div>
            {renderInlineField('Vis OD', 'vision_od', '1.0',['1.0', '0.9', '0.8', '0.5'])}
          </div>
          <div style={{ flex: 1, minWidth: '200px' }}>
            <div style={eyeTitleStyle}>OS (Левый)</div>
            {renderInlineField('Vis OS', 'vision_os', '1.0',['1.0', '0.9', '0.8', '0.5'])}
          </div>
        </div>
      </div>

      {/* БЛОК 2: Веки и положение глаза */}
      <div style={blockStyle}>
        <h4 style={blockTitleStyle}>Веки и положение глаза</h4>
        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '200px' }}>
            <div style={eyeTitleStyle}>OD (Правый)</div>
            {renderField('Веки справа', 'eyelids_right_od', 'Спокойные...')}
            {renderField('Веки слева', 'eyelids_left_od', 'Спокойные...')}
            {renderField('Положение глаза', 'eye_position_right', 'Правильное...')}
          </div>
          <div style={{ flex: 1, minWidth: '200px' }}>
            <div style={eyeTitleStyle}>OS (Левый)</div>
            {renderField('Веки справа', 'eyelids_right_os', 'Спокойные...')}
            {renderField('Веки слева', 'eyelids_left_os', 'Спокойные...')}
            {renderField('Положение глаза', 'eye_position_left', 'Правильное...')}
          </div>
        </div>
      </div>

      {/* БЛОК 3: Передний отрезок */}
      <div style={blockStyle}>
        <h4 style={blockTitleStyle}>Передний отрезок</h4>
        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
          {/* OD */}
          <div style={{ flex: 1, minWidth: '200px' }}>
            <div style={eyeTitleStyle}>OD (Правый)</div>
            {renderField('Конъюнктива', 'ant_right_conjunctiva', 'Бледно-розовая')}
            {renderField('Роговица', 'ant_right_cornea', 'Прозрачная')}
            {renderField('Передняя камера', 'ant_right_camera', 'Средней глубины')}
            {renderField('Влага камеры', 'ant_right_humour', 'Прозрачная')}
            {renderField('Радужка', 'ant_right_iris', 'Структурная')}
            {renderField('Зрачок', 'ant_right_pupil', 'Правильной формы')}
            {renderInlineField('Диаметр зрачка', 'ant_right_pupil_size', '3 мм')}
            {renderField('Хрусталик', 'ant_right_lens', 'Прозрачный',  ['Прозрачный', 'Помутнение', 'Артифакия', 'Факосклероз'])}
            {renderField('Рефлекс', 'ant_right_reflex', 'Розовый')}
          </div>
          {/* OS */}
          <div style={{ flex: 1, minWidth: '200px' }}>
            <div style={eyeTitleStyle}>OS (Левый)</div>
            {renderField('Конъюнктива', 'ant_left_conjunctiva', 'Бледно-розовая')}
            {renderField('Роговица', 'ant_left_cornea', 'Прозрачная')}
            {renderField('Передняя камера', 'ant_left_camera', 'Средней глубины')}
            {renderField('Влага камеры', 'ant_left_humour', 'Прозрачная')}
            {renderField('Радужка', 'ant_left_iris', 'Структурная')}
            {renderField('Зрачок', 'ant_left_pupil', 'Правильной формы')}
            {renderInlineField('Диаметр зрачка', 'ant_left_pupil_size', '3 мм')}
            {renderField('Хрусталик', 'ant_left_lens', 'Прозрачный', ['Прозрачный', 'Помутнение', 'Артифакия', 'Факосклероз'])}
            {renderField('Рефлекс', 'ant_left_reflex', 'Розовый')}
          </div>
        </div>
      </div>

      {/* БЛОК 4: Глазное дно и Сосуды */}
      <div style={blockStyle}>
        <h4 style={blockTitleStyle}>Глазное дно</h4>
        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '200px' }}>
            <div style={eyeTitleStyle}>OD (Правый)</div>
            {renderField('ДЗН', 'fundus_right_dzn', 'Бледно-розовый...')}
            {renderField('Артерии', 'fundus_right_arteries', 'Сужены...')}
            {renderField('Вены', 'fundus_right_veins', 'Расширены...')}
          </div>
          <div style={{ flex: 1, minWidth: '200px' }}>
            <div style={eyeTitleStyle}>OS (Левый)</div>
            {renderField('ДЗН', 'fundus_left_dzn', 'Бледно-розовый...')}
            {renderField('Артерии', 'fundus_left_arteries', 'Сужены...')}
            {renderField('Вены', 'fundus_left_veins', 'Расширены...')}
          </div>
        </div>
      </div>

      {/* БЛОК 5: Сетчатка */}
      <div style={blockStyle}>
        <h4 style={blockTitleStyle}>Сетчатка</h4>
        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '200px' }}>
            <div style={eyeTitleStyle}>OD (Правый)</div>
            {renderField('Макулярный отдел', 'retina_right_macula', 'Без особенностей')}
            {renderField('Периферический отдел', 'retina_right_periphery', 'Без особенностей')}
          </div>
          <div style={{ flex: 1, minWidth: '200px' }}>
            <div style={eyeTitleStyle}>OS (Левый)</div>
            {renderField('Макулярный отдел', 'retina_left_macula', 'Без особенностей')}
            {renderField('Периферический отдел', 'retina_left_periphery', 'Без особенностей')}
          </div>
        </div>
      </div>

      {/* БЛОК 6: Заключение (общее) */}
      <div style={{ padding: '15px', border: '1px solid #b8daff', backgroundColor: '#f0f9ff', borderRadius: '8px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontSize: '15px', fontWeight: 'bold', color: '#004085' }}>Заключение (общее)</label>
        <textarea 
          value={data.conclusion || ''}
          onChange={e => handleChange('conclusion', e.target.value)}
          placeholder="Диагноз, рекомендации..."
          style={{ width: '100%', boxSizing: 'border-box', padding: '10px', border: '1px solid #ccc', borderRadius: '4px', minHeight: '100px', resize: 'vertical', fontSize: '14px' }}
        />
      </div>

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