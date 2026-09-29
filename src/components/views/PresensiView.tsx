import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../services/supabase';
import { PresensiRecord, PresensiSessionSummary, UserProfile } from '../../types';
import {
  ClipboardCheck,
  Calendar,
  MapPin,
  Camera,
  CheckCircle2,
  XCircle,
  Eye,
  Edit2,
  Trash2,
  RotateCcw,
  ShieldAlert,
  Loader2,
  Plus,
  Search,
  CheckCheck,
  Filter,
  Users,
  X,
  FileText,
  Sparkles,
  Upload,
  AlertTriangle
} from 'lucide-react';
import {
  canManagePresensi,
  isAdmin,
  validateImageFile,
  compressImage,
  formatTanggalIndo,
  sanitizeText
} from '../../utils/security';
import { PhotoViewerModal } from '../modals/PhotoViewerModal';

/**
 * ============================================================================
 * MODUL PRESENSI & DOKUMENTASI KEGIATAN PMR (PRESENSIVIEW.TSX)
 * ============================================================================
 * Modul ini menangani seluruh alur presensi kegiatan organisasi:
 * 1. Formulir Pencatatan Sesi:
 *    - Metadata kegiatan: Nama, Kategori (Latihan Rutin, Donor Darah, Lomba, dll.), Tanggal, Tempat, Deskripsi.
 *    - Multi-foto dokumentasi dengan kompresi HTML5 Canvas di sisi klien sebelum diunggah ke storage.
 *    - Lembar Checklist Kehadiran: Tombol cepat 'Set Semua Hadir' dan penanda individual (Hadir, Sakit, Izin, Alpa).
 * 2. Riwayat Presensi & Filter:
 *    - Pencarian nama/tempat/deskripsi, filter rentang tanggal, filter jenis kegiatan.
 *    - Kartu riwayat interaktif dengan statistik persentase kehadiran dan thumbnail foto dokumentasi.
 * 3. Modal Detail Presensi:
 *    - Pratinjau daftar lengkap peserta dan statusnya, pencarian peserta, serta filter status.
 * 4. Pengelolaan Sesi (Edit & Hapus):
 *    - Mode edit sesi presensi yang mengisi ulang seluruh data ke formulir atas.
 *    - Hapus sesi presensi dengan modal konfirmasi aman serta pembersihan berkas foto otomatis dari storage Supabase.
 */

interface PhotoItem {
  type: 'existing' | 'new';
  url?: string;
  dataUrl?: string;
  blob?: Blob;
}

