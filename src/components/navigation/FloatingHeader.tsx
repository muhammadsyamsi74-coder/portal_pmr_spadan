import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { LogIn, UserPlus, Settings, User as UserIcon, LogOut } from 'lucide-react';

interface FloatingHeaderProps {
  hideOnMobile?: boolean;
}

export const FloatingHeader: React.FC<FloatingHeaderProps> = ({ hideOnMobile = false }) => {
  const {
    user,
    profile,
    openLoginModal,
    openRegisterModal,
    openEditProfileModal,
    logout
  } = useAuth();

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    setDropdownOpen(false);
    await logout();
  };

  const displayName = profile?.nama_lengkap || user?.email || 'Tamu';
  const displayRole = profile ? `${(profile.jabatan || 'Anggota').toUpperCase()} (${profile.keterangan_jabatan || '-'})` : 'Guest';
  const initial = (profile?.nama_panggilan || displayName || '?').charAt(0).toUpperCase();

  return (
    <header className={`floating-header ${hideOnMobile ? 'mobile-hidden' : ''}`}>
      <div className="brand-section">
        <div className="brand-icon">
          <img
            src="https://ndahxwqshyukqpnjkniw.supabase.co/storage/v1/object/public/profil-anggota/LOGO%20PMI%20untuk%20aplikasi.png"
            alt="Logo PMI"
          />
        </div>
        <div className="brand-title">
          <h1>PMR SPADAN</h1>
          <p>SMPN 8 BALIKPAPAN</p>
        </div>
      </div>

      <div className="header-actions" ref={dropdownRef}>
        {!user ? (
          <div className="auth-group">
            <button
              type="button"
              className="btn-auth-gold"
              onClick={openLoginModal}
              title="Masuk Akun"
            >
              <LogIn style={{ width: 14, height: 14 }} />
              <span>Masuk</span>
            </button>
            <button
              type="button"
              className="btn-auth-outline"
              onClick={openRegisterModal}
              title="Daftar Baru"
            >
              <UserPlus style={{ width: 14, height: 14 }} />
              <span>Daftar</span>
            </button>
          </div>
        ) : (
          <div className="auth-group">
            <div className="user-greeting">
              <p className="u-name">{displayName}</p>
              <p className="u-role">{displayRole}</p>
            </div>

            <div
              className="profile-wrapper"
              onClick={() => setDropdownOpen(!dropdownOpen)}
              role="button"
              tabIndex={0}
              title="Menu Profil"
            >
              <div className="profile-avatar">
                {profile?.foto_profil_url ? (
                  <img
                    src={profile.foto_profil_url}
                    alt={displayName}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }}
                  />
                ) : (
                  <span>{initial}</span>
                )}
              </div>
              <div className="gear-badge">
                <Settings style={{ width: 9, height: 9 }} />
              </div>
            </div>

            <div className={`profile-dropdown ${dropdownOpen ? 'active' : ''}`}>
              <button
                type="button"
                className="dropdown-item"
                onClick={() => {
                  setDropdownOpen(false);
                  openEditProfileModal();
                }}
              >
                <UserIcon style={{ width: 14, height: 14, color: 'var(--maroon)' }} />
                <span>Edit Profil</span>
              </button>
              <button
                type="button"
                className="dropdown-item danger"
                onClick={handleLogout}
              >
                <LogOut style={{ width: 14, height: 14 }} />
                <span>Keluar Akun</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};
