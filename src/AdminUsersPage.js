// src/AdminUsersPage.js
import React, { useState, useEffect } from 'react';
import { FaUserCheck, FaUserTimes, FaKey, FaTrash, FaUserShield, FaEllipsisV } from 'react-icons/fa';
import API_URL from './config/api';
import { useAuth } from './context/AuthContext';
import { formatPhone } from './utils/formatPhone';
import ButtonWithTooltip from './components/ButtonWithTooltip';

const ALL_ROLES = [
  { value: 'admin', label: 'Администратор' },
  { value: 'admin_content', label: 'Контент-менеджер' },
  { value: 'pdtr_content', label: 'P-DTR Контент' },
  { value: 'appointments', label: 'Мастер (Приёмы)' },
  { value: 'supplement_pdtr_advance', label: 'ПДТР - Advance' },
  { value: 'supplement_pdtr_intermedia', label: 'ПДТР - Intermedia' },
  { value: 'supplement_pdtr_integrative', label: 'ПДТР - Integrative' },
  { value: 'supplement_pdtr_sourcecode', label: 'ПДТР - Sourcecode' }
];

export default function AdminUsersPage() {
  const { user: currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState('all');
  const [users, setUsers] = useState([]);
  const [pendingUsers, setPendingUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Состояние для модалки управления
  const [selectedUser, setSelectedUser] = useState(null);
  const [userRoles, setUserRoles] = useState([]);
  const [openMenuId, setOpenMenuId] = useState(null);

  // -- отчёт об активности пользователя
  const [activityUserId, setActivityUserId] = useState(null);
  const [activityData, setActivityData] = useState(null);
  const [activityLoading, setActivityLoading] = useState(false);

  const isMobile = window.innerWidth <= 768;

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      const endpoint = activeTab === 'all' ? '' : '/pending';
      const res = await fetch(`${API_URL}/api/admin/users${endpoint}`, { credentials: 'include' });
      const data = await res.json();
      
      if (data.success) {
        if (activeTab === 'all') setUsers(data.users);
        else setPendingUsers(data.users);
      } else {
        setError(data.error || 'Ошибка загрузки');
      }
    } catch (err) {
      setError('Ошибка сети: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id) => {
    const roles = prompt('Введите роли через запятую (например: appointments,admin_content):', 'appointments');
    if (roles === null) return;
    const roleArray = roles.split(',').map(r => r.trim()).filter(Boolean);

    try {
      const res = await fetch(`${API_URL}/api/admin/users/${id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ roles: roleArray })
      });
      if (res.ok) {
        alert('Пользователь подтвержден!');
        fetchData();
      } else {
        alert('Ошибка при подтверждении');
      }
    } catch (err) { alert(err.message); }
  };

  const handleReject = async (id) => {
    if (!window.confirm('Отклонить заявку? Пользователь будет удален.')) return;
    try {
      await fetch(`${API_URL}/api/admin/users/${id}/reject`, { method: 'POST', credentials: 'include' });
      fetchData();
    } catch (err) { alert(err.message); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Удалить пользователя безвозвратно?')) return;
    try {
      await fetch(`${API_URL}/api/admin/users/${id}`, { method: 'DELETE', credentials: 'include' });
      fetchData();
    } catch (err) { alert(err.message); }
  };

  const handleResetPassword = async (id) => {
    const newPassword = prompt('Введите новый пароль (минимум 8 символов):');
    if (!newPassword) return;
    try {
      const res = await fetch(`${API_URL}/api/admin/users/${id}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ newPassword })
      });
      const data = await res.json();
      if (data.success) alert('Пароль сброшен!');
      else alert('Ошибка: ' + data.error);
    } catch (err) { alert(err.message); }
  };

  const handleOpenRolesModal = (user) => {
    setSelectedUser(user);
    setUserRoles(user.roles || []);
  };

  const handleSaveRoles = async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin/users/${selectedUser.id}/roles`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ roles: userRoles })
      });
      if (res.ok) {
        setSelectedUser(null);
        fetchData();
      } else {
        alert('Ошибка при сохранении ролей');
      }
    } catch (err) { alert(err.message); }
  };

    const handleOpenActivity = async (id) => {
    setActivityUserId(id);
    setActivityLoading(true);
    setActivityData(null);
    try {
      const res = await fetch(`${API_URL}/api/admin/users/${id}/activity`, { credentials: 'include' });
      const data = await res.json();
      if (data.success) setActivityData(data.data);
      else alert('Ошибка загрузки отчета');
    } catch (err) {
      alert('Ошибка сети: ' + err.message);
    } finally {
      setActivityLoading(false);
    }
  };

  const toggleRole = (roleValue) => {
    setUserRoles(prev => 
      prev.includes(roleValue) ? prev.filter(r => r !== roleValue) : [...prev, roleValue]
    );
  };

  if (currentUser && !currentUser.roles?.includes('admin')) {
    return <div style={{ padding: '40px', textAlign: 'center', color: 'red' }}>Доступ запрещен. Только для администраторов.</div>;
  }

  return (
    <div className="detail-container" style={{ maxWidth: '1000px', padding: isMobile ? '10px' : '32px' }}>
      <h1 className="detail-title" style={{ marginBottom: '20px' }}>Управление пользователями</h1>

      {/* Вкладки */}
      <div style={{ display: 'flex', borderBottom: '1px solid #dee2e6', marginBottom: '20px', gap: '5px' }}>
        <button 
          onClick={() => setActiveTab('all')} 
          style={{ padding: '10px 20px', backgroundColor: activeTab === 'all' ? '#007bff' : '#f8f9fa', color: activeTab === 'all' ? 'white' : '#495057', border: 'none', borderRadius: '8px 8px 0 0', cursor: 'pointer', fontWeight: activeTab === 'all' ? 'bold' : 'normal' }}
        >
          Все пользователи
        </button>
        <button 
          onClick={() => setActiveTab('pending')} 
          style={{ padding: '10px 20px', backgroundColor: activeTab === 'pending' ? '#007bff' : '#f8f9fa', color: activeTab === 'pending' ? 'white' : '#495057', border: 'none', borderRadius: '8px 8px 0 0', cursor: 'pointer', fontWeight: activeTab === 'pending' ? 'bold' : 'normal' }}
        >
          Заявки ({pendingUsers.length})
        </button>
      </div>

      {error && <div style={{ color: 'red', marginBottom: '15px' }}>{error}</div>}

      {loading ? (
        <div>Загрузка...</div>
      ) : activeTab === 'all' ? (
        /* СПИСОК ВСЕХ ПОЛЬЗОВАТЕЛЕЙ */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {users.map(u => (
            <div key={u.id} style={{ border: '1px solid #dee2e6', borderRadius: '8px', padding: isMobile ? '10px' : '15px', backgroundColor: 'white', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              
              {/* ВЕРХНЯЯ СТРОКА: Информация о пользователе */}
              <div>
                <div style={{ fontWeight: 'bold', fontSize: '16px' }}>
                  {u.name || 'Без имени'} {u.is_active ? '🟢' : '🔴'}
                </div>
                <div style={{ color: '#666', fontSize: '14px' }}>
                  {formatPhone(u.phone)} {u.email && `| ${u.email}`}
                </div>
                <div style={{ marginTop: '5px', display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                  {u.roles.map(r => (
                    <span key={r} style={{ backgroundColor: '#e3f2fd', color: '#0056b3', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold' }}>{r}</span>
                  ))}
                </div>
              </div>

              {/* НИЖНЯЯ СТРОКА: Статистика (слева) и Кнопки (справа) */}
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                width: '100%',
                flexWrap: 'nowrap' // 👈 Жестко держим в одну строку
              }}>
                
                {/* БЛОК: Статистика */}
                <div style={{ 
                  display: 'flex', 
                  gap: isMobile ? '8px' : '15px', 
                  backgroundColor: '#f8f9fa', 
                  padding: isMobile ? '4px 8px' : '5px 12px', 
                  borderRadius: '20px', 
                  border: '1px solid #e9ecef',
                  flexShrink: 0 
                }}>
                  <div title="Клиентов" style={{ display: 'flex', alignItems: 'center', gap: '2px', fontSize: isMobile ? '12px' : '13px', color: '#495057' }}>
                    👥 <strong>{u.clients_count || 0}</strong>
                  </div>
                  <div title="Приёмов" style={{ display: 'flex', alignItems: 'center', gap: '2px', fontSize: isMobile ? '12px' : '13px', color: '#495057' }}>
                    📅 <strong>{u.appointments_count || 0}</strong>
                  </div>
                </div>

                {/* БЛОК: Кнопки */}
                <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                  <ButtonWithTooltip 
                    onClick={() => handleOpenRolesModal(u)} 
                    tooltip="Управление ролями" 
                    style={{ padding: '8px', backgroundColor: '#e3f2fd', color: '#007bff', border: '1px solid #90caf9', borderRadius: '4px', cursor: 'pointer' }}
                  >
                    <FaUserShield />
                  </ButtonWithTooltip>

                  <ButtonWithTooltip 
                    onClick={() => handleResetPassword(u.id)} 
                    tooltip="Сбросить пароль" 
                    style={{ padding: '8px', backgroundColor: '#fff3cd', color: '#856404', border: '1px solid #ffeeba', borderRadius: '4px', cursor: 'pointer' }}
                  >
                    <FaKey />
                  </ButtonWithTooltip>

                  {/* Кнопка Три точки и контекстное меню */}
                  <div style={{ position: 'relative' }}>
                    <ButtonWithTooltip 
                      onClick={() => setOpenMenuId(openMenuId === u.id ? null : u.id)} 
                      tooltip="Дополнительные действия" 
                      style={{ padding: '8px', backgroundColor: '#f8f9fa', color: '#495057', border: '1px solid #dee2e6', borderRadius: '4px', cursor: 'pointer' }}
                    >
                      <FaEllipsisV />
                    </ButtonWithTooltip>

                    {/* Выпадающее меню */}
                    {openMenuId === u.id && (
                      <>
                        <div onClick={() => setOpenMenuId(null)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 999 }} />
                        <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: '5px', backgroundColor: 'white', border: '1px solid #dee2e6', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', zIndex: 1000, minWidth: '180px', overflow: 'hidden' }}>
                        
                          <button 
                            onClick={() => { handleOpenActivity(u.id); setOpenMenuId(null); }} 
                            style={{ padding: '10px 15px', border: 'none', background: 'transparent', width: '100%', textAlign: 'left', cursor: 'pointer', color: '#007bff', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #eee' }}
                          >
                            📊 Отчёт об активности
                          </button>

                          <button onClick={() => { handleDelete(u.id); setOpenMenuId(null); }} style={{ padding: '10px 15px', border: 'none', background: 'transparent', width: '100%', textAlign: 'left', cursor: 'pointer', color: '#dc3545', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <FaTrash /> Удалить пользователя
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* СПИСОК ЗАЯВОК */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {pendingUsers.length === 0 ? <div>Нет новых заявок.</div> : pendingUsers.map(u => (
            <div key={u.id} style={{ border: '1px solid #dee2e6', borderRadius: '8px', padding: '15px', backgroundColor: '#f8f9fa', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 'bold', fontSize: '16px' }}>{u.name}</div>
                <div style={{ color: '#666', fontSize: '14px' }}>{formatPhone(u.phone)} {u.email && `| ${u.email}`}</div>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <ButtonWithTooltip 
                  onClick={() => handleApprove(u.id)} 
                  tooltip="Подтвердить регистрацию и назначить роли"
                  style={{ padding: '8px 12px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}
                >
                  <FaUserCheck /> Подтвердить
                </ButtonWithTooltip>

                <ButtonWithTooltip 
                  onClick={() => handleReject(u.id)} 
                  tooltip="Отклонить заявку (пользователь будет удален)"
                  style={{ padding: '8px 12px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}
                >
                  <FaUserTimes /> Отклонить
                </ButtonWithTooltip>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* МОДАЛКА УПРАВЛЕНИЯ РОЛЯМИ */}
      {selectedUser && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', width: '400px',  maxWidth: '90%' }}>
            <h3 style={{ marginTop: 0 }}>Роли Ларчика: {selectedUser.name}</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
              {ALL_ROLES.map(r => (
                <label key={r.value} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={userRoles.includes(r.value)} onChange={() => toggleRole(r.value)} style={{ width: '16px', height: '16px' }} />
                  {r.label}
                </label>
              ))}
            </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <ButtonWithTooltip 
                onClick={() => setSelectedUser(null)} 
                tooltip="Закрыть без сохранения"
                style={{ padding: '8px 16px', border: '1px solid #ddd', borderRadius: '4px', cursor: 'pointer', background: 'white' }}
              >
                Отмена
              </ButtonWithTooltip>

              <ButtonWithTooltip 
                onClick={handleSaveRoles} 
                tooltip="Сохранить изменения ролей"
                style={{ padding: '8px 16px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
              >
                Сохранить
              </ButtonWithTooltip>
            </div>
          </div>
        </div>
      )}
      {/* МОДАЛКА ОТЧЕТА ОБ АКТИВНОСТИ */}
      {activityUserId && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: isMobile ? 'flex-start' : 'center', justifyContent: 'center', zIndex: 1000, padding: isMobile ? '0' : '20px' }}>
          <div style={{ 
            backgroundColor: 'white', 
            padding: isMobile ? '15px' : '20px', 
            borderRadius: isMobile ? '0' : '8px', 
            width: isMobile ? '100vw' : '100%', 
            maxWidth: isMobile ? '100vw' : '800px', 
            height: isMobile ? '100dvh' : 'auto', // 👈 Используем 100dvh вместо 100vh
            maxHeight: isMobile ? '100dvh' : '90vh', 
            display: 'flex', 
            flexDirection: 'column', 
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            paddingTop: isMobile ? 'calc(15px + env(safe-area-inset-top))' : '20px', // 👈 Отступ под системную шапку
            paddingBottom: isMobile ? 'calc(15px + env(safe-area-inset-bottom))' : '20px' // 👈 Отступ под системные кнопки
          }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #eee', paddingBottom: '15px', marginBottom: '15px' }}>
              {/* 👈 Центрируем заголовок, оставляя место для крестика */}
              <h3 style={{ margin: 0, color: '#0d47a1', flex: 1, textAlign: 'center', fontSize: isMobile ? '18px' : '20px' }}>Отчёт об активности</h3>
              <button onClick={() => setActivityUserId(null)} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#666', lineHeight: 1, padding: '0 5px' }}>✕</button>
            </div>
            
            <div style={{ overflowY: 'auto', flex: 1, paddingRight: '10px', paddingBottom: isMobile ? '30px' : '0' }}>
              {activityLoading ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>⏳ Сбор данных...</div>
              ) : activityData ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  
                  {/* Блок 1: Пользователь */}
                  <div style={{ backgroundColor: '#f8f9fa', padding: '15px', borderRadius: '8px', border: '1px solid #dee2e6' }}>
                    <h4 style={{ margin: '0 0 10px 0', color: '#0056b3' }}>👤 {activityData.user.name || 'Без имени'}</h4>
                    <p style={{ margin: '0 0 5px 0', fontSize: '14px' }}><strong>Телефон:</strong> {formatPhone(activityData.user.phone)}</p>
                    <p style={{ margin: '0 0 5px 0', fontSize: '14px' }}><strong>Последний вход:</strong> {activityData.user.last_login_at ? new Date(activityData.user.last_login_at).toLocaleString('ru-RU') : 'Никогда'}</p>
                    <p style={{ margin: 0, fontSize: '14px' }}><strong>Зарегистрирован:</strong> {new Date(activityData.user.created_at).toLocaleString('ru-RU')}</p>
                  </div>

                  {/* Блок 2: Клиенты */}
                  <div>
                    <h4 style={{ margin: '0 0 10px 0', borderBottom: '1px solid #eee', paddingBottom: '5px' }}>👥 Клиенты</h4>
                    
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '10px' }}>
                      {/* 👈 Бейдж "Всего" */}
                      <div style={{ backgroundColor: '#007bff', color: 'white', padding: '5px 10px', borderRadius: '4px', fontSize: '13px', fontWeight: 'bold' }}>
                        Всего: {activityData.clients.total}
                      </div>
                    </div>

                    <p style={{ margin: '0 0 5px 0', fontSize: '14px' }}><strong>Первый клиент:</strong> {activityData.clients.first_client ? new Date(activityData.clients.first_client).toLocaleDateString('ru-RU') : '—'}</p>
                    <p style={{ margin: '0 0 10px 0', fontSize: '14px' }}><strong>Последний клиент:</strong> {activityData.clients.last_client ? new Date(activityData.clients.last_client).toLocaleDateString('ru-RU') : '—'}</p>
                    
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                      {activityData.clients.sources.map((s, i) => (
                        <span key={i} style={{ backgroundColor: '#e3f2fd', color: '#0056b3', padding: '2px 8px', borderRadius: '12px', fontSize: '12px' }}>
                          {s.source_name}: {s.count}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Блок 3: Приёмы */}
                  <div>
                    <h4 style={{ margin: '0 0 10px 0', borderBottom: '1px solid #eee', paddingBottom: '5px' }}>📅 Приёмы по статусам</h4>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                      
                      {/* 👈 Бейдж "Всего" */}
                      <div style={{ backgroundColor: '#007bff', color: 'white', padding: '5px 10px', borderRadius: '4px', fontSize: '13px', fontWeight: 'bold' }}>
                        Всего: {activityData.appointments.reduce((sum, item) => sum + parseInt(item.count), 0)}
                      </div>

                      {/* Бейджи по статусам */}
                      {activityData.appointments.map((a, i) => (
                        <div key={i} style={{ backgroundColor: '#f1f3f5', padding: '5px 10px', borderRadius: '4px', fontSize: '13px' }}>
                          <strong>{a.status}:</strong> {a.count}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Блок 4: Услуги и Специализации */}
                  <div>
                    <h4 style={{ margin: '0 0 10px 0', borderBottom: '1px solid #eee', paddingBottom: '5px' }}>💆 Услуги и Специализации</h4>
                    <p style={{ margin: '0 0 5px 0', fontSize: '14px' }}><strong>Специализации:</strong> {activityData.specs.join(', ') || 'Не выбраны'}</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginTop: '5px' }}>
                      {activityData.services.map((s, i) => (
                        <span key={i} style={{ backgroundColor: '#e8f5e9', color: '#2e7d32', padding: '2px 8px', borderRadius: '12px', fontSize: '12px' }}>
                          {s.specialization_code}: {s.count} шт.
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Блок 5: Сессии */}
                  <div>
                    <h4 style={{ margin: '0 0 10px 0', borderBottom: '1px solid #eee', paddingBottom: '5px' }}>💻 Последние сессии (устройства)</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                      {activityData.sessions.map((s, i) => (
                        <div key={i} style={{ fontSize: '12px', backgroundColor: '#f8f9fa', padding: '8px', borderRadius: '4px', border: '1px solid #eee' }}>
                          <strong>{new Date(s.created_at).toLocaleString('ru-RU')}</strong> | IP: {s.ip_address} <br/>
                          <span style={{ color: '#666' }}>{s.user_agent}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Блок 6: Логи авторизации */}
                  <div>
                    <h4 style={{ margin: '0 0 10px 0', borderBottom: '1px solid #eee', paddingBottom: '5px' }}>🔐 Логи входа (последние 10)</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                      {activityData.authLogs.map((log, i) => (
                        <div key={i} style={{ fontSize: '12px', display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #eee', paddingBottom: '3px' }}>
                          <span>{new Date(log.created_at).toLocaleString('ru-RU')}</span>
                          <span style={{ fontWeight: 'bold', color: log.status === 'success' ? '#28a745' : '#dc3545' }}>
                            {log.action} {log.details ? `(${log.details})` : ''}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}


    </div>
  );
}