export const PresensiView: React.FC = () => {
  const { profile } = useAuth();

  // Data master anggota aktif untuk lembar checklist presensi
  const [activeMembers, setActiveMembers] = useState<UserProfile[]>([]);
  
  // Data riwayat sesi presensi yang dikelompokkan per sesi kegiatan
  const [sessions, setSessions] = useState<PresensiSessionSummary[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [historyLimit, setHistoryLimit] = useState(12);

  // State Filter Riwayat Presensi
  const [historySearch, setHistorySearch] = useState('');
  const [filterTglMulai, setFilterTglMulai] = useState('');
  const [filterTglAkhir, setFilterTglAkhir] = useState('');
  const [filterJenis, setFilterJenis] = useState('');

  // Filter pencarian nama anggota pada lembar checklist formulir
  const [rosterSearch, setRosterSearch] = useState('');

  // State Formulir Input Presensi
  const [editSessionId, setEditSessionId] = useState<string | null>(null);
  const [namaKegiatan, setNamaKegiatan] = useState('');
  const [jenisKegiatan, setJenisKegiatan] = useState('Latihan Rutin');
  const [tanggalKegiatan, setTanggalKegiatan] = useState(new Date().toISOString().split('T')[0]);
  const [tempatKegiatan, setTempatKegiatan] = useState('SMPN 8 Balikpapan');
  const [deskripsiKegiatan, setDeskripsiKegiatan] = useState('');
  const [currentPhotos, setCurrentPhotos] = useState<PhotoItem[]>([]);
  const [photosPendingDelete, setPhotosPendingDelete] = useState<string[]>([]);
  const [statusMap, setStatusMap] = useState<Record<string, 'Hadir' | 'Izin' | 'Sakit' | 'Alpa' | 'Tidak Ditugaskan'>>({});

  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // State Modal Detail Presensi
  const [detailSession, setDetailSession] = useState<PresensiSessionSummary | null>(null);
  const [modalFilterStatus, setModalFilterStatus] = useState<string>('Semua');
  const [modalSearch, setModalSearch] = useState('');

  // State Modal Konfirmasi Hapus Sesi Presensi
  const [sessionToDelete, setSessionToDelete] = useState<PresensiSessionSummary | null>(null);
  const [isDeletingSession, setIsDeletingSession] = useState(false);

  // State Notifikasi Toast Pengganti Alert Bawaan Browser
  const [feedbackToast, setFeedbackToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  /**
   * Menampilkan pesan toast inline yang otomatis menghilang setelah 4.5 detik.
   */
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setFeedbackToast({ message, type });
    setTimeout(() => {
      setFeedbackToast(null);
    }, 4500);
  };

  // State zoom foto dokumentasi resolusi penuh
  const [enlargedPhotoUrl, setEnlargedPhotoUrl] = useState<string | null>(null);

  // Hak akses: Pengurus, Pembina, dan Admin berhak mengelola & menghapus presensi
  const canManage = canManagePresensi(profile);
  const userIsAdmin = isAdmin(profile);
  const canDelete = userIsAdmin || canManage;

  // 1. Load active members for attendance roster
  useEffect(() => {
    if (!profile) return;

    supabase
      .from('users_profile')
      .select('id, nama_lengkap, nama_panggilan, kelas, keterangan_jabatan, jabatan')
      .then(({ data, error }) => {
        if (error) return;
        const valid = (data as UserProfile[] || []).filter(u => {
          const role = (u.jabatan || '').toLowerCase();
          const ket = (u.keterangan_jabatan || '').toLowerCase();
          const isValidRole = role === 'pengurus' || role === 'anggota';
          const isNotExcluded = ket !== 'alumni' && ket !== 'non-aktif';
          return isValidRole && isNotExcluded;
        });

        valid.sort((a, b) => (a.nama_lengkap || '').localeCompare(b.nama_lengkap || '', 'id'));
        setActiveMembers(valid);

        // Initialize default presence state to "Hadir"
        const initialStatus: Record<string, 'Hadir' | 'Izin' | 'Sakit' | 'Alpa' | 'Tidak Ditugaskan'> = {};
        valid.forEach(u => {
          initialStatus[u.id] = 'Hadir';
        });
        setStatusMap(initialStatus);
      });
  }, [profile]);

  // 2. Load attendance session history
  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const { data, error } = await supabase
        .from('presensi')
        .select(`*, users_profile:user_id ( id, nama_lengkap, nama_panggilan, kelas )`)
        .order('tanggal_kegiatan', { ascending: false });

      if (error) throw error;

      const sessionMap: Record<string, PresensiSessionSummary> = {};
      (data || []).forEach(row => {
        if (!sessionMap[row.sesi_id]) {
          sessionMap[row.sesi_id] = {
            sesi_id: row.sesi_id,
            nama_kegiatan: row.nama_kegiatan,
            jenis_kegiatan: row.jenis_kegiatan,
            tempat_kegiatan: row.tempat_kegiatan,
            tanggal_kegiatan: row.tanggal_kegiatan,
            deskripsi_kegiatan: row.deskripsi_kegiatan,
            foto_dokumentasi_url: row.foto_dokumentasi_url,
            hadir: 0,
            izin: 0,
            sakit: 0,
            alpa: 0,
            td: 0,
            records: []
          };
        }

        const st = row.status_kehadiran;
        if (st === 'Hadir') sessionMap[row.sesi_id].hadir++;
        else if (st === 'Izin') sessionMap[row.sesi_id].izin++;
        else if (st === 'Sakit') sessionMap[row.sesi_id].sakit++;
        else if (st === 'Alpa') sessionMap[row.sesi_id].alpa++;
        else if (st === 'Tidak Ditugaskan') sessionMap[row.sesi_id].td++;

        sessionMap[row.sesi_id].records.push(row as PresensiRecord);
      });

      const list = Object.values(sessionMap).sort(
        (a, b) => new Date(b.tanggal_kegiatan).getTime() - new Date(a.tanggal_kegiatan).getTime()
      );
      setSessions(list);
    } catch (err: any) {
      console.error('Error fetching presensi history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  // Handle Photo Selection (up to 4 max)
  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const availableSlots = 4 - currentPhotos.length;
    if (availableSlots <= 0) {
      alert('Batas maksimal adalah 4 foto dokumentasi.');
      e.target.value = '';
      return;
    }

    const selectedFiles = files.slice(0, availableSlots);
    const newItems: PhotoItem[] = [];

    for (const file of selectedFiles) {
      const val = validateImageFile(file);
      if (!val.valid) {
        alert(val.error);
        continue;
      }
      try {
        const compressed = await compressImage(file, 1280, 0.75);
        newItems.push({
          type: 'new',
          blob: compressed.blob,
          dataUrl: compressed.dataUrl
        });
      } catch (err: any) {
        alert('Gagal mengompresi gambar: ' + err.message);
      }
    }

    setCurrentPhotos(prev => [...prev, ...newItems]);
    e.target.value = '';
  };

  /**
   * Menghapus salah satu foto dokumentasi dari pratinjau formulir.
   * Jika foto tersebut sudah tersimpan sebelumnya di Supabase Storage,
   * URL-nya dimasukkan ke daftar `photosPendingDelete` untuk dihapus permanen saat formulir disimpan.
   */
  const handleRemovePhoto = (index: number) => {
    const target = currentPhotos[index];
    if (target.type === 'existing' && target.url) {
      setPhotosPendingDelete(prev => [...prev, target.url!]);
    }
    setCurrentPhotos(prev => prev.filter((_, i) => i !== index));
  };

  /**
   * Menghapus seluruh foto dokumentasi sekaligus dari pratinjau.
   */
  const handleClearAllPhotos = () => {
    currentPhotos.forEach(target => {
      if (target.type === 'existing' && target.url) {
        setPhotosPendingDelete(prev => [...prev, target.url!]);
      }
    });
    setCurrentPhotos([]);
  };

  /**
   * Mengosongkan formulir presensi kembali ke kondisi awal (default: semua anggota Hadir).
   */
  const resetForm = () => {
    setEditSessionId(null);
    setNamaKegiatan('');
    setJenisKegiatan('Latihan Rutin');
    setTanggalKegiatan(new Date().toISOString().split('T')[0]);
    setTempatKegiatan('SMPN 8 Balikpapan');
    setDeskripsiKegiatan('');
    setCurrentPhotos([]);
    setPhotosPendingDelete([]);
    setFormError(null);

    // Setel ulang status seluruh anggota menjadi "Hadir"
    const freshStatus: Record<string, 'Hadir' | 'Izin' | 'Sakit' | 'Alpa' | 'Tidak Ditugaskan'> = {};
    activeMembers.forEach(u => {
      freshStatus[u.id] = 'Hadir';
    });
    setStatusMap(freshStatus);
  };

  /**
   * Menyimpan Sesi Presensi ke Database Supabase:
   * Alur Eksekusi:
   * 1. Menghapus berkas foto lama dari bucket `dokumentasi_kegiatan` jika dihapus saat pengeditan.
   * 2. Mengunggah berkas foto kompresi baru ke Supabase Storage.
   * 3. Jika mode edit (`editSessionId` ada): Menghapus baris presensi lama untuk `sesi_id` tersebut.
   * 4. Memasukkan batch baris baru untuk setiap anggota aktif ke tabel `presensi`.
   * 5. Menampilkan toast notifikasi berhasil dan memuat ulang riwayat.
   */
  const handleSubmitPresensi = async (e: React.FormEvent) => {
    e.preventDefault();
    if (activeMembers.length === 0) {
      alert('Daftar anggota kehadiran belum tersedia.');
      return;
    }

    setFormError(null);
    setFormSubmitting(true);

    try {
      // 1. Bersihkan berkas foto lama yang ditandai untuk dihapus
      if (photosPendingDelete.length > 0) {
        const fileNames = photosPendingDelete.map(url => {
          const marker = '/dokumentasi_kegiatan/';
          const idx = url.indexOf(marker);
          if (idx !== -1) {
            return decodeURIComponent(url.substring(idx + marker.length).split('?')[0]);
          }
          const parts = url.split('/');
          return decodeURIComponent(parts[parts.length - 1].split('?')[0]);
        }).filter(Boolean);

        if (fileNames.length > 0) {
          await supabase.storage.from('dokumentasi_kegiatan').remove(fileNames);
        }
      }

      // 2. Unggah foto dokumentasi baru yang telah dikompresi
      const uploadedUrls: string[] = [];
      for (const item of currentPhotos) {
        if (item.type === 'existing' && item.url) {
          uploadedUrls.push(item.url);
        } else if (item.type === 'new' && item.blob) {
          const fileName = `kegiatan_${crypto.randomUUID()}.jpg`;
          const { error: upErr } = await supabase.storage
            .from('dokumentasi_kegiatan')
            .upload(fileName, item.blob, { contentType: 'image/jpeg' });

          if (upErr) throw upErr;

          const { data: pubData } = supabase.storage
            .from('dokumentasi_kegiatan')
            .getPublicUrl(fileName);
          uploadedUrls.push(pubData.publicUrl);
        }
      }

      const fotoPayloadString = uploadedUrls.length > 0 ? JSON.stringify(uploadedUrls) : null;
      const targetSessionId = editSessionId || crypto.randomUUID();

      // 3. Jika mode edit: hapus record kehadiran lama sesi ini sebelum insert batch baru
      if (editSessionId) {
        const { error: delErr } = await supabase
          .from('presensi')
          .delete()
          .eq('sesi_id', targetSessionId);

        if (delErr) throw delErr;
      }

      // 4. Susun dan masukkan kumpulan data presensi per anggota (Batch Insert)
      const insertPayload = activeMembers.map(user => ({
        sesi_id: targetSessionId,
        user_id: user.id,
        nama_kegiatan: sanitizeText(namaKegiatan),
        jenis_kegiatan: jenisKegiatan,
        tempat_kegiatan: sanitizeText(tempatKegiatan),
        deskripsi_kegiatan: sanitizeText(deskripsiKegiatan) || null,
        foto_dokumentasi_url: fotoPayloadString,
        status_kehadiran: statusMap[user.id] || 'Hadir',
        tanggal_kegiatan: tanggalKegiatan
      }));

      const { error: insErr } = await supabase.from('presensi').insert(insertPayload);
      if (insErr) throw insErr;

      showToast(editSessionId ? 'Presensi kegiatan berhasil diperbarui!' : 'Presensi kegiatan berhasil disimpan!', 'success');
      resetForm();
      await fetchHistory();
    } catch (err: any) {
      setFormError(err.message || 'Terjadi kesalahan saat menyimpan presensi.');
    } finally {
      setFormSubmitting(false);
    }
  };

  /**
   * Membuka sesi presensi yang sudah tersimpan untuk diedit:
   * Mengisi kembali form atas dengan judul, kategori, tanggal, tempat, deskripsi,
   * foto dokumentasi yang tersimpan, dan status checklist per anggota.
   */
  const handleEditSession = (sessionId: string) => {
    const sesi = sessions.find(s => s.sesi_id === sessionId);
    if (!sesi || sesi.records.length === 0) return;

    setEditSessionId(sesi.sesi_id);
    setNamaKegiatan(sesi.nama_kegiatan || '');
    setJenisKegiatan(sesi.jenis_kegiatan || 'Latihan Rutin');
    setTanggalKegiatan(sesi.tanggal_kegiatan || '');
    setTempatKegiatan(sesi.tempat_kegiatan || '');
    setDeskripsiKegiatan(sesi.deskripsi_kegiatan || '');

    // Ekstrak URL foto dokumentasi dari string JSON
    const photos: PhotoItem[] = [];
    if (sesi.foto_dokumentasi_url) {
      try {
        const parsed = JSON.parse(sesi.foto_dokumentasi_url);
        const urls = Array.isArray(parsed) ? parsed : [sesi.foto_dokumentasi_url];
        urls.forEach(u => photos.push({ type: 'existing', url: u, dataUrl: u }));
      } catch {
        photos.push({ type: 'existing', url: sesi.foto_dokumentasi_url, dataUrl: sesi.foto_dokumentasi_url });
      }
    }
    setCurrentPhotos(photos);
    setPhotosPendingDelete([]);

    // Petakan status presensi masing-masing anggota pada sesi ini
    const newStatusMap: Record<string, 'Hadir' | 'Izin' | 'Sakit' | 'Alpa' | 'Tidak Ditugaskan'> = {};
    activeMembers.forEach(u => {
      newStatusMap[u.id] = 'Hadir';
    });
    sesi.records.forEach(r => {
      newStatusMap[r.user_id] = r.status_kehadiran;
    });
    setStatusMap(newStatusMap);

    // Gulirkan layar ke formulir atas secara halus
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  /**
   * Menghapus Sesi Presensi beserta berkas foto pendukungnya:
   * 1. Mengekstrak nama berkas foto dari URL Supabase Storage.
   * 2. Menghapus berkas fisik foto dari bucket `dokumentasi_kegiatan`.
   * 3. Menghapus seluruh baris record kehadiran yang memiliki `sesi_id` tersebut.
   * 4. Menampilkan notifikasi berhasil dan memuat ulang riwayat presensi.
   */
  const handleConfirmDeleteSession = async () => {
    if (!sessionToDelete) return;
    if (!canDelete) return;

    setIsDeletingSession(true);
    try {
      const sesi = sessionToDelete;
      if (sesi && sesi.foto_dokumentasi_url) {
        try {
          const parsed = JSON.parse(sesi.foto_dokumentasi_url);
          const urls = Array.isArray(parsed) ? parsed : [sesi.foto_dokumentasi_url];
          const delFiles = urls.map(u => {
            const marker = '/dokumentasi_kegiatan/';
            const idx = u.indexOf(marker);
            if (idx !== -1) return decodeURIComponent(u.substring(idx + marker.length).split('?')[0]);
            const parts = u.split('/');
            return decodeURIComponent(parts[parts.length - 1].split('?')[0]);
          }).filter(Boolean);

          if (delFiles.length > 0) {
            await supabase.storage.from('dokumentasi_kegiatan').remove(delFiles);
          }
        } catch {
          // ignore
        }
      }

      const { error: delErr } = await supabase.from('presensi').delete().eq('sesi_id', sessionToDelete.sesi_id);
      if (delErr) throw delErr;

      showToast('Presensi kegiatan berhasil dihapus.', 'success');
      setSessionToDelete(null);
      if (detailSession?.sesi_id === sessionToDelete.sesi_id) {
        setDetailSession(null);
      }
      await fetchHistory();
    } catch (err: any) {
      showToast('Gagal menghapus presensi: ' + err.message, 'error');
    } finally {
      setIsDeletingSession(false);
    }
  };

  // Filter history list
  const filteredSessions = sessions.filter(sesi => {
    if (historySearch) {
      const q = historySearch.toLowerCase();
      const matchTitle = (sesi.nama_kegiatan || '').toLowerCase().includes(q) ||
        (sesi.tempat_kegiatan || '').toLowerCase().includes(q) ||
        (sesi.deskripsi_kegiatan || '').toLowerCase().includes(q);
      if (!matchTitle) return false;
    }
    if (filterJenis && sesi.jenis_kegiatan !== filterJenis) return false;
    if (filterTglMulai && sesi.tanggal_kegiatan < filterTglMulai) return false;
    if (filterTglAkhir && sesi.tanggal_kegiatan > filterTglAkhir) return false;
    return true;
  });

  const displayedSessions = filteredSessions.slice(0, historyLimit);

  // Roster filtering in form
  const filteredRoster = activeMembers.filter(user => {
    if (rosterSearch) {
      const q = rosterSearch.toLowerCase();
      const matchName = (user.nama_lengkap || '').toLowerCase().includes(q) ||
        (user.nama_panggilan && user.nama_panggilan.toLowerCase().includes(q));
      if (!matchName) return false;
    }
    return true;
  });

  // Bulk action: Mark all displayed as Hadir
  const handleMarkAllHadir = () => {
    const updated = { ...statusMap };
    filteredRoster.forEach(u => {
      updated[u.id] = 'Hadir';
    });
    setStatusMap(updated);
  };

  // Live status counts
  const hadirCount = Object.values(statusMap).filter(s => s === 'Hadir').length;
  const izinCount = Object.values(statusMap).filter(s => s === 'Izin').length;
  const sakitCount = Object.values(statusMap).filter(s => s === 'Sakit').length;
  const alpaCount = Object.values(statusMap).filter(s => s === 'Alpa').length;
  const tdCount = Object.values(statusMap).filter(s => s === 'Tidak Ditugaskan').length;

  return (
    <div className="presensi-container">
      {/* 1. GUEST WARNING */}
      {!profile && (
        <div className="guest-presensi-message" style={{ display: 'block' }}>
          <div className="guest-warning-card">
            <div className="guest-icon-box">
              <ShieldAlert style={{ width: 44, height: 44, color: 'var(--maroon)' }} />
            </div>
            <h3>Akses Terbatas</h3>
            <p>
              Anda berada dalam Mode Tamu. Silakan masuk akun terlebih dahulu untuk melihat rekaman presensi kegiatan PMR SPADAN.
            </p>
          </div>
        </div>
      )}

      {/* 2. FORM PRESENSI (ADMIN & PENGURUS ONLY) */}
      {profile && canManage && (
        <div className="dash-card presensi-form-card" id="card-form-presensi">
          <div className="dash-card-header">
            <div className="header-title">
              <div className="icon-pulse-wrap theme-presence">
                <ClipboardCheck style={{ width: 16, height: 16 }} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <h3 id="presensi-form-title">
                    {editSessionId ? 'Edit Presensi Kegiatan' : 'Formulir Presensi Kegiatan'}
                  </h3>
                  {editSessionId && (
                    <span className="badge-edit-mode">
                      <Edit2 style={{ width: 10, height: 10 }} /> MODE EDIT
                    </span>
                  )}
                </div>
                {editSessionId && (
                  <p className="header-sub">
                    Perbarui rincian kegiatan, foto dokumentasi, atau status kehadiran anggota.
                  </p>
                )}
              </div>
            </div>

            {editSessionId && (
              <button
                type="button"
                className="btn-cancel-edit"
                onClick={resetForm}
              >
                <RotateCcw style={{ width: 12, height: 12 }} /> Batal Edit
              </button>
            )}
          </div>

          <form onSubmit={handleSubmitPresensi} className="presensi-form-body">
            {formError && (
              <div style={{ background: '#fee2e2', color: '#b91c1c', padding: '10px 12px', borderRadius: '10px', fontSize: '12px', fontWeight: 600 }}>
                {formError}
              </div>
            )}

            {/* BARIS RINCIAN KEGIATAN */}
            <div className="presensi-grid-row">
              <div className="modal-form-group">
                <label>Nama Agenda / Kegiatan *</label>
                <input
                  type="text"
                  value={namaKegiatan}
                  onChange={(e) => setNamaKegiatan(e.target.value)}
                  placeholder="Contoh: Latihan Rutin Pembidaian & Evakuasi"
                  required
                />
              </div>

              <div className="modal-form-group">
                <label>Jenis Kegiatan *</label>
                <select
                  value={jenisKegiatan}
                  onChange={(e) => setJenisKegiatan(e.target.value)}
                  required
                >
                  <option value="Latihan Rutin">Latihan Rutin</option>
                  <option value="Tugas Upacara">Tugas Upacara</option>
                  <option value="Lomba PMR">Lomba PMR</option>
                  <option value="Bakti Sosial">Bakti Sosial</option>
                  <option value="Diklat / Pelatihan">Diklat / Pelatihan</option>
                  <option value="Rapat Organisasi">Rapat Organisasi</option>
                  <option value="Lainnya">Lainnya</option>
                </select>
              </div>
            </div>

            <div className="presensi-grid-row">
              <div className="modal-form-group">
                <label>Tanggal Kegiatan *</label>
                <input
                  type="date"
                  value={tanggalKegiatan}
                  onChange={(e) => setTanggalKegiatan(e.target.value)}
                  required
                />
              </div>

              <div className="modal-form-group">
                <label>Tempat Kegiatan *</label>
                <input
                  type="text"
                  value={tempatKegiatan}
                  onChange={(e) => setTempatKegiatan(e.target.value)}
                  placeholder="Contoh: Lapangan Utama / Ruang UKS"
                  required
                />
              </div>
            </div>

            <div className="modal-form-group">
              <label>Catatan / Ringkasan Materi (Opsional)</label>
              <textarea
                value={deskripsiKegiatan}
                onChange={(e) => setDeskripsiKegiatan(e.target.value)}
                rows={2}
                placeholder="Deskripsi singkat materi latihan atau tugas..."
              />
            </div>

            {/* DOKUMENTASI FOTO (UP TO 4) DENGAN THUMBNAIL & INDIKATOR */}
            <div className="photo-upload-section">
              <div className="photo-upload-header">
                <div className="photo-upload-title-wrap">
                  <div className="photo-icon-badge">
                    <Camera style={{ width: 16, height: 16, color: 'var(--maroon)' }} />
                  </div>
                  <label className="photo-section-label">
                    Dokumentasi Foto Kegiatan (Maks. 4 Foto)
                  </label>
                </div>

                {currentPhotos.length > 0 && (
                  <div className="photo-header-actions">
                    <button
                      type="button"
                      className="btn-clear-all-photos"
                      onClick={handleClearAllPhotos}
                      title="Hapus seluruh foto yang dipilih"
                    >
                      <Trash2 style={{ width: 12, height: 12 }} /> Hapus Semua
                    </button>
                  </div>
                )}
              </div>

              <div className="photo-preview-grid">
                {currentPhotos.map((item, idx) => (
                  <div key={idx} className="preview-slot">
                    <div
                      className="preview-slot-img-wrap"
                      onClick={() => setEnlargedPhotoUrl(item.dataUrl || item.url || null)}
                      title="Klik untuk perbesar foto"
                    >
                      <img
                        src={item.dataUrl || item.url}
                        alt={`Dokumentasi ${idx + 1}`}
                      />
                    </div>

                    {/* BADGE NOMOR THUMBNAIL */}
                    <span className="preview-badge-num">
                      Foto #{idx + 1}
                    </span>

                    {/* AKSI TOMBOL THUMBNAIL: ZOOM & HAPUS */}
                    <div className="preview-actions-bar">
                      <button
                        type="button"
                        className="btn-thumb-action btn-thumb-zoom"
                        onClick={() => setEnlargedPhotoUrl(item.dataUrl || item.url || null)}
                        title="Perbesar foto"
                      >
                        <Eye style={{ width: 12, height: 12 }} />
                      </button>
                      <button
                        type="button"
                        className="btn-thumb-action btn-thumb-delete"
                        onClick={() => handleRemovePhoto(idx)}
                        title="Hapus foto ini"
                      >
                        <Trash2 style={{ width: 12, height: 12 }} />
                      </button>
                    </div>
                  </div>
                ))}

                {currentPhotos.length < 4 && (
                  <label className="photo-upload-slot">
                    <div className="upload-slot-content">
                      <div className="upload-icon-circle">
                        <Upload style={{ width: 18, height: 18 }} />
                      </div>
                      <span className="upload-main-text">
                        {currentPhotos.length === 0 ? 'Pilih Foto' : '+ Tambah Foto'}
                      </span>
                      <span className="upload-sub-text">
                        Sisa {4 - currentPhotos.length} slot lagi
                      </span>
                    </div>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      multiple
                      onChange={handlePhotoSelect}
                      style={{ display: 'none' }}
                    />
                  </label>
                )}
              </div>
            </div>

            {/* DAFTAR ANGGOTA PRESENSI (INTERACTIVE ROSTER) */}
            <div className="presensi-member-roster-box">
              {/* ROSTER HEADER */}
              <div className="roster-header">
                <h4>Daftar Kehadiran Siswa ({activeMembers.length} Terdaftar)</h4>

                <button
                  type="button"
                  className="btn-mark-all-hadir"
                  onClick={handleMarkAllHadir}
                  title="Tandai semua siswa yang tampil sebagai Hadir"
                >
                  <CheckCheck style={{ width: 14, height: 14 }} />
                  <span>Hadirkan Semua</span>
                </button>
              </div>

              {/* ROSTER SEARCH BAR */}
              <div className="roster-toolbar">
                <div className="roster-search-input">
                  <Search style={{ width: 14, height: 14, color: '#94a3b8' }} />
                  <input
                    type="text"
                    placeholder="Cari nama atau panggilan siswa..."
                    value={rosterSearch}
                    onChange={(e) => setRosterSearch(e.target.value)}
                  />
                  {rosterSearch && (
                    <button
                      type="button"
                      className="btn-clear-roster"
                      onClick={() => setRosterSearch('')}
                    >
                      <X style={{ width: 12, height: 12 }} />
                    </button>
                  )}
                </div>
              </div>

              {/* STUDENT LIST */}
              <div className="presensi-member-list">
                {activeMembers.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '24px', color: '#888' }}>
                    Memuat data anggota PMR...
                  </div>
                ) : filteredRoster.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '20px', color: '#94a3b8', fontSize: '12px' }}>
                    Tidak ada siswa yang sesuai filter pencarian.
                  </div>
                ) : (
                  filteredRoster.map((user, index) => {
                    const currentStatus = statusMap[user.id] || 'Hadir';
                    return (
                      <div key={user.id} className="member-item">
                        <div className="member-left" style={{ flex: 1, minWidth: 0, paddingRight: 6 }}>
                          <div className="member-meta" style={{ width: '100%', minWidth: 0 }}>
                            <div
                              className="nama"
                              title={user.nama_lengkap}
                              style={{
                                whiteSpace: 'normal',
                                wordBreak: 'break-word',
                                overflowWrap: 'anywhere',
                                fontSize: '11.5px',
                                fontWeight: 800,
                                color: '#0f172a',
                                lineHeight: 1.25
                              }}
                            >
                              {user.nama_lengkap}
                            </div>
                            <div className="subtext" style={{ fontSize: '9.5px', color: '#64748b', marginTop: 1, whiteSpace: 'normal' }}>
                              Kelas {user.kelas || '-'} · {user.keterangan_jabatan || user.jabatan || 'Anggota'}
                            </div>
                          </div>
                        </div>

                        {/* STATUS SELECTOR BUTTONS */}
                        <div className="status-options-modern">
                          <button
                            type="button"
                            className={`btn-status-pill opt-hadir ${currentStatus === 'Hadir' ? 'active' : ''}`}
                            onClick={() => setStatusMap(prev => ({ ...prev, [user.id]: 'Hadir' }))}
                            title="Hadir"
                          >
                            H
                          </button>
                          <button
                            type="button"
                            className={`btn-status-pill opt-izin ${currentStatus === 'Izin' ? 'active' : ''}`}
                            onClick={() => setStatusMap(prev => ({ ...prev, [user.id]: 'Izin' }))}
                            title="Izin"
                          >
                            I
                          </button>
                          <button
                            type="button"
                            className={`btn-status-pill opt-sakit ${currentStatus === 'Sakit' ? 'active' : ''}`}
                            onClick={() => setStatusMap(prev => ({ ...prev, [user.id]: 'Sakit' }))}
                            title="Sakit"
                          >
                            S
                          </button>
                          <button
                            type="button"
                            className={`btn-status-pill opt-alpa ${currentStatus === 'Alpa' ? 'active' : ''}`}
                            onClick={() => setStatusMap(prev => ({ ...prev, [user.id]: 'Alpa' }))}
                            title="Alpa (Tanpa Keterangan)"
                          >
                            A
                          </button>
                          <button
                            type="button"
                            className={`btn-status-pill opt-td ${currentStatus === 'Tidak Ditugaskan' ? 'active' : ''}`}
                            onClick={() => setStatusMap(prev => ({ ...prev, [user.id]: 'Tidak Ditugaskan' }))}
                            title="Tidak Ditugaskan"
                          >
                            -
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* BARIS BAWAH: INFORMASI STATUS KEHADIRAN & TOMBOL SIMPAN */}
            <div className="presensi-form-footer">
              <div className="form-summary-live-strip">
                <span className="live-pill live-hadir">H= <b>{hadirCount}</b></span>
                <span className="live-pill live-izin">I= <b>{izinCount}</b></span>
                <span className="live-pill live-sakit">S= <b>{sakitCount}</b></span>
                <span className="live-pill live-alpa">A= <b>{alpaCount}</b></span>
                {tdCount > 0 && <span className="live-pill live-td">TD= <b>{tdCount}</b></span>}
              </div>

              <button
                type="submit"
                className="btn-submit-presensi"
                disabled={formSubmitting}
              >
                {formSubmitting ? (
                  <>
                    <Loader2 className="spin-anim" style={{ width: 16, height: 16 }} />{' '}
                    {editSessionId ? 'Memperbarui...' : 'Menyimpan...'}
                  </>
                ) : (
                  <>
                    <CheckCircle2 style={{ width: 16, height: 16 }} />{' '}
                    {editSessionId ? 'Perbarui Rekaman Presensi' : 'Simpan Presensi Kegiatan'}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 3. RIWAYAT PRESENSI KEGIATAN */}
      {profile && (
        <div className="section-history-presensi">
          {/* TOAST BANNER */}
          {feedbackToast && (
            <div className={`presensi-toast-banner ${feedbackToast.type}`}>
              <span>{feedbackToast.message}</span>
              <button
                type="button"
                onClick={() => setFeedbackToast(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontWeight: 800 }}
              >
                ✕
              </button>
            </div>
          )}

          <div className="dash-card-header" style={{ padding: '0 4px', marginBottom: 12 }}>
            <div className="header-title">
              <div className="icon-pulse-wrap theme-presence">
                <Calendar style={{ width: 16, height: 16 }} />
              </div>
              <div>
                <h3>Riwayat Presensi Kegiatan</h3>
              </div>
            </div>
          </div>

          {/* FILTER BAR RIWAYAT */}
          <div className="history-filter-card">
            <div className="history-filter-grid">
              <div className="modal-form-group filter-col-search">
                <label>Cari Agenda / Tempat</label>
                <div className="history-search-wrap">
                  <Search style={{ width: 14, height: 14, color: '#94a3b8' }} />
                  <input
                    type="text"
                    placeholder="Nama kegiatan atau tempat..."
                    value={historySearch}
                    onChange={(e) => setHistorySearch(e.target.value)}
                  />
                  {historySearch && (
                    <button
                      type="button"
                      className="btn-clear-search-mini"
                      onClick={() => setHistorySearch('')}
                    >
                      <X style={{ width: 12, height: 12 }} />
                    </button>
                  )}
                </div>
              </div>

              <div className="modal-form-group filter-col-start">
                <label>Dari Tanggal</label>
                <input
                  type="date"
                  value={filterTglMulai}
                  onChange={(e) => setFilterTglMulai(e.target.value)}
                />
              </div>

              <div className="modal-form-group filter-col-end">
                <label>Sampai Tanggal</label>
                <input
                  type="date"
                  value={filterTglAkhir}
                  onChange={(e) => setFilterTglAkhir(e.target.value)}
                />
              </div>

              <div className="modal-form-group filter-col-cat">
                <label>Kategori</label>
                <select
                  value={filterJenis}
                  onChange={(e) => setFilterJenis(e.target.value)}
                >
                  <option value="">Semua Kategori</option>
                  <option value="Latihan Rutin">Latihan Rutin</option>
                  <option value="Tugas Upacara">Tugas Upacara</option>
                  <option value="Lomba PMR">Lomba PMR</option>
                  <option value="Bakti Sosial">Bakti Sosial</option>
                  <option value="Diklat / Pelatihan">Diklat / Pelatihan</option>
                  <option value="Rapat Organisasi">Rapat Organisasi</option>
                  <option value="Lainnya">Lainnya</option>
                </select>
              </div>

              <div className="filter-col-reset" style={{ display: 'flex', alignItems: 'flex-end' }}>
                <button
                  type="button"
                  className="btn-reset-history"
                  onClick={() => {
                    setHistorySearch('');
                    setFilterTglMulai('');
                    setFilterTglAkhir('');
                    setFilterJenis('');
                  }}
                  title="Reset Filter"
                  style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                >
                  <RotateCcw style={{ width: 12, height: 12 }} />
                  <span>Reset</span>
                </button>
              </div>
            </div>
          </div>

          {/* LIST SESI KEGIATAN */}
          {loadingHistory ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#64748b', fontWeight: 600 }}>
              Memuat arsip riwayat presensi...
            </div>
          ) : displayedSessions.length === 0 ? (
            <div className="empty-history-box">
              <Calendar style={{ width: 40, height: 40, color: '#94a3b8' }} />
              <h4>Tidak Ada Riwayat Presensi</h4>
              <p>Belum ada sesi presensi kegiatan yang sesuai dengan filter atau kata kunci yang dipilih.</p>
            </div>
          ) : (
            <div className="sesi-list-grid">
              {displayedSessions.map(sesi => {
                // Parse photos if any
                let photoUrls: string[] = [];
                if (sesi.foto_dokumentasi_url) {
                  try {
                    const parsed = JSON.parse(sesi.foto_dokumentasi_url);
                    photoUrls = Array.isArray(parsed) ? parsed : [sesi.foto_dokumentasi_url];
                  } catch {
                    photoUrls = [sesi.foto_dokumentasi_url];
                  }
                }

                // Total attendance count & rate
                const totalAttendees = (sesi.hadir + sesi.izin + sesi.sakit + sesi.alpa) || sesi.records?.length || 0;
                const attendancePercent = totalAttendees > 0
                  ? Math.round((sesi.hadir / totalAttendees) * 100)
                  : 100;

                return (
                  <div key={sesi.sesi_id} className="sesi-card">
                    {/* BARIS 1: JUDUL KEGIATAN & BADGE KATEGORI */}
                    <div className="sesi-card-row-1">
                      <h4 className="sesi-card-title" title={sesi.nama_kegiatan}>
                        {sesi.nama_kegiatan}
                      </h4>
                      <span className="sesi-badge-kategori">{sesi.jenis_kegiatan}</span>
                    </div>

                    {/* BARIS 2: TANGGAL & LOKASI KEGIATAN */}
                    <div className="sesi-card-row-2">
                      <span className="sesi-meta-chip">
                        <Calendar style={{ width: 12, height: 12, color: 'var(--maroon)' }} />
                        <span>{formatTanggalIndo(sesi.tanggal_kegiatan)}</span>
                      </span>
                      <span className="sesi-row-divider">•</span>
                      <span className="sesi-meta-chip sesi-meta-tempat" title={sesi.tempat_kegiatan}>
                        <MapPin style={{ width: 12, height: 12, color: '#64748b' }} />
                        <span className="sesi-tempat-truncate">{sesi.tempat_kegiatan}</span>
                      </span>
                      {photoUrls.length > 0 && (
                        <>
                          <span className="sesi-row-divider">•</span>
                          <span className="sesi-photo-tag" title={`${photoUrls.length} foto dokumentasi`}>
                            <Camera style={{ width: 11, height: 11 }} />
                            <span>{photoUrls.length} Foto</span>
                          </span>
                        </>
                      )}
                    </div>

                    {/* BARIS 3: RINGKASAN KEHADIRAN */}
                    <div className="sesi-card-row-3">
                      <div className="sesi-stats-pills-row">
                        <span className="stat-pill-mini pill-hadir">Hadir: <b>{sesi.hadir}</b></span>
                        <span className="stat-pill-mini pill-izin">Izin: <b>{sesi.izin}</b></span>
                        <span className="stat-pill-mini pill-sakit">Sakit: <b>{sesi.sakit}</b></span>
                        <span className="stat-pill-mini pill-alpa">Alpa: <b>{sesi.alpa}</b></span>
                      </div>
                    </div>

                    {/* BARIS 4: PERSENTASE KEHADIRAN & TOMBOL AKSI */}
                    <div className="sesi-card-row-4">
                      <div className="sesi-rate-badge">
                        <span className="rate-num">{attendancePercent}%</span>
                        <span className="rate-sub">Hadir</span>
                      </div>

                      <div className="sesi-card-actions">
                        <button
                          type="button"
                          className="btn-card-icon btn-detail"
                          onClick={() => {
                            setDetailSession(sesi);
                            setModalFilterStatus('Semua');
                            setModalSearch('');
                          }}
                          title="Lihat rincian lengkap & dokumentasi"
                          aria-label="Lihat Detail"
                        >
                          <Eye style={{ width: 14, height: 14 }} />
                        </button>

                        {canManage && (
                          <button
                            type="button"
                            className="btn-card-icon btn-edit"
                            onClick={() => handleEditSession(sesi.sesi_id)}
                            title="Edit presensi kegiatan"
                            aria-label="Edit Presensi"
                          >
                            <Edit2 style={{ width: 13, height: 13 }} />
                          </button>
                        )}

                        {canDelete && (
                          <button
                            type="button"
                            className="btn-card-icon btn-hapus"
                            onClick={() => setSessionToDelete(sesi)}
                            title="Hapus rekaman presensi"
                            aria-label="Hapus Presensi"
                          >
                            <Trash2 style={{ width: 13, height: 13 }} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {filteredSessions.length > historyLimit && (
            <div style={{ textAlign: 'center', marginTop: 18 }}>
              <button
                type="button"
                className="btn-load-more"
                onClick={() => setHistoryLimit(prev => prev + 12)}
              >
                Tampilkan Lebih Banyak ({filteredSessions.length - historyLimit} sesi lagi)
              </button>
            </div>
          )}
        </div>
      )}

      {/* DETAIL PRESENSI MODAL (INTERACTIVE) */}
      {detailSession && (
        <div className="app-modal-backdrop active">
          <div className="app-modal-card" style={{ maxWidth: 580 }}>
            <div className="app-modal-header">
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: 800 }}>{detailSession.nama_kegiatan}</h3>
                <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>
                  {formatTanggalIndo(detailSession.tanggal_kegiatan)} · {detailSession.tempat_kegiatan}
                </span>
              </div>
              <button
                type="button"
                className="app-modal-close"
                onClick={() => setDetailSession(null)}
              >
                &times;
              </button>
            </div>

            <div className="app-modal-body" style={{ maxHeight: '75vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* META INFO CARD */}
              <div className="modal-info-summary">
                <div className="info-row">
                  <span className="info-label">Jenis Kegiatan:</span>
                  <span className="info-val">{detailSession.jenis_kegiatan}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Waktu/Tempat:</span>
                  <span className="info-val">{detailSession.tempat_kegiatan}</span>
                </div>
                {detailSession.deskripsi_kegiatan && (
                  <div className="info-row" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 2 }}>
                    <span className="info-label">Deskripsi / Catatan:</span>
                    <span className="info-val" style={{ fontStyle: 'italic', color: '#475569' }}>
                      {detailSession.deskripsi_kegiatan}
                    </span>
                  </div>
                )}
                {/* Stats Summary */}
                <div className="info-stats-pills">
                  <span className="stat-pill pill-hadir">Hadir: {detailSession.hadir}</span>
                  <span className="stat-pill pill-izin">Izin: {detailSession.izin}</span>
                  <span className="stat-pill pill-sakit">Sakit: {detailSession.sakit}</span>
                  <span className="stat-pill pill-alpa">Alpa: {detailSession.alpa}</span>
                </div>
              </div>

              {/* Photos Gallery */}
              {detailSession.foto_dokumentasi_url && (
                <div>
                  <h4 style={{ fontSize: 12, fontWeight: 800, marginBottom: 8, color: '#0f172a' }}>
                    Dokumentasi Foto Kegiatan:
                  </h4>
                  <div className="modal-photos-grid">
                    {(() => {
                      let photos: string[] = [];
                      try {
                        const parsed = JSON.parse(detailSession.foto_dokumentasi_url!);
                        photos = Array.isArray(parsed) ? parsed : [detailSession.foto_dokumentasi_url!];
                      } catch {
                        photos = [detailSession.foto_dokumentasi_url!];
                      }
                      return photos.map((url, i) => (
                        <div
                          key={i}
                          className="modal-photo-slot"
                          onClick={() => setEnlargedPhotoUrl(url)}
                          title="Ketuk untuk perbesar"
                        >
                          <img src={url} alt={`Dokumentasi ${i + 1}`} />
                        </div>
                      ));
                    })()}
                  </div>
                </div>
              )}

              {/* Member Attendance Roster with Search & Filter */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 6 }}>
                  <h4 style={{ fontSize: 12.5, fontWeight: 800, color: '#0f172a', margin: 0 }}>
                    Daftar Kehadiran ({detailSession.records.length} Siswa):
                  </h4>

                  {/* Filter chips inside modal */}
                  <div className="modal-roster-filter-chips">
                    {['Semua', 'Hadir', 'Izin', 'Sakit', 'Alpa'].map(st => (
                      <button
                        key={st}
                        type="button"
                        className={`modal-chip ${modalFilterStatus === st ? 'active' : ''}`}
                        onClick={() => setModalFilterStatus(st)}
                      >
                        {st}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="modal-roster-search">
                  <Search style={{ width: 13, height: 13, color: '#94a3b8' }} />
                  <input
                    type="text"
                    placeholder="Saring nama siswa dalam presensi..."
                    value={modalSearch}
                    onChange={(e) => setModalSearch(e.target.value)}
                  />
                  {modalSearch && (
                    <button
                      type="button"
                      className="btn-clear-roster"
                      onClick={() => setModalSearch('')}
                    >
                      <X style={{ width: 11, height: 11 }} />
                    </button>
                  )}
                </div>

                <div className="modal-roster-list">
                  {detailSession.records
                    .slice()
                    .filter(r => {
                      if (modalFilterStatus !== 'Semua' && r.status_kehadiran !== modalFilterStatus) return false;
                      if (modalSearch) {
                        const name = (r.users_profile?.nama_lengkap || '').toLowerCase();
                        if (!name.includes(modalSearch.toLowerCase())) return false;
                      }
                      return true;
                    })
                    .sort((a, b) => {
                      const nameA = a.users_profile?.nama_lengkap || '';
                      const nameB = b.users_profile?.nama_lengkap || '';
                      return nameA.localeCompare(nameB, 'id');
                    })
                    .map((r, i) => {
                      const nama = r.users_profile?.nama_lengkap || 'Anggota PMR';
                      const kelas = r.users_profile?.kelas || '-';

                      let badgeClass = 'status-hadir';
                      if (r.status_kehadiran === 'Izin') badgeClass = 'status-izin';
                      else if (r.status_kehadiran === 'Sakit') badgeClass = 'status-sakit';
                      else if (r.status_kehadiran === 'Alpa') badgeClass = 'status-alpa';
                      else if (r.status_kehadiran === 'Tidak Ditugaskan') badgeClass = 'status-td';

                      return (
                        <div key={i} className="modal-roster-item">
                          <div className="roster-item-left">
                            <span className="roster-index">{i + 1}.</span>
                            <div>
                              <div className="roster-name">{nama}</div>
                              <div className="roster-sub">Kelas: {kelas}</div>
                            </div>
                          </div>
                          <span className={`roster-status-tag ${badgeClass}`}>
                            {r.status_kehadiran}
                          </span>
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>

            <div className="app-modal-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
              <div style={{ display: 'flex', gap: 8 }}>
                {canManage && (
                  <button
                    type="button"
                    className="btn-modal-action-edit"
                    onClick={() => {
                      handleEditSession(detailSession.sesi_id);
                      setDetailSession(null);
                    }}
                  >
                    <Edit2 style={{ width: 13, height: 13 }} />
                    <span>Edit Presensi</span>
                  </button>
                )}
                {canDelete && (
                  <button
                    type="button"
                    className="btn-modal-action-del"
                    onClick={() => {
                      setSessionToDelete(detailSession);
                    }}
                  >
                    <Trash2 style={{ width: 13, height: 13 }} />
                    <span>Hapus Presensi</span>
                  </button>
                )}
              </div>
              <button
                type="button"
                className="btn-modal-cancel"
                onClick={() => setDetailSession(null)}
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE PRESENSI CONFIRMATION MODAL */}
      {sessionToDelete && (
        <div className="app-modal-backdrop active" style={{ zIndex: 99999 }}>
          <div className="app-modal-card" style={{ maxWidth: 460 }}>
            <div className="app-modal-header" style={{ background: '#7f1d1d', color: '#ffffff' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <AlertTriangle style={{ width: 20, height: 20, color: '#fca5a5' }} />
                <h3 style={{ fontSize: 14, fontWeight: 800, margin: 0 }}>Konfirmasi Hapus Presensi</h3>
              </div>
              <button
                type="button"
                className="app-modal-close"
                style={{ color: '#ffffff' }}
                onClick={() => !isDeletingSession && setSessionToDelete(null)}
              >
                &times;
              </button>
            </div>

            <div className="app-modal-body" style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <p style={{ margin: 0, fontSize: 13, color: '#334155', lineHeight: 1.5 }}>
                Apakah Anda yakin ingin menghapus seluruh rekaman presensi kegiatan berikut?
              </p>

              <div style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: 12, padding: '12px 14px', fontSize: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div><b style={{ color: '#0f172a', fontSize: 13 }}>{sessionToDelete.nama_kegiatan}</b></div>
                <div style={{ color: '#64748b' }}>📅 {formatTanggalIndo(sessionToDelete.tanggal_kegiatan)} · 📍 {sessionToDelete.tempat_kegiatan}</div>
                <div style={{ color: '#64748b' }}>👥 Total {sessionToDelete.records.length} Siswa Tercatat (Hadir: {sessionToDelete.hadir}, Izin: {sessionToDelete.izin}, Sakit: {sessionToDelete.sakit}, Alpa: {sessionToDelete.alpa})</div>
              </div>

              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '10px 12px', fontSize: 11.5, color: '#991b1b', display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <AlertTriangle style={{ width: 16, height: 16, flexShrink: 0, marginTop: 1 }} />
                <span>Tindakan ini tidak dapat dibatalkan. Seluruh data kehadiran anggota dan foto dokumentasi kegiatan ini akan dihapus secara permanen.</span>
              </div>
            </div>

            <div className="app-modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, padding: '14px 20px' }}>
              <button
                type="button"
                className="btn-modal-cancel"
                onClick={() => setSessionToDelete(null)}
                disabled={isDeletingSession}
              >
                Batal
              </button>
              <button
                type="button"
                className="btn-modal-action-del"
                style={{ background: '#dc2626', color: '#ffffff', borderColor: '#b91c1c' }}
                onClick={handleConfirmDeleteSession}
                disabled={isDeletingSession}
              >
                {isDeletingSession ? (
                  <>
                    <Loader2 className="spin-anim" style={{ width: 14, height: 14 }} /> Menghapus...
                  </>
                ) : (
                  <>
                    <Trash2 style={{ width: 14, height: 14 }} /> Ya, Hapus Presensi
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PHOTO ZOOM VIEWER */}
      <PhotoViewerModal
        imageUrl={enlargedPhotoUrl}
        onClose={() => setEnlargedPhotoUrl(null)}
      />
    </div>
  );
};
