// src/appointments/SchedulePage.js
import React, { useState, useEffect, useRef } from 'react';
import { FaUser, FaMapMarkerAlt, FaStickyNote, FaTrash, FaTimes, FaSave, FaFileAlt, FaPlus, FaEdit } from 'react-icons/fa';
import API_URL from '../config/api';
import { formatPhoneInput, formatPhone } from '../utils/formatPhone';
import ButtonWithTooltip from '../components/ButtonWithTooltip';

// Компонент поиска клиента
function ClientSearch({ clients, value, onChange, onAddNew }) {
  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const selectedClient = clients.find(c => c.id === value);

  const filtered = clients.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    (c.phone && c.phone.includes(search))
  );

  const handleSelect = (client) => {
    onChange(client.id);
    setSearch('');
    setIsOpen(false);
  };

  return (
    <div style={{ position: 'relative', width: '100%', boxSizing: 'border-box' }}>
      <input 
        type="text"
        placeholder={selectedClient ? selectedClient.name : "Поиск по имени..."}
        value={isOpen ? search : (selectedClient ? selectedClient.name : '')}
        onChange={e => {
          setSearch(e.target.value);
          setIsOpen(true);
          if (e.target.value === '') onChange('');
        }}
        onFocus={() => setIsOpen(true)}
        onBlur={() => setTimeout(() => setIsOpen(false), 200)}
        style={{ width: '100%', boxSizing: 'border-box', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
      />
      {isOpen && (
        <div style={{ 
          position: 'absolute', top: '100%', left: 0, right: 0, 
          backgroundColor: 'white', border: '1px solid #ddd', borderRadius: '4px', 
          maxHeight: '150px', overflowY: 'auto', zIndex: 100, boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
          display: 'flex', flexDirection: 'column'
        }}>
          {filtered.length === 0 ? (
            <div style={{ padding: '8px', color: '#999', fontSize: '12px' }}>Не найдено</div>
          ) : (
            filtered.map(c => (
              <div 
                key={c.id} 
                onClick={() => handleSelect(c)}
                style={{ padding: '8px', cursor: 'pointer', borderBottom: '1px solid #eee', fontSize: '13px' }}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#f0f0f0'}
                onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
              >
                {c.name} <span style={{color: '#999', fontSize: '11px'}}>{formatPhone(c.phone)}</span>
              </div>
            ))
          )}
          
          {/* 👈 Кнопка добавления нового клиента */}
          {onAddNew && (
            <div 
              onClick={() => {
                onAddNew(search); // Передаем введенный текст как начальное имя
                setIsOpen(false);
                setSearch('');
              }}
              style={{ 
                padding: '10px 8px', 
                cursor: 'pointer', 
                backgroundColor: '#e3f2fd', 
                color: '#007bff', 
                fontSize: '13px', 
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                borderTop: '1px solid #eee'
              }}
              onMouseEnter={(e) => e.target.style.backgroundColor = '#d0e8ff'}
              onMouseLeave={(e) => e.target.style.backgroundColor = '#e3f2fd'}
            >
              <FaPlus /> Добавить {search ? `"${search}"` : 'нового клиента'}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function SchedulePage() {
  const [selectedDate, setSelectedDate] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const d = params.get('date');
    return d || new Date().toISOString().split('T')[0];
  });
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  const [clients, setClients] = useState([]);
  const [services, setServices] = useState([]);
  const [locations, setLocations] = useState([]);

// Состояние для быстрого добавления клиента из расписания
  const [quickClientModal, setQuickClientModal] = useState({ isOpen: false, initialName: '' });
  const [quickClientData, setQuickClientData] = useState({ name: '', phone: '+79', address: '' });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAppt, setSelectedAppt] = useState(null);
  
  // Состояние для формы редактирования
  const [editApptData, setEditApptData] = useState({ 
    client_id: '', 
    service_id: '', 
    location_id: '', 
    date: '', 
    time: '', 
    duration_minutes: '', 
    buffer_before_minutes: '', 
    buffer_after_minutes: '', 
    final_price: 0, 
    status: 'scheduled', 
    general_notes: '',
    record_notes: ''  
  });

  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const gridRef = useRef(null);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const [newAppt, setNewAppt] = useState({
    time: '10:00', client_id: '', service_id: '', location_id: '', notes: '', general_notes: '',
    buffer_before_minutes: '', buffer_after_minutes: '', duration_minutes: ''
  });
  
  const [selectedService, setSelectedService] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [error, setError] = useState('');

  const START_HOUR = 6;
  const END_HOUR = 23;
  const SLOT_HEIGHT = 50;
  const PX_PER_MINUTE = SLOT_HEIGHT / 30;

  const timeSlots = [];
  for (let h = START_HOUR; h <= END_HOUR; h++) {
    timeSlots.push(`${h.toString().padStart(2, '0')}:00`);
    if (h < END_HOUR) {
      timeSlots.push(`${h.toString().padStart(2, '0')}:30`);
    }
  }

  useEffect(() => {
    fetchData();
  }, [selectedDate]);

  // 👈 ОБРАБОТКА ДУБЛИРОВАНИЯ ИЗ URL
  useEffect(() => {
    if (loading || !appointments) return;

    const params = new URLSearchParams(window.location.search);
    const action = params.get('action');

    if (action === 'duplicate') {
      // Заполняем форму создания данными из URL
      setNewAppt({
        time: params.get('time') || '10:00',
        client_id: params.get('client_id') || '',
        service_id: params.get('service_id') || '',
        location_id: params.get('location_id') || '',
        notes: params.get('record_notes') || '',
        general_notes: '',
        buffer_before_minutes: params.get('buffer_before') || '',
        buffer_after_minutes: params.get('buffer_after') || '',
        duration_minutes: params.get('duration') || ''
      });

      // Устанавливаем дату для сетки (если нужно, чтобы сетка переключилась на эту дату)
      const targetDate = params.get('date');
      if (targetDate && targetDate !== selectedDate) {
        setSelectedDate(targetDate);
      }

      // Открываем модалку создания
      setIsModalOpen(true);

      // Очищаем URL, чтобы при обновлении страницы модалка не открывалась снова
      window.history.replaceState({}, document.title, window.location.pathname + `?date=${targetDate}`);
    }
  }, [loading, appointments, selectedDate]);


  // 👈 ДОБАВЛЯЕМ useEffect ДЛЯ ОТКРЫТИЯ ПРИЁМА ИЗ URL
  useEffect(() => {
    if (loading || appointments.length === 0) return;

    const params = new URLSearchParams(window.location.search);
    const openApptId = params.get('openApptId');
    
    if (openApptId) {
      const apptToOpen = appointments.find(a => a.id === openApptId);
      if (apptToOpen) {
        setSelectedAppt(apptToOpen);
        
        // Заполняем форму редактирования (тот же код, что и при клике на карточку)
        const d = new Date(apptToOpen.appointment_date);
        const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        const timeStr = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
        
        setEditApptData({ 
          client_id: apptToOpen.client_id || '',
          service_id: apptToOpen.service_id || '',
          location_id: apptToOpen.location_id || '',
          date: dateStr,
          time: timeStr,
          duration_minutes: apptToOpen.duration_minutes || 60,
          buffer_before_minutes: apptToOpen.buffer_before_minutes || 0,
          buffer_after_minutes: apptToOpen.buffer_after_minutes || 0,
          final_price: apptToOpen.final_price || 0,
          status: apptToOpen.status || 'scheduled',
          general_notes: apptToOpen.general_notes || '',
          record_notes: apptToOpen.record_notes || ''
        });

        // Очищаем URL, чтобы при обновлении страницы модалка не открывалась снова
        window.history.replaceState({}, document.title, window.location.pathname + `?date=${selectedDate}`);
      }
    }
  }, [appointments, loading, selectedDate]); // 👈 Зависимости

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(''); // 👈 Сбрасываем старую ошибку при новом запросе
      
      const [apptRes, cliRes, servRes, locRes] = await Promise.all([
        fetch(`${API_URL}/api/appt/schedule?date=${selectedDate}`, { credentials: 'include' }),
        fetch(`${API_URL}/api/appt/clients`, { credentials: 'include' }),
        fetch(`${API_URL}/api/appt/services`, { credentials: 'include' }),
        fetch(`${API_URL}/api/appt/locations`, { credentials: 'include' })
      ]);

      // 👈 ПРОВЕРЯЕМ СТАТУС ГЛАВНОГО ЗАПРОСА
      if (!apptRes.ok) {
        if (apptRes.status === 401 || apptRes.status === 403) {
          throw new Error('Ошибка авторизации. Вы не вошли в систему или сессия истекла. Пожалуйста, войдите заново.');
        }
        throw new Error(`Ошибка сервера: ${apptRes.status}`);
      }

      const apptData = await apptRes.json();
      const cliData = await cliRes.json();
      const servData = await servRes.json();
      const locData = await locRes.json();

      if (apptData.success) {
        setAppointments(apptData.data);

        // 👈 ЛОГИКА АВТООТКРЫТИЯ МОДАЛКИ (оставляем без изменений)
        const params = new URLSearchParams(window.location.search);
        const openApptId = params.get('openApptId');
        
        if (openApptId) {
          const apptToOpen = apptData.data.find(a => a.id === openApptId);
          if (apptToOpen) {
            setSelectedAppt(apptToOpen);
            
            const d = new Date(apptToOpen.appointment_date);
            const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            const timeStr = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
            
            setEditApptData({ 
              client_id: apptToOpen.client_id || '',
              service_id: apptToOpen.service_id || '',
              location_id: apptToOpen.location_id || '',
              date: dateStr,
              time: timeStr,
              duration_minutes: apptToOpen.duration_minutes || 60,
              buffer_before_minutes: apptToOpen.buffer_before_minutes || 0,
              buffer_after_minutes: apptToOpen.buffer_after_minutes || 0,
              final_price: apptToOpen.final_price || 0,
              status: apptToOpen.status || 'scheduled',
              general_notes: apptToOpen.general_notes || '',
              record_notes: apptToOpen.record_notes || ''
            });

            window.history.replaceState({}, document.title, window.location.pathname + `?date=${selectedDate}`);
          }
        }
      } else {
        throw new Error(apptData.error || 'Ошибка загрузки расписания');
      }
      
      if (cliData.success) setClients(cliData.data);
      if (servData.success) setServices(servData.data);
      if (locData.success) setLocations(locData.data);
    } catch (err) {
      console.error(err);
      setError(err.message); // 👈 Сохраняем ошибку для вывода
    } finally {
      setLoading(false);
    }
  };

    useEffect(() => {
    if (loading || !gridRef.current) return;
    
    let topPx = 0;

    if (appointments.length > 0) {
        // Если есть записи — скроллим на 30 мин до первой
        const first = appointments[0];
        const d = new Date(first.appointment_date);
        const startMin = d.getHours() * 60 + d.getMinutes();
        topPx = Math.max(0, (startMin - START_HOUR * 60 - 30) * PX_PER_MINUTE);
    } else {
        // Если записей нет — скроллим на 10:00
        topPx = (10 * 60 - START_HOUR * 60) * PX_PER_MINUTE;
    }
    
    const containerTop = gridRef.current.getBoundingClientRect().top + window.scrollY;
    const stickyHeaderHeight = 80; // оставь своё значение, которое подобрал
    
    window.scrollTo({ 
        top: containerTop + topPx - stickyHeaderHeight, 
        behavior: 'smooth' 
    });
    }, [appointments, loading]);

  const handleSlotClick = (time) => {
    setNewAppt({ 
      time, client_id: '', service_id: '', location_id: '', notes: '',
      general_notes: '', // 👈 Обязательно очищаем
      buffer_before_minutes: '', buffer_after_minutes: '', duration_minutes: ''
    });
    setSelectedService(null);
    setSelectedLocation(null);
    setError('');
    setIsModalOpen(true);
  };

    // Функция добавления адреса клиента в примечание
  const appendClientAddress = (isEditMode) => {
    // Ищем выбранного клиента в списке clients (по ID из формы)
    const currentClientId = isEditMode ? editApptData.client_id : newAppt.client_id;
    const client = clients.find(c => c.id === currentClientId);
    
    if (client && client.address) {
      // Берем текущее примечание
      const currentNotes = isEditMode ? editApptData.record_notes : newAppt.notes;
      const newNotes = currentNotes ? `${currentNotes}\n${client.address}` : client.address;
      
      // Обновляем состояние
      if (isEditMode) {
        setEditApptData({ ...editApptData, record_notes: newNotes });
      } else {
        setNewAppt({ ...newAppt, notes: newNotes });
      }
    } else {
      alert('У выбранного клиента не указан адрес в карточке.');
    }
  };

  // Функция добавления адреса места (локации) в примечание
  const appendLocationAddress = (isEditMode) => {
    const currentLocId = isEditMode ? editApptData.location_id : newAppt.location_id;
    const location = locations.find(l => l.id === currentLocId);
    
    if (location && (location.address || location.description)) {
      // Формируем строку для добавления
      let textToAdd = location.address || '';
      
      // Если есть описание, добавляем его в скобках
      if (location.description) {
        textToAdd += textToAdd ? ` (${location.description})` : location.description;
      }
      
      const currentNotes = isEditMode ? editApptData.record_notes : newAppt.notes;
      const newNotes = currentNotes ? `${currentNotes}\n${textToAdd}` : textToAdd;
      
      if (isEditMode) {
        setEditApptData({ ...editApptData, record_notes: newNotes });
      } else {
        setNewAppt({ ...newAppt, notes: newNotes });
      }
    } else {
      alert('У выбранного места не указан ни адрес, ни описание в настройках.');
    }
  };
  //Функция для формирования и открытия ссылки
    const openNavigator = (address) => {
    if (!address) {
      alert('Адрес не заполнен.');
      return;
    }
    
    const encodedAddress = encodeURIComponent(address);
    
    // 👈 Используем схему yandexmaps для открытия именно приложения Карт
    // Если приложение не установлено, сработает фолбэк на веб-версию
    const appUrl = `yandexmaps://maps.yandex.ru/?text=${encodedAddress}`;
    const webUrl = `https://yandex.ru/maps/?text=${encodedAddress}`;
    
    // Пытаемся открыть приложение, если не получается — открываем веб
    window.location.href = appUrl;
    
    // Ставим таймер: если приложение не открылось за 1.5 секунды, открываем веб-версию
    setTimeout(() => {
      window.open(webUrl, '_blank');
    }, 1500);
  };

  const handleServiceChange = (e) => {
    const sId = e.target.value;
    const serv = services.find(s => s.id === sId);
    setNewAppt({ 
      ...newAppt, 
      service_id: sId,
      duration_minutes: serv ? serv.default_duration_minutes : ''
    });
    setSelectedService(serv);
  };

  const handleLocationChange = (e) => {
    const lId = e.target.value;
    const loc = locations.find(l => l.id === lId);
    setNewAppt({ ...newAppt, location_id: lId });
    setSelectedLocation(loc);
  };

  const handleQuickAddClient = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_URL}/api/appt/clients`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: quickClientData.name,
          phone: quickClientData.phone,
          address: quickClientData.address
        })
      });
      const data = await res.json();

      if (data.success) {
        // 1. Добавляем нового клиента в общий список
        setClients([...clients, data.data]);
        
        // 2. Автоматически выбираем его в текущей форме (создание или редактирование)
        if (isModalOpen) {
          setNewAppt(prev => ({ ...prev, client_id: data.data.id }));
        } else if (selectedAppt) {
          setEditApptData(prev => ({ ...prev, client_id: data.data.id }));
        }

        // 3. Закрываем окно быстрого добавления
        setQuickClientModal({ isOpen: false, initialName: '' });
        setQuickClientData({ name: '', phone: '+79', address: '' });
      } else {
        alert('Ошибка: ' + data.error);
      }
    } catch (err) {
      alert('Ошибка сети: ' + err.message);
    }
  };

  // 👈 Проверяем поддержку API (добавь в начало компонента, если еще нет)
  const isContactsApiSupported = typeof navigator !== 'undefined' && 'contacts' in navigator && 'ContactsManager' in window;

  // 👈 Функция импорта для быстрого добавления
  const handleQuickImportContact = async () => {
    try {
      const props = ['name', 'tel', 'email'];
      const opts = { multiple: false };
      
      const contacts = await navigator.contacts.select(props, opts);
      
      if (contacts.length > 0) {
        const contact = contacts[0];
        setQuickClientData(prev => ({
          ...prev,
          name: contact.name && contact.name.length > 0 ? contact.name[0] : prev.name,
          phone: contact.tel && contact.tel.length > 0 ? contact.tel[0] : prev.phone,
          email: contact.email && contact.email.length > 0 ? contact.email[0] : prev.email,
        }));
      }
    } catch (err) {
      console.error('Ошибка импорта контакта:', err);
    }
  };

  const handleCreateAppointment = async (e) => {
    e.preventDefault();
    setError('');

    const dateTime = `${selectedDate}T${newAppt.time}:00`;
    
    const bufferBefore = newAppt.buffer_before_minutes !== '' 
      ? Number(newAppt.buffer_before_minutes) 
      : (selectedLocation?.buffer_before_minutes || 0);

    const bufferAfter = newAppt.buffer_after_minutes !== '' 
      ? Number(newAppt.buffer_after_minutes) 
      : (selectedLocation?.buffer_after_minutes || 0);

    const duration = newAppt.duration_minutes !== '' 
      ? Number(newAppt.duration_minutes) 
      : (selectedService?.default_duration_minutes || 60);

    const payload = {
      client_id: newAppt.client_id || null,
      service_id: newAppt.service_id,
      location_id: newAppt.location_id || null,
      appointment_date: dateTime,
      duration_minutes: duration,
      buffer_before_minutes: bufferBefore,
      buffer_after_minutes: bufferAfter,
      base_price: selectedService?.default_price || 0,
      discount_amount: 0,
      final_price: selectedService?.default_price || 0,
      general_notes: newAppt.general_notes || '', // 👈 Берем из состояния формы
      record_notes: newAppt.notes || ''           // 👈 Берем из состояния формы  👈 Передаем то, что ввели в поле "Примечание к записи"
    };

    try {
      const res = await fetch(`${API_URL}/api/appt/schedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (data.success) {
        setIsModalOpen(false);
        fetchData();
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const handleUpdateAppointment = async (e) => {
    e.preventDefault();
    try {
      const dateTime = `${editApptData.date}T${editApptData.time}:00`;

      const payload = {
        client_id: editApptData.client_id || null,
        service_id: editApptData.service_id,
        location_id: editApptData.location_id || null,
        appointment_date: dateTime,
        duration_minutes: Number(editApptData.duration_minutes),
        buffer_before_minutes: Number(editApptData.buffer_before_minutes),
        buffer_after_minutes: Number(editApptData.buffer_after_minutes),
        final_price: Number(editApptData.final_price),
        status: editApptData.status,
        general_notes: editApptData.general_notes,
        record_notes: editApptData.record_notes,

        // 👈 ДОБАВЛЯЕМ ТО, ЧЕГО НЕ ХВАТАЛО
        base_price: selectedAppt.base_price || 0,
        discount_amount: selectedAppt.discount_amount || 0,
        chief_complaint: selectedAppt.chief_complaint || '',
        subscription_info: selectedAppt.subscription_info || '',
        specialization_data: selectedAppt.specialization_data || {}
      };

      const res = await fetch(`${API_URL}/api/appt/schedule/${selectedAppt.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        setSelectedAppt(null);
        fetchData();
      } else {
        alert('Ошибка: ' + data.error);
      }
    } catch (err) {
      alert('Ошибка сети: ' + err.message);
    }
  };

  const handleDeleteAppointment = async () => {
    if (window.confirm('Удалить этот приём?')) {
      try {
        await fetch(`${API_URL}/api/appt/schedule/${selectedAppt.id}`, { method: 'DELETE', credentials: 'include' });
        setSelectedAppt(null);
        fetchData();
      } catch (err) { 
        alert(err.message); 
      }
    }
  };

  const formattedDate = new Date(selectedDate + 'T12:00:00').toLocaleDateString('ru-RU', { 
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
  });

  const shiftDate = (days) => {
    const d = new Date(selectedDate + 'T12:00:00');
    d.setDate(d.getDate() + days);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    setSelectedDate(`${yyyy}-${mm}-${dd}`);
  };
  
  return (
    <div className="detail-container" style={{ maxWidth: '800px' }}>
      {/* 👈 НАЧАЛО ШАПКИ */}
        <div style={{ 
        display: 'flex', 
        flexDirection: isMobile ? 'column' : 'row', // 👈 На мобилке — колонка
        justifyContent: 'space-between', 
        alignItems: isMobile ? 'stretch' : 'center', 
        marginBottom: '20px', 
        gap: '10px',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        backgroundColor: 'white',
        paddingTop: '10px',
        paddingBottom: '10px',
        paddingLeft: isMobile ? '40px' : '20px' 
        }}>
        {/* Заголовок (всегда сверху) */}
        <h1 className="detail-title" style={{ margin: 0, fontSize: isMobile ? '20px' : '28px', flexShrink: 0 }}>
            Расписание
        </h1>
        
        {/* Блок управления (на мобилке — снизу, на десктопе — справа) */}
        <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: isMobile ? '8px' : '15px', 
            flexWrap: 'nowrap', // 👈 Запрещаем перенос внутри этого блока
            justifyContent: isMobile ? 'space-between' : 'flex-end',
            width: isMobile ? '100%' : 'auto' // 👈 На мобилке растягиваем на всю ширину
        }}>
            <span style={{ fontWeight: 'bold', color: '#495057', fontSize: isMobile ? '13px' : '16px', whiteSpace: 'nowrap' }}>
            {isMobile 
                ? new Date(selectedDate + 'T12:00:00').toLocaleDateString('ru-RU', { weekday: 'short' }) // 👈 На мобилке "пн" вместо "понедельник"
                : new Date(selectedDate + 'T12:00:00').toLocaleDateString('ru-RU', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
            }
            </span>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button 
                onClick={() => shiftDate(-1)} 
                title="Предыдущий день"
                style={{ padding: isMobile ? '6px 10px' : '8px 12px', border: '1px solid #ddd', borderRadius: '4px', backgroundColor: 'white', cursor: 'pointer', fontSize: isMobile ? '16px' : '16px', lineHeight: 1 }}
            >←</button>
            
            <input 
                type="date" 
                value={selectedDate} 
                onChange={e => setSelectedDate(e.target.value)}
                style={{ padding: isMobile ? '4px 8px' : '8px', fontSize: isMobile ? '14px' : '16px', borderRadius: '4px', border: '1px solid #ddd', width: isMobile ? '130px' : 'auto', boxSizing: 'border-box' }}
            />
            
            <button 
                onClick={() => shiftDate(1)} 
                title="Следующий день"
                style={{ padding: isMobile ? '6px 10px' : '8px 12px', border: '1px solid #ddd', borderRadius: '4px', backgroundColor: 'white', cursor: 'pointer', fontSize: isMobile ? '16px' : '16px', lineHeight: 1 }}
            >→</button>
            </div>
        </div>
        </div>
      {/* 👈 КОНЕЦ ШАПКИ */}

      {error && !isModalOpen && !selectedAppt && (
        <div style={{ 
          position: 'fixed', // 👈 Фиксируем на экране
          top: '180px',       // 👈 Отступ сверху, чтобы не перекрывать шапку
          left: '50%', 
          transform: 'translateX(-50%)', // 👈 Центрируем по горизонтали
          zIndex: 2000,      // 👈 Поверх всего контента
          backgroundColor: '#f8d7da', 
          color: '#721c24', 
          padding: '15px 20px', 
          borderRadius: '8px', 
          border: '1px solid #f5c6cb', 
          display: 'flex', 
          alignItems: 'center', 
          gap: '10px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          maxWidth: '90vw',
          width: 'max-content'
        }}>
          <span style={{ fontSize: '20px' }}>⚠️</span>
          <div>
            <strong>Произошла ошибка</strong>
            <div>{error}</div>
          </div>
        </div>
      )}

      {loading ? (
        <div>Загрузка...</div>
      ) : (
        <div ref={gridRef} style={{ backgroundColor: 'white', border: isMobile ? 'none' : '1px solid #dee2e6', borderRadius: '8px', position: 'relative', width: '100%', overflow: 'hidden' }}>
          
          <div style={{ marginLeft: isMobile ? '45px' : '90px', position: 'relative', 
                width: isMobile ? 'calc(100% - 45px)' : 'auto', paddingTop: 0, marginTop: 0 }}>
            
            {/* БУФЕРЫ */}
            {appointments.map(appt => {
              const apptStart = new Date(appt.appointment_date);
              const apptEnd = new Date(apptStart.getTime() + (appt.duration_minutes || 60) * 60000);

              const bufferBefore = appt.buffer_before_minutes || 0;
              const bufferAfter = appt.buffer_after_minutes || 0;

              const startMin = apptStart.getHours() * 60 + apptStart.getMinutes();
              const endMin = apptEnd.getHours() * 60 + apptEnd.getMinutes();

              const topBeforePx = (startMin - bufferBefore - (START_HOUR * 60)) * PX_PER_MINUTE;
              const heightBeforePx = bufferBefore * PX_PER_MINUTE;

              const topAfterPx = (endMin - (START_HOUR * 60)) * PX_PER_MINUTE;
              const heightAfterPx = bufferAfter * PX_PER_MINUTE;

              return (
                <React.Fragment key={`buffers-${appt.id}`}>
                  {bufferBefore > 0 && (
                    <div style={{
                      position: 'absolute',
                      top: `${topBeforePx}px`,
                      height: `${heightBeforePx}px`,
                      left: '2px', right: '2px',
                      backgroundColor: '#e9ecef',
                      borderLeft: '4px solid #ced4da',
                      boxSizing: 'border-box',
                      display: 'flex',
                      alignItems: 'center',
                      paddingLeft: '10px',
                      fontSize: '12px',
                      color: '#6c757d'
                    }}>
                      Занято (подготовка/дорога - {bufferBefore} мин)
                    </div>
                  )}

                  {bufferAfter > 0 && (
                    <div style={{
                      position: 'absolute',
                      top: `${topAfterPx}px`,
                      height: `${heightAfterPx}px`,
                      left: '2px', right: '2px',
                      backgroundColor: '#e9ecef',
                      borderLeft: '4px solid #ced4da',
                      boxSizing: 'border-box',
                      display: 'flex',
                      alignItems: 'center',
                      paddingLeft: '10px',
                      fontSize: '12px',
                      color: '#6c757d'
                    }}>
                      Занято (время на дорогу - {bufferAfter} мин)
                    </div>
                  )}
                </React.Fragment>
              );
            })}

            {/* ПРИЁМЫ */}
            {appointments.map(appt => {
              const apptStart = new Date(appt.appointment_date);
              const apptEnd = new Date(apptStart.getTime() + (appt.duration_minutes || 60) * 60000);
              
              const startMin = apptStart.getHours() * 60 + apptStart.getMinutes();
              const endMin = apptEnd.getHours() * 60 + apptEnd.getMinutes();
              
              const topPx = (startMin - (START_HOUR * 60)) * PX_PER_MINUTE;
              const heightPx = (endMin - startMin) * PX_PER_MINUTE;

              const timeStr = `${apptStart.getHours().toString().padStart(2, '0')}:${apptStart.getMinutes().toString().padStart(2, '0')}`;

              return (
                <div 
                  key={appt.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedAppt(appt);
                    const d = new Date(appt.appointment_date);
                    
                    const year = d.getFullYear();
                    const month = String(d.getMonth() + 1).padStart(2, '0');
                    const day = String(d.getDate()).padStart(2, '0');
                    const dateStr = `${year}-${month}-${day}`; // 👈 Берем ЛОКАЛЬНУЮ дату

                    const timeStr = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
                    
                    setEditApptData({ 
                      client_id: appt.client_id || '',
                      service_id: appt.service_id || '',
                      location_id: appt.location_id || '',
                      date: dateStr,
                      time: timeStr,
                      duration_minutes: appt.duration_minutes || 60,
                      buffer_before_minutes: appt.buffer_before_minutes || 0,
                      buffer_after_minutes: appt.buffer_after_minutes || 0,
                      final_price: appt.final_price || 0,
                      status: appt.status || 'scheduled',
                      general_notes: appt.general_notes || '',
                      record_notes: appt.record_notes || ''
                    });
                  }}
                  style={{
                    position: 'absolute',
                    top: `${topPx}px`,
                    height: `${heightPx}px`,
                    left: 0, right: 0,
                    padding: '2px',
                    zIndex: 10,
                    boxSizing: 'border-box',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ 
                    backgroundColor: '#e3f2fd', 
                    borderLeft: '4px solid #007bff', 
                    padding: '6px 10px', 
                    borderRadius: '4px', 
                    height: '100%', 
                    overflow: 'hidden',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px'
                  }}>
                    {/* 1. Шапка: Время слева, Услуга и Длительность справа */}
                    <div style={{ color: '#0d47a1', fontSize: '13px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <span style={{ fontWeight: 'bold', whiteSpace: 'nowrap', marginRight: '6px' }}>{timeStr}</span>
                      <span style={{ color: '#007bff', fontSize: '12px', textAlign: 'right', lineHeight: 1.2, display: 'flex', flexWrap: 'wrap', justifyContent: 'flex-end', gap: '4px' }}>
                        <span>{appt.service_name}</span>
                        <span style={{ fontWeight: 'bold', opacity: 0.8 }}>— {appt.duration_minutes} мин</span>
                      </span>
                    </div>
                    
                    {/* 2. Клиент (Жирный) или Примечание (если клиента нет) */}
                    {appt.client_name ? (
                      <div style={{ fontWeight: 'bold', fontSize: '13px', color: '#212529', display: 'flex', alignItems: 'flex-start', gap: '4px' }}>
                        <FaUser style={{ fontSize: '11px', color: '#6c757d', marginTop: '2px', flexShrink: 0 }}/> 
                        <span style={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>{appt.client_name}</span>
                      </div>
                    ) : (
                      appt.record_notes && (
                        <div style={{ fontWeight: 'bold', fontSize: '13px', color: '#495057', display: 'flex', alignItems: 'flex-start', gap: '4px' }}>
                          <FaStickyNote style={{ fontSize: '11px', color: '#6c757d', marginTop: '2px', flexShrink: 0 }}/> 
                          <span style={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>{appt.record_notes}</span>
                        </div>
                      )
                    )}
                    
                    {/* 3. Место (если есть) */}
                    {appt.location_name && (
                      <div style={{ fontSize: '11px', color: '#495057', display: 'flex', alignItems: 'flex-start', gap: '4px' }}>
                        <FaMapMarkerAlt style={{ fontSize: '11px', color: '#6c757d', marginTop: '2px', flexShrink: 0 }}/> 
                        <span style={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>{appt.location_name}</span>
                      </div>
                    )}

                    {/* 4. Примечание (показываем только если клиент ЕСТЬ, чтобы не дублировать) */}
                    {appt.client_name && appt.record_notes && (
                      <div style={{ fontSize: '11px', color: '#666', fontStyle: 'italic', display: 'flex', alignItems: 'flex-start', gap: '4px' }}>
                        <FaStickyNote style={{ fontSize: '11px', color: '#adb5bd', marginTop: '2px', flexShrink: 0 }}/> 
                        <span style={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>{appt.record_notes}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

                       {/* СЛОТЫ */}
            {timeSlots.map(time => (
              <div 
                key={time} 
                style={{ 
                  display: 'flex', borderBottom: '1px solid #eee', height: `${SLOT_HEIGHT}px`,
                  position: 'relative',
                  boxSizing: 'border-box'
                }}
                onClick={() => {
                  const currentAppts = appointments.some(a => {
                    const aStart = new Date(a.appointment_date).getTime() - (a.buffer_before_minutes || 0) * 60000;
                    const aEnd = new Date(a.appointment_date).getTime() + ((a.duration_minutes || 60) + (a.buffer_after_minutes || 0)) * 60000;
                    const slotTime = new Date(`${selectedDate}T${time}:00`).getTime();
                    return slotTime >= aStart && slotTime < aEnd;
                  });
                  if (!currentAppts) handleSlotClick(time);
                }}
              >
                <div style={{ 
                  width: isMobile ? '50px' : '80px', 
                  position: 'absolute', 
                  left: isMobile ? '-55px' : '-85px', 
                  top: -45,          // 👈 Это костыль, при правке шапки его значение опять придётся подбирать руками
                  bottom: 0,       // 👈 До самого низа
                  display: 'flex', 
                  alignItems: 'center', // 👈 Центрируем текст по вертикали
                  justifyContent: 'flex-end', 
                  fontWeight: 'bold', 
                  color: '#495057', 
                  fontSize: isMobile ? '12px' : '16px' 
                }}>
                  {time}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* МОДАЛЬНОЕ ОКНО СОЗДАНИЯ */}
      {isModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: isMobile ? 0 : '20px' }}>
          <div style={{ 
            backgroundColor: 'white', 
            padding: isMobile ? '15px' : '20px', // 👈 Уменьшили отступ
            borderRadius: isMobile ? 0 : '8px', 
            width: isMobile ? '100vw' : '450px', 
            height: isMobile ? '100dvh' : 'auto', // 👈 Используем 100dvh (динамическая высота, убирает прыжки)
            maxHeight: isMobile ? '100dvh' : '90vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxSizing: 'border-box',
            paddingBottom: isMobile ? 0 : '20px' // 👈 Убрали лишний отступ снизу на мобилке
          }}>
            <h3 style={{ marginTop: 0 }}>Новый приём</h3>
            
            {error && (
              <div style={{ color: '#721c24', backgroundColor: '#f8d7da', padding: '10px', borderRadius: '4px', marginBottom: '15px', fontSize: '13px' }}>
                ⚠️ {error}
                {error.includes('Накладка') && (
                  <>
                    <br/>
                    <small>Вы можете изменить время или буферы ниже и попробовать снова.</small>
                  </>
                )}
              </div>
            )}
            
            <form onSubmit={handleCreateAppointment} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', margin: 0 }}>
              
              {/* 👈 НАЧАЛО СКРОЛЛИРУЕМОЙ ОБЛАСТИ */}
              <div style={{ overflowY: 'auto', flex: 1, paddingRight: '5px' }}>
              
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: 'bold', color: '#0056b3' }}>Начало</label>
                <input 
                  type="time" 
                  value={newAppt.time} 
                  onChange={e => setNewAppt({...newAppt, time: e.target.value})}
                  style={{ width: '100%', height: '38px', boxSizing: 'border-box', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                />
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: 'bold', color: '#0056b3' }}>Клиент</label>
                
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <div style={{ flex: 1 }}>
                    <ClientSearch 
                      clients={clients} 
                      value={newAppt.client_id} 
                      onChange={(id) => setNewAppt({...newAppt, client_id: id})} 
                      onAddNew={(initialName) => {
                        setQuickClientData({ name: initialName, phone: '+79', address: '' });
                        setQuickClientModal({ isOpen: true, initialName });
                      }}
                    />
                  </div>
                                    
                    {/* 👈 Кнопка перехода в карточку (показываем, только если клиент выбран) */}
                    {newAppt.client_id && (
                    <ButtonWithTooltip 
                      type="button"
                      onClick={() => alert('Сначала сохраните запись на приём. После этого вы сможете отредактировать карточку клиента.')}
                      tooltip="Сначала сохраните запись"
                      style={{ 
                        padding: 0, 
                        backgroundColor: '#e3f2fd', 
                        color: '#007bff', 
                        border: '1px solid #90caf9', 
                        borderRadius: '4px', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        cursor: 'not-allowed',
                        minWidth: '34px',       // 👈 ДОБАВЛЯЕМ, чтобы запретить расширение
                        maxWidth: '34px',       // 👈 ДОБАВЛЯЕМ, чтобы запретить расширение
                        minHeight: '34px',      
                        maxHeight: '34px',
                        margin: 0,              
                        boxSizing: 'border-box',
                        flexShrink: 0,
                        overflow: 'hidden'
                      }}
                    >
                      {/* 👈 Запрещаем этому div'у растягиваться */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', padding: 0, margin: 0, flexShrink: 0 }}>
                        <FaEdit size={14} style={{ display: 'block' }} /> {/* 👈 Уменьшили иконку до 14, чтобы точно влезла */}
                      </div>
                    </ButtonWithTooltip>
                  )}

                </div>
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: 'bold', color: '#0056b3' }}>Услуга *</label>
                <select required value={newAppt.service_id} onChange={handleServiceChange} style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}>
                  <option value="">Выберите услугу</option>
                  {services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: 'bold', color: '#0056b3' }}>Длительность (мин)</label>
                <input 
                  type="number"                   
                  value={newAppt.duration_minutes } 
                  onChange={e => setNewAppt({...newAppt, duration_minutes: e.target.value})}
                  style={{ width: '100%', height: '38px', boxSizing: 'border-box', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }} 
                />
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: 'bold', color: '#0056b3' }}>Место</label>
                <select value={newAppt.location_id} onChange={handleLocationChange} style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}>
                  <option value="">Не указано</option>
                  {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </div>

              {selectedLocation && (
                <div style={{ display: 'flex', gap: '20px', marginBottom: '15px' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: 'bold', color: '#0056b3' }}>Время "до" (мин)</label>
                    <input 
                      type="number" 
                      value={newAppt.buffer_before_minutes} // 👈 Теперь только из стейта
                      onChange={e => setNewAppt({...newAppt, buffer_before_minutes: e.target.value})}
                      onFocus={(e) => {
                        if (newAppt.buffer_before_minutes === '' && selectedLocation.buffer_before_minutes) {
                           setNewAppt({...newAppt, buffer_before_minutes: selectedLocation.buffer_before_minutes});
                        }
                      }}
                      placeholder={selectedLocation.buffer_before_minutes} // Показываем дефолт как подсказку
                      style={{ width: '100%', height: '38px', boxSizing: 'border-box', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                    />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: 'bold', color: '#0056b3' }}>Время "после" (мин)</label>
                    <input 
                      type="number" 
                      value={newAppt.buffer_after_minutes} // 👈 Теперь только из стейта
                      onChange={e => setNewAppt({...newAppt, buffer_after_minutes: e.target.value})}
                      onFocus={(e) => {
                        if (newAppt.buffer_after_minutes === '' && selectedLocation.buffer_after_minutes) {
                           setNewAppt({...newAppt, buffer_after_minutes: selectedLocation.buffer_after_minutes});
                        }
                      }}
                      placeholder={selectedLocation.buffer_after_minutes} // Показываем дефолт как подсказку
                      style={{ width: '100%', height: '38px', boxSizing: 'border-box', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                    />
                  </div>
                </div>
              )}

                             <div style={{ marginBottom: '15px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px', flexWrap: 'wrap', gap: '5px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#0056b3', margin: 0 }}>Примечание к записи (адрес, детали)</label>
                  
                  {/* 👈 Кнопки добавления адреса */}
                  <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                    <ButtonWithTooltip 
                      type="button" 
                      onClick={() => appendClientAddress(false)} 
                      tooltip="Добавить адрес клиента"
                      style={{ padding: '4px 8px', fontSize: '11px', lineHeight: '1.2', backgroundColor: '#e3f2fd', border: '1px solid #90caf9', color: '#007bff', borderRadius: '4px', cursor: 'pointer', height: 'auto', minHeight: 'auto' }}
                    >
                      + Адрес клиента
                    </ButtonWithTooltip>
                    <ButtonWithTooltip 
                      type="button" 
                      onClick={() => appendLocationAddress(false)} 
                      tooltip="Добавить адрес места"
                      style={{ padding: '4px 8px', fontSize: '11px', lineHeight: '1.2', backgroundColor: '#e3f2fd', border: '1px solid #90caf9', color: '#007bff', borderRadius: '4px', cursor: 'pointer', height: 'auto', minHeight: 'auto' }}
                    >
                      + Адрес места
                    </ButtonWithTooltip>
                  </div>
                </div>

                <textarea 
                  value={newAppt.notes} 
                  onChange={e => setNewAppt({...newAppt, notes: e.target.value})}
                  style={{ width: '100%', boxSizing: 'border-box', padding: '8px', border: '1px solid #ddd', borderRadius: '4px', height: '65px' }} 
                />
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: 'bold', color: '#0056b3' }}>Общие заметки мастера</label>
                <textarea 
                  value={newAppt.general_notes} 
                  onChange={e => setNewAppt({...newAppt, general_notes: e.target.value})}
                  style={{ width: '100%', boxSizing: 'border-box', padding: '8px', border: '1px solid #ddd', borderRadius: '4px', height: '60px' }} // 👈 boxSizing добавлен
                />
              </div>

              </div> {/* 👈 ЗАКРЫВАЕМ СКРОЛЛИРУЕМУЮ ОБЛАСТЬ */}
              
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '15px', paddingTop: '15px', borderTop: '1px solid #eee', flexShrink: 0 }}>
                <button type="button" onClick={() => setIsModalOpen(false)} style={{ padding: '8px 16px', border: '1px solid #ddd', borderRadius: '4px', backgroundColor: 'transparent', cursor: 'pointer' }}>Отмена</button>
                <button type="submit" style={{ padding: '8px 16px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Создать</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* МОДАЛЬНОЕ ОКНО ПРОСМОТРА/РЕДАКТИРОВАНИЯ */}
      {selectedAppt && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: isMobile ? 0 : '20px' }}>
          <div style={{ 
            backgroundColor: 'white', 
            padding: isMobile ? '15px' : '20px', // 👈 Уменьшили отступ
            borderRadius: isMobile ? 0 : '8px', 
            width: isMobile ? '100vw' : '500px', 
            height: isMobile ? '100dvh' : 'auto', // 👈 Используем 100dvh
            maxHeight: isMobile ? '100dvh' : '90vh',
            display: 'flex', 
            flexDirection: 'column', 
            overflow: 'hidden', 
            boxSizing: 'border-box',
            paddingBottom: isMobile ? 0 : '20px' // 👈 Убрали лишний отступ
          }}>
                <h3 style={{ marginTop: 0, borderBottom: '1px solid #eee', paddingBottom: '10px' }}>
                Редактирование записи на приём
                </h3>
                
                <form onSubmit={handleUpdateAppointment} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', margin: 0 }}>
              
            <div style={{ overflowY: 'auto', flex: 1, paddingRight: '5px' }}>              
               <div style={{ display: 'flex', gap: '20px', marginBottom: '15px' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: 'bold', color: '#0056b3' }}>Дата</label>
                  <input 
                    type="date" 
                    value={editApptData.date} 
                    onChange={e => setEditApptData({...editApptData, date: e.target.value})}
                    style={{ width: '100%', height: '38px', boxSizing: 'border-box', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                  />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: 'bold', color: '#0056b3' }}>Время</label>
                  <input 
                    type="time" 
                    value={editApptData.time} 
                    onChange={e => setEditApptData({...editApptData, time: e.target.value})}
                    style={{ width: '100%', height: '38px', boxSizing: 'border-box', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: 'bold', color: '#0056b3' }}>Клиент</label>
                
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <div style={{ flex: 1 }}>
                    <ClientSearch 
                      clients={clients} 
                      value={editApptData.client_id} 
                      onChange={(id) => setEditApptData({...editApptData, client_id: id})} 
                      onAddNew={(initialName) => {
                        setQuickClientData({ name: initialName, phone: '+79', address: '' });
                        setQuickClientModal({ isOpen: true, initialName });
                      }}
                    />
                  </div>
                  
                  {editApptData.client_id && (
                    <ButtonWithTooltip 
                      to={`/appointments/clients?editClient=${editApptData.client_id}&returnToAppt=${selectedAppt.id}&date=${selectedDate}`}
                      tooltip="Открыть карточку клиента для редактирования"
                      style={{ 
                        padding: 0, 
                        backgroundColor: '#e3f2fd', 
                        color: '#007bff', 
                        border: '1px solid #90caf9', 
                        borderRadius: '4px', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        textDecoration: 'none',
                        width: '34px',         
                        height: '34px',         
                        minWidth: '34px',       
                        maxWidth: '34px',       
                        minHeight: '34px',      
                        maxHeight: '34px',
                        margin: 0,              
                        boxSizing: 'border-box',
                        flexShrink: 0,
                        overflow: 'hidden'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', padding: 0, margin: 0 }}>
                        <FaEdit size={14} style={{ display: 'block' }} />
                      </div>
                    </ButtonWithTooltip>
                  )}
                </div>
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: 'bold', color: '#0056b3' }}>Услуга *</label>
                <select required value={editApptData.service_id} onChange={e => {
                  const sId = e.target.value;
                  const serv = services.find(s => s.id === sId);
                  setEditApptData({
                    ...editApptData, 
                    service_id: sId, 
                    duration_minutes: serv ? serv.default_duration_minutes : editApptData.duration_minutes,
                    final_price: serv ? serv.default_price : editApptData.final_price
                  });
                }} style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}>
                  <option value="">Выберите услугу</option>
                  {services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>

              <div style={{ display: 'flex', gap: '20px', marginBottom: '15px' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: 'bold', color: '#0056b3' }}>Длительность (мин)</label>
                  <input 
                    type="number" 
                    value={editApptData.duration_minutes} 
                    onChange={e => setEditApptData({...editApptData, duration_minutes: e.target.value})}
                    style={{ width: '100%', height: '38px', boxSizing: 'border-box', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }} 
                  />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: 'bold', color: '#0056b3' }}>Стоимость (руб)</label>
                  <input 
                    type="number" 
                    value={editApptData.final_price} 
                    onChange={e => setEditApptData({...editApptData, final_price: e.target.value})}
                    style={{ width: '100%', height: '38px', boxSizing: 'border-box', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }} 
                  />
                </div>
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: 'bold', color: '#0056b3' }}>Место</label>
                <select value={editApptData.location_id} onChange={e => {
                  const lId = e.target.value;
                  const loc = locations.find(l => l.id === lId);
                  setEditApptData({
                    ...editApptData, 
                    location_id: lId,
                    buffer_before_minutes: loc ? loc.buffer_before_minutes : editApptData.buffer_before_minutes,
                    buffer_after_minutes: loc ? loc.buffer_after_minutes : editApptData.buffer_after_minutes
                  });
                }} style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}>
                  <option value="">Не указано</option>
                  {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </div>

              <div style={{ display: 'flex', gap: '20px', marginBottom: '15px' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: 'bold', color: '#0056b3' }}>Время "до" (мин)</label>
                  <input 
                    type="number" 
                    value={editApptData.buffer_before_minutes} 
                    onChange={e => setEditApptData({...editApptData, buffer_before_minutes: e.target.value})}
                    style={{ width: '100%', height: '38px', boxSizing: 'border-box', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                  />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: 'bold', color: '#0056b3' }}>Время "после" (мин)</label>
                  <input 
                    type="number" 
                    value={editApptData.buffer_after_minutes} 
                    onChange={e => setEditApptData({...editApptData, buffer_after_minutes: e.target.value})}
                    style={{ width: '100%', height: '38px', boxSizing: 'border-box', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: 'bold', color: '#0056b3' }}>Статус</label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
                  {[
                    { value: 'pending', label: 'Ожидает подтверждения', icon: '⏳', color: '#856404', bg: '#fff3cd' },
                    { value: 'scheduled', label: 'Запланировано', icon: '📅', color: '#0056b3', bg: '#e3f2fd' },
                    { value: 'completed', label: 'Готово - услуга оказана, приём завершён', icon: '✅', color: '#28a745', bg: '#d4edda' },
                    { value: 'canceled', label: 'Запись отменена', icon: '❌', color: '#dc3545', bg: '#f8d7da' },
                    { value: 'no_show', label: 'Клиент не пришёл', icon: '👻', color: '#6c757d', bg: '#e2e3e5' }
                  ].map(s => (
                    <ButtonWithTooltip
                      key={s.value}
                      type="button"
                      onClick={() => setEditApptData({...editApptData, status: s.value})}
                      tooltip={`Установить статус: ${s.label}`} // 👈 Динамическая подсказка
                      style={{
                        padding: '6px 8px',
                        borderRadius: '20px',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        border: '1px solid',
                        borderColor: editApptData.status === s.value ? s.color : '#ddd',
                        backgroundColor: editApptData.status === s.value ? s.bg : 'white',
                        color: editApptData.status === s.value ? s.color : '#6c757d',
                        transition: 'all 0.2s',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <span>{s.icon}</span>
                      {!isMobile && <span>{s.label}</span>} {/* На телефоне только иконки */}
                    </ButtonWithTooltip>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: '15px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px', flexWrap: 'wrap', gap: '5px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#0056b3', margin: 0 }}>Примечание к записи (адрес, детали)</label>
                  
                  {/* 👈 Кнопки добавления адреса */}
                  <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                    <ButtonWithTooltip 
                      type="button" 
                      onClick={() => appendClientAddress(true)} 
                      tooltip="Добавить адрес клиента в текст"
                      style={{ padding: '2px 6px', fontSize: '11px', lineHeight: '1.2', height: 'auto', minHeight: 'auto', backgroundColor: '#e3f2fd', border: '1px solid #90caf9', color: '#007bff', borderRadius: '4px', cursor: 'pointer' }}
                    >
                      + Адрес клиента
                    </ButtonWithTooltip>
                    <ButtonWithTooltip 
                      type="button" 
                      onClick={() => appendLocationAddress(true)} 
                      tooltip="Добавить адрес места в текст"
                      style={{ padding: '2px 6px', fontSize: '11px', lineHeight: '1.2', height: 'auto', minHeight: 'auto', backgroundColor: '#e3f2fd', border: '1px solid #90caf9', color: '#007bff', borderRadius: '4px', cursor: 'pointer' }}
                    >
                      + Адрес места
                    </ButtonWithTooltip>
                    
                    {/* 👈 НОВЫЕ КНОПКИ ДЛЯ НАВИГАТОРА */}
                    {editApptData.client_id && clients.find(c => c.id === editApptData.client_id)?.address && (
                       <ButtonWithTooltip 
                         type="button" 
                         onClick={() => openNavigator(clients.find(c => c.id === editApptData.client_id).address)} 
                         tooltip="Поехали к клиенту с Яндекс-Навигатором"
                         style={{ padding: '2px 6px', fontSize: '11px', lineHeight: '1.2', height: 'auto', minHeight: 'auto', backgroundColor: '#d4edda', border: '1px solid #c3e6cb', color: '#155724', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                       >
                         🚗 К клиенту
                       </ButtonWithTooltip>
                    )}
                    {editApptData.location_id && locations.find(l => l.id === editApptData.location_id)?.address && (
                       <ButtonWithTooltip 
                         type="button" 
                         onClick={() => openNavigator(locations.find(l => l.id === editApptData.location_id).address)} 
                         tooltip="Поехали к месту с Яндекс-Навигатором"
                         style={{ padding: '2px 6px', fontSize: '11px', lineHeight: '1.2', height: 'auto', minHeight: 'auto', backgroundColor: '#d4edda', border: '1px solid #c3e6cb', color: '#155724', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                       >
                         🚗 К месту
                       </ButtonWithTooltip>
                    )}
                  </div>
                </div>

                <textarea 
                  value={editApptData.record_notes} 
                  onChange={e => setEditApptData({...editApptData, record_notes: e.target.value})}
                  style={{ width: '100%', boxSizing: 'border-box', padding: '8px', border: '1px solid #ddd', borderRadius: '4px', height: '80px' }} 
                />
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: 'bold', color: '#0056b3' }}>Общие заметки мастера</label>
                <textarea 
                  value={editApptData.general_notes} 
                  onChange={e => setEditApptData({...editApptData, general_notes: e.target.value})}
                  style={{ width: '100%', boxSizing: 'border-box', padding: '8px', border: '1px solid #ddd', borderRadius: '4px', minheight: '40px' }}
                />
              </div>
            </div> 

              
              {/* Кнопки управления */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px', borderTop: '1px solid #eee', paddingTop: '15px', gap: '8px' }}>
                
                <ButtonWithTooltip 
                  type="button" 
                  onClick={handleDeleteAppointment}
                  tooltip="Удалить запись на приём"
                  title="Удалить запись на приём"
                  style={{ padding: '8px 12px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <FaTrash />
                </ButtonWithTooltip>
                
                <div style={{ display: 'flex', gap: '8px' }}>
                  {/* Ссылка на полную карточку */}
                  <ButtonWithTooltip 
                    to={`/appointments/${selectedAppt.id}`} // 👈 Передаем путь вместо href
                    tooltip="Открыть полную карточку приёма"
                    style={{ padding: '8px 12px', backgroundColor: '#e3f2fd', color: '#0056b3', 
                        border: 'none', borderRadius: '4px', display: 'flex', 
                        alignItems: 'center', justifyContent: 'center', textDecoration: 'none', 
                        gap: '8px',
                        fontWeight: 'bold',
                        fontSize: '13px'
                    }}
                  >
                    <FaFileAlt />  В карточку приёма
                  </ButtonWithTooltip>

                  <ButtonWithTooltip 
                    type="button" 
                    onClick={() => setSelectedAppt(null)} 
                    tooltip="Закрыть запись на приём без сохранения"
                    title="Закрыть запись на приём без сохранения"
                    style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: '4px', backgroundColor: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <FaTimes />
                  </ButtonWithTooltip>
                  
                  <ButtonWithTooltip 
                    type="submit" 
                    tooltip="Сохранить запись на приём"
                    title="Сохранить запись на приём"
                    style={{ padding: '8px 12px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <FaSave />
                  </ButtonWithTooltip>
                </div>
              </div>
           </form>
          </div>
        </div>
      )}

      {/* МОДАЛЬНОЕ ОКНО БЫСТРОГО ДОБАВЛЕНИЯ КЛИЕНТА */}
      {quickClientModal.isOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: isMobile ? '10px' : '20px' }}>
          <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', width: '100%', maxWidth: '400px', boxSizing: 'border-box' }}>
            <h3 style={{ marginTop: 0, marginBottom: '15px' }}>Быстрое добавление клиента</h3>
            
            <form onSubmit={handleQuickAddClient}>
              {/* 👈 НОВАЯ КНОПКА ИМПОРТА из Контактов*/}
              <div style={{ marginBottom: '15px' }}>
                <ButtonWithTooltip 
                  type="button" 
                  onClick={handleQuickImportContact}
                  disabled={!isContactsApiSupported}
                  tooltip={isContactsApiSupported ? "Импорт из контактов телефона" : "Импорт из контактов не поддерживается на этом устройстве (должно быть https и запуск в Chrome)"}
                  style={{ 
                    width: '100%', 
                    padding: '10px', 
                    backgroundColor: isContactsApiSupported ? '#e3f2fd' : '#f8f9fa',
                    color: isContactsApiSupported ? '#007bff' : '#adb5bd',
                    border: isContactsApiSupported ? '1px dashed #90caf9' : '1px dashed #dee2e6', 
                    borderRadius: '6px', 
                    cursor: isContactsApiSupported ? 'pointer' : 'not-allowed',
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    gap: '8px', 
                    fontSize: '14px',
                    fontWeight: 'bold'
                  }}
                >
                  📞 Импорт из контактов
                </ButtonWithTooltip>
              </div>


              <div style={{ marginBottom: '10px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: 'bold', color: '#0056b3' }}>Имя *</label>
                <input required type="text" value={quickClientData.name} onChange={e => setQuickClientData({...quickClientData, name: e.target.value})} style={{ width: '100%', boxSizing: 'border-box', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }} />
              </div>
              
              <div style={{ marginBottom: '10px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: 'bold', color: '#0056b3' }}>Телефон</label>
                <input type="tel" value={quickClientData.phone} onChange={e => setQuickClientData({...quickClientData, phone: formatPhoneInput(e.target.value)})} style={{ width: '100%', boxSizing: 'border-box', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }} />
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: 'bold', color: '#0056b3' }}>Адрес</label>
                <input type="text" value={quickClientData.address} onChange={e => setQuickClientData({...quickClientData, address: e.target.value})} style={{ width: '100%', boxSizing: 'border-box', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" onClick={() => setQuickClientModal({ isOpen: false, initialName: '' })} style={{ padding: '8px 16px', border: '1px solid #ddd', borderRadius: '4px', backgroundColor: 'transparent', cursor: 'pointer' }}>Отмена</button>
                <button type="submit" style={{ padding: '8px 16px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Сохранить и выбрать</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}