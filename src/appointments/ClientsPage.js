// src/appointments/ClientsPage.js
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaPlus, FaSearch, FaEdit, FaTrash, FaUser } from 'react-icons/fa';
import ButtonWithTooltip from '../components/ButtonWithTooltip';
import API_URL from '../config/api';

export default function ClientsPage() {
  const isMobile = window.innerWidth <= 768 ;
    // 👈 Проверяем, поддерживает ли браузер и устройство Contact Picker API
  const isContactsApiSupported = 'contacts' in navigator && 'ContactsManager' in window;
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sources, setSources] = useState([]);
  const navigate = useNavigate();
  
  const [error, setError] = useState('');
  // Состояние для формы добавления
  const [showForm, setShowForm] = useState(false);
  const [newClient, setNewClient] = useState({ 
    name: '', phone: '', email: '', birthday: '', gender: '', 
    height: '', weight: '', age: '' // 👈 Доп. поля
  });

    // Состояния для модального окна редактирования
    const [selectedClient, setSelectedClient] = useState(null);
    const [editClientData, setEditClientData] = useState({
        name: '', phone: '', email: '', birthday: '', gender: '',
        address: '', notes: '', children_info: '', is_active: true,
        age: '', height: '', weight: ''
    });

  useEffect(() => {
    fetchClients();
    
    // Загружаем источники
    fetch(`${API_URL}/api/appt/sources`, { credentials: 'include' })
        .then(res => res.json())
        .then(data => { if (data.success) setSources(data.data); })
        .catch(err => console.error('Ошибка загрузки источников:', err));
    }, []);

    // 👈 ДОБАВЛЯЕМ НОВЫЙ useEffect ДЛЯ ОТКРЫТИЯ КАРТОЧКИ ИЗ ССЫЛКИ
  useEffect(() => {
    // Ждем, пока клиенты загрузятся
    if (loading || clients.length === 0) return;

    // Проверяем, есть ли в URL параметр editClient
    const params = new URLSearchParams(window.location.search);
    const editId = params.get('editClient');

    if (editId) {
      // Ищем клиента в загруженном списке
      const clientToEdit = clients.find(c => c.id === editId);
      
      if (clientToEdit) {
        handleEditClient(clientToEdit); // Открываем модалку
        
        // Очищаем URL, чтобы при обновлении страницы модалка не открывалась снова
        //window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, [clients, loading]); // 👈 Этот useEffect следит за массивами clients и loading  

   const fetchClients = async (query = '') => {
    try {
      setLoading(true);
      setError(''); // 👈 Сбрасываем старую ошибку при новом запросе
      
      const url = query 
        ? `${API_URL}/api/appt/clients?search=${encodeURIComponent(query)}`
        : `${API_URL}/api/appt/clients`;
        
      const res = await fetch(url, { credentials: 'include' });
      
      // 👈 ПРОВЕРЯЕМ СТАТУС ОТВЕТА
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          throw new Error('Ошибка авторизации. Вы не вошли в систему или сессия истекла. Пожалуйста, войдите заново.');
        }
        throw new Error(`Ошибка сервера: ${res.status} ${res.statusText}`);
      }
      
      const data = await res.json();
      if (data.success) {
        setClients(data.data);
      } else {
        throw new Error(data.error || 'Ошибка при загрузке клиентов');
      }
    } catch (error) {
      console.error('Ошибка загрузки клиентов:', error);
      setError(error.message); // 👈 Сохраняем текст ошибки
      setClients([]); // Очищаем список
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchClients(search);
  };

  const handleImportContact = async () => {
    try {
      const props = ['name', 'tel', 'email'];
      const opts = { multiple: false };
      
      // Вызываем системное окно выбора контакта
      const contacts = await navigator.contacts.select(props, opts);
      
      if (contacts.length > 0) {
        const contact = contacts[0];
        // Заполняем форму данными из контакта
        setNewClient(prev => ({
          ...prev,
          name: contact.name && contact.name.length > 0 ? contact.name[0] : prev.name,
          phone: contact.tel && contact.tel.length > 0 ? contact.tel[0] : prev.phone,
          email: contact.email && contact.email.length > 0 ? contact.email[0] : prev.email,
        }));
      }
    } catch (err) {
      console.error('Ошибка импорта контакта:', err);
      // Не показываем alert, если пользователь просто нажал "Отмена"
    }
  };

  const handleAddClient = async (e) => {
    e.preventDefault();
    try {
      // Собираем extra_data
      const extra_data = {};
      if (newClient.height) extra_data.height = Number(newClient.height);
      if (newClient.weight) extra_data.weight = Number(newClient.weight);
      if (newClient.age) extra_data.age = Number(newClient.age);

      const res = await fetch(`${API_URL}/api/appt/clients`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: newClient.name,
          phone: newClient.phone,
          email: newClient.email,
          birthday: newClient.birthday || null,
          gender: newClient.gender,
          extra_data // 👈 Передаем доп. данные
        })
      });
      const data = await res.json();
      
      if (data.success) {
        setClients([...clients, data.data]);
        setNewClient({ name: '', phone: '', email: '', birthday: '', gender: '', height: '', weight: '' });
        setShowForm(false);
      } else {
        alert('Ошибка: ' + data.error);
      }
    } catch (error) {
      alert('Ошибка сети: ' + error.message);
    }
  };

  const handleEditClient = (client) => {
    setSelectedClient(client);
    
    // Извлекаем доп. данные из JSON, если они есть
    const extra = client.extra_data || {};
    
    setEditClientData({
      name: client.name || '',
      phone: client.phone || '',
      email: client.email || '',
      birthday: client.birthday ? client.birthday.split('T')[0] : '', // формат YYYY-MM-DD
      gender: client.gender || '',
      address: client.address || '',
      notes: client.notes || '',
      children_info: client.children_info || '',
      is_active: client.is_active !== false, // если undefined, то true
      age: extra.age || '',
      height: extra.height || '',
      weight: extra.weight || '',
      source_id: client.source_id || null
    });
  };

    const handleSaveClient = async (e) => {
        e.preventDefault();
        
        try {
        const extra_data = { ...selectedClient.extra_data };
        
        if (editClientData.height) extra_data.height = Number(editClientData.height); else delete extra_data.height;
        if (editClientData.weight) extra_data.weight = Number(editClientData.weight); else delete extra_data.weight;
        if (editClientData.age) extra_data.age = editClientData.age; else delete extra_data.age;

        const res = await fetch(`${API_URL}/api/appt/clients/${selectedClient.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
            name: editClientData.name,
            phone: editClientData.phone,
            email: editClientData.email,
            birthday: editClientData.birthday || null,
            gender: editClientData.gender,
            address: editClientData.address,
            notes: editClientData.notes,
            children_info: editClientData.children_info,
            is_active: editClientData.is_active,
            extra_data,
            source_id: editClientData.source_id || null
            })
        });
        
        const data = await res.json();
        
        if (data.success) {
            setClients(clients.map(c => c.id === selectedClient.id ? data.data : c));
            setSelectedClient(null); // Закрываем модалку
            
            // 👈 ПРОВЕРЯЕМ, НУЖНО ЛИ ВЕРНУТЬСЯ В РАСПИСАНИЕ
            const params = new URLSearchParams(window.location.search);
            const returnToAppt = params.get('returnToAppt');
            const returnDate = params.get('date');
            
            if (returnToAppt !== null) { // Проверяем наличие параметра (может быть и пустая строка)
            // Возвращаемся в расписание с сохранением даты и ID приёма
            navigate(`/appointments/schedule?date=${returnDate || new Date().toISOString().split('T')[0]}${returnToAppt ? `&openApptId=${returnToAppt}` : ''}`);
            }
        } else {
            alert('Ошибка: ' + data.error);
        }
        } catch (err) {
        alert('Ошибка сети: ' + err.message);
        }
    };

  const handleDelete = async (id) => {
    if (!window.confirm('Удалить клиента? Все его приёмы останутся в истории, но отвяжутся от карточки.')) return;
    try {
      await fetch(`${API_URL}/api/appt/clients/${id}`, { method: 'DELETE', credentials: 'include' });
      setClients(clients.filter(c => c.id !== id));
    } catch (error) {
      alert('Ошибка удаления: ' + error.message);
    }
  };

  return (
    <div className="detail-container" style={{ 
      maxWidth: '1000px', 
      padding: isMobile ? '1px' : '32px', // 👈 Уменьшаем отступы на мобилке      
        boxSizing: 'border-box'
      }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1 className="detail-title" style={{ margin: 0 }}>Мои клиенты</h1>
        <button 
          onClick={() => setShowForm(!showForm)}
          style={{ padding: '10px 20px', backgroundColor: showForm ? '#6c757d' : '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          {showForm ? 'Отмена' : <><FaPlus /> Добавить клиента</>}
        </button>
      </div>

      {/* Поиск */}
      <form onSubmit={handleSearch} style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <input 
          type="text" 
          placeholder="Поиск по имени или телефону..." 
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ flex: 1, padding: '10px', borderRadius: '4px', border: '1px solid #ddd' }}
        />
        <button type="submit" style={{ padding: '10px 20px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
          <FaSearch /> Найти
        </button>
      </form>

      {/* Форма добавления */}
      {showForm && (
        <div style={{ backgroundColor: '#f8f9fa', padding: '20px', borderRadius: '8px', marginBottom: '20px', border: '1px solid #dee2e6' }}>
                    {/* Заголовок и кнопка импорта */}
          <div style={{ marginBottom: '15px' }}>
            <h3 style={{ margin: '0 0 10px 0', textAlign: 'center' }}>Новый клиент</h3>
            
            
              <ButtonWithTooltip 
              type="button" 
              onClick={handleImportContact}
              disabled={!isContactsApiSupported} // 👈 Блокируем, если API не поддерживается
              tooltip={isContactsApiSupported ? "Импорт из контактов телефона" : "Импорт из контактов не поддерживается на этом устройстве (должно быть https и запуск в Chrome)"}
              style={{ 
                width: '100%', 
                padding: '10px', 
                backgroundColor: isContactsApiSupported ? '#e3f2fd' : '#f8f9fa', // 👈 Серый фон, если недоступно
                color: isContactsApiSupported ? '#007bff' : '#adb5bd',         // 👈 Серый текст, если недоступно
                border: isContactsApiSupported ? '1px dashed #90caf9' : '1px dashed #dee2e6', 
                borderRadius: '6px', 
                cursor: isContactsApiSupported ? 'pointer' : 'not-allowed',    // 👈 Курсор-запрет
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
          <form onSubmit={handleAddClient} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            
            {/* 1. Имя */}
            <div style={{ gridColumn: isMobile ? '1 / -1' : 'auto' }}>
              <label style={{ display: 'block', fontSize: '13px', marginBottom: '5px', fontWeight: 'bold', color: '#0056b3' }}>Имя *</label>
              <input required type="text" value={newClient.name} onChange={e => setNewClient({...newClient, name: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }} />
            </div>
            
            {/* 2. Телефон */}
            <div style={{ gridColumn: isMobile ? '1 / -1' : 'auto' }}>
              <label style={{ display: 'block', fontSize: '13px', marginBottom: '5px', fontWeight: 'bold', color: '#0056b3' }}>Телефон</label>
              <input type="tel" value={newClient.phone} onChange={e => setNewClient({...newClient, phone: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }} />
            </div>

            {/* 3. Дата рождения */}
            <div style={{ gridColumn: isMobile ? '1 / -1' : 'auto' }}>
              <label style={{ display: 'block', fontSize: '13px', marginBottom: '5px', fontWeight: 'bold', color: '#0056b3' }}>Дата рождения</label>
              <input 
                type="date" 
                value={newClient.birthday} 
                onChange={e => setNewClient({...newClient, birthday: e.target.value})} 
                style={{ width: '100%', height: '38px', boxSizing: 'border-box', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }} 
              />
            </div>

            {/* 4. Возраст */}
            <div style={{ gridColumn: isMobile ? '1 / -1' : 'auto' }}>
                <label style={{ display: 'block', fontSize: '13px', marginBottom: '5px', fontWeight: 'bold', color: '#0056b3' }}>Возраст (если нет даты рождения)</label>
                <input 
                  type="number" 
                  placeholder="35" 
                  value={newClient.age} 
                  onChange={e => setNewClient({...newClient, age: e.target.value})} 
                  style={{ width: '100%', height: '38px', boxSizing: 'border-box', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }} 
                />
            </div>

            {/* 5. Пол */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', marginBottom: '5px', fontWeight: 'bold', color: '#0056b3' }}>Пол</label>
              <select value={newClient.gender} onChange={e => setNewClient({...newClient, gender: e.target.value})} style={{ width: '100%', height: '38px', boxSizing: 'border-box', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}>
                <option value="">Не указан</option>
                <option value="female">Женский</option>
                <option value="male">Мужской</option>
              </select>
            </div>

            {/* 6. Рост */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', marginBottom: '5px', fontWeight: 'bold', color: '#0056b3' }}>Рост (см)</label>
              <input type="number" value={newClient.height} onChange={e => setNewClient({...newClient, height: e.target.value})} style={{ width: '100%', height: '38px', boxSizing: 'border-box', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }} />
            </div>

            {/* 7. Вес */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', marginBottom: '5px', fontWeight: 'bold', color: '#0056b3' }}>Вес (кг)</label>
              <input type="number" value={newClient.weight} onChange={e => setNewClient({...newClient, weight: e.target.value})} style={{ width: '100%', height: '38px', boxSizing: 'border-box', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }} />
            </div>

            <div style={{ gridColumn: '1 / -1', textAlign: 'right', marginTop: '10px' }}>
              <button type="submit" style={{ padding: '10px 20px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Сохранить клиента</button>
            </div>
          </form>
        </div>
      )}


      {/* 👈 БЛОК ОШИБКИ */}
      {error && (
        <div style={{ backgroundColor: '#f8d7da', color: '#721c24', padding: '15px', borderRadius: '8px', marginBottom: '20px', border: '1px solid #f5c6cb', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '20px' }}>⚠️</span>
          <div>
            <strong>Произошла ошибка</strong>
            <div>{error}</div>
          </div>
        </div>
      )}

      {/* Список клиентов */}
      {loading ? (
        <div>Загрузка...</div>
      ) : !error && clients.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', backgroundColor: '#f8f9fa', borderRadius: '8px', color: '#666' }}>
          У вас пока нет клиентов.
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '10px' }}>
          {clients.map(client => (
            <div key={client.id} style={{ padding: isMobile ? '5px' : '15px', border: '1px solid #dee2e6', borderRadius: '8px', backgroundColor: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: '0 0 5px 0', color: '#0d47a1' }}><FaUser /> {client.name}</h3>
                <div style={{ fontSize: '14px', color: '#666' }}>
                  {client.phone && <span style={{ marginRight: '15px' }}>📞 {client.phone}</span>}
                  {client.extra_data?.height && <span style={{ marginRight: '15px' }}>📏 {client.extra_data.height} см</span>}
                  {client.extra_data?.weight && <span>⚖️ {client.extra_data.weight} кг</span>}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={() => handleEditClient(client)} style={{ padding: '6px 12px', backgroundColor: '#e3f2fd', border: '1px solid #90caf9', borderRadius: '4px', cursor: 'pointer', color: '#007bff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <FaEdit /> {!isMobile && 'Редактировать'}
                </button>
                <button onClick={() => handleDelete(client.id)} style={{ padding: '6px 12px', backgroundColor: 'transparent', border: '1px solid #dc3545', color: '#dc3545', borderRadius: '4px', cursor: 'pointer' }}><FaTrash /></button>
              </div>
            </div>
          ))}
        </div>
      )}

            {/* МОДАЛЬНОЕ ОКНО РЕДАКТИРОВАНИЯ/ПРОСМОТРА КЛИЕНТА */}
      {selectedClient && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: isMobile ? 0 : '20px' }}>
          <div style={{ 
            backgroundColor: 'white', 
            padding: '20px', 
            borderRadius: isMobile ? 0 : '8px', 
            width: isMobile ? '100vw' : '600px', 
            height: isMobile ? '100vh' : 'auto',
            maxWidth: isMobile ? '100vw' : '95%',
            maxHeight: isMobile ? '100vh' : '90vh',
            display: 'flex', 
            flexDirection: 'column', 
            overflow: 'hidden',
            boxSizing: 'border-box'
          }}>
            <h3 style={{ marginTop: 0, borderBottom: '1px solid #eee', paddingBottom: '10px' }}>
              Карточка клиента
            </h3>
            
            <form onSubmit={handleSaveClient} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', margin: 0 }}>
              
              {/* Скроллируемая область */}
              <div style={{ overflowY: 'auto', flex: 1, paddingRight: '5px' }}>
                
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                  
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: 'bold', color: '#0056b3' }}>Имя *</label>
                    <input required type="text" value={editClientData.name} onChange={e => setEditClientData({...editClientData, name: e.target.value})} style={{ width: '100%', boxSizing: 'border-box', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }} />
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: 'bold', color: '#0056b3' }}>Телефон</label>
                    <input type="tel" value={editClientData.phone} onChange={e => setEditClientData({...editClientData, phone: e.target.value})} style={{ width: '100%', boxSizing: 'border-box', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }} />
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: 'bold', color: '#0056b3' }}>Email</label>
                    <input type="email" value={editClientData.email} onChange={e => setEditClientData({...editClientData, email: e.target.value})} style={{ width: '100%', boxSizing: 'border-box', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }} />
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: 'bold', color: '#0056b3' }}>Дата рождения</label>
                    <input type="date" value={editClientData.birthday} onChange={e => setEditClientData({...editClientData, birthday: e.target.value})} style={{ width: '100%', boxSizing: 'border-box', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }} />
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: 'bold', color: '#0056b3' }}>Возраст (если нет ДР)</label>
                    <input type="text" placeholder="33 или 30+" value={editClientData.age} onChange={e => setEditClientData({...editClientData, age: e.target.value})} style={{ width: '100%', boxSizing: 'border-box', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }} />
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: 'bold', color: '#0056b3' }}>Пол</label>
                    <select value={editClientData.gender} onChange={e => setEditClientData({...editClientData, gender: e.target.value})} style={{ width: '100%', boxSizing: 'border-box', padding: '8px', border: '1px solid #ddd', borderRadius: '4px', height: '38px' }}>
                      <option value="">Не указан</option>
                      <option value="female">Женский</option>
                      <option value="male">Мужской</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: 'bold', color: '#0056b3' }}>Рост (см)</label>
                    <input type="number" value={editClientData.height} onChange={e => setEditClientData({...editClientData, height: e.target.value})} style={{ width: '100%', boxSizing: 'border-box', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }} />
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: 'bold', color: '#0056b3' }}>Вес (кг)</label>
                    <input type="number" value={editClientData.weight} onChange={e => setEditClientData({...editClientData, weight: e.target.value})} style={{ width: '100%', boxSizing: 'border-box', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }} />
                  </div>

                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: 'bold', color: '#0056b3' }}>Адрес</label>
                    <input type="text" value={editClientData.address} onChange={e => setEditClientData({...editClientData, address: e.target.value})} style={{ width: '100%', boxSizing: 'border-box', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }} />
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: 'bold', color: '#0056b3' }}>Источник</label>
                    <select value={editClientData.source_id || ''} onChange={ e =>  setEditClientData({...editClientData, source_id: e.target.value})} style={{ width: '100%', boxSizing: 'border-box', padding: '8px', border: '1px solid #ddd', borderRadius: '4px', height: '38px' }}>
                        <option value="">Не указан</option>
                        {sources.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>  

                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: 'bold', color: '#0056b3' }}>Дети (информация)</label>
                    <textarea value={editClientData.children_info} onChange={e => setEditClientData({...editClientData, children_info: e.target.value})} style={{ width: '100%', boxSizing: 'border-box', padding: '8px', border: '1px solid #ddd', borderRadius: '4px', height: '60px' }} />
                  </div>

                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: 'bold', color: '#0056b3' }}>Заметки (общие)</label>
                    <textarea value={editClientData.notes} onChange={e => setEditClientData({...editClientData, notes: e.target.value})} style={{ width: '100%', boxSizing: 'border-box', padding: '8px', border: '1px solid #ddd', borderRadius: '4px', height: '80px' }} />
                  </div>

                  <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <input type="checkbox" id="isActive" checked={editClientData.is_active} onChange={e => setEditClientData({...editClientData, is_active: e.target.checked})} style={{ width: '18px', height: '18px' }} />
                    <label htmlFor="isActive" style={{ fontSize: '14px', fontWeight: 'bold', color: '#0056b3', cursor: 'pointer' }}>Активный клиент</label>
                  </div>

                </div>
              </div>

              {/* Кнопки управления */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px', borderTop: '1px solid #eee', paddingTop: '15px', gap: '8px' }}>
                <button 
                  type="button" 
                  onClick={() => { if(window.confirm('Удалить клиента?')) handleDelete(selectedClient.id); }}
                  title="Удалить клиента"
                  style={{ padding: '8px 12px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                >
                  <FaTrash />
                </button>
                
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button 
                    type="button" 
                    onClick={() => setSelectedClient(null)} 
                    style={{ padding: '8px 16px', border: '1px solid #ddd', borderRadius: '4px', backgroundColor: 'transparent', cursor: 'pointer' }}
                  >
                    Отмена
                  </button>
                  <button 
                    type="submit" 
                    style={{ padding: '8px 16px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                  >
                    Сохранить
                  </button>
                </div>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}