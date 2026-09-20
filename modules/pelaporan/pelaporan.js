/**
 * ==============================================================================
 * [CONTROLLER] MODUL PELAPORAN ADMINISTRASI - PMR SPADAN
 * ==============================================================================
 * Deskripsi:
 * Menggabungkan rekap presensi, dokumentasi foto, jurnal, dan laporan resmi
 * ke dalam template kertas F4 untuk diekspor menjadi dokumen cetak.
 * ==============================================================================
 */

// [STATE] Log Data Pelaporan
var rawPresensi = [];
var rawUsers = [];
var kegiatanUnik = [];

/**
 * [HELPER] Resolver Klien Database
 * Mengambil objek database dari scope global, window.parent (iframe),
 * atau membuat koneksi mandiri sebagai cadangan.
 */
function getPelaporanDbClient() {
  if (window.db) return window.db;
  if (window.parent && window.parent.db) return window.parent.db;
  if (typeof supabase !== "undefined") {
    const url = window.SUPABASE_URL || (window.parent && window.parent.SUPABASE_URL) || "https://ndahxwqshyukqpnjkniw.supabase.co";
    const key = window.SUPABASE_ANON_KEY || (window.parent && window.parent.SUPABASE_ANON_KEY) || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5kYWh4d3FzaHl1a3Fwbmprbml3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkxNjEzODUsImV4cCI6MjEwNDczNzM4NX0.lkxXa2M16275nkjNKnWN3KE5NT7J1BVoyEO7xVAxJt8";
    window.db = supabase.createClient(url, key);
    return window.db;
  }
  return null;
}

/**
 * [INISIALISASI] Memuat Data setelah DOM Siap
 */
document.addEventListener("DOMContentLoaded", async () => {
  const isAuthorized = await checkPelaporanAccess();
  if (!isAuthorized) return;

  const now = new Date();
  const currMonth = String(now.getMonth() + 1).padStart(2, '0');
  const currYear = now.getFullYear();

  const elBulan = document.getElementById("lap-bulan");
  const elTahun = document.getElementById("lap-tahun");
  if (elBulan) elBulan.value = currMonth;
  if (elTahun) elTahun.value = currYear;

  if (window.lucide) lucide.createIcons();
});

/**
 * [KONTROL] Validasi Hak Akses Modul
 */
async function checkPelaporanAccess() {
  try {
    let profile = null;
    if (window.parent && window.parent.activeUserProfile) {
      profile = window.parent.activeUserProfile;
    } else if (typeof getCurrentUserProfile === "function") {
      profile = await getCurrentUserProfile();
    }
    
    if (!profile) {
      const dbClient = getPelaporanDbClient();
      if (dbClient?.auth) {
        const { data: { user } } = await dbClient.auth.getUser();
        if (user) {
          const { data } = await dbClient.from("users_profile").select("*").eq("id", user.id).single();
          profile = data;
        }
      }
    }

    if (!profile) {
      showAccessDenied("Akses Ditolak: Anda masuk sebagai Guest (Tamu). Silakan login terlebih dahulu menggunakan akun resmi PMR.");
      return false;
    }

    const role = (profile.jabatan || "").toLowerCase();
    const ket = (profile.keterangan_jabatan || "").toLowerCase();
    const isAlumni = ket.includes("alumni");
    const isNonAktif = ket.includes("non-aktif") || role === "non-aktif";

    if (isAlumni || isNonAktif) {
      showAccessDenied(`Akses Ditolak: Akun dengan status '${profile.keterangan_jabatan || 'Non-Aktif'}' tidak diizinkan mengakses modul pelaporan.`);
      return false;
    }
    return true;
  } catch (e) {
    console.warn("[Pelaporan] Gagal memvalidasi hak akses:", e);
    return true;
  }
}

