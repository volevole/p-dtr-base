// src/context/AuthContext.js
import React, { createContext, useContext, useState, useEffect } from 'react';
import API_URL from '../config/api';
import FingerprintJS from '@fingerprintjs/fingerprintjs';

const AuthContext = createContext(null);

// Генерация и получение ID устройства
    // Инициализируем агент один раз при старте приложения (для кэширования)
const fpPromise = FingerprintJS.load();

    // 👈 Универсальная функция получения ID
const getDeviceId = async () => {
    try {
        // 1. Пытаемся получить отпечаток через библиотеку
        const fp = await fpPromise;
        const result = await fp.get();
        return result.visitorId; 
    } catch (error) {
        console.warn('Не удалось получить отпечаток, используем резервный ID:', error);
        
        // 2. Резервный вариант: берем из localStorage или создаем новый
        let fallbackId = localStorage.getItem('larchik_fallback_device_id');
        if (!fallbackId) {
        // Если crypto.randomUUID нет (старые браузеры), делаем простой рандом
        fallbackId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15);
        localStorage.setItem('larchik_fallback_device_id', fallbackId);
        }
        return `fallback_${fallbackId}`; // Добавляем префикс, чтобы отличать от настоящих отпечатков
    }
    };

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // При загрузке приложения проверяем, залогинен ли пользователь
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await fetch(`${API_URL}/api/auth/me`, {
        // credentials: 'include' нужно, чтобы браузер отправлял httpOnly cookies
        credentials: 'include' 
      });
      
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error('Ошибка проверки авторизации:', error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (phone, password, rememberMe) => {
    const deviceId = await getDeviceId();  // 👈 Получаем ID    
    const response = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ phone, password, rememberMe, deviceId })
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Ошибка входа');
    }

    setUser(data.user);
    return data.user;
  };

  const logout = async () => {
    try {
      await fetch(`${API_URL}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include'
      });
    } catch (error) {
      console.error('Ошибка выхода:', error);
    } finally {
      setUser(null);
    }
  };

  const value = {
    user,
    loading,
    login,
    logout,
    checkAuth
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth должен использоваться внутри AuthProvider');
  }
  return context;
}