// src/Sidebar.js
import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import API_URL from './config/api';
import { 
  FaBars, FaHeart, FaProjectDiagram, FaChartBar, FaClipboardList,
  FaTools, FaChevronDown, FaChevronRight, FaUsers, FaCog,
  FaUserFriends, FaCalendarAlt, 
  FaImages, FaDatabase, FaSignInAlt, FaLightbulb
} from 'react-icons/fa';

function Sidebar({ isOpen, onToggle }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  
  const [receptorsOpen, setReceptorsOpen] = useState(false);
  const [musclesOpen, setMusclesOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  
  const isAdmin = user?.roles?.includes('admin');
  const isAdminContent = user?.roles?.includes('admin_content');
  const hasContentAccess = isAdmin || isAdminContent || user?.roles?.includes('pdtr_content');
  const hasAppointmentsAccess = isAdmin || user?.roles?.includes('appointments');
  
  // 👈 Здесь мы задаём, кто может видеть медиа и экспорт
  const hasSystemAccess = isAdmin || isAdminContent; 

  useEffect(() => {
    if (location.pathname.startsWith('/receptor')) setReceptorsOpen(true);
    if (location.pathname === '/' || location.pathname.startsWith('/muscle') || location.pathname.startsWith('/group')) setMusclesOpen(true);
    if (location.pathname.startsWith('/settings') || location.pathname.startsWith('/all-media') || location.pathname.startsWith('/export') || location.pathname.startsWith('/environment-info')) {
      setSettingsOpen(true);
    }
  }, [location.pathname]);
  
  const getActiveEntity = () => {
    const path = location.pathname;
    
    // --- Сущности ---
    if (path === '/' || path.startsWith('/muscle')) return 'muscle';
    if (path.startsWith('/organ')) return 'organ';
    if (path.startsWith('/meridian')) return 'meridian';
    if (path.startsWith('/dysfunction')) return 'dysfunction';
    if (path.startsWith('/group')) return 'group';
    if (path.startsWith('/receptor-class')) return 'receptor_classes';
    if (path.startsWith('/receptor')) return 'receptor';
    if (path.startsWith('/tool')) return 'tool';
    if (path.startsWith('/entry')) return 'entry';
    if (path.startsWith('/usefulness')) return 'usefulness'; 

    // --- Приёмы ---
    if (path.startsWith('/appointments/clients')) return 'appt-clients';
    if (path.startsWith('/appointments/schedule')) return 'appt-schedule'; 
    if (path === '/appointments') return 'appt-list';  

    // --- Система (сначала специфичные, потом общие!) ---
    if (path.startsWith('/all-media')) return 'all-media';
    if (path.startsWith('/export')) return 'export';
    if (path.startsWith('/environment-info')) return 'environment-info'; // 👈 Добавили проверку
    if (path.startsWith('/settings/profile')) return 'settings-profile'; // 👈 Подняли выше /settings
    if (path.startsWith('/settings')) return 'settings';
    
    return '';
  };

  const activeEntity = getActiveEntity();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const getMenuItemStyle = (entity) => ({
    display: 'flex', alignItems: 'center', color: activeEntity === entity ? '#007bff' : '#495057',
    textDecoration: 'none', padding: '8px', borderRadius: '4px', backgroundColor: activeEntity === entity ? '#e3f2fd' : 'transparent'
  });

  const getSubMenuItemStyle = (entity) => ({
    display: 'flex', alignItems: 'center', color: activeEntity === entity ? '#007bff' : '#495057',
    textDecoration: 'none', padding: '6px 8px', borderRadius: '4px', backgroundColor: activeEntity === entity ? '#e3f2fd' : 'transparent', fontSize: '14px'
  });

  const getSubMenuIndicatorStyle = (entity) => ({
    width: '6px', height: '6px', backgroundColor: activeEntity === entity ? '#007bff' : '#6c757d',
    borderRadius: '50%', marginRight: '10px'
  });

  const getHeaderStyle = (isActive) => ({
    display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px', borderRadius: '4px',
    cursor: 'pointer', backgroundColor: isActive ? '#e3f2fd' : 'transparent'
  });

  const getHeaderTextStyle = (isActive) => ({ color: isActive ? '#007bff' : '#495057' });
  const getIconStyle = (isActive) => ({ marginRight: '8px', color: isActive ? '#007bff' : '#495057' });

  return (
    <div className={`sidebar ${isOpen ? 'open' : ''}`}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px', flexShrink: 0 }}>
        <FaBars style={{ marginRight: '15px' }} />
        <h3 className="sidebar-title" style={{ margin: 0, paddingLeft: '30px' }}>
          {/* 👈 Если есть доступ к контенту, пишем P-DTR, иначе просто Ларчик */}
          Ларчик {hasContentAccess && 'P-DTR'}
        </h3>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', marginBottom: '20px', paddingRight: '5px' }}>
        
        {hasContentAccess && (
          <>
            <div>
              <h4 className="sidebar-section-title" style={{ fontSize: '14px', color: '#228b14', marginBottom: '10px' }}>
                Сущности
              </h4>
              <ul className="sidebar-menu-list" style={{ listStyle: 'none', padding: 0 }}>
                
                <li style={{ marginBottom: '8px' }}>
                  <div className="sidebar-menu-header" style={getHeaderStyle(activeEntity === 'group' || activeEntity === 'muscle')} onClick={() => setMusclesOpen(!musclesOpen)}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <FaUsers style={getIconStyle(activeEntity === 'group' || activeEntity === 'muscle')} />
                      <span style={getHeaderTextStyle(activeEntity === 'group' || activeEntity === 'muscle')}>Мышцы</span>
                    </div>
                    <div className="sidebar-chevron" style={{ color: '#6c757d' }}>{musclesOpen ? <FaChevronDown size={12} /> : <FaChevronRight size={12} />}</div>
                  </div>
                  {musclesOpen && (
                    <div style={{ marginTop: '5px', marginLeft: '20px', borderLeft: '2px solid #dee2e6', paddingLeft: '10px' }}>
                      <ul style={{ listStyle: 'none', padding: 0 }}>
                        <li style={{ marginBottom: '5px' }}>
                          <Link to="/groups" className="sidebar-submenu-link" style={getSubMenuItemStyle('group')}><div style={getSubMenuIndicatorStyle('group')} />Группы мышц</Link>
                        </li>
                        <li style={{ marginBottom: '5px' }}>
                          <Link to="/" className="sidebar-submenu-link" style={getSubMenuItemStyle('muscle')}><div style={getSubMenuIndicatorStyle('muscle')} />Мышцы</Link>
                        </li>
                      </ul>
                    </div>
                  )}
                </li>

                <li style={{ marginBottom: '8px' }}>
                  <div className="sidebar-menu-header" style={getHeaderStyle(activeEntity === 'receptor-class' || activeEntity === 'receptor')} onClick={() => setReceptorsOpen(!receptorsOpen)}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <FaClipboardList style={getIconStyle(activeEntity === 'receptor-class' || activeEntity === 'receptor')} />
                      <span style={getHeaderTextStyle(activeEntity === 'receptor-class' || activeEntity === 'receptor')}>Рецепторы</span>
                    </div>
                    <div className="sidebar-chevron" style={{ color: '#6c757d' }}>{receptorsOpen ? <FaChevronDown size={12} /> : <FaChevronRight size={12} />}</div>
                  </div>
                  {receptorsOpen && (
                    <div style={{ marginTop: '5px', marginLeft: '20px', borderLeft: '2px solid #dee2e6', paddingLeft: '10px' }}>
                      <ul style={{ listStyle: 'none', padding: 0 }}>
                        <li style={{ marginBottom: '5px' }}>
                          <Link to="/receptor_classes" className="sidebar-submenu-link" style={getSubMenuItemStyle('receptor_class')}><div style={getSubMenuIndicatorStyle('receptor_class')} />Классы рецепторов</Link>
                        </li>
                        <li style={{ marginBottom: '5px' }}>
                          <Link to="/receptors" className="sidebar-submenu-link" style={getSubMenuItemStyle('receptor')}><div style={getSubMenuIndicatorStyle('receptor')} />Рецепторы</Link>
                        </li>
                      </ul>
                    </div>
                  )}
                </li>

                <li style={{ marginBottom: '8px' }}><Link to="/organs" className="sidebar-menu-link" style={getMenuItemStyle('organ')}><FaHeart style={{ marginRight: '8px' }} />Органы</Link></li>
                <li style={{ marginBottom: '8px' }}><Link to="/meridians" className="sidebar-menu-link" style={getMenuItemStyle('meridian')}><FaProjectDiagram style={{ marginRight: '8px' }} />Меридианы</Link></li>
                <li style={{ marginBottom: '8px' }}><Link to="/dysfunctions" className="sidebar-menu-link" style={getMenuItemStyle('dysfunction')}><FaChartBar style={{ marginRight: '8px' }} />Дисфункции</Link></li>
                <li style={{ marginBottom: '8px' }}><Link to="/tools" className="sidebar-menu-link" style={getMenuItemStyle('tool')}><FaTools style={{ marginRight: '8px' }} />Инструменты</Link></li>
                <li style={{ marginBottom: '8px' }}><Link to="/entries" className="sidebar-menu-link" style={getMenuItemStyle('entry')}><FaSignInAlt style={{ marginRight: '8px' }} />Заходы</Link></li>
              </ul>
            </div>

            <div style={{ marginTop: '20px' }}>
              <h4 className="sidebar-section-title" style={{ fontSize: '14px', color: '#228b14', marginBottom: '10px' }}>Прочие практики</h4>
              <ul style={{ listStyle: 'none', padding: 0 }}>
                <li style={{ marginBottom: '8px' }}>
                  <Link to="/usefulness" className="sidebar-menu-link" style={getMenuItemStyle('usefulness')}><FaLightbulb style={{ marginRight: '8px' }} />Полезности</Link>
                </li>
              </ul>
            </div>
          </>
        )}

        {/* 👈 Раздел Ведение приёмов */}
        {hasAppointmentsAccess && (
          <div style={{ marginTop: '20px' }}>
            <h4 className="sidebar-section-title" style={{ fontSize: '14px', color: '#228b14', marginBottom: '10px' }}>
              Ведение приёмов
            </h4>
            <ul style={{ listStyle: 'none', padding: 0 }}>
              <li style={{ marginBottom: '8px' }}>
                <Link to="/appointments" className="sidebar-menu-link" style={getMenuItemStyle('appt-list')}>
                  <FaClipboardList style={{ marginRight: '8px', flexShrink: 0 }} /> 
                  <span style={{ whiteSpace: 'nowrap' }}>Все приёмы</span>
                </Link>
              </li>
              <li style={{ marginBottom: '8px' }}>
                <Link to="/appointments/clients" className="sidebar-menu-link" style={getMenuItemStyle('appt-clients')}>
                  <FaUserFriends style={{ marginRight: '8px' }} /> Клиенты
                </Link>
              </li>
              <li style={{ marginBottom: '8px' }}>
                <Link to="/appointments/schedule" className="sidebar-menu-link" style={getMenuItemStyle('appt-schedule')}>
                  <FaCalendarAlt style={{ marginRight: '8px', flexShrink: 0, width: '16px', height: '16px' }} /> 
                  <span style={{ whiteSpace: 'nowrap' }}>Расписание (Записи)</span>
                </Link>
              </li>
            </ul>
          </div>
        )}

        {/* 👈 СИСТЕМА (ДОСТУПНА ВСЕМ) */}
        <div style={{ marginTop: '20px' }}>
          <h4 className="sidebar-section-title" style={{ fontSize: '14px', color: '#228b14', marginBottom: '10px' }}>
            Система
          </h4>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            <li style={{ marginBottom: '8px' }}>
              <div 
                className="sidebar-menu-header" 
                style={getHeaderStyle(activeEntity === 'settings' || activeEntity === 'all-media' || activeEntity === 'export' || activeEntity === 'environment-info')} 
                onClick={() => setSettingsOpen(!settingsOpen)}
              >
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <FaCog style={getIconStyle(activeEntity === 'settings' || activeEntity === 'all-media' || activeEntity === 'export' || activeEntity === 'environment-info')} />
                  <span style={getHeaderTextStyle(activeEntity === 'settings' || activeEntity === 'all-media' || activeEntity === 'export' || activeEntity === 'environment-info')}>
                    Настройки и сервис
                  </span>
                </div>
                <div className="sidebar-chevron" style={{ color: '#6c757d' }}>
                  {settingsOpen ? <FaChevronDown size={12} /> : <FaChevronRight size={12} />}
                </div>
              </div>
              
              {settingsOpen && (
                <div style={{ marginTop: '5px', marginLeft: '20px', borderLeft: '2px solid #dee2e6', paddingLeft: '10px' }}>
                  <ul style={{ listStyle: 'none', padding: 0 }}>
                    {/* 👈 ВИДЯТ ВСЕ (включая будущую роль client) */}
                    <li style={{ marginBottom: '5px' }}>
                      <Link to="/settings/profile" className="sidebar-submenu-link" style={getSubMenuItemStyle('settings-profile')}>
                        <div style={getSubMenuIndicatorStyle('settings-profile')} />
                        👤 Мой профиль 
                      </Link>
                    </li>
                    {/* 👈 ВИДЯТ ТОЛЬКО АДМИНЫ */}
                    {hasSystemAccess && (
                      <>
                        <li style={{ marginBottom: '5px' }}>
                          <Link to="/all-media" className="sidebar-submenu-link" style={getSubMenuItemStyle('all-media')}>
                            <div style={getSubMenuIndicatorStyle('all-media')} />
                            <FaImages style={{ marginRight: '8px', fontSize: '12px' }} />Все медиа
                          </Link>
                        </li>
                        <li style={{ marginBottom: '5px' }}>
                          <Link to="/export" className="sidebar-submenu-link" style={getSubMenuItemStyle('export')}>
                            <div style={getSubMenuIndicatorStyle('export')} />
                            <FaDatabase style={{ marginRight: '8px', fontSize: '12px' }} />Экспорт данных
                          </Link>
                        </li>
                        <li style={{ marginBottom: '5px' }}>
                        <Link to="/settings" className="sidebar-submenu-link" style={getSubMenuItemStyle('settings')}>
                          <div style={getSubMenuIndicatorStyle('settings')} />
                          ⚙️ Настройки
                        </Link>
                      </li>
                      </>
                    )}
                    
                    {/* 👈 ВИДЯТ ВСЕ (включая будущую роль client) */}                    
                    
                    <li style={{ marginBottom: '5px' }}>
                      <Link to="/environment-info" className="sidebar-submenu-link" style={getSubMenuItemStyle('environment-info')}>
                        <div style={getSubMenuIndicatorStyle('environment-info')} />
                        Информация об окружении {/* 👈 Убрали иконку терминала */}
                      </Link>
                    </li>
                  </ul>
                </div>
              )}
            </li>
          </ul>
        </div>
      </div>

       {/* 👈 ФИКСИРОВАННЫЙ ПРОФИЛЬ ВНИЗУ */}
      {user && (
        <div style={{ flexShrink: 0, paddingTop: '15px', borderTop: '1px solid #dee2e6' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '15px', padding: '0 8px' }}>
            
            {/* Блок с аватаром */}
            <div style={{ 
              width: '40px', 
              height: '40px', 
              borderRadius: '50%', 
              backgroundColor: '#e9ecef', 
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              {user.avatar_url ? (
                <img 
                  src={`${API_URL}/api/curl-proxy-image?url=${encodeURIComponent(user.avatar_url)}&size=S`} 
                  alt="Аватар" 
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                />
              ) : (
                // Если фото нет, показываем первую букву имени
                <span style={{ fontWeight: 'bold', color: '#6c757d', fontSize: '16px' }}>
                  {user.name?.charAt(0).toUpperCase()}
                </span>
              )}
            </div>

            {/* Блок с именем и ролями */}
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontWeight: 'bold', color: '#212529', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user.name}
              </div>
              <div style={{ fontSize: '12px', color: '#6c757d', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user.roles?.join(', ')}
              </div>
            </div>
          </div>

          <button onClick={handleLogout} style={{ width: '100%', padding: '8px', backgroundColor: '#f8f9fa', color: '#dc3545', border: '1px solid #dc3545', borderRadius: '4px', cursor: 'pointer', fontWeight: '500' }}>
            Выйти
          </button>
        </div>
      )}
    </div>
  );
}

export default Sidebar;