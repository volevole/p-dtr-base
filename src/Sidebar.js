// Sidebar.js
import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  FaBars,
  FaList,
  FaHeart,
  FaProjectDiagram,
  FaChartBar,
  FaFilter,
  FaClipboardList,
  FaTools,
  FaChevronDown,
  FaChevronRight,
  FaUsers,
  FaUserFriends,
  FaCog,
  FaImages,
  FaDatabase,
  FaHistory,
  FaSignInAlt
} from 'react-icons/fa';

function Sidebar() {
  const location = useLocation();
  const [receptorsOpen, setReceptorsOpen] = useState(false);
  const [musclesOpen, setMusclesOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  
  // Автоматически открываем меню при переходе на связанные страницы
  useEffect(() => {
    if (location.pathname.startsWith('/receptor')) {
      setReceptorsOpen(true);
    }
    if (location.pathname === '/' || location.pathname.startsWith('/muscle') || location.pathname.startsWith('/group')) {
      setMusclesOpen(true);
    }
    if (location.pathname.startsWith('/settings') || location.pathname.startsWith('/all-media')) {
      setSettingsOpen(true);
    }
    // Добавляем для заходов
    if (location.pathname.startsWith('/entry')) {
      // Можно добавить автоматическое открытие, если нужно
    }
  }, [location.pathname]);
  
  // Определяем активный раздел по пути
  const getActiveEntity = () => {
    const path = location.pathname;
    
    // Главная страница = мышцы
    if (path === '/' || path.startsWith('/muscle')) return 'muscle';
    
    if (path.startsWith('/organ')) return 'organ';
    if (path.startsWith('/meridian')) return 'meridian';
    if (path.startsWith('/dysfunction')) return 'dysfunction';
    if (path.startsWith('/group')) return 'group';
    if (path.startsWith('/receptor-class')) return 'receptor-class';
    if (path.startsWith('/receptor')) return 'receptor';
    if (path.startsWith('/tool')) return 'tool';
    if (path.startsWith('/entry')) return 'entry'; // ← Добавляем заходы
    if (path.startsWith('/settings')) return 'settings';
    if (path.startsWith('/all-media')) return 'all-media';
    if (path.startsWith('/export')) return 'export';
    return '';
  };

  const activeEntity = getActiveEntity();

  return (
    <div style={{
      width: '250px',
      backgroundColor: '#f8f9fa',
      borderRight: '1px solid #dee2e6',
      minHeight: '100vh',
      padding: '20px',
      position: 'fixed',
      left: 0,
      top: 0,
      overflowY: 'auto'
    }}>
      <h3 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center' }}>
        <FaBars style={{ marginRight: '10px' }} />
        База знаний P-DTR
      </h3>
      
      {/* Все пункты меню в одном списке */}
      <div>
        <h4 style={{ fontSize: '14px', color: '#6c757d', marginBottom: '10px' }}>Сущности</h4>
        <ul style={{ listStyle: 'none', padding: 0 }}>
          
          {/* Мышцы как пункт меню с подменю */}
          <li style={{ marginBottom: '8px' }}>
            <div 
              style={{ 
                display: 'flex', 
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px',
                borderRadius: '4px',
                cursor: 'pointer',
                backgroundColor: (activeEntity === 'group' || activeEntity === 'muscle') ? '#e3f2fd' : 'transparent'
              }}
              onClick={() => setMusclesOpen(!musclesOpen)}
            >
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <FaUsers style={{ 
                  marginRight: '8px', 
                  color: (activeEntity === 'group' || activeEntity === 'muscle') ? '#007bff' : '#495057'
                }} />
                <span style={{ 
                  color: (activeEntity === 'group' || activeEntity === 'muscle') ? '#007bff' : '#495057'
                }}>
                  Мышцы
                </span>
              </div>
              <div style={{ color: '#6c757d' }}>
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
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center',
                        color: activeEntity === 'group' ? '#007bff' : '#495057',
                        textDecoration: 'none',
                        padding: '6px 8px',
                        borderRadius: '4px',
                        backgroundColor: activeEntity === 'group' ? '#e3f2fd' : 'transparent',
                        fontSize: '14px'
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div style={{ 
                        width: '6px', 
                        height: '6px', 
                        backgroundColor: activeEntity === 'group' ? '#007bff' : '#6c757d',
                        borderRadius: '50%',
                        marginRight: '10px'
                      }} />
                      Группы мышц
                    </Link>
                  </li>
                  <li style={{ marginBottom: '5px' }}>
                    <Link 
                      to="/"  // Главная страница = список мышц
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center',
                        color: activeEntity === 'muscle' ? '#007bff' : '#495057',
                        textDecoration: 'none',
                        padding: '6px 8px',
                        borderRadius: '4px',
                        backgroundColor: activeEntity === 'muscle' ? '#e3f2fd' : 'transparent',
                        fontSize: '14px'
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div style={{ 
                        width: '6px', 
                        height: '6px', 
                        backgroundColor: activeEntity === 'muscle' ? '#007bff' : '#6c757d',
                        borderRadius: '50%',
                        marginRight: '10px'
                      }} />
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
              style={{ 
                display: 'flex', 
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px',
                borderRadius: '4px',
                cursor: 'pointer',
                backgroundColor: (activeEntity === 'receptor-class' || activeEntity === 'receptor') ? '#e3f2fd' : 'transparent'
              }}
              onClick={() => setReceptorsOpen(!receptorsOpen)}
            >
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <FaClipboardList style={{ 
                  marginRight: '8px', 
                  color: (activeEntity === 'receptor-class' || activeEntity === 'receptor') ? '#007bff' : '#495057'
                }} />
                <span style={{ 
                  color: (activeEntity === 'receptor-class' || activeEntity === 'receptor') ? '#007bff' : '#495057'
                }}>
                  Рецепторы
                </span>
              </div>
              <div style={{ color: '#6c757d' }}>
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
                      to="/receptor-classes" 
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center',
                        color: activeEntity === 'receptor-class' ? '#007bff' : '#495057',
                        textDecoration: 'none',
                        padding: '6px 8px',
                        borderRadius: '4px',
                        backgroundColor: activeEntity === 'receptor-class' ? '#e3f2fd' : 'transparent',
                        fontSize: '14px'
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div style={{ 
                        width: '6px', 
                        height: '6px', 
                        backgroundColor: activeEntity === 'receptor-class' ? '#007bff' : '#6c757d',
                        borderRadius: '50%',
                        marginRight: '10px'
                      }} />
                      Классы рецепторов
                    </Link>
                  </li>
                  <li style={{ marginBottom: '5px' }}>
                    <Link 
                      to="/receptors" 
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center',
                        color: activeEntity === 'receptor' ? '#007bff' : '#495057',
                        textDecoration: 'none',
                        padding: '6px 8px',
                        borderRadius: '4px',
                        backgroundColor: activeEntity === 'receptor' ? '#e3f2fd' : 'transparent',
                        fontSize: '14px'
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div style={{ 
                        width: '6px', 
                        height: '6px', 
                        backgroundColor: activeEntity === 'receptor' ? '#007bff' : '#6c757d',
                        borderRadius: '50%',
                        marginRight: '10px'
                      }} />
                      Рецепторы
                    </Link>
                  </li>
                </ul>
              </div>
            )}
          </li>

          {/* Остальные основные сущности */}
          <li style={{ marginBottom: '8px' }}>
            <Link 
              to="/organs" 
              style={{ 
                display: 'flex', 
                alignItems: 'center',
                color: activeEntity === 'organ' ? '#007bff' : '#495057',
                textDecoration: 'none',
                padding: '8px',
                borderRadius: '4px',
                backgroundColor: activeEntity === 'organ' ? '#e3f2fd' : 'transparent'
              }}
            >
              <FaHeart style={{ marginRight: '8px' }} />
              Органы
            </Link>
          </li>
          <li style={{ marginBottom: '8px' }}>
            <Link 
              to="/meridians" 
              style={{ 
                display: 'flex', 
                alignItems: 'center',
                color: activeEntity === 'meridian' ? '#007bff' : '#495057',
                textDecoration: 'none',
                padding: '8px',
                borderRadius: '4px',
                backgroundColor: activeEntity === 'meridian' ? '#e3f2fd' : 'transparent'
              }}
            >
              <FaProjectDiagram style={{ marginRight: '8px' }} />
              Меридианы
            </Link>
          </li>
          <li style={{ marginBottom: '8px' }}>
            <Link 
              to="/dysfunctions" 
              style={{ 
                display: 'flex', 
                alignItems: 'center',
                color: activeEntity === 'dysfunction' ? '#007bff' : '#495057',
                textDecoration: 'none',
                padding: '8px',
                borderRadius: '4px',
                backgroundColor: activeEntity === 'dysfunction' ? '#e3f2fd' : 'transparent'
              }}
            >
              <FaChartBar style={{ marginRight: '8px' }} />
              Дисфункции
            </Link>
          </li>

          {/* Инструменты как обычный пункт меню */}
          <li style={{ marginBottom: '8px' }}>
            <Link 
              to="/tools" 
              style={{ 
                display: 'flex', 
                alignItems: 'center',
                color: activeEntity === 'tool' ? '#007bff' : '#495057',
                textDecoration: 'none',
                padding: '8px',
                borderRadius: '4px',
                backgroundColor: activeEntity === 'tool' ? '#e3f2fd' : 'transparent'
              }}
            >
              <FaTools style={{ marginRight: '8px' }} />
              Инструменты
            </Link>
          </li>

          {/* Заходы как обычный пункт меню */}
          <li style={{ marginBottom: '8px' }}>
            <Link 
              to="/entries" 
              style={{ 
                display: 'flex', 
                alignItems: 'center',
                color: activeEntity === 'entry' ? '#007bff' : '#495057',
                textDecoration: 'none',
                padding: '8px',
                borderRadius: '4px',
                backgroundColor: activeEntity === 'entry' ? '#e3f2fd' : 'transparent'
              }}
            >
              <FaSignInAlt style={{ marginRight: '8px' }} />
              Заходы
            </Link>
          </li>

        </ul>
      </div>

      {/* Настройки и сервис как пункт меню с подменю */}
      <div style={{ marginTop: '20px' }}>
        <h4 style={{ fontSize: '14px', color: '#6c757d', marginBottom: '10px' }}>Система</h4>
        <ul style={{ listStyle: 'none', padding: 0 }}>
          
          <li style={{ marginBottom: '8px' }}>
            <div 
              style={{ 
                display: 'flex', 
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px',
                borderRadius: '4px',
                cursor: 'pointer',
                backgroundColor: (activeEntity === 'settings' || activeEntity === 'all-media' || activeEntity === 'export') ? '#e3f2fd' : 'transparent'
              }}
              onClick={() => setSettingsOpen(!settingsOpen)}
            >
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <FaCog style={{ 
                  marginRight: '8px', 
                  color: (activeEntity === 'settings' || activeEntity === 'all-media' || activeEntity === 'export') ? '#007bff' : '#495057'
                }} />
                <span style={{ 
                  color: (activeEntity === 'settings' || activeEntity === 'all-media' || activeEntity === 'export') ? '#007bff' : '#495057'
                }}>
                  Настройки и сервис
                </span>
              </div>
              <div style={{ color: '#6c757d' }}>
                {settingsOpen ? <FaChevronDown size={12} /> : <FaChevronRight size={12} />}
              </div>
            </div>

            {/* Выпадающее подменю для настроек и сервиса */}
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
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center',
                        color: activeEntity === 'all-media' ? '#007bff' : '#495057',
                        textDecoration: 'none',
                        padding: '6px 8px',
                        borderRadius: '4px',
                        backgroundColor: activeEntity === 'all-media' ? '#e3f2fd' : 'transparent',
                        fontSize: '14px'
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div style={{ 
                        width: '6px', 
                        height: '6px', 
                        backgroundColor: activeEntity === 'all-media' ? '#007bff' : '#6c757d',
                        borderRadius: '50%',
                        marginRight: '10px'
                      }} />
                      <FaImages style={{ marginRight: '8px', fontSize: '12px' }} />
                      Все медиа
                    </Link>
                  </li>
                  <li style={{ marginBottom: '5px' }}>
                    <Link 
                      to="/export" 
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center',
                        color: activeEntity === 'export' ? '#007bff' : '#495057',
                        textDecoration: 'none',
                        padding: '6px 8px',
                        borderRadius: '4px',
                        backgroundColor: activeEntity === 'export' ? '#e3f2fd' : 'transparent',
                        fontSize: '14px'
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div style={{ 
                        width: '6px', 
                        height: '6px', 
                        backgroundColor: activeEntity === 'export' ? '#007bff' : '#6c757d',
                        borderRadius: '50%',
                        marginRight: '10px'
                      }} />
                      <FaDatabase style={{ marginRight: '8px', fontSize: '12px' }} />
                      Экспорт данных
                    </Link>
                  </li>
                  <li style={{ marginBottom: '5px' }}>
                    <Link 
                      to="/settings" 
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center',
                        color: activeEntity === 'settings' ? '#007bff' : '#495057',
                        textDecoration: 'none',
                        padding: '6px 8px',
                        borderRadius: '4px',
                        backgroundColor: activeEntity === 'settings' ? '#e3f2fd' : 'transparent',
                        fontSize: '14px'
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div style={{ 
                        width: '6px', 
                        height: '6px', 
                        backgroundColor: activeEntity === 'settings' ? '#007bff' : '#6c757d',
                        borderRadius: '50%',
                        marginRight: '10px'
                      }} />
                      ⚙️ Настройки
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