function showAccessDenied(message) {
  const workspace = document.querySelector(".workspace-container");
  if (workspace) {
    workspace.innerHTML = `
      <div style="text-align: center; padding: 50px 20px; background: #ffffff; border-radius: 18px; border-top: 5px solid #b91c1c; box-shadow: 0 4px 18px rgba(0,0,0,0.04); margin-top: 30px;">
        <div style="display: flex; justify-content: center; margin-bottom: 14px;">
          <i data-lucide="shield-alert" style="width: 50px; height: 50px; color: #b91c1c;"></i>
        </div>
        <h2 style="font-size: 18px; font-weight: 800; color: #b91c1c; margin-bottom: 8px;">Akses Terbatas</h2>
        <p style="font-size: 13px; color: #64748b; max-width: 440px; margin: 0 auto; line-height: 1.5;">${message}</p>
      </div>
    `;
    if (window.lucide) lucide.createIcons();
  }
}

window.bukaPanel = function(panelId) {
  if (rawPresensi.length === 0) {
    return alert("Silakan klik 'Tarik Data Laporan' terlebih dahulu.");
  }
  document.querySelectorAll(".laporan-panel").forEach(p => p.style.display = "none");
  const target = document.getElementById(panelId);
  if (target) {
    target.style.display = "block";
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  if (window.lucide) lucide.createIcons();
};

/**
 * [DATA] Menarik Data Laporan dari Basis Data Berdasarkan Periode
 */
window.muatDataPelaporan = async function() {
  const dbClient = getPelaporanDbClient();
  if (!dbClient) return alert("Koneksi basis data tidak tersedia.");

  const bulanEl = document.getElementById("lap-bulan");
  const bulan = bulanEl.value;
  const namaBulan = bulanEl.options[bulanEl.selectedIndex].text;
  const tahun = document.getElementById("lap-tahun").value;
  const jenisKegiatan = document.getElementById("lap-jenis").value;

  const startDate = `${tahun}-${bulan}-01`;
  const endDate = new Date(tahun, parseInt(bulan, 10), 0).toISOString().split('T')[0];

  try {
    const { data: users, error: errUsers } = await dbClient
      .from("users_profile")
      .select("id, nama_lengkap, kelas, jabatan, keterangan_jabatan");

    let presensiQuery = dbClient.from("presensi")
      .select("*")
      .gte("tanggal_kegiatan", startDate)
      .lte("tanggal_kegiatan", endDate)
      .order("tanggal_kegiatan", { ascending: true });

    if (jenisKegiatan !== "Semua Kegiatan") {
      presensiQuery = presensiQuery.eq("jenis_kegiatan", jenisKegiatan);
    }

    const { data: presensi, error: errPresensi } = await presensiQuery;

    if (errUsers || errPresensi) throw new Error("Gagal menarik data dari basis data.");

    rawUsers = users || [];
    rawPresensi = presensi || [];

    ekstrakKegiatanUnik();

    const thnInt = parseInt(tahun, 10);
    const blnInt = parseInt(bulan, 10);
    const ta = (blnInt >= 7) ? `${thnInt}/${thnInt + 1}` : `${thnInt - 1}/${thnInt}`;

    document.getElementById("cov_b3").value = `BULAN: ${namaBulan.toUpperCase()} ${tahun}`;
    document.getElementById("cov_ta").value = `TAHUN AJARAN ${ta}`;

    populateDropdownSignatures();
    
    window.renderCover();
    window.renderLaporan();
    window.renderAbsen();
    window.renderJurnal();
    window.renderDokumentasi();

    alert(`Data berhasil ditarik: ${kegiatanUnik.length} agenda kegiatan ditemukan.`);
    window.bukaPanel('panel-cover');
  } catch (error) {
    alert(error.message);
  }
};

function ekstrakKegiatanUnik() {
  const mapKegiatan = new Map();

  rawPresensi.forEach(p => {
    const key = `${p.tanggal_kegiatan}_${p.nama_kegiatan}`;
    let parsedFotos = [];
    
    if (p.foto_dokumentasi_url) {
      try {
        const decoded = JSON.parse(p.foto_dokumentasi_url);
        if (Array.isArray(decoded)) {
          parsedFotos = decoded;
        } else if (typeof decoded === "string" && decoded.trim() !== "") {
          parsedFotos = [decoded];
        }
      } catch (e) {
        if (p.foto_dokumentasi_url.trim() !== "") {
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
        deskripsi: p.deskripsi_kegiatan || "Latihan Rutin PMR",
        fotos: parsedFotos
      });
    } else {
      const existing = mapKegiatan.get(key);
      parsedFotos.forEach(url => {
        if (!existing.fotos.includes(url)) existing.fotos.push(url);
      });
    }
  });

  kegiatanUnik = Array.from(mapKegiatan.values());
}

function populateDropdownSignatures() {
  const selects = [
    "cov_nama", "ttd_lap_kiri", "ttd_lap_kanan", "ttd_lap_tengah",
    "ttd_abs_pel_kiri", "ttd_abs_pel_kanan",
    "ttd_abs_sis_kiri", "ttd_abs_sis_tengah", "ttd_abs_sis_kanan",
    "ttd_jurnal_kanan"
  ];

  let optionsHtml = '';
  rawUsers.forEach(u => {
    optionsHtml += `<option value="${u.id}">${u.nama_lengkap} (${u.keterangan_jabatan || '-'})</option>`;
  });

  selects.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.innerHTML = optionsHtml;
      
      // Auto Select Jabatan Berdasarkan Kolom
      if (id === 'ttd_lap_tengah' || id === 'ttd_abs_pel_kanan' || id === 'ttd_abs_sis_kanan') {
        selectUserByRole(el, 'Kepala Sekolah');
      } else if (id === 'ttd_lap_kiri' || id === 'ttd_abs_pel_kiri' || id === 'ttd_abs_sis_kiri') {
        selectUserByRole(el, 'Pembina 1');
      } else if (id === 'cov_nama' || id === 'ttd_lap_kanan' || id === 'ttd_abs_sis_tengah' || id === 'ttd_jurnal_kanan') {
        selectUserByRole(el, 'Pelatih');
      }
    }
  });
}

