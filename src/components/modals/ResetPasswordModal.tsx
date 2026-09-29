import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../services/supabase';

export const ResetPasswordModal: React.FC = () => {
  const { isResetPasswordModalOpen, closeResetPasswordModal } = useAuth();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isResetPasswordModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (newPassword.length < 6) {
      setErrorMsg('Kata sandi baru minimal harus 6 karakter.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('Konfirmasi kata sandi tidak cocok!');
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

      alert('Kata sandi berhasil diperbarui! Silakan masuk dengan kata sandi baru Anda.');
      closeResetPasswordModal();
      window.location.hash = '';
    } catch (err: any) {
      setErrorMsg('Gagal memperbarui kata sandi: ' + (err.message || 'Kesalahan sistem.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="app-modal-backdrop active">
      <div className="app-modal-card" style={{ height: 'auto', maxHeight: '80vh' }}>
        <div className="app-modal-header">
          <h3>Buat Kata Sandi Baru</h3>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="app-modal-body">
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.5', fontWeight: 500 }}>
              Silakan buat kata sandi baru untuk akun Anda (minimal 6 karakter).
            </p>

            {errorMsg && (
              <div style={{ background: '#fee2e2', color: '#b91c1c', padding: '10px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 600 }}>
                {errorMsg}
              </div>
            )}

            <div className="modal-form-group" style={{ marginTop: '4px' }}>
              <label htmlFor="reset-new-password">Kata Sandi Baru</label>
              <input
                type="password"
                id="reset-new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimal 6 karakter"
                minLength={6}
                required
                autoComplete="new-password"
              />
            </div>

            <div className="modal-form-group">
              <label htmlFor="reset-confirm-password">Konfirmasi Kata Sandi</label>
              <input
                type="password"
                id="reset-confirm-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Ulangi kata sandi"
                minLength={6}
                required
                autoComplete="new-password"
              />
            </div>
          </div>

          <div className="app-modal-footer">
            <button
              type="submit"
              className="btn-modal-submit"
              disabled={submitting}
            >
              {submitting ? 'Menyimpan...' : 'Perbarui Sandi'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
