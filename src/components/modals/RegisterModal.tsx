import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../services/supabase';
import { validateImageFile, compressImage, sanitizeText } from '../../utils/security';

export const RegisterModal: React.FC = () => {
  const { isRegisterModalOpen, closeRegisterModal, openLoginModal } = useAuth();

  const [namaLengkap, setNamaLengkap] = useState('');
  const [namaPanggilan, setNamaPanggilan] = useState('');
  const [jenisKelamin, setJenisKelamin] = useState('');
  const [tanggalLahir, setTanggalLahir] = useState('');
  const [kelas, setKelas] = useState('');
  const [tahunBergabung, setTahunBergabung] = useState(new Date().getFullYear().toString());
  const [nisn, setNisn] = useState('');
  const [keteranganJabatan, setKeteranganJabatan] = useState('Anggota');
  const [golonganDarah, setGolonganDarah] = useState('');
  const [rhesusDarah, setRhesusDarah] = useState('');
  const [riwayatPenyakit, setRiwayatPenyakit] = useState('');
  const [noWaPribadi, setNoWaPribadi] = useState('');
  const [noWaOrtu, setNoWaOrtu] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fotoFile, setFotoFile] = useState<File | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isRegisterModalOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const validation = validateImageFile(file);
      if (!validation.valid) {
        setErrorMsg(validation.error || 'Berkas gambar tidak valid.');
        e.target.value = '';
        setFotoFile(null);
        return;
      }
      setErrorMsg(null);
      setFotoFile(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (password.length < 6) {
      setErrorMsg('Kata sandi minimal harus 6 karakter.');
      return;
    }

    setSubmitting(true);
    try {
      const trimmedEmail = email.trim();
      const { data: authData, error: authErr } = await supabase.auth.signUp({
        email: trimmedEmail,
        password
      });

      if (authErr) throw authErr;
      if (!authData.user) throw new Error('Gagal membuat akun autentikasi.');

      const userId = authData.user.id;
      let fotoUrl: string | null = null;

      if (fotoFile) {
        const compressed = await compressImage(fotoFile, 400, 0.75);
        const fileName = `foto_${userId}_${crypto.randomUUID()}.jpg`;

        const { error: uploadErr } = await supabase.storage
          .from('profil-anggota')
          .upload(fileName, compressed.blob, { contentType: 'image/jpeg' });

        if (!uploadErr) {
          const { data: publicUrlData } = supabase.storage
            .from('profil-anggota')
            .getPublicUrl(fileName);
          fotoUrl = publicUrlData.publicUrl;
        }
      }

      const { error: profErr } = await supabase.from('users_profile').insert({
        id: userId,
        email: trimmedEmail,
        nama_lengkap: sanitizeText(namaLengkap).toUpperCase(),
        nama_panggilan: sanitizeText(namaPanggilan),
        jenis_kelamin: jenisKelamin,
        tanggal_lahir: tanggalLahir,
        kelas: sanitizeText(kelas),
        tahun_bergabung: sanitizeText(tahunBergabung),
        nisn: sanitizeText(nisn) || null,
        jabatan: 'non-aktif', // Akun baru berstatus non-aktif sampai diverifikasi admin/pembina
        keterangan_jabatan: keteranganJabatan,
        golongan_darah: golonganDarah || null,
        rhesus_darah: rhesusDarah || null,
        riwayat_penyakit: sanitizeText(riwayatPenyakit) || null,
        no_wa_pribadi: sanitizeText(noWaPribadi) || null,
        no_wa_ortu: sanitizeText(noWaOrtu) || null,
        foto_profil_url: fotoUrl
      });

      if (profErr) throw profErr;

      alert('Pendaftaran berhasil! Akun Anda berstatus non-aktif dan menunggu aktivasi wewenang oleh Pembina.');
      closeRegisterModal();
      openLoginModal();
    } catch (err: any) {
      setErrorMsg('Pendaftaran gagal: ' + (err.message || 'Terjadi kesalahan sistem.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="app-modal-backdrop active">
      <div className="app-modal-card">
        <div className="app-modal-header">
          <h3>Formulir Pendaftaran</h3>
          <button
            type="button"
            className="app-modal-close"
            onClick={closeRegisterModal}
            aria-label="Tutup Modal"
          >
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form-wrapper">
          <div className="app-modal-body">
            {errorMsg && (
              <div style={{ background: '#fee2e2', color: '#b91c1c', padding: '10px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 600 }}>
                {errorMsg}
              </div>
            )}

            <div className="modal-grid-row">
              <div className="modal-form-group">
                <label>Nama Lengkap (Otomatis Kapital) *</label>
                <input
                  type="text"
                  value={namaLengkap}
                  onChange={(e) => setNamaLengkap(e.target.value)}
                  style={{ textTransform: 'uppercase' }}
                  required
                />
              </div>
              <div className="modal-form-group">
                <label>Nama Panggilan *</label>
                <input
                  type="text"
                  value={namaPanggilan}
                  onChange={(e) => setNamaPanggilan(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="modal-grid-row">
              <div className="modal-form-group">
                <label>Jenis Kelamin *</label>
                <select
                  value={jenisKelamin}
                  onChange={(e) => setJenisKelamin(e.target.value)}
                  required
                >
                  <option value="">Pilih Kelamin</option>
                  <option value="Laki-laki">Laki-laki</option>
                  <option value="Perempuan">Perempuan</option>
                </select>
              </div>
              <div className="modal-form-group">
                <label>Tanggal Lahir *</label>
                <input
                  type="date"
                  value={tanggalLahir}
                  onChange={(e) => setTanggalLahir(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="modal-grid-row">
              <div className="modal-form-group">
                <label>Kelas *</label>
                <input
                  type="text"
                  value={kelas}
                  onChange={(e) => setKelas(e.target.value)}
                  placeholder="Contoh: 7A, 8B"
                  required
                />
              </div>
              <div className="modal-form-group">
                <label>Tahun Bergabung *</label>
                <input
                  type="number"
                  value={tahunBergabung}
                  onChange={(e) => setTahunBergabung(e.target.value)}
                  placeholder="Contoh: 2026"
                  required
                />
              </div>
            </div>

            <div className="modal-grid-row">
              <div className="modal-form-group">
                <label>NISN (Opsional)</label>
                <input
                  type="text"
                  value={nisn}
                  onChange={(e) => setNisn(e.target.value)}
                  placeholder="NISN"
                />
              </div>
              <div className="modal-form-group">
                <label>Kategori Pendaftaran *</label>
                <select
                  value={keteranganJabatan}
                  onChange={(e) => setKeteranganJabatan(e.target.value)}
                  required
                >
                  <option value="Anggota">Anggota</option>
                  <option value="Alumni">Alumni</option>
                </select>
              </div>
            </div>

            <div className="modal-grid-row">
              <div className="modal-form-group">
                <label>Golongan Darah</label>
                <select
                  value={golonganDarah}
                  onChange={(e) => setGolonganDarah(e.target.value)}
                >
                  <option value="">Lewati</option>
                  <option value="A">A</option>
                  <option value="B">B</option>
                  <option value="AB">AB</option>
                  <option value="O">O</option>
                </select>
              </div>
              <div className="modal-form-group">
                <label>Rhesus Darah</label>
                <select
                  value={rhesusDarah}
                  onChange={(e) => setRhesusDarah(e.target.value)}
                >
                  <option value="">Lewati</option>
                  <option value="Positif">Positif (+)</option>
                  <option value="Negatif">Negatif (-)</option>
                </select>
              </div>
            </div>

            <div className="modal-form-group">
              <label>Unggah Foto Profil (Opsional - JPG, PNG, WebP maks 5MB)</label>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileChange}
                style={{ padding: '8px', border: '1px dashed #cbd5e1' }}
              />
            </div>

            <div className="modal-form-group">
              <label>Riwayat Penyakit / Alergi (Opsional)</label>
              <textarea
                value={riwayatPenyakit}
                onChange={(e) => setRiwayatPenyakit(e.target.value)}
                rows={2}
                placeholder="Contoh: Asma, alergi dingin..."
              />
            </div>

            <div className="modal-grid-row">
              <div className="modal-form-group">
                <label>No. WA Pribadi (Opsional)</label>
                <input
                  type="text"
                  value={noWaPribadi}
                  onChange={(e) => setNoWaPribadi(e.target.value)}
                  placeholder="08..."
                />
              </div>
              <div className="modal-form-group">
                <label>No. WA Ortu (Opsional)</label>
                <input
                  type="text"
                  value={noWaOrtu}
                  onChange={(e) => setNoWaOrtu(e.target.value)}
                  placeholder="08..."
                />
              </div>
            </div>

            <div
              className="modal-grid-row"
              style={{
                background: 'var(--canvas)',
                padding: '12px',
                borderRadius: '10px',
                marginTop: '6px',
                border: '1px solid #e2e8f0'
              }}
            >
              <div className="modal-form-group">
                <label>Email Login *</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nama@email.com"
                  required
                  autoComplete="email"
                />
              </div>
              <div className="modal-form-group">
                <label>Kata Sandi *</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimal 6 karakter"
                  minLength={6}
                  required
                  autoComplete="new-password"
                />
              </div>
            </div>
          </div>

          <div className="app-modal-footer">
            <button
              type="button"
              className="btn-modal-cancel"
              onClick={closeRegisterModal}
              disabled={submitting}
            >
              Batal
            </button>
            <button
              type="submit"
              className="btn-modal-submit"
              disabled={submitting}
            >
              {submitting ? 'Mendaftarkan Anggota...' : 'Kirim Pendaftaran'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
