// src/components/RoleRoute.js
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function RoleRoute({ children, allowedRoles }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div style={{ padding: '50px', textAlign: 'center' }}>Загрузка...</div>;
  }

  // Если роли пользователя не пересекаются с разрешенными — выкидываем на главную
  const hasAccess = user?.roles?.some(role => allowedRoles.includes(role));

  if (!hasAccess) {
    // Можно сделать красивую страницу 403, но пока просто редирект
    alert('У вас нет прав для просмотра/редактирования этого раздела.');
    return <Navigate to="/" replace />;
  }

  return children;
}