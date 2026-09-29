import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../services/supabase';
import { UtilitasEksternal, UtilitySubModule } from '../../types';
import {
  Boxes,
  Calendar,
  IdCard,
  BookOpen,
  FileSpreadsheet,
  Plus,
  ArrowLeft,
  ExternalLink,
  X,
  BriefcaseMedical,
  ChevronRight,
  ArrowUpRight
} from 'lucide-react';
import {
  isAdmin,
  isSafeUrl,
  validateImageFile,
  compressImage,
  sanitizeText,
  canAccessKTA,
  canAccessReporting
} from '../../utils/security';

import { InventarisModule } from './utility/InventarisModule';
import { KalenderModule } from './utility/KalenderModule';
import { KtaModule } from './utility/KtaModule';
import { MateriModule } from './utility/MateriModule';
import { PelaporanModule } from './utility/PelaporanModule';

interface UtilityViewProps {
  initialSubModule?: UtilitySubModule;
}

export const UtilityView: React.FC<UtilityViewProps> = ({ initialSubModule = null }) => {
  const { profile } = useAuth();
  const [activeSubModule, setActiveSubModule] = useState<UtilitySubModule>(initialSubModule);
  const [externalLinks, setExternalLinks] = useState<UtilitasEksternal[]>([]);

  // Add Link Modal
  const [isAddLinkModalOpen, setIsAddLinkModalOpen] = useState(false);
  const [linkNama, setLinkNama] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [linkAkses, setLinkAkses] = useState('guest');
  const [linkIkonFile, setLinkIkonFile] = useState<File | null>(null);
  const [linkSubmitting, setLinkSubmitting] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);

  const userIsAdmin = isAdmin(profile);

  useEffect(() => {
    if (initialSubModule) {
      setActiveSubModule(initialSubModule);
    }
  }, [initialSubModule]);

  // Load external utility links
  const fetchExternalLinks = async () => {
    try {
      const { data, error } = await supabase.from('utilitas_eksternal').select('*');
      if (error) throw error;
      setExternalLinks((data as UtilitasEksternal[]) || []);
    } catch (e) {
      console.warn('Gagal memuat link utilitas eksternal:', e);
    }
  };

  useEffect(() => {
    fetchExternalLinks();
  }, []);

  const handleOpenModule = (sub: UtilitySubModule) => {
    if (sub === 'kta' && !canAccessKTA(profile)) {
      alert('Akses Ditolak: Modul KTA hanya tersedia untuk anggota aktif atau alumni.');
      return;
    }
    if (sub === 'pelaporan' && !canAccessReporting(profile)) {
      alert('Akses Ditolak: Modul Pelaporan memerlukan status anggota aktif atau pengurus.');
      return;
    }
    setActiveSubModule(sub);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCloseModule = () => {
    setActiveSubModule(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAddLinkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLinkError(null);

    const safe = isSafeUrl(linkUrl.trim());
    if (!safe) {
      setLinkError('URL target tidak valid. Harus diawali dengan http:// atau https://');
      return;
    }

    if (!linkIkonFile) {
      setLinkError('Ikon alat wajib diunggah.');
      return;
    }

    const val = validateImageFile(linkIkonFile);
    if (!val.valid) {
      setLinkError(val.error || 'File tidak valid');
      return;
    }

    setLinkSubmitting(true);
    try {
      const compressed = await compressImage(linkIkonFile, 400, 0.75);
      const fileName = `app_icon_${crypto.randomUUID()}.jpg`;

      const { error: upErr } = await supabase.storage
        .from('utilitas_ikon')
        .upload(fileName, compressed.blob, { contentType: 'image/jpeg' });

      if (upErr) throw upErr;

      const { data: pubData } = supabase.storage
        .from('utilitas_ikon')
        .getPublicUrl(fileName);

      const payload = {
        nama: sanitizeText(linkNama),
        target_url: linkUrl.trim(),
        akses_minimal: linkAkses,
        ikon_url: pubData.publicUrl
      };

      const { error: insErr } = await supabase.from('utilitas_eksternal').insert(payload);
      if (insErr) throw insErr;

      alert('Tautan alat baru berhasil ditambahkan!');
      setIsAddLinkModalOpen(false);
      setLinkNama('');
      setLinkUrl('');
      setLinkIkonFile(null);
      await fetchExternalLinks();
    } catch (err: any) {
      setLinkError(err.message || 'Gagal menyimpan tautan.');
    } finally {
      setLinkSubmitting(false);
    }
  };

  const handleDeleteExternalLink = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!userIsAdmin) return;
    if (!window.confirm('Apakah Anda yakin ingin menghapus tautan alat ini?')) return;

    try {
      const { error } = await supabase.from('utilitas_eksternal').delete().eq('id', id);
      if (error) throw error;
      await fetchExternalLinks();
    } catch (err: any) {
      alert('Gagal menghapus: ' + err.message);
    }
  };

  // If a submodule is open, render in-app viewer with clean breadcrumb
  if (activeSubModule) {
    let moduleTitle = 'Modul Utilitas';
    if (activeSubModule === 'inventaris') moduleTitle = 'Inventari UKS-PMR';
    else if (activeSubModule === 'kalender') moduleTitle = 'Kalender & Agenda Tahunan';
    else if (activeSubModule === 'kta') moduleTitle = 'Cetak KTA Digital (Portrait CR-80)';
    else if (activeSubModule === 'materi') moduleTitle = 'Pustaka Materi & Dokumen Belajar';
    else if (activeSubModule === 'pelaporan') moduleTitle = 'Pelaporan Administrasi Resmi';

    return (
      <div className="inapp-viewer-container">
        {/* TOP CONTROLLER BAR */}
        <div className="inapp-viewer-header">
          <button
            type="button"
            className="btn-back-util"
            onClick={handleCloseModule}
            title="Kembali ke Menu Utilitas"
          >
            <ArrowLeft style={{ width: 15, height: 15 }} />
            <span className="btn-back-label">Kembali</span>
          </button>

          <div className="inapp-breadcrumb">
            <span className="bc-parent" onClick={handleCloseModule}>Utilitas</span>
            <ChevronRight style={{ width: 14, height: 14, color: '#94a3b8' }} />
            <span className="bc-active">{moduleTitle}</span>
          </div>
        </div>

        {/* ACTIVE SUBMODULE COMPONENT */}
        <div className="inapp-viewer-content">
          {activeSubModule === 'inventaris' && <InventarisModule />}
          {activeSubModule === 'kalender' && <KalenderModule />}
          {activeSubModule === 'kta' && <KtaModule />}
          {activeSubModule === 'materi' && <MateriModule />}
          {activeSubModule === 'pelaporan' && <PelaporanModule />}
        </div>
      </div>
    );
  }

  // Core PMR utility modules with rich aesthetic configuration
  const coreTools = [
    {
      id: 'inventaris' as UtilitySubModule,
      title: 'Inventari UKS-PMR',
      desc: 'Pencatatan stok obat, logistik P3K, tandu & inventarisasi medis',
      badge: 'MODUL',
      iconUrl: 'https://ndahxwqshyukqpnjkniw.supabase.co/storage/v1/object/public/utilitas_ikon/logo%20inventaris%20barang.png',
      accentColor: '#ea580c',
      accentBg: '#fff7ed',
      accentBorder: '#fed7aa',
      accentGlow: 'rgba(234, 88, 12, 0.14)',
      accentLight: 'rgba(254, 215, 170, 0.45)'
    },
    {
      id: 'kalender' as UtilitySubModule,
      title: 'Agenda Tahunan',
      desc: 'Kalender program kerja, jadwal latihan & agenda penugasan PMR',
      badge: 'MODUL',
      iconUrl: 'https://ndahxwqshyukqpnjkniw.supabase.co/storage/v1/object/public/utilitas_ikon/kalender%20dan%20agenda.png',
      accentColor: '#059669',
      accentBg: '#ecfdf5',
      accentBorder: '#a7f3d0',
      accentGlow: 'rgba(5, 150, 105, 0.14)',
      accentLight: 'rgba(167, 243, 208, 0.45)'
    },
    {
      id: 'kta' as UtilitySubModule,
      title: 'Cetak KTA Digital',
      desc: 'Generator kartu tanda anggota relawan standar portrait CR-80',
      badge: 'MODUL',
      iconUrl: 'https://ndahxwqshyukqpnjkniw.supabase.co/storage/v1/object/public/utilitas_ikon/logo%20KTA%20PMR.png',
      accentColor: '#be123c',
      accentBg: '#fff1f2',
      accentBorder: '#fecdd3',
      accentGlow: 'rgba(190, 18, 60, 0.14)',
      accentLight: 'rgba(254, 205, 211, 0.45)'
    },
    {
      id: 'materi' as UtilitySubModule,
      title: 'Pustaka Materi',
      desc: 'Kumpulan modul PP, PK, donor darah, tandu & video pembelajaran',
      badge: 'MODUL',
      iconUrl: 'https://ndahxwqshyukqpnjkniw.supabase.co/storage/v1/object/public/utilitas_ikon/logo%20pustaka%20materi.png',
      accentColor: '#2563eb',
      accentBg: '#eff6ff',
      accentBorder: '#bfdbfe',
      accentGlow: 'rgba(37, 99, 235, 0.14)',
      accentLight: 'rgba(191, 219, 254, 0.45)'
    },
    {
      id: 'pelaporan' as UtilitySubModule,
      title: 'Pelaporan Resmi',
      desc: 'Format baku administrasi, berita acara & pelaporan kegiatan dinas',
      badge: 'MODUL',
      iconUrl: 'https://ndahxwqshyukqpnjkniw.supabase.co/storage/v1/object/public/utilitas_ikon/logo%20laporan%20kegaitan.png',
      accentColor: '#9333ea',
      accentBg: '#faf5ff',
      accentBorder: '#e9d5ff',
      accentGlow: 'rgba(147, 51, 234, 0.14)',
      accentLight: 'rgba(233, 213, 255, 0.45)'
    }
  ];

  return (
    <div className="utilitas-workspace-wrapper">
      {/* 1. HEADER PANEL */}
      <div className="agenda-top-bar" id="utilitas-header-panel">
        <div className="agenda-top-title">
          <div className="agenda-icon-cube util-icon-cube">
            <BriefcaseMedical style={{ width: 22, height: 22 }} />
          </div>
          <div>
            <h3>Alat Operasional & Utilitas PMR SPADAN</h3>
          </div>
        </div>

        {userIsAdmin && (
          <button
            type="button"
            className="btn-agenda-add"
            onClick={() => setIsAddLinkModalOpen(true)}
          >
            <Plus style={{ width: 16, height: 16 }} />
            <span>Tambah Link Alat</span>
          </button>
        )}
      </div>

      {/* 2. MAIN GRID UTILITY APPS (OUT-OF-THE-BOX MODERN BENTO TILES) */}
      <div className="util-grid-container" id="utilitas-main-grid">
        {coreTools.map(tool => (
          <div
            key={tool.id}
            className="util-modern-card"
            style={{
              '--accent-color': tool.accentColor,
              '--accent-bg': tool.accentBg,
              '--accent-border': tool.accentBorder,
              '--accent-glow': tool.accentGlow,
              '--accent-light': tool.accentLight
            } as React.CSSProperties}
            onClick={() => handleOpenModule(tool.id)}
          >
            <div className="util-card-ambient" />

            <div className="util-card-header">
              <img
                src={tool.iconUrl}
                alt={tool.title}
                className="util-tool-logo-direct"
              />
              <div className="util-action-icon-circle" title="Buka Modul">
                <ArrowUpRight style={{ width: 15, height: 15 }} />
              </div>
            </div>

            <div className="util-card-body">
              <h4 className="util-tool-name">{tool.title}</h4>
              <p className="util-tool-desc">{tool.desc}</p>
            </div>
          </div>
        ))}

        {/* DYNAMIC EXTERNAL LINKS */}
        {externalLinks.map(app => {
          const accentColor = app.warna_aksen || '#0d9488';
          const accentBg = app.warna_bg || '#f0fdfa';
          return (
            <div
              key={app.id}
              className="util-modern-card util-card-external"
              style={{
                '--accent-color': accentColor,
                '--accent-bg': accentBg,
                '--accent-border': '#ccfbf1',
                '--accent-glow': 'rgba(13, 148, 136, 0.15)',
                '--accent-light': 'rgba(204, 251, 241, 0.45)'
              } as React.CSSProperties}
              onClick={() => window.open(app.target_url, '_blank', 'noopener,noreferrer')}
            >
              <div className="util-card-ambient" />

              <div className="util-card-header">
                <img src={app.ikon_url} alt={app.nama} className="util-tool-logo-direct" />
                <div className="util-header-actions-right">
                  {userIsAdmin && (
                    <button
                      type="button"
                      className="btn-del-link-inline"
                      onClick={(e) => handleDeleteExternalLink(app.id, e)}
                      title="Hapus Tautan"
                      aria-label="Hapus Tautan"
                    >
                      <X style={{ width: 12, height: 12 }} />
                    </button>
                  )}
                  <div className="util-action-icon-circle" title="Akses Link">
                    <ExternalLink style={{ width: 14, height: 14 }} />
                  </div>
                </div>
              </div>

              <div className="util-card-body">
                <h4 className="util-tool-name">{app.nama}</h4>
                <p className="util-tool-desc">Tautan eksternal terintegrasi ke perkakas web PMR SPADAN</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL TAMBAH LINK ALAT */}
      {isAddLinkModalOpen && (
        <div className="app-modal-backdrop active">
          <div className="app-modal-card" style={{ maxWidth: 440 }}>
            <div className="app-modal-header">
              <h3>Tambah Tautan Alat Eksternal</h3>
              <button
                type="button"
                className="app-modal-close"
                onClick={() => setIsAddLinkModalOpen(false)}
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleAddLinkSubmit} className="modal-form-wrapper">
              <div className="app-modal-body">
                {linkError && (
                  <div style={{ background: '#fee2e2', color: '#b91c1c', padding: '10px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600 }}>
                    {linkError}
                  </div>
                )}

                <div className="modal-form-group">
                  <label>Nama Alat / Aplikasi *</label>
                  <input
                    type="text"
                    value={linkNama}
                    onChange={(e) => setLinkNama(e.target.value)}
                    placeholder="Contoh: Canva Desain PMR"
                    required
                  />
                </div>

                <div className="modal-form-group">
                  <label>URL / Tautan Aplikasi *</label>
                  <input
                    type="url"
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    placeholder="https://..."
                    required
                  />
                </div>

                <div className="modal-form-group">
                  <label>Akses Minimal</label>
                  <select value={linkAkses} onChange={(e) => setLinkAkses(e.target.value)}>
                    <option value="guest">Tamu / Umum (Guest)</option>
                    <option value="anggota">Anggota Aktif</option>
                    <option value="pengurus">Pengurus Inti</option>
                    <option value="admin">Pembina / Admin</option>
                  </select>
                </div>

                <div className="modal-form-group">
                  <label>Ikon Alat (Gambar PNG, JPG, WebP) *</label>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setLinkIkonFile(e.target.files[0]);
                      }
                    }}
                    required
                    style={{ padding: 8, border: '1px dashed #cbd5e1' }}
                  />
                </div>
              </div>

              <div className="app-modal-footer">
                <button
                  type="button"
                  className="btn-modal-cancel"
                  onClick={() => setIsAddLinkModalOpen(false)}
                  disabled={linkSubmitting}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="btn-modal-submit"
                  disabled={linkSubmitting}
                >
                  {linkSubmitting ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
