// src/SettingsProfilePage.js
import React, { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import { FaUserShield, FaBriefcaseMedical, FaCamera, FaEdit, FaTrash, FaPlus } from 'react-icons/fa';
import API_URL from './config/api';

export default function SettingsProfilePage() {
  const { user } = useAuth();
  
  // 👈 Проверяем доступ к приёмам (admin_content сюда НЕ входит)
  const hasAppointmentsAccess = user?.roles?.some(r => 
    ['admin', 'appointments'].includes(r)
  );

  const [activeTab, setActiveTab] = useState('security');

  // --- Состояние для Аватара ---
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url || '');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // --- Состояние для Специализаций ---
  const [allSpecs, setAllSpecs] = useState([]);
  const [selectedSpecs, setSelectedSpecs] = useState([]);
  const [specsLoading, setSpecsLoading] = useState(true);
  const [specsSaving, setSpecsSaving] = useState(false);

  // --- Состояние для Услуг ---
  const [services, setServices] = useState([]);
  const [newService, setNewService] = useState({ name: '', specialization_code: '', default_duration_minutes: 60, default_price: 0 });

  // --- Состояние для Мест ---
  const [locations, setLocations] = useState([]);
  const [newLocation, setNewLocation] = useState({ name: '', address: '', buffer_before_minutes: 0, buffer_after_minutes: 0 });

  // --- Сообщения ---
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    if (activeTab === 'appointments' && hasAppointmentsAccess) {
      fetchAppointmentData();
    }
  }, [activeTab, hasAppointmentsAccess]);

   const fetchAppointmentData = async () => {
    try {
      setSpecsLoading(true);
      
      // 1. Загружаем специализации (всегда)
      const [allRes, myRes] = await Promise.all([
        fetch(`${API_URL}/api/appt/specializations`, { credentials: 'include' }),
        fetch(`${API_URL}/api/appt/my-specializations`, { credentials: 'include' })
      ]);
      
      const allData = await allRes.json();
      const myData = await myRes.json();
      
      if (allData.success) setAllSpecs(allData.data);
      if (myData.success) setSelectedSpecs(myData.data);

      // 2. Загружаем услуги и места (только если есть права)
      if (hasAppointmentsAccess) {
        const [servRes, locRes] = await Promise.all([
          fetch(`${API_URL}/api/appt/services`, { credentials: 'include' }),
          fetch(`${API_URL}/api/appt/locations`, { credentials: 'include' })
        ]);
        
        const servData = await servRes.json();
        const locData = await locRes.json();

        if (servData.success) setServices(servData.data);
        if (locData.success) setLocations(locData.data);
      }
      
    } catch (error) {
      console.error('Ошибка загрузки:', error);
    } finally {
      setSpecsLoading(false);
    }
  };

  // --- Аватар ---
  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingAvatar(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('entityType', 'user');
    formData.append('entityId', user.id);

    try {
      const uploadRes = await fetch(`${API_URL}/api/media/upload`, {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });
      const uploadData = await uploadRes.json();

      if (uploadData.success) {
        await fetch(`${API_URL}/api/profile/avatar`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ avatar_url: uploadData.publicUrl })
        });
        setAvatarUrl(uploadData.publicUrl);
        setMessage({ type: 'success', text: '✅ Аватар обновлён' });
      } else {
        throw new Error(uploadData.error);
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Ошибка загрузки фото: ' + err.message });
    } finally {
      setUploadingAvatar(false);
    }
  };

  // --- Специализации ---
  const handleSpecChange = (code) => {
    setSelectedSpecs(prev => prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]);
  };

  const handleSaveSpecs = async () => {
    setSpecsSaving(true);
    try {
      await fetch(`${API_URL}/api/appt/my-specializations`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ codes: selectedSpecs })
      });
      setMessage({ type: 'success', text: '✅ Специализации сохранены' });
    } catch (err) {
      setMessage({ type: 'error', text: 'Ошибка: ' + err.message });
    } finally {
      setSpecsSaving(false);
    }
  };

  // --- Услуги ---
  const handleAddService = async (e) => {
    e.preventDefault();
    if (!newService.name || !newService.specialization_code) {
      return setMessage({ type: 'error', text: 'Заполните название и выберите специализацию' });
    }
    try {
      const res = await fetch(`${API_URL}/api/appt/services`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(newService)
      });
      const data = await res.json();
      if (data.success) {
        setServices([...services, data.data]);
        setNewService({ name: '', specialization_code: '', default_duration_minutes: 60, default_price: 0 });
        setMessage({ type: 'success', text: '✅ Услуга добавлена' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    }
  };

   // --- Редактирование Услуги ---
  const handleEditService = async (service) => {
    const newName = window.prompt('Название услуги:', service.name);
    if (!newName) return;
    
    const newDuration = window.prompt('Длительность (мин):', service.default_duration_minutes);
    if (!newDuration) return;

    const newPrice = window.prompt('Цена (руб):', service.default_price);
    if (!newPrice) return;

    try {
      const res = await fetch(`${API_URL}/api/appt/services/${service.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: newName,
          specialization_code: service.specialization_code,
          default_duration_minutes: newDuration,
          default_price: newPrice
        })
      });
      const data = await res.json();
      if (data.success) {
        setServices(services.map(s => s.id === service.id ? data.data : s));
        setMessage({ type: 'success', text: '✅ Услуга обновлена' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    }
  };
  const handleDeleteService = async (id) => {
    if (!window.confirm('Удалить услугу?')) return;
    try {
      await fetch(`${API_URL}/api/appt/services/${id}`, { method: 'DELETE', credentials: 'include' });
      setServices(services.filter(s => s.id !== id));
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    }
  };

  // --- Места ---
  const handleAddLocation = async (e) => {
    e.preventDefault();
    if (!newLocation.name) return setMessage({ type: 'error', text: 'Введите название места' });
    try {
      const res = await fetch(`${API_URL}/api/appt/locations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(newLocation)
      });
      const data = await res.json();
      if (data.success) {
        setLocations([...locations, data.data]);
        setNewLocation({ name: '', address: '', buffer_before_minutes: 0, buffer_after_minutes: 0 });
        setMessage({ type: 'success', text: '✅ Место добавлено' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    }
  };

  const handleDeleteLocation = async (id) => {
    if (!window.confirm('Удалить место?')) return;
    try {
      await fetch(`${API_URL}/api/appt/locations/${id}`, { method: 'DELETE', credentials: 'include' });
      setLocations(locations.filter(l => l.id !== id));
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    }
  };


  // --- Редактирование Места ---
  const handleEditLocation = async (location) => {
    const newName = window.prompt('Название места:', location.name);
    if (!newName) return;
    
    const newAddress = window.prompt('Адрес:', location.address);
    if (newAddress === null) return; // Если нажали "Отмена"

    const newBufferBefore = window.prompt('Время "до" (мин):', location.buffer_before_minutes);
    if (newBufferBefore === null) return;

    const newBufferAfter = window.prompt('Время "после" (мин):', location.buffer_after_minutes);
    if (newBufferAfter === null) return;

    try {
      const res = await fetch(`${API_URL}/api/appt/locations/${location.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: newName,
          address: newAddress,
          description: location.description || '',
          buffer_before_minutes: newBufferBefore,
          buffer_after_minutes: newBufferAfter
        })
      });
      const data = await res.json();
      if (data.success) {
        setLocations(locations.map(l => l.id === location.id ? data.data : l));
        setMessage({ type: 'success', text: '✅ Место обновлено' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    }
  };

  const tabStyle = (isActive) => ({
    padding: '10px 20px', backgroundColor: isActive ? '#007bff' : '#f8f9fa',
    color: isActive ? 'white' : '#495057', border: '1px solid #dee2e6',
    borderBottom: isActive ? 'none' : '1px solid #dee2e6', cursor: 'pointer',
    fontSize: '16px', fontWeight: isActive ? '600' : '400',
    borderRadius: '8px 8px 0 0', marginRight: '5px',
    display: 'flex', alignItems: 'center', gap: '8px'
  });

  return (
    <div className="detail-container" style={{ maxWidth: '1000px' }}>
      <h1 className="detail-title">Мой профиль</h1>
      
      {message.text && (
        <div style={{ padding: '15px', marginBottom: '20px', borderRadius: '4px', backgroundColor: message.type === 'success' ? '#d4edda' : '#f8d7da', color: message.type === 'success' ? '#155724' : '#721c24' }}>
          {message.text}
        </div>
      )}

      {/* Блок Аватара */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '30px', padding: '20px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
        <div style={{ width: '100px', height: '100px', borderRadius: '50%', backgroundColor: '#e9ecef', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #dee2e6' }}>
         
            {avatarUrl ? (
                <img 
                    // 👈 Пропускаем ссылку через наш прокси
                    src={`${API_URL}/api/curl-proxy-image?url=${encodeURIComponent(avatarUrl)}&size=M`} 
                    alt="Аватар" 
                    crossOrigin="anonymous"
                    referrerPolicy="no-referrer"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                    onError={(e) => {
                    // Если ссылка вдруг битая, показываем иконку
                    e.target.style.display = 'none';
                    e.target.parentElement.innerHTML = '<svg ...>'; // или просто оставляем пусто
                    }}
                />
                ) : (
                <FaCamera size={40} color="#adb5bd" />
                )}

        </div>
        <div>
          <h3 style={{ margin: '0 0 10px 0' }}>Фото профиля</h3>
          <input type="file" id="avatar-upload" accept="image/*" onChange={handleAvatarUpload} style={{ display: 'none' }} disabled={uploadingAvatar} />
          <label htmlFor="avatar-upload" style={{ display: 'inline-block', padding: '10px 20px', backgroundColor: uploadingAvatar ? '#6c757d' : '#007bff', color: 'white', borderRadius: '4px', cursor: uploadingAvatar ? 'not-allowed' : 'pointer' }}>
            {uploadingAvatar ? 'Загрузка...' : 'Загрузить фото'}
          </label>
        </div>
      </div>

      {/* Вкладки */}
      <div style={{ display: 'flex', borderBottom: '1px solid #dee2e6', marginBottom: '30px' }}>
        <button style={tabStyle(activeTab === 'security')} onClick={() => setActiveTab('security')}>
          <FaUserShield /> Безопасность
        </button>
        {hasAppointmentsAccess && (
          <button style={tabStyle(activeTab === 'appointments')} onClick={() => setActiveTab('appointments')}>
            <FaBriefcaseMedical /> Настройки приёмов
          </button>
        )}
      </div>

      {/* Вкладка: Безопасность */}
      {activeTab === 'security' && (
        <div style={{ padding: '20px', border: '1px solid #dee2e6', borderRadius: '8px' }}>
          <h3 style={{ marginTop: 0 }}>Смена пароля</h3>
          <p style={{ fontSize: '14px', color: '#666' }}>Функционал в разработке.</p>
        </div>
      )}

      {/* Вкладка: Настройки приёмов */}
      {activeTab === 'appointments' && hasAppointmentsAccess && (
        <div>
          {/* 1. Специализации */}
          <div style={{ padding: '20px', border: '1px solid #dee2e6', borderRadius: '8px', marginBottom: '20px' }}>
            <h3 style={{ marginTop: 0 }}>Мои специализации</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px', marginBottom: '20px' }}>
              {allSpecs.map(spec => (
                <label key={spec.code} style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                  <input type="checkbox" checked={selectedSpecs.includes(spec.code)} onChange={() => handleSpecChange(spec.code)} style={{ marginRight: '8px' }} />
                  {spec.name}
                </label>
              ))}
            </div>
            <button onClick={handleSaveSpecs} disabled={specsSaving} style={{ padding: '8px 16px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px' }}>
              {specsSaving ? 'Сохранение...' : 'Сохранить специализации'}
            </button>
          </div>

                    {/* 2. Услуги */}
          <div style={{ padding: '20px', border: '1px solid #dee2e6', borderRadius: '8px', marginBottom: '20px' }}>
            <h3 style={{ marginTop: 0 }}>Мои услуги</h3>
            
            <form onSubmit={handleAddService} style={{ 
              display: 'flex', 
              gap: '15px', 
              marginBottom: '20px', 
              flexWrap: 'wrap',
              alignItems: 'flex-end' // Выравниваем кнопку по нижнему краю
            }}>
              
              <div style={{ flex: 1, minWidth: '200px' }}>
                <label style={{ display: 'block', fontSize: '13px', color: '#495057', marginBottom: '5px' }}>Название услуги</label>
                <input type="text" placeholder="Лимфодренажный массаж" value={newService.name} onChange={e => setNewService({...newService, name: e.target.value})} style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }} />
              </div>

              <div style={{ flex: 1, minWidth: '200px' }}>
                <label style={{ display: 'block', fontSize: '13px', color: '#495057', marginBottom: '5px' }}>Специализация</label>
                <select value={newService.specialization_code} onChange={e => setNewService({...newService, specialization_code: e.target.value})} style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px', backgroundColor: 'white' }}>
                  <option value="">Выберите...</option>
                  {allSpecs.filter(s => selectedSpecs.includes(s.code)).map(s => (
                    <option key={s.code} value={s.code}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div style={{ width: '120px' }}>
                <label style={{ display: 'block', fontSize: '13px', color: '#495057', marginBottom: '5px' }}>Длительность (мин)</label>
                <input type="number" placeholder="60" value={newService.default_duration_minutes} onChange={e => setNewService({...newService, default_duration_minutes: e.target.value})} style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }} />
              </div>

              <div style={{ width: '120px' }}>
                <label style={{ display: 'block', fontSize: '13px', color: '#495057', marginBottom: '5px' }}>Цена (руб)</label>
                <input type="number" placeholder="0" value={newService.default_price} onChange={e => setNewService({...newService, default_price: e.target.value})} style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }} />
              </div>

              <button type="submit" style={{ padding: '9px 16px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', height: '38px' }}>
                <FaPlus /> Добавить
              </button>
            </form>

            <ul style={{ listStyle: 'none', padding: 0 }}>
              {services.map(s => (
                <li key={s.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', borderBottom: '1px solid #eee' }}>
                  <span><strong>{s.name}</strong> ({allSpecs.find(sp => sp.code === s.specialization_code)?.name || s.specialization_code}) — {s.default_duration_minutes} мин. — {s.default_price} руб.</span>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={() => handleEditService(s)} style={{ background: 'none', border: 'none', color: '#007bff', cursor: 'pointer' }} title="Редактировать"><FaEdit /></button>
                    <button onClick={() => handleDeleteService(s.id)} style={{ background: 'none', border: 'none', color: '#dc3545', cursor: 'pointer' }} title="Удалить"><FaTrash /></button>
                  </div>
                </li>
              ))}
            </ul>
            {/* 👈 Добавляем пояснение для услуг */}
            <div style={{ 
              marginTop: '15px', 
              padding: '12px', 
              backgroundColor: '#fff3cd', 
              borderRadius: '6px', 
              fontSize: '13px', 
              color: '#856404',
              lineHeight: '1.5'
            }}>
              💡 <strong>О ценах:</strong> Здесь указывается базовая стоимость услуги (без учета каких-либо скидок или акций). 
              В дальнейшем система будет рассчитывать скидки, абонементы и итоговую стоимость именно от этой базовой цены.
            </div>
          </div>

                   {/* 3. Места приёма */}
          <div style={{ padding: '20px', border: '1px solid #dee2e6', borderRadius: '8px' }}>
            <h3 style={{ marginTop: 0 }}>Места приёма</h3>
            
            <form onSubmit={handleAddLocation} style={{ 
              display: 'flex', 
              gap: '15px', 
              marginBottom: '20px', 
              flexWrap: 'wrap',
              alignItems: 'flex-end'
            }}>
              
              <div style={{ flex: 1, minWidth: '180px' }}>
                <label style={{ display: 'block', fontSize: '13px', color: '#495057', marginBottom: '5px' }}>Название места</label>
                <input type="text" placeholder="Кабинет 1" value={newLocation.name} onChange={e => setNewLocation({...newLocation, name: e.target.value})} style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }} />
              </div>

              <div style={{ flex: 2, minWidth: '200px' }}>
                <label style={{ display: 'block', fontSize: '13px', color: '#495057', marginBottom: '5px' }}>Адрес (для инструкции)</label>
                <input type="text" placeholder="ул. Ленина, д. 10, вход в подвал справа от подъезда 2" value={newLocation.address} onChange={e => setNewLocation({...newLocation, address: e.target.value})} style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }} />
              </div>

              <div style={{ width: '130px' }}>
                <label style={{ display: 'block', fontSize: '13px', color: '#495057', marginBottom: '5px' }}>Время "до" (мин)</label>
                <input type="number" placeholder="0" value={newLocation.buffer_before_minutes} onChange={e => setNewLocation({...newLocation, buffer_before_minutes: e.target.value})} style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }} />
              </div>

              <div style={{ width: '130px' }}>
                <label style={{ display: 'block', fontSize: '13px', color: '#495057', marginBottom: '5px' }}>Время "после" (мин)</label>
                <input type="number" placeholder="0" value={newLocation.buffer_after_minutes} onChange={e => setNewLocation({...newLocation, buffer_after_minutes: e.target.value})} style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }} />
              </div>

              <button type="submit" style={{ padding: '9px 16px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', height: '38px' }}>
                <FaPlus /> Добавить
              </button>
            </form>

            <ul style={{ listStyle: 'none', padding: 0 }}>
              {locations.map(l => (
                <li key={l.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', borderBottom: '1px solid #eee' }}>
                  <span><strong>{l.name}</strong> — {l.address || 'без адреса'} (до: {l.buffer_before_minutes} мин, после: {l.buffer_after_minutes} мин)</span>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={() => handleEditLocation(l)} style={{ background: 'none', border: 'none', color: '#007bff', cursor: 'pointer' }} title="Редактировать"><FaEdit /></button>
                    <button onClick={() => handleDeleteLocation(l.id)} style={{ background: 'none', border: 'none', color: '#dc3545', cursor: 'pointer' }} title="Удалить"><FaTrash /></button>
                  </div>
                </li>
              ))}
            </ul>
            {/* 👈 Добавляем поясняющий текст сюда */}
            <div style={{ 
              marginTop: '15px', 
              padding: '12px', 
              backgroundColor: '#e9f7fe', 
              borderRadius: '6px', 
              fontSize: '13px', 
              color: '#0c5460',
              lineHeight: '1.5'
            }}>
              💡 <strong>Время «до» и «после»</strong> — это требуемое дополнительное время перед приёмом и после него. 
              Вместе с длительностью услуги оно занимает место в сетке календаря. Это важно для точности планирования ваших записей и предотвращения накладок.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}