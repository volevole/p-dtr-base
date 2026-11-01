// src/appointments/AppointmentsListPage.js
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FaSearch, FaCalendarAlt, FaUser, FaClock, FaChevronLeft, FaChevronRight, FaStickyNote, FaMapMarkerAlt } from 'react-icons/fa';
import API_URL from '../config/api';

export default function AppointmentsListPage() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  
  // Фильтры
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  // Пагинация
  const [page, setPage] = useState(0);
  const limit = 15;

  const isMobile = window.innerWidth <= 768;

  useEffect(() => {
    fetchAppointments();
  }, [page, search, startDate, endDate]);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        limit,
        offset: page * limit,
      });
      
      if (search) params.append('search', search);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const res = await fetch(`${API_URL}/api/appt/schedule/list?${params.toString()}`, { credentials: 'include' });
      const data = await res.json();
      
      if (data.success) {
        setAppointments(data.data);
        setTotal(data.total);
      }
    } catch (error) {
      console.error('Ошибка загрузки приёмов:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(0);
  };

  const clearFilters = () => {
    setSearchInput('');
    setSearch('');
    setStartDate('');
    setEndDate('');
    setPage(0);
  };

  const formatDateTime = (isoString) => {
    const d = new Date(isoString);
    return {
      date: d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' }),
      time: d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
    };
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending': return  <span style={{ color: '#856404', backgroundColor: '#fff3cd', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold' }}>Ожидает</span>;
      case 'scheduled': return <span style={{ color: '#0056b3', backgroundColor: '#e3f2fd', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold' }}>Запланирован</span>;
      case 'completed': return <span style={{ color: '#28a745', backgroundColor: '#d4edda', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold' }}>Выполнен</span>;
      case 'canceled': return <span style={{ color: '#dc3545', backgroundColor: '#f8d7da', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold' }}>Отменён</span>;
      case 'no_show': return <span style={{ color: '#856404', backgroundColor: '#fff3cd', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold' }}>Не пришёл</span>;
      default: return status;
    }
  };

  return (
    <div className="detail-container" style={{ maxWidth: '1000px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
        <h1 className="detail-title" style={{ margin: 0 }}>Все приёмы</h1>
        <div style={{ fontSize: '14px', color: '#666' }}>Всего записей: <strong>{total}</strong></div>
      </div>

      {/* Фильтры */}
      <div style={{ backgroundColor: '#f8f9fa', padding: '15px', borderRadius: '8px', border: '1px solid #dee2e6', marginBottom: '20px' }}>
        
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '10px', marginBottom: '15px', flexWrap: 'wrap' }}>
          <input 
            type="text" 
            placeholder="Поиск по клиенту или услуге..." 
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            style={{ flex: 1, minWidth: '200px', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
          />
          <button type="submit" style={{ padding: '8px 16px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <FaSearch /> Найти
          </button>
        </form>

        <div style={{ display: 'flex', gap: '15px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', fontWeight: 'bold', color: '#0056b3' }}>С даты</label>
            <input type="date" value={startDate} onChange={e => { setStartDate(e.target.value); setPage(0); }} style={{ padding: '6px', borderRadius: '4px', border: '1px solid #ddd' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', fontWeight: 'bold', color: '#0056b3' }}>По дату</label>
            <input type="date" value={endDate} onChange={e => { setEndDate(e.target.value); setPage(0); }} style={{ padding: '6px', borderRadius: '4px', border: '1px solid #ddd' }} />
          </div>
          {(search || startDate || endDate) && (
            <button onClick={clearFilters} style={{ padding: '6px 12px', backgroundColor: '#e2e3e5', color: '#383d41', border: '1px solid #d6d8db', borderRadius: '4px', cursor: 'pointer' }}>
              Сбросить фильтры
            </button>
          )}
        </div>
      </div>

      {/* Список */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>Загрузка...</div>
      ) : appointments.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', backgroundColor: '#f8f9fa', borderRadius: '8px', color: '#666' }}>
          Приёмов не найдено.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {appointments.map(appt => {
            const dt = formatDateTime(appt.appointment_date);
            return (
              <Link 
                key={appt.id} 
                to={`/appointments/${appt.id}`} 
                style={{ 
                  textDecoration: 'none', 
                  color: 'inherit', 
                  padding: '15px', 
                  border: '1px solid #dee2e6', 
                  borderRadius: '8px', 
                  backgroundColor: 'white',
                  display: 'flex',
                  flexDirection: 'column', // 👈 Теперь вся карточка — колонка
                  gap: '10px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.borderColor = '#007bff'}
                onMouseLeave={(e) => e.currentTarget.style.borderColor = '#dee2e6'}
              >
                {/* 👈 1. ШАПКА: Дата/время слева, Услуга справа (на всю ширину) */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', fontSize: '13px', borderBottom: '1px solid #f1f3f5', paddingBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#6c757d' }}>
                    <FaCalendarAlt /> {dt.date} 
                    <FaClock style={{ marginLeft: '8px' }} /> {dt.time}
                  </div>
                  <div style={{ color: '#007bff' }}>
                    {appt.service_name} <span style={{ fontWeight: 'bold', opacity: 0.8 }}>— {appt.duration_minutes} мин.</span>
                  </div>
                </div>

                {/* 👈 2. ОСНОВНАЯ ЧАСТЬ: Клиент, примечание, место (и цена/статус) */}
                <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', gap: '10px' }}>
                  
                  {/* Левая колонка с данными */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
                    
                    {/* Клиент ИЛИ Примечание */}
                    {appt.client_name ? (
                      <div style={{ fontWeight: 'bold', fontSize: '15px', color: '#212529', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <FaUser style={{ fontSize: '13px', color: '#6c757d' }}/> 
                        <span>{appt.client_name}</span> 
                        {appt.client_phone && <span style={{ fontWeight: 'normal', color: '#666', fontSize: '13px' }}>({appt.client_phone})</span>}
                      </div>
                    ) : (
                      appt.record_notes && (
                        <div style={{ fontWeight: 'bold', fontSize: '15px', color: '#495057', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <FaStickyNote style={{ fontSize: '13px', color: '#6c757d' }}/> 
                          <span>{appt.record_notes}</span>
                        </div>
                      )
                    )}
                    
                    {/* Примечание (если есть клиент) */}
                    {appt.client_name && appt.record_notes && (
                      <div style={{ fontSize: '12px', color: '#666', fontStyle: 'italic', display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                        <FaStickyNote style={{ fontSize: '12px', color: '#adb5bd', marginTop: '3px' }}/> 
                        <span>{appt.record_notes}</span>
                      </div>
                    )}

                    {/* Место */}
                    {appt.location_name && (
                      <div style={{ fontSize: '12px', color: '#495057', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <FaMapMarkerAlt style={{ fontSize: '12px', color: '#6c757d' }}/> 
                        <span>{appt.location_name}</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Правая колонка с ценой и статусом */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flexShrink: 0 }}>
                    <div style={{ fontWeight: 'bold', fontSize: '15px', color: '#28a745' }}>
                      {appt.final_price} ₽
                    </div>
                    {getStatusBadge(appt.status)}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Пагинация */}
      {total > limit && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '15px', marginTop: '20px' }}>
          <button 
            disabled={page === 0} 
            onClick={() => setPage(p => Math.max(0, p - 1))}
            style={{ padding: '8px 12px', borderRadius: '4px', border: '1px solid #ddd', backgroundColor: page === 0 ? '#f8f9fa' : 'white', cursor: page === 0 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center' }}
          >
            <FaChevronLeft /> Назад
          </button>
          <span style={{ fontSize: '14px', color: '#666' }}>
            Стр. {page + 1} из {Math.ceil(total / limit)}
          </span>
          <button 
            disabled={page >= Math.ceil(total / limit) - 1} 
            onClick={() => setPage(p => p + 1)}
            style={{ padding: '8px 12px', borderRadius: '4px', border: '1px solid #ddd', backgroundColor: page >= Math.ceil(total / limit) - 1 ? '#f8f9fa' : 'white', cursor: page >= Math.ceil(total / limit) - 1 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center' }}
          >
            Вперед <FaChevronRight />
          </button>
        </div>
      )}
    </div>
  );
}