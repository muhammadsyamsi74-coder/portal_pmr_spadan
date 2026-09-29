# 🏥 PORTAL PMR SPADAN (SMP NEGERI 8 BALIKPAPAN)

> **Portal Resmi Palang Merah Remaja (PMR) Madya SMP Negeri 8 Balikpapan**  
> Sistem Informasi Manajemen Keanggotaan, Presensi Terpadu, Cetak KTA Digital, Inventaris UKS, Agenda Kegiatan, dan Administrasi Organisasi.

---

## 📋 Daftar Isi
- [Fitur Utama](#-fitur-utama)
- [Teknologi yang Digunakan](#-teknologi-yang-digunakan)
- [Struktur Direktori](#-struktur-direktori)
- [Panduan Instalasi Lokal](#-panduan-instalasi-lokal)
- [Konfigurasi Environment Variable](#-konfigurasi-environment-variable)
- [Panduan Upload ke GitHub](#-panduan-upload-ke-github)
  - [Cara 1: Menggunakan Terminal / Git CLI (Direkomendasikan)](#cara-1-menggunakan-terminal--git-cli-direkomendasikan)
  - [Cara 2: Menggunakan GitHub Web (Tanpa Terminal)](#cara-2-menggunakan-github-web-tanpa-terminal)
- [Panduan Deploy Online (Gratis)](#-panduan-deploy-online-gratis)
- [Kontribusi & Lisensi](#-kontribusi--lisensi)

---

## ✨ Fitur Utama

### 1. 📊 Dashboard Eksekutif
- **Slideshow Kegiatan**: Dokumentasi visual interaktif dengan transisi halus.
- **Banner Pengumuman Darurat**: Notifikasi dinamis otomatis aktif H-1 hingga +36 jam pelaksanaan agenda besar.
- **Statistik Real-time**: Jumlah Anggota Aktif, Korps Alumni, Calon Anggota, serta persentase kehadiran personal & unit.
- **Mini Calendar**: Kalender penanda tanggal agenda dan kegiatan mendatang.
- **Bagan Struktur Organisasi**: Visualisasi pembina, pelatih, pengurus inti, dan koordinator seksi.

### 2. 👥 Manajemen Keanggotaan (Member Directory)
- **Tampilan Ganda**: Mode Tabel Terstruktur (berkelompok per status) & Mode Kartu Hierarki Visual.
- **Filter & Pencarian**: Pencarian instan berdasarkan Nama, NISN, Golongan Darah, Status, dan Kelas.
- **CRUD Lengkap**: Tambah anggota baru, ubah data diri, dan hapus anggota (dengan proteksi modal konfirmasi aman).
- **Foto Profil & Zoom**: Pratinjau foto profil dengan modal zoom resolusi tinggi.

### 3. 📝 Presensi Terpadu
- **Pencatatan Presensi**: Formulir input nama kegiatan, kategori, lokasi, waktu, dan keterangan.
- **Multi-Foto Dokumentasi**: Pengunggahan foto dokumentasi dengan kompresi otomatis di sisi klien (Canvas HTML5) sebelum dikirim ke Supabase Storage.
- **Checklist Presensi Cepat**: Tombol *Set Semua Hadir* dan penanda status (Hadir, Sakit, Izin, Alpa).
- **Riwayat & Kelola Sesi**: Riwayat presensi terfilter (Bulan/Tahun, Jenis Kegiatan), tombol Edit Sesi, serta Hapus Sesi Presensi beserta pembersihan berkas foto otomatis.

### 4. 💳 Cetak KTA Digital (Kartu Tanda Anggota)
- **Desain Kartu Standar Nasional**: Kartu depan & belakang presisi tinggi format standar KTA PMR Madya.
- **Bilah Pratinjau Fleksibel**: Toggle tampilan kartu (*Tampilkan Keduanya*, *Hanya Sisi Depan*, *Hanya Sisi Belakang*).
- **Pilihan Cetak Lengkap**: Tombol cetak sepasang (Depan & Belakang dalam 1 lembar F4/A4), cetak depan saja, atau cetak belakang saja.
- **Verifikasi QR Code**: QR Code resmi yang terhubung ke parameter verifikasi keaslian anggota (`?verify_id=<id>`).
- **Lencana Khusus Alumni**: Desain emas elegan untuk korps alumni PMR SPADAN.

### 5. 🏥 Modul Inventaris & UKS
- **Manajemen Logistik & Obat**: Pencatatan stok obat, alat medis, tanggal kadaluarsa, lokasi rak, dan kondisi fisik (Baik/Rusak).
- **Usulan Pengadaan**: Formulir pengajuan kebutuhan barang UKS baru.
- **Profil Ruang UKS**: Data fasilitas ruang UKS (luas, kapasitas tempat tidur, ventilasi, daya listrik).

### 6. 📅 Kalender & Agenda Kegiatan
- Kalender interaktif bulanan dengan penanda titik kegiatan.
- Tata letak desktop lebar dengan kartu agenda kegiatan bergaya grid responsif.
- Pembuatan jadwal agenda kegiatan baru dan modal konfirmasi hapus agenda.

### 7. 📚 Pustaka Materi & Pelaporan Administrasi
- **Pustaka Materi**: Modul 7 Prinsip Palang Merah, Pertolongan Pertama (PP), Kepemimpinan, Donor Darah, Kesehatan Remaja, dan Kesiapsiagaan Bencana.
- **Pelaporan & Cetak**: Rekap presensi bulanan, jurnal kegiatan, dan lembar dokumentasi foto cetak F4.
- **Pintasan Eksternal**: Tautan cepat ke Google Drive, Form Pendaftaran, dan media sosial resmi.

---

## 🛠 Teknologi yang Digunakan

- **Frontend Framework**: [React 18](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **Build Tool**: [Vite](https://vitejs.dev/)
- **Styling**: Tailwind CSS & Modern Custom CSS Grid/Flexbox
- **Icons**: [Lucide React](https://lucide.dev/)
- **Backend / Database**: [Supabase](https://supabase.com/) (PostgreSQL Database & Supabase Storage)

---

## 📁 Struktur Direktori

```text
├── .env.example            # Contoh konfigurasi environment variable
├── .gitignore              # Daftar berkas yang dikecualikan dari Git
├── index.html              # Entry point HTML aplikasi
├── package.json            # Daftar dependensi & scripts
├── tsconfig.json           # Konfigurasi TypeScript
├── vite.config.ts          # Konfigurasi Vite
├── vercel.json             # Konfigurasi routing untuk deployment Vercel
├── README.md               # Dokumentasi proyek
└── src/
    ├── main.tsx            # Inisialisasi React DOM
    ├── App.tsx             # Komponen utama navigasi & routing
    ├── index.css           # Styling global & layout utility
    ├── components/         # Komponen UI
    │   ├── common/         # Header, Footer, Modal, dsb.
    │   └── views/          # Halaman utama & modul:
    │       ├── DashboardView.tsx
    │       ├── AnggotaView.tsx
    │       ├── PresensiView.tsx
    │       └── utility/    # KtaModule, KalenderModule, UksModule, PustakaModule, dsb.
    ├── context/            # React Context (Auth, Peran/Role, Status)
    ├── services/           # Inisialisasi Supabase Client
    ├── types/              # Deklarasi tipe TypeScript
    └── utils/              # Helper sanitasi data, kompresi foto, format tanggal
```

---

## 💻 Panduan Instalasi Lokal

### Prasyarat
- [Node.js](https://nodejs.org/) versi 18 atau lebih baru.
- npm, yarn, pnpm, atau bun.

### Langkah-langkah:
1. **Clone atau Ekstrak Repository**:
   ```bash
   git clone https://github.com/USERNAME_ANDA/portal-pmr-spadan.git
   cd portal-pmr-spadan
   ```

2. **Instal Seluruh Dependensi**:
   ```bash
   npm install
   ```

3. **Buat File Konfigurasi Environment**:
   Salin file `.env.example` menjadi `.env`:
   ```bash
   cp .env.example .env
   ```

4. **Jalankan Server Development**:
   ```bash
   npm run dev
   ```
   Buka browser Anda dan akses: `http://localhost:3000`

---

## 🔐 Konfigurasi Environment Variable

File `.env` diisi dengan kredensial Supabase proyek Anda:

```env
VITE_SUPABASE_URL=https://ndahxwqshyukqpnjkniw.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

> **Catatan Keamanan**: Jangan pernah mempublikasikan file `.env` asli ke GitHub. File `.gitignore` yang sudah disediakan akan otomatis mencegah file `.env` ter-upload.

---

## 🚀 Panduan Upload ke GitHub

### Cara 1: Menggunakan Terminal / Git CLI (Direkomendasikan)

1. **Buat Repository Baru di GitHub**:
   - Buka [github.com/new](https://github.com/new).
   - Beri nama repository, misalnya: `portal-pmr-spadan`.
   - Pilih visibilitas **Public** atau **Private**.
   - **Jangan centang** opsi *"Initialize this repository with a README"* (karena file README sudah ada).
   - Klik tombol **Create repository**.

2. **Jalankan Perintah Git di Folder Proyek Anda**:
   Buka terminal di folder proyek ini, lalu jalankan perintah berikut secara berurutan:

   ```bash
   # Inisialisasi Git
   git init

   # Tambahkan semua file ke staging (kecuali yang ada di .gitignore)
   git add .

   # Buat commit pertama
   git commit -m "feat: inisialisasi awal Portal PMR SPADAN"

   # Ubah branch utama menjadi main
   git branch -M main

   # Hubungkan dengan repository GitHub Anda (ganti URL di bawah dengan URL repo Anda)
   git remote add origin https://github.com/USERNAME_ANDA/portal-pmr-spadan.git

   # Upload seluruh kode ke GitHub
   git push -u origin main
   ```

---

### Cara 2: Menggunakan GitHub Web (Tanpa Terminal)

1. **Download File ZIP dari Google AI Studio**:
   - Klik menu titik tiga `⋮` di pojok kanan atas AI Studio, lalu pilih **Export / Download as ZIP**.
   - Ekstrak file ZIP tersebut di komputer Anda.
   - **PENTING**: Hapus folder `node_modules` dan folder `dist` jika ada di dalam hasil ekstrak sebelum meng-upload.

2. **Buat Repository Baru di GitHub**:
   - Buka [github.com/new](https://github.com/new).
   - Beri nama repository `portal-pmr-spadan`, lalu centang **Add a README file** agar tombol upload aktif.
   - Klik **Create repository**.

3. **Upload File**:
   - Pada halaman repository yang baru dibuat, klik tombol **Add file** -> **Upload files**.
   - Tarik (drag & drop) seluruh folder dan file hasil ekstrak ke kotak yang tersedia.
   - Masukkan pesan commit (contoh: `Initial commit PMR SPADAN`), lalu klik **Commit changes**.

---

## 🌐 Panduan Deploy Online (Gratis)

Proyek ini siap di-deploy langsung ke **Vercel** atau **Netlify**:

### Deploy ke Vercel (Paling Mudah)
1. Buka [vercel.com](https://vercel.com/) dan login dengan akun GitHub Anda.
2. Klik **Add New...** -> **Project**.
3. Pilih repository `portal-pmr-spadan` yang sudah Anda upload ke GitHub.
4. Pada bagian **Environment Variables**, tambahkan:
   - `VITE_SUPABASE_URL` = URL Supabase Anda
   - `VITE_SUPABASE_ANON_KEY` = Anon Key Supabase Anda
5. Klik **Deploy**. Aplikasi Anda akan aktif dalam hitungan detik dengan URL `https://nama-proyek.vercel.app`!

---

## 📜 Lisensi & Hak Cipta

Dikelola dan dikembangkan untuk **PMR Madya Unit SMP Negeri 8 Balikpapan**.  
Semua hak dilindungi undang-undang.