function selectUserByRole(selectEl, targetRole) {
  const user = rawUsers.find(u => (u.keterangan_jabatan || "").toLowerCase().includes(targetRole.toLowerCase()));
  if (user) selectEl.value = user.id;
}

function getSigData(selectId, defaultJabatan) {
  const selectEl = document.getElementById(selectId);
  if (!selectEl || !selectEl.value) return { nama: '....................................', jabatan: defaultJabatan };
  const user = rawUsers.find(u => u.id === selectEl.value);
  return { nama: user ? user.nama_lengkap : '....................................', jabatan: user ? user.keterangan_jabatan : defaultJabatan };
}

const kopSurat = `
  <div class="kop-surat">
    <h3>PALANG MERAH REMAJA (PMR)</h3>
    <h2>SMP NEGERI 8 BALIKPAPAN</h2>
    <p>Jl. Mulawarman RT.54, kel. Manggar, Kec. Balikpapan Timur, Kota Balikpapan</p>
  </div>
`;

function formatTglIndo(tglStr) {
  if (!tglStr || tglStr === ".....") return ".....................";
  const p = tglStr.split('-');
  if (p.length !== 3) return tglStr;
  const blnIndo = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  return `${parseInt(p[2], 10)} ${blnIndo[parseInt(p[1], 10) - 1]} ${p[0]}`;
}

