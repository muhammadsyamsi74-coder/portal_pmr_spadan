/**
 * ==============================================================================
 * ENGINE MODUL PELAPORAN ADMINISTRASI - PMR SPADAN
 * Diperbarui dengan Validasi Hak Akses (Admin, Pengurus, Anggota Aktif)
 * ==============================================================================
 */

var rawPresensi = [];
var rawUsers = [];
var kegiatanUnik = [];

document.addEventListener("DOMContentLoaded", async () => {
  // Validasi Hak Akses Sebelum Memuat Modul
  const isAuthorized = await checkPelaporanAccess();
  if (!isAuthorized) return;

  const now = new Date();
  const currMonth = String(now.getMonth() + 1).padStart(2, '0');
  const currYear = now.getFullYear();
  
  const elBulan = document.getElementById("lap-bulan");
  const elTahun = document.getElementById("lap-tahun");
  if(elBulan) elBulan.value = currMonth;
  if(elTahun) elTahun.value = currYear;

  await initHeaderUser();
  if (window.lucide) lucide.createIcons();
});

// Fungsi Validasi Hak Akses Pelaporan
async function checkPelaporanAccess() {
  try {
    if (typeof getCurrentUser !== "function" || typeof getCurrentUserProfile !== "function") {
      // Jika fungsi global tidak tersedia, cek langsung via Supabase jika ada
      return true; 
    }

    const user = await getCurrentUser();
    const workspaceContainer = document.querySelector(".workspace-container");
    
    if (!user) {
      showAccessDenied("Akses Ditolak: Anda masuk sebagai Guest (Tamu). Silakan login terlebih dahulu menggunakan akun resmi PMR.");
      return false;
    }

    const profile = await getCurrentUserProfile();
    if (!profile) {
      showAccessDenied("Akses Ditolak: Profil pengguna tidak ditemukan di dalam sistem.");
      return false;
    }

    const role = (profile.jabatan || "").toLowerCase();
    const ket = (profile.keterangan_jabatan || "").toLowerCase();

    // Aturan Penolakan: Alumni, Non-Aktif
    const isAlumni = ket.includes("alumni");
    const isNonAktif = ket.includes("non-aktif") || role === "non-aktif";

    if (isAlumni || isNonAktif) {
      showAccessDenied(`Akses Ditolak: Akun dengan status '${profile.keterangan_jabatan || 'Non-Aktif'}' tidak diizinkan mengakses modul pelaporan.`);
      return false;
    }

    return true;
  } catch (e) {
    console.warn("Gagal memvalidasi hak akses:", e);
    return true; // Loloskan jika terjadi kendala jaringan mendadak agar tidak mengunci total
  }
}

function showAccessDenied(message) {
  const workspace = document.querySelector(".workspace-container");
  if (workspace) {
    workspace.innerHTML = `
      <div style="text-align: center; padding: 60px 20px; background: #ffffff; border-radius: 14px; border-top: 5px solid #b91c1c; box-shadow: 0 4px 15px rgba(0,0,0,0.05); margin-top: 40px;">
        <div style="display: flex; justify-content: center; margin-bottom: 16px;">
          <i data-lucide="shield-alert" style="width: 56px; height: 56px; color: #b91c1c;"></i>
        </div>
        <h2 style="font-size: 20px; font-weight: 800; color: #b91c1c; margin-bottom: 8px;">Akses Terbatas</h2>
        <p style="font-size: 13.5px; color: #475569; max-width: 450px; margin: 0 auto 20px; line-height: 1.5;">${message}</p>
        <button class="btn-primary" onclick="window.close()" style="margin: 0 auto;">
          <i data-lucide="arrow-left"></i> Kembali ke Portal Utama
        </button>
      </div>
    `;
    if (window.lucide) lucide.createIcons();
  }
}

async function initHeaderUser() {
  const nameEl = document.getElementById("lap-user-name");
  const roleEl = document.getElementById("lap-user-role");
  const avatarEl = document.getElementById("lap-user-avatar");

  try {
    const profile = await getCurrentUserProfile();
    if (profile) {
      const nama = profile.nama_panggilan || profile.nama_lengkap || "Petugas";
      const role = (profile.keterangan_jabatan || profile.jabatan || "Anggota").toUpperCase();
      if (nameEl) nameEl.textContent = nama;
      if (roleEl) roleEl.textContent = role;
      if (avatarEl) {
        avatarEl.innerHTML = profile.foto_profil_url
          ? `<img src="${profile.foto_profil_url}" style="width:100%; height:100%; object-fit:cover;" />`
          : nama.charAt(0).toUpperCase();
      }
    }
  } catch (e) {
    console.warn("Gagal memuat sesi profil:", e);
  }
}

