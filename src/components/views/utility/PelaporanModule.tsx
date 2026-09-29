import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { supabase } from '../../../services/supabase';
import { PresensiRecord, UserProfile } from '../../../types';
import {
  FileText,
  FileCheck2,
  Calendar,
  Filter,
  Printer,
  ShieldAlert,
  Download,
  Users,
  BookMarked,
  Image as ImageIcon,
  FileSpreadsheet,
  CheckCircle2,
  RefreshCw
} from 'lucide-react';
import { canAccessReporting, formatTanggalIndo, sanitizeText } from '../../../utils/security';

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
  const [activePanel, setActivePanel] = useState<'cover' | 'laporan' | 'absen' | 'jurnal' | 'dokumentasi'>('cover');

  // Signatures
  const [ttdKepsek, setTtdKepsek] = useState('');
  const [ttdPembina, setTtdPembina] = useState('');
  const [ttdPelatih, setTtdPelatih] = useState('');
  const [ttdKetua, setTtdKetua] = useState('');
  const [ttdSekretaris, setTtdSekretaris] = useState('');

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
        setUsersList(data as UserProfile[]);

        // Auto select default signatories based on roles
        const kepsek = data.find(u => (u.keterangan_jabatan || '').toLowerCase().includes('kepala sekolah'));
        const pembina = data.find(u => (u.keterangan_jabatan || '').toLowerCase().includes('pembina'));
        const pelatih = data.find(u => (u.keterangan_jabatan || '').toLowerCase().includes('pelatih'));
        const ketua = data.find(u => (u.keterangan_jabatan || '').toLowerCase().includes('ketua'));
        const sekretaris = data.find(u => (u.keterangan_jabatan || '').toLowerCase().includes('sekretaris'));

        if (kepsek) setTtdKepsek(kepsek.nama_lengkap);
        if (pembina) setTtdPembina(pembina.nama_lengkap);
        if (pelatih) setTtdPelatih(pelatih.nama_lengkap);
        if (ketua) setTtdKetua(ketua.nama_lengkap);
        if (sekretaris) setTtdSekretaris(sekretaris.nama_lengkap);
      }
    } catch (e) {
      console.warn('Error fetching signatories:', e);
    }
  };

  const handleTarikData = async () => {
    setLoading(true);
    setDataFeedback(null);
    const startDate = `${selectedTahun}-${selectedBulan}-01`;
    const lastDay = new Date(parseInt(selectedTahun, 10), parseInt(selectedBulan, 10), 0).getDate();
    const endDate = `${selectedTahun}-${selectedBulan}-${String(lastDay).padStart(2, '0')}`;

    try {
      let query = supabase
        .from('presensi')
        .select(`*, users_profile:user_id ( id, nama_lengkap, kelas, keterangan_jabatan )`)
        .gte('tanggal_kegiatan', startDate)
        .lte('tanggal_kegiatan', endDate)
        .order('tanggal_kegiatan', { ascending: true });

      if (selectedJenis !== 'Semua Kegiatan') {
        query = query.eq('jenis_kegiatan', selectedJenis);
      }

      const { data: presensiData, error } = await query;
      if (error) throw error;

      const pList = (presensiData as PresensiRecord[]) || [];
      setPresensiList(pList);

      // Extract unique activities
      const mapKegiatan = new Map<string, KegiatanUnik>();
      pList.forEach(p => {
        const key = `${p.tanggal_kegiatan}_${p.nama_kegiatan}`;
        let parsedFotos: string[] = [];
        if (p.foto_dokumentasi_url) {
          try {
            const dec = JSON.parse(p.foto_dokumentasi_url);
            parsedFotos = Array.isArray(dec) ? dec : [p.foto_dokumentasi_url];
          } catch {
            parsedFotos = [p.foto_dokumentasi_url];
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
          parsedFotos.forEach(u => {
            if (!existing.fotos.includes(u)) existing.fotos.push(u);
          });
        }
      });

      const uniqueList = Array.from(mapKegiatan.values());
      setKegiatanList(uniqueList);
      setDataFeedback(`${uniqueList.length} agenda kegiatan & ${pList.length} rekaman presensi berhasil dimuat.`);
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
        <p>Modul pelaporan administrasi resmi hanya dapat diakses oleh Anggota Aktif, Pengurus, dan Pembina PMR SPADAN.</p>
      </div>
    );
  }

  const handlePrint = () => {
    window.print();
  };

  const namaBulan = namaBulanMap[selectedBulan] || 'Bulan';
  const thnInt = parseInt(selectedTahun, 10);
  const blnInt = parseInt(selectedBulan, 10);
  const tahunAjaran = blnInt >= 7 ? `${thnInt}/${thnInt + 1}` : `${thnInt - 1}/${thnInt}`;

  return (
    <div className="pelaporan-module-wrapper">
      {/* HEADER */}
      <div className="agenda-top-bar">
        <div className="agenda-top-title">
          <div className="agenda-icon-cube pelaporan-icon-cube">
            <FileSpreadsheet style={{ width: 22, height: 22 }} />
          </div>
          <div>
            <h3>Modul Pelaporan Administrasi Resmi</h3>
            <p>Penyusunan berkas rekap presensi, jurnal kegiatan, dan lembar dokumentasi cetak F4.</p>
          </div>
        </div>

        <button
          type="button"
          className="btn-print-report"
          onClick={handlePrint}
        >
          <Printer style={{ width: 15, height: 15 }} />
          <span>Cetak Dokumen F4</span>
        </button>
      </div>

      {/* FILTER & PULL DATA CARD */}
      <div className="pelaporan-filter-card">
        <div className="pelaporan-filter-grid">
          <div className="modal-form-group">
            <label>Bulan Laporan</label>
            <select value={selectedBulan} onChange={(e) => setSelectedBulan(e.target.value)}>
              {Object.entries(namaBulanMap).map(([num, name]) => (
                <option key={num} value={num}>{name}</option>
              ))}
            </select>
          </div>

          <div className="modal-form-group">
            <label>Tahun Laporan</label>
            <input
              type="number"
              value={selectedTahun}
              onChange={(e) => setSelectedTahun(e.target.value)}
              min={2020}
              max={2030}
            />
          </div>

          <div className="modal-form-group">
            <label>Kategori Kegiatan</label>
            <select value={selectedJenis} onChange={(e) => setSelectedJenis(e.target.value)}>
              <option value="Semua Kegiatan">Semua Kegiatan</option>
              <option value="Latihan Rutin">Latihan Rutin</option>
              <option value="Tugas Upacara">Tugas Upacara</option>
              <option value="Lomba PMR">Lomba PMR</option>
              <option value="Bakti Sosial">Bakti Sosial</option>
              <option value="Diklat / Pelatihan">Diklat / Pelatihan</option>
              <option value="Rapat Organisasi">Rapat Organisasi</option>
            </select>
          </div>

          <div className="pelaporan-action-btn-col">
            <button
              type="button"
              className="btn-sync-data"
              onClick={handleTarikData}
              disabled={loading}
            >
              <RefreshCw className={loading ? 'spin-anim' : ''} style={{ width: 14, height: 14 }} />
              <span>{loading ? 'Memuat...' : 'Perbarui Data'}</span>
            </button>
          </div>
        </div>

        {dataFeedback && (
          <div className="pelaporan-feedback-note">
            <CheckCircle2 style={{ width: 14, height: 14, color: '#059669', flexShrink: 0 }} />
            <span>{dataFeedback}</span>
          </div>
        )}
      </div>

      {/* SUB-PANEL NAVIGATION */}
      <div className="inv-subtab-bar">
        <button
          type="button"
          className={`subtab-btn ${activePanel === 'cover' ? 'active' : ''}`}
          onClick={() => setActivePanel('cover')}
        >
          <FileText style={{ width: 14, height: 14 }} />
          <span>Cover Depan</span>
        </button>

        <button
          type="button"
          className={`subtab-btn ${activePanel === 'laporan' ? 'active' : ''}`}
          onClick={() => setActivePanel('laporan')}
        >
          <FileCheck2 style={{ width: 14, height: 14 }} />
          <span>Laporan Resmi</span>
        </button>

        <button
          type="button"
          className={`subtab-btn ${activePanel === 'absen' ? 'active' : ''}`}
          onClick={() => setActivePanel('absen')}
        >
          <Users style={{ width: 14, height: 14 }} />
          <span>Daftar Presensi ({presensiList.length})</span>
        </button>

        <button
          type="button"
          className={`subtab-btn ${activePanel === 'jurnal' ? 'active' : ''}`}
          onClick={() => setActivePanel('jurnal')}
        >
          <BookMarked style={{ width: 14, height: 14 }} />
          <span>Jurnal Kegiatan ({kegiatanList.length})</span>
        </button>

        <button
          type="button"
          className={`subtab-btn ${activePanel === 'dokumentasi' ? 'active' : ''}`}
          onClick={() => setActivePanel('dokumentasi')}
        >
          <ImageIcon style={{ width: 14, height: 14 }} />
          <span>Dokumentasi Foto</span>
        </button>
      </div>

      {/* DOCUMENT PAPER PREVIEW (PRINTABLE F4 FORMAT) */}
      <div className="print-document-sheet" id="print-document-sheet">
        {/* 1. PANEL COVER */}
        {activePanel === 'cover' && (
          <div className="doc-cover-wrapper">
            <div className="doc-cover-logo-box">
              <img
                src="https://ndahxwqshyukqpnjkniw.supabase.co/storage/v1/object/public/profil-anggota/LOGO%20PMI%20untuk%20aplikasi.png"
                alt="Logo PMI"
                className="doc-cover-logo"
              />
            </div>

            <div className="doc-cover-heading">
              <h2>LAPORAN ADMINISTRASI & PERTANGGUNGJAWABAN</h2>
              <h3>PALANG MERAH REMAJA (PMR) MADYA</h3>
              <p>UNIT SMP NEGERI 8 BALIKPAPAN</p>
            </div>

            <div className="doc-cover-period-box">
              <h4>BULAN: {namaBulan.toUpperCase()} {selectedTahun}</h4>
              <p>TAHUN AJARAN {tahunAjaran}</p>
            </div>

            <div className="doc-cover-footer-note">
              <p className="lbl">Disusun & Dilaporkan Oleh:</p>
              <p className="org">PENGURUS PMR MADYA SMP NEGERI 8 BALIKPAPAN</p>
              <p className="city">Kota Balikpapan, Kalimantan Timur</p>
            </div>
          </div>
        )}

        {/* 2. PANEL LAPORAN RESMI */}
        {activePanel === 'laporan' && (
          <div className="doc-formal-report">
            {/* KOP SURAT */}
            <div className="doc-kop-surat">
              <div className="doc-kop-logo-left">
                <img
                  src="https://ndahxwqshyukqpnjkniw.supabase.co/storage/v1/object/public/profil-anggota/LOGO%20PMI%20untuk%20aplikasi.png"
                  alt="Logo PMI"
                />
              </div>
              <div className="doc-kop-text">
                <h3>PALANG MERAH REMAJA (PMR) MADYA</h3>
                <h4>UNIT SMP NEGERI 8 BALIKPAPAN</h4>
                <p>Jl. Mayjend Sutoyo No. 8, Klandasan Ilir, Kota Balikpapan, Kalimantan Timur 76113</p>
              </div>
              <div className="doc-kop-logo-right">
                <img
                  src="https://ndahxwqshyukqpnjkniw.supabase.co/storage/v1/object/public/utilitas_ikon/LOGO%20SMP%20NEGERI%208%20BALIKPAPAN%20-%20untuk%20website.png"
                  alt="Logo SMPN 8"
                />
              </div>
            </div>

            <div className="doc-report-title">
              <h4>LAPORAN KEGIATAN BULAN {namaBulan.toUpperCase()} {selectedTahun}</h4>
            </div>

            <div className="doc-section-block">
              <h5>I. PENDAHULUAN</h5>
              <p>
                Puji syukur kita panjatkan ke hadirat Tuhan Yang Maha Esa atas terselenggaranya seluruh program kegiatan
                Palang Merah Remaja (PMR) Madya SMP Negeri 8 Balikpapan pada periode bulan {namaBulan} {selectedTahun}.
                Laporan ini disusun sebagai bentuk transparansi, pertanggungjawaban operasional, dan dokumentasi resmi organisasi.
              </p>
            </div>

            <div className="doc-section-block">
              <h5>II. REKAPITULASI KEGIATAN</h5>
              <p>
                Pada periode ini, telah terlaksana sebanyak <b>{kegiatanList.length} agenda kegiatan</b> yang meliputi latihan
                rutin, tugas upacara bendera, dan operasional layanan kesehatan di Ruang UKS dengan total <b>{presensiList.length} catatan kehadiran</b> relawan muda.
              </p>
            </div>

            <div className="doc-section-block">
              <h5>III. EVALUASI & REKOMENDASI</h5>
              <p>
                Kehadiran relawan muda berjalan dengan tertib dan materi kepalangmerahan tersampaikan dengan baik. Diharapkan
                pada bulan berikutnya logistik obat-obatan UKS tetap terpantau berkala dan latihan simulasi evakuasi tandu dapat ditingkatkan secara konsisten.
              </p>
            </div>

            {/* KOLOM TANDA TANGAN */}
            <div className="doc-signatures-grid">
              <div className="sig-item">
                <p>Mengetahui,</p>
                <p className="sig-role">Pembina PMR</p>
                <div className="sig-space" />
                <p className="sig-name">{ttdPembina || '( ................................... )'}</p>
                <p className="sig-sub">NIP / NUPTK</p>
              </div>

              <div className="sig-item">
                <p>Menyetujui,</p>
                <p className="sig-role">Kepala Sekolah</p>
                <div className="sig-space" />
                <p className="sig-name">{ttdKepsek || '( ................................... )'}</p>
                <p className="sig-sub">NIP / NUPTK</p>
              </div>

              <div className="sig-item">
                <p>Balikpapan, {namaBulan} {selectedTahun}</p>
                <p className="sig-role">Pelatih / Koordinator</p>
                <div className="sig-space" />
                <p className="sig-name">{ttdPelatih || '( ................................... )'}</p>
                <p className="sig-sub">PMR SPADAN</p>
              </div>
            </div>
          </div>
        )}

        {/* 3. PANEL ABSENSI PRESENSI */}
        {activePanel === 'absen' && (
          <div className="doc-absen-panel">
            <div className="doc-subpanel-header">
              <h4>REKAP DAFTAR HADIR ANGGOTA PMR MADYA</h4>
              <p>Bulan: {namaBulan} {selectedTahun} | Unit SMP Negeri 8 Balikpapan</p>
            </div>

            <div className="table-responsive-wrapper">
              <table className="member-data-table doc-table">
                <thead>
                  <tr>
                    <th style={{ width: 40, textAlign: 'center' }}>No</th>
                    <th>Nama Lengkap Anggota</th>
                    <th style={{ width: 90, textAlign: 'center' }}>Kelas</th>
                    <th style={{ width: 70, textAlign: 'center' }}>Hadir</th>
                    <th style={{ width: 70, textAlign: 'center' }}>Izin</th>
                    <th style={{ width: 70, textAlign: 'center' }}>Sakit</th>
                    <th style={{ width: 70, textAlign: 'center' }}>Alpa</th>
                  </tr>
                </thead>
                <tbody>
                  {presensiList.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: 24, color: '#94a3b8' }}>
                        Belum ada data presensi yang tercatat untuk periode {namaBulan} {selectedTahun}.
                      </td>
                    </tr>
                  ) : (
                    (() => {
                      const userStats: Record<string, { nama: string; kelas: string; h: number; i: number; s: number; a: number }> = {};
                      presensiList.forEach(p => {
                        const uid = p.user_id;
                        if (!userStats[uid]) {
                          userStats[uid] = {
                            nama: p.users_profile?.nama_lengkap || 'Anggota',
                            kelas: p.users_profile?.kelas || '-',
                            h: 0, i: 0, s: 0, a: 0
                          };
                        }
                        if (p.status_kehadiran === 'Hadir') userStats[uid].h++;
                        else if (p.status_kehadiran === 'Izin') userStats[uid].i++;
                        else if (p.status_kehadiran === 'Sakit') userStats[uid].s++;
                        else if (p.status_kehadiran === 'Alpa') userStats[uid].a++;
                      });

                      return Object.values(userStats).map((st, idx) => (
                        <tr key={idx}>
                          <td style={{ textAlign: 'center' }}>{idx + 1}</td>
                          <td><strong>{st.nama}</strong></td>
                          <td style={{ textAlign: 'center' }}>{st.kelas}</td>
                          <td style={{ textAlign: 'center', color: '#16a34a', fontWeight: 800 }}>{st.h}</td>
                          <td style={{ textAlign: 'center', color: '#0288d1', fontWeight: 700 }}>{st.i}</td>
                          <td style={{ textAlign: 'center', color: '#f59e0b', fontWeight: 700 }}>{st.s}</td>
                          <td style={{ textAlign: 'center', color: '#dc2626', fontWeight: 700 }}>{st.a}</td>
                        </tr>
                      ));
                    })()
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 4. PANEL JURNAL KEGIATAN */}
        {activePanel === 'jurnal' && (
          <div className="doc-jurnal-panel">
            <div className="doc-subpanel-header">
              <h4>JURNAL KEGIATAN OPERASIONAL PMR</h4>
              <p>Bulan: {namaBulan} {selectedTahun}</p>
            </div>

            <div className="table-responsive-wrapper">
              <table className="member-data-table doc-table">
                <thead>
                  <tr>
                    <th style={{ width: 40, textAlign: 'center' }}>No</th>
                    <th style={{ width: 120 }}>Tanggal</th>
                    <th>Nama & Jenis Kegiatan</th>
                    <th style={{ width: 150 }}>Tempat</th>
                    <th>Uraian / Ringkasan Pelaksanaan</th>
                  </tr>
                </thead>
                <tbody>
                  {kegiatanList.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', padding: 24, color: '#94a3b8' }}>
                        Belum ada data jurnal kegiatan yang tersimpan pada periode ini.
                      </td>
                    </tr>
                  ) : (
                    kegiatanList.map((keg, idx) => (
                      <tr key={idx}>
                        <td style={{ textAlign: 'center' }}>{idx + 1}</td>
                        <td style={{ fontWeight: 600 }}>{formatTanggalIndo(keg.tanggal, false)}</td>
                        <td>
                          <strong>{keg.judul}</strong>
                          <div style={{ fontSize: 11, color: '#be123c', fontWeight: 700, marginTop: 2 }}>
                            {keg.jenis}
                          </div>
                        </td>
                        <td>{keg.tempat}</td>
                        <td>{keg.deskripsi}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 5. PANEL DOKUMENTASI FOTO */}
        {activePanel === 'dokumentasi' && (
          <div className="doc-photos-panel">
            <div className="doc-subpanel-header">
              <h4>LEMBAR DOKUMENTASI KEGIATAN PMR</h4>
              <p>Bulan: {namaBulan} {selectedTahun}</p>
            </div>

            {kegiatanList.filter(k => k.fotos.length > 0).length === 0 ? (
              <div style={{ textAlign: 'center', padding: 36, color: '#94a3b8' }}>
                Belum ada foto dokumentasi yang diunggah untuk periode ini.
              </div>
            ) : (
              <div className="doc-photos-grid">
                {kegiatanList.map(keg =>
                  keg.fotos.map((url, fIdx) => (
                    <div key={`${keg.tanggal}-${fIdx}`} className="doc-photo-item">
                      <div className="doc-photo-img-box">
                        <img src={url} alt={keg.judul} />
                      </div>
                      <div className="doc-photo-meta">
                        <strong>{keg.judul}</strong>
                        <span>{formatTanggalIndo(keg.tanggal, false)} • {keg.tempat}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