window.renderCover = function() {
  const b1 = document.getElementById("cov_b1").value;
  const b2 = document.getElementById("cov_b2").value;
  const b3 = document.getElementById("cov_b3").value;
  const b4 = document.getElementById("cov_b4").value;
  const sig = getSigData("cov_nama", "Pelatih PMR");
  const jabPembuat = document.getElementById("cov_jabatan").value;
  const ta = document.getElementById("cov_ta").value;

  const logoUrl = "https://lh3.googleusercontent.com/d/14EmaUclAMOYMXPnnNrCbfyQzTHY4JP4z"; // PMI Logo Placeholder

  const html = `
    <div style="text-align:center; padding-top:20px; display:flex; flex-direction:column; justify-content:space-between; min-height:280mm; box-sizing:border-box;">
      <div>
        <h1 style="font-size:28pt; margin-bottom: 15px; font-weight:900;">${b1}</h1>
        <h2 style="font-size:22pt; margin-bottom: 35px; font-weight:800;">${b2}</h2>
        <h3 style="font-size:18pt; font-weight:800; color:var(--text-dark);">${b3}</h3>
      </div>
      <div style="flex-grow:1; display:flex; align-items:center; justify-content:center; margin: 40px 0;">
        <img src="${logoUrl}" style="width:220px; height:auto; display:block;" alt="Logo PMI" />
      </div>
      <div>
        <p style="font-size:14pt; margin-bottom:20px;">${b4}</p>
        <h3 style="font-size:16pt; text-decoration:underline; font-weight:800; margin-bottom:6px;">${sig.nama}</h3>
        <p style="font-size:14pt; margin-bottom:60px;">${jabPembuat}</p>
        <h3 style="font-size:18pt; font-weight:800; margin-bottom:10px;">${b2}</h3>
        <h3 style="font-size:16pt; font-weight:700;">${ta}</h3>
      </div>
    </div>
  `;
  document.getElementById("print-cover").innerHTML = html;
};

window.renderLaporan = function() {
  const sigKiri = getSigData("ttd_lap_kiri", "Pembina 1");
  const sigKanan = getSigData("ttd_lap_kanan", "Pelatih");
  const sigTengah = getSigData("ttd_lap_tengah", "Kepala Sekolah");

  let html = '';
  kegiatanUnik.forEach((keg) => {
    html += `
      <div class="paper-f4">
        ${kopSurat}
        <div class="judul-laporan">LAPORAN HARIAN KEGIATAN EKSTRAKURIKULER</div>
        <table class="table-laporan-resmi">
          <tr><td style="width:4%;">1.</td><td style="width:30%;">Nama Kegiatan</td><td>: ${keg.judul} (${keg.jenis})</td></tr>
          <tr><td>2.</td><td>Waktu Pelaksanaan</td><td>: ${formatTglIndo(keg.tanggal)}</td></tr>
          <tr><td>3.</td><td>Tempat Kegiatan</td><td>: ${keg.tempat}</td></tr>
          <tr><td>4.</td><td>Materi / Deskripsi</td><td>: ${keg.deskripsi}</td></tr>
          <tr><td>5.</td><td>Hasil yang Dicapai</td><td>: Seluruh peserta mengikuti rangkaian kegiatan pembinaan dengan tertib, terampil, dan memahami materi.</td></tr>
        </table>
        
        <table class="table-ttd">
          <tr><td style="width:50%;">Mengetahui,<br>${sigKiri.jabatan}</td><td style="width:50%;">Balikpapan, ${formatTglIndo(keg.tanggal)}<br>${sigKanan.jabatan}</td></tr>
          <tr><td colspan="2" style="height:65px;"></td></tr>
          <tr><td><b><u>${sigKiri.nama}</u></b></td><td><b><u>${sigKanan.nama}</u></b></td></tr>
          
          <tr><td colspan="2" style="padding-top:25px;">Mengetahui,<br>${sigTengah.jabatan}</td></tr>
          <tr><td colspan="2" style="height:65px;"></td></tr>
          <tr><td colspan="2"><b><u>${sigTengah.nama}</u></b></td></tr>
        </table>
      </div>
    `;
  });
  document.getElementById("print-laporan").innerHTML = html || `<p style="text-align:center; padding:20px;">Tidak ada kegiatan.</p>`;
};

