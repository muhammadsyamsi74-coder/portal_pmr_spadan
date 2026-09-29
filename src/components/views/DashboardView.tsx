import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../services/supabase';
import { AgendaKegiatan, MenuKey, UserProfile, UtilitySubModule } from '../../types';
import {
  ShieldAlert,
  LogIn,
  UserPlus,
  Camera,
  Sparkles,
  Archive,
  Calendar as CalendarIcon,
  UsersRound,
  GraduationCap,
  Clock,
  PieChart,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Zap,
  ClipboardSignature,
  IdCard,
  Boxes,
  BriefcaseMedical,
  ShieldCheck,
  Award,
  Crown,
  MapPin,
  ExternalLink,
  Share2,
  Instagram,
  Globe,
  BellRing,
  Bell
} from 'lucide-react';
import { formatTanggalIndo } from '../../utils/security';

interface DashboardViewProps {
  onNavigateMenu: (menu: MenuKey) => void;
  onOpenUtilityModule?: (sub: UtilitySubModule) => void;
}

interface PhotoSlide {
  url: string;
  nama_kegiatan: string;
  tanggal?: string | null;
  tempat?: string;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onNavigateMenu,
  onOpenUtilityModule
}) => {
  const { user, profile, openLoginModal, openRegisterModal } = useAuth();

  // Urgent announcement
  const [urgentAnnouncement, setUrgentAnnouncement] = useState<AgendaKegiatan | null>(null);

  // Slideshow state
  const [photoList, setPhotoList] = useState<PhotoSlide[]>([]);
  const [slideIndex, setSlideIndex] = useState(0);
  const [activeLayer, setActiveLayer] = useState<'front' | 'back'>('front');
  const [frontUrl, setFrontUrl] = useState('');
  const [backUrl, setBackUrl] = useState('');

  // Member statistics
  const [memberCounts, setMemberCounts] = useState({ aktif: 0, alumni: 0, pengajuan: 0 });

  // Presence statistics
  const [presencePeriod, setPresencePeriod] = useState<'semua' | 'bulan' | 'minggu' | 'terakhir'>('semua');
  const [personalRate, setPersonalRate] = useState<string>('--');
  const [personalCount, setPersonalCount] = useState<string>('Mode Tamu');
  const [unitRate, setUnitRate] = useState<string>('0%');
  const [unitCounts, setUnitCounts] = useState({ h: 0, s: 0, i: 0, a: 0 });

  // Mini calendar state
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [allAgendas, setAllAgendas] = useState<AgendaKegiatan[]>([]);
  const [selectedDateStr, setSelectedDateStr] = useState<string | null>(null);

  // Organization structure
  const [adultLeaders, setAdultLeaders] = useState<UserProfile[]>([]);
  const [studentOfficers, setStudentOfficers] = useState<UserProfile[]>([]);

  // 1. Load User Presence (Personal)
  useEffect(() => {
    if (!profile) {
      setPersonalRate('--');
      setPersonalCount('Mode Tamu');
      return;
    }

    const loadPersonal = async () => {
      try {
        const { data: logs } = await supabase
          .from('presensi')
          .select('status_kehadiran')
          .eq('user_id', profile.id);

        let h = 0, s = 0, i = 0, a = 0;
        (logs || []).forEach(log => {
          const st = log.status_kehadiran;
          if (st === 'Hadir') h++;
          else if (st === 'Sakit') s++;
          else if (st === 'Izin') i++;
          else if (st === 'Alpa') a++;
        });

        const totalValid = h + s + i + a;
        const rate = totalValid > 0 ? Math.round((h / totalValid) * 100) : 0;
        setPersonalRate(`${rate}%`);
        setPersonalCount(`${h} Sesi Hadir`);
      } catch {
        setPersonalRate('0%');
        setPersonalCount('0 Sesi Hadir');
      }
    };

    loadPersonal();
  }, [profile]);

  // 2. Load Urgent Announcement
  useEffect(() => {
    if (!profile) {
      setUrgentAnnouncement(null);
      return;
    }

    const jab = (profile.jabatan || '').toLowerCase();
    const ket = (profile.keterangan_jabatan || '').toLowerCase();
    if (ket.includes('alumni') || jab.includes('alumni') || jab === 'non-aktif' || ket === 'non-aktif') {
      setUrgentAnnouncement(null);
      return;
    }

    const loadUrgent = async () => {
      try {
        const { data } = await supabase
          .from('agenda_kegiatan')
          .select('*')
          .eq('tampilkan_di_dashboard', true)
          .order('tanggal_mulai', { ascending: true });

        if (!data || data.length === 0) {
          setUrgentAnnouncement(null);
          return;
        }

        const now = new Date();
        const active = (data as AgendaKegiatan[]).filter(item => {
          if (!item.tanggal_mulai) return false;
          const startDate = new Date(item.tanggal_mulai + 'T00:00:00');
          const showFrom = new Date(startDate.getTime() - 24 * 60 * 60 * 1000);
          const endRef = item.tanggal_selesai || item.tanggal_mulai;
          const endDate = new Date(endRef + 'T00:00:00');
          const hideAfter = new Date(endDate.getTime() + 36 * 60 * 60 * 1000);
          return now >= showFrom && now <= hideAfter;
        });

        setUrgentAnnouncement(active.length > 0 ? active[0] : null);
      } catch {
        setUrgentAnnouncement(null);
      }
    };

    loadUrgent();
  }, [profile]);

  // 3. Load Member Counts
  useEffect(() => {
    supabase
      .from('users_profile')
      .select('jabatan, keterangan_jabatan')
      .then(({ data }) => {
        let aktif = 0;
        let alumni = 0;
        let pengajuan = 0;

        (data || []).forEach(u => {
          const jab = (u.jabatan || '').toLowerCase();
          const ket = u.keterangan_jabatan || '';
          if (jab === 'non-aktif' || ket === 'Non-Aktif') {
            pengajuan++;
          } else if (ket === 'Alumni') {
            alumni++;
          } else {
            aktif++;
          }
        });

        setMemberCounts({ aktif, alumni, pengajuan });
      });
  }, []);

  // 4. Load Unit Presence based on Period
  useEffect(() => {
    let query = supabase.from('presensi').select('status_kehadiran, tanggal_kegiatan');
    const now = new Date();

    if (presencePeriod === 'bulan') {
      const y = now.getFullYear();
      const m = String(now.getMonth() + 1).padStart(2, '0');
      query = query.gte('tanggal_kegiatan', `${y}-${m}-01`);
    } else if (presencePeriod === 'minggu') {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(now.getDate() - 7);
      const startWeek = sevenDaysAgo.toISOString().split('T')[0];
      query = query.gte('tanggal_kegiatan', startWeek);
    } else if (presencePeriod === 'terakhir') {
      supabase
        .from('presensi')
        .select('tanggal_kegiatan')
        .order('tanggal_kegiatan', { ascending: false })
        .limit(1)
        .maybeSingle()
        .then(({ data: latestRow }) => {
          if (latestRow && latestRow.tanggal_kegiatan) {
            supabase
              .from('presensi')
              .select('status_kehadiran')
              .eq('tanggal_kegiatan', latestRow.tanggal_kegiatan)
              .then(({ data: rows }) => calculateUnitRate(rows || []));
          }
        });
      return;
    }

    query.then(({ data: rows }) => {
      calculateUnitRate(rows || []);
    });

    function calculateUnitRate(rows: any[]) {
      let h = 0, s = 0, i = 0, a = 0;
      rows.forEach(r => {
        const st = r.status_kehadiran;
        if (st === 'Hadir') h++;
        else if (st === 'Sakit') s++;
        else if (st === 'Izin') i++;
        else if (st === 'Alpa') a++;
      });
      const total = h + s + i + a;
      const rate = total > 0 ? Math.round((h / total) * 100) : 0;
      setUnitRate(`${rate}%`);
      setUnitCounts({ h, s, i, a });
    }
  }, [presencePeriod]);

  // 5. Load Agendas
  useEffect(() => {
    supabase
      .from('agenda_kegiatan')
      .select('*')
      .order('tanggal_mulai', { ascending: true })
      .then(({ data }) => {
        setAllAgendas((data as AgendaKegiatan[]) || []);
      });
  }, []);

  // 6. Load Slideshow Photos
  useEffect(() => {
    const fetchPhotos = async () => {
      const rawList: PhotoSlide[] = [];
      try {
        const { data: presensiData } = await supabase
          .from('presensi')
          .select('nama_kegiatan, tempat_kegiatan, tanggal_kegiatan, foto_dokumentasi_url')
          .not('foto_dokumentasi_url', 'is', null)
          .neq('foto_dokumentasi_url', '')
          .order('created_at', { ascending: false })
          .limit(30);

        (presensiData || []).forEach(item => {
          if (item.foto_dokumentasi_url) {
            let urls: string[] = [];
            try {
              const parsed = JSON.parse(item.foto_dokumentasi_url);
              urls = Array.isArray(parsed) ? parsed : [item.foto_dokumentasi_url];
            } catch {
              urls = [item.foto_dokumentasi_url];
            }
            urls.forEach(u => {
              if (u && u.startsWith('http')) {
                rawList.push({
                  url: u,
                  nama_kegiatan: item.nama_kegiatan || 'Kegiatan PMR SPADAN',
                  tanggal: item.tanggal_kegiatan || null,
                  tempat: item.tempat_kegiatan || 'SMPN 8 Balikpapan'
                });
              }
            });
          }
        });
      } catch (e) {
        console.warn('Presensi photo fetch fallback:', e);
      }

      if (rawList.length < 5) {
        try {
          const { data: storageFiles } = await supabase.storage
            .from('dokumentasi_kegiatan')
            .list('', { limit: 30 });

          (storageFiles || []).forEach(file => {
            if (file.name && file.name.match(/\.(jpg|jpeg|png|webp)$/i)) {
              const { data: pubData } = supabase.storage
                .from('dokumentasi_kegiatan')
                .getPublicUrl(file.name);
              if (pubData?.publicUrl) {
                rawList.push({
                  url: pubData.publicUrl,
                  nama_kegiatan: file.name.replace(/[_-]/g, ' ').replace(/\.[^/.]+$/, ''),
                  tanggal: null,
                  tempat: 'SMPN 8 Balikpapan'
                });
              }
            }
          });
        } catch (e) {
          console.warn('Storage files fallback error:', e);
        }
      }

      if (rawList.length > 0) {
        const shuffled = [...rawList].sort(() => Math.random() - 0.5);
        setPhotoList(shuffled);
        setFrontUrl(shuffled[0].url);
      }
    };

    fetchPhotos();
  }, []);

  // Slideshow interval timer
  useEffect(() => {
    if (photoList.length <= 1) return;

    const timer = setInterval(() => {
      setSlideIndex(prev => {
        const nextIndex = (prev + 1) % photoList.length;
        const nextItem = photoList[nextIndex];

        if (activeLayer === 'front') {
          setBackUrl(nextItem.url);
          setActiveLayer('back');
        } else {
          setFrontUrl(nextItem.url);
          setActiveLayer('front');
        }
        return nextIndex;
      });
    }, 4500);

    return () => clearInterval(timer);
  }, [photoList, activeLayer]);

  // 7. Load Organization Structure
  useEffect(() => {
    supabase
      .from('users_profile')
      .select('nama_lengkap, nama_panggilan, keterangan_jabatan, jabatan, foto_profil_url, kelas')
      .neq('jabatan', 'non-aktif')
      .neq('keterangan_jabatan', 'Non-Aktif')
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        const adultRoles = ['Kepala Sekolah', 'Pembina 1', 'Pembina 2', 'Pelatih'];
        const officerRoles = ['Ketua', 'Wakil', 'Sekretaris', 'Bendahara', 'Seksi'];

        const adults: UserProfile[] = [];
        const officers: UserProfile[] = [];

        (data || []).forEach(m => {
          const role = m.keterangan_jabatan || '';
          if (adultRoles.some(r => role.includes(r))) {
            adults.push(m as UserProfile);
          } else if (officerRoles.some(r => role.includes(r)) || m.jabatan === 'pengurus') {
            officers.push(m as UserProfile);
          }
        });

        adults.sort((a, b) => {
          const idxA = adultRoles.findIndex(r => (a.keterangan_jabatan || '').includes(r));
          const idxB = adultRoles.findIndex(r => (b.keterangan_jabatan || '').includes(r));
          return idxA - idxB;
        });

        officers.sort((a, b) => {
          const idxA = officerRoles.findIndex(r => (a.keterangan_jabatan || '').includes(r));
          const idxB = officerRoles.findIndex(r => (b.keterangan_jabatan || '').includes(r));
          return idxA - idxB;
        });

        setAdultLeaders(adults);
        setStudentOfficers(officers);
      });
  }, []);

  // Calendar calculations
  const year = calendarDate.getFullYear();
  const month = calendarDate.getMonth();
  const namaBulan = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  const namaBulanSingkat = ['JAN', 'FEB', 'MAR', 'APR', 'MEI', 'JUN', 'JUL', 'AGU', 'SEP', 'OKT', 'NOV', 'DES'];

  const firstDayIndex = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();

  // Event set for current displayed month
  const eventDays = new Set<number>();
  allAgendas.forEach(ag => {
    if (ag.tanggal_mulai) {
      const [tY, tM, tD] = ag.tanggal_mulai.split('-').map(Number);
      if (tY === year && tM - 1 === month) {
        eventDays.add(tD);
      }
    }
  });

  // Next month events calculation
  const nextMonthDate = new Date(year, month + 1, 1);
  const nextYear = nextMonthDate.getFullYear();
  const nextMonth = nextMonthDate.getMonth();
  let nextMonthEventCount = 0;
  allAgendas.forEach(ag => {
    if (ag.tanggal_mulai) {
      const [tY, tM] = ag.tanggal_mulai.split('-').map(Number);
      if (tY === nextYear && tM - 1 === nextMonth) {
        nextMonthEventCount++;
      }
    }
  });

  const changeMonth = (delta: number) => {
    setCalendarDate(new Date(year, month + delta, 1));
  };

  const handleSelectDay = (dateStr: string) => {
    setSelectedDateStr(dateStr);
  };

  const todayStr = new Date().toISOString().split('T')[0];
  const displayedAgendas = selectedDateStr
    ? allAgendas.filter(a => a.tanggal_mulai === selectedDateStr)
    : allAgendas.filter(a => (a.tanggal_mulai >= todayStr || (a.tanggal_selesai && a.tanggal_selesai >= todayStr))).slice(0, 3);

  const currentSlide = photoList[slideIndex];

  return (
    <div className="dashboard-container">
      {/* 1A. GUEST BANNER (HERO SEBELUM LOGIN) */}
      {!user && (
        <div className="dash-guest-card">
          <div className="guest-left">
            <div className="guest-brand-row">
              <div className="guest-logos-mini">
                <img
                  src="https://ndahxwqshyukqpnjkniw.supabase.co/storage/v1/object/public/profil-anggota/LOGO%20PMI%20untuk%20aplikasi.png"
                  alt="Logo PMI"
                  className="guest-logo-item"
                />
                <img
                  src="https://ndahxwqshyukqpnjkniw.supabase.co/storage/v1/object/public/utilitas_ikon/LOGO%20SMP%20NEGERI%208%20BALIKPAPAN%20-%20untuk%20website.png"
                  alt="Logo SMPN 8 Balikpapan"
                  className="guest-logo-item"
                />
              </div>
              <div className="guest-badge-pill">
                <span className="guest-live-dot" />
                <span>Portal Resmi PMR SPADAN</span>
              </div>
            </div>
            <h2>Bergabung Bersama Relawan Muda</h2>
            <p className="guest-desc">
              Masuk ke akun Anda untuk mencatat presensi tugas, mengecek kartu anggota resmi, dan melihat jadwal kegiatan internal.
            </p>
            <div className="guest-features-row">
              <span className="guest-feat-chip">📋 Presensi Digital</span>
              <span className="guest-feat-chip">💳 KTA Resmi</span>
              <span className="guest-feat-chip">📅 Agenda PMR</span>
            </div>
          </div>
          <div className="guest-right">
            <button
              type="button"
              className="btn-guest-action btn-guest-login"
              onClick={openLoginModal}
            >
              <LogIn style={{ width: 16, height: 16 }} />
              <span>Masuk Akun</span>
            </button>
            <button
              type="button"
              className="btn-guest-action btn-guest-reg"
              onClick={openRegisterModal}
            >
              <UserPlus style={{ width: 16, height: 16 }} />
              <span>Daftar Relawan</span>
            </button>
          </div>
        </div>
      )}

      {/* 1B. HERO BANNER (LOGGED IN) */}
      {user && profile && (() => {
        const isAlumni = (profile.keterangan_jabatan || '').toLowerCase().includes('alumni') || 
                         (profile.jabatan || '').toLowerCase().includes('alumni');
        const greetingText = isAlumni ? 'Halo Alumni PMR SPADAN,' : 'Halo Relawan Muda PMR SPADAN,';

        return (
          <div className="dash-hero-card">
            <div className="hero-left">
              <div className="hero-avatar">
                {profile.foto_profil_url ? (
                  <img
                    src={profile.foto_profil_url}
                    alt={profile.nama_lengkap}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top center' }}
                  />
                ) : (
                  (profile.nama_panggilan || profile.nama_lengkap || '?').charAt(0).toUpperCase()
                )}
              </div>
              <div className="hero-text">
                <div className="greeting">
                  <Sparkles style={{ width: 13, height: 13, color: '#fbcfe8' }} />
                  <span>{greetingText}</span>
                </div>
                <h2>{profile.nama_lengkap}</h2>
                <div className="badge-role-hero">
                  <ShieldCheck style={{ width: 12, height: 12 }} />
                  <span>{(profile.jabatan || 'Anggota').toUpperCase()}</span>
                  {profile.keterangan_jabatan ? <span>• {profile.keterangan_jabatan}</span> : null}
                  {profile.kelas ? <span>• Kelas {profile.kelas}</span> : null}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* URGENT ANNOUNCEMENT (H-1 to +36h) */}
      {urgentAnnouncement && (
        <div className="urgent-box">
          <div className="police-line-bar">
            <div className="police-line-text">PENGUMUMAN PENTING</div>
          </div>
          <div className="urgent-body">
            <div className="urgent-icon-bell">
              <BellRing style={{ width: 20, height: 20 }} />
            </div>
            <div className="urgent-content">
              <div className="urgent-title">{urgentAnnouncement.judul}</div>
              {urgentAnnouncement.keterangan && (
                <div className="urgent-keterangan">{urgentAnnouncement.keterangan}</div>
              )}
              <div className="urgent-meta">
                <span>
                  <CalendarIcon style={{ width: 12, height: 12 }} />{' '}
                  {formatTanggalIndo(urgentAnnouncement.tanggal_mulai, false)}
                </span>
                <span>
                  <Clock style={{ width: 12, height: 12 }} />{' '}
                  {urgentAnnouncement.waktu_kegiatan || 'Menyesuaikan'}
                </span>
                <span>
                  <MapPin style={{ width: 12, height: 12 }} />{' '}
                  {urgentAnnouncement.lokasi || 'SMPN 8 Balikpapan'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. TOP WORKSPACE GRID (PHOTOS & STATS) */}
      <div className="dash-top-workspace-grid">
        {/* KOLOM KIRI: SLIDESHOW FOTO KEGIATAN */}
        {photoList.length > 0 && (
          <div className="dash-card photo-slide-card">
            <div className="dash-card-header">
              <div className="header-title">
                <div className="icon-pulse-wrap">
                  <Camera style={{ width: 16, height: 16 }} />
                </div>
                <div>
                  <h3>Dokumentasi Kegiatan</h3>
                </div>
              </div>
              <span className="badge-auto-slide">
                <span className="live-dot" />
                <Sparkles style={{ width: 12, height: 12 }} /> Slide Aktif
              </span>
            </div>

            <div className="slide-wrapper" id="slide-dokumentasi-box">
              <img
                src={backUrl || frontUrl}
                alt="Dokumentasi PMR"
                className="slide-img"
                style={{
                  zIndex: activeLayer === 'back' ? 2 : 1,
                  opacity: activeLayer === 'back' ? 1 : 0,
                  filter: activeLayer === 'back' ? 'blur(0px)' : 'blur(12px)',
                  transition: 'opacity 0.8s ease, filter 0.8s ease'
                }}
              />
              <img
                src={frontUrl}
                alt="Dokumentasi PMR"
                className="slide-img"
                style={{
                  zIndex: activeLayer === 'front' ? 2 : 1,
                  opacity: activeLayer === 'front' ? 1 : 0,
                  filter: activeLayer === 'front' ? 'blur(0px)' : 'blur(12px)',
                  transition: 'opacity 0.8s ease, filter 0.8s ease'
                }}
              />

              <div className="slide-overlay">
                <div className="slide-tag-arsip">
                  <Archive style={{ width: 12, height: 12 }} /> Arsip Resmi PMR SPADAN
                </div>
                <div className="slide-caption-title">
                  {currentSlide?.nama_kegiatan || 'Latihan PMR SPADAN'}
                </div>
                <div className="slide-caption-meta">
                  <CalendarIcon style={{ width: 11, height: 11 }} />
                  <span>
                    {currentSlide?.tanggal ? formatTanggalIndo(currentSlide.tanggal, false) : ''}
                    {currentSlide?.tempat ? ` • ${currentSlide.tempat}` : ' • SMPN 8 Balikpapan'}
                  </span>
                </div>
              </div>

              <div className="slide-indicators">
                {Array.from({ length: Math.min(photoList.length, 6) }).map((_, idx) => (
                  <div
                    key={idx}
                    className={`slide-dot ${idx === (slideIndex % Math.min(photoList.length, 6)) ? 'active' : ''}`}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* KOLOM KANAN: STATISTIK ANGGOTA & PERSENTASE KEHADIRAN */}
        <div className="dash-right-stack">
          {/* STATISTIK ANGGOTA */}
          <div className="stat-cards-grid">
            <div className="stat-card card-aktif">
              <div className="stat-icon-box box-aktif">
                <UsersRound style={{ width: 20, height: 20 }} />
              </div>
              <div className="stat-details">
                <span className="title">Anggota Aktif</span>
                <h3>{memberCounts.aktif}</h3>
              </div>
            </div>

            <div className="stat-card card-alumni">
              <div className="stat-icon-box box-alumni">
                <GraduationCap style={{ width: 20, height: 20 }} />
              </div>
              <div className="stat-details">
                <span className="title">Korps Alumni</span>
                <h3>{memberCounts.alumni}</h3>
              </div>
            </div>

            <div className="stat-card card-pengajuan">
              <div className="stat-icon-box box-pengajuan">
                <Clock style={{ width: 20, height: 20 }} />
              </div>
              <div className="stat-details">
                <span className="title">Pengajuan Baru</span>
                <h3>{memberCounts.pengajuan}</h3>
              </div>
            </div>
          </div>

          {/* PERSENTASE KEHADIRAN GANDA */}
          <div className="dash-card presence-card-box">
            <div className="dash-card-header">
              <div className="header-title">
                <div className="icon-pulse-wrap theme-presence">
                  <PieChart style={{ width: 16, height: 16 }} />
                </div>
                <div>
                  <h3>Tingkat Kehadiran</h3>
                  <p className="header-sub">Statistik keaktifan pribadi dan unit</p>
                </div>
              </div>
              <select
                className="select-periode"
                value={presencePeriod}
                onChange={(e) => setPresencePeriod(e.target.value as any)}
              >
                <option value="semua">Semua (Total)</option>
                <option value="bulan">Bulan Ini</option>
                <option value="minggu">Minggu Ini</option>
                <option value="terakhir">Kegiatan Terakhir</option>
              </select>
            </div>

            <div className="dash-card-body presence-body-flex">
              <div className="presence-dual-metric-container">
                {/* Lingkaran 1: Kehadiran Pribadi */}
                <div className="metric-circle-item">
                  <div className="metric-circle circle-personal">
                    <span className="circle-val">{personalRate}</span>
                    <span className="circle-sub">Pribadi</span>
                  </div>
                  <span className="metric-circle-caption">{personalCount}</span>
                </div>

                {/* Lingkaran 2: Kehadiran Unit */}
                <div className="metric-circle-item">
                  <div className="metric-circle circle-unit">
                    <span className="circle-val">{unitRate}</span>
                    <span className="circle-sub">Unit PMR</span>
                  </div>
                  <span className="metric-circle-caption">Rerata Keseluruhan</span>
                </div>

                {/* Rincian Status Kehadiran Unit */}
                <div className="metric-breakdown">
                  <div className="break-item">
                    <span className="dot hadir" /> Hadir: <b>{unitCounts.h}</b>
                  </div>
                  <div className="break-item">
                    <span className="dot sakit" /> Sakit: <b>{unitCounts.s}</b>
                  </div>
                  <div className="break-item">
                    <span className="dot izin" /> Izin: <b>{unitCounts.i}</b>
                  </div>
                  <div className="break-item">
                    <span className="dot alfa" /> Alpa: <b>{unitCounts.a}</b>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. KALENDER & PENGINGAT KEGIATAN */}
      <div className="dash-card cal-card-wrapper">
        <div className="dash-card-header">
          <div className="header-title">
            <div className="icon-pulse-wrap theme-cal">
              <CalendarIcon style={{ width: 16, height: 16 }} />
            </div>
            <div>
              <h3>Kalender & Jadwal Kegiatan</h3>
              <p className="header-sub">Agenda latihan rutin, tugas upacara, dan kegiatan sekolah</p>
            </div>
          </div>
          <button
            type="button"
            className="btn-link-action"
            onClick={() => onNavigateMenu('pmr-tools')}
            title="Buka Kalender & Agenda Selengkapnya di Menu Utilitas"
          >
            <span>Buka Penuh</span>
            <ExternalLink style={{ width: 13, height: 13 }} />
          </button>
        </div>

        <div className="cal-main-desktop-split">
          <div className="cal-board-area">
            {/* Navigasi Kalender Mini */}
            <div className="mini-cal-header-bar">
              <button
                type="button"
                className="btn-cal-nav"
                onClick={() => changeMonth(-1)}
                title="Bulan Sebelumnya"
              >
                <ChevronLeft style={{ width: 16, height: 16 }} />
              </button>
              <div className="mini-cal-title-pill">
                <CalendarDays style={{ width: 15, height: 15 }} />
                <span>{namaBulan[month]} {year}</span>
              </div>
              <div style={{ position: 'relative', display: 'inline-flex' }}>
                <button
                  type="button"
                  className="btn-cal-nav"
                  onClick={() => changeMonth(1)}
                  title="Bulan Berikutnya"
                >
                  <ChevronRight style={{ width: 16, height: 16 }} />
                </button>
                {nextMonthEventCount > 0 && (
                  <span className="badge-next-events" title="Kegiatan di bulan berikutnya">
                    {nextMonthEventCount > 99 ? '99+' : nextMonthEventCount}
                  </span>
                )}
              </div>
            </div>

            {/* Hint Agenda Bulan Berikutnya */}
            {nextMonthEventCount > 0 && (
              <div className="cal-next-month-hint">
                <div className="hint-left">
                  <span className="party-popper">🎉</span>
                  <span>
                    Bulan {namaBulan[nextMonth]}: <b>{nextMonthEventCount} kegiatan seru</b> terjadwal
                  </span>
                </div>
                <span className="btn-peek-next" onClick={() => changeMonth(1)}>
                  Lihat &rarr;
                </span>
              </div>
            )}

            {/* Papan Grid Penanggalan */}
            <div className="cal-board">
              <div className="mini-cal-grid-header">
                <span className="sun">Min</span>
                <span>Sen</span>
                <span>Sel</span>
                <span>Rab</span>
                <span>Kam</span>
                <span>Jum</span>
                <span className="sat">Sab</span>
              </div>
              <div className="mini-cal-grid">
                {Array.from({ length: firstDayIndex }).map((_, i) => (
                  <div key={`empty-${i}`} className="cal-day-cell empty" />
                ))}

                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const d = i + 1;
                  const dayOfWeek = (firstDayIndex + d - 1) % 7;
                  const isSunday = dayOfWeek === 0;
                  const isSaturday = dayOfWeek === 6;
                  const isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === d;
                  const hasEvent = eventDays.has(d);
                  const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                  const isSelected = selectedDateStr === dateStr;

                  return (
                    <div
                      key={`day-${d}`}
                      className={`cal-day-cell ${isToday ? 'today' : ''} ${isSunday ? 'is-sun' : ''} ${isSaturday ? 'is-sat' : ''} ${isSelected ? 'selected' : ''}`}
                      onClick={() => handleSelectDay(dateStr)}
                    >
                      <span className="cell-num">{d}</span>
                      {hasEvent && <div className="cal-event-dot" />}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="cal-legend-bar">
              <div className="leg-item"><span className="leg-chip today-chip" /> Hari Ini</div>
              <div className="leg-item"><span className="leg-chip event-chip" /> Ada Agenda</div>
              <div className="leg-item"><span className="leg-chip select-chip" /> Dipilih</div>
            </div>
          </div>

          <div className="cal-agenda-section">
            <div className="cal-agenda-heading-row">
              <span>{selectedDateStr ? `✨ Agenda: ${selectedDateStr.split('-').reverse().join('/')}` : '✨ Agenda Mendatang'}</span>
              <button
                type="button"
                className="btn-reset-cal"
                onClick={() => setSelectedDateStr(null)}
              >
                Reset ke Terdekat
              </button>
            </div>

            <div id="dash-agenda-list">
              {displayedAgendas.length === 0 ? (
                <div className="cal-fun-empty">
                  <span className="cal-empty-icon">🎈</span>
                  <div className="cal-empty-text">
                    <b>Belum Ada Agenda</b>
                    <p>Tidak ada kegiatan {selectedDateStr ? 'pada tanggal ini' : 'terdekat'}. Waktunya istirahat atau latihan mandiri!</p>
                  </div>
                </div>
              ) : (
                displayedAgendas.map(item => {
                  const tgl = new Date(item.tanggal_mulai);
                  const d = tgl.getDate();
                  const m = namaBulanSingkat[tgl.getMonth()] || '-';
                  const waktu = item.waktu_kegiatan ? `• ${item.waktu_kegiatan}` : '';
                  const kat = (item.kategori || '').toLowerCase();
                  const katColor = kat.includes('latihan')
                    ? 'kat-latihan'
                    : kat.includes('upacara')
                    ? 'kat-upacara'
                    : kat.includes('tugas') || kat.includes('piket')
                    ? 'kat-tugas'
                    : 'kat-event';

                  return (
                    <div key={item.id} className="dash-agenda-item">
                      <div className="dash-agenda-date">
                        <div className="d">{d}</div>
                        <div className="m">{m}</div>
                      </div>
                      <div className="dash-agenda-info">
                        <div className="t">{item.judul}</div>
                        <div className="sub">
                          <span className={`agenda-cat-badge ${katColor}`}>{item.kategori || 'Kegiatan'}</span>
                          {waktu && <span className="agenda-waktu-text">{waktu}</span>}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 4. PINTASAN APLIKASI CEPAT */}
      <div className="dash-card quick-card-wrapper">
        <div className="dash-card-header">
          <div className="header-title">
            <div className="icon-pulse-wrap theme-quick">
              <Zap style={{ width: 16, height: 16 }} />
            </div>
            <div>
              <h3>Pintasan Aplikasi Harian</h3>
              <p className="header-sub">Akses instan modul kerja operasional</p>
            </div>
          </div>
        </div>

        <div className="quick-access-grid">
          <div className="quick-app-item item-presensi" onClick={() => onNavigateMenu('presensi')}>
            <div className="icon-wrap color-presensi">
              <ClipboardSignature style={{ width: 20, height: 20 }} />
            </div>
            <span>Presensi</span>
          </div>

          <div
            className="quick-app-item item-kta"
            onClick={() => {
              if (onOpenUtilityModule) onOpenUtilityModule('kta');
              onNavigateMenu('pmr-tools');
            }}
          >
            <div className="icon-wrap color-kta">
              <IdCard style={{ width: 20, height: 20 }} />
            </div>
            <span>Cetak KTA</span>
          </div>

          <div
            className="quick-app-item item-inventaris"
            onClick={() => {
              if (onOpenUtilityModule) onOpenUtilityModule('inventaris');
              onNavigateMenu('pmr-tools');
            }}
          >
            <div className="icon-wrap color-uks">
              <Boxes style={{ width: 20, height: 20 }} />
            </div>
            <span>Inventaris</span>
          </div>

          <div className="quick-app-item item-utility" onClick={() => onNavigateMenu('pmr-tools')}>
            <div className="icon-wrap color-agenda">
              <BriefcaseMedical style={{ width: 20, height: 20 }} />
            </div>
            <span>Utility</span>
          </div>
        </div>
      </div>

      {/* 5. TENTANG PMR SPADAN: STRUKTUR ORGANISASI, GMAPS, MEDIA SOSIAL */}
      <div className="dash-card org-info-card">
        <div className="dash-card-header">
          <div className="header-title">
            <div className="icon-pulse-wrap theme-org">
              <ShieldCheck style={{ width: 16, height: 16 }} />
            </div>
            <div>
              <h3>Tentang PMR SPADAN</h3>
              <p className="header-sub">Struktur kepengurusan, sekretariat markas, dan saluran resmi</p>
            </div>
          </div>
          <span className="badge-unit-spadan">Unit Madya SPADAN</span>
        </div>

        {/* SATU KESATUAN (Tanpa Tab): Desktop 2 Kolom, HP 1 Kolom Berjejer ke Bawah */}
        <div className="org-main-grid">
          {/* Kolom Kiri: Hirarki Struktur Organisasi */}
          <div className="org-hierarchy-panel">
            {/* Pembina & Pelatih Satuan */}
            <div className="org-tier-block">
              <div className="org-tier-title">
                <Award style={{ width: 15, height: 15, color: '#2563eb' }} />
                <span>Pembina & Pelatih Satuan</span>
                <span className="org-tier-count">{adultLeaders.length}</span>
              </div>
              <div className="org-person-grid">
                {adultLeaders.length === 0 ? (
                  <div className="org-empty-placeholder">Belum ada profil Pembina & Pelatih yang disetel.</div>
                ) : (
                  adultLeaders.map((p, idx) => (
                    <div key={idx} className="org-person-card">
                      <div className="org-person-avatar">
                        {p.foto_profil_url ? (
                          <img src={p.foto_profil_url} alt={p.nama_lengkap} />
                        ) : (
                          (p.nama_panggilan || p.nama_lengkap || '?').charAt(0).toUpperCase()
                        )}
                      </div>
                      <div className="org-person-info">
                        <div className="org-person-name" title={p.nama_lengkap}>{p.nama_lengkap}</div>
                        <div className="org-role-row">
                          <span className="org-role-badge role-dewasa">{p.keterangan_jabatan || 'Pembina'}</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Pengurus Inti & Seksi Bidang Siswa */}
            <div className="org-tier-block" style={{ marginTop: 16 }}>
              <div className="org-tier-title">
                <Crown style={{ width: 15, height: 15, color: '#d97706' }} />
                <span>Pengurus Inti & Seksi Bidang Siswa</span>
                <span className="org-tier-count">{studentOfficers.length}</span>
              </div>
              <div className="org-person-grid">
                {studentOfficers.length === 0 ? (
                  <div className="org-empty-placeholder">Belum ada profil Pengurus Inti siswa yang disetel.</div>
                ) : (
                  studentOfficers.map((p, idx) => {
                    const ket = (p.keterangan_jabatan || '').toLowerCase();
                    const isKetua = ket.includes('ketua') || ket.includes('wakil');
                    const isSeksi = ket.includes('seksi');
                    const roleClass = isKetua ? 'role-ketua' : isSeksi ? 'role-seksi' : 'role-inti';

                    return (
                      <div key={idx} className="org-person-card">
                        <div className="org-person-avatar">
                          {p.foto_profil_url ? (
                            <img src={p.foto_profil_url} alt={p.nama_lengkap} />
                          ) : (
                            (p.nama_panggilan || p.nama_lengkap || '?').charAt(0).toUpperCase()
                          )}
                        </div>
                        <div className="org-person-info">
                          <div className="org-person-name" title={p.nama_lengkap}>{p.nama_lengkap}</div>
                          <div className="org-role-row">
                            <span className={`org-role-badge ${roleClass}`}>
                              {p.keterangan_jabatan || 'Pengurus'}
                            </span>
                            {p.kelas && (
                              <span className="org-class-tag">{p.kelas}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Kolom Kanan: Peta Google Maps & Hub Media Sosial */}
          <div className="org-meta-panel">
            <div className="hq-map-card">
              <div className="hq-header">
                <div className="hq-icon">
                  <MapPin style={{ width: 18, height: 18 }} />
                </div>
                <div className="hq-title-box">
                  <h4>Sekretariat PMR SPADAN</h4>
                  <p>SMP Negeri 8 Balikpapan</p>
                </div>
              </div>

              <div className="hq-address-tag">
                <MapPin style={{ width: 14, height: 14, color: '#be123c', flexShrink: 0, marginTop: 1 }} />
                <span>Jl. Mulawarman No.14, RT.54, Kelurahan Manggar, Kecamatan Balikpapan Timur, Kota Balikpapan, Kalimantan Timur 76117</span>
              </div>

              <div className="gmaps-preview-wrapper">
                <iframe
                  className="gmaps-iframe"
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3988.907866902596!2d116.95856687496564!3d-1.2240472987642765!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x2df145129a18652d%3A0x3c5b9ea0625d0275!2sSMP%20Negeri%208%20Balikpapan!5e0!3m2!1sid!2sid!4v1790591810277!5m2!1sid!2sid"
                  loading="lazy"
                  allowFullScreen
                  referrerPolicy="no-referrer-when-downgrade"
                  title="Peta Lokasi SMP Negeri 8 Balikpapan"
                />
              </div>

              <p className="hq-desc">
                Pusat posko siaga pertama, ruang UKS terpadu, dan koordinasi operasional relawan Palang Merah Remaja Unit SMP Negeri 8 Balikpapan.
              </p>

              <a
                href="https://www.google.com/maps/place/SMP+Negeri+8+Balikpapan/@-1.2240473,116.9585669,17z/data=!3m1!4b1!4m6!3m5!1s0x2df145129a18652d:0x3c5b9ea0625d0275!8m2!3d-1.2240473!4d116.9611418"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-gmaps-link"
              >
                <MapPin style={{ width: 14, height: 14 }} />
                <span>Buka Rute di Google Maps</span>
                <ExternalLink style={{ width: 12, height: 12 }} />
              </a>
            </div>

            <div className="social-hub-card">
              <div className="social-hub-title">
                <Share2 style={{ width: 16, height: 16, color: '#be123c' }} />
                <span>Media Sosial & Saluran Resmi</span>
              </div>
              <div className="social-links-grid">
                <a
                  href="https://www.instagram.com/spadanredcross/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="social-btn instagram-btn"
                >
                  <div className="social-icon-box ig-gradient">
                    <Instagram style={{ width: 17, height: 17 }} />
                  </div>
                  <div className="social-btn-text">
                    <span className="social-name">Instagram PMR SPADAN</span>
                    <span className="social-handle">@spadanredcross</span>
                  </div>
                  <ExternalLink style={{ width: 14, height: 14 }} className="social-arrow" />
                </a>

                <a
                  href="https://www.instagram.com/smpnegeri8balikpapan/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="social-btn school-ig-btn"
                >
                  <div className="social-icon-box ig-gradient-school">
                    <Instagram style={{ width: 17, height: 17 }} />
                  </div>
                  <div className="social-btn-text">
                    <span className="social-name">Instagram SMPN 8 Balikpapan</span>
                    <span className="social-handle">@smpnegeri8balikpapan</span>
                  </div>
                  <ExternalLink style={{ width: 14, height: 14 }} className="social-arrow" />
                </a>

                <a
                  href="https://smpn8balikpapan.sch.id"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="social-btn web-btn"
                >
                  <div className="social-icon-box web-gradient">
                    <Globe style={{ width: 17, height: 17 }} />
                  </div>
                  <div className="social-btn-text">
                    <span className="social-name">Portal Resmi SMPN 8 Balikpapan</span>
                    <span className="social-handle">smpn8balikpapan.sch.id</span>
                  </div>
                  <ExternalLink style={{ width: 14, height: 14 }} className="social-arrow" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
