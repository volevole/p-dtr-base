// src/AdminUsersPage.js
import React, { useState, useEffect } from 'react';
import { FaUserCheck, FaUserTimes, FaKey, FaTrash, FaUserShield } from 'react-icons/fa';
import API_URL from './config/api';
import { useAuth } from './context/AuthContext';
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
            <div key={u.id} style={{ border: '1px solid #dee2e6', borderRadius: '8px', padding: '15px', backgroundColor: 'white', display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', gap: '10px' }}>
              <div>
                <div style={{ fontWeight: 'bold', fontSize: '16px' }}>{u.name || 'Без имени'} {u.is_active ? '🟢' : '🔴'}</div>
                <div style={{ color: '#666', fontSize: '14px' }}>{u.phone} {u.email && `| ${u.email}`}</div>
                <div style={{ marginTop: '5px', display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                  {u.roles.map(r => (
                    <span key={r} style={{ backgroundColor: '#e3f2fd', color: '#0056b3', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold' }}>{r}</span>
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
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

                <ButtonWithTooltip 
                  onClick={() => handleDelete(u.id)} 
                  tooltip="Удалить пользователя" 
                  style={{ padding: '8px', backgroundColor: '#f8d7da', color: '#dc3545', border: '1px solid #f5c6cb', borderRadius: '4px', cursor: 'pointer' }}
                >
                  <FaTrash />
                </ButtonWithTooltip>
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
                <div style={{ color: '#666', fontSize: '14px' }}>{u.phone} {u.email && `| ${u.email}`}</div>
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
          <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', width: '400px', maxWidth: '90%' }}>
            <h3 style={{ marginTop: 0 }}>Роли: {selectedUser.name}</h3>
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
    </div>
  );
}