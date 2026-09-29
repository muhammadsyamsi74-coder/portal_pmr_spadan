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

/**
 * ============================================================================
 * KOMPONEN UTAMA APLIKASI (APP.TSX)
 * ============================================================================
 * Berkas ini merupakan orchestrator utama antarmuka pengguna Portal PMR SPADAN:
 * 1. Mengelola status navigasi menu utama (Dashboard, Anggota, Presensi, Utility/PMR Tools).
 * 2. Mengatur perutean sub-modul utilitas (KTA, Kalender, UKS, Pustaka, Laporan, Pintasan).
 * 3. Menyediakan tata letak responsif: FloatingHeader, Desktop Sidebar, dan Mobile Bottom Navigation.
 * 4. Merender modal dialog global (Autentikasi, Edit Profil, Verifikasi QR KTA).
 */

export const App: React.FC = () => {
  // State menu aktif: 'dashboard' | 'anggota' | 'presensi' | 'pmr-tools'
  const [activeMenu, setActiveMenu] = useState<MenuKey>('dashboard');
  
  // State sub-modul utility yang sedang dibuka (misal: 'kta', 'kalender', 'uks', dll.)
  const [utilitySub, setUtilitySub] = useState<UtilitySubModule>(null);

  /**
   * Fungsi navigasi antar menu utama aplikasi.
   * Mengatur menu aktif dan menggulirkan viewport ke bagian paling atas layar secara halus.
   */
  const handleNavigate = (menu: MenuKey) => {
    setActiveMenu(menu);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  /**
   * Fungsi pintasan untuk membuka langsung sub-modul tertentu pada menu PMR Tools/Utility.
   * Contoh: Membuka 'kta' atau 'kalender' langsung dari widget Dashboard.
   */
  const handleOpenUtility = (sub: UtilitySubModule) => {
    setUtilitySub(sub);
    setActiveMenu('pmr-tools');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className={`app-root ${activeMenu === 'dashboard' ? 'hide-mobile-header' : ''}`}>
      {/* 1. FLOATING HEADER (Header mengambang dengan profil pengguna & status login) */}
      <FloatingHeader hideOnMobile={activeMenu === 'dashboard'} />

      {/* 2. DESKTOP SIDEBAR (Bilah menu samping kiri untuk layar laptop & desktop) */}
      <Sidebar activeMenu={activeMenu} onNavigate={handleNavigate} />

      {/* 3. MOBILE BOTTOM NAVIGATION (Bilah navigasi bawah untuk layar smartphone) */}
      <MobileNav activeMenu={activeMenu} onNavigate={handleNavigate} />

      {/* 4. MAIN VIEWPORT AREA (Area tampilan halaman utama yang aktif) */}
      <main className="main-content">
        <div id="app-viewport">
          {/* Tampilan 1: Dashboard Eksekutif */}
          {activeMenu === 'dashboard' && (
            <DashboardView
              onNavigateMenu={handleNavigate}
              onOpenUtilityModule={handleOpenUtility}
            />
          )}

          {/* Tampilan 2: Manajemen & Direktori Keanggotaan */}
          {activeMenu === 'anggota' && <AnggotaView />}

          {/* Tampilan 3: Presensi Kegiatan & Dokumentasi Foto */}
          {activeMenu === 'presensi' && <PresensiView />}

          {/* Tampilan 4: Modul Utility & Tools Organisasi (KTA, Kalender, UKS, Pustaka, Laporan) */}
          {activeMenu === 'pmr-tools' && (
            <UtilityView initialSubModule={utilitySub} />
          )}
        </div>
      </main>

      {/* 5. GLOBAL MODALS (Dialog pop-up global yang dapat dipicu dari mana saja) */}
      <LoginModal />
      <RegisterModal />
      <ForgotPasswordModal />
      <ResetPasswordModal />
      <EditProfileModal />
      <KtaVerifyModal />
    </div>
  );
};
