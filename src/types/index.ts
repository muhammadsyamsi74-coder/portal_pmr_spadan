export interface UserProfile {
  id: string;
  email?: string;
  nama_lengkap: string;
  nama_panggilan?: string;
  jenis_kelamin?: string;
  tanggal_lahir?: string;
  kelas?: string;
  tahun_bergabung?: string;
  nisn?: string | null;
  jabatan?: string; // 'admin' | 'pengurus' | 'anggota' | 'non-aktif'
  keterangan_jabatan?: string; // 'Kepala Sekolah', 'Pembina 1', 'Pembina 2', 'Pelatih', 'Ketua', 'Wakil', 'Sekretaris', 'Bendahara', 'Seksi ...', 'Anggota', 'Alumni', 'Non-Aktif'
  golongan_darah?: string | null;
  rhesus_darah?: string | null;
  riwayat_penyakit?: string | null;
  no_wa_pribadi?: string | null;
  no_wa_ortu?: string | null;
  foto_profil_url?: string | null;
  created_at?: string;
}

export interface AgendaKegiatan {
  id: string;
  judul: string;
  kategori: string;
  prioritas?: string;
  tanggal_mulai: string;
  tanggal_selesai?: string | null;
  waktu_kegiatan?: string | null;
  lokasi?: string | null;
  keterangan?: string | null;
  tampilkan_di_dashboard?: boolean;
  created_at?: string;
}

export interface PresensiRecord {
  id?: string;
  sesi_id: string;
  user_id: string;
  nama_kegiatan: string;
  jenis_kegiatan: string;
  tempat_kegiatan: string;
  deskripsi_kegiatan?: string | null;
  foto_dokumentasi_url?: string | null;
  status_kehadiran: 'Hadir' | 'Izin' | 'Sakit' | 'Alpa' | 'Tidak Ditugaskan';
  tanggal_kegiatan: string;
  created_at?: string;
  users_profile?: UserProfile;
}

export interface PresensiSessionSummary {
  sesi_id: string;
  nama_kegiatan: string;
  jenis_kegiatan: string;
  tempat_kegiatan: string;
  tanggal_kegiatan: string;
  deskripsi_kegiatan?: string | null;
  foto_dokumentasi_url?: string | null;
  hadir: number;
  izin: number;
  sakit: number;
  alpa: number;
  td: number;
  records: PresensiRecord[];
}

export interface InventarisBarang {
  id: string;
  kode_barang?: string;
  nama_barang: string;
  kategori: string;
  kepemilikan: 'UKS' | 'PMR' | 'PINJAMAN_PRIBADI';
  nama_pemilik_pribadi?: string | null;
  jumlah: number;
  satuan: string;
  lokasi_rak: string;
  kondisi: string;
  tanggal_kedaluwarsa?: string | null;
  keterangan_catatan?: string | null;
  foto_barang_url?: string | null;
  updated_at?: string;
  created_at?: string;
}

export interface ProfilRuangUks {
  id: string;
  nama_ruangan: string;
  lokasi_lantai: string;
  panjang_meter: number;
  lebar_meter: number;
  kapasitas_tempat_tidur: number;
  ada_pemisah_gender: boolean;
  kondisi_lantai: string;
  kondisi_dinding: string;
  kondisi_plafon: string;
  kondisi_pintu_jendela: string;
  ada_wastafel_air_mengalir: boolean;
  ada_toilet_dalam: boolean;
  ventilasi_udara: string;
  pencahayaan: string;
  catatan_pemeliharaan?: string;
  foto_ruangan_url?: string;
  updated_at?: string;
}

export interface InventarisUsulan {
  id: string;
  nama_barang: string;
  jumlah_diusulkan: number;
  alasan_kebutuhan: string;
  foto_usulan_url?: string;
  pengusul_id: string;
  status: 'Menunggu' | 'Disetujui' | 'Ditolak' | 'Terealisasi';
  catatan_pembina?: string;
  diverifikasi_oleh?: string;
  created_at: string;
}

export interface MateriPmr {
  id: string;
  judul_materi: string;
  url_materi: string;
  deskripsi_singkat?: string | null;
  is_pinned: boolean;
  created_by?: string | null;
  created_at?: string;
}

export interface UtilitasEksternal {
  id: string;
  nama: string;
  target_url: string;
  akses_minimal?: string;
  ikon_url: string;
  warna_bg?: string;
  warna_aksen?: string;
  created_at?: string;
}

export type MenuKey = 'dashboard' | 'anggota' | 'presensi' | 'pmr-tools';
export type UtilitySubModule = 'inventaris' | 'kalender' | 'kta' | 'materi' | 'pelaporan' | null;
