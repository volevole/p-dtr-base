// src/appointments/AppointmentDetailPage.js
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { FaArrowLeft, FaSave, FaUser, FaCalendarAlt, FaClock, FaStickyNote, FaList, FaFileAlt, FaEllipsisV } from 'react-icons/fa';
import API_URL from '../config/api';
import { SPECIALIZATION_CONFIG, renderSpecializationField } from './specializationFields';
import { formatPhone } from '../utils/formatPhone';
import ButtonWithTooltip from '../components/ButtonWithTooltip';


export default function AppointmentDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [appt, setAppt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  
  const [clientAppts, setClientAppts] = useState([]);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

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

// Загружаем все приёмы этого клиента для навигации
  useEffect(() => {
    if (!appt || !appt.client_id) {
      setClientAppts([]);
      return;
    }
    
    const fetchClientHistory = async () => {
      try {
        // Используем наш список с поиском по ID клиента (если бэк поддерживает) 
        // Или просто загружаем все приёмы и фильтруем
        const res = await fetch(`${API_URL}/api/appt/schedule/list?limit=100`, { credentials: 'include' });
        const data = await res.json();
        if (data.success) {
          // Оставляем только приёмы этого клиента и сортируем по дате
          const history = data.data
            .filter(a => a.client_id === appt.client_id)
            .sort((a, b) => new Date(a.appointment_date) - new Date(b.appointment_date));
          setClientAppts(history);
        }
      } catch (err) {
        console.error('Ошибка загрузки истории клиента:', err);
      }
    };
    
    fetchClientHistory();
  }, [appt]);

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

    const buildPayload = (overrides = {}) => {
    // Пересобираем дату, чтобы избежать скачка времени при сохранении
    const d = new Date(appt.appointment_date);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const timeStr = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    const localDateTime = `${dateStr}T${timeStr}:00`;

    return {
      client_id: appt.client_id,
      service_id: appt.service_id,
      location_id: appt.location_id,
      appointment_date: localDateTime, // 👈 Отправляем локальное время
      duration_minutes: appt.duration_minutes,
      buffer_before_minutes: appt.buffer_before_minutes,
      buffer_after_minutes: appt.buffer_after_minutes,
      
      // Наши изменяемые поля
      chief_complaint: chiefComplaint,
      general_notes: generalNotes,
      base_price: basePrice === '' ? 0 : Number(basePrice),
      discount_amount: discountAmount === '' ? 0 : Number(discountAmount),
      final_price: finalPrice === '' ? 0 : Number(finalPrice),
      subscription_info: subscriptionInfo,
      specialization_data: specializationData,
      
      status: appt.status, // статус по умолчанию
      record_notes: appt.record_notes,
      ...overrides
    };
  };

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

  //Создать копию этого приёма на то же время, на дней вперёд
  const handleDuplicateToDate = async (daysToAdd) => {
    if (!window.confirm(`Создать копию этого приёма на ${daysToAdd === 1 ? 'завтра' : 'следующую неделю'}?`)) {
      return;
    }
    setIsMenuOpen(false);
    setSaving(true);

    try {
      // Вычисляем новую дату
      const originalDate = new Date(appt.appointment_date);
      originalDate.setDate(originalDate.getDate() + daysToAdd); // Прибавляем дни

      // Форматируем в YYYY-MM-DDTHH:mm:00
      const yyyy = originalDate.getFullYear();
      const mm = String(originalDate.getMonth() + 1).padStart(2, '0');
      const dd = String(originalDate.getDate()).padStart(2, '0');
      const hh = String(originalDate.getHours()).padStart(2, '0');
      const min = String(originalDate.getMinutes()).padStart(2, '0');
      const newDateTime = `${yyyy}-${mm}-${dd}T${hh}:${min}:00`;

      const payload = {
        client_id: appt.client_id,
        service_id: appt.service_id,
        location_id: appt.location_id,
        appointment_date: newDateTime,
        duration_minutes: appt.duration_minutes,
        buffer_before_minutes: appt.buffer_before_minutes,
        buffer_after_minutes: appt.buffer_after_minutes,
        base_price: appt.base_price,
        discount_amount: appt.discount_amount,
        final_price: appt.final_price,
        status: 'scheduled',
        general_notes: '',
        record_notes: appt.record_notes,
        subscription_info: appt.subscription_info,
        chief_complaint: '',
        specialization_data: {}
      };

      const res = await fetch(`${API_URL}/api/appt/schedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload)
      });
      
      const data = await res.json();
      
      if (data.success) {
        alert(`✅ Приём успешно перенесён на ${daysToAdd === 1 ? 'завтра' : 'через неделю'}!`);
        // Переходим на новую карточку (или можно вернуться в сетку)
        navigate(`/appointments/${data.data.id}`);
      } else {
        alert('Ошибка при копировании: ' + data.error);
      }
    } catch (err) {
      alert('Ошибка сети: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

    const handleShare = async () => {
    // 1. Формируем базовую часть
    const dateStr = new Date(appt.appointment_date).toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    const timeStr = new Date(appt.appointment_date).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    
    let text = `📅 Приём: ${dateStr} в ${timeStr}\n`;
    text += `👤 Клиент: ${appt.client_name || 'Без клиента'}\n`;
    if (appt.client_phone) text += `📞 Телефон: ${appt.client_phone}\n`;
    
    text += `💆 Услуга: ${appt.service_name} (${appt.duration_minutes} мин)\n`;
    if (appt.location_name) text += `📍 Место: ${appt.location_name}\n`;
    
    // 2. Добавляем медицинские данные (если есть)
    if (appt.chief_complaint) {
      text += `\n🩺 Жалобы:\n${appt.chief_complaint}\n`;
    }
    
    // 3. Добавляем общие заметки мастера
    if (appt.general_notes) {
      text += `\n📋 Общие заметки:\n${appt.general_notes}\n`;
    }

    // 4. Добавляем примечание к записи
    if (appt.record_notes) {
      text += `\n📝 Примечание (адрес/детали):\n${appt.record_notes}\n`;
    }

    // 5. Добавляем кастомные поля специализации (очки, параметры и т.д.)
    if (appt.specialization_data && Object.keys(appt.specialization_data).length > 0) {
      text += `\n📊 Специфические данные:\n`;
      for (const [key, value] of Object.entries(appt.specialization_data)) {
        // Пропускаем пустые значения, чтобы не засорять текст
        if (value !== null && value !== '' && value !== undefined) {
           // Если значение — это массив (например, несколько чекбоксов), склеиваем его
           const displayValue = Array.isArray(value) ? value.join(', ') : value;
           text += `- ${key}: ${displayValue}\n`;
        }
      }
    }

    text += `\nСгенерировано в Ларчик P-DTR`;

    // 6. Отправка (системное меню или копирование)
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Детали приёма', text: text });
        return;
      } catch (err) {
        if (err.name === 'AbortError') return; 
      }
    }

    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.style.position = "fixed";
        textArea.style.left = "-999999px";
        textArea.style.top = "-999999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      alert('✅ Полный текст с заметками скопирован в буфер обмена!');
    } catch (err) {
      alert('Не удалось скопировать текст: ' + err.message);
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

// Находим текущий индекс в истории приёмов этого клиента
  const currentIndex = clientAppts.findIndex(a => a.id === appt.id);
  const prevAppt = currentIndex > 0 ? clientAppts[currentIndex - 1] : null;
  const nextAppt = currentIndex !== -1 && currentIndex < clientAppts.length - 1 ? clientAppts[currentIndex + 1] : null;


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
    <div className="detail-container" style={{ 
      maxWidth: '900px', 
      padding: isMobile ? '0px' : '32px', // 👈 Уменьшаем отступы на мобилке      
       boxSizing: 'border-box' 
      }}>

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
              {appt.client_phone && <div style={{ fontSize: '13px', color: '#495057' }}>{formatPhone(appt.client_phone)}</div>}
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
            // 👈 На ПК разносим по краям, на телефоне центрируем
            justifyContent: isMobile ? 'center' : 'space-between', 
            alignItems: 'center',
            // 👈 На ПК возвращаем нормальные отступы
            padding: isMobile ? '6px 4px' : '12px 20px', 
            backgroundColor: 'white',
            borderTop: '1px solid #dee2e6',
            boxShadow: '0 -4px 10px rgba(0,0,0,0.05)',
            zIndex: 100,
            margin: 0,
            flexWrap: isMobile ? 'nowrap' : 'wrap', // 👈 На ПК разрешаем перенос, если не влезет
            gap: isMobile ? '4px' : '10px'
        }}>
          
          {/* 1. ЛЕВЫЙ БЛОК: К сетке и К записи */}
          <div style={{ display: 'flex', gap: isMobile ? '3px' : '10px' }}>
              <ButtonWithTooltip
                  onClick={() => navigate(`/appointments/schedule?date=${appt.appointment_date.split('T')[0]}`)}
                  tooltip="К сетке"
                  style={{ padding: isMobile ? '4px 6px' : '8px 12px', backgroundColor: '#e9ecef', border: 'none', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: isMobile ? '3px' : '6px', fontWeight: 'bold', fontSize: isMobile ? '11px' : '14px', color: '#495057' }}
              >
                  <FaArrowLeft size={isMobile ? 11 : 14} />
                  {isMobile ? <FaList size={11} /> : 'К сетке'}
              </ButtonWithTooltip>

              <ButtonWithTooltip
                  to={`/appointments/schedule?date=${appt.appointment_date.split('T')[0]}&openApptId=${appt.id}`}
                  tooltip="К записи"
                  style={{ padding: isMobile ? '4px 6px' : '8px 12px', backgroundColor: '#fff3cd', color: '#856404', border: '1px solid #ffc107', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: isMobile ? '3px' : '6px', fontWeight: 'bold', fontSize: isMobile ? '11px' : '14px' }}
              >
                  <FaArrowLeft size={isMobile ? 11 : 14} />
                  {isMobile ? <FaFileAlt size={11} /> : 'К записи'}
              </ButtonWithTooltip>
          </div>

          {/* 2. ЦЕНТРАЛЬНЫЙ БЛОК: Навигация и Меню */}
          <div style={{ display: 'flex', gap: isMobile ? '3px' : '10px', alignItems: 'center' }}>
              <ButtonWithTooltip
                  onClick={() => prevAppt && navigate(`/appointments/${prevAppt.id}`)}
                  disabled={!prevAppt}
                  tooltip={prevAppt ? "Назад" : "Нет прошлых"}
                  style={{ padding: isMobile ? '4px 6px' : '8px 12px', backgroundColor: '#f8f9fa', border: '1px solid #dee2e6', borderRadius: '4px', cursor: prevAppt ? 'pointer' : 'not-allowed', color: '#495057', opacity: prevAppt ? 1 : 0.4 }}
              >
                  <FaArrowLeft size={isMobile ? 11 : 14} />
              </ButtonWithTooltip>
              
              <div style={{ position: 'relative' }}>
                  <ButtonWithTooltip
                      onClick={() => setIsMenuOpen(!isMenuOpen)}
                      tooltip="Меню"
                      style={{ padding: isMobile ? '4px 8px' : '8px 16px', backgroundColor: '#f8f9fa', border: '1px solid #dee2e6', borderRadius: '4px', cursor: 'pointer', color: '#495057' }}
                  >
                      <FaEllipsisV size={isMobile ? 11 : 14} />
                  </ButtonWithTooltip>
                  {/* Выпадающее меню */}
                  {isMenuOpen && (
                      <>
                          <div onClick={() => setIsMenuOpen(false)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 999 }} />
                                                      <div style={{ position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)', marginBottom: '8px', backgroundColor: 'white', border: '1px solid #dee2e6', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', zIndex: 1000, display: 'flex', flexDirection: 'column', minWidth: isMobile ? '180px' : '220px', overflow: 'hidden' }}>
                              
                              <button 
                                onClick={() => { handleShare(); setIsMenuOpen(false); }} 
                                style={{ padding: isMobile ? '8px 12px' : '10px 15px', border: 'none', background: 'transparent', textAlign: 'left', cursor: 'pointer', borderBottom: '1px solid #eee', fontSize: isMobile ? '13px' : '14px' }}
                              >
                                🔗 Поделиться
                              </button>

                              {/* 👈 Дублировать на завтра */}
                              <button 
                                onClick={() => handleDuplicateToDate(1)} 
                                style={{ padding: isMobile ? '8px 12px' : '10px 15px', border: 'none', background: 'transparent', textAlign: 'left', cursor: 'pointer', borderBottom: '1px solid #eee', fontSize: isMobile ? '13px' : '14px' }}
                              >
                                📅 Дублировать запись на завтра
                              </button>

                              {/* 👈 Дублировать через неделю */}
                              <button 
                                onClick={() => handleDuplicateToDate(7)} 
                                style={{ padding: isMobile ? '8px 12px' : '10px 15px', border: 'none', background: 'transparent', textAlign: 'left', cursor: 'pointer', borderBottom: '1px solid #eee', fontSize: isMobile ? '13px' : '14px' }}
                              >
                                📅 Дублировать запись через неделю
                              </button>
                              
                              {/* 👈 Удалить (с красивой обработкой ошибки) */}
                              <button 
                                onClick={async () => { 
                                  if (window.confirm('Удалить этот приём безвозвратно?')) {
                                    try {
                                      const res = await fetch(`${API_URL}/api/appt/schedule/${appt.id}`, { method: 'DELETE', credentials: 'include' });
                                      
                                      // 👈 Читаем текст ошибки с сервера, если запрос не прошел
                                      if (res.ok) {
                                        setIsMenuOpen(false);
                                        navigate(-1);
                                      } else {
                                        const errData = await res.json();
                                        alert('Ошибка сервера: ' + (errData.error || res.status));
                                      }
                                    } catch (e) {
                                      alert('Ошибка сети: ' + e.message);
                                    }
                                  }
                                  setIsMenuOpen(false); 
                                }} 
                                style={{ padding: isMobile ? '8px 12px' : '10px 15px', border: 'none', background: 'transparent', textAlign: 'left', cursor: 'pointer', color: '#dc3545', fontSize: isMobile ? '13px' : '14px' }}
                              >
                                🗑️ Удалить
                              </button>
                          </div>
                      </>
                  )}
              </div>

              <ButtonWithTooltip
                  onClick={() => nextAppt && navigate(`/appointments/${nextAppt.id}`)}
                  disabled={!nextAppt}
                  tooltip={nextAppt ? "Вперед" : "Нет будущих"}
                  style={{ padding: isMobile ? '4px 6px' : '8px 12px', backgroundColor: '#f8f9fa', border: '1px solid #dee2e6', borderRadius: '4px', cursor: nextAppt ? 'pointer' : 'not-allowed', color: '#495057', opacity: nextAppt ? 1 : 0.4 }}
              >
                  <FaArrowLeft size={isMobile ? 11 : 14} style={{ transform: 'rotate(180deg)' }} />
              </ButtonWithTooltip>
          </div>

          {/* 3. ПРАВЫЙ БЛОК: Статусы и Сохранить */}
          <div style={{ display: 'flex', gap: isMobile ? '3px' : '10px' }}>
              {appt.status === 'pending' && (
                  <ButtonWithTooltip
                      onClick={() => updateStatusQuick('scheduled')}
                      tooltip="Подтвердить"
                      disabled={saving}
                      style={{ padding: isMobile ? '4px 6px' : '8px 12px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: saving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', fontSize: isMobile ? '11px' : '14px' }}
                  >
                      📅 {!isMobile && 'Подтвердить'}
                  </ButtonWithTooltip>
              )}

              {appt.status === 'scheduled' && (
                  <ButtonWithTooltip
                      onClick={() => updateStatusQuick('completed')}
                      tooltip="Завершить"
                      disabled={saving}
                      style={{ padding: isMobile ? '4px 6px' : '8px 12px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: saving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', fontSize: isMobile ? '11px' : '14px' }}
                  >
                      ✅ {!isMobile && 'Завершить'}
                  </ButtonWithTooltip>
              )}

              <ButtonWithTooltip
                  onClick={handleSave}
                  tooltip="Сохранить"
                  disabled={saving}
                  style={{ padding: isMobile ? '4px 6px' : '8px 12px', backgroundColor: saving ? '#6c757d' : '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: saving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: isMobile ? '3px' : '6px', fontSize: isMobile ? '11px' : '14px' }}
              >
                  <FaSave size={isMobile ? 11 : 14} /> {!isMobile && 'Сохранить'}
              </ButtonWithTooltip>
          </div>
      </div>

           
    </div>
  );
}