window.renderAbsen = function(modeCustom = 'normal') {
  // Identifikasi Unsur Pelatih & Pembina
  const pelatihRoles = ['kepala sekolah', 'pembina 1', 'pembina 2', 'pelatih'];
  const pelatihUsers = rawUsers.filter(u => {
    const ket = (u.keterangan_jabatan || '').toLowerCase();
    const jab = (u.jabatan || '').toLowerCase();
    return pelatihRoles.some(r => ket.includes(r) || jab.includes(r));
  });

  // Filter Eksklusif Anggota Aktif PMR
  const siswaUsers = rawUsers.filter(u => {
    const ket = (u.keterangan_jabatan || '').toLowerCase();
    const jab = (u.jabatan || '').toLowerCase();
    const isDewasa = pelatihRoles.some(r => ket.includes(r) || jab.includes(r));
    const isAlumni = ket.includes('alumni') || jab.includes('alumni');
    const isNonAktif = ket.includes('non-aktif') || jab === 'non-aktif';
    return !isDewasa && !isAlumni && !isNonAktif;
  });

  siswaUsers.sort((a, b) => (a.nama_lengkap || '').localeCompare(b.nama_lengkap || '', 'id', { sensitivity: 'base' }));

  const minKolom = parseInt(document.getElementById("absen_min_kolom").value, 10) || 8;
  const tanggalUnik = [...new Set(kegiatanUnik.map(k => k.tanggal))].sort();
  const tglAkhir = tanggalUnik.length > 0 ? tanggalUnik[tanggalUnik.length - 1] : ".....";

  let tanggalTampil = [...tanggalUnik];
  while (tanggalTampil.length < minKolom) {
    tanggalTampil.push("");
  }

  const thTanggal = tanggalTampil.map(t => {
    if (t === "") return `<th style="font-size:9.5px; width:4%; text-align:center;">-</th>`;
    return `<th style="font-size:9.5px; width:4%; text-align:center;">${t.substring(8, 10)}/${t.substring(5, 7)}</th>`;
  }).join('');

  // TABEL 1: LEMBAR DAFTAR HADIR PELATIH & PEMBINA
  const sigPelKiri = getSigData("ttd_abs_pel_kiri", "Pembina 1");
  const sigPelKanan = getSigData("ttd_abs_pel_kanan", "Kepala Sekolah");

  let rowPelatih = '';
  pelatihUsers.forEach((user, i) => {
    let rowTgl = '';
    tanggalTampil.forEach(tgl => {
      if (tgl === "") {
        rowTgl += `<td style="text-align:center;"></td>`;
      } else {
        const pRow = rawPresensi.find(p => p.user_id === user.id && p.tanggal_kegiatan === tgl);
        let status = pRow ? pRow.status_kehadiran.charAt(0).toUpperCase() : "-";
        if (modeCustom === "paraf") status = "";
        rowTgl += `<td style="text-align:center; font-weight:bold;">${status}</td>`;
      }
    });
    const jabatanDisplay = user.keterangan_jabatan || user.jabatan || "-";
    rowPelatih += `
      <tr>
        <td style="text-align:center;">${i + 1}</td>
        <td>${user.nama_lengkap}</td>
        <td style="text-align:center; font-size:10pt;">${jabatanDisplay}</td>
        ${rowTgl}
      </tr>
    `;
  });

  const htmlPelatih = `
    <div class="paper-landscape-f4">
      ${kopSurat}
      <div class="judul-laporan">DAFTAR HADIR PELATIH & PEMBINA PMR</div>
      <table class="table-data">
        <tr style="background:#f1f5f9;">
          <th style="width:4%; text-align:center;">No</th>
          <th style="width:24%;">Nama Lengkap</th>
          <th style="width:14%; text-align:center;">Jabatan</th>
          ${thTanggal}
        </tr>
        ${rowPelatih || '<tr><td colspan="12" style="text-align:center;">Data kosong</td></tr>'}
      </table>
      <table class="table-ttd">
        <tr>
          <td style="width:50%;">Mengetahui,<br>${sigPelKiri.jabatan}</td>
          <td style="width:50%;">Balikpapan, ${formatTglIndo(tglAkhir)}<br>${sigPelKanan.jabatan}</td>
        </tr>
        <tr><td colspan="2" style="height:60px;"></td></tr>
        <tr>
          <td><b><u>${sigPelKiri.nama}</u></b></td>
          <td><b><u>${sigPelKanan.nama}</u></b></td>
        </tr>
      </table>
    </div>
  `;

  // TABEL 2: LEMBAR DAFTAR HADIR ANGGOTA AKTIF SISWA
  const sigSisKiri = getSigData("ttd_abs_sis_kiri", "Pembina 1");
  const sigSisTengah = getSigData("ttd_abs_sis_tengah", "Pelatih");
  const sigSisKanan = getSigData("ttd_abs_sis_kanan", "Kepala Sekolah");

  let rowSiswa = '';
  siswaUsers.forEach((user, i) => {
    let rowTgl = '';
    tanggalTampil.forEach(tgl => {
      if (tgl === "") {
        rowTgl += `<td style="text-align:center;"></td>`;
      } else {
        const pRow = rawPresensi.find(p => p.user_id === user.id && p.tanggal_kegiatan === tgl);
        let status = pRow ? pRow.status_kehadiran.charAt(0).toUpperCase() : "-";
        if (modeCustom === "paraf") status = "";
        rowTgl += `<td style="text-align:center; font-weight:bold;">${status}</td>`;
      }
    });
    const role = user.keterangan_jabatan || "Anggota";
    const kelas = user.kelas ? ` / ${user.kelas}` : "";
    const jabatanKelas = `${role}${kelas}`;

    rowSiswa += `
      <tr>
        <td style="text-align:center;">${i + 1}</td>
        <td>${user.nama_lengkap}</td>
        <td style="text-align:center; font-size:10pt;">${jabatanKelas}</td>
        ${rowTgl}
      </tr>
    `;
  });

  const htmlSiswa = `
    <div class="paper-landscape-f4">
      ${kopSurat}
      <div class="judul-laporan">DAFTAR HADIR ANGGOTA AKTIF PMR</div>
      <table class="table-data">
        <tr style="background:#f1f5f9;">
          <th style="width:4%; text-align:center;">No</th>
          <th style="width:24%;">Nama Lengkap</th>
          <th style="width:14%; text-align:center;">Jabatan / Kelas</th>
          ${thTanggal}
        </tr>
        ${rowSiswa || '<tr><td colspan="12" style="text-align:center;">Tidak ada anggota aktif tercatat</td></tr>'}
      </table>
      <table class="table-ttd">
        <tr>
          <td style="width:33%;">Mengetahui,<br>${sigSisKiri.jabatan}</td>
          <td style="width:33%;">Mengetahui,<br>${sigSisTengah.jabatan}</td>
          <td style="width:33%;">Balikpapan, ${formatTglIndo(tglAkhir)}<br>${sigSisKanan.jabatan}</td>
        </tr>
        <tr><td colspan="3" style="height:60px;"></td></tr>
        <tr>
          <td><b><u>${sigSisKiri.nama}</u></b></td>
          <td><b><u>${sigSisTengah.nama}</u></b></td>
          <td><b><u>${sigSisKanan.nama}</u></b></td>
        </tr>
      </table>
    </div>
  `;

  document.getElementById("print-absen").innerHTML = htmlPelatih + htmlSiswa;
};

