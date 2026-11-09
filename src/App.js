// src/App.js
import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation, Outlet } from 'react-router-dom';
import Sidebar from './Sidebar'; 
import { useAuth } from './context/AuthContext';
import RoleRoute from './components/RoleRoute';

// Импорты страниц
import AllMediaPage from './utils/AllMediaPage';
import EnvironmentInfoPage from './EnvironmentInfoPage';
import MediaViewerPage from './MediaViewerPage';
import LoginPage from './LoginPage';
import RegisterPage from './RegisterPage';
import AboutPage from './AboutPage';
import MuscleDetail from './MuscleDetail';      
import MuscleEditPage from './MuscleEditPage'
import MusclesPage from './MusclesPage';
import GroupDetail from './GroupDetail';
import GroupEditPage from './GroupEditPage';
import GroupsPage from './GroupsPage.js';
import OrganDetail from './OrganDetail';
import OrgansPage from './OrgansPage';
import OrganEditPage from './OrganEditPage';
import MeridianEditPage from './MeridianEditPage';
import MeridianDetail from './MeridianDetail';
import MeridiansPage from './MeridiansPage';
import MuscleDysfunctions from './MuscleDysfunctions'
import DysfunctionsPage from './DysfunctionsPage';
import DysfunctionEditPage from './DysfunctionEditPage';
import DysfunctionDetail from './DysfunctionDetail';
import ReceptorClassList from './ReceptorClassList';
import ReceptorClassDetail from './ReceptorClassDetail';
import ReceptorClassEditPage from './ReceptorClassEditPage';
import ReceptorsPage from './ReceptorsPage';
import ReceptorDetail from './ReceptorDetail';
import ReceptorEditPage from './ReceptorEditPage';
import ToolsPage from './ToolsPage';
import ToolDetail from './ToolDetail';
import ToolEditPage from './ToolEditPage';
import EntriesPage from './EntriesPage';
import EntryDetail from './EntryDetail';
import EntryEdit from './EntryEditPage';
import UsefulnessPage from './UsefulnessPage';
import UsefulnessDetail from './UsefulnessDetail';
import UsefulnessEditPage from './UsefulnessEditPage';
import ClientsPage from './appointments/ClientsPage';
import SchedulePage from './appointments/SchedulePage';
import AppointmentsListPage from './appointments/AppointmentsListPage';
import AppointmentDetailPage from './appointments/AppointmentDetailPage';
import TestPreview from './TestPreview';
import TestRefreshLinks from './TestRefreshLinks';
import TestImage from './TestImage';
import SettingsProfilePage from './SettingsProfilePage';
import AdminUsersPage from './AdminUsersPage';
import './App.css';

const APPOINTMENT_ROLES = ['admin', 'appointments'];
const ADMIN_PDTR_ROLES  = ['admin', 'admin_content'];

function ProtectedLayout() {
  const { user, loading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  // 👈 АВТОЗАКРЫТИЕ САЙДБАРА ПРИ СМЕНЕ URL
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  if (loading) {
    return <div style={{ padding: '50px', textAlign: 'center', fontSize: '20px' }}>Загрузка...</div>;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return (
    <div className="app-container">
      <Sidebar 
        isOpen={sidebarOpen} 
        onToggle={() => setSidebarOpen(!sidebarOpen)} 
      />
      
      <div className={`main-content ${sidebarOpen ? 'menu-open' : ''}`}>
        <button 
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="menu-toggle"
          aria-label={sidebarOpen ? "Закрыть меню" : "Открыть меню"}
        >
          {sidebarOpen ? '✕' : '☰'}
        </button>
        
        <Outlet />
      </div>
      
      {sidebarOpen && (
        <div onClick={() => setSidebarOpen(false)} className="menu-overlay" />
      )}
    </div>
  );
}

// 👈 НОВЫЙ КОМПОНЕНТ ДЛЯ УМНОГО РЕДИРЕКТА
function HomeRedirect() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div style={{ padding: '50px', textAlign: 'center' }}>Загрузка...</div>;
  }

  if (!user) return <Navigate to="/login" replace />;

  // 👈 Проверяем, есть ли ХОТЯ БЫ ОДНА роль из списка APPOINTMENT_ROLES у пользователя
  const hasAppointmentAccess = user?.roles?.some(role => APPOINTMENT_ROLES.includes(role));

  if (hasAppointmentAccess) {
    return <Navigate to="/appointments/schedule" replace />;
  }

  // Если нет доступа к приёмам — отправляем на мышцы
  return <Navigate to="/muscles" replace />;
}

