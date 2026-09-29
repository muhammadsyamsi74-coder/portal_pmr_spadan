import React from 'react';
import { MenuKey } from '../../types';
import { Activity, ScanFace, ClipboardSignature, BriefcaseMedical } from 'lucide-react';

interface MobileNavProps {
  activeMenu: MenuKey;
  onNavigate: (menu: MenuKey) => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({ activeMenu, onNavigate }) => {
  return (
    <nav className="mobile-bottom-nav">
      <button
        type="button"
        className={`mobile-nav-item ${activeMenu === 'dashboard' ? 'active' : ''}`}
        onClick={() => onNavigate('dashboard')}
      >
        <Activity style={{ width: 19, height: 19 }} />
        <span>Dashboard</span>
      </button>

      <button
        type="button"
        className={`mobile-nav-item ${activeMenu === 'anggota' ? 'active' : ''}`}
        onClick={() => onNavigate('anggota')}
      >
        <ScanFace style={{ width: 19, height: 19 }} />
        <span>Anggota</span>
      </button>

      <button
        type="button"
        className={`mobile-nav-item ${activeMenu === 'presensi' ? 'active' : ''}`}
        onClick={() => onNavigate('presensi')}
      >
        <ClipboardSignature style={{ width: 19, height: 19 }} />
        <span>Presensi</span>
      </button>

      <button
        type="button"
        className={`mobile-nav-item ${activeMenu === 'pmr-tools' ? 'active' : ''}`}
        onClick={() => onNavigate('pmr-tools')}
      >
        <BriefcaseMedical style={{ width: 19, height: 19 }} />
        <span>Utility</span>
      </button>
    </nav>
  );
};
