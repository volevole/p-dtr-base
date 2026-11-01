// src/appointments/AppointmentDetailPage.js
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { FaArrowLeft, FaSave, FaUser, FaCalendarAlt, FaClock, FaStickyNote, FaList, FaFileAlt } from 'react-icons/fa';
import API_URL from '../config/api';
import { SPECIALIZATION_CONFIG, renderSpecializationField } from './specializationFields';

export default function AppointmentDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [appt, setAppt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Поля для редактирования
  const [chiefComplaint, setChiefComplaint] = useState('');
  const [generalNotes, setGeneralNotes] = useState('');

  // Финансы и абонемент — храним как строки, чтобы можно было полностью очистить поле
  const [basePrice, setBasePrice] = useState('');
  const [discountAmount, setDiscountAmount] = useState('');
  const [finalPrice, setFinalPrice] = useState('');
  const [subscriptionInfo, setSubscriptionInfo] = useState('');

  // Специфичные поля
  const [specializationData, setSpecializationData] = useState({});

  const isMobile = window.innerWidth <= 768;

  useEffect(() => {
    fetchAppointment();
  }, [id]);

  const fetchAppointment = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/api/appt/schedule/${id}`, { credentials: 'include' });
      const data = await res.json();

      if (data.success) {
        const a = data.data;
        setAppt(a);
        setChiefComplaint(a.chief_complaint || '');
        setGeneralNotes(a.general_notes || '');

        // 👈 Пустая строка, если значения нет — чтобы поле можно было очистить
        setBasePrice(a.base_price != null ? String(a.base_price) : '');
        setDiscountAmount(a.discount_amount != null ? String(a.discount_amount) : '');
        setFinalPrice(a.final_price != null ? String(a.final_price) : '');
        setSubscriptionInfo(a.subscription_info || '');

        setSpecializationData(a.specialization_data || {});
      } else {
        setError(data.error || 'Приём не найден');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Пересчёт итога при изменении базы/скидки
  const recalcFinal = (newBase, newDiscount) => {
    const b = newBase === '' ? 0 : Number(newBase);
    const d = newDiscount === '' ? 0 : Number(newDiscount);
    setFinalPrice(String(Math.max(0, b - d)));
  };

  const handleBasePriceChange = (e) => {
    const v = e.target.value;
    setBasePrice(v);
    recalcFinal(v, discountAmount);
  };

  const handleDiscountChange = (e) => {
    const v = e.target.value;
    setDiscountAmount(v);
    recalcFinal(basePrice, v);
  };

  const buildPayload = (overrides = {}) => ({
    ...appt,
    chief_complaint: chiefComplaint,
    general_notes: generalNotes,
    base_price: basePrice === '' ? 0 : Number(basePrice),
    discount_amount: discountAmount === '' ? 0 : Number(discountAmount),
    final_price: finalPrice === '' ? 0 : Number(finalPrice),
    subscription_info: subscriptionInfo,
    specialization_data: specializationData,
    ...overrides
  });

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/api/appt/schedule/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(buildPayload())
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

  const updateStatusQuick = async (newStatus) => {
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/api/appt/schedule/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(buildPayload({ status: newStatus }))
      });

      const data = await res.json();
      if (data.success) {
        setAppt(prev => ({ ...prev, status: newStatus }));
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

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending': return <span style={{ color: '#856404', backgroundColor: '#fff3cd', padding: '4px 12px', borderRadius: '12px', fontSize: '13px', fontWeight: 'bold' }}>Ожидает</span>;
      case 'scheduled': return <span style={{ color: '#0056b3', backgroundColor: '#e3f2fd', padding: '4px 12px', borderRadius: '12px', fontSize: '13px', fontWeight: 'bold' }}>Запланирован</span>;
      case 'completed': return <span style={{ color: '#28a745', backgroundColor: '#d4edda', padding: '4px 12px', borderRadius: '12px', fontSize: '13px', fontWeight: 'bold' }}>Выполнен</span>;
      case 'canceled': return <span style={{ color: '#dc3545', backgroundColor: '#f8d7da', padding: '4px 12px', borderRadius: '12px', fontSize: '13px', fontWeight: 'bold' }}>Отменён</span>;
      case 'no_show': return <span style={{ color: '#6c757d', backgroundColor: '#e2e3e5', padding: '4px 12px', borderRadius: '12px', fontSize: '13px', fontWeight: 'bold' }}>Не пришёл</span>;
      default: return status;
    }
  };

  return (
    <div className="detail-container" style={{ maxWidth: '900px' }}>

      <div style={{ textAlign: 'center', marginBottom: '20px' }}>
        <h1 className="detail-title" style={{ margin: 0, display: 'inline-block' }}>Карточка приёма</h1>
      </div>

      {error && (
        <div style={{ backgroundColor: '#f8d7da', color: '#721c24', padding: '10px', borderRadius: '4px', marginBottom: '20px' }}>
          ⚠️ {error}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px', paddingBottom: '80px' }}>

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
              <div style={{ fontSize: '13px', color: '#495057' }}>{appt.duration_minutes} мин.</div>
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
              <div>{getStatusBadge(appt.status)}</div>
            </div>

          </div>

          {appt.record_notes && (
            <div style={{ marginTop: '15px', paddingTop: '15px', borderTop: '1px solid #dee2e6', display: 'flex', alignItems: 'center', gap: '8px', color: '#856404' }}>
              <FaStickyNote />
              <span style={{ fontSize: '14px' }}><strong>Примечание:</strong> {appt.record_notes}</span>
            </div>
          )}
        </div>

        {/* Финансы и Абонемент */}
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', border: '1px solid #dee2e6' }}>
          <h3 style={{ marginTop: 0, borderBottom: '1px solid #eee', paddingBottom: '10px', color: '#0d47a1' }}>Финансы и абонемент</h3>

          <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', marginBottom: '15px' }}>
            <div style={{ flex: 1, minWidth: '150px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: 'bold', color: '#0056b3' }}>Базовая цена (руб)</label>
              <input
                type="number"
                value={basePrice}
                onChange={handleBasePriceChange}
                placeholder="0"
                style={{ width: '100%', height: '38px', boxSizing: 'border-box', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
              />
            </div>
            <div style={{ flex: 1, minWidth: '150px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: 'bold', color: '#0056b3' }}>Скидка (руб)</label>
              <input
                type="number"
                value={discountAmount}
                onChange={handleDiscountChange}
                placeholder="0"
                style={{ width: '100%', height: '38px', boxSizing: 'border-box', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
              />
            </div>
            <div style={{ flex: 1, minWidth: '150px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: 'bold', color: '#28a745' }}>Итого (руб)</label>
              <input
                type="number"
                value={finalPrice}
                onChange={e => setFinalPrice(e.target.value)}
                placeholder="0"
                style={{ width: '100%', height: '38px', boxSizing: 'border-box', padding: '8px', border: '1px solid #ddd', borderRadius: '4px', fontWeight: 'bold', color: '#28a745' }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: 'bold', color: '#0056b3' }}>Информация об абонементе</label>
            <input
              type="text"
              value={subscriptionInfo}
              onChange={e => setSubscriptionInfo(e.target.value)}
              placeholder="Например: Абонемент №123, 3 из 10"
              style={{ width: '100%', height: '38px', boxSizing: 'border-box', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
            />
          </div>
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
              style={{ width: '100%', boxSizing: 'border-box', padding: '10px', border: '1px solid #ddd', borderRadius: '4px', minHeight: '80px', fontSize: '14px' }}
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
              style={{ width: '100%', boxSizing: 'border-box', padding: '10px', border: '1px solid #ddd', borderRadius: '4px', minHeight: '120px', fontSize: '14px' }}
            />
          </div>
        </div>

        {/* Блок специализации (Динамический) */}
        {appt.specialization_code && SPECIALIZATION_CONFIG[appt.specialization_code] ? (
          <div style={{ backgroundColor: '#f0f7ff', padding: '20px', borderRadius: '8px', border: '1px solid #cce5ff' }}>
            <h3 style={{ marginTop: 0, borderBottom: '1px solid #cce5ff', paddingBottom: '10px', color: '#004085', display: 'flex', alignItems: 'center', gap: '8px' }}>
              {SPECIALIZATION_CONFIG[appt.specialization_code].icon} {SPECIALIZATION_CONFIG[appt.specialization_code].title}
            </h3>
            {renderSpecializationField(appt.specialization_code, specializationData, setSpecializationData)}
          </div>
        ) : (
          <div style={{ backgroundColor: '#f8f9fa', padding: '20px', borderRadius: '8px', border: '1px solid #dee2e6', textAlign: 'center', color: '#6c757d', fontSize: '14px' }}>
            Для этой услуги не предусмотрены специфические поля.
          </div>
        )}

      </div>

            {/* 👈 ЛИПКАЯ ПАНЕЛЬ КНОПОК ВНИЗУ */}
        <div style={{
            position: 'sticky',
            bottom: 0,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '15px',
            backgroundColor: 'white',
            borderTop: '1px solid #dee2e6',
            boxShadow: '0 -4px 10px rgba(0,0,0,0.05)',
            zIndex: 100,
            margin: '0 -20px -20px -20px',
            flexWrap: 'wrap',
            gap: '10px'
        }}>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>

            {/* Кнопка "К сетке" — на мобилке стрелка + FaList */}
            <button
                onClick={() => navigate(-1)}
                title="Вернуться к сетке расписания (к списку приёмов на день)"
                style={{ padding: '8px 12px', backgroundColor: '#e9ecef', border: 'none', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 'bold', fontSize: '14px', color: '#495057' }}
            >
                <FaArrowLeft />
                {!isMobile && <><FaList /> К сетке</>}
                {isMobile && <FaList />}
            </button>

            {/* Кнопка "К записи" — на мобилке стрелка + карточка */}
            <Link
                to={`/appointments/schedule?date=${appt.appointment_date.split('T')[0]}&openApptId=${appt.id}`}
                title="Открыть эту запись в модальном окне на сетке расписания (на дату приёма)"
                style={{ padding: '8px 12px', backgroundColor: '#fff3cd', color: '#856404', border: '1px solid #ffc107', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 'bold', textDecoration: 'none', fontSize: '14px' }}
            >
                <FaArrowLeft />
                {!isMobile ? <><FaFileAlt /> К записи</> : <FaFileAlt />}
            </Link>
            </div>

            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            {appt.status === 'pending' && (
                <button
                onClick={() => updateStatusQuick('scheduled')}
                disabled={saving}
                title="Подтвердить запись: перевести статус в «Запланирован»"
                style={{ padding: '10px 20px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: saving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', fontSize: '14px' }}
                >
                📅 {!isMobile && 'Подтвердить'}
                </button>
            )}

            {appt.status === 'scheduled' && (
                <button
                onClick={() => updateStatusQuick('completed')}
                disabled={saving}
                title="Завершить приём: перевести статус в «Выполнен» и сохранить карточку"
                style={{ padding: '10px 20px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: saving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', fontSize: '14px' }}
                >
                ✅ Завершить
                </button>
            )}

            <button
                onClick={handleSave}
                disabled={saving}
                title="Сохранить изменения карточки приёма (включая финансы, кастомные поля и заметки)"
                style={{ padding: '10px 20px', backgroundColor: saving ? '#6c757d' : '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: saving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', fontSize: '14px' }}
            >
                <FaSave /> {!isMobile && (saving ? 'Сохранение...' : 'Сохранить')}
            </button>
            </div>
        </div>

    </div>
  );
}