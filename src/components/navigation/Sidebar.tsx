import React from 'react';
import { MenuKey } from '../../types';
import { Activity, ScanFace, ClipboardSignature, BriefcaseMedical } from 'lucide-react';

interface SidebarProps {
  activeMenu: MenuKey;
  onNavigate: (menu: MenuKey) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeMenu, onNavigate }) => {
  return (
    <nav className="sidebar desktop-nav">
      <button
        type="button"
        className={`nav-item ${activeMenu === 'dashboard' ? 'active' : ''}`}
        onClick={() => onNavigate('dashboard')}
      >
        <Activity style={{ width: 24, height: 24 }} />
        <span>DASHBOARD</span>
      </button>

      <button
        type="button"
        className={`nav-item ${activeMenu === 'anggota' ? 'active' : ''}`}
        onClick={() => onNavigate('anggota')}
      >
        <ScanFace style={{ width: 24, height: 24 }} />
        <span>ANGGOTA</span>
      </button>

      <button
        type="button"
        className={`nav-item ${activeMenu === 'presensi' ? 'active' : ''}`}
        onClick={() => onNavigate('presensi')}
      >
        <ClipboardSignature style={{ width: 24, height: 24 }} />
        <span>PRESENSI</span>
      </button>

      <button
        type="button"
        className={`nav-item ${activeMenu === 'pmr-tools' ? 'active' : ''}`}
        onClick={() => onNavigate('pmr-tools')}
      >
        <BriefcaseMedical style={{ width: 24, height: 24 }} />
        <span>UTILITY</span>
      </button>
    </nav>
  );
};
