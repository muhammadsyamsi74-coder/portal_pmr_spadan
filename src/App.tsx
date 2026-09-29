import React, { useState } from 'react';
import { MenuKey, UtilitySubModule } from './types';
import { useAuth } from './context/AuthContext';
import { FloatingHeader } from './components/navigation/FloatingHeader';
import { Sidebar } from './components/navigation/Sidebar';
import { MobileNav } from './components/navigation/MobileNav';

import { DashboardView } from './components/views/DashboardView';
import { AnggotaView } from './components/views/AnggotaView';
import { PresensiView } from './components/views/PresensiView';
import { UtilityView } from './components/views/UtilityView';

import { LoginModal } from './components/modals/LoginModal';
import { RegisterModal } from './components/modals/RegisterModal';
import { ForgotPasswordModal } from './components/modals/ForgotPasswordModal';
import { ResetPasswordModal } from './components/modals/ResetPasswordModal';
import { EditProfileModal } from './components/modals/EditProfileModal';
import { KtaVerifyModal } from './components/modals/KtaVerifyModal';

export const App: React.FC = () => {
  const [activeMenu, setActiveMenu] = useState<MenuKey>('dashboard');
  const [utilitySub, setUtilitySub] = useState<UtilitySubModule>(null);

  const handleNavigate = (menu: MenuKey) => {
    setActiveMenu(menu);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenUtility = (sub: UtilitySubModule) => {
    setUtilitySub(sub);
    setActiveMenu('pmr-tools');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className={`app-root ${activeMenu === 'dashboard' ? 'hide-mobile-header' : ''}`}>
      {/* 1. FLOATING HEADER */}
      <FloatingHeader hideOnMobile={activeMenu === 'dashboard'} />

      {/* 2. DESKTOP SIDEBAR */}
      <Sidebar activeMenu={activeMenu} onNavigate={handleNavigate} />

      {/* 3. MOBILE BOTTOM NAVIGATION */}
      <MobileNav activeMenu={activeMenu} onNavigate={handleNavigate} />

      {/* 4. MAIN VIEWPORT AREA */}
      <main className="main-content">
        <div id="app-viewport">
          {activeMenu === 'dashboard' && (
            <DashboardView
              onNavigateMenu={handleNavigate}
              onOpenUtilityModule={handleOpenUtility}
            />
          )}

          {activeMenu === 'anggota' && <AnggotaView />}

          {activeMenu === 'presensi' && <PresensiView />}

          {activeMenu === 'pmr-tools' && (
            <UtilityView initialSubModule={utilitySub} />
          )}
        </div>
      </main>

      {/* 5. GLOBAL MODALS */}
      <LoginModal />
      <RegisterModal />
      <ForgotPasswordModal />
      <ResetPasswordModal />
      <EditProfileModal />
      <KtaVerifyModal />
    </div>
  );
};
