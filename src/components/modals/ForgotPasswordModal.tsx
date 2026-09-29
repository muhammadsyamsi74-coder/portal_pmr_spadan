import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../services/supabase';

export const ForgotPasswordModal: React.FC = () => {
  const { isForgotPasswordModalOpen, closeForgotPasswordModal } = useAuth();
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  if (!isForgotPasswordModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setSubmitting(true);

    try {
      const trimmedEmail = email.trim();
      const redirectUrl = window.location.origin + window.location.pathname;

      const { error } = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
        redirectTo: redirectUrl
      });

      if (error) throw error;

      setMessage({
        type: 'success',
        text: 'Tautan pemulihan kata sandi telah dikirim ke email Anda! Silakan periksa Kotak Masuk atau folder Spam.'
      });
      setEmail('');
    } catch (err: any) {
      setMessage({
        type: 'error',
        text: 'Gagal mengirim pemulihan: ' + (err.message || 'Terjadi kesalahan sistem.')
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="app-modal-backdrop active">
      <div className="app-modal-card" style={{ height: 'auto', maxHeight: '80vh' }}>
        <div className="app-modal-header">
          <h3>Pemulihan Kata Sandi</h3>
          <button
            type="button"
            className="app-modal-close"
            onClick={closeForgotPasswordModal}
            aria-label="Tutup Modal"
          >
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="app-modal-body">
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.5', fontWeight: 500 }}>
              Masukkan email akun PMR Anda yang telah terdaftar. Kami akan mengirimkan tautan untuk membuat kata sandi baru.
            </p>

            {message && (
              <div
                style={{
                  background: message.type === 'success' ? '#dcfce7' : '#fee2e2',
                  color: message.type === 'success' ? '#15803d' : '#b91c1c',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: 600,
                  marginTop: '6px'
                }}
              >
                {message.text}
              </div>
            )}

            <div className="modal-form-group" style={{ marginTop: '4px' }}>
              <label htmlFor="forgot-email">Email Terdaftar</label>
              <input
                type="email"
                id="forgot-email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nama@email.com"
                required
                autoComplete="email"
              />
            </div>
          </div>

          <div className="app-modal-footer">
            <button
              type="button"
              className="btn-modal-cancel"
              onClick={closeForgotPasswordModal}
              disabled={submitting}
            >
              Tutup
            </button>
            <button
              type="submit"
              className="btn-modal-submit"
              disabled={submitting}
            >
              {submitting ? 'Mengirim...' : 'Kirim Tautan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
