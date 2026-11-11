// EnvironmentInfoPage.js
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  getDisplayEnvironmentInfo, 
  copyEnvironmentInfoToClipboard, 
  logEnvironmentInfo,
  getDatabaseInfo
} from './utils/environmentInfo';
import { FaCopy, FaTerminal, FaServer, FaDesktop, FaInfoCircle, FaDatabase, FaCheckCircle, FaTimesCircle, FaTimes } from 'react-icons/fa';
// 👈 Импортируем версии
import { APP_VERSIONS, CURRENT_VERSION } from './config/versions';

const isMobile = window.innerWidth <= 768;

function EnvironmentInfoPage() {
  const [info, setInfo] = useState({});
  const [copied, setCopied] = useState(false);
  const [dbInfo, setDbInfo] = useState(null);
  const [dbLoading, setDbLoading] = useState(true);
  const [isVersionModalOpen, setIsVersionModalOpen] = useState(false); // 👈 Стейт для модалки версий

  useEffect(() => {
    const envInfo = getDisplayEnvironmentInfo();
    setInfo(envInfo);
    logEnvironmentInfo();
    loadDbInfo();
  }, []);

  const loadDbInfo = async () => {
    setDbLoading(true);
    const result = await getDatabaseInfo();
    setDbInfo(result);
    setDbLoading(false);
  };

  const handleCopy = async () => {
    const success = await copyEnvironmentInfoToClipboard();
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const sections = [
    {
      title: 'Основная информация',
      icon: <FaInfoCircle />,
      keys: ['Текущий URL', 'Окружение', 'Версия приложения', 'Сборка от', 'Текущее время']
    },
    {
      title: 'Серверная часть',
      icon: <FaServer />,
      keys: ['API URL', 'Хост сервера', 'Протокол']
    },
    {
      title: 'Клиентская часть',
      icon: <FaDesktop />,
      keys: ['Разрешение экрана', 'Размер окна', 'Платформа', 'Язык', 'React версия', 
        'Node окружение', 'Доступен localStorage', 'API контактов (Android)']
    }
  ];

  const renderDbSection = () => {
    if (dbLoading) {
      return (
        <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
          ⏳ Загрузка информации о БД...
        </div>
      );
    }

    if (!dbInfo || !dbInfo.success) {
      return (
        <div style={{ padding: '20px', backgroundColor: '#f8d7da', borderRadius: '6px', color: '#721c24' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
            <FaTimesCircle />
            <strong>Ошибка подключения к БД</strong>
          </div>
          {dbInfo?.error && <p style={{ margin: '5px 0' }}><strong>Причина:</strong> {dbInfo.error}</p>}
          {dbInfo?.data && (
            <p style={{ margin: '5px 0', fontSize: '13px' }}>
              <strong>Параметры:</strong> {dbInfo.data.host}:{dbInfo.data.port}, 
              БД: {dbInfo.data.database}, 
              Пользователь: {dbInfo.data.user}
            </p>
          )}
        </div>
      );
    }

    const db = dbInfo.data;
    return (
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <tbody>
          <tr style={{ borderBottom: '1px solid #f0f0f0' }}>
            <td style={labelTdStyle}>Хост:</td>
            <td style={valueTdStyle}><code>{db.host}:{db.port}</code></td>
          </tr>
          <tr style={{ borderBottom: '1px solid #f0f0f0' }}>
            <td style={labelTdStyle}>База данных:</td>
            <td style={valueTdStyle}><code>{db.currentDatabase}</code></td>
          </tr>
          <tr style={{ borderBottom: '1px solid #f0f0f0' }}>
            <td style={labelTdStyle}>Пользователь:</td>
            <td style={valueTdStyle}><code>{db.currentUser}</code></td>
          </tr>
          <tr style={{ borderBottom: '1px solid #f0f0f0' }}>
            <td style={labelTdStyle}>Версия PostgreSQL:</td>
            <td style={valueTdStyle}>{db.version}</td>
          </tr>
          <tr style={{ borderBottom: '1px solid #f0f0f0' }}>
            <td style={labelTdStyle}>Размер БД:</td>
            <td style={valueTdStyle}>{db.databaseSize}</td>
          </tr>
          <tr style={{ borderBottom: '1px solid #f0f0f0' }}>
            <td style={labelTdStyle}>Таблиц в схеме public:</td>
            <td style={valueTdStyle}>{db.tablesCount}</td>
          </tr>
          <tr style={{ borderBottom: '1px solid #f0f0f0' }}>
            <td style={labelTdStyle}>Адрес сервера БД:</td>
            <td style={valueTdStyle}>
              {db.serverAddress ? `${db.serverAddress}:${db.serverPort}` : 'локальное подключение'}
            </td>
          </tr>
          <tr>
            <td style={labelTdStyle}>Пароль задан:</td>
            <td style={valueTdStyle}>
              {db.hasPassword ? (
                <span style={{ color: '#28a745', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <FaCheckCircle /> Да
                </span>
              ) : (
                <span style={{ color: '#dc3545', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <FaTimesCircle /> Нет
                </span>
              )}
            </td>
          </tr>
        </tbody>
      </table>
    );
  };

  return (
    <div style={{ padding: isMobile ? '5px' : '2rem', maxWidth: '1200px', margin: 'auto' }}>
      <div style={{ marginBottom: isMobile ? '10px' : '20px' }}>
        <Link to="/">← На главную</Link>
      </div>

      <h1 style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: isMobile ? '20px' : '32px' }}>
        <FaTerminal />
        Информация об окружении
      </h1>

      <p style={{ color: '#666', marginBottom: isMobile ? '15px' : '30px', fontSize: isMobile ? '13px' : '16px' }}>
        Детальная информация о текущем окружении приложения, сервере и клиенте.
        Полезно для отладки и технической поддержки.
      </p>

      {/* 👈 БЛОК ТЕКУЩЕЙ ВЕРСИИ */}
      <div style={{ 
        backgroundColor: '#f8f9fa', padding: isMobile ? '10px' : '20px', borderRadius: '8px', 
        border: '1px solid #dee2e6', marginBottom: isMobile ? '15px' : '30px', 
        display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'stretch' : 'center', flexWrap: 'wrap', gap: '10px' 
      }}>
        <div>
          <h3 style={{ margin: '0 0 8px 0', color: '#0056b3', display: 'flex', alignItems: 'center', gap: '10px', fontSize: isMobile ? '16px' : '18px', flexWrap: 'wrap' }}>
            Текущая версия: 
            <span style={{ backgroundColor: '#007bff', color: 'white', padding: '4px 12px', borderRadius: '16px', fontSize: isMobile ? '13px' : '15px' }}>
              v{CURRENT_VERSION.version}
            </span>
          </h3>
          <div style={{ fontSize: isMobile ? '12px' : '14px', color: '#333', lineHeight: 1.4 }}>
            <strong>Что нового:</strong> {CURRENT_VERSION.description} 
            <em style={{ color: '#888', marginLeft: '5px' }}>({new Date(CURRENT_VERSION.date).toLocaleDateString('ru-RU')})</em>
          </div>
        </div>
        <button 
          onClick={() => setIsVersionModalOpen(true)}
          style={{ padding: '10px 20px', backgroundColor: 'white', color: '#007bff', border: '2px solid #007bff', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', marginTop: isMobile ? '10px' : 0 }}
        >
          История версий
        </button>
      </div>

      {/* Кнопки действий */}
      <div style={{ display: 'flex', gap: isMobile ? '5px' : '15px', marginBottom: isMobile ? '15px' : '30px', flexWrap: 'wrap' }}>
        <button
          onClick={handleCopy}
          style={{ flex: isMobile ? '1 1 100%' : 'none', padding: '10px', backgroundColor: copied ? '#28a745' : '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: isMobile ? '13px' : '16px' }}
        >
          <FaCopy />
          {copied ? 'Скопировано!' : 'Копировать в буфер'}
        </button>

        <button
          onClick={logEnvironmentInfo}
          style={{ flex: isMobile ? '1 1 100%' : 'none', padding: '10px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: isMobile ? '13px' : '16px' }}
        >
          <FaTerminal /> Вывести в консоль
        </button>

        <button
          onClick={loadDbInfo}
          disabled={dbLoading}
          style={{ flex: isMobile ? '1 1 100%' : 'none', padding: '10px', backgroundColor: dbLoading ? '#ccc' : '#17a2b8', color: 'white', border: 'none', borderRadius: '4px', cursor: dbLoading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: isMobile ? '13px' : '16px' }}
        >
          <FaDatabase /> {dbLoading ? 'Загрузка...' : 'Обновить данные БД'}
        </button>
      </div>

      {/* Блок БД */}
      <div style={{ marginBottom: isMobile ? '15px' : '30px', border: '1px solid #b8daff', borderRadius: '8px', overflow: 'hidden', backgroundColor: '#f0f9ff' }}>
        <div style={{ backgroundColor: '#cce5ff', padding: isMobile ? '10px' : '15px 20px', borderBottom: '1px solid #b8daff', display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 'bold', color: '#004085', fontSize: isMobile ? '14px' : '16px' }}>
          <FaDatabase /> База данных
        </div>
        <div style={{ padding: isMobile ? '5px' : '20px', backgroundColor: 'white', overflowX: 'auto' }}>
          {renderDbSection()}
        </div>
      </div>

      {/* Отображение информации по секциям */}
      {sections.map((section, sectionIndex) => (
        <div key={sectionIndex} style={{ marginBottom: isMobile ? '15px' : '30px', border: '1px solid #b8daff', borderRadius: '8px', overflow: 'hidden' }}>
          <div style={{ backgroundColor: '#cce5ff', padding: isMobile ? '10px' : '15px 20px', borderBottom: '1px solid #b8daff', display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 'bold', color: '#004085', fontSize: isMobile ? '14px' : '16px' }}>
            {section.icon}
            {section.title}
          </div>
          <div style={{ padding: isMobile ? '5px' : '20px', backgroundColor: 'white', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: isMobile ? '12px' : '14px' }}>
              <tbody>
                {section.keys.map((key, index) => (
                  <tr key={index} style={{ borderBottom: index < section.keys.length - 1 ? '1px solid #f0f0f0' : 'none' }}>
                    <td style={{ ...labelTdStyle, padding: isMobile ? '6px' : '12px', width: isMobile ? '40%' : '40%' }}>{key}:</td>
                    <td style={{ padding: isMobile ? '6px' : '12px', color: info[key] ? '#212529' : '#6c757d', fontFamily: info[key]?.includes('http') ? 'monospace' : 'inherit', wordBreak: 'break-all' }}>
                      {info[key] || 'Не доступно'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      {/* Дополнительная информация */}
      <div style={{ backgroundColor: '#f8f9fa', padding: isMobile ? '10px' : '20px', borderRadius: '8px', marginTop: isMobile ? '15px' : '30px' }}>
        <h3 style={{ marginTop: 0, fontSize: isMobile ? '16px' : '18px' }}>Как использовать эту информацию?</h3>
        <ul style={{ color: '#666', lineHeight: '1.6', paddingLeft: '20px', fontSize: isMobile ? '12px' : '14px' }}>
          <li><strong>Отладка:</strong> При проблемах с подключением к серверу проверьте API URL</li>
          <li><strong>Поддержка:</strong> При обращении в техподдержку скопируйте эту информацию</li>
          <li><strong>Разработка:</strong> Убедитесь, что окружение (development/production) выбрано правильно</li>
          <li><strong>База данных:</strong> Проверьте, что бэкенд подключается к правильной БД (хост, порт, имя)</li>
        </ul>
      </div>

      {/* МОДАЛЬНОЕ ОКНО ИСТОРИИ ВЕРСИЙ */}
      {isVersionModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: isMobile ? '0' : '20px' }}>
          <div style={{ backgroundColor: 'white', padding: isMobile ? '15px' : '20px', borderRadius: isMobile ? '0' : '8px', width: isMobile ? '100vw' : '100%', maxWidth: isMobile ? '100vw' : '600px', height: isMobile ? '100vh' : 'auto', maxHeight: isMobile ? '100vh' : '80vh', display: 'flex', flexDirection: 'column', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #eee', paddingBottom: '15px', marginBottom: '15px' }}>
              <h3 style={{ margin: 0, color: '#0d47a1', fontSize: isMobile ? '18px' : '20px' }}>История версий</h3>
              <button onClick={() => setIsVersionModalOpen(false)} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#666', lineHeight: 1 }} title="Закрыть">
                <FaTimes />
              </button>
            </div>
            
            <div style={{ overflowY: 'auto', flex: 1, paddingRight: '10px' }}>
              {APP_VERSIONS.map((v, index) => (
                <div key={v.version} style={{ marginBottom: '15px', paddingBottom: '15px', borderBottom: index !== APP_VERSIONS.length - 1 ? '1px dashed #dee2e6' : 'none' }}>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '5px' }}>
                    <span style={{ fontWeight: 'bold', fontSize: isMobile ? '14px' : '16px', color: '#0056b3', backgroundColor: '#e3f2fd', padding: '2px 8px', borderRadius: '4px' }}>v{v.version}</span>
                    <span style={{ fontSize: isMobile ? '12px' : '13px', color: '#6c757d', fontWeight: '500' }}>{new Date(v.date).toLocaleDateString('ru-RU')}</span>
                  </div>
                  <div style={{ fontSize: isMobile ? '13px' : '14px', color: '#333', lineHeight: 1.5 }}>{v.description}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

const labelTdStyle = {
  padding: '12px',
  width: '40%',
  fontWeight: '500',
  color: '#495057',
  verticalAlign: 'top'
};

const valueTdStyle = {
  padding: '12px',
  color: '#212529',
  fontFamily: 'monospace', 
  wordBreak: 'break-all'
};

export default EnvironmentInfoPage;