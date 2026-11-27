// src/SettingsProfilePage.js
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from './context/AuthContext';
import { FaUserShield, FaBriefcaseMedical, FaCamera, FaEdit, FaTrash, FaPlus, FaEye, FaEyeSlash, FaSave, FaBell } from 'react-icons/fa';

import { formatPhone } from './utils/formatPhone';
import API_URL from './config/api';
import { LEAD_MINUTES_OPTIONS, getLeadLabel, MODAL_LABELS, MODAL_LABELS_VISITOR } from './utils/appLogic';

export default function SettingsProfilePage() {  
  const { user, checkAuth } = useAuth();
  
  // 👈 Проверяем доступ к приёмам (admin_content сюда НЕ входит)
  const hasAppointmentsAccess = user?.roles?.some(r => 
    ['admin', 'appointments'].includes(r)
  );

  const [activeTab, setActiveTab] = useState('security');

  // --- Состояние для Аватара ---
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url || '');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  //  --- состояние для режима редактирования имени
  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState(user?.name || '');
  
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

// --- Уведомления: MAX ---
  const [maxCode, setMaxCode] = useState(null);          // { code, expires_at } или null
  const [maxCodeLoading, setMaxCodeLoading] = useState(false);
  const [maxCopied, setMaxCopied] = useState(false);