window.cetakAbsen = function(mode, orientation) {
  window.renderAbsen(mode);
  window.cetakDiv('print-absen', orientation);
};

window.renderJurnal = function() {
  const sigJurnal = getSigData("ttd_jurnal_kanan", "Pelatih");
  const tanggalUnik = [...new Set(kegiatanUnik.map(k => k.tanggal))].sort();
  const tglAkhir = tanggalUnik.length > 0 ? tanggalUnik[tanggalUnik.length - 1] : ".....";

  let rows = '';
  kegiatanUnik.forEach((keg, i) => {
    rows += `<tr><td style="text-align:center;">${i + 1}</td><td style="text-align:center;">${formatTglIndo(keg.tanggal)}</td><td><b>${keg.judul}</b><br><span style="font-size:10pt;">${keg.deskripsi}</span></td><td>${keg.tempat}</td></tr>`;
  });

  const html = `
    <div class="paper-landscape-f4">
      ${kopSurat}
      <div class="judul-laporan">JURNAL KEGIATAN EKSTRAKURIKULER PMR</div>
      <table class="table-data">
        <tr style="background:#f1f5f9;"><th style="width:5%; text-align:center;">No</th><th style="width:18%; text-align:center;">Tanggal</th><th>Materi & Uraian Kegiatan</th><th style="width:22%;">Tempat Pelaksanaan</th></tr>
        ${rows || '<tr><td colspan="4" style="text-align:center;">Belum ada jurnal tercatat.</td></tr>'}
      </table>
      <table class="table-ttd" style="width:35%; margin-left:auto; margin-right:0;">
        <tr><td>Balikpapan, ${formatTglIndo(tglAkhir)}<br>${sigJurnal.jabatan}</td></tr>
        <tr><td style="height:65px;"></td></tr>
        <tr><td><b><u>${sigJurnal.nama}</u></b></td></tr>
      </table>
    </div>
  `;
  document.getElementById("print-jurnal").innerHTML = html;
};

