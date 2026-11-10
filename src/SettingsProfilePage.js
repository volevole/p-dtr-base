// src/SettingsProfilePage.js
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from './context/AuthContext';
import { FaUserShield, FaBriefcaseMedical, FaCamera, FaEdit, FaTrash, FaPlus, FaEye, FaEyeSlash, FaSave } from 'react-icons/fa';
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
  const [newLocation, setNewLocation] = useState({ name: '', address: '', description: '', buffer_before_minutes: 0, buffer_after_minutes: 0 });

  // --- Сообщения ---
  const [message, setMessage] = useState({ type: '', text: '' });
  //   --- детальная информация профиля
  const [profileInfo, setProfileInfo] = useState(null);

 // Состояния для формы пароля
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passError, setPassError] = useState('');
  const [passSuccess, setPassSuccess] = useState('');

  // 👈 Состояния для показа паролей
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  
  // 👈 Состояния для режима редактирования Услуг и скрола по форме
  const [editingServiceId, setEditingServiceId] = useState(null);
  const formRef = useRef(null); // 👈 Ссылка на форму для скролла
  const listRef = useRef(null); // 👈 Ссылка на список услуг

// 👈 Состояния для режима редактирования МЕСТ и скрола по форме
  const [editingLocationId, setEditingLocationId] = useState(null);
  const locationFormRef = useRef(null); // 👈 Ссылка на форму
  const locationListRef = useRef(null); // 👈 Ссылка на список мест

  useEffect(() => {
    if (activeTab === 'appointments' && hasAppointmentsAccess) {
      fetchAppointmentData();
    }
  }, [activeTab, hasAppointmentsAccess]);

  useEffect(() => {
    // Загружаем детальную инфу при открытии страницы
    const fetchProfileInfo = async () => {
      try {
        const res = await fetch(`${API_URL}/api/profile/me`, { credentials: 'include' });
        const data = await res.json();
        if (data.success) {
          setProfileInfo(data.data);
        }
      } catch (err) {
        console.error('Ошибка загрузки профиля:', err);
      }
    };
    
    fetchProfileInfo();
  }, []);



  const isMobile = window.innerWidth <= 768;

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

  // --- Смена пароля ---
  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPassError('');
    setPassSuccess('');

    if (newPassword !== confirmPassword) {
      return setPassError('Новые пароли не совпадают');
    }
    if (newPassword.length < 8) {
      return setPassError('Новый пароль должен быть не менее 8 символов');
    }

    try {
      const res = await fetch(`${API_URL}/api/auth/password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ oldPassword, newPassword })
      });
      const data = await res.json();

      if (data.success) {
        setPassSuccess('✅ Пароль успешно изменен!');
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setPassError(data.error);
      }
    } catch (err) {
      setPassError('Ошибка сети: ' + err.message);
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
   const handleServiceSubmit = async (e) => {
    e.preventDefault();
    if (!newService.name || !newService.specialization_code) {
      return setMessage({ type: 'error', text: 'Заполните название и выберите специализацию' });
    }

    try {
      let res;
      if (editingServiceId) {
        // 👈 РЕЖИМ РЕДАКТИРОВАНИЯ (PUT)
        res = await fetch(`${API_URL}/api/appt/services/${editingServiceId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(newService)
        });
      } else {
        // 👈 РЕЖИМ СОЗДАНИЯ (POST)
        res = await fetch(`${API_URL}/api/appt/services`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(newService)
        });
      }

      const data = await res.json();
      
      if (data.success) {
        if (editingServiceId) {
          // Обновляем список
          setServices(services.map(s => s.id === editingServiceId ? data.data : s));
          setMessage({ type: 'success', text: '✅ Услуга обновлена' });
        } else {
          // Добавляем в список
          setServices([...services, data.data]);
          setMessage({ type: 'success', text: '✅ Услуга добавлена' });
        }
        
        // Сбрасываем форму
        setNewService({ name: '', specialization_code: '', default_duration_minutes: 60, default_price: 0 });
        setEditingServiceId(null); // Выключаем режим редактирования

        // 👈 ПЛАВНО СКРОЛЛИМ К СПИСКУ УСЛУГ
        setTimeout(() => {
          if (listRef.current) {
            listRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 100); // Небольшая задержка, чтобы React успел перерисовать список

      }
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    }
  };

  // Функция для отмены редактирования
  const handleCancelEdit = () => {
    setNewService({ name: '', specialization_code: '', default_duration_minutes: 60, default_price: 0 });
    setEditingServiceId(null);
  };

   // --- Редактирование Услуги ---
  const handleEditService = (service) => {
    setNewService({
      name: service.name,
      specialization_code: service.specialization_code,
      default_duration_minutes: service.default_duration_minutes,
      default_price: service.default_price
    });
    setEditingServiceId(service.id);
    
    // 👈 Скроллим к началу формы (чтобы был виден заголовок "Редактирование услуги")
    if (formRef.current) {
      formRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
    const handleLocationSubmit = async (e) => {
    e.preventDefault();
    if (!newLocation.name) return setMessage({ type: 'error', text: 'Введите название места' });

    try {
      let res;
      if (editingLocationId) {
        // 👈 РЕЖИМ РЕДАКТИРОВАНИЯ (PUT)
        res = await fetch(`${API_URL}/api/appt/locations/${editingLocationId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(newLocation)
        });
      } else {
        // 👈 РЕЖИМ СОЗДАНИЯ (POST)
        res = await fetch(`${API_URL}/api/appt/locations`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(newLocation)
        });
      }

      const data = await res.json();
      
      if (data.success) {
        if (editingLocationId) {
          setLocations(locations.map(l => l.id === editingLocationId ? data.data : l));
          setMessage({ type: 'success', text: '✅ Место обновлено' });
        } else {
          setLocations([...locations, data.data]);
          setMessage({ type: 'success', text: '✅ Место добавлено' });
        }
        
        // Сбрасываем форму
        setNewLocation({ name: '', address: '', buffer_before_minutes: 0, buffer_after_minutes: 0 });
        setEditingLocationId(null);
        
        // 👈 Плавно скроллим к списку мест
        setTimeout(() => {
          if (locationListRef.current) {
            locationListRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 100);
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    }
  };

  const handleCancelLocationEdit = () => {
    setNewLocation({ name: '', address: '', description: '', buffer_before_minutes: 0, buffer_after_minutes: 0 });
    setEditingLocationId(null);
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
  const handleEditLocation = (location) => {
    // Заполняем форму данными выбранного места
    setNewLocation({
      name: location.name,
      address: location.address || '',
      description: location.description || '',
      buffer_before_minutes: location.buffer_before_minutes || 0,
      buffer_after_minutes: location.buffer_after_minutes || 0
    });
    setEditingLocationId(location.id); // 👈 Включаем режим редактирования
    
    // Плавно скроллим к форме
    if (locationFormRef.current) {
      locationFormRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
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

    // Функция для красивого вывода дат
  const formatDate = (dateString) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleString('ru-RU', { 
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' 
    });
  };
  
  return (
    <div className="detail-container" style={{ 
      maxWidth: '1000px', 
      padding: isMobile ? '0px' : '32px', // 👈 Уменьшаем отступы на мобилке
        boxSizing: 'border-box'
      }}>

      <h1 className="detail-title">Мой профиль</h1>
      
      {message.text && (
        <div style={{ padding: '15px', marginBottom: '20px', borderRadius: '4px', backgroundColor: message.type === 'success' ? '#d4edda' : '#f8d7da', color: message.type === 'success' ? '#155724' : '#721c24' }}>
          {message.text}
        </div>
      )}

      {/* 👈 ОБНОВЛЕННЫЙ БЛОК ПРОФИЛЯ */}
      <div style={{ marginBottom: '30px', padding: '20px', backgroundColor: '#f8f9fa', borderRadius: '8px', border: '1px solid #dee2e6' }}>
        
        {/* Верхняя часть: Аватар и Имя */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '25px', flexWrap: 'wrap' }}>
          <div style={{ width: '100px', height: '100px', borderRadius: '50%', backgroundColor: '#e9ecef', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #dee2e6', flexShrink: 0 }}>
            {avatarUrl ? (
              <img 
                  src={`${API_URL}/api/curl-proxy-image?url=${encodeURIComponent(avatarUrl)}&size=M`} 
                  alt="Аватар" 
                  crossOrigin="anonymous"
                  referrerPolicy="no-referrer"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.parentElement.innerHTML = '<svg ...>'; 
                  }}
              />
            ) : (
              <FaCamera size={40} color="#adb5bd" />
            )}
          </div>
          <div>
            <h2 style={{ margin: '0 0 5px 0', color: '#0d47a1' }}>{user?.name || 'Имя не указано'}</h2>
            <div style={{ color: '#495057', fontSize: '15px', marginBottom: '10px' }}>
              {user?.phone ? `📞 ${user.phone}` : 'Телефон не указан'}
            </div>
            
            <input type="file" id="avatar-upload" accept="image/*" onChange={handleAvatarUpload} style={{ display: 'none' }} disabled={uploadingAvatar} />
            <label htmlFor="avatar-upload" style={{ display: 'inline-block', padding: '8px 16px', backgroundColor: uploadingAvatar ? '#6c757d' : '#007bff', color: 'white', borderRadius: '4px', cursor: uploadingAvatar ? 'not-allowed' : 'pointer', fontSize: '14px' }}>
              {uploadingAvatar ? 'Загрузка...' : 'Изменить фото'}
            </label>
          </div>
        </div>

        {/* Нижняя часть: Детальная информация (Сетка) */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(300px, 1fr))', // Адаптивная сетка
          gap: '15px',
          backgroundColor: 'white',
          padding: isMobile ? '0px' : '15px',
          borderRadius: '6px',
          border: '1px solid #dee2e6'
        }}>
          <div><strong style={{ color: '#6c757d', fontSize: '13px' }}>Email:</strong><br/>{user?.email || '—'}</div>
          <div><strong style={{ color: '#6c757d', fontSize: '13px' }}>Создан:</strong><br/>{formatDate(profileInfo ? profileInfo.created_at : null)}</div>
          <div><strong style={{ color: '#6c757d', fontSize: '13px' }}>Отредактирован:</strong><br/>{formatDate(profileInfo ? profileInfo.updated_at: null)}</div>
          <div><strong style={{ color: '#6c757d', fontSize: '13px' }}>Последний логин:</strong><br/>{formatDate(profileInfo ? profileInfo.last_login_at: null)}</div>
          <div><strong style={{ color: '#6c757d', fontSize: '13px' }}>ID устройства:</strong><br/>
            <span style={{ wordBreak: 'break-all', fontSize: '12px' }}>{profileInfo?.device_id || user?.device_id || '—'}</span>
          </div>
          <div><strong style={{ color: '#6c757d', fontSize: '13px' }}>Подписка до:</strong><br/>{formatDate(profileInfo?.subscription_valid_until)}</div>
          
          {/* Блок с блокировками (показываем, если есть бан) */}
          {user?.banned_until ? (
            <div style={{ gridColumn: '1 / -1', backgroundColor: '#f8d7da', padding: '10px', borderRadius: '4px', color: '#721c24' }}>
              <strong>Заблокирован до:</strong> {formatDate(user.banned_until)}<br/>
              {user.ban_reason_public && <><strong>Причина:</strong> {user.ban_reason_public}</>}
            </div>
          ) : (
            <div style={{ gridColumn: '1 / -1', fontSize: '13px', color: '#28a745', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <FaUserShield /> Аккаунт активен, блокировок нет
            </div>
          )}
        </div>
      </div>

      {/* Вкладки */}
            <div style={{ display: 'flex', borderBottom: '1px solid #dee2e6', marginBottom: '30px', flexWrap: 'wrap', gap: '5px' }}>
        <button style={{ ...tabStyle(activeTab === 'security'), flex: isMobile ? '1 1 100%' : '0 0 auto', justifyContent: 'center' }} onClick={() => setActiveTab('security')}>
          <FaUserShield /> Безопасность
        </button>
        {hasAppointmentsAccess && (
          <button style={{ ...tabStyle(activeTab === 'appointments'), flex: isMobile ? '1 1 100%' : '0 0 auto', justifyContent: 'center' }} onClick={() => setActiveTab('appointments')}>
            <FaBriefcaseMedical /> Настройки приёмов
          </button>
        )}
      </div>

      {/* Вкладка: Безопасность */}
      {activeTab === 'security' && (
        <div style={{ padding: '20px', border: '1px solid #dee2e6', borderRadius: '8px', maxWidth: '500px' }}>
          <h3 style={{ marginTop: 0, borderBottom: '1px solid #eee', paddingBottom: '10px' }}>Смена пароля</h3>
          
          {/* Сообщения об ошибках/успехе */}
          {passError && (
            <div style={{ backgroundColor: '#f8d7da', color: '#721c24', padding: '10px', borderRadius: '4px', marginBottom: '15px', fontSize: '14px' }}>
              ⚠️ {passError}
            </div>
          )}
          {passSuccess && (
            <div style={{ backgroundColor: '#d4edda', color: '#155724', padding: '10px', borderRadius: '4px', marginBottom: '15px', fontSize: '14px' }}>
              {passSuccess}
            </div>
          )}

          <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: 'bold', color: '#0056b3' }}>Текущий пароль</label>
              <div style={{ position: 'relative' }}>
                <input 
                  type={showOld ? 'text' : 'password'} 
                  value={oldPassword} 
                  onChange={e => setOldPassword(e.target.value)}
                  required
                  style={{ width: '100%', boxSizing: 'border-box', padding: '10px', paddingRight: '40px', border: '1px solid #ddd', borderRadius: '4px' }} 
                />
                <button 
                  type="button" 
                  onClick={() => setShowOld(!showOld)}
                  style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#6c757d', display: 'flex', alignItems: 'center' }}
                >
                  {showOld ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: 'bold', color: '#0056b3' }}>Новый пароль</label>
              <div style={{ position: 'relative' }}>
                <input 
                  type={showNew ? 'text' : 'password'} 
                  value={newPassword} 
                  onChange={e => setNewPassword(e.target.value)}
                  required
                  minLength="8"
                  style={{ width: '100%', boxSizing: 'border-box', padding: '10px', paddingRight: '40px', border: '1px solid #ddd', borderRadius: '4px' }} 
                />
                <button 
                  type="button" 
                  onClick={() => setShowNew(!showNew)}
                  style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#6c757d', display: 'flex', alignItems: 'center' }}
                >
                  {showNew ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
              <div style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>Минимум 8 символов</div>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: 'bold', color: '#0056b3' }}>Подтвердите новый пароль</label>
              <div style={{ position: 'relative' }}>
                <input 
                  type={showConfirm ? 'text' : 'password'} 
                  value={confirmPassword} 
                  onChange={e => setConfirmPassword(e.target.value)}
                  required
                  style={{ width: '100%', boxSizing: 'border-box', padding: '10px', paddingRight: '40px', border: '1px solid #ddd', borderRadius: '4px' }} 
                />
                <button 
                  type="button" 
                  onClick={() => setShowConfirm(!showConfirm)}
                  style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#6c757d', display: 'flex', alignItems: 'center' }}
                >
                  {showConfirm ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
            </div>

            <div style={{ marginTop: '10px' }}>
              <button 
                type="submit" 
                style={{ padding: '10px 20px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
              >
                Сохранить новый пароль
              </button>
            </div>

          </form>
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
          <div ref={formRef} style={{ padding: '20px', border: '1px solid #dee2e6', 
                                      borderRadius: '8px', marginBottom: '20px',
                                      scrollMarginTop: '80px' // 👈 Отличный CSS-трюк: оставляет отступ сверху при скролле 
                                    }}>
            <h3 style={{ marginTop: 0 }}>{editingServiceId ? 'Редактирование услуги' : 'Мои услуги'}</h3>
            
            <form onSubmit={handleServiceSubmit} style={{ 
              display: 'flex', 
              gap: '15px', 
              marginBottom: '20px', 
              flexWrap: 'wrap',
              alignItems: 'flex-end'
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

              {/* 👈 БЛОК С КНОПКАМИ МЕНЯЕТСЯ В ЗАВИСИМОСТИ ОТ РЕЖИМА */}
              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="submit" style={{ padding: '9px 16px', backgroundColor: editingServiceId ? '#28a745' : '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', height: '38px' }}>
                  {editingServiceId ? <><FaSave /> Сохранить</> : <><FaPlus /> Добавить</>}
                </button>
                
                {editingServiceId && (
                  <button type="button" onClick={handleCancelEdit} style={{ padding: '9px 16px', backgroundColor: 'transparent', color: '#dc3545', border: '1px solid #dc3545', borderRadius: '4px', cursor: 'pointer', height: '38px' }}>
                    Отмена
                  </button>
                )}
              </div>
            </form>

            {/* ... (список услуг остается без изменений, только кнопка редактирования теперь использует новую функцию) ... */}

            <ul ref={listRef} style={{ listStyle: 'none', padding: 0 }}>
              {services.map(s => (
                                <li key={s.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', borderBottom: '1px solid #eee' }}>
                  <span><strong>{s.name}</strong> ({allSpecs.find(sp => sp.code === s.specialization_code)?.name || s.specialization_code}) — {s.default_duration_minutes} мин. — {s.default_price} руб.</span>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    {s.master_id !== null ? (
                      <>
                        <button onClick={() => handleEditService(s)} style={{ background: 'none', border: 'none', color: '#007bff', cursor: 'pointer' }} title="Редактировать"><FaEdit /></button>
                        <button onClick={() => handleDeleteService(s.id)} style={{ background: 'none', border: 'none', color: '#dc3545', cursor: 'pointer' }} title="Удалить"><FaTrash /></button>
                      </>
                    ) : (
                      <span style={{ fontSize: '11px', color: '#999', fontStyle: 'italic', alignSelf: 'center' }}>Системная</span>
                    )}
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
          <div ref={locationFormRef} style={{ padding: '20px', border: '1px solid #dee2e6', borderRadius: '8px', scrollMarginTop: '80px' }}>
            <h3 style={{ marginTop: 0 }}>{editingLocationId ? 'Редактирование места' : 'Места приёма'}</h3>
            
            <form onSubmit={handleLocationSubmit} style={{ 
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
                <input type="text" placeholder="ул. Ленина, д. 10..." value={newLocation.address} onChange={e => setNewLocation({...newLocation, address: e.target.value})} style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }} />
              </div>

              {/* 👈 НОВОЕ ПОЛЕ: Описание */}
              <div style={{ flex: 1, minWidth: '200px' }}>
                <label style={{ display: 'block', fontSize: '13px', color: '#495057', marginBottom: '5px' }}>Описание (необязательно)</label>
                <input type="text" placeholder="Например: вход со двора" value={newLocation.description} onChange={e => setNewLocation({...newLocation, description: e.target.value})} style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }} />
              </div>

              <div style={{ width: '130px' }}>
                <label style={{ display: 'block', fontSize: '13px', color: '#495057', marginBottom: '5px' }}>Время "до" (мин)</label>
                <input type="number" placeholder="0" value={newLocation.buffer_before_minutes} onChange={e => setNewLocation({...newLocation, buffer_before_minutes: e.target.value})} style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }} />
              </div>

              <div style={{ width: '130px' }}>
                <label style={{ display: 'block', fontSize: '13px', color: '#495057', marginBottom: '5px' }}>Время "после" (мин)</label>
                <input type="number" placeholder="0" value={newLocation.buffer_after_minutes} onChange={e => setNewLocation({...newLocation, buffer_after_minutes: e.target.value})} style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }} />
              </div>

              {/* 👈 БЛОК С КНОПКАМИ */}
              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="submit" style={{ padding: '9px 16px', backgroundColor: editingLocationId ? '#28a745' : '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', height: '38px' }}>
                  {editingLocationId ? <><FaSave /> Сохранить</> : <><FaPlus /> Добавить</>}
                </button>
                
                {editingLocationId && (
                  <button type="button" onClick={handleCancelLocationEdit} style={{ padding: '9px 16px', backgroundColor: 'transparent', color: '#dc3545', border: '1px solid #dc3545', borderRadius: '4px', cursor: 'pointer', height: '38px' }}>
                    Отмена
                  </button>
                )}
              </div>
            </form>

            <ul ref={locationListRef} style={{ listStyle: 'none', padding: 0 }}>
              {locations.map(l => (
                                <li key={l.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', borderBottom: '1px solid #eee' }}>
                  <span><strong>{l.name}</strong> — {l.address || 'без адреса'} (до: {l.buffer_before_minutes} мин, после: {l.buffer_after_minutes} мин)</span>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    {l.master_id !== null ? (
                      <>
                        <button onClick={() => handleEditLocation(l)} style={{ background: 'none', border: 'none', color: '#007bff', cursor: 'pointer' }} title="Редактировать"><FaEdit /></button>
                        <button onClick={() => handleDeleteLocation(l.id)} style={{ background: 'none', border: 'none', color: '#dc3545', cursor: 'pointer' }} title="Удалить"><FaTrash /></button>
                      </>
                    ) : (
                      <span style={{ fontSize: '11px', color: '#999', fontStyle: 'italic', alignSelf: 'center' }}>Системное</span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
            
            {/* Поясняющий текст (без изменений) */}
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