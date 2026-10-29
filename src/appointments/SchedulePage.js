// src/appointments/SchedulePage.js
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FaUser, FaMapMarkerAlt, FaStickyNote, FaTrash, FaTimes, FaSave, FaFileAlt } from 'react-icons/fa';
import API_URL from '../config/api';

// Компонент поиска клиента
function ClientSearch({ clients, value, onChange }) {
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
    <div style={{ position: 'relative' }}>
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
        style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
      />
      {isOpen && (
        <div style={{ 
          position: 'absolute', top: '100%', left: 0, right: 0, 
          backgroundColor: 'white', border: '1px solid #ddd', borderRadius: '4px', 
          maxHeight: '150px', overflowY: 'auto', zIndex: 100, boxShadow: '0 4px 8px rgba(0,0,0,0.1)' 
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
                {c.name} <span style={{color: '#999', fontSize: '11px'}}>{c.phone}</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default function SchedulePage() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  const [clients, setClients] = useState([]);
  const [services, setServices] = useState([]);
  const [locations, setLocations] = useState([]);

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

  const [newAppt, setNewAppt] = useState({
    time: '10:00', client_id: '', service_id: '', location_id: '', notes: '',
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

  const fetchData = async () => {
    try {
      setLoading(true);
      const [apptRes, cliRes, servRes, locRes] = await Promise.all([
        fetch(`${API_URL}/api/appt/schedule?date=${selectedDate}`, { credentials: 'include' }),
        fetch(`${API_URL}/api/appt/clients`, { credentials: 'include' }),
        fetch(`${API_URL}/api/appt/services`, { credentials: 'include' }),
        fetch(`${API_URL}/api/appt/locations`, { credentials: 'include' })
      ]);

      const apptData = await apptRes.json();
      const cliData = await cliRes.json();
      const servData = await servRes.json();
      const locData = await locRes.json();

      if (apptData.success) setAppointments(apptData.data);
      if (cliData.success) setClients(cliData.data);
      if (servData.success) setServices(servData.data);
      if (locData.success) setLocations(locData.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSlotClick = (time) => {
    setNewAppt({ 
      time, client_id: '', service_id: '', location_id: '', notes: '',
      buffer_before_minutes: '', buffer_after_minutes: '', duration_minutes: ''
    });
    setSelectedService(null);
    setSelectedLocation(null);
    setError('');
    setIsModalOpen(true);
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
      record_notes: newAppt.notes, // 👈 Отправляем в новое поле
      general_notes: ''            // 👈 Медицинские пока пустые
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
        record_notes: editApptData.record_notes
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

  const isMobile = window.innerWidth <= 768;

  return (
    <div className="detail-container" style={{ maxWidth: '800px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1 className="detail-title" style={{ margin: 0 }}>Расписание</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <span style={{ fontWeight: 'bold', color: '#495057', fontSize: isMobile ? '12px' : '16px' }}>{formattedDate}</span>
          <input 
            type="date" 
            value={selectedDate} 
            onChange={e => setSelectedDate(e.target.value)}
            style={{ padding: '8px', fontSize: '16px', borderRadius: '4px', border: '1px solid #ddd' }}
          />
        </div>
      </div>

      {loading ? (
        <div>Загрузка...</div>
      ) : (
        <div style={{ backgroundColor: 'white', border: '1px solid #dee2e6', borderRadius: '8px', position: 'relative' }}>
          
          <div style={{ marginLeft: '90px', position: 'relative' }}>
            
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
                    const dateStr = d.toISOString().split('T')[0];
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
                    <div style={{ fontWeight: 'bold', color: '#0d47a1', fontSize: '13px', display: 'flex', justifyContent: 'space-between' }}>
                      <span>{timeStr} — {appt.service_name}</span>
                      <span style={{ color: '#007bff', fontWeight: 'normal' }}>{appt.duration_minutes} мин</span>
                    </div>
                    
                    <div style={{ fontSize: '12px', color: '#495057', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                      <span><FaUser /> {appt.client_name || 'Без клиента'}</span>
                      {appt.location_name && <span><FaMapMarkerAlt /> {appt.location_name}</span>}
                    </div>

                    {appt.record_notes && (
                      <div style={{ fontSize: '11px', color: '#666', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <FaStickyNote /> {appt.record_notes}
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
                  position: 'relative'
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
                <div style={{ width: '80px', position: 'absolute', left: '-85px', top: '0', bottom: '0', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', fontWeight: 'bold', color: '#495057' }}>
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
            padding: '20px', 
            borderRadius: isMobile ? 0 : '8px', 
            width: isMobile ? '100vw' : '450px', 
            height: isMobile ? '100vh' : 'auto',
            maxWidth: isMobile ? '100vw' : '95%',
            overflowY: 'auto',
            boxSizing: 'border-box'
          }}>
            <h3 style={{ marginTop: 0 }}>Новый приём</h3>
            
            {error && (
              <div style={{ color: '#721c24', backgroundColor: '#f8d7da', padding: '10px', borderRadius: '4px', marginBottom: '15px', fontSize: '13px' }}>
                ⚠️ {error} <br/>
                <small>Вы можете изменить время или буферы ниже и попробовать снова.</small>
              </div>
            )}
            
            <form onSubmit={handleCreateAppointment}>
              
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px' }}>Начало</label>
                <input 
                  type="time" 
                  value={newAppt.time} 
                  onChange={e => setNewAppt({...newAppt, time: e.target.value})}
                  style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                />
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px' }}>Клиент</label>
                <ClientSearch clients={clients} value={newAppt.client_id} onChange={(id) => setNewAppt({...newAppt, client_id: id})} />
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px' }}>Услуга *</label>
                <select required value={newAppt.service_id} onChange={handleServiceChange} style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}>
                  <option value="">Выберите услугу</option>
                  {services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px' }}>Длительность (мин)</label>
                <input 
                  type="number" 
                  value={newAppt.duration_minutes !== '' ? newAppt.duration_minutes : (selectedService?.default_duration_minutes || 60)} 
                  onChange={e => setNewAppt({...newAppt, duration_minutes: e.target.value})}
                  style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }} 
                />
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px' }}>Место</label>
                <select value={newAppt.location_id} onChange={handleLocationChange} style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}>
                  <option value="">Не указано</option>
                  {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </div>

              {selectedLocation && (
                <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px' }}>Время "до" (мин)</label>
                    <input 
                      type="number" 
                      value={newAppt.buffer_before_minutes !== '' ? newAppt.buffer_before_minutes : selectedLocation.buffer_before_minutes} 
                      onChange={e => setNewAppt({...newAppt, buffer_before_minutes: e.target.value})}
                      style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px' }}>Время "после" (мин)</label>
                    <input 
                      type="number" 
                      value={newAppt.buffer_after_minutes !== '' ? newAppt.buffer_after_minutes : selectedLocation.buffer_after_minutes} 
                      onChange={e => setNewAppt({...newAppt, buffer_after_minutes: e.target.value})}
                      style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                    />
                  </div>
                </div>
              )}

              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: 'bold', color: '#0056b3' }}>Примечание к записи (адрес, детали)</label>
                <textarea 
                  value={editApptData.record_notes} 
                  onChange={e => setEditApptData({...editApptData, record_notes: e.target.value})}
                  style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px', height: '60px' }}
                />
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: 'bold', color: '#0056b3' }}>Общие заметки мастера</label>
                <textarea 
                  value={editApptData.general_notes} 
                  onChange={e => setEditApptData({...editApptData, general_notes: e.target.value})}
                  style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px', height: '50px' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
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
            padding: '20px', 
            borderRadius: isMobile ? 0 : '8px', 
            width: isMobile ? '100vw' : '500px', 
            height: isMobile ? '100vh' : 'auto',
            maxWidth: isMobile ? '100vw' : '95%',
            maxHeight: isMobile ? '100vh' : '90vh',
            overflowY: 'auto',
            boxSizing: 'border-box'
          }}>
            <h3 style={{ marginTop: 0, borderBottom: '1px solid #eee', paddingBottom: '10px' }}>
              Редактирование записи на приём
            </h3>
            
            <form onSubmit={handleUpdateAppointment}>
              
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
                <ClientSearch clients={clients} value={editApptData.client_id} onChange={(id) => setEditApptData({...editApptData, client_id: id})} />
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
                    { value: 'scheduled', label: 'Запланирован', color: '#0056b3', bg: '#e3f2fd' },
                    { value: 'completed', label: 'Выполнен', color: '#28a745', bg: '#d4edda' },
                    { value: 'canceled', label: 'Отменён', color: '#dc3545', bg: '#f8d7da' },
                    { value: 'no_show', label: 'Не пришёл', color: '#856404', bg: '#fff3cd' }
                  ].map(s => (
                    <button
                      key={s.value}
                      type="button"
                      onClick={() => setEditApptData({...editApptData, status: s.value})}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '20px',
                        fontSize: '13px',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        border: '1px solid',
                        borderColor: editApptData.status === s.value ? s.color : '#ddd',
                        backgroundColor: editApptData.status === s.value ? s.bg : 'white',
                        color: editApptData.status === s.value ? s.color : '#6c757d',
                        transition: 'all 0.2s'
                      }}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: 'bold', color: '#0056b3' }}>Примечание к записи (адрес, детали)</label>
                <textarea 
                  value={editApptData.record_notes} 
                  onChange={e => setEditApptData({...editApptData, record_notes: e.target.value})}
                  style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px', height: '40px' }}
                />
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: 'bold', color: '#0056b3' }}>Общие заметки мастера</label>
                <textarea 
                  value={editApptData.general_notes} 
                  onChange={e => setEditApptData({...editApptData, general_notes: e.target.value})}
                  style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px', height: '30px' }}
                />
              </div>

              
              {/* Кнопки управления */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px', borderTop: '1px solid #eee', paddingTop: '15px', gap: '8px' }}>
                <button 
                  type="button" 
                  onClick={handleDeleteAppointment}
                  title="Удалить запись на приём"
                  style={{ padding: '8px 12px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <FaTrash />
                </button>
                
                <div style={{ display: 'flex', gap: '8px' }}>
                  {/* Ссылка на полную карточку (иконка документа/папки) */}
                  <Link 
                    to={`/appointments/${selectedAppt.id}`} 
                    title="Открыть полную карточку приёма"
                    style={{ padding: '8px 12px', backgroundColor: '#e3f2fd', color: '#0056b3', 
                        border: 'none', borderRadius: '4px', display: 'flex', 
                        alignItems: 'center', justifyContent: 'center', textDecoration: 'none', 
                        gap: '8px',           // 👈 Вот он, отступ между иконкой и текстом
                        fontWeight: 'bold',   // 👈 Чтобы текст смотрелся аккуратнее
                        fontSize: '13px'      // 👈 Чуть уменьшим шрифт, чтобы всё влезло в один ряд
                    }}
                  >
                    <FaFileAlt />  В карточку приёма
                  </Link>

                  <button 
                    type="button" 
                    onClick={() => setSelectedAppt(null)} 
                    title="Закрыть запись на приём без сохранения"
                    style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: '4px', backgroundColor: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <FaTimes />
                  </button>
                  
                  <button 
                    type="submit" 
                    title="Сохранить запись на приём"
                    style={{ padding: '8px 12px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <FaSave />
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