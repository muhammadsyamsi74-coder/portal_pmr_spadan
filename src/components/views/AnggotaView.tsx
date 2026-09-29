import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../services/supabase';
import { UserProfile } from '../../types';
import {
  Users,
  UserCheck,
  UserPlus,
  GraduationCap,
  Search,
  Filter,
  LayoutGrid,
  Table as TableIcon,
  LayoutList,
  Plus,
  Edit3,
  Trash2,
  User as UserIcon,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  X,
  MessageSquare,
  Phone,
  Lock,
  Eye,
  EyeOff,
  AlertTriangle,
  CheckCircle2
} from 'lucide-react';
import {
  isAdmin,
  isPengurus,
  isAlumni,
  canManageMembers,
  validateImageFile,
  compressImage,
  sanitizeText
} from '../../utils/security';
import { PhotoViewerModal } from '../modals/PhotoViewerModal';

export const AnggotaView: React.FC = () => {
  const { profile, user } = useAuth();

  const [members, setMembers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Delete Member Confirmation with Password Verification Modal
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState<UserProfile | null>(null);
  const [adminPasswordInput, setAdminPasswordInput] = useState('');
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteSuccess, setDeleteSuccess] = useState<string | null>(null);

  // Filters & Views
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [viewMode, setViewMode] = useState<'cards' | 'structure'>('cards');
  const [isMobileScreen, setIsMobileScreen] = useState(
    typeof window !== 'undefined' ? window.innerWidth <= 768 : false
  );

  useEffect(() => {
    const handleResize = () => {
      setIsMobileScreen(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const [expandedCardIds, setExpandedCardIds] = useState<Record<string, boolean>>({});

  const toggleCardExpand = (id: string) => {
    setExpandedCardIds(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // Photo viewer state
  const [enlargedPhotoUrl, setEnlargedPhotoUrl] = useState<string | null>(null);

  // Add / Edit Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [formNamaLengkap, setFormNamaLengkap] = useState('');
  const [formNamaPanggilan, setFormNamaPanggilan] = useState('');
  const [formJenisKelamin, setFormJenisKelamin] = useState('');
  const [formTanggalLahir, setFormTanggalLahir] = useState('');
  const [formKelas, setFormKelas] = useState('');
  const [formTahunBergabung, setFormTahunBergabung] = useState(new Date().getFullYear().toString());
  const [formNisn, setFormNisn] = useState('');
  const [formJabatan, setFormJabatan] = useState('non-aktif');
  const [formKeteranganJabatan, setFormKeteranganJabatan] = useState('Anggota');
  const [formGolonganDarah, setFormGolonganDarah] = useState('');
  const [formRhesusDarah, setFormRhesusDarah] = useState('');
  const [formRiwayatPenyakit, setFormRiwayatPenyakit] = useState('');
  const [formWaPribadi, setFormWaPribadi] = useState('');
  const [formWaOrtu, setFormWaOrtu] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formFotoFile, setFormFotoFile] = useState<File | null>(null);

  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const canManage = canManageMembers(profile);
  const userIsAdmin = isAdmin(profile);
  const isGuest = !profile;
  const isViewerAlumni = isAlumni(profile);
  // Sembunyikan informasi jabatan admin untuk Guest dan Alumni
  const hideAdminInfo = isGuest || isViewerAlumni;

  // Aturan hak akses tombol WhatsApp:
  // Hanya muncul bagi:
  // 1) Admin
  // 2) Kepala Sekolah
  // 3) Pelatih / Pembina
  // 4) Pengurus (Ketua, Wakil, Sekretaris, Bendahara)
  // 5) Anggota aktif
  // Tombol WhatsApp TIDAK dimunculkan untuk alumni dan anggota non-aktif
  const canViewWhatsapp = (() => {
    if (!profile) return false;

    const jab = (profile.jabatan || '').toLowerCase();
    const ket = (profile.keterangan_jabatan || '').toLowerCase();

    // Jika viewer adalah alumni atau non-aktif, tombol WA tidak muncul
    if (ket === 'alumni' || jab === 'alumni' || ket === 'non-aktif' || jab === 'non-aktif') {
      return false;
    }

    // 1) Admin
    if (isAdmin(profile) || jab === 'admin' || ket === 'admin') {
      return true;
    }

    // 2) Kepala Sekolah
    if (
      ket.includes('kepala sekolah') ||
      jab.includes('kepala sekolah') ||
      ket.includes('kepsek') ||
      jab.includes('kepsek')
    ) {
      return true;
    }

    // 3) Pelatih (dan Pembina)
    if (
      ket.includes('pelatih') ||
      jab.includes('pelatih') ||
      ket.includes('pembina') ||
      jab.includes('pembina')
    ) {
      return true;
    }

    // 4) Pengurus (ketua, wakil, sekretaris, dan bendahara)
    if (
      ket.includes('ketua') ||
      jab.includes('ketua') ||
      ket.includes('wakil') ||
      jab.includes('wakil') ||
      ket.includes('sekretaris') ||
      jab.includes('sekretaris') ||
      ket.includes('bendahara') ||
      jab.includes('bendahara') ||
      jab === 'pengurus'
    ) {
      return true;
    }

    // 5) Anggota aktif
    if (jab === 'anggota' && ket !== 'alumni' && ket !== 'non-aktif') {
      return true;
    }

    return false;
  })();

  // Hak akses melihat nomor WhatsApp Orang Tua:
  // HANYA admin (kepala sekolah, pembina) dan pelatih saja
  const canViewWaOrtu = (() => {
    if (!profile) return false;

    const jab = (profile.jabatan || '').toLowerCase();
    const ket = (profile.keterangan_jabatan || '').toLowerCase();

    // Alumni dan non-aktif tidak boleh
    if (ket === 'alumni' || jab === 'alumni' || ket === 'non-aktif' || jab === 'non-aktif') {
      return false;
    }

    // 1) Admin
    if (isAdmin(profile) || jab === 'admin' || ket === 'admin') {
      return true;
    }

    // 2) Kepala Sekolah
    if (
      ket.includes('kepala sekolah') ||
      jab.includes('kepala sekolah') ||
      ket.includes('kepsek') ||
      jab.includes('kepsek')
    ) {
      return true;
    }

    // 3) Pembina
    if (ket.includes('pembina') || jab.includes('pembina')) {
      return true;
    }

    // 4) Pelatih
    if (ket.includes('pelatih') || jab.includes('pelatih')) {
      return true;
    }

    return false;
  })();

  const fetchMembers = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('users_profile')
        .select('*')
        .order('nama_lengkap', { ascending: true });

      if (error) throw error;
      setMembers((data as UserProfile[]) || []);
    } catch (err: any) {
      setError(err.message || 'Gagal memuat data anggota.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  // Summary counts
  let countAktif = 0;
  let countUsulan = 0;
  let countAlumni = 0;
  let countNonAktif = 0;

  members.forEach(item => {
    const jab = (item.jabatan || '').toLowerCase();
    const ket = (item.keterangan_jabatan || '').toLowerCase();
    if (ket === 'alumni') countAlumni++;
    else if (ket === 'non-aktif') countNonAktif++;
    else if (jab === 'non-aktif') countUsulan++;
    else countAktif++;
  });

  // Filter list
  const filteredList = members.filter(item => {
    const ket = (item.keterangan_jabatan || '').toLowerCase();
    if (ket === 'non-aktif' && !canManage) {
      return false;
    }

    const q = searchQuery.toLowerCase();
    const matchSearch =
      item.nama_lengkap.toLowerCase().includes(q) ||
      (item.nama_panggilan && item.nama_panggilan.toLowerCase().includes(q)) ||
      (item.nisn && item.nisn.includes(q)) ||
      (item.kelas && item.kelas.toLowerCase().includes(q));

    return matchSearch;
  });

  // Split into categories
  const listAktif: UserProfile[] = [];
  const listUsulan: UserProfile[] = [];
  const listAlumni: UserProfile[] = [];
  const listNonAktif: UserProfile[] = [];

  filteredList.forEach(item => {
    const jab = (item.jabatan || '').toLowerCase();
    const ket = (item.keterangan_jabatan || '').toLowerCase();

    if (ket === 'alumni') {
      listAlumni.push(item);
    } else if (ket === 'non-aktif') {
      if (canManage) listNonAktif.push(item);
    } else if (jab === 'non-aktif') {
      listUsulan.push(item);
    } else {
      listAktif.push(item);
    }
  });

  const showAktif = (statusFilter === '' || statusFilter === 'aktif') && listAktif.length > 0;
  const showUsulan = (statusFilter === '' || statusFilter === 'usulan') && listUsulan.length > 0;
  const showAlumni = (statusFilter === '' || statusFilter === 'alumni') && listAlumni.length > 0;
  const showNonAktif = canManage && (statusFilter === '' || statusFilter === 'nonaktif') && listNonAktif.length > 0;

  const hasVisibleSections = showAktif || showUsulan || showAlumni || showNonAktif;

  // Open modal for Adding Member
  const handleOpenAddModal = () => {
    setEditingUserId(null);
    setFormNamaLengkap('');
    setFormNamaPanggilan('');
    setFormJenisKelamin('');
    setFormTanggalLahir('');
    setFormKelas('');
    setFormTahunBergabung(new Date().getFullYear().toString());
    setFormNisn('');
    setFormJabatan('anggota');
    setFormKeteranganJabatan('Anggota');
    setFormGolonganDarah('');
    setFormRhesusDarah('');
    setFormRiwayatPenyakit('');
    setFormWaPribadi('');
    setFormWaOrtu('');
    setFormEmail('');
    setFormPassword('');
    setFormFotoFile(null);
    setModalError(null);
    setIsModalOpen(true);
  };

  // Open modal for Editing Member
  const handleOpenEditModal = (target: UserProfile) => {
    setEditingUserId(target.id);
    setFormNamaLengkap(target.nama_lengkap || '');
    setFormNamaPanggilan(target.nama_panggilan || '');
    setFormJenisKelamin(target.jenis_kelamin || '');
    setFormTanggalLahir(target.tanggal_lahir || '');
    setFormKelas(target.kelas || '');
    setFormTahunBergabung(target.tahun_bergabung || '');
    setFormNisn(target.nisn || '');
    setFormJabatan(target.jabatan || 'non-aktif');
    setFormKeteranganJabatan(target.keterangan_jabatan || 'Anggota');
    setFormGolonganDarah(target.golongan_darah || '');
    setFormRhesusDarah(target.rhesus_darah || '');
    setFormRiwayatPenyakit(target.riwayat_penyakit || '');
    setFormWaPribadi(target.no_wa_pribadi || '');
    setFormWaOrtu(target.no_wa_ortu || '');
    setFormEmail(target.email || '');
    setFormPassword('');
    setFormFotoFile(null);
    setModalError(null);
    setIsModalOpen(true);
  };

  // Submit Add/Edit form
  const handleSaveMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);
    setModalSubmitting(true);

    try {
      let fotoUrl: string | null = null;
      if (formFotoFile) {
        const compressed = await compressImage(formFotoFile, 400, 0.75);
        const fileName = `foto_${crypto.randomUUID()}.jpg`;

        const { error: uploadErr } = await supabase.storage
          .from('profil-anggota')
          .upload(fileName, compressed.blob, { contentType: 'image/jpeg' });

        if (!uploadErr) {
          const { data: publicData } = supabase.storage
            .from('profil-anggota')
            .getPublicUrl(fileName);
          fotoUrl = publicData.publicUrl;
        }
      }

      const payload: Partial<UserProfile> = {
        nama_lengkap: sanitizeText(formNamaLengkap).toUpperCase(),
        nama_panggilan: sanitizeText(formNamaPanggilan),
        jenis_kelamin: formJenisKelamin,
        tanggal_lahir: formTanggalLahir,
        kelas: sanitizeText(formKelas),
        tahun_bergabung: sanitizeText(formTahunBergabung),
        nisn: sanitizeText(formNisn) || null,
        golongan_darah: formGolonganDarah || null,
        rhesus_darah: formRhesusDarah || null,
        riwayat_penyakit: sanitizeText(formRiwayatPenyakit) || null,
        no_wa_pribadi: sanitizeText(formWaPribadi) || null,
        no_wa_ortu: sanitizeText(formWaOrtu) || null
      };

      if (canManage) {
        payload.jabatan = formJabatan;
        payload.keterangan_jabatan = formKeteranganJabatan;
      }

      if (fotoUrl) {
        payload.foto_profil_url = fotoUrl;
      }

      if (editingUserId) {
        const { error: updateErr } = await supabase
          .from('users_profile')
          .update(payload)
          .eq('id', editingUserId);

        if (updateErr) throw updateErr;
      } else {
        // Create new user auth
        const trimmedEmail = formEmail.trim();
        if (formPassword.length < 6) {
          throw new Error('Kata sandi minimal harus 6 karakter.');
        }

        const { data: authData, error: authErr } = await supabase.auth.signUp({
          email: trimmedEmail,
          password: formPassword
        });

        if (authErr) throw authErr;
        if (!authData.user) throw new Error('Gagal membuat autentikasi anggota.');

        payload.id = authData.user.id;
        payload.email = trimmedEmail;
        payload.jabatan = payload.jabatan || 'anggota';
        payload.keterangan_jabatan = payload.keterangan_jabatan || 'Anggota';

        const { error: insertErr } = await supabase.from('users_profile').insert(payload);
        if (insertErr) throw insertErr;
      }

      setIsModalOpen(false);
      await fetchMembers();
    } catch (err: any) {
      setModalError(err.message || 'Terjadi kesalahan.');
    } finally {
      setModalSubmitting(false);
    }
  };

  // Delete Member Confirmation Handlers
  const handleOpenDeleteModal = (target: UserProfile) => {
    if (!userIsAdmin) return;
    if (profile?.id === target.id) return;
    setMemberToDelete(target);
    setAdminPasswordInput('');
    setShowAdminPassword(false);
    setDeleteError(null);
    setDeleteSuccess(null);
    setIsDeleteModalOpen(true);
  };

  const handleCloseDeleteModal = () => {
    if (deleteLoading) return;
    setIsDeleteModalOpen(false);
    setMemberToDelete(null);
    setAdminPasswordInput('');
    setShowAdminPassword(false);
    setDeleteError(null);
    setDeleteSuccess(null);
  };

  const handleConfirmDeleteMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberToDelete || !userIsAdmin) return;

    if (!adminPasswordInput.trim()) {
      setDeleteError('Harap masukkan kata sandi akun Anda untuk konfirmasi keamanan.');
      return;
    }

    setDeleteLoading(true);
    setDeleteError(null);

    try {
      // 1. Verifikasi Kata Sandi Admin melalui Supabase Auth
      const adminEmail = user?.email || profile?.email;
      if (adminEmail) {
        const { error: authErr } = await supabase.auth.signInWithPassword({
          email: adminEmail,
          password: adminPasswordInput
        });

        if (authErr) {
          throw new Error('Kata sandi yang Anda masukkan salah. Penghapusan dibatalkan demi keamanan.');
        }
      }

      // 2. Hapus data profil anggota dari database
      const { error: delErr } = await supabase
        .from('users_profile')
        .delete()
        .eq('id', memberToDelete.id);

      if (delErr) throw delErr;

      setDeleteSuccess(`Akun anggota "${memberToDelete.nama_lengkap}" berhasil dihapus.`);
      await fetchMembers();

      setTimeout(() => {
        handleCloseDeleteModal();
      }, 1000);
    } catch (err: any) {
      setDeleteError(err.message || 'Gagal memverifikasi kata sandi atau menghapus anggota.');
    } finally {
      setDeleteLoading(false);
    }
  };

  // Render Interactive Card List Helper (Kartu Sentuh Modern untuk Mobile & Desktop)
  const renderCardList = (list: UserProfile[]) => {
    return (
      <div className="member-cards-grid">
        {list.map(item => {
          const isMe = profile?.id === item.id;
          const canEdit = canManage || isMe;
          const isExpanded = !!expandedCardIds[item.id];

          let roleBadgeClass = 'badge-anggota';
          let roleBadgeLabel = item.jabatan || 'Anggota';
          if (item.jabatan === 'admin') {
            if (hideAdminInfo) {
              roleBadgeClass = 'badge-pengurus';
              roleBadgeLabel = 'Pengurus';
            } else {
              roleBadgeClass = 'badge-admin';
              roleBadgeLabel = 'Admin';
            }
          } else if (item.jabatan === 'pengurus') {
            roleBadgeClass = 'badge-pengurus';
            roleBadgeLabel = 'Pengurus';
          } else if (item.jabatan === 'non-aktif') {
            roleBadgeClass = 'badge-nonaktif';
            roleBadgeLabel = 'Non-Aktif';
          }

          const rhesus = item.rhesus_darah === 'Positif' ? '+' : (item.rhesus_darah === 'Negatif' ? '-' : '');
          const goldarText = item.golongan_darah ? `${item.golongan_darah}${rhesus}` : null;
          const jkLabel = item.jenis_kelamin === 'Laki-laki' ? 'L' : (item.jenis_kelamin === 'Perempuan' ? 'P' : '');

          const formatWa = (phoneStr: string | null | undefined): string => {
            if (!phoneStr) return '';
            const cleaned = phoneStr.replace(/\D/g, '');
            if (!cleaned) return '';
            if (cleaned.startsWith('0')) return '62' + cleaned.slice(1);
            if (cleaned.startsWith('62')) return cleaned;
            if (cleaned.startsWith('8')) return '62' + cleaned;
            return cleaned;
          };

          const waLink = formatWa(item.no_wa_pribadi);
          const waOrtuLink = formatWa(item.no_wa_ortu);

          const isAlumniMember = (item.keterangan_jabatan || '').toLowerCase() === 'alumni';
          const isNonAktif = item.jabatan === 'non-aktif' || (item.keterangan_jabatan || '').toLowerCase() === 'non-aktif';
          const dotType = isNonAktif ? 'nonaktif' : (isAlumniMember ? 'alumni' : (item.jabatan === 'non-aktif' ? 'usulan' : 'aktif'));
          const dotTitle = hideAdminInfo && item.jabatan === 'admin'
            ? 'Status: Pengurus'
            : `Status: ${item.jabatan || 'aktif'}`;

          // Hak akses WhatsApp Pribadi (viewer berhak & target aktif)
          const showWaPribadi = canViewWhatsapp && !isAlumniMember && !isNonAktif;
          // Hak akses nomor WA Orang Tua: HANYA admin (kepsek, pembina) & pelatih
          const showWaOrtu = canViewWaOrtu && !isAlumniMember && !isNonAktif;

          // 2. Hak akses Riwayat Penyakit (Medis / Alergi):
          // Disembunyikan untuk Guest, Alumni, dan anggota biasa lainnya.
          // Hanya dapat dilihat oleh diri sendiri (isMe) atau pengurus/pembina/admin (canManage)
          const showRiwayatPenyakit = isMe || (!isGuest && !isViewerAlumni && canManage);

          // 3. Hak akses Tanggal Lahir:
          // Disembunyikan untuk Guest, Alumni, dan anggota lainnya (sesama anggota tidak boleh melihat tanggal lahir).
          // Hanya dapat dilihat oleh diri sendiri (isMe) atau pengurus/pembina/admin (canManage)
          const showTanggalLahir = isMe || (!isGuest && !isViewerAlumni && canManage);

          // Keterangan jabatan (samarkan kata 'admin' untuk Guest & Alumni)
          const posText = (() => {
            if (!item.keterangan_jabatan) return null;
            const rawKet = item.keterangan_jabatan.trim();
            if (hideAdminInfo && rawKet.toLowerCase().includes('admin')) {
              return 'Pengurus';
            }
            if (rawKet.toLowerCase() === roleBadgeLabel.toLowerCase()) {
              return null;
            }
            return rawKet;
          })();

          return (
            <div key={item.id} className={`member-interactive-card ${isExpanded ? 'card-expanded' : ''}`}>
              {/* CARD TOP INFO - KETUK UNTUK BUKA/TUTUP DETAIL */}
              <div
                className="card-header-row"
                onClick={() => toggleCardExpand(item.id)}
                style={{ cursor: 'pointer' }}
                title="Ketuk kartu untuk melihat detail lengkap"
              >
                <div className="card-avatar-wrapper">
                  {item.foto_profil_url ? (
                    <img
                      src={item.foto_profil_url}
                      alt={item.nama_lengkap}
                      className="card-avatar-img"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEnlargedPhotoUrl(item.foto_profil_url || null);
                      }}
                      title="Ketuk untuk perbesar foto"
                    />
                  ) : (
                    <div className="card-avatar-placeholder">
                      {(item.nama_panggilan || item.nama_lengkap || '?').charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className={`card-status-dot dot-${dotType}`} title={dotTitle} />
                </div>

                <div className="card-main-info">
                  <div className="card-name-row">
                    <h4 className="card-member-name">
                      {item.nama_lengkap}
                    </h4>
                  </div>

                  <div className="card-meta-line">
                    {item.kelas && <span>Kelas {item.kelas}</span>}
                    {item.kelas && item.nisn && <span className="meta-sep">·</span>}
                    {item.nisn && <span>NISN: {item.nisn}</span>}
                    {jkLabel && <span className="meta-sep">·</span>}
                    {jkLabel && <span>{jkLabel}</span>}
                  </div>

                  <div className="card-tags-row">
                    {posText && (
                      <span className="card-position-text">
                        {posText}
                      </span>
                    )}
                    <span className={`badge-role ${roleBadgeClass}`}>
                      {roleBadgeLabel}
                    </span>
                    {goldarText && (
                      <span className="badge-blood-mini" title={`Golongan Darah: ${goldarText}`}>
                        Gol. {goldarText}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* EXPANDABLE ACCORDION DETAILS */}
              {isExpanded && (
                <div className="card-expanded-body">
                  <div className="card-detail-grid">
                    <div className="detail-field">
                      <span className="detail-label">Tahun Bergabung</span>
                      <span className="detail-value">{item.tahun_bergabung || '-'}</span>
                    </div>
                    <div className="detail-field">
                      <span className="detail-label">Jenis Kelamin</span>
                      <span className="detail-value">{item.jenis_kelamin || '-'}</span>
                    </div>
                    {showTanggalLahir && (
                      <div className="detail-field">
                        <span className="detail-label">Tanggal Lahir</span>
                        <span className="detail-value">{item.tanggal_lahir || '-'}</span>
                      </div>
                    )}
                    <div className="detail-field">
                      <span className="detail-label">Gol. Darah</span>
                      <span className="detail-value">
                        {item.golongan_darah ? `${item.golongan_darah} ${item.rhesus_darah ? `(${item.rhesus_darah})` : ''}` : '-'}
                      </span>
                    </div>
                  </div>

                  {showRiwayatPenyakit && item.riwayat_penyakit && (
                    <div className="detail-alert-box">
                      <span className="alert-title">⚠️ Riwayat Medis / Alergi:</span>
                      <span className="alert-desc">{item.riwayat_penyakit}</span>
                    </div>
                  )}

                  {(showWaPribadi || showWaOrtu) && (
                    <div className="detail-contacts-box">
                      {showWaPribadi && (
                        waLink ? (
                          <a
                            href={`https://wa.me/${waLink}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="contact-pill-btn wa-pribadi"
                            title="Chat WhatsApp Pribadi Anggota"
                          >
                            <MessageSquare style={{ width: 13, height: 13 }} />
                            <span>WA: {item.no_wa_pribadi}</span>
                          </a>
                        ) : (
                          <span className="contact-pill-muted">No. WA Pribadi: -</span>
                        )
                      )}

                      {showWaOrtu && (
                        waOrtuLink ? (
                          <a
                            href={`https://wa.me/${waOrtuLink}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="contact-pill-btn wa-ortu"
                            title="Chat WhatsApp Orang Tua (Khusus Admin / Pelatih)"
                          >
                            <Phone style={{ width: 13, height: 13 }} />
                            <span>WA Ortu: {item.no_wa_ortu}</span>
                          </a>
                        ) : (
                          <span className="contact-pill-muted">WA Ortu: -</span>
                        )
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* CARD FOOTER ACTIONS (HANYA ICON TANPA TEKS) */}
              <div className="card-footer-actions">
                <button
                  type="button"
                  className={`btn-member-icon btn-toggle-detail ${isExpanded ? 'is-active' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleCardExpand(item.id);
                  }}
                  aria-expanded={isExpanded}
                  title={isExpanded ? 'Tutup Detail' : 'Lihat Detail'}
                  aria-label={isExpanded ? 'Tutup Detail' : 'Lihat Detail'}
                >
                  {isExpanded ? (
                    <ChevronUp style={{ width: 15, height: 15 }} />
                  ) : (
                    <ChevronDown style={{ width: 15, height: 15 }} />
                  )}
                </button>

                <div className="card-quick-btns" onClick={(e) => e.stopPropagation()}>
                  {showWaPribadi && waLink && !isExpanded && (
                    <a
                      href={`https://wa.me/${waLink}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-member-icon btn-wa"
                      title="Chat WhatsApp"
                      aria-label="Chat WhatsApp"
                    >
                      <MessageSquare style={{ width: 14, height: 14 }} />
                    </a>
                  )}

                  {canEdit && (
                    <button
                      type="button"
                      className="btn-member-icon btn-edit"
                      onClick={() => handleOpenEditModal(item)}
                      title="Edit Profil"
                      aria-label="Edit Profil"
                    >
                      <Edit3 style={{ width: 14, height: 14 }} />
                    </button>
                  )}

                  {userIsAdmin && !isMe && (
                    <button
                      type="button"
                      className="btn-member-icon btn-hapus"
                      onClick={() => handleOpenDeleteModal(item)}
                      title="Hapus Anggota"
                      aria-label="Hapus Anggota"
                    >
                      <Trash2 style={{ width: 14, height: 14 }} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // Organizational Structure Tiers
  const tier1: UserProfile[] = [];
  const tier2: UserProfile[] = [];
  const tier3: UserProfile[] = [];
  const tier4: UserProfile[] = [];

  listAktif.forEach(item => {
    const ket = (item.keterangan_jabatan || '').toLowerCase();
    if (ket.includes('kepala sekolah') || ket.includes('pembina') || ket.includes('pelatih')) {
      tier1.push(item);
    } else if (
      ket.includes('ketua') ||
      ket.includes('wakil') ||
      ket.includes('sekretaris') ||
      ket.includes('bendahara')
    ) {
      tier2.push(item);
    } else if (ket.includes('seksi')) {
      tier3.push(item);
    } else {
      tier4.push(item);
    }
  });

  const renderStructureCard = (u: UserProfile) => {
    const displayRole = (() => {
      const raw = u.keterangan_jabatan || 'Anggota';
      if (hideAdminInfo && raw.toLowerCase().includes('admin')) {
        return 'Pengurus';
      }
      return raw;
    })();

    return (
      <div key={u.id} className="org-card-portrait">
        {/* PORTRAIT PHOTO BANNER / FRAME */}
        <div className="org-portrait-frame">
          {u.foto_profil_url ? (
            <img
              src={u.foto_profil_url}
              className="org-portrait-img"
              alt={u.nama_lengkap}
              onClick={() => setEnlargedPhotoUrl(u.foto_profil_url || null)}
              title="Ketuk untuk perbesar foto"
            />
          ) : (
            <div className="org-portrait-placeholder">
              <div className="org-placeholder-circle">
                {(u.nama_panggilan || u.nama_lengkap || '?').charAt(0).toUpperCase()}
              </div>
              <span className="org-placeholder-tag">PMR SPADAN</span>
            </div>
          )}

          <div className="org-portrait-role-badge">
            {displayRole}
          </div>
        </div>

        {/* DETAILS SECTION */}
        <div className="org-portrait-info">
          <h4 className="org-portrait-name" title={u.nama_lengkap}>
            {u.nama_lengkap}
          </h4>
          {u.nama_panggilan && (
            <div className="org-portrait-nickname">
              ({u.nama_panggilan})
            </div>
          )}
          <div className="org-portrait-meta">
            {u.kelas ? `Kelas ${u.kelas}` : 'Relawan'} {u.tahun_bergabung ? `· Th. ${u.tahun_bergabung}` : ''}
          </div>
        </div>
      </div>
    );
  };

  const emptyTierMsg = (
    <div style={{ fontSize: '11px', color: '#999', padding: '6px 0', textAlign: 'center', width: '100%' }}>
      Belum ada anggota pada tingkatan ini.
    </div>
  );

  return (
    <div className="anggota-container">
      {/* 1. SUMMARY STAT COUNTERS (1 BARIS DI HP & INTERAKTIF FILTER) */}
      <div className="anggota-summary-grid">
        <div
          className={`summary-item summary-aktif ${statusFilter === 'aktif' ? 'is-selected' : ''}`}
          onClick={() => setStatusFilter(statusFilter === 'aktif' ? '' : 'aktif')}
          role="button"
          tabIndex={0}
          title="Klik untuk filter: Anggota Aktif"
        >
          <div className="sum-icon">
            <UserCheck style={{ width: 20, height: 20 }} />
          </div>
          <div className="sum-info">
            <span className="sum-label">Aktif</span>
            <h3 className="sum-count">{countAktif}</h3>
          </div>
        </div>

        <div
          className={`summary-item summary-usulan ${statusFilter === 'usulan' ? 'is-selected' : ''}`}
          onClick={() => setStatusFilter(statusFilter === 'usulan' ? '' : 'usulan')}
          role="button"
          tabIndex={0}
          title="Klik untuk filter: Pengajuan Baru"
        >
          <div className="sum-icon">
            <UserPlus style={{ width: 20, height: 20 }} />
          </div>
          <div className="sum-info">
            <span className="sum-label">Pengajuan</span>
            <h3 className="sum-count">{countUsulan}</h3>
          </div>
        </div>

        <div
          className={`summary-item summary-alumni ${statusFilter === 'alumni' ? 'is-selected' : ''}`}
          onClick={() => setStatusFilter(statusFilter === 'alumni' ? '' : 'alumni')}
          role="button"
          tabIndex={0}
          title="Klik untuk filter: Korps Alumni"
        >
          <div className="sum-icon">
            <GraduationCap style={{ width: 20, height: 20 }} />
          </div>
          <div className="sum-info">
            <span className="sum-label">Alumni</span>
            <h3 className="sum-count">{countAlumni}</h3>
          </div>
        </div>
      </div>

      {/* 2. TOOLBAR (SEARCH & DROPDOWN FILTER + VIEW CONTROLS) */}
      <div className="anggota-toolbar-card">
        {/* ROW 1: SEARCH BOX & DROPDOWN FILTER SIDE-BY-SIDE */}
        <div className="toolbar-search-row">
          <div className="toolbar-search-box">
            <Search style={{ width: 16, height: 16, color: '#94a3b8', flexShrink: 0 }} />
            <input
              type="text"
              placeholder="Cari nama, panggilan, NISN, atau kelas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                className="btn-clear-search"
                onClick={() => setSearchQuery('')}
                title="Hapus kata kunci pencarian"
              >
                <X style={{ width: 14, height: 14 }} />
              </button>
            )}
          </div>

          <div className="toolbar-filter-select-wrapper">
            <Filter style={{ width: 14, height: 14, color: '#64748b', flexShrink: 0 }} />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="toolbar-filter-select"
              aria-label="Filter status keanggotaan"
            >
              <option value="">Semua Status ({members.length})</option>
              <option value="aktif">Aktif ({countAktif})</option>
              <option value="usulan">Pengajuan ({countUsulan})</option>
              <option value="alumni">Alumni ({countAlumni})</option>
              {canManage && countNonAktif > 0 && (
                <option value="nonaktif">Non-Aktif ({countNonAktif})</option>
              )}
            </select>
            <ChevronDown style={{ width: 14, height: 14, color: '#64748b', flexShrink: 0, pointerEvents: 'none' }} />
          </div>
        </div>

        {/* ROW 2: DAFTAR ANGGOTA, STRUKTUR ANGGOTA & TAMBAH ANGGOTA (BERDAMPINGAN SATU BARIS) */}
        <div className="toolbar-bottom-row">
          <div className="view-mode-toggle">
            <button
              type="button"
              className={`btn-view-mode ${viewMode === 'cards' ? 'active' : ''}`}
              onClick={() => setViewMode('cards')}
              title="Tampilan Daftar Anggota"
            >
              <LayoutList style={{ width: 14, height: 14 }} />
              <span>Daftar Anggota</span>
            </button>
            <button
              type="button"
              className={`btn-view-mode ${viewMode === 'structure' ? 'active' : ''}`}
              onClick={() => setViewMode('structure')}
              title="Tampilan Struktur Anggota"
            >
              <LayoutGrid style={{ width: 14, height: 14 }} />
              <span>Struktur Anggota</span>
            </button>
          </div>

          {canManage && (
            <button
              type="button"
              className="btn-add-member"
              onClick={handleOpenAddModal}
              title="Tambah Anggota Baru"
            >
              <Plus style={{ width: 15, height: 15 }} />
              <span>Tambah Anggota</span>
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '50px 20px', color: '#64748b', fontWeight: 600 }}>
          Memuat data keanggotaan PMR SPADAN...
        </div>
      ) : error ? (
        <div style={{ background: '#fee2e2', borderLeft: '4px solid #c62828', padding: '16px', borderRadius: '8px', color: '#c62828' }}>
          <b>Gagal memuat:</b> {error}
        </div>
      ) : viewMode === 'structure' ? (
        /* 3B. BAGAN STRUKTUR ORGANISASI */
        <div className="structure-view-container">
          <div className="structure-tier-box tier-pembina">
            <div className="tier-header-bar">
              <span>TINGKAT 1: DEWAN PEMBINA & PELATIH</span>
            </div>
            <div className="structure-cards-grid">
              {tier1.length > 0 ? tier1.map(renderStructureCard) : emptyTierMsg}
            </div>
          </div>

          <div className="structure-tier-box tier-inti">
            <div className="tier-header-bar">
              <span>TINGKAT 2: PENGURUS INTI SISWA</span>
            </div>
            <div className="structure-cards-grid">
              {tier2.length > 0 ? tier2.map(renderStructureCard) : emptyTierMsg}
            </div>
          </div>

          <div className="structure-tier-box tier-seksi">
            <div className="tier-header-bar">
              <span>TINGKAT 3: SEKSI-SEKSI OPERASIONAL</span>
            </div>
            <div className="structure-cards-grid">
              {tier3.length > 0 ? tier3.map(renderStructureCard) : emptyTierMsg}
            </div>
          </div>

          <div className="structure-tier-box tier-anggota">
            <div className="tier-header-bar">
              <span>TINGKAT 4: ANGGOTA RELAWAN PMR MADYA</span>
            </div>
            <div className="structure-cards-grid">
              {tier4.length > 0 ? tier4.map(renderStructureCard) : emptyTierMsg}
            </div>
          </div>
        </div>
      ) : !hasVisibleSections ? (
        /* EMPTY SEARCH / FILTER STATE */
        <div className="empty-member-results">
          <Users style={{ width: 42, height: 42, color: '#94a3b8' }} />
          <h4>Tidak Ada Data Anggota Ditemukan</h4>
          <p>
            {searchQuery
              ? `Tidak ditemukan anggota dengan kata kunci "${searchQuery}".`
              : statusFilter === 'usulan'
              ? 'Belum ada pengajuan anggota baru yang menunggu aktivasi.'
              : statusFilter === 'alumni'
              ? 'Belum ada data anggota pada korps alumni.'
              : statusFilter === 'aktif'
              ? 'Belum ada data anggota aktif.'
              : statusFilter === 'nonaktif'
              ? 'Tidak ada data anggota pada arsip non-aktif.'
              : 'Belum ada data anggota untuk filter yang dipilih.'}
          </p>
          {(searchQuery || statusFilter) && (
            <button
              type="button"
              className="btn-reset-filter"
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('');
              }}
            >
              Tampilkan Semua Anggota
            </button>
          )}
        </div>
      ) : (
        /* 3A. MODE KARTU SENTUH BERKATEGORI (DESKTOP & MOBILE) */
        <div className="member-sections-stack">
          {/* SEKSI ANGGOTA AKTIF */}
          {showAktif && (
            <div className="section-member-card">
              <div className="section-card-header header-aktif">
                <div className="sec-title-box">
                  <UserCheck style={{ width: 18, height: 18 }} />
                  <h4>Data Anggota Aktif</h4>
                </div>
                <span className="sec-count-badge badge-aktif">{listAktif.length} Anggota</span>
              </div>

              <div className="section-cards-wrapper">
                {renderCardList(listAktif)}
              </div>
            </div>
          )}

          {/* SEKSI PENGAJUAN BARU (USULAN) */}
          {showUsulan && (
            <div className="section-member-card">
              <div className="section-card-header header-usulan">
                <div className="sec-title-box">
                  <UserPlus style={{ width: 18, height: 18 }} />
                  <h4>Pengajuan Anggota Baru (Menunggu Aktivasi)</h4>
                </div>
                <span className="sec-count-badge badge-usulan">{listUsulan.length} Pengajuan</span>
              </div>

              <div className="section-cards-wrapper">
                {renderCardList(listUsulan)}
              </div>
            </div>
          )}

          {/* SEKSI KORPS ALUMNI */}
          {showAlumni && (
            <div className="section-member-card">
              <div className="section-card-header header-alumni">
                <div className="sec-title-box">
                  <GraduationCap style={{ width: 18, height: 18 }} />
                  <h4>Korps Alumni PMR SPADAN</h4>
                </div>
                <span className="sec-count-badge badge-alumni">{listAlumni.length} Alumni</span>
              </div>

              <div className="section-cards-wrapper">
                {renderCardList(listAlumni)}
              </div>
            </div>
          )}

          {/* SEKSI NON-AKTIF (ADMIN/PENGURUS ONLY) */}
          {showNonAktif && (
            <div className="section-member-card">
              <div className="section-card-header header-nonaktif">
                <div className="sec-title-box">
                  <ShieldAlert style={{ width: 18, height: 18 }} />
                  <h4>Arsip Anggota Non-Aktif</h4>
                </div>
                <span className="sec-count-badge badge-nonaktif">{listNonAktif.length} Anggota</span>
              </div>

              <div className="section-cards-wrapper">
                {renderCardList(listNonAktif)}
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODAL TAMBAH / EDIT ANGGOTA */}
      {isModalOpen && (
        <div className="app-modal-backdrop active">
          <div className="app-modal-card">
            <div className="app-modal-header">
              <h3>{editingUserId ? `Edit Profil: ${formNamaPanggilan || formNamaLengkap}` : 'Tambah Anggota Baru'}</h3>
              <button
                type="button"
                className="app-modal-close"
                onClick={() => setIsModalOpen(false)}
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveMember} className="modal-form-wrapper">
              <div className="app-modal-body">
                {modalError && (
                  <div style={{ background: '#fee2e2', color: '#b91c1c', padding: '10px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 600 }}>
                    {modalError}
                  </div>
                )}

                <div className="modal-grid-row">
                  <div className="modal-form-group">
                    <label>Nama Lengkap (Otomatis Kapital) *</label>
                    <input
                      type="text"
                      value={formNamaLengkap}
                      onChange={(e) => setFormNamaLengkap(e.target.value)}
                      style={{ textTransform: 'uppercase' }}
                      required
                    />
                  </div>
                  <div className="modal-form-group">
                    <label>Nama Panggilan *</label>
                    <input
                      type="text"
                      value={formNamaPanggilan}
                      onChange={(e) => setFormNamaPanggilan(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="modal-grid-row">
                  <div className="modal-form-group">
                    <label>Jenis Kelamin *</label>
                    <select
                      value={formJenisKelamin}
                      onChange={(e) => setFormJenisKelamin(e.target.value)}
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
                      value={formTanggalLahir}
                      onChange={(e) => setFormTanggalLahir(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="modal-grid-row">
                  <div className="modal-form-group">
                    <label>Kelas *</label>
                    <input
                      type="text"
                      value={formKelas}
                      onChange={(e) => setFormKelas(e.target.value)}
                      placeholder="Contoh: 7A, 8B"
                      required
                    />
                  </div>
                  <div className="modal-form-group">
                    <label>Tahun Bergabung *</label>
                    <input
                      type="number"
                      value={formTahunBergabung}
                      onChange={(e) => setFormTahunBergabung(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="modal-grid-row">
                  <div className="modal-form-group">
                    <label>NISN</label>
                    <input
                      type="text"
                      value={formNisn}
                      onChange={(e) => setFormNisn(e.target.value)}
                      placeholder="NISN"
                    />
                  </div>
                  <div className="modal-form-group">
                    <label>Wewenang Akun</label>
                    <select
                      value={formJabatan}
                      onChange={(e) => setFormJabatan(e.target.value)}
                      disabled={!canManage}
                    >
                      <option value="anggota">Anggota</option>
                      <option value="pengurus">Pengurus</option>
                      {userIsAdmin && <option value="admin">Admin</option>}
                      <option value="non-aktif">Non-Aktif</option>
                    </select>
                  </div>
                </div>

                <div className="modal-grid-row">
                  <div className="modal-form-group">
                    <label>Jabatan / Struktur Organisasi</label>
                    <select
                      value={formKeteranganJabatan}
                      onChange={(e) => setFormKeteranganJabatan(e.target.value)}
                      disabled={!canManage}
                    >
                      <option value="Anggota">Anggota</option>
                      <option value="Ketua">Ketua</option>
                      <option value="Wakil">Wakil</option>
                      <option value="Sekretaris">Sekretaris</option>
                      <option value="Bendahara">Bendahara</option>
                      <option value="Seksi Pertolongan Pertama">Seksi Pertolongan Pertama</option>
                      <option value="Seksi Tandu & Evakuasi">Seksi Tandu & Evakuasi</option>
                      <option value="Seksi UKS">Seksi UKS</option>
                      <option value="Seksi Logistik">Seksi Logistik</option>
                      <option value="Seksi Humas">Seksi Humas</option>
                      <option value="Pembina 1">Pembina 1</option>
                      <option value="Pembina 2">Pembina 2</option>
                      <option value="Pelatih">Pelatih</option>
                      <option value="Kepala Sekolah">Kepala Sekolah</option>
                      <option value="Alumni">Alumni</option>
                      <option value="Non-Aktif">Non-Aktif</option>
                    </select>
                  </div>
                  <div className="modal-form-group">
                    <label>Golongan Darah</label>
                    <select
                      value={formGolonganDarah}
                      onChange={(e) => setFormGolonganDarah(e.target.value)}
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
                    value={formRhesusDarah}
                    onChange={(e) => setFormRhesusDarah(e.target.value)}
                  >
                    <option value="">Lewati</option>
                    <option value="Positif">Positif (+)</option>
                    <option value="Negatif">Negatif (-)</option>
                  </select>
                </div>

                <div className="modal-form-group">
                  <label>Unggah Foto Profil (JPG, PNG, WebP)</label>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        const file = e.target.files[0];
                        const val = validateImageFile(file);
                        if (!val.valid) {
                          alert(val.error);
                          return;
                        }
                        setFormFotoFile(file);
                      }
                    }}
                    style={{ padding: '8px', border: '1px dashed #cbd5e1' }}
                  />
                </div>

                <div className="modal-form-group">
                  <label>Riwayat Penyakit / Alergi</label>
                  <textarea
                    value={formRiwayatPenyakit}
                    onChange={(e) => setFormRiwayatPenyakit(e.target.value)}
                    rows={2}
                    placeholder="Contoh: Asma, alergi dingin..."
                  />
                </div>

                <div className="modal-grid-row">
                  <div className="modal-form-group">
                    <label>No. WA Pribadi</label>
                    <input
                      type="text"
                      value={formWaPribadi}
                      onChange={(e) => setFormWaPribadi(e.target.value)}
                      placeholder="08..."
                    />
                  </div>
                  <div className="modal-form-group">
                    <label>No. WA Orang Tua</label>
                    <input
                      type="text"
                      value={formWaOrtu}
                      onChange={(e) => setFormWaOrtu(e.target.value)}
                      placeholder="08..."
                    />
                  </div>
                </div>

                {/* Only shown when ADDING a member */}
                {!editingUserId && (
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
                      <label>Email Akun Anggota *</label>
                      <input
                        type="email"
                        value={formEmail}
                        onChange={(e) => setFormEmail(e.target.value)}
                        placeholder="nama@email.com"
                        required
                        autoComplete="email"
                      />
                    </div>
                    <div className="modal-form-group">
                      <label>Kata Sandi Awal *</label>
                      <input
                        type="password"
                        value={formPassword}
                        onChange={(e) => setFormPassword(e.target.value)}
                        placeholder="Minimal 6 karakter"
                        minLength={6}
                        required
                        autoComplete="new-password"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="app-modal-footer">
                <button
                  type="button"
                  className="btn-modal-cancel"
                  onClick={() => setIsModalOpen(false)}
                  disabled={modalSubmitting}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="btn-modal-submit"
                  disabled={modalSubmitting}
                >
                  {modalSubmitting ? 'Menyimpan...' : 'Simpan Data'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL VERIFIKASI KEAMANAN HAPUS ANGGOTA (DENGAN PASSWORD ADMIN) */}
      {isDeleteModalOpen && memberToDelete && (
        <div className="app-modal-backdrop" onClick={handleCloseDeleteModal}>
          <div
            className="delete-confirm-modal-card"
            onClick={(e) => e.stopPropagation()}
          >
            {/* HEADER */}
            <div className="delete-modal-header">
              <div className="delete-modal-header-title">
                <div className="delete-modal-warning-icon">
                  <ShieldAlert style={{ width: 22, height: 22, color: '#ffffff' }} />
                </div>
                <div>
                  <h3>Konfirmasi Hapus Akun</h3>
                  <p>Verifikasi kata sandi admin diperlukan</p>
                </div>
              </div>
              <button
                type="button"
                className="app-modal-close"
                onClick={handleCloseDeleteModal}
                disabled={deleteLoading}
                aria-label="Tutup"
              >
                <X style={{ width: 20, height: 20 }} />
              </button>
            </div>

            {/* FORM BODY */}
            <form onSubmit={handleConfirmDeleteMember}>
              <div className="delete-modal-body">
                {/* TARGET ANGGOTA PREVIEW */}
                <div className="delete-target-preview">
                  <div className="delete-target-avatar">
                    {memberToDelete.foto_profil_url ? (
                      <img src={memberToDelete.foto_profil_url} alt={memberToDelete.nama_lengkap} />
                    ) : (
                      <UserIcon style={{ width: 26, height: 26, color: '#94a3b8' }} />
                    )}
                  </div>
                  <div className="delete-target-meta">
                    <div className="delete-target-name">{memberToDelete.nama_lengkap}</div>
                    <div className="delete-target-sub">
                      <span className="delete-target-role-badge">
                        {memberToDelete.keterangan_jabatan || memberToDelete.jabatan || 'Anggota'}
                      </span>
                      {memberToDelete.kelas && <span>Kelas {memberToDelete.kelas}</span>}
                      {memberToDelete.nisn && <span className="delete-target-nisn">NISN: {memberToDelete.nisn}</span>}
                    </div>
                  </div>
                </div>

                {/* WARNING NOTICE */}
                <div className="delete-warning-banner">
                  <AlertTriangle style={{ width: 18, height: 18, flexShrink: 0, marginTop: 1 }} />
                  <span>
                    <strong>Peringatan:</strong> Akun ini akan dihapus secara permanen beserta data identitasnya dari sistem. Tindakan ini tidak dapat dibatalkan.
                  </span>
                </div>

                {/* PASSWORD VERIFICATION INPUT */}
                <div className="delete-pwd-group">
                  <label className="delete-pwd-label">
                    Masukkan Kata Sandi Akun Anda ({user?.email || profile?.nama_lengkap}):
                  </label>
                  <span className="delete-pwd-desc">
                    Ketik kata sandi akun login Anda untuk mengonfirmasi bahwa Anda berhak menghapus akun ini.
                  </span>
                  <div className="delete-pwd-input-wrap">
                    <input
                      type={showAdminPassword ? 'text' : 'password'}
                      className="delete-pwd-input"
                      placeholder="Masukkan kata sandi akun Anda..."
                      value={adminPasswordInput}
                      onChange={(e) => {
                        setAdminPasswordInput(e.target.value);
                        if (deleteError) setDeleteError(null);
                      }}
                      disabled={deleteLoading}
                      autoFocus
                      required
                    />
                    <button
                      type="button"
                      className="btn-toggle-pwd-visibility"
                      onClick={() => setShowAdminPassword(!showAdminPassword)}
                      tabIndex={-1}
                      title={showAdminPassword ? 'Sembunyikan sandi' : 'Tampilkan sandi'}
                    >
                      {showAdminPassword ? (
                        <EyeOff style={{ width: 17, height: 17 }} />
                      ) : (
                        <Eye style={{ width: 17, height: 17 }} />
                      )}
                    </button>
                  </div>
                </div>

                {/* ERROR & SUCCESS MESSAGES */}
                {deleteError && (
                  <div className="delete-modal-error">
                    <AlertTriangle style={{ width: 15, height: 15, flexShrink: 0 }} />
                    <span>{deleteError}</span>
                  </div>
                )}

                {deleteSuccess && (
                  <div className="delete-modal-success">
                    <CheckCircle2 style={{ width: 15, height: 15, flexShrink: 0 }} />
                    <span>{deleteSuccess}</span>
                  </div>
                )}
              </div>

              {/* FOOTER ACTIONS */}
              <div className="delete-modal-footer">
                <button
                  type="button"
                  className="btn-delete-cancel"
                  onClick={handleCloseDeleteModal}
                  disabled={deleteLoading}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="btn-delete-confirm"
                  disabled={deleteLoading || !adminPasswordInput.trim()}
                >
                  <Trash2 style={{ width: 15, height: 15 }} />
                  <span>{deleteLoading ? 'Memverifikasi...' : 'Verifikasi & Hapus Akun'}</span>
                </button>
              </div>
            </form>
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
