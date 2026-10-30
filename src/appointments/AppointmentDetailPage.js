// src/appointments/AppointmentDetailPage.js
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { FaArrowLeft, FaSave, FaUser, FaCalendarAlt, FaClock, FaTooth, FaStickyNote } from 'react-icons/fa';
import API_URL from '../config/api';
import { SPECIALIZATION_CONFIG, renderSpecializationField } from './specializationFields';

export default function AppointmentDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [appt, setAppt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Поля для редактирования
  const [chiefComplaint, setChiefComplaint] = useState('');
  const [generalNotes, setGeneralNotes] = useState('');
  
  // Для будущих специфичных полей (зубы, глаза и т.д.)
  const [specializationData, setSpecializationData] = useState({});

  useEffect(() => {
    fetchAppointment();
  }, [id]);

  const fetchAppointment = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/api/appt/schedule/${id}`, { credentials: 'include' });
      const data = await res.json();
      
      if (data.success) {
        setAppt(data.data);
        setChiefComplaint(data.data.chief_complaint || '');
        setGeneralNotes(data.data.general_notes || '');
        setSpecializationData(data.data.specialization_data || {});
      } else {
        setError(data.error || 'Приём не найден');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      // Собираем данные для сохранения
      // В будущем сюда же будем класть specializationData
      const payload = {
        ...appt,
        chief_complaint: chiefComplaint,
        general_notes: generalNotes,
        specialization_data: specializationData
      };

      const res = await fetch(`${API_URL}/api/appt/schedule/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload)
      });
      
      const data = await res.json();
      if (data.success) {
        alert('✅ Карточка приёма сохранена');
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // Функция для быстрой смены статуса прямо из карточки
  const updateStatusQuick = async (newStatus) => {
    setSaving(true);
    try {
      // Берем текущие данные приёма и меняем только статус
      const payload = {
        ...appt,
        status: newStatus,
        chief_complaint: chiefComplaint, // сохраняем то, что уже ввели
        general_notes: generalNotes
      };

      const res = await fetch(`${API_URL}/api/appt/schedule/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload)
      });
      
      const data = await res.json();
      if (data.success) {
        setAppt(prev => ({ ...prev, status: newStatus })); // Обновляем визуально
      } else {
        alert('Ошибка: ' + data.error);
      }
    } catch (err) {
      alert('Ошибка сети: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}>Загрузка карточки...</div>;
  if (error && !appt) return <div style={{ padding: '40px', color: '#dc3545' }}>Ошибка: {error}</div>;
  if (!appt) return null;

  const apptDate = new Date(appt.appointment_date);
  const dateStr = apptDate.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const timeStr = apptDate.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

  
  return (
    <div className="detail-container" style={{ maxWidth: '900px' }}>
      
            {/* Шапка */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <button onClick={() => navigate(-1)} style={{ padding: '8px 12px', backgroundColor: '#e9ecef', border: 'none', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 'bold' }}>
          <FaArrowLeft /> Назад
        </button>
        
        <h1 className="detail-title" style={{ margin: 0, flex: 1 }}>Карточка приёма</h1>

        {/* 👈 Кнопка быстрого завершения */}
        {appt.status === 'scheduled' && (
          <button 
            onClick={() => updateStatusQuick('completed')}
            disabled={saving}
            style={{ padding: '10px 20px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: saving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold' }}
          >
            ✅ Завершить приём
          </button>
        )}

        <button 
          onClick={handleSave} 
          disabled={saving}
          style={{ padding: '10px 20px', backgroundColor: saving ? '#6c757d' : '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: saving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold' }}
        >
          <FaSave /> {saving ? 'Сохранение...' : 'Сохранить'}
        </button>
      </div>

      {error && (
        <div style={{ backgroundColor: '#f8d7da', color: '#721c24', padding: '10px', borderRadius: '4px', marginBottom: '20px' }}>
          ⚠️ {error}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
        
        {/* Информация о приёме */}
        <div style={{ backgroundColor: '#f8f9fa', padding: '20px', borderRadius: '8px', border: '1px solid #dee2e6' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', justifyContent: 'space-between' }}>
            
            <div>
              <div style={{ fontSize: '13px', color: '#6c757d', marginBottom: '4px' }}>Клиент</div>
              <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#0d47a1', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FaUser /> {appt.client_name || 'Без клиента'}
              </div>
              {appt.client_phone && <div style={{ fontSize: '13px', color: '#495057' }}>{appt.client_phone}</div>}
            </div>

            <div>
              <div style={{ fontSize: '13px', color: '#6c757d', marginBottom: '4px' }}>Услуга</div>
              <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#0d47a1' }}>{appt.service_name}</div>
              <div style={{ fontSize: '13px', color: '#495057' }}>{appt.duration_minutes} мин. • {appt.final_price} ₽</div>
            </div>

            <div>
              <div style={{ fontSize: '13px', color: '#6c757d', marginBottom: '4px' }}>Дата и время</div>
              <div style={{ fontSize: '15px', fontWeight: 'bold', color: '#0d47a1', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FaCalendarAlt /> {dateStr}
              </div>
              <div style={{ fontSize: '14px', color: '#495057', display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                <FaClock /> {timeStr}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '13px', color: '#6c757d', marginBottom: '4px' }}>Статус</div>
              <div style={{ padding: '4px 12px', backgroundColor: '#e3f2fd', color: '#0056b3', borderRadius: '12px', fontSize: '13px', fontWeight: 'bold', textAlign: 'center' }}>
                {appt.status === 'scheduled' ? 'Запланирован' : appt.status === 'completed' ? 'Выполнен' : appt.status}
              </div>
            </div>

          </div>

          {/* 👈 Блок примечания к записи */}
          {appt.record_notes && (
            <div style={{ marginTop: '15px', paddingTop: '15px', borderTop: '1px solid #dee2e6', display: 'flex', alignItems: 'center', gap: '8px', color: '#856404' }}>
              <FaStickyNote /> 
              <span style={{ fontSize: '14px' }}><strong>Примечание:</strong> {appt.record_notes}</span>
            </div>
          )}

        </div>

        {/* Медицинские данные */}
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', border: '1px solid #dee2e6' }}>
          <h3 style={{ marginTop: 0, borderBottom: '1px solid #eee', paddingBottom: '10px', color: '#0d47a1' }}>Медицинская карта</h3>
          
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 'bold', color: '#0056b3' }}>
              Жалобы (Chief Complaint)
            </label>
            <textarea 
              value={chiefComplaint}
              onChange={e => setChiefComplaint(e.target.value)}
              placeholder="На что жалуется клиент? (боль, ограничение движения и т.д.)"
              style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px', minHeight: '80px', fontSize: '14px' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 'bold', color: '#0056b3' }}>
              Общие заметки мастера
            </label>
            <textarea 
              value={generalNotes}
              onChange={e => setGeneralNotes(e.target.value)}
              placeholder="Ход сеанса, результаты тестов, рекомендации..."
              style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px', minHeight: '120px', fontSize: '14px' }}
            />
          </div>
        </div>

        {/* Блок специализации (Динамический) */}
        {appt.specialization_code && SPECIALIZATION_CONFIG[appt.specialization_code] ? (
          <div style={{ backgroundColor: '#f0f7ff', padding: '20px', borderRadius: '8px', border: '1px solid #cce5ff' }}>
            <h3 style={{ marginTop: 0, borderBottom: '1px solid #cce5ff', paddingBottom: '10px', color: '#004085', display: 'flex', alignItems: 'center', gap: '8px' }}>
              {SPECIALIZATION_CONFIG[appt.specialization_code].icon} {SPECIALIZATION_CONFIG[appt.specialization_code].title}
            </h3>
            
            {/* Вызываем наш рендерер из specializationFields.js */}
            {renderSpecializationField(appt.specialization_code, specializationData, setSpecializationData)}
            
          </div>
        ) : (
          <div style={{ backgroundColor: '#f8f9fa', padding: '20px', borderRadius: '8px', border: '1px solid #dee2e6', textAlign: 'center', color: '#6c757d', fontSize: '14px' }}>
            Для этой услуги не предусмотрены специфические поля.
          </div>
        )}

      </div>
    </div>
  );
}