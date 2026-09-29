import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { supabase } from '../../../services/supabase';
import { InventarisBarang, ProfilRuangUks, InventarisUsulan } from '../../../types';
import {
  Boxes,
  Home,
  FileSpreadsheet,
  Search,
  Filter,
  Plus,
  Edit2,
  Trash2,
  Eye,
  Camera,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Building,
  Image as ImageIcon,
  MessageSquare,
  Maximize2,
  Bed,
  Droplets,
  ShieldCheck,
  ChevronDown,
  X
} from 'lucide-react';
import {
  isAdmin,
  isPengurus,
  isAlumni,
  isNonAktif,
  validateImageFile,
  compressImage,
  sanitizeText,
  formatTanggalIndo
} from '../../../utils/security';
import { PhotoViewerModal } from '../../modals/PhotoViewerModal';

export const InventarisModule: React.FC = () => {
  const { profile } = useAuth();

  const [activeTab, setActiveTab] = useState<'inventaris' | 'bangunan' | 'usulan'>('inventaris');

  // Inventaris Data
  const [inventarisList, setInventarisList] = useState<InventarisBarang[]>([]);
  const [loadingInv, setLoadingInv] = useState(true);
  const [searchInv, setSearchInv] = useState('');
  const [filterKepemilikan, setFilterKepemilikan] = useState('SEMUA');
  const [filterKondisi, setFilterKondisi] = useState('SEMUA');

  // UKS Room Profile
  const [profilRuang, setProfilRuang] = useState<ProfilRuangUks | null>(null);

  // Usulan Data
  const [usulanList, setUsulanList] = useState<InventarisUsulan[]>([]);
  const [filterUsulanStatus, setFilterUsulanStatus] = useState('SEMUA');

  // Modals
  const [detailBarang, setDetailBarang] = useState<InventarisBarang | null>(null);
  const [isBarangModalOpen, setIsBarangModalOpen] = useState(false);
  const [editingBarangId, setEditingBarangId] = useState<string | null>(null);

  // Barang Form State
  const [formNamaBarang, setFormNamaBarang] = useState('');
  const [formKategori, setFormKategori] = useState('Obat-obatan');
  const [formKepemilikan, setFormKepemilikan] = useState<'UKS' | 'PMR' | 'PINJAMAN_PRIBADI'>('UKS');
  const [formPemilikPribadi, setFormPemilikPribadi] = useState('');
  const [formJumlah, setFormJumlah] = useState(1);
  const [formSatuan, setFormSatuan] = useState('Pcs');
  const [formLokasiRak, setFormLokasiRak] = useState('');
  const [formKondisi, setFormKondisi] = useState('Baik');
  const [formKedaluwarsa, setFormKedaluwarsa] = useState('');
  const [formCatatan, setFormCatatan] = useState('');
  const [formFotoBarangFile, setFormFotoBarangFile] = useState<File | null>(null);
  const [barangSubmitting, setBarangSubmitting] = useState(false);

  // Edit Bangunan Modal
  const [isBangunanModalOpen, setIsBangunanModalOpen] = useState(false);
  const [bNamaRuangan, setBNamaRuangan] = useState('');
  const [bLantai, setBLantai] = useState('Lantai 1');
  const [bPanjang, setBPanjang] = useState(6);
  const [bLebar, setBLebar] = useState(4);
  const [bKapasitasBed, setBKapasitasBed] = useState(2);
  const [bPemisahGender, setBPemisahGender] = useState(true);
  const [bKondisiLantai, setBKondisiLantai] = useState('Baik');
  const [bKondisiDinding, setBKondisiDinding] = useState('Baik');
  const [bKondisiPlafon, setBKondisiPlafon] = useState('Baik');
  const [bKondisiPintu, setBKondisiPintu] = useState('Baik');
  const [bWastafel, setBWastafel] = useState(true);
  const [bToilet, setBToilet] = useState(false);
  const [bVentilasi, setBVentilasi] = useState('Baik (Jendela Kaca + Kasa Nyamuk)');
  const [bPencahayaan, setBPencahayaan] = useState('Baik (Lampu LED + Cahaya Alami)');
  const [bCatatan, setBCatatan] = useState('');
  const [bFotoUrls, setBFotoUrls] = useState<string[]>(['', '', '']);
  const [bFotoFiles, setBFotoFiles] = useState<(File | null)[]>([null, null, null]);
  const [bangunanSubmitting, setBangunanSubmitting] = useState(false);

  // Helper untuk parsing hingga 3 foto ruang UKS
  const parseRoomPhotos = (raw?: string | null): string[] => {
    if (!raw) return [];
    try {
      const trimmed = raw.trim();
      if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
        const arr = JSON.parse(trimmed);
        if (Array.isArray(arr)) return arr.filter(Boolean);
      }
    } catch (e) {
      // ignore JSON parse error
    }
    if (raw.includes('|||')) {
      return raw.split('|||').map(s => s.trim()).filter(Boolean);
    }
    return [raw.trim()].filter(Boolean);
  };

  // Usulan Form Modal
  const [isUsulanModalOpen, setIsUsulanModalOpen] = useState(false);
  const [usulanNama, setUsulanNama] = useState('');
  const [usulanJumlah, setUsulanJumlah] = useState(1);
  const [usulanAlasan, setUsulanAlasan] = useState('');
  const [usulanFotoFile, setUsulanFotoFile] = useState<File | null>(null);
  const [usulanSubmitting, setUsulanSubmitting] = useState(false);

  // Tanggapi Usulan Modal (Admin/Pembina)
  const [tanggapiUsulanId, setTanggapiUsulanId] = useState<string | null>(null);
  const [tanggapiStatus, setTanggapiStatus] = useState<'Disetujui' | 'Ditolak' | 'Terealisasi'>('Disetujui');
  const [tanggapiCatatan, setTanggapiCatatan] = useState('');
  const [tanggapiSubmitting, setTanggapiSubmitting] = useState(false);

  // Photo Zoom
  const [enlargedPhotoUrl, setEnlargedPhotoUrl] = useState<string | null>(null);

  const userIsAdmin = isAdmin(profile);
  const userIsPengurus = isPengurus(profile);
  const userIsAlumni = isAlumni(profile);
  const userIsNonAktif = isNonAktif(profile);
  const isPrivileged = Boolean(profile && !userIsAlumni && !userIsNonAktif);
  const canOperate = userIsAdmin || userIsPengurus;

  // 1. Fetch Inventaris
  const fetchInventaris = async () => {
    setLoadingInv(true);
    try {
      const { data, error } = await supabase
        .from('inventaris_barang')
        .select('*')
        .order('nama_barang', { ascending: true });
      if (error) throw error;
      setInventarisList((data as InventarisBarang[]) || []);
    } catch (err: any) {
      console.error('Error fetching inventaris:', err);
    } finally {
      setLoadingInv(false);
    }
  };

  // 2. Fetch Room Profile
  const fetchRoomProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profil_ruang_uks')
        .select('*')
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      if (data) {
        setProfilRuang(data as ProfilRuangUks);
      }
    } catch (err) {
      console.warn('Room profile error:', err);
    }
  };

  // 3. Fetch Usulan
  const fetchUsulan = async () => {
    if (!isPrivileged) return;
    try {
      const { data, error } = await supabase
        .from('inventaris_usulan')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setUsulanList((data as InventarisUsulan[]) || []);
    } catch (err) {
      console.warn('Usulan fetch error:', err);
    }
  };

  useEffect(() => {
    fetchInventaris();
    fetchRoomProfile();
    fetchUsulan();
  }, [profile, isPrivileged]);

  // Open Add Barang Modal
  const handleOpenAddBarang = () => {
    setEditingBarangId(null);
    setFormNamaBarang('');
    setFormKategori('Obat-obatan');
    setFormKepemilikan('UKS');
    setFormPemilikPribadi('');
    setFormJumlah(1);
    setFormSatuan('Pcs');
    setFormLokasiRak('');
    setFormKondisi('Baik');
    setFormKedaluwarsa('');
    setFormCatatan('');
    setFormFotoBarangFile(null);
    setIsBarangModalOpen(true);
  };

  // Open Edit Barang Modal
  const handleOpenEditBarang = (item: InventarisBarang) => {
    setEditingBarangId(item.id);
    setFormNamaBarang(item.nama_barang);
    setFormKategori(item.kategori);
    setFormKepemilikan(item.kepemilikan);
    setFormPemilikPribadi(item.nama_pemilik_pribadi || '');
    setFormJumlah(item.jumlah);
    setFormSatuan(item.satuan);
    setFormLokasiRak(item.lokasi_rak || '');
    setFormKondisi(item.kondisi);
    setFormKedaluwarsa(item.tanggal_kedaluwarsa || '');
    setFormCatatan(item.keterangan_catatan || '');
    setFormFotoBarangFile(null);
    setIsBarangModalOpen(true);
  };

  // Check Duplicate Item on Name/Ownership Blur
  const handleCheckDuplicate = () => {
    if (editingBarangId || !formNamaBarang.trim()) return;
    const match = inventarisList.find(
      item =>
        item.nama_barang.toLowerCase() === formNamaBarang.trim().toLowerCase() &&
        item.kepemilikan === formKepemilikan
    );
    if (match) {
      const wantEdit = window.confirm(
        `Barang "${match.nama_barang}" (${match.kepemilikan}) sudah terdaftar dengan stok ${match.jumlah} ${match.satuan}.\n\nApakah Anda ingin memperbarui stok barang yang sudah ada ini?`
      );
      if (wantEdit) {
        handleOpenEditBarang(match);
      }
    }
  };

  // Submit Barang
  const handleSubmitBarang = async (e: React.FormEvent) => {
    e.preventDefault();
    setBarangSubmitting(true);
    try {
      let fotoUrl: string | null = null;
      if (formFotoBarangFile) {
        const val = validateImageFile(formFotoBarangFile);
        if (!val.valid) throw new Error(val.error);

        const compressed = await compressImage(formFotoBarangFile, 800, 0.75);
        const fileName = `item_${crypto.randomUUID()}.jpg`;

        const { error: upErr } = await supabase.storage
          .from('inventaris_aset')
          .upload(fileName, compressed.blob, { contentType: 'image/jpeg' });

        if (!upErr) {
          const { data: pubData } = supabase.storage
            .from('inventaris_aset')
            .getPublicUrl(fileName);
          fotoUrl = pubData.publicUrl;
        }
      }

      const payload: Partial<InventarisBarang> = {
        nama_barang: sanitizeText(formNamaBarang),
        kategori: formKategori,
        kepemilikan: formKepemilikan,
        nama_pemilik_pribadi: formKepemilikan === 'PINJAMAN_PRIBADI' ? sanitizeText(formPemilikPribadi) : null,
        jumlah: Number(formJumlah),
        satuan: sanitizeText(formSatuan),
        lokasi_rak: sanitizeText(formLokasiRak),
        kondisi: formKondisi,
        tanggal_kedaluwarsa: formKedaluwarsa || null,
        keterangan_catatan: sanitizeText(formCatatan) || null,
        updated_at: new Date().toISOString()
      };

      if (fotoUrl) payload.foto_barang_url = fotoUrl;

      if (editingBarangId) {
        const oldItem = inventarisList.find(b => b.id === editingBarangId);
        if (profile) {
          await supabase.from('inventaris_log_aktivitas').insert({
            barang_id: editingBarangId,
            nama_barang: payload.nama_barang,
            kepemilikan: payload.kepemilikan,
            aksi: 'UPDATE_STOK',
            rincian_perubahan: { sebelum: oldItem, sesudah: payload },
            petugas_id: profile.id,
            nama_petugas: profile.nama_lengkap,
            jabatan_petugas: profile.jabatan
          });
        }

        const { error } = await supabase
          .from('inventaris_barang')
          .update(payload)
          .eq('id', editingBarangId);

        if (error) throw error;
      } else {
        const { data: newEntry, error } = await supabase
          .from('inventaris_barang')
          .insert(payload)
          .select()
          .single();

        if (error) throw error;

        if (profile && newEntry) {
          await supabase.from('inventaris_log_aktivitas').insert({
            barang_id: newEntry.id,
            nama_barang: payload.nama_barang,
            kepemilikan: payload.kepemilikan,
            aksi: 'TAMBAH',
            rincian_perubahan: { data_baru: payload },
            petugas_id: profile.id,
            nama_petugas: profile.nama_lengkap,
            jabatan_petugas: profile.jabatan
          });
        }
      }

      alert('Data barang berhasil disimpan!');
      setIsBarangModalOpen(false);
      await fetchInventaris();
    } catch (err: any) {
      alert('Gagal menyimpan barang: ' + err.message);
    } finally {
      setBarangSubmitting(false);
    }
  };

  // Delete Barang
  const handleDeleteBarang = async (id: string, nama: string) => {
    if (!canOperate) return;
    const item = inventarisList.find(b => b.id === id);
    if (!item) return;

    const alasan = window.prompt(`Hapus barang "${nama}"?\nMasukkan alasan penghapusan:`);
    if (!alasan) return;

    try {
      if (profile) {
        await supabase.from('inventaris_log_aktivitas').insert({
          barang_id: item.id,
          nama_barang: item.nama_barang,
          kepemilikan: item.kepemilikan,
          aksi: 'HAPUS',
          rincian_perubahan: { barang: item, alasan },
          petugas_id: profile.id,
          nama_petugas: profile.nama_lengkap,
          jabatan_petugas: profile.jabatan
        });
      }

      const { error } = await supabase.from('inventaris_barang').delete().eq('id', id);
      if (error) throw error;
      alert('Barang berhasil dihapus dari inventaris.');
      await fetchInventaris();
    } catch (err: any) {
      alert('Gagal menghapus: ' + err.message);
    }
  };

  // Edit Bangunan Setup
  const handleOpenEditBangunan = () => {
    if (!profilRuang) return;
    setBNamaRuangan(profilRuang.nama_ruangan || 'Ruang UKS SMPN 8 Balikpapan');
    setBLantai(profilRuang.lokasi_lantai || 'Lantai 1');
    setBPanjang(profilRuang.panjang_meter || 6);
    setBLebar(profilRuang.lebar_meter || 4);
    setBKapasitasBed(profilRuang.kapasitas_tempat_tidur || 2);
    setBPemisahGender(Boolean(profilRuang.ada_pemisah_gender));
    setBKondisiLantai(profilRuang.kondisi_lantai || 'Baik');
    setBKondisiDinding(profilRuang.kondisi_dinding || 'Baik');
    setBKondisiPlafon(profilRuang.kondisi_plafon || 'Baik');
    setBKondisiPintu(profilRuang.kondisi_pintu_jendela || 'Baik');
    setBWastafel(Boolean(profilRuang.ada_wastafel_air_mengalir));
    setBToilet(Boolean(profilRuang.ada_toilet_dalam));
    setBVentilasi(profilRuang.ventilasi_udara || 'Baik');
    setBPencahayaan(profilRuang.pencahayaan || 'Baik');
    setBCatatan(profilRuang.catatan_pemeliharaan || '');
    
    const parsed = parseRoomPhotos(profilRuang.foto_ruangan_url);
    setBFotoUrls([parsed[0] || '', parsed[1] || '', parsed[2] || '']);
    setBFotoFiles([null, null, null]);
    setIsBangunanModalOpen(true);
  };

  const handleSaveBangunan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profilRuang) return;
    setBangunanSubmitting(true);

    try {
      const updatedUrls = [...bFotoUrls];

      for (let i = 0; i < 3; i++) {
        const file = bFotoFiles[i];
        if (file) {
          const val = validateImageFile(file);
          if (!val.valid) throw new Error(`Foto ${i + 1}: ${val.error}`);

          const compressed = await compressImage(file, 1200, 0.75);
          const fileName = `ruang_uks_${i + 1}_${crypto.randomUUID()}.jpg`;

          let upErr = (await supabase.storage
            .from('inventaris_aset')
            .upload(fileName, compressed.blob, { contentType: 'image/jpeg' })).error;

          if (upErr) {
            upErr = (await supabase.storage
              .from('utilitas_ikon')
              .upload(fileName, compressed.blob, { contentType: 'image/jpeg' })).error;
          }

          if (!upErr) {
            const { data: pubData } = supabase.storage
              .from('inventaris_aset')
              .getPublicUrl(fileName);
            updatedUrls[i] = pubData.publicUrl;
          }
        }
      }

      const validPhotos = updatedUrls.map(u => (u || '').trim()).filter(Boolean);
      const fotoPayload = validPhotos.length > 0 ? JSON.stringify(validPhotos) : null;

      const payload = {
        nama_ruangan: sanitizeText(bNamaRuangan),
        lokasi_lantai: sanitizeText(bLantai),
        panjang_meter: Number(bPanjang),
        lebar_meter: Number(bLebar),
        kapasitas_tempat_tidur: Number(bKapasitasBed),
        ada_pemisah_gender: bPemisahGender,
        kondisi_lantai: bKondisiLantai,
        kondisi_dinding: bKondisiDinding,
        kondisi_plafon: bKondisiPlafon,
        kondisi_pintu_jendela: bKondisiPintu,
        ada_wastafel_air_mengalir: bWastafel,
        ada_toilet_dalam: bToilet,
        ventilasi_udara: sanitizeText(bVentilasi),
        pencahayaan: sanitizeText(bPencahayaan),
        catatan_pemeliharaan: sanitizeText(bCatatan),
        foto_ruangan_url: fotoPayload,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('profil_ruang_uks')
        .update(payload)
        .eq('id', profilRuang.id);

      if (error) throw error;

      alert('Profil fasilitas ruang UKS berhasil diperbarui!');
      setIsBangunanModalOpen(false);
      await fetchRoomProfile();
    } catch (err: any) {
      alert('Gagal memperbarui bangunan: ' + err.message);
    } finally {
      setBangunanSubmitting(false);
    }
  };

  // Submit Usulan Pengadaan
  const handleSubmitUsulan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setUsulanSubmitting(true);

    try {
      let fotoUrl: string | null = null;
      if (usulanFotoFile) {
        const val = validateImageFile(usulanFotoFile);
        if (!val.valid) throw new Error(val.error);

        const compressed = await compressImage(usulanFotoFile, 800, 0.75);
        const fileName = `usulan_${crypto.randomUUID()}.jpg`;

        const { error: upErr } = await supabase.storage
          .from('inventaris_aset')
          .upload(fileName, compressed.blob, { contentType: 'image/jpeg' });

        if (!upErr) {
          const { data: pubData } = supabase.storage
            .from('inventaris_aset')
            .getPublicUrl(fileName);
          fotoUrl = pubData.publicUrl;
        }
      }

      const { error } = await supabase.from('inventaris_usulan').insert({
        nama_barang: sanitizeText(usulanNama),
        jumlah_diusulkan: Number(usulanJumlah),
        alasan_kebutuhan: sanitizeText(usulanAlasan),
        foto_usulan_url: fotoUrl,
        pengusul_id: profile.id,
        status: 'Menunggu'
      });

      if (error) throw error;

      alert('Usulan pengadaan berhasil dikirim ke Pembina/Admin!');
      setIsUsulanModalOpen(false);
      setUsulanNama('');
      setUsulanAlasan('');
      setUsulanFotoFile(null);
      await fetchUsulan();
    } catch (err: any) {
      alert('Gagal mengirim usulan: ' + err.message);
    } finally {
      setUsulanSubmitting(false);
    }
  };

  // Tanggapi Usulan Submit (Admin)
  const handleSaveTanggapan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tanggapiUsulanId || !profile) return;
    setTanggapiSubmitting(true);

    try {
      const { error } = await supabase
        .from('inventaris_usulan')
        .update({
          status: tanggapiStatus,
          catatan_pembina: sanitizeText(tanggapiCatatan),
          diverifikasi_oleh: profile.nama_lengkap
        })
        .eq('id', tanggapiUsulanId);

      if (error) throw error;

      alert('Tanggapan usulan berhasil disimpan!');
      setTanggapiUsulanId(null);
      await fetchUsulan();
    } catch (err: any) {
      alert('Gagal menanggapi: ' + err.message);
    } finally {
      setTanggapiSubmitting(false);
    }
  };

  // Filtered Inventaris
  const filteredInventaris = inventarisList.filter(item => {
    const q = searchInv.toLowerCase();
    const matchQuery =
      !q ||
      item.nama_barang.toLowerCase().includes(q) ||
      (isPrivileged && item.lokasi_rak && item.lokasi_rak.toLowerCase().includes(q));

    const matchKepemilikan =
      !isPrivileged || filterKepemilikan === 'SEMUA' || item.kepemilikan === filterKepemilikan;

    const matchKondisi =
      !isPrivileged || filterKondisi === 'SEMUA' || item.kondisi === filterKondisi;

    return matchQuery && matchKepemilikan && matchKondisi;
  });

  // Filtered Usulan
  const filteredUsulan = filterUsulanStatus === 'SEMUA'
    ? usulanList
    : usulanList.filter(u => u.status === filterUsulanStatus);

  return (
    <div className="inventaris-module-wrapper">
      {/* 1. GUEST / ALUMNI NOTICE BANNER */}
      {!isPrivileged && (
        <div className="guest-alert-banner" style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#fffbeb', border: '1px solid #fde68a', padding: '12px 16px', borderRadius: 12, color: '#92400e', fontSize: 12, fontWeight: 600 }}>
          <AlertTriangle style={{ width: 18, height: 18, color: '#d97706', flexShrink: 0 }} />
          <span>
            {userIsAlumni
              ? 'Anda masuk sebagai Alumni (Mode Tinjau). Informasi logistik dibatasi pada nama dan jumlah stok.'
              : userIsNonAktif
              ? 'Status akun Anda Non-Aktif. Akses pengadaan dan rincian internal dibatasi.'
              : 'Anda sedang berada dalam Mode Tamu. Rincian internal dan pengadaan hanya terbuka untuk anggota resmi.'}
          </span>
        </div>
      )}

      {/* 2. SUBTAB NAVIGATION (RAPI & 1 BARIS RESPONSIF) */}
      <div className="inv-subtab-bar">
        <button
          type="button"
          className={`subtab-btn ${activeTab === 'inventaris' ? 'active' : ''}`}
          onClick={() => setActiveTab('inventaris')}
        >
          <Boxes style={{ width: 14, height: 14 }} />
          <span>Data Inventaris</span>
        </button>

        <button
          type="button"
          className={`subtab-btn ${activeTab === 'bangunan' ? 'active' : ''}`}
          onClick={() => setActiveTab('bangunan')}
        >
          <Building style={{ width: 14, height: 14 }} />
          <span>Fasilitas Bangunan</span>
        </button>

        {isPrivileged && (
          <button
            type="button"
            className={`subtab-btn ${activeTab === 'usulan' ? 'active' : ''}`}
            onClick={() => setActiveTab('usulan')}
          >
            <FileSpreadsheet style={{ width: 14, height: 14 }} />
            <span>Usulan Pengadaan</span>
          </button>
        )}
      </div>

      {/* TAB 1: DATA INVENTARIS */}
      {activeTab === 'inventaris' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* TOOLBAR INVENTARIS (RAPI & RESPONSIF HP/DESKTOP) */}
          <div className="inv-toolbar-card">
            {/* ROW 1: SEARCH */}
            <div className="inv-toolbar-row-top">
              <div className="toolbar-search-box" style={{ flex: 1, minWidth: 0 }}>
                <Search style={{ width: 15, height: 15, color: '#94a3b8', flexShrink: 0 }} />
                <input
                  type="text"
                  placeholder={isPrivileged ? 'Cari nama barang atau rak penyimpanan...' : 'Cari nama obat / barang...'}
                  value={searchInv}
                  onChange={(e) => setSearchInv(e.target.value)}
                />
                {searchInv && (
                  <button
                    type="button"
                    className="btn-clear-search"
                    onClick={() => setSearchInv('')}
                    title="Hapus pencarian"
                  >
                    <X style={{ width: 13, height: 13 }} />
                  </button>
                )}
              </div>
            </div>

            {/* ROW 2: FILTERS & ADD BUTTON */}
            {(isPrivileged || canOperate) && (
              <div className="inv-toolbar-row-bottom">
                {isPrivileged && (
                  <div className="inv-filters-group">
                    <div className="inv-select-pill">
                      <select
                        value={filterKepemilikan}
                        onChange={(e) => setFilterKepemilikan(e.target.value)}
                        aria-label="Filter Kepemilikan"
                      >
                        <option value="SEMUA">Semua Kepemilikan</option>
                        <option value="UKS">Aset UKS</option>
                        <option value="PMR">Aset PMR</option>
                        <option value="PINJAMAN_PRIBADI">Pinjaman Pribadi</option>
                      </select>
                      <ChevronDown className="select-icon" style={{ width: 13, height: 13 }} />
                    </div>

                    <div className="inv-select-pill">
                      <select
                        value={filterKondisi}
                        onChange={(e) => setFilterKondisi(e.target.value)}
                        aria-label="Filter Kondisi"
                      >
                        <option value="SEMUA">Semua Kondisi</option>
                        <option value="Baik">Baik</option>
                        <option value="Rusak Ringan">Rusak Ringan</option>
                        <option value="Rusak Berat">Rusak Berat</option>
                        <option value="Habis Pakai">Habis Pakai</option>
                      </select>
                      <ChevronDown className="select-icon" style={{ width: 13, height: 13 }} />
                    </div>
                  </div>
                )}

                {canOperate && (
                  <button
                    type="button"
                    className="btn-inv-add"
                    onClick={handleOpenAddBarang}
                    title="Tambah Barang Baru"
                  >
                    <Plus style={{ width: 15, height: 15 }} />
                    <span>Tambah Barang</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* TABEL BARANG (DESKTOP) */}
          <div className="inv-desktop-table section-member-card" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="table-responsive-wrapper">
              <table className="member-data-table">
                <thead>
                  {isPrivileged ? (
                    <tr>
                      <th style={{ width: 50, textAlign: 'center' }}>Foto</th>
                      <th>Nama Barang & Kategori</th>
                      <th>Kepemilikan</th>
                      <th style={{ width: 90, textAlign: 'center' }}>Jumlah</th>
                      <th>Kondisi</th>
                      <th>Lokasi Rak</th>
                      <th style={{ width: 110, textAlign: 'center' }}>Aksi</th>
                    </tr>
                  ) : (
                    <tr>
                      <th style={{ width: 50, textAlign: 'center' }}>Foto</th>
                      <th>Nama Barang & Kategori</th>
                      <th style={{ width: 110, textAlign: 'center' }}>Jumlah Stok</th>
                    </tr>
                  )}
                </thead>
                <tbody>
                  {loadingInv ? (
                    <tr>
                      <td colSpan={isPrivileged ? 7 : 3} style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
                        Memuat inventaris barang & obat UKS...
                      </td>
                    </tr>
                  ) : filteredInventaris.length === 0 ? (
                    <tr>
                      <td colSpan={isPrivileged ? 7 : 3} style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>
                        Belum ada data barang tercatat.
                      </td>
                    </tr>
                  ) : (
                    filteredInventaris.map(item => {
                      let badgeClass = 'badge-uks';
                      let badgeText = 'ASET UKS';
                      if (item.kepemilikan === 'PMR') {
                        badgeClass = 'badge-pmr';
                        badgeText = 'ASET PMR';
                      } else if (item.kepemilikan === 'PINJAMAN_PRIBADI') {
                        badgeClass = 'badge-pribadi';
                        badgeText = `PINJAMAN (${item.nama_pemilik_pribadi || 'PRIBADI'})`;
                      }

                      let kondisiClass = 'kondisi-baik';
                      if (item.kondisi.includes('Rusak')) kondisiClass = 'kondisi-rusak';
                      if (item.kondisi.includes('Habis')) kondisiClass = 'kondisi-habis';

                      if (!isPrivileged) {
                        return (
                          <tr key={item.id}>
                            <td style={{ textAlign: 'center' }}>
                              {item.foto_barang_url ? (
                                <img
                                  src={item.foto_barang_url}
                                  alt={item.nama_barang}
                                  style={{ width: 38, height: 38, borderRadius: 6, objectFit: 'cover', cursor: 'pointer' }}
                                  onClick={() => setDetailBarang(item)}
                                />
                              ) : (
                                <div style={{ width: 38, height: 38, borderRadius: 6, background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
                                  <ImageIcon style={{ width: 16, height: 16 }} />
                                </div>
                              )}
                            </td>
                            <td>
                              <div style={{ fontWeight: 700, color: '#0f172a', cursor: 'pointer' }} onClick={() => setDetailBarang(item)}>
                                {item.nama_barang}
                              </div>
                              <div style={{ fontSize: '10.5px', color: '#64748b' }}>{item.kategori}</div>
                            </td>
                            <td style={{ textAlign: 'center', fontWeight: 700 }}>
                              {item.jumlah} <span style={{ fontWeight: 400, fontSize: 10, color: '#64748b' }}>{item.satuan}</span>
                            </td>
                          </tr>
                        );
                      }

                      return (
                        <tr key={item.id}>
                          <td style={{ textAlign: 'center' }}>
                            {item.foto_barang_url ? (
                              <img
                                src={item.foto_barang_url}
                                alt={item.nama_barang}
                                style={{ width: 38, height: 38, borderRadius: 6, objectFit: 'cover', cursor: 'pointer' }}
                                onClick={() => setDetailBarang(item)}
                              />
                            ) : (
                              <div style={{ width: 38, height: 38, borderRadius: 6, background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
                                <ImageIcon style={{ width: 16, height: 16 }} />
                              </div>
                            )}
                          </td>
                          <td>
                            <div style={{ fontWeight: 700, color: '#0f172a', cursor: 'pointer' }} onClick={() => setDetailBarang(item)}>
                              {item.nama_barang}
                            </div>
                            <div style={{ fontSize: '10.5px', color: '#64748b' }}>{item.kategori}</div>
                          </td>
                          <td><span className={`badge-entity ${badgeClass}`}>{badgeText}</span></td>
                          <td style={{ textAlign: 'center', fontWeight: 700 }}>
                            {item.jumlah} <span style={{ fontWeight: 400, fontSize: 10, color: '#64748b' }}>{item.satuan}</span>
                          </td>
                          <td><span className={`badge-kondisi ${kondisiClass}`}>{item.kondisi}</span></td>
                          <td style={{ fontSize: '11.5px', color: '#475569' }}>{item.lokasi_rak || '-'}</td>
                          <td style={{ textAlign: 'center' }}>
                            <div style={{ display: 'inline-flex', gap: 4 }}>
                              {canOperate ? (
                                <>
                                  <button
                                    type="button"
                                    className="btn-row-action"
                                    title="Edit Barang"
                                    onClick={() => handleOpenEditBarang(item)}
                                  >
                                    <Edit2 style={{ width: 13, height: 13 }} />
                                  </button>
                                  <button
                                    type="button"
                                    className="btn-row-action delete"
                                    title="Hapus Barang"
                                    onClick={() => handleDeleteBarang(item.id, item.nama_barang)}
                                  >
                                    <Trash2 style={{ width: 13, height: 13 }} />
                                  </button>
                                </>
                              ) : (
                                <button
                                  type="button"
                                  className="btn-row-action"
                                  title="Lihat Detail"
                                  onClick={() => setDetailBarang(item)}
                                >
                                  <Eye style={{ width: 13, height: 13 }} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* MOBILE CARDS VIEW (UNTUK LAYAR HP AGAR TIDAK BERANTAKAN) */}
          <div className="inv-mobile-cards">
              {loadingInv ? (
                <div style={{ textAlign: 'center', padding: '24px', color: '#64748b', fontSize: 12 }}>
                  Memuat data inventaris...
                </div>
              ) : filteredInventaris.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px', color: '#94a3b8', fontSize: 12 }}>
                  Belum ada data barang tercatat.
                </div>
              ) : (
                filteredInventaris.map(item => {
                  let badgeClass = 'badge-uks';
                  let badgeText = 'ASET UKS';
                  if (item.kepemilikan === 'PMR') {
                    badgeClass = 'badge-pmr';
                    badgeText = 'ASET PMR';
                  } else if (item.kepemilikan === 'PINJAMAN_PRIBADI') {
                    badgeClass = 'badge-pribadi';
                    badgeText = `PINJAMAN`;
                  }

                  let kondisiClass = 'kondisi-baik';
                  if (item.kondisi.includes('Rusak')) kondisiClass = 'kondisi-rusak';
                  if (item.kondisi.includes('Habis')) kondisiClass = 'kondisi-habis';

                  return (
                    <div key={item.id} className="inv-item-card">
                      <div className="inv-card-top-row">
                        {item.foto_barang_url ? (
                          <img
                            src={item.foto_barang_url}
                            alt={item.nama_barang}
                            className="inv-card-thumb"
                            onClick={() => setEnlargedPhotoUrl(item.foto_barang_url || null)}
                            title="Ketuk untuk perbesar foto"
                          />
                        ) : (
                          <div className="inv-card-thumb-placeholder">
                            <ImageIcon style={{ width: 18, height: 18 }} />
                          </div>
                        )}
                        <div className="inv-card-info" onClick={() => setDetailBarang(item)} style={{ cursor: 'pointer' }}>
                          <h5 className="inv-card-name">{item.nama_barang}</h5>
                          <span className="inv-card-category">{item.kategori}</span>
                        </div>
                        <div className="inv-card-qty-badge">
                          {item.jumlah} {item.satuan}
                        </div>
                      </div>

                      <div className="inv-card-pills-row">
                        <div className="inv-pills-left">
                          {isPrivileged && <span className={`badge-entity ${badgeClass}`}>{badgeText}</span>}
                          <span className={`badge-kondisi ${kondisiClass}`}>{item.kondisi}</span>
                          {item.lokasi_rak && <span className="badge-kondisi" style={{ background: '#f1f5f9', color: '#475569' }}>Rak: {item.lokasi_rak}</span>}
                        </div>

                        <div className="inv-actions-right">
                          <button
                            type="button"
                            className="btn-inv-icon"
                            onClick={() => setDetailBarang(item)}
                            title="Lihat Detail"
                            aria-label="Lihat Detail"
                          >
                            <Eye style={{ width: 13, height: 13 }} />
                          </button>
                          {canOperate && (
                            <>
                              <button
                                type="button"
                                className="btn-inv-icon"
                                onClick={() => handleOpenEditBarang(item)}
                                title="Edit Barang"
                                aria-label="Edit Barang"
                              >
                                <Edit2 style={{ width: 13, height: 13 }} />
                              </button>
                              <button
                                type="button"
                                className="btn-inv-icon delete"
                                onClick={() => handleDeleteBarang(item.id, item.nama_barang)}
                                title="Hapus Barang"
                                aria-label="Hapus Barang"
                              >
                                <Trash2 style={{ width: 13, height: 13 }} />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

      {/* TAB 2: FASILITAS BANGUNAN UKS-PMR */}
      {activeTab === 'bangunan' && (
        <div className="bangunan-tab-content">
          {/* HEADER FASILITAS BANGUNAN */}
          <div className="bangunan-header-card">
            <div className="bangunan-header-title-group">
              <div className="bangunan-icon-wrap">
                <Building style={{ width: 20, height: 20 }} />
              </div>
              <div>
                <h3 className="bangunan-title-text">Fasilitas Bangunan UKS-PMR</h3>
                <span className="bangunan-subtitle-text">Standar sarana & prasarana fisik ruang kesehatan sekolah</span>
              </div>
            </div>

            {canOperate && (
              <button
                type="button"
                className="btn-inv-add"
                onClick={handleOpenEditBangunan}
                title="Perbarui Data & Foto Fasilitas Ruang UKS"
              >
                <Edit2 style={{ width: 14, height: 14 }} />
                <span>Edit Bangunan & Foto</span>
              </button>
            )}
          </div>

          {/* 3 FOTO RUANG UKS */}
          <div className="bangunan-photos-grid">
            {[
              { slot: 0, label: 'Foto 1: Tampak Utama Ruang UKS', sub: 'Area masuk & tata ruang utama' },
              { slot: 1, label: 'Foto 2: Ranjang Pasien & Sekat', sub: 'Kapasitas bed & pemisah gender' },
              { slot: 2, label: 'Foto 3: Wastafel & Sanitasi Toilet', sub: 'Fasilitas cuci tangan & kebersihan' }
            ].map(({ slot, label, sub }) => {
              const photos = parseRoomPhotos(profilRuang?.foto_ruangan_url);
              const photoUrl = photos[slot];
              return (
                <div key={slot} className="bangunan-photo-card">
                  {photoUrl ? (
                    <div className="bangunan-photo-inner" onClick={() => setEnlargedPhotoUrl(photoUrl)}>
                      <img
                        src={photoUrl}
                        alt={label}
                        className="bangunan-photo-img"
                        title="Ketuk untuk perbesar foto"
                      />
                      <div className="bangunan-photo-overlay">
                        <span className="bangunan-photo-tag">{label}</span>
                        <span className="bangunan-photo-subtag">{sub}</span>
                      </div>
                    </div>
                  ) : (
                    <div
                      className="bangunan-photo-empty"
                      onClick={canOperate ? handleOpenEditBangunan : undefined}
                      style={{ cursor: canOperate ? 'pointer' : 'default' }}
                    >
                      <div className="empty-photo-icon-wrap">
                        <ImageIcon style={{ width: 24, height: 24 }} />
                      </div>
                      <span className="empty-photo-title">{label}</span>
                      <span className="empty-photo-sub">{sub}</span>
                      {canOperate && <span className="empty-photo-hint">+ Unggah Foto</span>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* a. KEADAAN SECARA UMUM */}
          <div className="bangunan-section-card">
            <div className="bangunan-section-header">
              <div className="section-title-wrap">
                <CheckCircle2 style={{ width: 20, height: 20, color: '#16a34a' }} />
                <div>
                  <h4 className="section-heading">a. Keadaan Secara Umum</h4>
                  <span className="section-subheading">Status kelaikan operasional dan kondisi fisik ruangan</span>
                </div>
              </div>
              <div className="status-layak-badge-prominent">
                <span className="dot-layak-pulse" />
                <span className="layak-text">Kelayakan Bangunan: <strong>LAYAK</strong></span>
              </div>
            </div>

            <div className="keadaan-banner-highlight">
              <div className="keadaan-highlight-icon">
                <ShieldCheck style={{ width: 22, height: 22, color: '#16a34a' }} />
              </div>
              <div className="keadaan-highlight-info">
                <div className="keadaan-highlight-title">Kelayakan Bangunan: LAYAK (Standar Pelayanan UKS)</div>
                <div className="keadaan-highlight-desc">
                  Ruang kesehatan sekolah memenuhi kriteria kelayakan higienis, sirkulasi udara memadai, dan kenyamanan penanganan darurat siswa.
                </div>
              </div>
            </div>

            <div className="keadaan-umum-grid">
              <div className="keadaan-item">
                <span className="k-label">Kelayakan Bangunan</span>
                <span className="k-value text-green">
                  <CheckCircle2 style={{ width: 14, height: 14 }} /> Layak (Standar UKS)
                </span>
              </div>
              <div className="keadaan-item">
                <span className="k-label">Kondisi Lantai</span>
                <span className="k-value">{profilRuang?.kondisi_lantai || 'Baik (Keramik Utuh & Bersih)'}</span>
              </div>
              <div className="keadaan-item">
                <span className="k-label">Kondisi Dinding</span>
                <span className="k-value">{profilRuang?.kondisi_dinding || 'Baik (Cat Rapi, Bebas Lembab)'}</span>
              </div>
              <div className="keadaan-item">
                <span className="k-label">Kondisi Plafon</span>
                <span className="k-value">{profilRuang?.kondisi_plafon || 'Baik (Rapat & Tidak Bocor)'}</span>
              </div>
              <div className="keadaan-item">
                <span className="k-label">Ventilasi Udara</span>
                <span className="k-value">{profilRuang?.ventilasi_udara || 'Baik (Jendela Kaca + Kasa Nyamuk)'}</span>
              </div>
              <div className="keadaan-item">
                <span className="k-label">Pencahayaan Ruangan</span>
                <span className="k-value">{profilRuang?.pencahayaan || 'Baik (Lampu LED + Alami)'}</span>
              </div>
            </div>
          </div>

          {/* b. DATA BANGUNAN */}
          <div className="bangunan-section-card">
            <div className="bangunan-section-header">
              <div className="section-title-wrap">
                <Building style={{ width: 20, height: 20, color: '#0284c7' }} />
                <div>
                  <h4 className="section-heading">b. Data Bangunan</h4>
                  <span className="section-subheading">Dimensi luas, kapasitas ranjang, pemisahan gender, wastafel & toilet dalam</span>
                </div>
              </div>
            </div>

            <div className="data-bangunan-grid">
              {/* 1. Dimensi Luas */}
              <div className="data-box-tile">
                <div className="tile-icon-bubble blue">
                  <Maximize2 style={{ width: 20, height: 20 }} />
                </div>
                <div className="tile-text">
                  <span className="tile-label">Dimensi Luas</span>
                  <span className="tile-val">
                    {profilRuang ? `${profilRuang.panjang_meter} m × ${profilRuang.lebar_meter} m (${profilRuang.panjang_meter * profilRuang.lebar_meter} m²)` : '7 m × 6 m (42 m²)'}
                  </span>
                  <span className="tile-sub">Luas Total Ruangan UKS</span>
                </div>
              </div>

              {/* 2. Kapasitas Ranjang */}
              <div className="data-box-tile">
                <div className="tile-icon-bubble emerald">
                  <Bed style={{ width: 20, height: 20 }} />
                </div>
                <div className="tile-text">
                  <span className="tile-label">Kapasitas Ranjang</span>
                  <span className="tile-val">{profilRuang?.kapasitas_tempat_tidur || 2} Bed Pasien</span>
                  <span className="tile-sub">Lengkap kasur, sprei & bantal</span>
                </div>
              </div>

              {/* 3. Pemisahan Gender */}
              <div className="data-box-tile">
                <div className="tile-icon-bubble purple">
                  <ShieldCheck style={{ width: 20, height: 20 }} />
                </div>
                <div className="tile-text">
                  <span className="tile-label">Pemisahan Gender</span>
                  <span className="tile-val">
                    {profilRuang?.ada_pemisah_gender ? 'Tersedia Sekat / Tirai' : 'Tidak Ada'}
                  </span>
                  <span className="tile-sub">Pemisah area putra & putri</span>
                </div>
              </div>

              {/* 4. Wastafel */}
              <div className="data-box-tile">
                <div className="tile-icon-bubble cyan">
                  <Droplets style={{ width: 20, height: 20 }} />
                </div>
                <div className="tile-text">
                  <span className="tile-label">Wastafel</span>
                  <span className="tile-val">
                    {profilRuang?.ada_wastafel_air_mengalir ? 'Tersedia (Air Mengalir)' : 'Tidak Ada'}
                  </span>
                  <span className="tile-sub">Air bersih mengalir & sabun sanitasi</span>
                </div>
              </div>

              {/* 5. Toilet Dalam */}
              <div className="data-box-tile">
                <div className="tile-icon-bubble amber">
                  <Building style={{ width: 20, height: 20 }} />
                </div>
                <div className="tile-text">
                  <span className="tile-label">Toilet Dalam</span>
                  <span className="tile-val">
                    {profilRuang?.ada_toilet_dalam ? 'Ada di Dalam Ruang UKS' : 'Toilet Terpisah (Dekat UKS)'}
                  </span>
                  <span className="tile-sub">Fasilitas sanitasi darurat pasien</span>
                </div>
              </div>
            </div>

            {profilRuang?.catatan_pemeliharaan && (
              <div className="catatan-pemeliharaan-box">
                <span className="catatan-title">Catatan Pemeliharaan Ruangan:</span>
                <span className="catatan-body">{profilRuang.catatan_pemeliharaan}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: USULAN PENGADAAN (PRIVILEGED ONLY) */}
      {activeTab === 'usulan' && isPrivileged && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* FILTER STATUS & AJUKAN BUTTON */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
            <div className="status-tabs-row" style={{ display: 'flex', gap: 6 }}>
              {['SEMUA', 'Menunggu', 'Disetujui', 'Ditolak', 'Terealisasi'].map(st => (
                <button
                  key={st}
                  type="button"
                  className={`status-tab-btn ${filterUsulanStatus === st ? 'active' : ''}`}
                  onClick={() => setFilterUsulanStatus(st)}
                >
                  {st}
                </button>
              ))}
            </div>

            <button
              type="button"
              className="btn-add-member"
              onClick={() => setIsUsulanModalOpen(true)}
            >
              <Plus style={{ width: 16, height: 16 }} />
              <span>Ajukan Pengadaan Baru</span>
            </button>
          </div>

          {/* TABEL USULAN */}
          <div className="section-member-card" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="table-responsive-wrapper">
              <table className="member-data-table">
                <thead>
                  <tr>
                    <th style={{ width: 50, textAlign: 'center' }}>Foto</th>
                    <th>Nama Barang & Tanggal</th>
                    <th style={{ width: 90, textAlign: 'center' }}>Jumlah</th>
                    <th>Alasan Kebutuhan</th>
                    <th>Status & Catatan</th>
                    <th style={{ width: 100, textAlign: 'center' }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsulan.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: 30, color: '#94a3b8' }}>
                        Tidak ada usulan pengadaan dengan status ini.
                      </td>
                    </tr>
                  ) : (
                    filteredUsulan.map(u => {
                      let badgeClass = 'badge-uks';
                      if (u.status === 'Disetujui') badgeClass = 'kondisi-baik';
                      if (u.status === 'Ditolak') badgeClass = 'kondisi-rusak';
                      if (u.status === 'Terealisasi') badgeClass = 'badge-pmr';

                      return (
                        <tr key={u.id}>
                          <td style={{ textAlign: 'center' }}>
                            {u.foto_usulan_url ? (
                              <img
                                src={u.foto_usulan_url}
                                alt={u.nama_barang}
                                style={{ width: 38, height: 38, borderRadius: 6, objectFit: 'cover', cursor: 'zoom-in' }}
                                onClick={() => setEnlargedPhotoUrl(u.foto_usulan_url || null)}
                              />
                            ) : (
                              <div style={{ width: 38, height: 38, borderRadius: 6, background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: 10 }}>
                                No Pic
                              </div>
                            )}
                          </td>
                          <td>
                            <div style={{ fontWeight: 700, color: '#0f172a' }}>{u.nama_barang}</div>
                            <div style={{ fontSize: 10, color: '#64748b' }}>
                              Tanggal: {new Date(u.created_at).toLocaleDateString('id-ID')}
                            </div>
                          </td>
                          <td style={{ textAlign: 'center', fontWeight: 700 }}>{u.jumlah_diusulkan}</td>
                          <td style={{ fontSize: 12, color: '#334155' }}>{u.alasan_kebutuhan}</td>
                          <td>
                            <span className={`badge-entity ${badgeClass}`}>{u.status}</span>
                            {u.catatan_pembina && (
                              <div style={{ marginTop: 4, fontSize: 11, color: '#1e293b', background: '#f8fafc', padding: '4px 6px', borderRadius: 6, borderLeft: '3px solid var(--maroon)' }}>
                                <strong>Catatan:</strong> {u.catatan_pembina}
                                <div style={{ fontSize: 9.5, color: '#64748b' }}>Oleh: {u.diverifikasi_oleh || 'Pembina'}</div>
                              </div>
                            )}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            {userIsAdmin ? (
                              <button
                                type="button"
                                className="btn-tanggapi"
                                onClick={() => {
                                  setTanggapiUsulanId(u.id);
                                  setTanggapiStatus(u.status === 'Menunggu' ? 'Disetujui' : u.status);
                                  setTanggapiCatatan(u.catatan_pembina || '');
                                }}
                              >
                                <MessageSquare style={{ width: 12, height: 12 }} /> Tanggapi
                              </button>
                            ) : (
                              <span style={{ fontSize: 11, color: '#94a3b8' }}>
                                {new Date(u.created_at).toLocaleDateString('id-ID')}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* DETAIL BARANG MODAL */}
      {detailBarang && (
        <div className="app-modal-backdrop active">
          <div className="app-modal-card" style={{ maxWidth: 440 }}>
            <div className="app-modal-header">
              <h3>Detail Barang: {detailBarang.nama_barang}</h3>
              <button
                type="button"
                className="app-modal-close"
                onClick={() => setDetailBarang(null)}
              >
                &times;
              </button>
            </div>

            <div className="app-modal-body" style={{ maxHeight: '75vh', overflowY: 'auto' }}>
              {detailBarang.foto_barang_url && (
                <div style={{ width: '100%', height: 180, borderRadius: 10, overflow: 'hidden', marginBottom: 12, border: '1px solid #cbd5e1' }}>
                  <img
                    src={detailBarang.foto_barang_url}
                    alt={detailBarang.nama_barang}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div className="spec-row">
                  <span className="label">Nama Barang</span>
                  <span className="val">{detailBarang.nama_barang}</span>
                </div>
                <div className="spec-row">
                  <span className="label">Kategori</span>
                  <span className="val">{detailBarang.kategori}</span>
                </div>
                <div className="spec-row">
                  <span className="label">Jumlah Tersedia</span>
                  <span className="val" style={{ color: 'var(--maroon)', fontWeight: 800 }}>
                    {detailBarang.jumlah} {detailBarang.satuan}
                  </span>
                </div>

                {isPrivileged && (
                  <>
                    <div className="spec-row">
                      <span className="label">Kepemilikan</span>
                      <span className="val">
                        {detailBarang.kepemilikan === 'PINJAMAN_PRIBADI'
                          ? `Pinjaman (${detailBarang.nama_pemilik_pribadi || 'Pribadi'})`
                          : `Aset ${detailBarang.kepemilikan}`}
                      </span>
                    </div>
                    <div className="spec-row">
                      <span className="label">Kondisi Fisik</span>
                      <span className="val">{detailBarang.kondisi}</span>
                    </div>
                    <div className="spec-row">
                      <span className="label">Lokasi Rak</span>
                      <span className="val">{detailBarang.lokasi_rak || '-'}</span>
                    </div>
                    <div className="spec-row">
                      <span className="label">Tanggal Kedaluwarsa</span>
                      <span className="val">{formatTanggalIndo(detailBarang.tanggal_kedaluwarsa, false)}</span>
                    </div>
                    {detailBarang.keterangan_catatan && (
                      <div className="spec-row" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 4 }}>
                        <span className="label">Catatan Spesifikasi:</span>
                        <span className="val" style={{ textAlign: 'left', fontWeight: 500, color: '#334155' }}>
                          {detailBarang.keterangan_catatan}
                        </span>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            <div className="app-modal-footer">
              <button
                type="button"
                className="btn-modal-cancel"
                onClick={() => setDetailBarang(null)}
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAMBAH / EDIT BARANG MODAL */}
      {isBarangModalOpen && (
        <div className="app-modal-backdrop active">
          <div className="app-modal-card">
            <div className="app-modal-header">
              <h3>{editingBarangId ? 'Edit Data Barang' : 'Tambah Data Barang'}</h3>
              <button
                type="button"
                className="app-modal-close"
                onClick={() => setIsBarangModalOpen(false)}
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSubmitBarang} className="modal-form-wrapper">
              <div className="app-modal-body">
                <div className="modal-form-group">
                  <label>Nama Barang *</label>
                  <input
                    type="text"
                    value={formNamaBarang}
                    onChange={(e) => setFormNamaBarang(e.target.value)}
                    onBlur={handleCheckDuplicate}
                    placeholder="Contoh: Kasa Steril 16x16"
                    required
                  />
                </div>

                <div className="modal-grid-row">
                  <div className="modal-form-group">
                    <label>Kategori *</label>
                    <select
                      value={formKategori}
                      onChange={(e) => setFormKategori(e.target.value)}
                      required
                    >
                      <option value="Obat-obatan">Obat-obatan</option>
                      <option value="Alat Medis / UKS">Alat Medis / UKS</option>
                      <option value="Tandu & Evakuasi">Tandu & Evakuasi</option>
                      <option value="Perlengkapan Latihan">Perlengkapan Latihan</option>
                      <option value="Kebersihan & Sanitasi">Kebersihan & Sanitasi</option>
                      <option value="Lainnya">Lainnya</option>
                    </select>
                  </div>

                  <div className="modal-form-group">
                    <label>Kepemilikan *</label>
                    <select
                      value={formKepemilikan}
                      onChange={(e) => setFormKepemilikan(e.target.value as any)}
                      required
                    >
                      <option value="UKS">Aset UKS</option>
                      <option value="PMR">Aset PMR</option>
                      <option value="PINJAMAN_PRIBADI">Pinjaman Pribadi</option>
                    </select>
                  </div>
                </div>

                {formKepemilikan === 'PINJAMAN_PRIBADI' && (
                  <div className="modal-form-group">
                    <label>Nama Pemilik Pribadi *</label>
                    <input
                      type="text"
                      value={formPemilikPribadi}
                      onChange={(e) => setFormPemilikPribadi(e.target.value)}
                      placeholder="Nama pemilik barang..."
                      required
                    />
                  </div>
                )}

                <div className="modal-grid-row">
                  <div className="modal-form-group">
                    <label>Jumlah Stok *</label>
                    <input
                      type="number"
                      value={formJumlah}
                      onChange={(e) => setFormJumlah(Math.max(0, parseInt(e.target.value) || 0))}
                      min={0}
                      required
                    />
                  </div>
                  <div className="modal-form-group">
                    <label>Satuan Barang *</label>
                    <input
                      type="text"
                      value={formSatuan}
                      onChange={(e) => setFormSatuan(e.target.value)}
                      placeholder="Pcs, Botol, Roll..."
                      required
                    />
                  </div>
                </div>

                <div className="modal-grid-row">
                  <div className="modal-form-group">
                    <label>Lokasi Rak / Lemari *</label>
                    <input
                      type="text"
                      value={formLokasiRak}
                      onChange={(e) => setFormLokasiRak(e.target.value)}
                      placeholder="Contoh: Lemari Kaca Tingkat 2"
                      required
                    />
                  </div>
                  <div className="modal-form-group">
                    <label>Kondisi *</label>
                    <select
                      value={formKondisi}
                      onChange={(e) => setFormKondisi(e.target.value)}
                      required
                    >
                      <option value="Baik">Baik</option>
                      <option value="Rusak Ringan">Rusak Ringan</option>
                      <option value="Rusak Berat">Rusak Berat</option>
                      <option value="Habis Pakai">Habis Pakai</option>
                    </select>
                  </div>
                </div>

                <div className="modal-form-group">
                  <label>Tanggal Kedaluwarsa (Jika ada)</label>
                  <input
                    type="date"
                    value={formKedaluwarsa}
                    onChange={(e) => setFormKedaluwarsa(e.target.value)}
                  />
                </div>

                <div className="modal-form-group">
                  <label>Foto Barang (JPG, PNG, WebP)</label>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setFormFotoBarangFile(e.target.files[0]);
                      }
                    }}
                    style={{ padding: 8, border: '1px dashed #cbd5e1' }}
                  />
                </div>

                <div className="modal-form-group">
                  <label>Catatan Tambahan</label>
                  <textarea
                    value={formCatatan}
                    onChange={(e) => setFormCatatan(e.target.value)}
                    rows={2}
                    placeholder="Keterangan dosis, spesifikasi, atau petunjuk penyimpanan..."
                  />
                </div>
              </div>

              <div className="app-modal-footer">
                <button
                  type="button"
                  className="btn-modal-cancel"
                  onClick={() => setIsBarangModalOpen(false)}
                  disabled={barangSubmitting}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="btn-modal-submit"
                  disabled={barangSubmitting}
                >
                  {barangSubmitting ? 'Menyimpan...' : 'Simpan Data'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT BANGUNAN MODAL */}
      {isBangunanModalOpen && (
        <div className="app-modal-backdrop active">
          <div className="app-modal-card">
            <div className="app-modal-header">
              <h3>Perbarui Profil Fasilitas UKS</h3>
              <button
                type="button"
                className="app-modal-close"
                onClick={() => setIsBangunanModalOpen(false)}
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveBangunan} className="modal-form-wrapper">
              <div className="app-modal-body">
                <div className="modal-grid-row">
                  <div className="modal-form-group">
                    <label>Nama Ruangan *</label>
                    <input
                      type="text"
                      value={bNamaRuangan}
                      onChange={(e) => setBNamaRuangan(e.target.value)}
                      required
                    />
                  </div>
                  <div className="modal-form-group">
                    <label>Lokasi Lantai *</label>
                    <input
                      type="text"
                      value={bLantai}
                      onChange={(e) => setBLantai(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="modal-grid-row">
                  <div className="modal-form-group">
                    <label>Panjang (meter) *</label>
                    <input
                      type="number"
                      step="0.5"
                      value={bPanjang}
                      onChange={(e) => setBPanjang(parseFloat(e.target.value) || 0)}
                      required
                    />
                  </div>
                  <div className="modal-form-group">
                    <label>Lebar (meter) *</label>
                    <input
                      type="number"
                      step="0.5"
                      value={bLebar}
                      onChange={(e) => setBLebar(parseFloat(e.target.value) || 0)}
                      required
                    />
                  </div>
                </div>

                <div className="modal-grid-row">
                  <div className="modal-form-group">
                    <label>Kapasitas Ranjang Pasien *</label>
                    <input
                      type="number"
                      value={bKapasitasBed}
                      onChange={(e) => setBKapasitasBed(parseInt(e.target.value) || 0)}
                      required
                    />
                  </div>
                  <div className="modal-form-group">
                    <label>Pemisah Gender (Tirai)</label>
                    <select
                      value={bPemisahGender ? 'true' : 'false'}
                      onChange={(e) => setBPemisahGender(e.target.value === 'true')}
                    >
                      <option value="true">Tersedia</option>
                      <option value="false">Tidak Ada</option>
                    </select>
                  </div>
                </div>

                <div className="modal-grid-row">
                  <div className="modal-form-group">
                    <label>Wastafel Air Mengalir</label>
                    <select
                      value={bWastafel ? 'true' : 'false'}
                      onChange={(e) => setBWastafel(e.target.value === 'true')}
                    >
                      <option value="true">Tersedia</option>
                      <option value="false">Tidak Ada</option>
                    </select>
                  </div>
                  <div className="modal-form-group">
                    <label>Toilet di Dalam UKS</label>
                    <select
                      value={bToilet ? 'true' : 'false'}
                      onChange={(e) => setBToilet(e.target.value === 'true')}
                    >
                      <option value="true">Ada</option>
                      <option value="false">Tidak Ada</option>
                    </select>
                  </div>
                </div>

                <div className="modal-form-group">
                  <label style={{ fontWeight: 700, marginBottom: 6, display: 'block' }}>
                    Foto Fasilitas Ruang UKS (3 Foto Dokumentasi)
                  </label>
                  <div className="modal-photos-grid-3">
                    {[
                      { idx: 0, title: 'Foto 1: Tampak Utama', desc: 'Area depan & tata ruang utama' },
                      { idx: 1, title: 'Foto 2: Ranjang & Sekat', desc: 'Bed pasien & pemisah gender' },
                      { idx: 2, title: 'Foto 3: Wastafel & Toilet', desc: 'Sanitasi, wastafel & toilet' }
                    ].map(({ idx, title, desc }) => {
                      const currentUrl = bFotoUrls[idx];
                      const selectedFile = bFotoFiles[idx];
                      const previewSrc = selectedFile ? URL.createObjectURL(selectedFile) : currentUrl;

                      return (
                        <div key={idx} className="modal-photo-slot-card">
                          <div className="slot-card-header">
                            <span className="slot-title">{title}</span>
                            <span className="slot-desc">{desc}</span>
                          </div>

                          <div className="slot-preview-box">
                            {previewSrc ? (
                              <div className="slot-thumb-wrap">
                                <img src={previewSrc} alt={title} className="slot-thumb-img" />
                                <button
                                  type="button"
                                  className="btn-slot-remove"
                                  title="Hapus foto ini"
                                  onClick={() => {
                                    const newUrls = [...bFotoUrls];
                                    newUrls[idx] = '';
                                    setBFotoUrls(newUrls);
                                    const newFiles = [...bFotoFiles];
                                    newFiles[idx] = null;
                                    setBFotoFiles(newFiles);
                                  }}
                                >
                                  <X style={{ width: 14, height: 14 }} />
                                </button>
                              </div>
                            ) : (
                              <div className="slot-placeholder">
                                <Camera style={{ width: 22, height: 22, color: '#94a3b8' }} />
                                <span>Pilih Foto</span>
                              </div>
                            )}
                          </div>

                          <label className="btn-slot-choose">
                            <span>{previewSrc ? 'Ganti Foto' : 'Unggah Foto'}</span>
                            <input
                              type="file"
                              accept="image/jpeg,image/png,image/webp"
                              style={{ display: 'none' }}
                              onChange={(e) => {
                                if (e.target.files && e.target.files[0]) {
                                  const newFiles = [...bFotoFiles];
                                  newFiles[idx] = e.target.files[0];
                                  setBFotoFiles(newFiles);
                                }
                              }}
                            />
                          </label>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="modal-form-group">
                  <label>Catatan Pemeliharaan</label>
                  <textarea
                    value={bCatatan}
                    onChange={(e) => setBCatatan(e.target.value)}
                    rows={2}
                  />
                </div>
              </div>

              <div className="app-modal-footer">
                <button
                  type="button"
                  className="btn-modal-cancel"
                  onClick={() => setIsBangunanModalOpen(false)}
                  disabled={bangunanSubmitting}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="btn-modal-submit"
                  disabled={bangunanSubmitting}
                >
                  {bangunanSubmitting ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* AJUKAN USULAN MODAL */}
      {isUsulanModalOpen && (
        <div className="app-modal-backdrop active">
          <div className="app-modal-card">
            <div className="app-modal-header">
              <h3>Ajukan Usulan Pengadaan Barang</h3>
              <button
                type="button"
                className="app-modal-close"
                onClick={() => setIsUsulanModalOpen(false)}
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSubmitUsulan} className="modal-form-wrapper">
              <div className="app-modal-body">
                <div className="modal-form-group">
                  <label>Nama Barang / Obat yang Diusulkan *</label>
                  <input
                    type="text"
                    value={usulanNama}
                    onChange={(e) => setUsulanNama(e.target.value)}
                    placeholder="Contoh: Termometer Digital Non-Kontak"
                    required
                  />
                </div>

                <div className="modal-form-group">
                  <label>Jumlah Kebutuhan *</label>
                  <input
                    type="number"
                    value={usulanJumlah}
                    onChange={(e) => setUsulanJumlah(Math.max(1, parseInt(e.target.value) || 1))}
                    min={1}
                    required
                  />
                </div>

                <div className="modal-form-group">
                  <label>Alasan Kebutuhan & Urgensi *</label>
                  <textarea
                    value={usulanAlasan}
                    onChange={(e) => setUsulanAlasan(e.target.value)}
                    rows={3}
                    placeholder="Jelaskan untuk keperluan apa dan mengapa barang ini diperlukan..."
                    required
                  />
                </div>

                <div className="modal-form-group">
                  <label>Foto Referensi Barang (Opsional)</label>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setUsulanFotoFile(e.target.files[0]);
                      }
                    }}
                    style={{ padding: 8, border: '1px dashed #cbd5e1' }}
                  />
                </div>
              </div>

              <div className="app-modal-footer">
                <button
                  type="button"
                  className="btn-modal-cancel"
                  onClick={() => setIsUsulanModalOpen(false)}
                  disabled={usulanSubmitting}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="btn-modal-submit"
                  disabled={usulanSubmitting}
                >
                  {usulanSubmitting ? 'Mengirim...' : 'Kirim Usulan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TANGGAPI USULAN MODAL (ADMIN ONLY) */}
      {tanggapiUsulanId && (
        <div className="app-modal-backdrop active">
          <div className="app-modal-card" style={{ maxWidth: 440 }}>
            <div className="app-modal-header">
              <h3>Tanggapi Usulan Pengadaan</h3>
              <button
                type="button"
                className="app-modal-close"
                onClick={() => setTanggapiUsulanId(null)}
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveTanggapan} className="modal-form-wrapper">
              <div className="app-modal-body">
                <div className="modal-form-group">
                  <label>Status Keputusan *</label>
                  <select
                    value={tanggapiStatus}
                    onChange={(e) => setTanggapiStatus(e.target.value as any)}
                    required
                  >
                    <option value="Disetujui">Disetujui</option>
                    <option value="Ditolak">Ditolak</option>
                    <option value="Terealisasi">Terealisasi (Sudah Dibeli/Tersedia)</option>
                  </select>
                </div>

                <div className="modal-form-group">
                  <label>Catatan Pembina / Petunjuk</label>
                  <textarea
                    value={tanggapiCatatan}
                    onChange={(e) => setTanggapiCatatan(e.target.value)}
                    rows={3}
                    placeholder="Tuliskan catatan verifikasi, sumber dana, atau alasan keputusan..."
                  />
                </div>
              </div>

              <div className="app-modal-footer">
                <button
                  type="button"
                  className="btn-modal-cancel"
                  onClick={() => setTanggapiUsulanId(null)}
                  disabled={tanggapiSubmitting}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="btn-modal-submit"
                  disabled={tanggapiSubmitting}
                >
                  {tanggapiSubmitting ? 'Menyimpan...' : 'Simpan Tanggapan'}
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