window.renderDokumentasi = function() {
  let allPhotos = [];
  kegiatanUnik.forEach((keg) => {
    if (keg.fotos && keg.fotos.length > 0) {
      keg.fotos.forEach((fotoUrl) => {
        allPhotos.push({
          url: fotoUrl,
          tanggal: keg.tanggal
        });
      });
    }
  });

  if (allPhotos.length === 0) {
    document.getElementById("print-dokumentasi").innerHTML = `
      <div class="paper-f4">
        ${kopSurat}
        <div class="judul-laporan">DOKUMENTASI PELAKSANAAN KEGIATAN</div>
        <p style="text-align:center; padding:40px; color:#64748b;">Belum ada lampiran foto dokumentasi pada kegiatan bulan ini.</p>
      </div>
    `;
    return;
  }

  let html = "";
  const chunkSize = 4;
  for (let i = 0; i < allPhotos.length; i += chunkSize) {
    const chunk = allPhotos.slice(i, i + chunkSize);
    html += `
      <div class="paper-f4">
        ${kopSurat}
        <div class="judul-laporan">DOKUMENTASI PELAKSANAAN KEGIATAN</div>
        <div style="display: flex; flex-direction: column; gap: 16px; align-items: center; justify-content: flex-start;">
    `;
    chunk.forEach((item) => {
      html += `
        <div style="text-align: center; width: 100%; page-break-inside: avoid; margin-bottom: 10px;">
          <img src="${item.url}" alt="Dokumentasi Kegiatan" style="max-width: 65%; max-height: 190px; object-fit: contain; border: 1.5px solid black; padding: 3px; background: white; display: block; margin: 0 auto;" />
          <p style="margin-top: 5px; font-size: 11pt; font-family: 'Times New Roman', serif;">Tanggal: ${formatTglIndo(item.tanggal)}</p>
        </div>
      `;
    });
    html += `</div></div>`;
  }
  document.getElementById("print-dokumentasi").innerHTML = html;
};

window.cetakDiv = function(divId, orientation = 'portrait') {
  if (divId === 'print-absen') window.renderAbsen('normal');
  const konten = document.getElementById(divId).innerHTML;
  const pageStyle = orientation === 'landscape' 
    ? '@page { size: 330mm 215mm; margin: 15mm; }' 
    : '@page { size: 215mm 330mm; margin: 15mm; }';
    
  document.body.classList.add('is-printing');
  document.getElementById("print-container").innerHTML = `<style>${pageStyle}</style>` + konten;
  window.print();
  
  setTimeout(() => {
    document.body.classList.remove('is-printing');
    document.getElementById("print-container").innerHTML = '';
  }, 500);
};