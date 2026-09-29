import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../services/supabase';
import { validateImageFile, compressImage, sanitizeText } from '../../utils/security';

export const EditProfileModal: React.FC = () => {
  const { profile, isEditProfileModalOpen, closeEditProfileModal, refreshProfile } = useAuth();

  const [namaLengkap, setNamaLengkap] = useState('');
  const [namaPanggilan, setNamaPanggilan] = useState('');
  const [jenisKelamin, setJenisKelamin] = useState('');
  const [tanggalLahir, setTanggalLahir] = useState('');
  const [kelas, setKelas] = useState('');
  const [tahunBergabung, setTahunBergabung] = useState('');
  const [nisn, setNisn] = useState('');
  const [golonganDarah, setGolonganDarah] = useState('');
  const [rhesusDarah, setRhesusDarah] = useState('');
  const [riwayatPenyakit, setRiwayatPenyakit] = useState('');
  const [noWaPribadi, setNoWaPribadi] = useState('');
  const [noWaOrtu, setNoWaOrtu] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [fotoFile, setFotoFile] = useState<File | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (profile && isEditProfileModalOpen) {
      setNamaLengkap(profile.nama_lengkap || '');
      setNamaPanggilan(profile.nama_panggilan || '');
      setJenisKelamin(profile.jenis_kelamin || '');
      setTanggalLahir(profile.tanggal_lahir || '');
      setKelas(profile.kelas || '');
      setTahunBergabung(profile.tahun_bergabung || '');
      setNisn(profile.nisn || '');
      setGolonganDarah(profile.golongan_darah || '');
      setRhesusDarah(profile.rhesus_darah || '');
      setRiwayatPenyakit(profile.riwayat_penyakit || '');
      setNoWaPribadi(profile.no_wa_pribadi || '');
      setNoWaOrtu(profile.no_wa_ortu || '');
      setNewPassword('');
      setFotoFile(null);
      setErrorMsg(null);
      setSuccessMsg(null);
    }
  }, [profile, isEditProfileModalOpen]);

  if (!isEditProfileModalOpen || !profile) return null;

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
    setSuccessMsg(null);
    setSubmitting(true);

    try {
      let fotoUrl = profile.foto_profil_url;

      if (fotoFile) {
        const compressed = await compressImage(fotoFile, 400, 0.75);
        const fileName = `foto_${profile.id}_${crypto.randomUUID()}.jpg`;

        const { error: uploadErr } = await supabase.storage
          .from('profil-anggota')
          .upload(fileName, compressed.blob, { contentType: 'image/jpeg' });

        if (uploadErr) throw new Error(uploadErr.message);

        const { data: publicUrlData } = supabase.storage
          .from('profil-anggota')
          .getPublicUrl(fileName);
        fotoUrl = publicUrlData.publicUrl;
      }

      if (newPassword.trim()) {
        if (newPassword.trim().length < 6) {
          throw new Error('Kata sandi baru minimal harus 6 karakter.');
        }
        const { error: passErr } = await supabase.auth.updateUser({ password: newPassword.trim() });
        if (passErr) throw passErr;
      }

      const { error: updateErr } = await supabase
        .from('users_profile')
        .update({
          nama_lengkap: sanitizeText(namaLengkap).toUpperCase(),
          nama_panggilan: sanitizeText(namaPanggilan),
          jenis_kelamin: jenisKelamin,
          tanggal_lahir: tanggalLahir,
          kelas: sanitizeText(kelas),
          tahun_bergabung: sanitizeText(tahunBergabung),
          nisn: sanitizeText(nisn) || null,
          golongan_darah: golonganDarah || null,
          rhesus_darah: rhesusDarah || null,
          riwayat_penyakit: sanitizeText(riwayatPenyakit) || null,
          no_wa_pribadi: sanitizeText(noWaPribadi) || null,
          no_wa_ortu: sanitizeText(noWaOrtu) || null,
          foto_profil_url: fotoUrl
        })
        .eq('id', profile.id);

      if (updateErr) throw updateErr;

      setSuccessMsg('Profil dan perubahan akun Anda berhasil disimpan!');
      await refreshProfile();
      setTimeout(() => {
        closeEditProfileModal();
        setSuccessMsg(null);
      }, 700);
    } catch (err: any) {
      setErrorMsg('Gagal memperbarui profil: ' + (err.message || 'Terjadi kesalahan sistem.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="app-modal-backdrop active">
      <div className="app-modal-card">
        <div className="app-modal-header">
          <h3>Edit Profil Akun</h3>
          <button
            type="button"
            className="app-modal-close"
            onClick={closeEditProfileModal}
            aria-label="Tutup Modal"
          >
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form-wrapper">
          <div className="app-modal-body">
            {successMsg && (
              <div style={{ background: '#dcfce7', color: '#15803d', padding: '10px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 600 }}>
                ✓ {successMsg}
              </div>
            )}
            {errorMsg && (
              <div style={{ background: '#fee2e2', color: '#b91c1c', padding: '10px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 600 }}>
                {errorMsg}
              </div>
            )}

            <div className="modal-grid-row">
              <div className="modal-form-group">
                <label>Nama Lengkap *</label>
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
                  <option value="">Pilih</option>
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
                  required
                />
              </div>
              <div className="modal-form-group">
                <label>Tahun Bergabung *</label>
                <input
                  type="number"
                  value={tahunBergabung}
                  onChange={(e) => setTahunBergabung(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="modal-grid-row">
              <div className="modal-form-group">
                <label>NISN</label>
                <input
                  type="text"
                  value={nisn}
                  onChange={(e) => setNisn(e.target.value)}
                />
              </div>
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

            <div className="modal-form-group">
              <label>Riwayat Penyakit / Alergi</label>
              <textarea
                value={riwayatPenyakit}
                onChange={(e) => setRiwayatPenyakit(e.target.value)}
                rows={2}
              />
            </div>

            <div className="modal-form-group">
              <label>Ganti Foto Profil (Opsional - JPG, PNG, WebP)</label>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileChange}
                style={{ padding: '8px', border: '1px dashed #cbd5e1' }}
              />
            </div>

            <div className="modal-grid-row">
              <div className="modal-form-group">
                <label>No. WA Pribadi</label>
                <input
                  type="text"
                  value={noWaPribadi}
                  onChange={(e) => setNoWaPribadi(e.target.value)}
                />
              </div>
              <div className="modal-form-group">
                <label>No. WA Orang Tua</label>
                <input
                  type="text"
                  value={noWaOrtu}
                  onChange={(e) => setNoWaOrtu(e.target.value)}
                />
              </div>
            </div>

            <div style={{ background: '#fef3c7', border: '1px solid #fde68a', padding: '12px', borderRadius: '10px', marginTop: '6px' }}>
              <div className="modal-form-group">
                <label style={{ color: '#b45309' }}>Ubah Kata Sandi Baru (Opsional)</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Kosongkan jika tidak ingin mengganti"
                  minLength={6}
                  style={{ borderColor: '#fcd34d' }}
                  autoComplete="new-password"
                />
              </div>
            </div>
          </div>

          <div className="app-modal-footer">
            <button
              type="button"
              className="btn-modal-cancel"
              onClick={closeEditProfileModal}
              disabled={submitting}
            >
              Batal
            </button>
            <button
              type="submit"
              className="btn-modal-submit"
              disabled={submitting}
            >
              {submitting ? 'Menyimpan...' : 'Simpan Perubahan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
