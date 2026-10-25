// src/RegisterPage.js
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import API_URL from './config/api';

function RegisterPage() {
  const [formData, setFormData] = useState({
    phone: '',
    password: '',
    confirmPassword: '',
    name: '',
    email: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Валидация формы
  const passwordsMatch = formData.password === formData.confirmPassword;
  const isPasswordLongEnough = formData.password.length >= 8;
  const isFormFilled = formData.phone.trim() !== '' && formData.name.trim() !== '';
  
  const isFormValid = isFormFilled && isPasswordLongEnough && passwordsMatch;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isFormValid) return; // Защита на всякий случай

    setError('');
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: formData.phone,
          password: formData.password,
          name: formData.name,
          email: formData.email
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Ошибка регистрации');
      }

      setSuccess(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div style={{ maxWidth: '400px', margin: '50px auto', padding: '20px', border: '1px solid #dee2e6', borderRadius: '8px', textAlign: 'center' }}>
        <h2 style={{ color: '#28a745' }}>✅ Заявка отправлена</h2>
        <p style={{ marginTop: '20px', lineHeight: '1.6' }}>
          Ваша регистрация успешно создана и ожидает подтверждения администратора.
        </p>
        <p style={{ fontSize: '14px', color: '#666' }}>
          💡 Уведомление о подтверждении придёт на указанный Email. 
          Если Email не указан — администратор свяжется с вами через мессенджеры (Telegram, MAX, WhatsApp), привязанные к вашему номеру телефона.
        </p>
        <Link to="/login" style={{ display: 'inline-block', marginTop: '20px', color: '#007bff', textDecoration: 'none' }}>
          Вернуться на страницу входа
        </Link>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '400px', margin: '50px auto', padding: '20px', border: '1px solid #dee2e6', borderRadius: '8px' }}>
      <h2>Регистрация</h2>
      
      {error && (
        <div style={{ color: '#721c24', backgroundColor: '#f8d7da', padding: '10px', borderRadius: '4px', marginBottom: '15px' }}>
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        {/* Телефон */}
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>Телефон: *</label>
          <input 
            type="text" 
            name="phone"
            value={formData.phone} 
            onChange={handleChange} 
            placeholder="+79031234567"
            required 
            autoComplete="off"
            style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px', boxSizing: 'border-box', fontSize: '16px' }}
          />
        </div>

        {/* Имя */}
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>Имя: *</label>
          <input 
            type="text" 
            name="name"
            value={formData.name} 
            onChange={handleChange} 
            placeholder="Иван Иванов"
            required 
            autoComplete="off"
            style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px', boxSizing: 'border-box', fontSize: '16px' }}
          />
        </div>

        {/* Email */}
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>Email (опционально):</label>
          <input 
            type="email" 
            name="email"
            value={formData.email} 
            onChange={handleChange} 
            placeholder="your@email.com"
            autoComplete="off"
            style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px', boxSizing: 'border-box', fontSize: '16px' }}
          />
          <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
            💡 На этот email придёт уведомление о подтверждении. Если не указать — свяжемся через мессенджеры (MAX, Telegram, WhatsApp).
          </div>
        </div>
        
        {/* Пароль */}
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>Пароль: *</label>
          <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #ddd', borderRadius: '4px', backgroundColor: 'white' }}>
            <input 
              type={showPassword ? "text" : "password"} 
              name="password"
              value={formData.password} 
              onChange={handleChange} 
              required 
              autoComplete="new-password"
              style={{ flex: 1, width: '100%', padding: '10px', border: 'none', outline: 'none', backgroundColor: 'transparent', fontSize: '16px' }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6c757d', display: 'flex', alignItems: 'center', padding: '0 10px', height: '100%' }}
            >
              {showPassword ? <FaEyeSlash size={18} /> : <FaEye size={18} />}
            </button>
          </div>
          {/* Валидация длины пароля */}
          {formData.password.length > 0 && !isPasswordLongEnough && (
            <div style={{ color: '#dc3545', fontSize: '12px', marginTop: '4px' }}>
              Минимум 8 символов
            </div>
          )}
        </div>

        {/* Подтверждение пароля */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>Повторите пароль: *</label>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            border: `1px solid ${formData.confirmPassword.length > 0 && !passwordsMatch ? '#dc3545' : '#ddd'}`, 
            borderRadius: '4px', 
            backgroundColor: 'white' 
          }}>
            <input 
              type={showConfirmPassword ? "text" : "password"} 
              name="confirmPassword"
              value={formData.confirmPassword} 
              onChange={handleChange} 
              required 
              autoComplete="new-password"
              style={{ flex: 1, width: '100%', padding: '10px', border: 'none', outline: 'none', backgroundColor: 'transparent', fontSize: '16px' }}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6c757d', display: 'flex', alignItems: 'center', padding: '0 10px', height: '100%' }}
            >
              {showConfirmPassword ? <FaEyeSlash size={18} /> : <FaEye size={18} />}
            </button>
          </div>
          {/* Валидация совпадения паролей */}
          {formData.confirmPassword.length > 0 && !passwordsMatch && (
            <div style={{ color: '#dc3545', fontSize: '12px', marginTop: '4px' }}>
              Пароли не совпадают
            </div>
          )}
        </div>
        
        {/* Кнопка */}
        <button 
          type="submit" 
          disabled={!isFormValid || loading} 
          style={{ 
            width: '100%', 
            padding: '12px', 
            backgroundColor: (!isFormValid || loading) ? '#6c757d' : '#28a745', 
            color: 'white', 
            border: 'none', 
            borderRadius: '4px', 
            fontSize: '16px', 
            cursor: (!isFormValid || loading) ? 'not-allowed' : 'pointer', 
            opacity: (!isFormValid || loading) ? 0.7 : 1,
            transition: 'background-color 0.2s'
          }}
        >
          {loading ? 'Отправка...' : 'Зарегистрироваться'}
        </button>
      </form>

      <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '14px' }}>
        Уже есть аккаунт? <Link to="/login" style={{ color: '#007bff', textDecoration: 'none', fontWeight: '500' }}>Войти</Link>
      </div>
    </div>
  );
}

export default RegisterPage;