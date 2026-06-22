// Sidebar.js
import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  FaBars,
  FaHeart,
  FaProjectDiagram,
  FaChartBar,
  FaClipboardList,
  FaTools,
  FaChevronDown,
  FaChevronRight,
  FaUsers,
  FaCog,
  FaImages,
  FaDatabase,
  FaSignInAlt,
  FaTerminal,
  FaLightbulb,
  FaFolderOpen
} from 'react-icons/fa';

function Sidebar({ isOpen, onToggle }) {
  const location = useLocation();
  const [receptorsOpen, setReceptorsOpen] = useState(false);
  const [musclesOpen, setMusclesOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [otherOpen, setOtherOpen] = useState(false);
  
  // Автоматически открываем меню при переходе на связанные страницы
  useEffect(() => {
    if (location.pathname.startsWith('/receptor')) {
      setReceptorsOpen(true);
    }
    if (location.pathname === '/' || location.pathname.startsWith('/muscle') || location.pathname.startsWith('/group')) {
      setMusclesOpen(true);
    }
    if (location.pathname.startsWith('/settings') || location.pathname.startsWith('/all-media') || location.pathname.startsWith('/export')) {
      setSettingsOpen(true);
    }
    if (location.pathname.startsWith('/usefulness')) {
      setOtherOpen(true);
    }
  }, [location.pathname]);
  
  // Определяем активный раздел по пути
  const getActiveEntity = () => {
    const path = location.pathname;
    
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
    if (path.startsWith('/settings')) return 'settings';
    if (path.startsWith('/all-media')) return 'all-media';
    if (path.startsWith('/export')) return 'export';
    if (path.startsWith('/environment-info')) return 'environment-info';
    return '';
  };

  const activeEntity = getActiveEntity();

  // Вспомогательные функции для стилей
  const getMenuItemStyle = (entity) => ({
    display: 'flex',
    alignItems: 'center',
    color: activeEntity === entity ? '#007bff' : '#495057',
    textDecoration: 'none',
    padding: '8px',
    borderRadius: '4px',
    backgroundColor: activeEntity === entity ? '#e3f2fd' : 'transparent'
  });

  const getSubMenuItemStyle = (entity) => ({
    display: 'flex',
    alignItems: 'center',
    color: activeEntity === entity ? '#007bff' : '#495057',
    textDecoration: 'none',
    padding: '6px 8px',
    borderRadius: '4px',
    backgroundColor: activeEntity === entity ? '#e3f2fd' : 'transparent',
    fontSize: '14px'
  });

  const getSubMenuIndicatorStyle = (entity) => ({
    width: '6px',
    height: '6px',
    backgroundColor: activeEntity === entity ? '#007bff' : '#6c757d',
    borderRadius: '50%',
    marginRight: '10px'
  });

  const getHeaderStyle = (isActive) => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px',
    borderRadius: '4px',
    cursor: 'pointer',
    backgroundColor: isActive ? '#e3f2fd' : 'transparent'
  });

  const getHeaderTextStyle = (isActive) => ({
    color: isActive ? '#007bff' : '#495057'
  });

  const getIconStyle = (isActive) => ({
    marginRight: '8px',
    color: isActive ? '#007bff' : '#495057'
  });

  return (
    <div className={`sidebar ${isOpen ? 'open' : ''}`}>
      <h3 style={{ marginBottom: '20px', display: 'flex', alignItems: 'right' }}>
        <FaBars style={{ marginRight: '40px' }} />
        Ларчик P-DTR
      </h3>
        
      {/* Все пункты меню в одном списке */}
      <div>
        <h4 className="sidebar-section-title" style={{ fontSize: '14px', color: '#228b14', marginBottom: '10px' }}>
          Сущности
        </h4>
        <ul className="sidebar-menu-list" style={{ listStyle: 'none', padding: 0 }}>
          
          {/* Мышцы как пункт меню с подменю */}
          <li style={{ marginBottom: '8px' }}>
            <div 
              className="sidebar-menu-header"
              style={getHeaderStyle(activeEntity === 'group' || activeEntity === 'muscle')}
              onClick={() => setMusclesOpen(!musclesOpen)}
            >
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <FaUsers style={getIconStyle(activeEntity === 'group' || activeEntity === 'muscle')} />
                <span style={getHeaderTextStyle(activeEntity === 'group' || activeEntity === 'muscle')}>
                  Мышцы
                </span>
              </div>
              <div className="sidebar-chevron" style={{ color: '#6c757d' }}>
                {musclesOpen ? <FaChevronDown size={12} /> : <FaChevronRight size={12} />}
              </div>
            </div>

            {/* Выпадающее подменю для мышц */}
            {musclesOpen && (
              <div style={{ 
                marginTop: '5px',
                marginLeft: '20px',
                borderLeft: '2px solid #dee2e6',
                paddingLeft: '10px'
              }}>
                <ul style={{ listStyle: 'none', padding: 0 }}>
                  <li style={{ marginBottom: '5px' }}>
                    <Link 
                      to="/groups" 
                      className="sidebar-submenu-link"
                      style={getSubMenuItemStyle('group')}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div style={getSubMenuIndicatorStyle('group')} />
                      Группы мышц
                    </Link>
                  </li>
                  <li style={{ marginBottom: '5px' }}>
                    <Link 
                      to="/" 
                      className="sidebar-submenu-link"
                      style={getSubMenuItemStyle('muscle')}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div style={getSubMenuIndicatorStyle('muscle')} />
                      Мышцы
                    </Link>
                  </li>
                </ul>
              </div>
            )}
          </li>

          {/* Рецепторы как пункт меню с подменю */}
          <li style={{ marginBottom: '8px' }}>
            <div 
              className="sidebar-menu-header"
              style={getHeaderStyle(activeEntity === 'receptor-class' || activeEntity === 'receptor')}
              onClick={() => setReceptorsOpen(!receptorsOpen)}
            >
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <FaClipboardList style={getIconStyle(activeEntity === 'receptor-class' || activeEntity === 'receptor')} />
                <span style={getHeaderTextStyle(activeEntity === 'receptor-class' || activeEntity === 'receptor')}>
                  Рецепторы
                </span>
              </div>
              <div className="sidebar-chevron" style={{ color: '#6c757d' }}>
                {receptorsOpen ? <FaChevronDown size={12} /> : <FaChevronRight size={12} />}
              </div>
            </div>

            {/* Выпадающее подменю для рецепторов */}
            {receptorsOpen && (
              <div style={{ 
                marginTop: '5px',
                marginLeft: '20px',
                borderLeft: '2px solid #dee2e6',
                paddingLeft: '10px'
              }}>
                <ul style={{ listStyle: 'none', padding: 0 }}>
                  <li style={{ marginBottom: '5px' }}>
                    <Link 
                      to="/receptor_classes" 
                      className="sidebar-submenu-link"
                      style={getSubMenuItemStyle('receptor_class')}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div style={getSubMenuIndicatorStyle('receptor_class')} />
                      Классы рецепторов
                    </Link>
                  </li>
                  <li style={{ marginBottom: '5px' }}>
                    <Link 
                      to="/receptors" 
                      className="sidebar-submenu-link"
                      style={getSubMenuItemStyle('receptor')}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div style={getSubMenuIndicatorStyle('receptor')} />
                      Рецепторы
                    </Link>
                  </li>
                </ul>
              </div>
            )}
          </li>

          {/* Остальные основные сущности — БЕЗ точки */}
          <li style={{ marginBottom: '8px' }}>
            <Link 
              to="/organs" 
              className="sidebar-menu-link"
              style={getMenuItemStyle('organ')}
            >
              <FaHeart style={{ marginRight: '8px' }} />
              Органы
            </Link>
          </li>
          <li style={{ marginBottom: '8px' }}>
            <Link 
              to="/meridians" 
              className="sidebar-menu-link"
              style={getMenuItemStyle('meridian')}
            >
              <FaProjectDiagram style={{ marginRight: '8px' }} />
              Меридианы
            </Link>
          </li>
          <li style={{ marginBottom: '8px' }}>
            <Link 
              to="/dysfunctions" 
              className="sidebar-menu-link"
              style={getMenuItemStyle('dysfunction')}
            >
              <FaChartBar style={{ marginRight: '8px' }} />
              Дисфункции
            </Link>
          </li>
          <li style={{ marginBottom: '8px' }}>
            <Link 
              to="/tools" 
              className="sidebar-menu-link"
              style={getMenuItemStyle('tool')}
            >
              <FaTools style={{ marginRight: '8px' }} />
              Инструменты
            </Link>
          </li>
          <li style={{ marginBottom: '8px' }}>
            <Link 
              to="/entries" 
              className="sidebar-menu-link"
              style={getMenuItemStyle('entry')}
            >
              <FaSignInAlt style={{ marginRight: '8px' }} />
              Заходы
            </Link>
          </li>

        </ul>
      </div>

      {/* Раздел "Прочие практики" */}
      <div style={{ marginTop: '20px' }}>
        <h4 className="sidebar-section-title" style={{ fontSize: '14px', color: '#228b14', marginBottom: '10px' }}>
          Прочие практики
        </h4>
        <ul style={{ listStyle: 'none', padding: 0 }}>
          <li style={{ marginBottom: '8px' }}>
            <Link 
              to="/usefulness" 
              className="sidebar-menu-link"
              style={getMenuItemStyle('usefulness')}
            >
              <FaLightbulb style={{ marginRight: '8px' }} />
              Полезности
            </Link>
          </li>
        </ul>
      </div>

      {/* Настройки и сервис */}
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

            {/* Выпадающее подменю для настроек */}
            {settingsOpen && (
              <div style={{ 
                marginTop: '5px',
                marginLeft: '20px',
                borderLeft: '2px solid #dee2e6',
                paddingLeft: '10px'
              }}>
                <ul style={{ listStyle: 'none', padding: 0 }}>
                  <li style={{ marginBottom: '5px' }}>
                    <Link 
                      to="/all-media" 
                      className="sidebar-submenu-link"
                      style={getSubMenuItemStyle('all-media')}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div style={getSubMenuIndicatorStyle('all-media')} />
                      <FaImages style={{ marginRight: '8px', fontSize: '12px' }} />
                      Все медиа
                    </Link>
                  </li>
                  <li style={{ marginBottom: '5px' }}>
                    <Link 
                      to="/export" 
                      className="sidebar-submenu-link"
                      style={getSubMenuItemStyle('export')}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div style={getSubMenuIndicatorStyle('export')} />
                      <FaDatabase style={{ marginRight: '8px', fontSize: '12px' }} />
                      Экспорт данных
                    </Link>
                  </li>
                  <li style={{ marginBottom: '5px' }}>
                    <Link 
                      to="/settings" 
                      className="sidebar-submenu-link"
                      style={getSubMenuItemStyle('settings')}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div style={getSubMenuIndicatorStyle('settings')} />
                      ⚙️ Настройки
                    </Link>
                  </li>
                  <li style={{ marginBottom: '5px' }}>
                    <Link 
                      to="/environment-info" 
                      className="sidebar-submenu-link"
                      style={getSubMenuItemStyle('environment-info')}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div style={getSubMenuIndicatorStyle('environment-info')} />
                      <FaTerminal style={{ marginRight: '8px', fontSize: '12px' }} />
                      Информация об окружении
                    </Link>
                  </li>
                </ul>
              </div>
            )}
          </li>
        </ul>
      </div>
    </div>
  );
}

export default Sidebar;