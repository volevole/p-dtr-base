// src/components/ProtectedRoute.js
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  // Пока проверяем токен — показываем заглушку (или спиннер)
  if (loading) {
    return <div style={{ padding: '50px', textAlign: 'center' }}>Загрузка...</div>;
  }

  // Если не залогинен — отправляем на страницу входа, запоминая, куда он шел
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Если залогинен — показываем страницу
  return children;
}