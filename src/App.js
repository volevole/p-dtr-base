// App.js
import React, { useState } from 'react'  // ← ВАЖНО: добавить useState
import { Routes, Route } from 'react-router-dom'
import Sidebar from './Sidebar'; 
import AllMediaPage from './utils/AllMediaPage';
import EnvironmentInfoPage from './EnvironmentInfoPage';

// Импорт страниц про мышцы
import MuscleDetail from './MuscleDetail'      
import MuscleEditPage from './MuscleEditPage'
import MusclesPage from './MusclesPage';

// Импорт страниц про группы мышц
import GroupDetail from './GroupDetail';
import GroupEditPage from './GroupEditPage';
import GroupsPage from './GroupsPage.js';

// Импорт страниц про органы
import OrganDetail from './OrganDetail';
import OrgansPage from './OrgansPage';
import OrganEditPage from './OrganEditPage';

// Импорт страниц про меридианы
import MeridianEditPage from './MeridianEditPage';
import MeridianDetail from './MeridianDetail';
import MeridiansPage from './MeridiansPage';

// Импорт страниц про дисфункции
import MuscleDysfunctions from './MuscleDysfunctions'
import DysfunctionsPage from './DysfunctionsPage';
import DysfunctionEditPage from './DysfunctionEditPage';
import DysfunctionDetail from './DysfunctionDetail';

// Импорт страниц про классы рецепторов 
import ReceptorClassList from './ReceptorClassList';
import ReceptorClassDetail from './ReceptorClassDetail';
import ReceptorClassEditPage from './ReceptorClassEditPage';

// Импорт страниц про рецепторы
import ReceptorsPage from './ReceptorsPage';
import ReceptorDetail from './ReceptorDetail';
import ReceptorEditPage from './ReceptorEditPage';

// Импорт страниц про инструменты
import ToolsPage from './ToolsPage';
import ToolDetail from './ToolDetail';
import ToolEditPage from './ToolEditPage';

// Импорт страниц про заходы
import EntriesPage from './EntriesPage';
import EntryDetail from './EntryDetail';
import EntryEdit from './EntryEditPage';

import './App.css';   //стили

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);  // ← Теперь useState определен

  return (   
    <div className="App">      
      <div className="app-container">
        {/* Сайдбар с классом и динамическим open */}
        <Sidebar 
          isOpen={sidebarOpen} 
          onToggle={() => setSidebarOpen(!sidebarOpen)} 
        />
        
        {/* Основной контент */}
        <div className={`main-content ${sidebarOpen ? 'menu-open' : ''}`}>
		  {/* Кнопка гамбургер - теперь переключатель */}
		  <button 
			onClick={() => setSidebarOpen(!sidebarOpen)}
			className="menu-toggle"
			aria-label={sidebarOpen ? "Закрыть меню" : "Открыть меню"}
		  >
			{sidebarOpen ? '✕' : '☰'}
		  </button>
          
          <Routes>
            <Route path="/" element={<MusclesPage />} />
            <Route path="/organs" element={<OrgansPage />} />
            <Route path="/meridians" element={<MeridiansPage />} />
            <Route path="/dysfunctions" element={<DysfunctionsPage />} />
            <Route path="/muscle/:id" element={<MuscleDetail />} />
            <Route path="/muscle/:id/edit" element={<MuscleEditPage />} />
            <Route path="/muscle/:id/dysfunctions" element={<MuscleDysfunctions />} />
            <Route path="/group/:id" element={<GroupDetail />} />
            <Route path="/group/:id/edit" element={<GroupEditPage />} />
            <Route path="/organ/:id" element={<OrganDetail />} />
            <Route path="/meridian/:id" element={<MeridianDetail />} />
            <Route path="/organ/:id/edit" element={<OrganEditPage />} />
            <Route path="/meridian/:id/edit" element={<MeridianEditPage />} />
            <Route path="/dysfunction/:id/edit" element={<DysfunctionEditPage />} />
            <Route path="/dysfunction/:id" element={<DysfunctionDetail />} />
            <Route path="/groups" element={<GroupsPage />} />
            
            <Route path="/receptor-classes" element={<ReceptorClassList />} />	  
            <Route path="/receptor-class/:id" element={<ReceptorClassDetail />} />
            <Route path="/receptor-class/:id/edit" element={<ReceptorClassEditPage />} />
            
            <Route path="/receptors" element={<ReceptorsPage />} />
            <Route path="/receptor/:id" element={<ReceptorDetail />} />
            <Route path="/receptor/:id/edit" element={<ReceptorEditPage />} />
            
            <Route path="/tools" element={<ToolsPage />} />
            <Route path="/tool/:id" element={<ToolDetail />} />
            <Route path="/tool/:id/edit" element={<ToolEditPage />} />
            
            <Route path="/entries" element={<EntriesPage />} />
            <Route path="/entry/:id" element={<EntryDetail />} />
            <Route path="/entry/:id/edit" element={<EntryEdit />} />
            
            <Route path="/all-media" element={<AllMediaPage />} />	
            <Route path="/environment-info" element={<EnvironmentInfoPage />} />
          </Routes>
        </div>
        
        {/* Оверлей */}
        {sidebarOpen && (
          <div 
            onClick={() => setSidebarOpen(false)}
            className="menu-overlay"
          />
        )}
      </div>
    </div>
  );
}

export default App;