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
import TestPreview from './TestPreview';
import TestRefreshLinks from './TestRefreshLinks';
import TestImage from './TestImage';
import './App.css';

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

function App() {
  return (   
    <div className="App">      
      <Routes>
        {/* Публичные */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Защищенные */}
        <Route element={<ProtectedLayout />}>
          <Route path="/" element={<MusclesPage />} />
          <Route path="/organs" element={<OrgansPage />} />
          <Route path="/meridians" element={<MeridiansPage />} />
          <Route path="/dysfunctions" element={<DysfunctionsPage />} />
          <Route path="/muscle/:id" element={<MuscleDetail />} />          
          <Route path="/muscle/:id/edit" element={
              <RoleRoute allowedRoles={['admin', 'admin_content']}>
                <MuscleEditPage />
              </RoleRoute>
            } />
          <Route path="/muscle/:id/dysfunctions" element={<MuscleDysfunctions />} />
          <Route path="/group/:id" element={<GroupDetail />} />          
          <Route path="/group/:id/edit" element={
              <RoleRoute allowedRoles={['admin', 'admin_content']}>
                <GroupEditPage />
              </RoleRoute>
            } />
          <Route path="/organ/:id" element={<OrganDetail />} />
          <Route path="/meridian/:id" element={<MeridianDetail />} />
          <Route path="/organ/:id/edit" element={
              <RoleRoute allowedRoles={['admin', 'admin_content']}>
                <OrganEditPage />
              </RoleRoute>
            } />          
          <Route path="/meridian/:id/edit" element={
              <RoleRoute allowedRoles={['admin', 'admin_content']}>
                <MeridianEditPage />
              </RoleRoute>
            } />
          <Route path="/dysfunction/:id/edit" element={
              <RoleRoute allowedRoles={['admin', 'admin_content']}>
                <DysfunctionEditPage />
              </RoleRoute>
            } />
          <Route path="/dysfunction/:id" element={<DysfunctionDetail />} />
          <Route path="/groups" element={<GroupsPage />} />
          
          <Route path="/receptor_classes" element={<ReceptorClassList />} />	  
          <Route path="/receptor_class/:id" element={<ReceptorClassDetail />} />
          <Route path="/receptor_class/:id/edit" element={
              <RoleRoute allowedRoles={['admin', 'admin_content']}>
                <ReceptorClassEditPage />
              </RoleRoute>
            } />
          
          <Route path="/receptors" element={<ReceptorsPage />} />
          <Route path="/receptor/:id" element={<ReceptorDetail />} />
          <Route path="/receptor/:id/edit" element={
              <RoleRoute allowedRoles={['admin', 'admin_content']}>
                <ReceptorEditPage />
              </RoleRoute>
            } />
          
          <Route path="/tools" element={<ToolsPage />} />
          <Route path="/tool/:id" element={<ToolDetail />} />
          <Route path="/tool/:id/edit" element={
              <RoleRoute allowedRoles={['admin', 'admin_content']}>
                <ToolEditPage />
              </RoleRoute>
            } />
          
          <Route path="/entries" element={<EntriesPage />} />
          <Route path="/entry/:id" element={<EntryDetail />} />
          <Route path="/entry/:id/edit" element={
              <RoleRoute allowedRoles={['admin', 'admin_content']}>
                <EntryEdit />
              </RoleRoute>
            } />

          <Route path="/usefulness" element={<UsefulnessPage />} />
          <Route path="/usefulness/:id" element={<UsefulnessDetail />} />
          <Route path="/usefulness/:id/edit" element={
              <RoleRoute allowedRoles={['admin', 'admin_content']}>
                <UsefulnessEditPage />
              </RoleRoute>
            } />
          
          <Route path="/all-media" element={<AllMediaPage />} />	
          <Route path="/all-media" element={
              <RoleRoute allowedRoles={['admin', 'admin_content']}>
                <AllMediaPage />
              </RoleRoute>
            } />
          <Route path="/test-preview" element={<TestPreview />} />
          <Route path="/test-refresh" element={<TestRefreshLinks />} />
          <Route path="/test-image" element={<TestImage />} />
          <Route path="/media-viewer/:id" element={<MediaViewerPage />} />
          <Route path="/environment-info" element={<EnvironmentInfoPage />} />
          
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </div>
  );
}

export default App;