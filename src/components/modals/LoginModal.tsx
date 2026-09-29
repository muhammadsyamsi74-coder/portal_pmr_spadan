import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../services/supabase';

export const LoginModal: React.FC = () => {
  const { isLoginModalOpen, closeLoginModal, openForgotPasswordModal, refreshProfile } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isLoginModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSubmitting(true);

    try {
      const trimmedEmail = email.trim().toLowerCase();
      if (!trimmedEmail) {
        throw new Error('Silakan masukkan email akun Anda.');
      }
      if (!password) {
        throw new Error('Silakan masukkan kata sandi.');
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password
      });

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          throw new Error('Email atau kata sandi tidak cocok. Silakan periksa kembali.');
        } else if (error.message.includes('Email not confirmed')) {
          throw new Error('Email belum dikonfirmasi. Silakan periksa kotak masuk/spam email Anda.');
        }
        throw error;
      }

      if (!data.user) {
        throw new Error('Gagal mengautentikasi pengguna.');
      }

      // Security Check: Pastikan profil terdaftar resmi di basis data PMR SPADAN
      const { data: prof, error: profErr } = await supabase
        .from('users_profile')
        .select('*')
        .eq('id', data.user.id)
        .single();

      if (profErr || !prof) {
        // Keluarkan sesi otomatis karena bukan anggota terdaftar resmi
        await supabase.auth.signOut({ scope: 'local' });
        throw new Error('Akun Anda tidak terdaftar dalam pangkalan data anggota PMR SPADAN. Silakan mendaftar terlebih dahulu.');
      }

      // Pastikan status akun aktif (bukan non-aktif yang belum disetujui Pembina)
      if (prof.jabatan === 'non-aktif') {
        await supabase.auth.signOut({ scope: 'local' });
        throw new Error('Akun Anda masih berstatus Non-Aktif dan menunggu persetujuan / aktivasi oleh Pembina.');
      }

      await refreshProfile();
      setEmail('');
      setPassword('');
      closeLoginModal();
    } catch (err: any) {
      setErrorMessage(err.message || 'Gagal masuk akun. Periksa email dan kata sandi Anda.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="app-modal-backdrop active">
      <div className="app-modal-card" style={{ height: 'auto', maxHeight: '85vh' }}>
        <div className="app-modal-header">
          <h3>Masuk ke Akun PMR</h3>
          <button
            type="button"
            className="app-modal-close"
            onClick={closeLoginModal}
            aria-label="Tutup Modal"
          >
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="app-modal-body">
            {errorMessage && (
              <div style={{ background: '#fee2e2', color: '#b91c1c', padding: '10px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 600 }}>
                {errorMessage}
              </div>
            )}

            <div className="modal-form-group">
              <label htmlFor="login-email">Email Akun</label>
              <input
                type="email"
                id="login-email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nama@email.com"
                required
                autoComplete="email"
              />
            </div>

            <div className="modal-form-group">
              <label htmlFor="login-password">Password</label>
              <input
                type="password"
                id="login-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Masukkan kata sandi"
                required
                autoComplete="current-password"
              />
            </div>

            <div style={{ textAlign: 'right', marginTop: '2px' }}>
              <button
                type="button"
                onClick={openForgotPasswordModal}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--maroon)',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  textDecoration: 'underline'
                }}
              >
                Lupa kata sandi?
              </button>
            </div>
          </div>

          <div className="app-modal-footer">
            <button
              type="button"
              className="btn-modal-cancel"
              onClick={closeLoginModal}
              disabled={submitting}
            >
              Batal
            </button>
            <button
              type="submit"
              className="btn-modal-submit"
              disabled={submitting}
            >
              {submitting ? 'Memproses...' : 'Masuk'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
