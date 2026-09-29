import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { supabase } from '../../../services/supabase';
import { PresensiRecord, UserProfile } from '../../../types';
import {
  Calendar,
  DownloadCloud,
  BookOpen,
  FileText,
  Users,
  CheckSquare,
  Image as ImageIcon,
  Printer,
  ShieldAlert,
  CheckCircle2,
  SlidersHorizontal,
  FileSpreadsheet
} from 'lucide-react';
import { canAccessReporting } from '../../../utils/security';

interface KegiatanUnik {
  tanggal: string;
  judul: string;
  jenis: string;
  tempat: string;
  deskripsi: string;
  fotos: string[];
}

export const PelaporanModule: React.FC = () => {
  const { profile } = useAuth();

  const now = new Date();
  const [selectedBulan, setSelectedBulan] = useState(String(now.getMonth() + 1).padStart(2, '0'));
  const [selectedTahun, setSelectedTahun] = useState(now.getFullYear().toString());
  const [selectedJenis, setSelectedJenis] = useState('Semua Kegiatan');

  const [loading, setLoading] = useState(false);
  const [usersList, setUsersList] = useState<UserProfile[]>([]);
  const [presensiList, setPresensiList] = useState<PresensiRecord[]>([]);
  const [kegiatanList, setKegiatanList] = useState<KegiatanUnik[]>([]);
  const [dataFeedback, setDataFeedback] = useState<string | null>(null);

  // Active panel tab
  const [activePanel, setActivePanel] = useState<'panel-cover' | 'panel-laporan' | 'panel-absen' | 'panel-jurnal' | 'panel-dokumentasi'>('panel-cover');

  // Preview zoom scale (default 100% on desktop, or scaled)
  const [previewZoom, setPreviewZoom] = useState<number>(1);
  const [showConfig, setShowConfig] = useState<boolean>(true);

  // Cover settings
  const [covB1, setCovB1] = useState('LAPORAN EKSTRAKURIKULER PMR');
  const [covB2, setCovB2] = useState('SMP NEGERI 8 BALIKPAPAN');
  const [covB3, setCovB3] = useState('');
  const [covB4, setCovB4] = useState('Dibuat oleh:');
  const [covNamaUserId, setCovNamaUserId] = useState('');
  const [covJabatan, setCovJabatan] = useState('Pelatih PMR');
  const [covTa, setCovTa] = useState('');

  // Laporan Harian signatories
  const [ttdLapKiri, setTtdLapKiri] = useState(''); // Pembina 1
  const [ttdLapKanan, setTtdLapKanan] = useState(''); // Pelatih
  const [ttdLapTengah, setTtdLapTengah] = useState(''); // Kepala Sekolah

  // Absen settings & signatories
  const [ttdAbsPelKiri, setTtdAbsPelKiri] = useState('');
  const [ttdAbsPelKanan, setTtdAbsPelKanan] = useState('');
  const [ttdAbsSisKiri, setTtdAbsSisKiri] = useState('');
  const [ttdAbsSisTengah, setTtdAbsSisTengah] = useState('');
  const [ttdAbsSisKanan, setTtdAbsSisKanan] = useState('');
  const [absenMinKolom, setAbsenMinKolom] = useState(10);
  const [absenMode, setAbsenMode] = useState<'normal' | 'paraf'>('normal');

  // Jurnal signatory
  const [ttdJurnalKanan, setTtdJurnalKanan] = useState('');

  const namaBulanMap: Record<string, string> = {
    '01': 'Januari', '02': 'Februari', '03': 'Maret', '04': 'April',
    '05': 'Mei', '06': 'Juni', '07': 'Juli', '08': 'Agustus',
    '09': 'September', '10': 'Oktober', '11': 'November', '12': 'Desember'
  };

  const hasAccess = canAccessReporting(profile);

  const fetchUsers = async () => {
    try {
      const { data } = await supabase
        .from('users_profile')
        .select('id, nama_lengkap, kelas, jabatan, keterangan_jabatan')
        .order('nama_lengkap', { ascending: true });

      if (data) {
        const uList = data as UserProfile[];
        setUsersList(uList);

        // Auto Select Signatories based on role keyword
        const kepsek = uList.find(u => (u.keterangan_jabatan || '').toLowerCase().includes('kepala sekolah'));
        const pembina = uList.find(u => (u.keterangan_jabatan || '').toLowerCase().includes('pembina 1') || (u.keterangan_jabatan || '').toLowerCase().includes('pembina'));
        const pelatih = uList.find(u => (u.keterangan_jabatan || '').toLowerCase().includes('pelatih'));

        if (kepsek) {
          setTtdLapTengah(kepsek.id);
          setTtdAbsPelKanan(kepsek.id);
          setTtdAbsSisKanan(kepsek.id);
        }
        if (pembina) {
          setTtdLapKiri(pembina.id);
          setTtdAbsPelKiri(pembina.id);
          setTtdAbsSisKiri(pembina.id);
        }
        if (pelatih) {
          setCovNamaUserId(pelatih.id);
          setTtdLapKanan(pelatih.id);
          setTtdAbsSisTengah(pelatih.id);
          setTtdJurnalKanan(pelatih.id);
        }
      }
    } catch (e) {
      console.warn('Error fetching signatories:', e);
    }
  };

  const handleTarikData = async () => {
    setLoading(true);
    setDataFeedback(null);

    const bulan = selectedBulan;
    const tahun = selectedTahun;
    const namaBulan = namaBulanMap[bulan] || 'Bulan';
    const startDate = `${tahun}-${bulan}-01`;
    const lastDay = new Date(parseInt(tahun, 10), parseInt(bulan, 10), 0).getDate();
    const endDate = `${tahun}-${bulan}-${String(lastDay).padStart(2, '0')}`;

    try {
      let presensiQuery = supabase
        .from('presensi')
        .select('*')
        .gte('tanggal_kegiatan', startDate)
        .lte('tanggal_kegiatan', endDate)
        .order('tanggal_kegiatan', { ascending: true });

      if (selectedJenis !== 'Semua Kegiatan') {
        presensiQuery = presensiQuery.eq('jenis_kegiatan', selectedJenis);
      }

      const { data: presensi, error: errPresensi } = await presensiQuery;
      if (errPresensi) throw errPresensi;

      const pList = (presensi as PresensiRecord[]) || [];
      setPresensiList(pList);

      // Ekstrak kegiatan unik
      const mapKegiatan = new Map<string, KegiatanUnik>();
      pList.forEach(p => {
        const key = `${p.tanggal_kegiatan}_${p.nama_kegiatan}`;
        let parsedFotos: string[] = [];
        if (p.foto_dokumentasi_url) {
          try {
            const decoded = JSON.parse(p.foto_dokumentasi_url);
            if (Array.isArray(decoded)) {
              parsedFotos = decoded;
            } else if (typeof decoded === 'string' && decoded.trim() !== '') {
              parsedFotos = [decoded];
            }
          } catch {
            if (p.foto_dokumentasi_url.trim() !== '') {
              parsedFotos = [p.foto_dokumentasi_url];
            }
          }
        }

        if (!mapKegiatan.has(key)) {
          mapKegiatan.set(key, {
            tanggal: p.tanggal_kegiatan,
            judul: p.nama_kegiatan,
            jenis: p.jenis_kegiatan,
            tempat: p.tempat_kegiatan,
            deskripsi: p.deskripsi_kegiatan || 'Latihan Rutin PMR',
            fotos: parsedFotos
          });
        } else {
          const existing = mapKegiatan.get(key)!;
          parsedFotos.forEach(url => {
            if (!existing.fotos.includes(url)) existing.fotos.push(url);
          });
        }
      });

      const uniqueList = Array.from(mapKegiatan.values());
      setKegiatanList(uniqueList);

      const thnInt = parseInt(tahun, 10);
      const blnInt = parseInt(bulan, 10);
      const ta = blnInt >= 7 ? `${thnInt}/${thnInt + 1}` : `${thnInt - 1}/${thnInt}`;

      setCovB3(`BULAN: ${namaBulan.toUpperCase()} ${tahun}`);
      setCovTa(`TAHUN AJARAN ${ta}`);

      setDataFeedback(`Berhasil memuat ${uniqueList.length} agenda kegiatan & ${pList.length} rekaman presensi.`);
    } catch (err: any) {
      setDataFeedback('Gagal memuat data: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (hasAccess) {
      fetchUsers();
      handleTarikData();
    }
  }, [hasAccess, selectedBulan, selectedTahun, selectedJenis]);

  if (!hasAccess) {
    return (
      <div className="kta-restricted-box error-theme">
        <div className="icon-wrap">
          <ShieldAlert style={{ width: 44, height: 44, color: '#b91c1c' }} />
        </div>
        <h3>Akses Terbatas</h3>
        <p>Akses Ditolak: Anda tidak diizinkan mengakses modul pelaporan administrasi PMR.</p>
      </div>
    );
  }

  const formatTglIndo = (tglStr: string) => {
    if (!tglStr || tglStr === '.....') return '.....................';
    const p = tglStr.split('-');
    if (p.length !== 3) return tglStr;
    const blnIndo = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    return `${parseInt(p[2], 10)} ${blnIndo[parseInt(p[1], 10) - 1]} ${p[0]}`;
  };

  const getSigData = (userId: string, defaultJabatan: string) => {
    if (!userId) return { nama: '....................................', jabatan: defaultJabatan };
    const user = usersList.find(u => u.id === userId);
    return {
      nama: user ? user.nama_lengkap : '....................................',
      jabatan: user?.keterangan_jabatan || defaultJabatan
    };
  };

  const printSpecificSection = (divId: string, orientation: 'portrait' | 'landscape' = 'portrait') => {
    const elem = document.getElementById(divId);
    if (!elem) return;
    const konten = elem.innerHTML;
    const pageStyle = orientation === 'landscape'
      ? '@page { size: 330mm 215mm; margin: 15mm; }'
      : '@page { size: 215mm 330mm; margin: 15mm; }';

    let printCont = document.getElementById('print-container');
    if (!printCont) {
      printCont = document.createElement('div');
      printCont.id = 'print-container';
      document.body.appendChild(printCont);
    }
    printCont.innerHTML = `<style>${pageStyle}</style>` + konten;
    document.body.classList.add('is-printing');
    window.print();

    setTimeout(() => {
      document.body.classList.remove('is-printing');
      if (printCont) printCont.innerHTML = '';
    }, 600);
  };

  const handleCetakAbsen = (mode: 'normal' | 'paraf') => {
    setAbsenMode(mode);
    setTimeout(() => {
      printSpecificSection('print-absen', 'landscape');
    }, 100);
  };

  // Identifikasi Unsur Pelatih & Pembina
  const pelatihRoles = ['kepala sekolah', 'pembina 1', 'pembina 2', 'pembina', 'pelatih'];
  const pelatihUsers = usersList.filter(u => {
    const ket = (u.keterangan_jabatan || '').toLowerCase();
    const jab = (u.jabatan || '').toLowerCase();
    return pelatihRoles.some(r => ket.includes(r) || jab.includes(r));
  });

  // Filter Eksklusif Anggota Aktif PMR
  const siswaUsers = usersList.filter(u => {
    const ket = (u.keterangan_jabatan || '').toLowerCase();
    const jab = (u.jabatan || '').toLowerCase();
    const isDewasa = pelatihRoles.some(r => ket.includes(r) || jab.includes(r));
    const isAlumni = ket.includes('alumni') || jab.includes('alumni');
    const isNonAktif = ket.includes('non-aktif') || jab === 'non-aktif';
    return !isDewasa && !isAlumni && !isNonAktif;
  });
  siswaUsers.sort((a, b) => (a.nama_lengkap || '').localeCompare(b.nama_lengkap || '', 'id', { sensitivity: 'base' }));

  const tanggalUnik = [...new Set(kegiatanList.map(k => k.tanggal))].sort();
  const tglAkhir = tanggalUnik.length > 0 ? tanggalUnik[tanggalUnik.length - 1] : '.....';

  const minKol = absenMinKolom || 8;
  const tanggalTampil = [...tanggalUnik];
  while (tanggalTampil.length < minKol) {
    tanggalTampil.push('');
  }

  const sigCov = getSigData(covNamaUserId, 'Pelatih PMR');
  const sigLapKiri = getSigData(ttdLapKiri, 'Pembina 1');
  const sigLapKanan = getSigData(ttdLapKanan, 'Pelatih');
  const sigLapTengah = getSigData(ttdLapTengah, 'Kepala Sekolah');

  const sigAbsPelKiri = getSigData(ttdAbsPelKiri, 'Pembina 1');
  const sigAbsPelKanan = getSigData(ttdAbsPelKanan, 'Kepala Sekolah');

  const sigAbsSisKiri = getSigData(ttdAbsSisKiri, 'Pembina 1');
  const sigAbsSisTengah = getSigData(ttdAbsSisTengah, 'Pelatih');
  const sigAbsSisKanan = getSigData(ttdAbsSisKanan, 'Kepala Sekolah');

  const sigJurnalKanan = getSigData(ttdJurnalKanan, 'Pelatih');

  // Shared Kop Surat Component
  const renderKopSurat = () => (
    <div className="kop-surat-with-logos">
      <img
        src="https://ndahxwqshyukqpnjkniw.supabase.co/storage/v1/object/public/profil-anggota/LOGO%20PMI%20untuk%20aplikasi.png"
        alt="Logo PMI"
        className="kop-logo-img"
      />
      <div className="kop-center-text">
        <h3>PALANG MERAH REMAJA (PMR)</h3>
        <h2>SMP NEGERI 8 BALIKPAPAN</h2>
        <p>Jl. Mulawarman RT.54, kel. Manggar, Kec. Balikpapan Timur, Kota Balikpapan</p>
      </div>
      <img
        src="https://ndahxwqshyukqpnjkniw.supabase.co/storage/v1/object/public/utilitas_ikon/LOGO%20SMP%20NEGERI%208%20BALIKPAPAN%20-%20untuk%20website.png"
        alt="Logo SMP"
        className="kop-logo-img"
      />
    </div>
  );

  // Zoom toolbar
  const renderZoomBar = () => (
    <div className="zoom-control-bar no-print">
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span>🔍 Skala Tampilan:</span>
      </div>
      <div className="zoom-pills-group">
        <button
          type="button"
          className={`btn-zoom-pill ${previewZoom === 0.5 ? 'active' : ''}`}
          onClick={() => setPreviewZoom(0.5)}
        >
          50% (Kompak)
        </button>
        <button
          type="button"
          className={`btn-zoom-pill ${previewZoom === 0.75 ? 'active' : ''}`}
          onClick={() => setPreviewZoom(0.75)}
        >
          75% (Tablet / Layar Sedang)
        </button>
        <button
          type="button"
          className={`btn-zoom-pill ${previewZoom === 1 ? 'active' : ''}`}
          onClick={() => setPreviewZoom(1)}
        >
          100% (Ukuran Asli F4)
        </button>
      </div>
    </div>
  );

  return (
    <div className="workspace-container pelaporan-ref-workspace">
      {/* 0. MODULE TOP BAR */}
      <div className="agenda-top-bar" style={{ marginBottom: 18 }}>
        <div className="agenda-top-title">
          <div className="agenda-icon-cube" style={{ background: 'linear-gradient(135deg, #b91c1c, #991b1b)' }}>
            <FileSpreadsheet style={{ width: 22, height: 22 }} />
          </div>
          <div>
            <h3>Modul Pelaporan Administrasi Resmi</h3>
            <p>Penyusunan berkas rekap presensi, jurnal kegiatan, dan lembar dokumentasi cetak F4.</p>
          </div>
        </div>
      </div>

      {/* 1. FILTER CARD */}
      <div className="filter-card">
        <div className="filter-header">
          <Calendar style={{ width: 18, height: 18 }} />
          <span>Pengaturan Periode & Filter Data Laporan</span>
        </div>
        <div className="filter-body">
          <div className="form-group">
            <label>Bulan Kegiatan</label>
            <select value={selectedBulan} onChange={(e) => setSelectedBulan(e.target.value)}>
              {Object.entries(namaBulanMap).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Tahun</label>
            <input
              type="number"
              value={selectedTahun}
              onChange={(e) => setSelectedTahun(e.target.value)}
            />
          </div>

          <div className="form-group" style={{ flex: 1.4 }}>
            <label>Jenis Kegiatan</label>
            <select value={selectedJenis} onChange={(e) => setSelectedJenis(e.target.value)}>
              <option value="Semua Kegiatan">Semua Kegiatan</option>
              <option value="Latihan Rutin">Latihan Rutin</option>
              <option value="Tugas Upacara">Tugas Upacara</option>
              <option value="Bakti Sosial">Bakti Sosial</option>
              <option value="Lomba PMR">Lomba PMR</option>
              <option value="Diklat / Seminar">Diklat / Seminar</option>
              <option value="Rapat Organisasi">Rapat Organisasi</option>
              <option value="Lainnya">Lainnya</option>
            </select>
          </div>

          <div className="btn-tarik-wrapper">
            <button
              type="button"
              className="btn-primary"
              onClick={handleTarikData}
              disabled={loading}
            >
              <DownloadCloud className={loading ? 'spin-anim' : ''} style={{ width: 16, height: 16 }} />
              <span>{loading ? 'Menarik...' : 'Tarik Data Laporan'}</span>
            </button>
          </div>
        </div>

        {dataFeedback && (
          <div className="pelaporan-feedback-note">
            <CheckCircle2 style={{ width: 15, height: 15, color: '#059669', flexShrink: 0 }} />
            <span>{dataFeedback}</span>
          </div>
        )}
      </div>

      {/* 2. MENU GRID (5 ACTION BUTTONS) */}
      <div className="pelaporan-menu-grid">
        <div
          className={`pelaporan-action-btn ${activePanel === 'panel-cover' ? 'active' : ''}`}
          onClick={() => setActivePanel('panel-cover')}
        >
          <div className="pelaporan-icon-box" style={{ background: '#475569' }}>
            <BookOpen style={{ width: 20, height: 20 }} />
          </div>
          <span>Sampul Cover</span>
        </div>

        <div
          className={`pelaporan-action-btn ${activePanel === 'panel-laporan' ? 'active' : ''}`}
          onClick={() => setActivePanel('panel-laporan')}
        >
          <div className="pelaporan-icon-box" style={{ background: '#b91c1c' }}>
            <FileText style={{ width: 20, height: 20 }} />
          </div>
          <span>Laporan Harian</span>
        </div>

        <div
          className={`pelaporan-action-btn ${activePanel === 'panel-absen' ? 'active' : ''}`}
          onClick={() => setActivePanel('panel-absen')}
        >
          <div className="pelaporan-icon-box" style={{ background: '#2563eb' }}>
            <Users style={{ width: 20, height: 20 }} />
          </div>
          <span>Presensi Hadir</span>
        </div>

        <div
          className={`pelaporan-action-btn ${activePanel === 'panel-jurnal' ? 'active' : ''}`}
          onClick={() => setActivePanel('panel-jurnal')}
        >
          <div className="pelaporan-icon-box" style={{ background: '#16a34a' }}>
            <CheckSquare style={{ width: 20, height: 20 }} />
          </div>
          <span>Jurnal Kegiatan</span>
        </div>

        <div
          className={`pelaporan-action-btn ${activePanel === 'panel-dokumentasi' ? 'active' : ''}`}
          onClick={() => setActivePanel('panel-dokumentasi')}
        >
          <div className="pelaporan-icon-box" style={{ background: '#d97706' }}>
            <ImageIcon style={{ width: 20, height: 20 }} />
          </div>
          <span>Dokumentasi</span>
        </div>
      </div>

      {/* =========================================================
          PANEL 1: SAMPUL COVER (F4)
          ========================================================= */}
      {activePanel === 'panel-cover' && (
        <div className="laporan-panel-card">
          <div className="laporan-panel-header">
            <div className="laporan-header-title-box">
              <BookOpen style={{ width: 17, height: 17, color: '#475569' }} />
              <span>Sampul / Cover Laporan</span>
              <span className="laporan-paper-badge">Kertas F4 Portrait (215 × 330 mm)</span>
            </div>
            <div className="laporan-header-actions">
              <button
                type="button"
                className="btn-print-action"
                onClick={() => printSpecificSection('print-cover', 'portrait')}
              >
                <Printer style={{ width: 14, height: 14 }} /> Cetak Cover PDF
              </button>
            </div>
          </div>

          <div className="edit-config-box">
            <div className="edit-config-header">
              <div className="edit-config-title">
                <SlidersHorizontal style={{ width: 14, height: 14 }} />
                <span>Pengaturan Teks Cover Laporan F4</span>
              </div>
              <button
                type="button"
                onClick={() => setShowConfig(!showConfig)}
                style={{
                  background: 'none',
                  border: '1px solid #cbd5e1',
                  borderRadius: 6,
                  padding: '3px 8px',
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: 'pointer',
                  color: '#475569'
                }}
              >
                {showConfig ? 'Sembunyikan Form' : 'Tampilkan Form'}
              </button>
            </div>

            {showConfig && (
              <div className="edit-config-grid">
                <div className="edit-config-group">
                  <label>Baris 1 (Judul Utama)</label>
                  <input type="text" value={covB1} onChange={(e) => setCovB1(e.target.value)} />
                </div>
                <div className="edit-config-group">
                  <label>Baris 2 (Nama Organisasi / Sekolah)</label>
                  <input type="text" value={covB2} onChange={(e) => setCovB2(e.target.value)} />
                </div>
                <div className="edit-config-group">
                  <label>Baris 3 (Bulan & Tahun)</label>
                  <input type="text" value={covB3} onChange={(e) => setCovB3(e.target.value)} />
                </div>
                <div className="edit-config-group">
                  <label>Label Pembuat</label>
                  <input type="text" value={covB4} onChange={(e) => setCovB4(e.target.value)} />
                </div>
                <div className="edit-config-group">
                  <label>Nama Pembuat (Pilih User)</label>
                  <select value={covNamaUserId} onChange={(e) => setCovNamaUserId(e.target.value)}>
                    <option value="">-- Pilih Penandatangan --</option>
                    {usersList.map(u => (
                      <option key={u.id} value={u.id}>{u.nama_lengkap} ({u.keterangan_jabatan || '-'})</option>
                    ))}
                  </select>
                </div>
                <div className="edit-config-group">
                  <label>Jabatan Pembuat</label>
                  <input type="text" value={covJabatan} onChange={(e) => setCovJabatan(e.target.value)} />
                </div>
                <div className="edit-config-group">
                  <label>Tahun Ajaran</label>
                  <input type="text" value={covTa} onChange={(e) => setCovTa(e.target.value)} />
                </div>
              </div>
            )}
          </div>

          {renderZoomBar()}

          <div className="preview-scroll-area">
            <div
              id="print-cover"
              className="paper-f4"
              style={{
                zoom: previewZoom
              }}
            >
              <div style={{ textAlign: 'center', paddingTop: 10, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '280mm', boxSizing: 'border-box' }}>
                <div>
                  <h1 style={{ fontSize: '28pt', marginBottom: 15, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 1 }}>{covB1}</h1>
                  <h2 style={{ fontSize: '22pt', marginBottom: 35, fontWeight: 800, textTransform: 'uppercase' }}>{covB2}</h2>
                  <h3 style={{ fontSize: '18pt', fontWeight: 800, textTransform: 'uppercase' }}>{covB3}</h3>
                </div>
                <div style={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '40px 0' }}>
                  <img
                    src="https://ndahxwqshyukqpnjkniw.supabase.co/storage/v1/object/public/profil-anggota/LOGO%20PMI%20untuk%20aplikasi.png"
                    style={{ width: 220, height: 'auto', display: 'block', margin: '0 auto' }}
                    alt="Logo PMI"
                  />
                </div>
                <div>
                  <p style={{ fontSize: '14pt', marginBottom: 20 }}>{covB4}</p>
                  <h3 style={{ fontSize: '16pt', textDecoration: 'underline', fontWeight: 800, marginBottom: 6 }}>{sigCov.nama}</h3>
                  <p style={{ fontSize: '14pt', marginBottom: 60 }}>{covJabatan}</p>
                  <h3 style={{ fontSize: '18pt', fontWeight: 800, marginBottom: 10, textTransform: 'uppercase' }}>{covB2}</h3>
                  <h3 style={{ fontSize: '16pt', fontWeight: 700, textTransform: 'uppercase' }}>{covTa}</h3>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          PANEL 2: LAPORAN HARIAN KEGIATAN (F4)
          ========================================================= */}
      {activePanel === 'panel-laporan' && (
        <div className="laporan-panel-card">
          <div className="laporan-panel-header">
            <div className="laporan-header-title-box">
              <FileText style={{ width: 17, height: 17, color: '#b91c1c' }} />
              <span>Laporan Harian Kegiatan</span>
              <span className="laporan-paper-badge">Kertas F4 Portrait</span>
            </div>
            <div className="laporan-header-actions">
              <button
                type="button"
                className="btn-print-action"
                onClick={() => printSpecificSection('print-laporan', 'portrait')}
              >
                <Printer style={{ width: 14, height: 14 }} /> Simpan Laporan PDF
              </button>
            </div>
          </div>

          <div className="edit-config-box">
            <div className="edit-config-header">
              <div className="edit-config-title">
                <SlidersHorizontal style={{ width: 14, height: 14 }} />
                <span>Konfigurasi Tanda Tangan Laporan Resmi</span>
              </div>
              <button
                type="button"
                onClick={() => setShowConfig(!showConfig)}
                style={{
                  background: 'none',
                  border: '1px solid #cbd5e1',
                  borderRadius: 6,
                  padding: '3px 8px',
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: 'pointer',
                  color: '#475569'
                }}
              >
                {showConfig ? 'Sembunyikan Form' : 'Tampilkan Form'}
              </button>
            </div>

            {showConfig && (
              <div className="edit-config-grid">
                <div className="edit-config-group">
                  <label>Mengetahui Kiri</label>
                  <select value={ttdLapKiri} onChange={(e) => setTtdLapKiri(e.target.value)}>
                    <option value="">-- Pilih Pembina --</option>
                    {usersList.map(u => (
                      <option key={u.id} value={u.id}>{u.nama_lengkap} ({u.keterangan_jabatan || '-'})</option>
                    ))}
                  </select>
                </div>
                <div className="edit-config-group">
                  <label>Membuat Kanan</label>
                  <select value={ttdLapKanan} onChange={(e) => setTtdLapKanan(e.target.value)}>
                    <option value="">-- Pilih Pelatih --</option>
                    {usersList.map(u => (
                      <option key={u.id} value={u.id}>{u.nama_lengkap} ({u.keterangan_jabatan || '-'})</option>
                    ))}
                  </select>
                </div>
                <div className="edit-config-group">
                  <label>Mengetahui Tengah (Bawah)</label>
                  <select value={ttdLapTengah} onChange={(e) => setTtdLapTengah(e.target.value)}>
                    <option value="">-- Pilih Kepala Sekolah --</option>
                    {usersList.map(u => (
                      <option key={u.id} value={u.id}>{u.nama_lengkap} ({u.keterangan_jabatan || '-'})</option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>

          {renderZoomBar()}

          <div className="preview-scroll-area">
            <div
              id="print-laporan"
              style={{
                zoom: previewZoom
              }}
            >
              {kegiatanList.length === 0 ? (
                <div className="paper-f4">
                  {renderKopSurat()}
                  <div className="judul-laporan">LAPORAN HARIAN KEGIATAN EKSTRAKURIKULER</div>
                  <p style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b' }}>
                    Tidak ada rekaman kegiatan pada periode yang dipilih.
                  </p>
                </div>
              ) : (
                kegiatanList.map((keg, idx) => (
                  <div key={idx} className="paper-f4">
                    {renderKopSurat()}
                    <div className="judul-laporan">LAPORAN HARIAN KEGIATAN EKSTRAKURIKULER</div>
                    <table className="table-laporan-resmi">
                      <tbody>
                        <tr>
                          <td style={{ width: '4%' }}>1.</td>
                          <td style={{ width: '30%' }}>Nama Kegiatan</td>
                          <td>: {keg.judul} ({keg.jenis})</td>
                        </tr>
                        <tr>
                          <td>2.</td>
                          <td>Waktu Pelaksanaan</td>
                          <td>: {formatTglIndo(keg.tanggal)}</td>
                        </tr>
                        <tr>
                          <td>3.</td>
                          <td>Tempat Kegiatan</td>
                          <td>: {keg.tempat}</td>
                        </tr>
                        <tr>
                          <td>4.</td>
                          <td>Materi / Deskripsi</td>
                          <td>: {keg.deskripsi}</td>
                        </tr>
                        <tr>
                          <td>5.</td>
                          <td>Hasil yang Dicapai</td>
                          <td>: Seluruh peserta mengikuti rangkaian kegiatan pembinaan dengan tertib, terampil, dan memahami materi.</td>
                        </tr>
                      </tbody>
                    </table>

                    <table className="table-ttd">
                      <tbody>
                        <tr>
                          <td style={{ width: '50%' }}>Mengetahui,<br />{sigLapKiri.jabatan}</td>
                          <td style={{ width: '50%' }}>Balikpapan, {formatTglIndo(keg.tanggal)}<br />{sigLapKanan.jabatan}</td>
                        </tr>
                        <tr>
                          <td colSpan={2} style={{ height: 65 }} />
                        </tr>
                        <tr>
                          <td><b><u>{sigLapKiri.nama}</u></b></td>
                          <td><b><u>{sigLapKanan.nama}</u></b></td>
                        </tr>
                        <tr>
                          <td colSpan={2} style={{ paddingTop: 25 }}>Mengetahui,<br />{sigLapTengah.jabatan}</td>
                        </tr>
                        <tr>
                          <td colSpan={2} style={{ height: 65 }} />
                        </tr>
                        <tr>
                          <td colSpan={2}><b><u>{sigLapTengah.nama}</u></b></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          PANEL 3: PRESENSI HADIR (LANDSCAPE F4)
          ========================================================= */}
      {activePanel === 'panel-absen' && (
        <div className="laporan-panel-card">
          <div className="laporan-panel-header">
            <div className="laporan-header-title-box">
              <Users style={{ width: 17, height: 17, color: '#2563eb' }} />
              <span>Rekapitulasi Kehadiran</span>
              <span className="laporan-paper-badge">Landscape F4 (330 × 215 mm)</span>
            </div>
            <div className="laporan-header-actions">
              <button
                type="button"
                className="btn-print-action"
                onClick={() => handleCetakAbsen('normal')}
              >
                <Printer style={{ width: 14, height: 14 }} /> Cetak Normal
              </button>
              <button
                type="button"
                className="btn-print-action secondary-blue"
                onClick={() => handleCetakAbsen('paraf')}
              >
                <Printer style={{ width: 14, height: 14 }} /> Cetak Kotak Kosong (Paraf)
              </button>
            </div>
          </div>

          <div className="edit-config-box">
            <div className="edit-config-header">
              <div className="edit-config-title">
                <SlidersHorizontal style={{ width: 14, height: 14 }} />
                <span>Pengaturan & Penandatangan Absensi</span>
              </div>
              <button
                type="button"
                onClick={() => setShowConfig(!showConfig)}
                style={{
                  background: 'none',
                  border: '1px solid #cbd5e1',
                  borderRadius: 6,
                  padding: '3px 8px',
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: 'pointer',
                  color: '#475569'
                }}
              >
                {showConfig ? 'Sembunyikan Form' : 'Tampilkan Form'}
              </button>
            </div>

            {showConfig && (
              <>
                <div style={{ fontSize: 11.5, fontWeight: 800, color: '#475569', marginBottom: 8, marginTop: 4 }}>
                  1. Tanda Tangan Absen Pelatih & Pembina
                </div>
                <div className="edit-config-grid" style={{ marginBottom: 14 }}>
                  <div className="edit-config-group">
                    <label>Mengetahui Kiri (Pembina)</label>
                    <select value={ttdAbsPelKiri} onChange={(e) => setTtdAbsPelKiri(e.target.value)}>
                      <option value="">-- Pilih Pembina --</option>
                      {usersList.map(u => (
                        <option key={u.id} value={u.id}>{u.nama_lengkap} ({u.keterangan_jabatan || '-'})</option>
                      ))}
                    </select>
                  </div>
                  <div className="edit-config-group">
                    <label>Mengetahui Kanan (Kepala Sekolah)</label>
                    <select value={ttdAbsPelKanan} onChange={(e) => setTtdAbsPelKanan(e.target.value)}>
                      <option value="">-- Pilih Kepala Sekolah --</option>
                      {usersList.map(u => (
                        <option key={u.id} value={u.id}>{u.nama_lengkap} ({u.keterangan_jabatan || '-'})</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div style={{ fontSize: 11.5, fontWeight: 800, color: '#475569', marginBottom: 8 }}>
                  2. Tanda Tangan Absen Anggota Siswa
                </div>
                <div className="edit-config-grid" style={{ marginBottom: 14 }}>
                  <div className="edit-config-group">
                    <label>Mengetahui Kiri (Pembina)</label>
                    <select value={ttdAbsSisKiri} onChange={(e) => setTtdAbsSisKiri(e.target.value)}>
                      <option value="">-- Pilih Pembina --</option>
                      {usersList.map(u => (
                        <option key={u.id} value={u.id}>{u.nama_lengkap} ({u.keterangan_jabatan || '-'})</option>
                      ))}
                    </select>
                  </div>
                  <div className="edit-config-group">
                    <label>Mengetahui Tengah (Pelatih)</label>
                    <select value={ttdAbsSisTengah} onChange={(e) => setTtdAbsSisTengah(e.target.value)}>
                      <option value="">-- Pilih Pelatih --</option>
                      {usersList.map(u => (
                        <option key={u.id} value={u.id}>{u.nama_lengkap} ({u.keterangan_jabatan || '-'})</option>
                      ))}
                    </select>
                  </div>
                  <div className="edit-config-group">
                    <label>Mengetahui Kanan (Kepala Sekolah)</label>
                    <select value={ttdAbsSisKanan} onChange={(e) => setTtdAbsSisKanan(e.target.value)}>
                      <option value="">-- Pilih Kepala Sekolah --</option>
                      {usersList.map(u => (
                        <option key={u.id} value={u.id}>{u.nama_lengkap} ({u.keterangan_jabatan || '-'})</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div style={{ fontSize: 11.5, fontWeight: 800, color: '#475569', marginBottom: 8 }}>
                  3. Pengaturan Kolom & Mode
                </div>
                <div className="edit-config-grid">
                  <div className="edit-config-group">
                    <label>Jumlah Kolom Minimal</label>
                    <input
                      type="number"
                      value={absenMinKolom}
                      onChange={(e) => setAbsenMinKolom(parseInt(e.target.value, 10) || 1)}
                      min={1}
                    />
                  </div>
                  <div className="edit-config-group">
                    <label>Mode Tampilan Pratinjau</label>
                    <select value={absenMode} onChange={(e) => setAbsenMode(e.target.value as any)}>
                      <option value="normal">Normal (Huruf Status H/I/S/A)</option>
                      <option value="paraf">Kotak Kosong (Untuk Paraf Basah)</option>
                    </select>
                  </div>
                </div>
              </>
            )}
          </div>

          {renderZoomBar()}

          <div className="preview-scroll-area">
            <div
              id="print-absen"
              style={{
                zoom: previewZoom
              }}
            >
              {/* TABEL 1: DAFTAR HADIR PELATIH & PEMBINA */}
              <div className="paper-landscape-f4">
                {renderKopSurat()}
                <div className="judul-laporan">DAFTAR HADIR PELATIH & PEMBINA PMR</div>
                <table className="table-data">
                  <thead>
                    <tr style={{ background: '#f1f5f9' }}>
                      <th style={{ width: '4%', textAlign: 'center' }}>No</th>
                      <th style={{ width: '24%' }}>Nama Lengkap</th>
                      <th style={{ width: '14%', textAlign: 'center' }}>Jabatan</th>
                      {tanggalTampil.map((t, idx) => (
                        <th key={idx} style={{ fontSize: '9.5px', width: '4%', textAlign: 'center' }}>
                          {t === '' ? '-' : `${t.substring(8, 10)}/${t.substring(5, 7)}`}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {pelatihUsers.length === 0 ? (
                      <tr>
                        <td colSpan={3 + tanggalTampil.length} style={{ textAlign: 'center', padding: 12 }}>Data kosong</td>
                      </tr>
                    ) : (
                      pelatihUsers.map((user, i) => (
                        <tr key={user.id}>
                          <td style={{ textAlign: 'center' }}>{i + 1}</td>
                          <td><strong>{user.nama_lengkap}</strong></td>
                          <td style={{ textAlign: 'center', fontSize: '10pt' }}>{user.keterangan_jabatan || user.jabatan || '-'}</td>
                          {tanggalTampil.map((tgl, tIdx) => {
                            if (tgl === '') {
                              return <td key={tIdx} style={{ textAlign: 'center' }} />;
                            }
                            const pRow = presensiList.find(p => p.user_id === user.id && p.tanggal_kegiatan === tgl);
                            let status = pRow ? pRow.status_kehadiran.charAt(0).toUpperCase() : '-';
                            if (absenMode === 'paraf') status = '';
                            return (
                              <td key={tIdx} style={{ textAlign: 'center', fontWeight: 'bold' }}>
                                {status}
                              </td>
                            );
                          })}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
                <table className="table-ttd">
                  <tbody>
                    <tr>
                      <td style={{ width: '50%' }}>Mengetahui,<br />{sigAbsPelKiri.jabatan}</td>
                      <td style={{ width: '50%' }}>Balikpapan, {formatTglIndo(tglAkhir)}<br />{sigAbsPelKanan.jabatan}</td>
                    </tr>
                    <tr>
                      <td colSpan={2} style={{ height: 60 }} />
                    </tr>
                    <tr>
                      <td><b><u>{sigAbsPelKiri.nama}</u></b></td>
                      <td><b><u>{sigAbsPelKanan.nama}</u></b></td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* TABEL 2: DAFTAR HADIR ANGGOTA AKTIF SISWA */}
              <div className="paper-landscape-f4">
                {renderKopSurat()}
                <div className="judul-laporan">DAFTAR HADIR ANGGOTA AKTIF PMR</div>
                <table className="table-data">
                  <thead>
                    <tr style={{ background: '#f1f5f9' }}>
                      <th style={{ width: '4%', textAlign: 'center' }}>No</th>
                      <th style={{ width: '24%' }}>Nama Lengkap</th>
                      <th style={{ width: '14%', textAlign: 'center' }}>Jabatan / Kelas</th>
                      {tanggalTampil.map((t, idx) => (
                        <th key={idx} style={{ fontSize: '9.5px', width: '4%', textAlign: 'center' }}>
                          {t === '' ? '-' : `${t.substring(8, 10)}/${t.substring(5, 7)}`}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {siswaUsers.length === 0 ? (
                      <tr>
                        <td colSpan={3 + tanggalTampil.length} style={{ textAlign: 'center', padding: 12 }}>Tidak ada anggota aktif tercatat</td>
                      </tr>
                    ) : (
                      siswaUsers.map((user, i) => {
                        const role = user.keterangan_jabatan || 'Anggota';
                        const kelas = user.kelas ? ` / ${user.kelas}` : '';
                        const jabatanKelas = `${role}${kelas}`;

                        return (
                          <tr key={user.id}>
                            <td style={{ textAlign: 'center' }}>{i + 1}</td>
                            <td>{user.nama_lengkap}</td>
                            <td style={{ textAlign: 'center', fontSize: '10pt' }}>{jabatanKelas}</td>
                            {tanggalTampil.map((tgl, tIdx) => {
                              if (tgl === '') {
                                return <td key={tIdx} style={{ textAlign: 'center' }} />;
                              }
                              const pRow = presensiList.find(p => p.user_id === user.id && p.tanggal_kegiatan === tgl);
                              let status = pRow ? pRow.status_kehadiran.charAt(0).toUpperCase() : '-';
                              if (absenMode === 'paraf') status = '';
                              return (
                                <td key={tIdx} style={{ textAlign: 'center', fontWeight: 'bold' }}>
                                  {status}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
                <table className="table-ttd">
                  <tbody>
                    <tr>
                      <td style={{ width: '33%' }}>Mengetahui,<br />{sigAbsSisKiri.jabatan}</td>
                      <td style={{ width: '33%' }}>Mengetahui,<br />{sigAbsSisTengah.jabatan}</td>
                      <td style={{ width: '33%' }}>Balikpapan, {formatTglIndo(tglAkhir)}<br />{sigAbsSisKanan.jabatan}</td>
                    </tr>
                    <tr>
                      <td colSpan={3} style={{ height: 60 }} />
                    </tr>
                    <tr>
                      <td><b><u>{sigAbsSisKiri.nama}</u></b></td>
                      <td><b><u>{sigAbsSisTengah.nama}</u></b></td>
                      <td><b><u>{sigAbsSisKanan.nama}</u></b></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          PANEL 4: JURNAL KEGIATAN EKSTRAKURIKULER (LANDSCAPE F4)
          ========================================================= */}
      {activePanel === 'panel-jurnal' && (
        <div className="laporan-panel-card">
          <div className="laporan-panel-header">
            <div className="laporan-header-title-box">
              <CheckSquare style={{ width: 17, height: 17, color: '#16a34a' }} />
              <span>Jurnal Kegiatan Ekstrakurikuler</span>
              <span className="laporan-paper-badge">Landscape F4 (330 × 215 mm)</span>
            </div>
            <div className="laporan-header-actions">
              <button
                type="button"
                className="btn-print-action"
                onClick={() => printSpecificSection('print-jurnal', 'landscape')}
              >
                <Printer style={{ width: 14, height: 14 }} /> Simpan Jurnal PDF
              </button>
            </div>
          </div>

          <div className="edit-config-box">
            <div className="edit-config-header">
              <div className="edit-config-title">
                <SlidersHorizontal style={{ width: 14, height: 14 }} />
                <span>Konfigurasi Penandatangan Jurnal</span>
              </div>
              <button
                type="button"
                onClick={() => setShowConfig(!showConfig)}
                style={{
                  background: 'none',
                  border: '1px solid #cbd5e1',
                  borderRadius: 6,
                  padding: '3px 8px',
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: 'pointer',
                  color: '#475569'
                }}
              >
                {showConfig ? 'Sembunyikan Form' : 'Tampilkan Form'}
              </button>
            </div>

            {showConfig && (
              <div className="edit-config-grid">
                <div className="edit-config-group">
                  <label>Penandatangan (Kanan Bawah)</label>
                  <select value={ttdJurnalKanan} onChange={(e) => setTtdJurnalKanan(e.target.value)}>
                    <option value="">-- Pilih Pelatih / Pembina --</option>
                    {usersList.map(u => (
                      <option key={u.id} value={u.id}>{u.nama_lengkap} ({u.keterangan_jabatan || '-'})</option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>

          {renderZoomBar()}

          <div className="preview-scroll-area">
            <div
              id="print-jurnal"
              className="paper-landscape-f4"
              style={{
                zoom: previewZoom
              }}
            >
              {renderKopSurat()}
              <div className="judul-laporan">JURNAL KEGIATAN EKSTRAKURIKULER PMR</div>
              <table className="table-data">
                <thead>
                  <tr style={{ background: '#f1f5f9' }}>
                    <th style={{ width: '5%', textAlign: 'center' }}>No</th>
                    <th style={{ width: '18%', textAlign: 'center' }}>Tanggal</th>
                    <th>Materi & Uraian Kegiatan</th>
                    <th style={{ width: '22%' }}>Tempat Pelaksanaan</th>
                  </tr>
                </thead>
                <tbody>
                  {kegiatanList.length === 0 ? (
                    <tr>
                      <td colSpan={4} style={{ textAlign: 'center', padding: 20 }}>Belum ada jurnal tercatat.</td>
                    </tr>
                  ) : (
                    kegiatanList.map((keg, i) => (
                      <tr key={i}>
                        <td style={{ textAlign: 'center' }}>{i + 1}</td>
                        <td style={{ textAlign: 'center' }}>{formatTglIndo(keg.tanggal)}</td>
                        <td>
                          <b>{keg.judul}</b>
                          <br />
                          <span style={{ fontSize: '10pt' }}>{keg.deskripsi}</span>
                        </td>
                        <td>{keg.tempat}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>

              <table className="table-ttd" style={{ width: '38%', marginLeft: 'auto', marginRight: 0 }}>
                <tbody>
                  <tr>
                    <td>Balikpapan, {formatTglIndo(tglAkhir)}<br />{sigJurnalKanan.jabatan}</td>
                  </tr>
                  <tr>
                    <td style={{ height: 65 }} />
                  </tr>
                  <tr>
                    <td><b><u>{sigJurnalKanan.nama}</u></b></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          PANEL 5: DOKUMENTASI FOTO (PORTRAIT F4)
          ========================================================= */}
      {activePanel === 'panel-dokumentasi' && (
        <div className="laporan-panel-card">
          <div className="laporan-panel-header">
            <div className="laporan-header-title-box">
              <ImageIcon style={{ width: 17, height: 17, color: '#d97706' }} />
              <span>Dokumentasi Foto Pelaksanaan Kegiatan</span>
              <span className="laporan-paper-badge">Kertas F4 Portrait</span>
            </div>
            <div className="laporan-header-actions">
              <button
                type="button"
                className="btn-print-action"
                onClick={() => printSpecificSection('print-dokumentasi', 'portrait')}
              >
                <Printer style={{ width: 14, height: 14 }} /> Simpan Dokumentasi PDF
              </button>
            </div>
          </div>

          {renderZoomBar()}

          <div className="preview-scroll-area">
            <div
              id="print-dokumentasi"
              style={{
                zoom: previewZoom
              }}
            >
              {(() => {
                const allPhotos: { url: string; tanggal: string; judul: string }[] = [];
                kegiatanList.forEach(keg => {
                  if (keg.fotos && keg.fotos.length > 0) {
                    keg.fotos.forEach(url => {
                      allPhotos.push({
                        url,
                        tanggal: keg.tanggal,
                        judul: keg.judul
                      });
                    });
                  }
                });

                if (allPhotos.length === 0) {
                  return (
                    <div className="paper-f4">
                      {renderKopSurat()}
                      <div className="judul-laporan">DOKUMENTASI PELAKSANAAN KEGIATAN</div>
                      <p style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>
                        Belum ada lampiran foto dokumentasi pada kegiatan bulan ini.
                      </p>
                    </div>
                  );
                }

                const chunkSize = 4;
                const pages: typeof allPhotos[] = [];
                for (let i = 0; i < allPhotos.length; i += chunkSize) {
                  pages.push(allPhotos.slice(i, i + chunkSize));
                }

                return pages.map((chunk, pIdx) => (
                  <div key={pIdx} className="paper-f4">
                    {renderKopSurat()}
                    <div className="judul-laporan">DOKUMENTASI PELAKSANAAN KEGIATAN</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center', justifyContent: 'flex-start' }}>
                      {chunk.map((item, fIdx) => (
                        <div key={fIdx} style={{ textAlign: 'center', width: '100%', pageBreakInside: 'avoid', marginBottom: 10 }}>
                          <img
                            src={item.url}
                            alt="Dokumentasi Kegiatan"
                            style={{
                              maxWidth: '65%',
                              maxHeight: '190px',
                              objectFit: 'contain',
                              border: '1.5px solid black',
                              padding: 3,
                              background: 'white',
                              display: 'block',
                              margin: '0 auto'
                            }}
                          />
                          <p style={{ marginTop: 5, fontSize: '11pt', fontFamily: 'Times New Roman, serif' }}>
                            Kegiatan: <b>{item.judul}</b> | Tanggal: {formatTglIndo(item.tanggal)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                ));
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
