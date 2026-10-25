// src/LoginPage.js
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { FaEye, FaEyeSlash } from 'react-icons/fa';

function LoginPage() {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  // Состояние для показа подсказки о восстановлении пароля
  const [showRecoveryInfo, setShowRecoveryInfo] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(phone, password, rememberMe);
      navigate('/'); // Перенаправляем на главную
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '400px', margin: '50px auto', padding: '20px', border: '1px solid #dee2e6', borderRadius: '8px' }}>
      <h2>Вход в систему</h2>
      
      {error && (
        <div style={{ color: '#721c24', backgroundColor: '#f8d7da', padding: '10px', borderRadius: '4px', marginBottom: '15px' }}>
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>Телефон:</label>
          <input 
            type="tel" 
            name="phone"
            value={phone} 
            onChange={e => setPhone(e.target.value)} 
            placeholder="+79031234567"
            required 
            autoComplete="tel"
            style={{ 
              width: '100%', 
              padding: '10px', 
              border: '1px solid #ddd', 
              borderRadius: '4px',
              boxSizing: 'border-box', // 👈 Вот это выровняет ширину
              fontSize: '16px'
            }}
          />
        </div>
        
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>Пароль:</label>
          
          <div style={{ 
            display: 'flex', 
            alignItems: 'center',
            border: '1px solid #ddd', 
            borderRadius: '4px',
            backgroundColor: 'white'
          }}>
            <input 
              type={showPassword ? "text" : "password"} 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              required 
              style={{ 
                flex: 1, // Занимает всё свободное место
                width: '100%',
                padding: '10px', 
                border: 'none', // Убираем рамку у самого инпута
                outline: 'none',
                backgroundColor: 'transparent',
                fontSize: '16px'
              }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#6c757d',
                display: 'flex',
                alignItems: 'center',
                padding: '0 10px', // Отступы по бокам для кнопки
                height: '100%'
              }}
              title={showPassword ? "Скрыть пароль" : "Показать пароль"}
            >
              {showPassword ? <FaEyeSlash size={18} /> : <FaEye size={18} />}
            </button>
          </div>
        </div>
        
        <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <label style={{ fontSize: '14px' }}>
            <input 
              type="checkbox" 
              checked={rememberMe} 
              onChange={e => setRememberMe(e.target.checked)} 
              style={{ marginRight: '8px' }}
            />
            Запомнить меня
          </label>
          
          <button 
            type="button" 
            onClick={() => setShowRecoveryInfo(!showRecoveryInfo)}
            style={{ background: 'none', border: 'none', color: '#007bff', cursor: 'pointer', fontSize: '14px' }}
          >
            Забыли пароль?
          </button>
        </div>

                {/* Подсказка по восстановлению пароля */}
        {showRecoveryInfo && (
          <div style={{ 
            backgroundColor: '#e3f2fd', 
            padding: '15px', 
            borderRadius: '4px', 
            fontSize: '13px', 
            marginBottom: '20px', 
            color: '#0d47a1' 
          }}>
            <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>
              💡 Для восстановления пароля обратитесь к администратору:
            </div>
            <ul style={{ margin: 0, paddingLeft: '20px', lineHeight: '1.8' }}>
              <li>
                📞 <a href="tel:+79031462318" style={{ color: '#0d47a1' }}>+7 903 146-23-18</a>
              </li>
              <li>
                ✈️ <a href="https://t.me/oleg_vavilov_108" target="_blank" rel="noopener noreferrer" style={{ color: '#0d47a1' }}>Telegram: @oleg_vavilov_108</a>
              </li>
              <li>
                ✉️ <a href="mailto:there@rambler.ru" style={{ color: '#0d47a1' }}>there@rambler.ru</a>
              </li>
            </ul>
            <div style={{ marginTop: '10px', fontSize: '12px', color: '#1565c0' }}>
              Укажите ваш номер телефона, и администратор сбросит вам пароль.
            </div>
          </div>
        )}
        
        <button 
          type="submit" 
          disabled={loading} 
          style={{ width: '100%', padding: '12px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', fontSize: '16px', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}
        >
          {loading ? 'Вход...' : 'Войти'}
        </button>
      </form>

      {/* Ссылка на регистрацию */}
      <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '14px' }}>
        Нет аккаунта? <Link to="/register" style={{ color: '#007bff', textDecoration: 'none', fontWeight: '500' }}>Зарегистрироваться</Link>
      </div>
    </div>
  );
}

export default LoginPage;