function App() {
  // 👈 Определяем, является ли текущее окружение локальным
  const isLocalEnv = process.env.NODE_ENV === 'development';

  return (   
    <div className="App">      
      <Routes>
        {/* Публичные */}
        <Route path="/about" element={<AboutPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Защищенные */}
        <Route element={<ProtectedLayout />}>
          
          {/* 👈 Вместо <MusclesPage /> ставим умный редирект */}
          <Route path="/" element={<HomeRedirect />} />
          
          {/* Страницы мышц оставляем как есть, только добавляем путь для главной мышц, если нужно */}
          <Route path="/muscles" element={<MusclesPage />} />

          <Route path="/organs" element={<OrgansPage />} />
          <Route path="/meridians" element={<MeridiansPage />} />
          <Route path="/dysfunctions" element={<DysfunctionsPage />} />
          <Route path="/muscle/:id" element={<MuscleDetail />} />          
          <Route path="/muscle/:id/edit" element={
              <RoleRoute allowedRoles={ADMIN_PDTR_ROLES}>
                <MuscleEditPage />
              </RoleRoute>
            } />
          <Route path="/muscle/:id/dysfunctions" element={<MuscleDysfunctions />} />
          <Route path="/group/:id" element={<GroupDetail />} />          
          <Route path="/group/:id/edit" element={
              <RoleRoute allowedRoles={ADMIN_PDTR_ROLES}>
                <GroupEditPage />
              </RoleRoute>
            } />
          <Route path="/organ/:id" element={<OrganDetail />} />
          <Route path="/meridian/:id" element={<MeridianDetail />} />
          <Route path="/organ/:id/edit" element={
              <RoleRoute allowedRoles={ADMIN_PDTR_ROLES}>
                <OrganEditPage />
              </RoleRoute>
            } />          
          <Route path="/meridian/:id/edit" element={
              <RoleRoute allowedRoles={ADMIN_PDTR_ROLES}>
                <MeridianEditPage />
              </RoleRoute>
            } />
          <Route path="/dysfunction/:id/edit" element={
              <RoleRoute allowedRoles={ADMIN_PDTR_ROLES}>
                <DysfunctionEditPage />
              </RoleRoute>
            } />
          <Route path="/dysfunction/:id" element={<DysfunctionDetail />} />
          <Route path="/groups" element={<GroupsPage />} />
          
          <Route path="/receptor_classes" element={<ReceptorClassList />} />	  
          <Route path="/receptor_class/:id" element={<ReceptorClassDetail />} />
          <Route path="/receptor_class/:id/edit" element={
              <RoleRoute allowedRoles={ADMIN_PDTR_ROLES}>
                <ReceptorClassEditPage />
              </RoleRoute>
            } />
          
          <Route path="/receptors" element={<ReceptorsPage />} />
          <Route path="/receptor/:id" element={<ReceptorDetail />} />
          <Route path="/receptor/:id/edit" element={
              <RoleRoute allowedRoles={ADMIN_PDTR_ROLES}>
                <ReceptorEditPage />
              </RoleRoute>
            } />
          
          <Route path="/tools" element={<ToolsPage />} />
          <Route path="/tool/:id" element={<ToolDetail />} />
          <Route path="/tool/:id/edit" element={
              <RoleRoute allowedRoles={ADMIN_PDTR_ROLES}>
                <ToolEditPage />
              </RoleRoute>
            } />
          
          <Route path="/entries" element={<EntriesPage />} />
          <Route path="/entry/:id" element={<EntryDetail />} />
          <Route path="/entry/:id/edit" element={
              <RoleRoute allowedRoles={ADMIN_PDTR_ROLES}>
                <EntryEdit />
              </RoleRoute>
            } />

          <Route path="/usefulness" element={<UsefulnessPage />} />
          <Route path="/usefulness/:id" element={<UsefulnessDetail />} />
          <Route path="/usefulness/:id/edit" element={
              <RoleRoute allowedRoles={ADMIN_PDTR_ROLES}>
                <UsefulnessEditPage />
              </RoleRoute>
            } />
          
          <Route path="/appointments/clients" element={
            <RoleRoute allowedRoles={APPOINTMENT_ROLES}>
              <ClientsPage />
            </RoleRoute>
            } />

          <Route path="/appointments/schedule" element={
              <RoleRoute allowedRoles={APPOINTMENT_ROLES}>
                <SchedulePage />
              </RoleRoute>
           } />

          <Route path="/appointments" element={
            <RoleRoute allowedRoles={APPOINTMENT_ROLES}>
                <AppointmentsListPage /> 
            </RoleRoute>
          } />
            
          <Route path="/appointments/:id" element={
            <RoleRoute allowedRoles={APPOINTMENT_ROLES}>
                <AppointmentDetailPage />
            </RoleRoute>
          } />            

          <Route path="/all-media" element={<AllMediaPage />} />	
          <Route path="/all-media" element={
              <RoleRoute allowedRoles={ADMIN_PDTR_ROLES}>
                <AllMediaPage />
              </RoleRoute>
          } />

          <Route path="/admin/users" element={
            <RoleRoute allowedRoles={['admin']}>
              <AdminUsersPage />
            </RoleRoute>
          } />

          <Route path="/test-preview" element={<TestPreview />} />
          <Route path="/test-refresh" element={<TestRefreshLinks />} />
          <Route path="/test-image" element={<TestImage />} />
          <Route path="/media-viewer/:id" element={<MediaViewerPage />} />
          <Route path="/environment-info" element={<EnvironmentInfoPage />} />
          <Route path="/settings/profile" element={<SettingsProfilePage />} />
          
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </div>
  );
}

export default App;