window.bukaPanel = function(panelId) {
  if (rawPresensi.length === 0) {
    return alert("Silakan klik 'Tarik Data' terlebih dahulu.");
  }
  document.querySelectorAll(".laporan-panel").forEach(p => p.style.display = "none");
  const target = document.getElementById(panelId);
  if (target) {
    target.style.display = "block";
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  if (window.lucide) lucide.createIcons();
};

window.muatDataPelaporan = async function() {
  const bulanEl = document.getElementById("lap-bulan");
  const bulan = bulanEl.value;
  const namaBulan = bulanEl.options[bulanEl.selectedIndex].text;
  const tahun = document.getElementById("lap-tahun").value;
  const jenisKegiatan = document.getElementById("lap-jenis").value;
  
  const startDate = `${tahun}-${bulan}-01`;
  const endDate = new Date(tahun, parseInt(bulan, 10), 0).toISOString().split('T')[0];

  try {
    const { data: users, error: errUsers } = await window.db
      .from("users_profile")
      .select("id, nama_lengkap, jabatan, keterangan_jabatan");

    let presensiQuery = window.db.from("presensi")
      .select("*")
      .gte("tanggal_kegiatan", startDate)
      .lte("tanggal_kegiatan", endDate)
      .order("tanggal_kegiatan", { ascending: true });

    if (jenisKegiatan !== "Semua Kegiatan") {
      presensiQuery = presensiQuery.eq("jenis_kegiatan", jenisKegiatan);
    }

    const { data: presensi, error: errPresensi } = await presensiQuery;

    if (errUsers || errPresensi) throw new Error("Gagal menarik data dari database.");

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

    alert(`Data berhasil ditarik: ${kegiatanUnik.length} agenda ditemukan.`);
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
  const logoUrl = "https://lh3.googleusercontent.com/d/14EmaUclAMOYMXPnnNrCbfyQzTHY4JP4z";

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
  const pelatihRoles = ['kepala sekolah', 'pembina 1', 'pembina 2', 'pelatih'];
  const pelatihUsers = rawUsers.filter(u => pelatihRoles.some(r => (u.keterangan_jabatan || '').toLowerCase().includes(r)));
  const siswaUsers = rawUsers.filter(u => !pelatihRoles.some(r => (u.keterangan_jabatan || '').toLowerCase().includes(r)));

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
    rowPelatih += `<tr><td style="text-align:center;">${i + 1}</td><td>${user.nama_lengkap}</td>${rowTgl}</tr>`;
  });

  const htmlPelatih = `
    <div class="paper-landscape-f4">
      ${kopSurat}
      <div class="judul-laporan">DAFTAR HADIR PELATIH & PEMBINA PMR</div>
      <table class="table-data"><tr style="background:#f1f5f9;"><th style="width:4%; text-align:center;">No</th><th style="width:28%;">Nama Pelatih / Pembina</th>${thTanggal}</tr>${rowPelatih || '<tr><td colspan="10" style="text-align:center;">Data kosong</td></tr>'}</table>
      <table class="table-ttd">
        <tr><td style="width:50%;">Mengetahui,<br>${sigPelKiri.jabatan}</td><td style="width:50%;">Balikpapan, ${formatTglIndo(tglAkhir)}<br>${sigPelKanan.jabatan}</td></tr>
        <tr><td colspan="2" style="height:60px;"></td></tr>
        <tr><td><b><u>${sigPelKiri.nama}</u></b></td><td><b><u>${sigPelKanan.nama}</u></b></td></tr>
      </table>
    </div>
  `;

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
    rowSiswa += `<tr><td style="text-align:center;">${i + 1}</td><td>${user.nama_lengkap}</td>${rowTgl}</tr>`;
  });

  const htmlSiswa = `
    <div class="paper-landscape-f4">
      ${kopSurat}
      <div class="judul-laporan">DAFTAR HADIR ANGGOTA PMR</div>
      <table class="table-data"><tr style="background:#f1f5f9;"><th style="width:4%; text-align:center;">No</th><th style="width:28%;">Nama Anggota</th>${thTanggal}</tr>${rowSiswa || '<tr><td colspan="10" style="text-align:center;">Data kosong</td></tr>'}</table>
      <table class="table-ttd">
        <tr><td style="width:33%;">Mengetahui,<br>${sigSisKiri.jabatan}</td><td style="width:33%;">Mengetahui,<br>${sigSisTengah.jabatan}</td><td style="width:33%;">Balikpapan, ${formatTglIndo(tglAkhir)}<br>${sigSisKanan.jabatan}</td></tr>
        <tr><td colspan="3" style="height:60px;"></td></tr>
        <tr><td><b><u>${sigSisKiri.nama}</u></b></td><td><b><u>${sigSisTengah.nama}</u></b></td><td><b><u>${sigSisKanan.nama}</u></b></td></tr>
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
      <table class="table-data"><tr style="background:#f1f5f9;"><th style="width:5%; text-align:center;">No</th><th style="width:18%; text-align:center;">Tanggal</th><th>Materi & Uraian Kegiatan</th><th style="width:22%;">Tempat Pelaksanaan</th></tr>${rows || '<tr><td colspan="4" style="text-align:center;">Belum ada jurnal tercatat.</td></tr>'}</table>
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