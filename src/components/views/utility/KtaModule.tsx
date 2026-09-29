import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { supabase } from '../../../services/supabase';
import { UserProfile } from '../../../types';
import {
  IdCard,
  Lock,
  ShieldAlert,
  Search,
  Filter,
  Printer,
  Sparkles,
  UserX,
  CheckCircle2,
  QrCode,
  X,
  CreditCard,
  ShieldCheck,
  Layers,
  User
} from 'lucide-react';
import { formatTanggalIndo, isAdmin } from '../../../utils/security';

export const KtaModule: React.FC = () => {
  const { profile } = useAuth();
  const [members, setMembers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [kategoriFilter, setKategoriFilter] = useState('');
  const [cardSideView, setCardSideView] = useState<'both' | 'front' | 'back'>('both');

  const logoPmiUrl = 'https://ndahxwqshyukqpnjkniw.supabase.co/storage/v1/object/public/profil-anggota/LOGO%20PMI%20untuk%20aplikasi.png';
  const logoSmpn8Url = 'https://ndahxwqshyukqpnjkniw.supabase.co/storage/v1/object/public/utilitas_ikon/LOGO%20SMP%20NEGERI%208%20BALIKPAPAN%20-%20untuk%20website.png';

  const userIsAdmin = isAdmin(profile);

  useEffect(() => {
    if (!profile) return;

    const loadMembers = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('users_profile')
          .select('*')
          .order('nama_lengkap', { ascending: true });

        if (error) return;
        const valid = (data as UserProfile[] || []).filter(u => {
          const ket = (u.keterangan_jabatan || '').toLowerCase();
          const jab = (u.jabatan || '').toLowerCase();
          return ket !== 'non-aktif' && jab !== 'non-aktif';
        });

        // If ordinary member, only show own KTA
        if (!userIsAdmin && profile) {
          setMembers(valid.filter(u => u.id === profile.id));
        } else {
          setMembers(valid);
        }
      } catch (err) {
        console.error('Error loading members for KTA:', err);
      } finally {
        setLoading(false);
      }
    };

    loadMembers();
  }, [profile, userIsAdmin]);

  // Access validation
  if (!profile) {
    return (
      <div className="kta-restricted-box">
        <div className="icon-wrap">
          <Lock style={{ width: 44, height: 44, color: '#be123c' }} />
        </div>
        <h3>Akses Terbatas</h3>
        <p>Silakan masuk menggunakan akun PMR terdaftar untuk melihat dan mencetak Kartu Tanda Anggota (KTA).</p>
      </div>
    );
  }

  const role = (profile.jabatan || '').toLowerCase();
  const ket = (profile.keterangan_jabatan || '').toLowerCase();
  if (role === 'non-aktif' || ket === 'non-aktif') {
    return (
      <div className="kta-restricted-box error-theme">
        <div className="icon-wrap">
          <ShieldAlert style={{ width: 44, height: 44, color: '#dc2626' }} />
        </div>
        <h3>Akun Belum Aktif</h3>
        <p>Status akun Anda masih menunggu persetujuan Pembina PMR SPADAN.</p>
      </div>
    );
  }

  const handlePrintCard = (userId: string, side: 'both' | 'front' | 'back' = 'both') => {
    const frontEl = document.getElementById(`card-front-${userId}`);
    const backEl = document.getElementById(`card-back-${userId}`);
    if (!frontEl && !backEl) return;

    // Create a dedicated print frame container
    const existingPrintContainer = document.getElementById('print-area-container');
    if (existingPrintContainer) {
      existingPrintContainer.remove();
    }

    const printContainer = document.createElement('div');
    printContainer.id = 'print-area-container';

    if ((side === 'both' || side === 'front') && frontEl) {
      const cloneFront = frontEl.cloneNode(true) as HTMLElement;
      cloneFront.style.transform = 'none';
      printContainer.appendChild(cloneFront);
    }

    if ((side === 'both' || side === 'back') && backEl) {
      const cloneBack = backEl.cloneNode(true) as HTMLElement;
      cloneBack.style.transform = 'none';
      printContainer.appendChild(cloneBack);
    }

    document.body.appendChild(printContainer);

    window.print();

    setTimeout(() => {
      if (document.body.contains(printContainer)) {
        document.body.removeChild(printContainer);
      }
    }, 1000);
  };

  const filteredMembers = members.filter(u => {
    const q = searchQuery.toLowerCase();
    const matchSearch =
      (u.nama_lengkap || '').toLowerCase().includes(q) ||
      (u.nama_panggilan || '').toLowerCase().includes(q) ||
      (u.nisn || '').toLowerCase().includes(q);
    const uKet = (u.keterangan_jabatan || '').toLowerCase();

    let matchKategori = true;
    if (kategoriFilter === 'alumni') {
      matchKategori = uKet.includes('alumni');
    } else if (kategoriFilter === 'aktif') {
      matchKategori = !uKet.includes('alumni');
    }

    return matchSearch && matchKategori;
  });

  const myData = members.find(u => u.id === profile.id);

  return (
    <div className="kta-module-wrapper">
      {/* HEADER BAR */}
      <div className="agenda-top-bar">
        <div className="agenda-top-title">
          <div className="agenda-icon-cube kta-icon-cube">
            <IdCard style={{ width: 22, height: 22 }} />
          </div>
          <div>
            <h3>Cetak Kartu Tanda Anggota (KTA) Portrait</h3>
            <p>Format resmi standar kartu CR-80 Portrait dilengkapi QR Code verifikasi dan Tri Bakti PMR.</p>
          </div>
        </div>

        <div className="kta-badge-spec">
          <span>CR-80 PORTRAIT (54 × 86 mm)</span>
        </div>
      </div>

      {/* ALERT MISSING PHOTO IF MY PROFILE HAS NO PHOTO */}
      {myData && !myData.foto_profil_url && (
        <div className="alert-upload-photo">
          <Sparkles style={{ width: 18, height: 18, flexShrink: 0, color: '#d97706' }} />
          <span>
            Pas foto Anda belum diunggah. Silakan lengkapi melalui menu <b>Edit Profil</b> agar pas foto resmi Anda muncul di kartu identitas!
          </span>
        </div>
      )}

      {/* TOOLBAR SEARCH & FILTER (ADMIN ONLY SHOWS FILTER) */}
      {userIsAdmin && (
        <div className="kta-toolbar-clean">
          <div className="toolbar-search-box">
            <Search style={{ width: 16, height: 16, color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="Cari nama anggota atau NISN..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                className="btn-clear-search"
                onClick={() => setSearchQuery('')}
                title="Hapus pencarian"
              >
                <X style={{ width: 12, height: 12 }} />
              </button>
            )}
          </div>

          <div className="kta-filter-select-box">
            <Filter style={{ width: 14, height: 14, color: '#64748b' }} />
            <select
              value={kategoriFilter}
              onChange={(e) => setKategoriFilter(e.target.value)}
            >
              <option value="">Semua Status ({members.length})</option>
              <option value="aktif">Anggota Aktif</option>
              <option value="alumni">Korps Alumni</option>
            </select>
          </div>

          <div className="kta-view-switch-group">
            <button
              type="button"
              className={`btn-kta-view-chip ${cardSideView === 'both' ? 'active' : ''}`}
              onClick={() => setCardSideView('both')}
              title="Tampilkan Kedua Sisi (Depan & Belakang)"
            >
              <Layers style={{ width: 13, height: 13 }} />
              <span>Sepasang</span>
            </button>
            <button
              type="button"
              className={`btn-kta-view-chip ${cardSideView === 'front' ? 'active' : ''}`}
              onClick={() => setCardSideView('front')}
              title="Tampilkan Sisi Depan Saja"
            >
              <CreditCard style={{ width: 13, height: 13 }} />
              <span>Depan</span>
            </button>
            <button
              type="button"
              className={`btn-kta-view-chip ${cardSideView === 'back' ? 'active' : ''}`}
              onClick={() => setCardSideView('back')}
              title="Tampilkan Sisi Belakang Saja"
            >
              <ShieldCheck style={{ width: 13, height: 13 }} />
              <span>Belakang</span>
            </button>
          </div>
        </div>
      )}

      {/* GRID KARTU KTA (PORTRAIT FORMAT) */}
      <div className="kta-grid-list">
        {loading ? (
          <div className="kta-loading-state">
            <div className="spin-anim" style={{ display: 'inline-block', marginBottom: 8 }}>
              <IdCard style={{ width: 28, height: 28, color: '#be123c' }} />
            </div>
            <div>Memuat data kartu identitas PMR SPADAN...</div>
          </div>
        ) : filteredMembers.length === 0 ? (
          <div className="kta-empty-state">
            <UserX style={{ width: 36, height: 36, color: '#94a3b8', margin: '0 auto 8px' }} />
            <p>Tidak ada kartu anggota yang sesuai dengan pencarian.</p>
          </div>
        ) : (
          filteredMembers.map(userItem => {
            const uKet = (userItem.keterangan_jabatan || '').toLowerCase();
            const isAlumni = uKet.includes('alumni');
            const hasPhoto = Boolean(userItem.foto_profil_url && userItem.foto_profil_url.trim() !== '');

            const hasBlood = Boolean(userItem.golongan_darah && userItem.golongan_darah.trim() !== '');
            const rhesusSymbol = userItem.rhesus_darah === 'Positif' ? '+' : (userItem.rhesus_darah === 'Negatif' ? '-' : '');
            const bloodDisplay = hasBlood ? `${userItem.golongan_darah}${rhesusSymbol}` : '-';

            const statusTeks = isAlumni ? 'ALUMNI RESMI' : 'AKTIF';
            const shortId = userItem.id.substring(0, 8).toUpperCase();
            const qrText = `KARTU IDENTITAS RESMI PMR SPADAN\nID: PMR-8-${shortId}\nNama: ${userItem.nama_lengkap}\nGol. Darah: ${bloodDisplay}\nTgl Lahir: ${formatTanggalIndo(userItem.tanggal_lahir, false)}\nStatus: ${statusTeks}\nUnit: SMP Negeri 8 Balikpapan`;
            const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&margin=1&data=${encodeURIComponent(qrText)}`;

            const cardThemeClass = isAlumni ? 'card-theme-alumni' : 'card-theme-pmr';
            const headerTitle = isAlumni ? 'KARTU TANDA ALUMNI' : 'KARTU TANDA ANGGOTA';
            const headerSub = isAlumni ? 'KORPS ALUMNI PMR SPADAN' : 'MADYA SMP NEGERI 8 BALIKPAPAN';

            return (
              <div key={userItem.id} className="kta-portrait-card-container">
                {/* MEMBER HEADER BAR */}
                <div className="kta-member-card-header">
                  <div className="kta-member-identity-left">
                    {hasPhoto ? (
                      <img src={userItem.foto_profil_url!} alt={userItem.nama_lengkap} className="kta-avatar-mini" />
                    ) : (
                      <div className="kta-avatar-mini" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <User style={{ width: 18, height: 18, color: '#94a3b8' }} />
                      </div>
                    )}
                    <div style={{ minWidth: 0 }}>
                      <div className="kta-member-name-text" title={userItem.nama_lengkap}>{userItem.nama_lengkap}</div>
                      <div className="kta-member-meta-sub">
                        Kelas {userItem.kelas || '-'} · NISN: {userItem.nisn || '-'}
                      </div>
                    </div>
                  </div>
                  <span
                    style={{
                      background: isAlumni ? '#eef2ff' : '#ecfdf5',
                      color: isAlumni ? '#3730a3' : '#065f46',
                      border: `1px solid ${isAlumni ? '#c7d2fe' : '#a7f3d0'}`,
                      fontSize: '10px',
                      fontWeight: 800,
                      padding: '3px 8px',
                      borderRadius: '8px',
                      flexShrink: 0
                    }}
                  >
                    {isAlumni ? 'KORPS ALUMNI' : 'ANGGOTA AKTIF'}
                  </span>
                </div>

                <div className="card-pair-wrapper">
                  {/* ========================================================
                      KARTU SISI DEPAN (PORTRAIT CR-80)
                      ======================================================== */}
                  {(cardSideView === 'both' || cardSideView === 'front') && (
                    <div className="kta-side-block">
                      <div className="kta-side-label">
                        <CreditCard style={{ width: 11, height: 11, color: isAlumni ? '#4338ca' : '#be123c' }} />
                        <span>Sisi Depan</span>
                      </div>
                      <div className={`id-card-portrait id-card-front-portrait ${cardThemeClass}`} id={`card-front-${userItem.id}`}>
                        {/* Background Security Wave Watermark */}
                        <div className="card-bg-watermark">
                          <div className="watermark-emblem">PMR</div>
                        </div>

                    {/* TOP HEADER */}
                    <div className="p-card-header">
                      <div className="p-header-logos">
                        <div className="p-logo-circle">
                          <img src={logoPmiUrl} alt="Logo PMI" />
                        </div>
                        <div className="p-logo-circle">
                          <img src={logoSmpn8Url} alt="Logo SMPN 8" />
                        </div>
                      </div>
                      <div className="p-header-org">PALANG MERAH REMAJA (PMR) MADYA</div>
                      <div className="p-header-sub">SMP NEGERI 8 BALIKPAPAN</div>
                      <div className="p-header-badge-row">
                        <span className="p-header-badge">{headerTitle}</span>
                      </div>
                    </div>

                    {/* BODY: PHOTO, BLOOD BADGE, NAME, ROLE */}
                    <div className="p-card-body">
                      {/* Photo Container */}
                      <div className="p-photo-wrapper">
                        {hasPhoto ? (
                          <img
                            src={userItem.foto_profil_url!}
                            className="p-member-photo"
                            alt={userItem.nama_lengkap}
                          />
                        ) : (
                          <div className="p-photo-placeholder">
                            <UserX style={{ width: 32, height: 32, color: 'rgba(255,255,255,0.7)' }} />
                            <span>Foto Belum Ada</span>
                          </div>
                        )}

                        {/* Floating Blood Badge */}
                        {hasBlood && (
                          <div className="p-blood-pill" title={`Golongan Darah: ${bloodDisplay}`}>
                            <span className="b-lbl">GOL</span>
                            <span className="b-val">{bloodDisplay}</span>
                          </div>
                        )}
                      </div>

                      {/* Name & Title */}
                      <div className="p-identity-block">
                        <div className="p-member-name" title={userItem.nama_lengkap}>
                          {userItem.nama_lengkap}
                        </div>

                        <div className="p-member-role-badge">
                          {isAlumni ? (
                            'KORPS ALUMNI'
                          ) : (
                            userItem.keterangan_jabatan || userItem.jabatan || 'Anggota Madya'
                          )}
                        </div>

                        <div className="p-meta-grid">
                          <div className="p-meta-item">
                            <span className="k">NO. ANGGOTA</span>
                            <span className="v">PMR8-{shortId}</span>
                          </div>
                          <div className="p-meta-item">
                            <span className="k">TH. GABUNG</span>
                            <span className="v">{userItem.tahun_bergabung || '-'}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* FOOTER: QR CODE & DIGITAL SEAL */}
                    <div className="p-card-footer">
                      <div className="p-qr-box">
                        <img src={qrCodeUrl} alt="QR Code Verifikasi" className="p-qr-img" />
                      </div>
                      <div className="p-footer-info">
                        <div className="p-verify-tag">
                          <CheckCircle2 style={{ width: 10, height: 10 }} />
                          <span>TERVERIFIKASI</span>
                        </div>
                        <div className="p-footer-note">Pindai kode untuk mengecek status keanggotaan sah.</div>
                      </div>
                    </div>
                  </div>
                    </div>
                  )}

                  {/* ========================================================
                      KARTU SISI BELAKANG (PORTRAIT CR-80)
                      ======================================================== */}
                  {(cardSideView === 'both' || cardSideView === 'back') && (
                    <div className="kta-side-block">
                      <div className="kta-side-label">
                        <ShieldCheck style={{ width: 11, height: 11, color: isAlumni ? '#4338ca' : '#be123c' }} />
                        <span>Sisi Belakang</span>
                      </div>
                      <div className={`id-card-portrait id-card-back-portrait ${cardThemeClass}`} id={`card-back-${userItem.id}`}>
                        {/* Header Sisi Belakang */}
                        <div className="p-back-header">
                          <div className="p-back-logos">
                            <img src={logoPmiUrl} alt="PMI" className="back-mini-logo" />
                            <span className="back-header-title">TRI BAKTI PALANG MERAH REMAJA</span>
                            <img src={logoSmpn8Url} alt="SMPN 8" className="back-mini-logo" />
                          </div>
                        </div>

                        {/* Isi Tri Bakti */}
                        <div className="p-back-body">
                          <div className="p-tri-bakti-card">
                            <ol className="p-tri-list">
                              <li>
                                <b>Meningkatkan</b> keterampilan hidup sehat.
                              </li>
                              <li>
                                <b>Berkarya</b> dan berbakti di masyarakat.
                              </li>
                              <li>
                                <b>Mempererat</b> persahabatan nasional dan internasional.
                              </li>
                            </ol>
                          </div>

                          {/* 7 Prinsip */}
                          <div className="p-prinsip-section">
                            <div className="p-prinsip-heading">7 PRINSIP DASAR GERAKAN PM/BSM</div>
                            <div className="p-prinsip-pills-grid">
                              <span>1. Kemanusiaan</span>
                              <span>2. Kesamaan</span>
                              <span>3. Kenetralan</span>
                              <span>4. Kemandirian</span>
                              <span>5. Kesukarelaan</span>
                              <span>6. Kesatuan</span>
                              <span>7. Kesemestaan</span>
                            </div>
                          </div>

                          {/* Ketentuan Pemakaian */}
                          <div className="p-terms-text">
                            Kartu ini adalah identitas resmi anggota PMR Madya SMPN 8 Balikpapan. Wajib dibawa saat bertugas & kegiatan kemanusiaan.
                          </div>
                        </div>

                        {/* Pengesahan / Tanda Tangan */}
                        <div className="p-back-footer">
                          <div className="p-sign-block">
                            <div className="p-sign-city">Balikpapan, {new Date().getFullYear()}</div>
                            <div className="p-sign-role">{isAlumni ? 'Koordinator Korps Alumni' : 'Pembina PMR Madya'}</div>
                            <div className="p-sign-line"></div>
                            <div className="p-sign-school">SMP NEGERI 8 BALIKPAPAN</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* ACTION BAR */}
                <div className="kta-action-bar">
                  <div className="kta-btn-cluster">
                    <button
                      type="button"
                      className={`btn-print-portrait btn-print-main ${isAlumni ? 'btn-alumni-style' : ''}`}
                      onClick={() => handlePrintCard(userItem.id, 'both')}
                      title="Cetak Sisi Depan & Belakang Sekaligus"
                    >
                      <Printer style={{ width: 15, height: 15 }} />
                      <span>Cetak KTA (Sepasang)</span>
                    </button>
                    <div className="kta-btn-subgroup">
                      <button
                        type="button"
                        className="btn-print-sub"
                        onClick={() => handlePrintCard(userItem.id, 'front')}
                        title="Cetak Sisi Depan Saja"
                      >
                        <CreditCard style={{ width: 13, height: 13, color: isAlumni ? '#4338ca' : '#be123c' }} />
                        <span>Depan Saja</span>
                      </button>
                      <button
                        type="button"
                        className="btn-print-sub"
                        onClick={() => handlePrintCard(userItem.id, 'back')}
                        title="Cetak Sisi Belakang Saja"
                      >
                        <ShieldCheck style={{ width: 13, height: 13, color: isAlumni ? '#4338ca' : '#be123c' }} />
                        <span>Belakang Saja</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
