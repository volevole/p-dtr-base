// EnvironmentInfoPage.js
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getDisplayEnvironmentInfo, copyEnvironmentInfoToClipboard, logEnvironmentInfo } from './utils/environmentInfo';
import { FaCopy, FaTerminal, FaServer, FaDesktop, FaInfoCircle } from 'react-icons/fa';

function EnvironmentInfoPage() {
  const [info, setInfo] = useState({});
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const envInfo = getDisplayEnvironmentInfo();
    setInfo(envInfo);
    
    // Логируем в консоль при загрузке страницы
    logEnvironmentInfo();
  }, []);

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
      keys: ['Разрешение экрана', 'Размер окна', 'Платформа', 'Язык', 'React версия', 'Node окружение', 'Доступен localStorage']
    }
  ];

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: 'auto' }}>
      <div style={{ marginBottom: '20px' }}>
        <Link to="/">← На главную</Link>
      </div>

      <h1 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <FaTerminal />
        Информация об окружении
      </h1>

      <p style={{ color: '#666', marginBottom: '30px' }}>
        Детальная информация о текущем окружении приложения, сервере и клиенте.
        Полезно для отладки и технической поддержки.
      </p>

      {/* Кнопки действий */}
      <div style={{ 
        display: 'flex', 
        gap: '15px',
        marginBottom: '30px',
        flexWrap: 'wrap'
      }}>
        <button
          onClick={handleCopy}
          style={{
            padding: '10px 20px',
            backgroundColor: copied ? '#28a745' : '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <FaCopy />
          {copied ? 'Скопировано!' : 'Копировать в буфер'}
        </button>

        <button
          onClick={logEnvironmentInfo}
          style={{
            padding: '10px 20px',
            backgroundColor: '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <FaTerminal />
          Вывести в консоль
        </button>
      </div>

      {/* Отображение информации по секциям */}
      {sections.map((section, sectionIndex) => (
        <div 
          key={sectionIndex}
          style={{
            marginBottom: '30px',
            border: '1px solid #dee2e6',
            borderRadius: '8px',
            overflow: 'hidden'
          }}
        >
          <div style={{
            backgroundColor: '#f8f9fa',
            padding: '15px 20px',
            borderBottom: '1px solid #dee2e6',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontWeight: 'bold'
          }}>
            {section.icon}
            {section.title}
          </div>

          <div style={{ padding: '20px', backgroundColor: 'white' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                {section.keys.map((key, index) => (
                  <tr 
                    key={index}
                    style={{ 
                      borderBottom: index < section.keys.length - 1 ? '1px solid #f0f0f0' : 'none'
                    }}
                  >
                    <td style={{ 
                      padding: '12px',
                      width: '40%',
                      fontWeight: '500',
                      color: '#495057',
                      verticalAlign: 'top'
                    }}>
                      {key}:
                    </td>
                    <td style={{ 
                      padding: '12px',
                      color: info[key] ? '#212529' : '#6c757d',
                      fontFamily: info[key]?.includes('http') ? 'monospace' : 'inherit',
                      wordBreak: 'break-all'
                    }}>
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
      <div style={{ 
        backgroundColor: '#f8f9fa', 
        padding: '20px', 
        borderRadius: '8px',
        marginTop: '30px'
      }}>
        <h3 style={{ marginTop: 0 }}>Как использовать эту информацию?</h3>
        <ul style={{ color: '#666', lineHeight: '1.6' }}>
          <li><strong>Отладка:</strong> При проблемах с подключением к серверу проверьте API URL</li>
          <li><strong>Поддержка:</strong> При обращении в техподдержку скопируйте эту информацию</li>
          <li><strong>Разработка:</strong> Убедитесь, что окружение (development/production) выбрано правильно</li>
          <li><strong>Тестирование:</strong> Проверьте, как приложение работает на разных разрешениях экрана</li>
        </ul>
      </div>

      <div style={{ 
        marginTop: '30px', 
        padding: '15px',
        backgroundColor: '#e7f1ff',
        borderRadius: '8px',
        fontSize: '14px'
      }}>
        <strong>Примечание:</strong> Эта информация доступна только авторизованным пользователям 
        и не содержит конфиденциальных данных (пароли, ключи API и т.д.).
      </div>
    </div>
  );
}

export default EnvironmentInfoPage;