// src/appointments/ClientsPage.js
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FaPlus, FaSearch, FaEdit, FaTrash, FaUser } from 'react-icons/fa';
import API_URL from '../config/api';

export default function ClientsPage() {
  const isMobile = window.innerWidth <= 768 ;
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Состояние для формы добавления
  const [showForm, setShowForm] = useState(false);
  const [newClient, setNewClient] = useState({ 
    name: '', phone: '', email: '', birthday: '', gender: '', 
    height: '', weight: '', age: '' // 👈 Доп. поля
  });

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async (query = '') => {
    try {
      setLoading(true);
      const url = query 
        ? `${API_URL}/api/appt/clients?search=${encodeURIComponent(query)}`
        : `${API_URL}/api/appt/clients`;
        
      const res = await fetch(url, { credentials: 'include' });
      const data = await res.json();
      if (data.success) setClients(data.data);
    } catch (error) {
      console.error('Ошибка загрузки клиентов:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchClients(search);
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

  const handleEditClient = async (client) => {
    const newName = window.prompt('Имя клиента:', client.name);
    if (!newName) return;
    
    const newPhone = window.prompt('Телефон:', client.phone || '');
    if (newPhone === null) return;

    const newWeight = window.prompt('Вес (кг):', client.extra_data?.weight || '');
    if (newWeight === null) return;

    try {
      const extra_data = { ...client.extra_data };
      if (newWeight) extra_data.weight = Number(newWeight);
      else delete extra_data.weight;

      const res = await fetch(`${API_URL}/api/appt/clients/${client.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: newName,
          phone: newPhone,
          email: client.email,
          birthday: client.birthday,
          gender: client.gender,
          address: client.address,
          notes: client.notes,
          extra_data // 👈 передаем обновленный JSON
        })
      });
      const data = await res.json();
      
      if (data.success) {
        setClients(clients.map(c => c.id === client.id ? data.data : c));
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
    <div className="detail-container" style={{ maxWidth: '1000px' }}>
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
          <h3 style={{ marginTop: 0 }}>Новый клиент</h3>
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

      {/* Список клиентов */}
      {loading ? (
        <div>Загрузка...</div>
      ) : clients.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', backgroundColor: '#f8f9fa', borderRadius: '8px', color: '#666' }}>
          У вас пока нет клиентов.
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '10px' }}>
          {clients.map(client => (
            <div key={client.id} style={{ padding: '15px', border: '1px solid #dee2e6', borderRadius: '8px', backgroundColor: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
    </div>
  );
}