// 👈 Состояния для настроек напоминаний
  const [leadMinutes, setLeadMinutes] = useState([60]);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState('');

  useEffect(() => {
    if (activeTab === 'appointments' && hasAppointmentsAccess) {
      fetchAppointmentData();
    }
  }, [activeTab, hasAppointmentsAccess]);

    useEffect(() => {
    // Загружаем детальную инфу о профиле (и настройки для уведомлений)
    const fetchProfileData = async () => {
      try {
        const res = await fetch(`${API_URL}/api/profile/me`, { credentials: 'include' });
        const data = await res.json();
        
        if (data.success) {
          setProfileInfo(data.data); // Для общего профиля
          
          // 👈 Если мы на вкладке уведомлений, обновляем и чекбоксы
          if (activeTab === 'notifications' && data.data.notification_lead_minutes_default) {
            setLeadMinutes(data.data.notification_lead_minutes_default);
          }
        }
      } catch (err) {
        console.error('Ошибка загрузки профиля:', err);
      }
    };
    
    fetchProfileData();
  }, [activeTab]); // 👈 Следим за сменой вкладки

  const isMobile = window.innerWidth <= 768;  
  const isVisitorMode = user?.isVisitorMode || false;
  const labels = isVisitorMode ? MODAL_LABELS_VISITOR : MODAL_LABELS;

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

 // --- Имя ---
  const handleSaveName = async () => {
    if (!newName.trim()) return;
    try {
      const res = await fetch(`${API_URL}/api/profile/name`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name: newName })
      });
      const data = await res.json();
      if (data.success) {
        setIsEditingName(false);
        setMessage({ type: 'success', text: '✅ Имя успешно изменено' });
        // 👈 Перезагружаем страницу (или обновляем контекст), чтобы имя обновилось везде
        window.location.reload(); 
      } else {
        alert('Ошибка: ' + data.error);
      }
    } catch (err) {
      alert('Ошибка сети: ' + err.message);
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
      
      // 👈 Обновляем контекст (пользователя), чтобы пересчитался isVisitorMode
      if (checkAuth) {
        await checkAuth();
      }
      
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
        setNewLocation({ name: '', address: '', description: '', 
                        buffer_before_minutes: 0, buffer_after_minutes: 0 });
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
    setNewLocation({ name: '', address: '', description: '', description: '', buffer_before_minutes: 0, buffer_after_minutes: 0 });
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

  // --- Уведомления: генерация кода привязки MAX ---
  const handleGenerateMaxCode = async () => {
    setMaxCodeLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/profile/max/generate-code`, { method: 'POST', credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        setMaxCode(data.data);   // { code: 'K7F29QMD' }
        setMaxCopied(false);
      } else {
        alert('Ошибка: ' + data.error);
      }
    } catch (err) {
      alert('Ошибка сети: ' + err.message);
    } finally {
      setMaxCodeLoading(false);
    }
  };

  // --- Уведомления: отвязать MAX ---
  const handleUnlinkMax = async () => {
    if (!window.confirm('Отвязать аккаунт MAX? Напоминания перестанут приходить.')) return;
    try {
      const res = await fetch(`${API_URL}/api/auth/profile/max/unlink`, { method: 'PUT', credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        setProfileInfo({ ...profileInfo, max_user_id: null });
        setMaxCode(null);
      } else {
        alert('Ошибка: ' + data.error);
      }
    } catch (err) {
      alert('Ошибка сети: ' + err.message);
    }
  };

  // --- Уведомления: копировать команду для MAX ---
  const handleCopyMaxCommand = async () => {
    const cmd = `/start ${maxCode.code}`;
    try {
      await navigator.clipboard.writeText(cmd);
      setMaxCopied(true);
    } catch {
      // Фолбэк для старых браузеров
      const ta = document.createElement('textarea');
      ta.value = cmd;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setMaxCopied(true);
    }
  };

  // --- Уведомления: удалить push-подписку браузера ---
  const handleDeletePush = async (subId) => {
    if (!window.confirm('Удалить эту подписку на пуш-уведомления?')) return;
    try {
      const res = await fetch(`${API_URL}/api/auth/profile/push/${subId}`, { method: 'DELETE', credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        setProfileInfo({
          ...profileInfo,
          appt_push_subscriptions: profileInfo.appt_push_subscriptions.filter(s => s.id !== subId)
        });
      } else {
        alert('Ошибка: ' + data.error);
      }
    } catch (err) {
      alert('Ошибка сети: ' + err.message);
    }
  };

  // --- Уведомления: человекочитаемое имя браузера из user_agent ---
  const browserLabel = (ua) => {
    if (!ua) return 'Браузер';
    if (/YaBrowser/.test(ua)) return 'Яндекс Браузер';
    if (/Edg\//.test(ua)) return 'Edge';
    if (/OPR\//.test(ua)) return 'Opera';
    if (/Firefox/.test(ua)) return 'Firefox';
    if (/Chrome/.test(ua)) return 'Chrome';
    if (/Safari/.test(ua)) return 'Safari';
    return ua.substring(0, 30);
  };

  // Функция сохранения настроек
  const handleSaveReminders = async () => {
    setSavingSettings(true);
    setSettingsMessage('');
    try {
      const res = await fetch(`${API_URL}/api/profile/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ 
          notification_lead_minutes: leadMinutes.join(',') 
        })
      });
      const data = await res.json();
      if (data.success) {
        setSettingsMessage('✅ Настройки сохранены');
        setTimeout(() => setSettingsMessage(''), 3000);
      } else {
        setSettingsMessage('❌ Ошибка: ' + data.error);
      }
    } catch (err) {
      setSettingsMessage('❌ Ошибка сети: ' + err.message);
    } finally {
      setSavingSettings(false);
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

   // --- Определяем текущую подписку (этот браузер/устройство) ---
  const currentEndpoint = profileInfo?.id
    ? localStorage.getItem(`larchik_push_endpoint_${profileInfo.id}`)
    : null;

  const isCurrentSub = (sub) => {
    if (sub.endpoint && currentEndpoint && sub.endpoint === currentEndpoint) return true;
    // Фолбэк: сравниваем по user_agent (неточно, но лучше, чем ничего)
    return !sub.endpoint && sub.user_agent && navigator.userAgent.includes(sub.user_agent.slice(0, 20));
  };
  
  // --- Определяем ОС из user_agent ---
const getOS = (ua) => {
  if (!ua) return '';
  
  // Сначала проверяем мобильные ОС (они часто содержат в себе слова десктопных движков)
  if (/Android/i.test(ua) && !/Mobile/i.test(ua)) { 
     // Тут хитрость: если это не мобильное устройство, но слово Android есть (редко, но бывает в эмуляторах)
     // Но обычно для веба на ПК Android не пишут. 
     // Если у вас в логах реально UA с ПК содержит слово Android — это очень странно.
  }

  // Приоритет: iOS/iPadOS
  if (/iPad|iPhone|iPod/i.test(ua)) return 'iOS';
  
  // Приоритет: Android (мобильный)
  if (/Android/i.test(ua)) return 'Android';

  // Приоритет: Windows (ищем специфичную сигнатуру)
  if (/Windows NT/i.test(ua)) return 'Windows';

  // Приоритет: macOS
  if (/Mac OS X/i.test(ua)) return 'macOS';

  // Приоритет: Linux
  if (/Linux/i.test(ua)) return 'Linux';

  return 'Неизвестно';
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
        <div style={{ 
          display: 'flex', 
          flexDirection: isMobile ? 'row' : 'row', // 👈 Оставляем в строку даже на мобилке
          alignItems: 'center', 
          gap: isMobile ? '10px' : '20px',         // 👈 Уменьшаем отступ на мобилке
          marginBottom: '25px', 
          flexWrap: 'nowrap'                       // 👈 Запрещаем перенос на новую строку
        }}>
          <div style={{ 
            width: isMobile ? '110px' : '120px',    // 👈 Уменьшаем аватар на мобилке
            height: isMobile ? '110px' : '120px', 
            borderRadius: '50%', backgroundColor: '#e9ecef', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #dee2e6', flexShrink: 0 
          }}>
            {avatarUrl ? (
              <img src={`${API_URL}/api/curl-proxy-image?url=${encodeURIComponent(avatarUrl)}&size=M`} alt="Аватар" crossOrigin="anonymous" referrerPolicy="no-referrer" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { e.target.style.display = 'none'; e.target.parentElement.innerHTML = '<svg ...>'; }} />
            ) : (
              <FaCamera size={isMobile ? 24 : 40} color="#adb5bd" />
            )}
          </div>
          
          <div style={{ 
            flex: 1, 
            minWidth: 0, 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'flex-start' // 👈 Прижимаем всё содержимое влево
          }}> 
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '5px', flexWrap: 'wrap' }}>
              {isEditingName ? (
                <>
                  <input 
                    type="text" 
                    value={newName} 
                    onChange={(e) => setNewName(e.target.value)} 
                    autoFocus
                    style={{ fontSize: isMobile ? '16px' : '18px', fontWeight: 'bold', padding: '4px 8px', border: '1px solid #007bff', borderRadius: '4px', width: '100%', maxWidth: '200px' }}
                  />
                  <button onClick={handleSaveName} style={{ padding: '4px 8px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>✓</button>
                  <button onClick={() => { setIsEditingName(false); setNewName(user?.name || ''); }} style={{ padding: '4px 8px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>✕</button>
                </>
              ) : (
                <>
                  <h2 style={{ margin: 0, color: '#0d47a1', fontSize: isMobile ? '18px' : '24px', wordBreak: 'break-word' }}>{user?.name || 'Имя не указано'}</h2>
                  <button onClick={() => setIsEditingName(true)} title="Изменить имя" style={{ background: 'none', border: 'none', color: '#007bff', cursor: 'pointer', fontSize: '16px', padding: '0 5px' }}>
                    <FaEdit />
                  </button>
                </>
              )}
            </div>
            
            <div style={{ color: '#495057', fontSize: isMobile ? '13px' : '15px', marginBottom: '8px' }}>
              {user?.phone ? `📞 ${formatPhone(user.phone)}` : 'Телефон не указан'}
            </div>
            
            <input type="file" id="avatar-upload" accept="image/*" onChange={handleAvatarUpload} style={{ display: 'none' }} disabled={uploadingAvatar} />
            <label htmlFor="avatar-upload" style={{ display: 'inline-block', padding: isMobile ? '6px 10px' : '8px 16px', backgroundColor: uploadingAvatar ? '#6c757d' : '#007bff', color: 'white', borderRadius: '4px', cursor: uploadingAvatar ? 'not-allowed' : 'pointer', fontSize: isMobile ? '12px' : '14px' }}>
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
          <>
          <button style={{ ...tabStyle(activeTab === 'appointments'), flex: isMobile ? '1 1 100%' : '0 0 auto', justifyContent: 'center' }} onClick={() => setActiveTab('appointments')}>
            <FaBriefcaseMedical /> Настройки {labels.setCard} {/* приёмов */}
          </button>
          <button style={{ ...tabStyle(activeTab === 'notifications'), flex: isMobile ? '1 1 100%' : '0 0 auto', justifyContent: 'center' }} onClick={() => setActiveTab('notifications')}>
            <FaBell /> Уведомления
          </button>
          </>          
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
                            {allSpecs.map(spec => {
                const isVisitor = spec.code === 'visitor'; // 👈 Проверяем, системная ли это специализация
                const isChecked = isVisitor ? true : selectedSpecs.includes(spec.code); // 👈 Для visitor всегда true

                return (
                  <label 
                    key={spec.code} 
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      cursor: isVisitor ? 'not-allowed' : 'pointer', // 👈 Запрещаем клик для visitor
                      opacity: isVisitor ? 0.7 : 1 
                    }}
                  >
                    <input 
                      type="checkbox" 
                      checked={isChecked} 
                      onChange={() => {
                        if (!isVisitor) handleSpecChange(spec.code); // 👈 Блокируем изменение
                      }} 
                      disabled={isVisitor} // 👈 Отключаем сам инпут
                      style={{ marginRight: '8px' }} 
                    />
                    {spec.name} {isVisitor && <span style={{ fontSize: '11px', color: '#999', marginLeft: '5px' }}>(Системная)</span>}
                  </label>
                );
              })}
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
            <h3 style={{ marginTop: 0 }}>{editingLocationId ? 'Редактирование места' : `Места ${labels.goToCard}`}</h3>  {/* 'Места приёма' */}
            
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

                            {/* 👈 Описание (на ПК всегда на новой строке) */}
              <div style={{ flex: isMobile ? 1 : '1 1 100%', minWidth: '200px' }}>
                <label style={{ display: 'block', fontSize: '13px', color: '#495057', marginBottom: '5px' }}>Описание (необязательно)</label>
                <textarea 
                  placeholder="Например: вход со двора" 
                  value={newLocation.description || ''} 
                  onChange={e => setNewLocation({...newLocation, description: e.target.value})} 
                  style={{ 
                    width: '100%', 
                    padding: '8px', 
                    border: '1px solid #ddd', 
                    borderRadius: '4px', 
                    minHeight: '60px', // 👈 Сделаем чуть выше, чтобы было видно, что это textarea
                    resize: 'vertical' 
                  }} 
                />
              </div>

              {/* 👈 Блок с двумя инпутами */}
              <div style={{ display: 'flex', gap: '10px', width: '100%', maxWidth: '280px', marginBottom: '15px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '13px', color: '#495057', marginBottom: '5px' }}>Время "до" (мин)</label>
                  <input type="number" placeholder="0" value={newLocation.buffer_before_minutes} onChange={e => setNewLocation({...newLocation, buffer_before_minutes: e.target.value})} style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px', boxSizing: 'border-box' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '13px', color: '#495057', marginBottom: '5px' }}>Время "после" (мин)</label>
                  <input type="number" placeholder="0" value={newLocation.buffer_after_minutes} onChange={e => setNewLocation({...newLocation, buffer_after_minutes: e.target.value})} style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px', boxSizing: 'border-box' }} />
                </div>
              </div>

              {/* 👈 Блок с кнопками */}
              <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
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
              💡 <strong>Время «до» и «после»</strong> — это требуемое дополнительное время, например, на дорогу или на подготовку перед {labels.before} и после него. 
              Вместе с длительностью услуги оно занимает место в сетке календаря. Это важно для точности планирования ваших записей и предотвращения накладок.
            </div>
          </div>
        </div>
      )}

      {/* Вкладка: Уведомления */}
      {activeTab === 'notifications' && (
        <div style={{ padding: '20px', border: '1px solid #dee2e6', borderRadius: '8px', maxWidth: isMobile ? '500px' : '700px' }}>
          
          {/* 👈 Блок настроек напоминаний */}
          <div style={{ padding: '20px', border: '1px solid #dee2e6', borderRadius: '8px', marginBottom: '20px', marginTop: '20px' }}>
            <h3 style={{ marginTop: 0 }}>Напоминания о {labels.aboutevents}</h3>  {/* о приёмах */}
            <p style={{ fontSize: '14px', color: '#666' }}>
              По умолчанию эти напоминания будут применяться ко всем вашим {labels.toevents}. В конкретном {labels.ofevents} вы сможете изменить их.
            </p>
            
            {settingsMessage && (
              <div style={{ marginBottom: '10px', color: settingsMessage.includes('✅') ? '#28a745' : '#dc3545' }}>
                {settingsMessage}
              </div>
            )}

            <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', marginBottom: '20px' }}>
              {LEAD_MINUTES_OPTIONS.map(min => {
                const isChecked = leadMinutes.includes(min);             
                
                return (
                  <label key={min} style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
                    <input 
                      type="checkbox" 
                      checked={isChecked}
                      onChange={() => {
                        setLeadMinutes(prev => 
                          isChecked ? prev.filter(m => m !== min) : [...prev, min]
                        );
                      }}
                    />
                    {getLeadLabel(min)}
                  </label>
                );
              })}
            </div>

            <button 
              onClick={handleSaveReminders} 
              disabled={savingSettings}
              style={{ padding: '8px 16px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: savingSettings ? 'not-allowed' : 'pointer' }}
            >
              {savingSettings ? 'Сохранение...' : 'Сохранить настройки'}
            </button>
          </div>

          {/* 1. WebPush (FCM) */}
          <h3 style={{ marginTop: 0, borderBottom: '1px solid #eee', paddingBottom: '10px' }}>🔔 Браузерные пуш-уведомления</h3>
          {profileInfo?.appt_push_subscriptions?.length > 0 ? (
            <>
              {profileInfo.appt_push_subscriptions.map(sub => (
                <div key={sub.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 0', borderBottom: '1px solid #f0f0f0', fontSize: '13px', backgroundColor: isCurrentSub(sub) ? '#e7f1ff' : 'transparent', borderRadius: '4px' }}>
                  <span style={{ flex: 1 }}>
                    <b>{browserLabel(sub.user_agent)}</b>
                    {isCurrentSub(sub) && (
                      <span style={{ marginLeft: '8px', fontSize: '11px', color: '#0056b3', backgroundColor: '#d0e4ff', padding: '2px 8px', borderRadius: '10px' }}>
                        это устройство
                      </span>
                    )}
                    <div style={{ fontSize: '11px', color: '#6c757d' }}>
                      {getOS(sub.user_agent) && `${getOS(sub.user_agent)} · `}
                      с {new Date(sub.created_at).toLocaleDateString('ru-RU')}
                      {sub.last_confirmed_at && (
                        ` · активна ${new Date(sub.last_confirmed_at).toLocaleString('ru-RU', {
                          day: '2-digit', month: '2-digit', year: 'numeric',
                          hour: '2-digit', minute: '2-digit'
                        })}`
                      )}
                      {sub.ip_address && ` · IP ${sub.ip_address}`}
                    </div>
                  </span>
                  <button onClick={() => handleDeletePush(sub.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: isCurrentSub(sub) ? '#dc3545' : '#6c757d' }} title={isCurrentSub(sub) ? 'Удалить подписку этого устройства' : 'Удалить подписку'}>
                    <FaTrash />
                  </button>
                </div>
              ))}
              <div style={{ fontSize: '11px', color: '#666', marginTop: '8px' }}>
                Показаны все устройства, когда-либо включавшие пуши. Недействительные (отписавшиеся) — можно удалить, либо они отсеются автоматически при первой неудачной отправке.
              </div>
            </>
          ) : (
            <div style={{ fontSize: '13px', color: '#666' }}>
              Пуш-уведомления ещё не включены. Включить их можно в календаре приёмов (при первом открытии сайт предложит разрешить уведомления и нужно дать на это согласие).
            </div>
          )}

          {/* 2. Telegram */}
          <h3 style={{ marginTop: '25px', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>✈️ Telegram</h3>
          <div style={{ fontSize: '13px', color: '#888', fontStyle: 'italic' }}>
            В разработке. Скоро напоминания можно будет получать и в Telegram.
          </div>

          {/* 3. MAX */}
          <h3 style={{ marginTop: '25px', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>💬 MAX</h3>
          {profileInfo?.max_user_id ? (
            <div style={{
              padding: '12px',
              backgroundColor: '#d4edda',
              color: '#155724',
              borderRadius: '6px',
              marginBottom: '10px',
              fontSize: '13px'
            }}>
              ✅ Аккаунт привязан
              {profileInfo.max_linked_at && (
                ` (${new Date(profileInfo.max_linked_at).toLocaleDateString('ru-RU')} в ${new Date(profileInfo.max_linked_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })})`
              )}
              {' '}— напоминания о {labels.aboutevents} приходят в ваш MAX{' '}
              ({profileInfo.max_display_name || `id: ${profileInfo.max_user_id}`})
              <div style={{ marginTop: '10px' }}>
                <button onClick={handleUnlinkMax} style={{ padding: '6px 12px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>
                  Отвязать
                </button>
              </div>
            </div>
          ) : maxCode ? (
            <div>
              <div style={{ fontSize: '13px', color: '#212529', marginBottom: '10px' }}>
                Скопируйте команду и отправьте её в чат с ботом{' '}
                <a href="https://max.ru/id7716865664_bot" target="_blank" rel="noopener noreferrer" style={{ color: '#007bff', fontWeight: 'bold' }}>
                  «Ларчик напоминает»
                </a>{' '}
                в MAX :
              </div>
              <div style={{ backgroundColor: '#eef2f5', padding: '12px', borderRadius: '6px', border: '1px dashed #adb5bd', textAlign: 'center' }}>
                <code style={{ fontSize: '16px', fontWeight: 'bold', color: '#d63384' }}>/start {maxCode.code}</code>
              </div>
              <div style={{ fontSize: '11px', color: '#666', marginTop: '6px' }}>
                Код действует 10 минут. После отправки команды обновите страницу.
              </div>
              <div style={{ marginTop: '10px', display: 'flex', gap: '8px' }}>
                <button onClick={handleCopyMaxCommand} style={{ padding: '8px 16px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}>
                  {maxCopied ? '✅ Скопировано' : 'Копировать команду'}
                </button>
                <button onClick={() => setMaxCode(null)} style={{ padding: '8px 16px', background: 'none', border: '1px solid #ccc', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' }}>
                  Отмена
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div style={{ fontSize: '13px', color: '#666', marginBottom: '10px' }}>
                Привяжите бота — и напоминания о {labels.aboutevents} будут приходить в MAX за указанное время до подготовки.
              </div>
              <button onClick={handleGenerateMaxCode} disabled={maxCodeLoading} style={{ padding: '10px 20px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                {maxCodeLoading ? 'Генерируем…' : 'Привязать MAX'}
              </button>
            </div>
          )}

          {/* 4. InApp */}
          <h3 style={{ marginTop: '25px', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>📱 В приложении (InApp)</h3>
          <div style={{ fontSize: '13px', color: '#495057' }}>
            Всплывающие напоминания внутри самого Ларчика, пока он открыт. Не зависят от внешних сервисов.
          </div>
          <div style={{ fontSize: '13px', color: '#888', fontStyle: 'italic', marginTop: '6px' }}>
            В разработке.
          </div>

        </div>
      )}


    </div>
  );
}