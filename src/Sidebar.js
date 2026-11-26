// src/Sidebar.js
import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import API_URL from './config/api';
import { 
  FaBars, FaHeart, FaProjectDiagram, FaChartBar, FaClipboardList,
  FaTools, FaChevronDown, FaChevronRight, FaUsers, FaCog,
  FaUserFriends, FaCalendarAlt, FaServer,
  FaImages, FaDatabase, FaSignInAlt, FaLightbulb
} from 'react-icons/fa';
import { MENU_LABELS, MENU_LABELS_VISITOR } from './utils/appLogic';

function Sidebar({ isOpen, onToggle }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  
  const [receptorsOpen, setReceptorsOpen] = useState(false);
  const [musclesOpen, setMusclesOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [knowledgeBaseOpen, setKnowledgeBaseOpen] = useState(false);
  
  const isAdmin = user?.roles?.includes('admin');
  const isAdminContent = user?.roles?.includes('admin_content');
  const hasContentAccess = isAdmin || isAdminContent || user?.roles?.includes('pdtr_content');
  const hasAppointmentsAccess = isAdmin || user?.roles?.includes('appointments');
  
  // 👈 Здесь мы задаём, кто может видеть медиа и экспорт
  const hasSystemAccess = isAdmin || isAdminContent; 

  // 👈 Функция для проверки, находимся ли мы внутри раздела
  const isPathActive = (paths) => {
    return paths.some(p => location.pathname.startsWith(p));
  };

  // 👈 Вычисляем активность для блока "Настройки и сервис" (исключая Мой профиль)
  const isSettingsSectionActive = 
    (location.pathname.startsWith('/settings') && !location.pathname.startsWith('/settings/profile')) || 
    isPathActive(['/all-media', '/export', '/environment-info', '/admin/users']);

  useEffect(() => {
    if (location.pathname.startsWith('/receptor')) setReceptorsOpen(true);
    if (location.pathname === '/' || location.pathname.startsWith('/muscle') || location.pathname.startsWith('/group')) setMusclesOpen(true);
    if (isSettingsSectionActive) {
      setSettingsOpen(true);
    }
    // 👈 Автооткрытие Базы знаний
    if (
      location.pathname.startsWith('/muscle') || 
      location.pathname.startsWith('/organ') || 
      location.pathname.startsWith('/meridian') || 
      location.pathname.startsWith('/dysfunction') || 
      location.pathname.startsWith('/group') || 
      location.pathname.startsWith('/receptor') || 
      location.pathname.startsWith('/tool') || 
      location.pathname.startsWith('/entry') || 
      location.pathname.startsWith('/usefulness')
    ) {
      setKnowledgeBaseOpen(true);
    }
  }, [location.pathname]);
  
  const getActiveEntity = () => {
    const path = location.pathname;
    
    // --- База знаний (подсветка заголовка) ---
    if (
      path.startsWith('/muscle') || 
      path.startsWith('/organ') || 
      path.startsWith('/meridian') || 
      path.startsWith('/dysfunction') || 
      path.startsWith('/group') || 
      path.startsWith('/receptor') || 
      path.startsWith('/tool') || 
      path.startsWith('/entry') || 
      path.startsWith('/usefulness')
    ) {
      return 'knowledge-base';
    }

    // --- Приёмы ---
    if (path.startsWith('/appointments/clients')) return 'appt-clients';
    if (path.startsWith('/appointments/schedule')) return 'appt-schedule'; 
    if (path === '/appointments') return 'appt-list';  

    // --- Система ---
    if (path.startsWith('/admin/users')) return 'admin-users';
    if (path.startsWith('/all-media')) return 'all-media';
    if (path.startsWith('/export')) return 'export';
    if (path.startsWith('/environment-info')) return 'environment-info';
    if (path.startsWith('/settings/profile')) return 'settings-profile';
    if (path.startsWith('/settings')) return 'settings';
    
    return '';
  };

 

  const activeEntity = getActiveEntity();

  

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const isVisitorMode = user?.isVisitorMode || false; 
  const labels = isVisitorMode ? MENU_LABELS_VISITOR : MENU_LABELS;

  const getMenuItemStyle = (path) => {
    // Если передан путь, проверяем по нему. Если передана строка без слэша (старый вариант), проверяем по activeEntity
    const isActive = path.startsWith('/') ? location.pathname.startsWith(path) : activeEntity === path;
    return {
      display: 'flex', alignItems: 'center', color: isActive ? '#007bff' : '#495057',
      textDecoration: 'none', padding: '8px', borderRadius: '4px', backgroundColor: isActive ? '#e3f2fd' : 'transparent'
    };
  };

  const getSubMenuItemStyle = (path) => {
    const isActive = location.pathname.startsWith(path);
    return {
      display: 'flex', 
      alignItems: 'center', 
      color: isActive ? '#007bff' : '#495057',
      textDecoration: 'none', 
      padding: '6px 8px', 
      borderRadius: '4px', 
      backgroundColor: isActive ? '#e3f2fd' : 'transparent', 
      fontSize: '14px'
    };
  };

  const getSubMenuIndicatorStyle = (path) => {
    const isActive = location.pathname.startsWith(path);
    return {
      width: '6px', 
      height: '6px', 
      backgroundColor: isActive ? '#007bff' : '#6c757d',
      borderRadius: '50%', 
      marginRight: '10px'
    };
  };

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
          {/*Ларчик {hasContentAccess && 'P-DTR'} */}
          {labels.appName}
        </h3>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', marginBottom: '20px', paddingRight: '5px' }}>

        {/* 👈 1. Раздел Ведение приёмов (Раскрыт по умолчанию) */}
        {hasAppointmentsAccess && (
          <div style={{ marginBottom: '15px' }}>
            <h4 className="sidebar-section-title" style={{ fontSize: '14px', color: '#228b14', marginBottom: '10px' }}>
              {/* Ведение приёмов */}
              {labels.appointmentsSection}
            </h4>
            <ul style={{ listStyle: 'none', padding: 0 }}>              
              <li style={{ marginBottom: '8px' }}>
                <Link to="/appointments/clients" className="sidebar-menu-link" style={getMenuItemStyle('appt-clients')}>
                  <FaUserFriends style={{ marginRight: '8px' }} /> 
                   {/* Клиенты */} {labels.clients}
                </Link>
              </li>              
              <li style={{ marginBottom: '8px' }}>
                <Link to="/appointments/schedule" className="sidebar-menu-link" style={getMenuItemStyle('appt-schedule')}>
                  <FaCalendarAlt style={{ marginRight: '8px', flexShrink: 0, width: '16px', height: '16px' }} /> 
                  <span style={{ whiteSpace: 'nowrap' }}> {labels.schedule} {/* Расписание (Записи) */} </span>
                </Link>
              </li>
              <li style={{ marginBottom: '8px' }}>
                <Link to="/appointments" className="sidebar-menu-link" style={getMenuItemStyle('appt-list')}>
                  <FaClipboardList style={{ marginRight: '8px', flexShrink: 0 }} /> 
                  <span style={{ whiteSpace: 'nowrap' }}>{labels.allAppointments} {/* Все приёмы */}</span>
                </Link>
              </li>
            </ul>
          </div>
        )}

        
        {/* 👈 2. База знаний (Сгруппировано) */}
        {hasContentAccess && (
          <div style={{ marginBottom: '15px' }}>
            <h4 className="sidebar-section-title" style={{ fontSize: '14px', color: '#228b14', marginBottom: '10px' }}>
              Справочник P-DTR
            </h4>
            <div 
              className="sidebar-menu-header"               
              style={getHeaderStyle(isPathActive(['/muscle', '/organ', '/meridian', '/dysfunction', '/group', '/receptor', '/tool', '/entry', '/usefulness']))}
              onClick={() => setKnowledgeBaseOpen(!knowledgeBaseOpen)}
            >
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <FaProjectDiagram style={getIconStyle(isPathActive(['/muscle', '/organ', '/meridian', '/dysfunction', '/group', '/receptor', '/tool', '/entry', '/usefulness']))} />
                <span style={getHeaderTextStyle(isPathActive(['/muscle', '/organ', '/meridian', '/dysfunction', '/group', '/receptor', '/tool', '/entry', '/usefulness']))}>База знаний</span>
              </div>
              <div className="sidebar-chevron" style={{ color: '#6c757d' }}>
                {knowledgeBaseOpen ? <FaChevronDown size={12} /> : <FaChevronRight size={12} />}
              </div>
            </div>

            {knowledgeBaseOpen && (
              <div style={{ marginTop: '5px', marginLeft: '15px', borderLeft: '2px solid #dee2e6', paddingLeft: '10px' }}>
                
                {/* Сущности P-DTR */}
                <ul style={{ listStyle: 'none', padding: 0 }}>
                  <li style={{ marginBottom: '8px' }}>
                    <div className="sidebar-menu-header" style={getHeaderStyle(isPathActive(['/group', '/muscle']))} onClick={() => setMusclesOpen(!musclesOpen)}>
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <FaUsers style={getIconStyle(isPathActive(['/group', '/muscle']))} />
                        <span style={getHeaderTextStyle(isPathActive(['/group', '/muscle']))}>Мышцы</span>
                      </div>
                      <div className="sidebar-chevron" style={{ color: '#6c757d' }}>{musclesOpen ? <FaChevronDown size={12} /> : <FaChevronRight size={12} />}</div>
                    </div>
                    {musclesOpen && (
                      <div style={{ marginTop: '5px', marginLeft: '15px', borderLeft: '2px solid #dee2e6', paddingLeft: '10px' }}>
                        <ul style={{ listStyle: 'none', padding: 0 }}>
                          <li style={{ marginBottom: '5px' }}><Link to="/groups" className="sidebar-submenu-link" style={getSubMenuItemStyle('/groups')}><div style={getSubMenuIndicatorStyle('group')} />Группы мышц</Link></li>
                          <li style={{ marginBottom: '5px' }}><Link to="/muscles" className="sidebar-submenu-link" style={getSubMenuItemStyle('/muscles')}><div style={getSubMenuIndicatorStyle('muscle')} />Мышцы</Link></li>
                        </ul>
                      </div>
                    )}
                  </li>

                  <li style={{ marginBottom: '8px' }}>
                    <div className="sidebar-menu-header" style={getHeaderStyle(isPathActive(['/receptor-class', '/receptor']))} onClick={() => setReceptorsOpen(!receptorsOpen)}>
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <FaClipboardList style={getIconStyle(isPathActive(['/receptor-class', '/receptor']))} />
                        <span style={getHeaderTextStyle(isPathActive(['/receptor-class', '/receptor']))}>Рецепторы</span>
                      </div>
                      <div className="sidebar-chevron" style={{ color: '#6c757d' }}>{receptorsOpen ? <FaChevronDown size={12} /> : <FaChevronRight size={12} />}</div>
                    </div>
                    {receptorsOpen && (
                      <div style={{ marginTop: '5px', marginLeft: '15px', borderLeft: '2px solid #dee2e6', paddingLeft: '10px' }}>
                        <ul style={{ listStyle: 'none', padding: 0 }}>
                          <li style={{ marginBottom: '5px' }}><Link to="/receptor_classes" className="sidebar-submenu-link" style={getSubMenuItemStyle('/receptor_classes')}><div style={getSubMenuIndicatorStyle('receptor_class')} />Классы рецепторов</Link></li>
                          <li style={{ marginBottom: '5px' }}><Link to="/receptors" className="sidebar-submenu-link" style={getSubMenuItemStyle('/receptors')}><div style={getSubMenuIndicatorStyle('receptor')} />Рецепторы</Link></li>
                        </ul>
                      </div>
                    )}
                  </li>

                  <li style={{ marginBottom: '8px' }}><Link to="/organs" className="sidebar-menu-link" style={getMenuItemStyle('/organs')}><FaHeart style={{ marginRight: '8px' }} />Органы</Link></li>
                  <li style={{ marginBottom: '8px' }}><Link to="/meridians" className="sidebar-menu-link" style={getMenuItemStyle('/meridians')}><FaProjectDiagram style={{ marginRight: '8px' }} />Меридианы</Link></li>
                  <li style={{ marginBottom: '8px' }}><Link to="/dysfunctions" className="sidebar-menu-link" style={getMenuItemStyle('/dysfunctions')}><FaChartBar style={{ marginRight: '8px' }} />Дисфункции</Link></li>
                  <li style={{ marginBottom: '8px' }}><Link to="/tools" className="sidebar-menu-link" style={getMenuItemStyle('/tools')}><FaTools style={{ marginRight: '8px' }} />Инструменты</Link></li>
                  <li style={{ marginBottom: '8px' }}><Link to="/entries" className="sidebar-menu-link" style={getMenuItemStyle('/entries')}><FaSignInAlt style={{ marginRight: '8px' }} />Заходы</Link></li>
                </ul>

                {/* Прочие практики */}
                <div style={{ marginTop: '10px', marginBottom: '10px' }}>                  
                  <h4 className="sidebar-section-title" style={{ fontSize: '14px', color: '#228b14', marginBottom: '10px' }}>
                    Прочие практики
                </h4>
                  <ul style={{ listStyle: 'none', padding: 0 }}>
                    <li style={{ marginBottom: '8px' }}>
                      <Link to="/usefulness" className="sidebar-menu-link" style={getMenuItemStyle('/usefulness')}><FaLightbulb style={{ marginRight: '8px' }} />Полезности</Link>
                    </li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 👈 3. Система (Сгруппировано) */}
        <div style={{ marginBottom: '15px' }}>
          <h4 className="sidebar-section-title" style={{ fontSize: '14px', color: '#228b14', marginBottom: '10px' }}>
              Система
          </h4>
          
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            <li style={{ marginBottom: '8px' }}>
              <Link to="/settings/profile" className="sidebar-menu-link" style={getMenuItemStyle('settings-profile')}>
                <FaUserFriends style={{ marginRight: '8px' }} /> {/* Или иконка пользователя */}
                👤 Мой профиль
              </Link>
            </li>
          </ul>

          <div 
            className="sidebar-menu-header" 
            style={getHeaderStyle(isSettingsSectionActive)} 
            onClick={() => setSettingsOpen(!settingsOpen)}
          >
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <FaCog style={getIconStyle(isSettingsSectionActive)} />
              <span style={getHeaderTextStyle(isSettingsSectionActive)}>
                Настройки и сервис
              </span>
            </div>
            <div className="sidebar-chevron" style={{ color: '#6c757d' }}>
              {settingsOpen ? <FaChevronDown size={12} /> : <FaChevronRight size={12} />}
            </div>
          </div>
          
          {settingsOpen && (
            <div style={{ marginTop: '5px', marginLeft: '15px', borderLeft: '2px solid #dee2e6', paddingLeft: '10px' }}>
              <ul style={{ listStyle: 'none', padding: 0 }}>
                
                
                {isAdmin && (
                  <li style={{ marginBottom: '5px' }}>
                    <Link to="/admin/users" className="sidebar-submenu-link" style={getSubMenuItemStyle('/admin/users')}>
                      <div style={getSubMenuIndicatorStyle('admin-users')} />
                      <FaUsers style={{ marginRight: '8px', fontSize: '14px' }} />
                      Управление пользователями
                    </Link>
                  </li>
                )}
                
                {hasSystemAccess && (
                  <>
                    <li style={{ marginBottom: '5px' }}>
                      <Link to="/all-media" className="sidebar-submenu-link" style={getSubMenuItemStyle('/all-media')}>
                        <div style={getSubMenuIndicatorStyle('all-media')} />
                        <FaImages style={{ marginRight: '8px', fontSize: '12px' }} />Все медиа
                      </Link>
                    </li>
                    <li style={{ marginBottom: '5px' }}>
                      <Link to="/export" className="sidebar-submenu-link" style={getSubMenuItemStyle('/export')}>
                        <div style={getSubMenuIndicatorStyle('export')} />
                        <FaDatabase style={{ marginRight: '8px', fontSize: '12px' }} />Экспорт данных
                      </Link>
                    </li>
                    <li style={{ marginBottom: '5px' }}>
                      <Link to="/settings" className="sidebar-submenu-link" style={getSubMenuItemStyle('/settings')}>
                        <div style={getSubMenuIndicatorStyle('settings')} />
                        ⚙️ Настройки
                      </Link>
                    </li>
                  </>
                )}
                
                <li style={{ marginBottom: '5px' }}>
                  <Link to="/environment-info" className="sidebar-submenu-link" style={getSubMenuItemStyle('/environment-info')}>
                    <div style={getSubMenuIndicatorStyle('environment-info')} />
                    <FaServer style={{ marginRight: '8px', fontSize: '14px' }} />
                    Информация об окружении
                  </Link>
                </li>
              </ul>
            </div>
          )}
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