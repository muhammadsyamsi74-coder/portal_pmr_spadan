/**
 * ==============================================================================
 * CONTROLLER DASHBOARD UTAMA - PORTAL PMR SPADAN
 * Fitur Lengkap:
 * 1. Autentikasi Hero Banner: Kotak Masuk/Daftar jika Tamu vs Selamat Datang jika Login
 * 2. Transisi Galeri Foto: Crossfade & Gaussian Blur Halus (Dual-Layer)
 * 3. Dua Persentase Kehadiran Bersanding: Personal & Unit PMR
 * 4. Kalender Mini Grid Tegas & Penanda Kegiatan Bulan Depan
 * 5. Pengumuman Darurat Otomatis H-1 s.d +12 Jam (Hanya untuk Anggota Aktif/Admin)
 * 6. Struktur Hirarki Organisasi PMR SPADAN (Ditarik dari users_profile)
 * 7. Preview Peta Google Maps & Integrasi Sosial Media Instagram
 * ==============================================================================
 */

window.dashCurrentCalDate = new Date();
window.dashAllAgendas = [];
window.dashPhotosList = [];
window.dashSlideIndex = 0;
window.dashSlideTimer = null;
window.dashActiveSlideLayer = "front";

window.initDashboardMenu = async function() {
  if (!window.db) {
    console.warn("Koneksi Supabase belum siap.");
    return;
  }

  // Jalankan modul data secara terpisah (fail-safe)
  await window.loadDashboardUserProfile().catch(e => console.error("Error User Profile:", e));
  await window.loadUrgentDashboardAnnouncement().catch(e => console.error("Error Urgent Banner:", e));
  await window.loadDashboardMemberCounts().catch(e => console.error("Error Member Counts:", e));
  await window.loadDashboardAgendasAndCalendar().catch(e => console.error("Error Calendar/Agenda:", e));
  await window.updatePresencePeriod("semua").catch(e => console.error("Error Attendance:", e));
  await window.loadDashboardOrganizationStructure().catch(e => console.error("Error Org Structure:", e));
  
  // Memuat galeri foto di latar belakang
  window.loadDashboardPhotoSlideshowSilent().catch(e => console.error("Error Slideshow:", e));

  if (window.lucide) lucide.createIcons();
};

/* --------------------------------------------------------------------------
   1. USER PROFILE & PERHITUNGAN KEHADIRAN PRIBADI (DI KOTAK KEHADIRAN)
-------------------------------------------------------------------------- */
window.loadDashboardUserProfile = async function() {
  const guestCardEl = document.getElementById("dash-guest-card");
  const heroCardEl = document.getElementById("dash-hero-card");
  const nameEl = document.getElementById("dash-user-name");
  const roleEl = document.getElementById("dash-user-role");
  const avatarEl = document.getElementById("dash-hero-avatar");
  
  // Elemen persentase pribadi yang kini berada di dalam kotak kehadiran ganda
  const pRateEl = document.getElementById("dash-stat-personal-rate");
  const pCountEl = document.getElementById("dash-stat-personal-count");

  const profile = window.activeUserProfile;

  // JIKA BELUM LOGIN (MODE TAMU / GUEST)
  if (!profile) {
    if (heroCardEl) heroCardEl.style.display = "none";
    if (guestCardEl) guestCardEl.style.display = "flex";
    if (pRateEl) pRateEl.textContent = "--";
    if (pCountEl) pCountEl.textContent = "Mode Tamu";
    if (window.lucide) lucide.createIcons();
    return;
  }

  // JIKA SUDAH LOGIN
  if (guestCardEl) guestCardEl.style.display = "none";
  if (heroCardEl) heroCardEl.style.display = "flex";

  const nama = profile.nama_lengkap || "Anggota PMR";
  const role = (profile.jabatan || "Anggota").toUpperCase();
  const ket = profile.keterangan_jabatan ? ` • ${profile.keterangan_jabatan}` : "";

  if (nameEl) nameEl.textContent = nama;
  if (roleEl) roleEl.textContent = `${role}${ket}`;

  if (avatarEl) {
    avatarEl.innerHTML = profile.foto_profil_url
      ? `<img src="${profile.foto_profil_url}" style="width:100%; height:100%; object-fit:cover;" />`
      : (profile.nama_panggilan || nama).charAt(0).toUpperCase();
  }

  // Hitung persentase kehadiran khusus untuk akun login ini
  try {
    const { data: logs } = await window.db
      .from("presensi")
      .select("status_kehadiran")
      .eq("user_id", profile.id);

    let h = 0, s = 0, i = 0, a = 0;
    (logs || []).forEach(log => {
      const st = log.status_kehadiran;
      if (st === "Hadir") h++;
      else if (st === "Sakit") s++;
      else if (st === "Izin") i++;
      else if (st === "Alpa") a++;
    });

    const totalValid = h + s + i + a;
    const rate = totalValid > 0 ? Math.round((h / totalValid) * 100) : 0;

    if (pRateEl) pRateEl.textContent = `${rate}%`;
    if (pCountEl) pCountEl.textContent = `${h} Sesi Hadir`;
  } catch (e) {
    if (pRateEl) pRateEl.textContent = "0%";
    if (pCountEl) pCountEl.textContent = "0 Sesi Hadir";
  }
};

/* --------------------------------------------------------------------------
   1.5. PENGUMUMAN PENTING (HANYA DILIHAT ANGGOTA AKTIF, PENGURUS & ADMIN)
-------------------------------------------------------------------------- */
window.loadUrgentDashboardAnnouncement = async function() {
  const container = document.getElementById("urgent-announcement-container");
  if (!container || !window.db) return;

  // Sembunyikan jika pengunjung belum login (Mode Tamu / Guest)
  const profile = window.activeUserProfile;
  if (!profile) {
    container.style.display = "none";
    container.innerHTML = "";
    return;
  }

  // Sembunyikan untuk pengguna dengan status Alumni atau Non-Aktif
  const jab = (profile.jabatan || "").toLowerCase();
  const ket = (profile.keterangan_jabatan || "").toLowerCase();

  const isAlumni = ket.includes("alumni") || jab.includes("alumni");
  const isNonAktif = jab === "non-aktif" || ket === "non-aktif";

  if (isAlumni || isNonAktif) {
    container.style.display = "none";
    container.innerHTML = "";
    return;
  }

  try {
    const { data, error } = await window.db
      .from("agenda_kegiatan")
      .select("*")
      .eq("tampilkan_di_dashboard", true)
      .order("tanggal_mulai", { ascending: true });

    if (error) throw error;
    if (!data || data.length === 0) {
      container.style.display = "none";
      container.innerHTML = "";
      return;
    }

    const now = new Date();

    const activeAnnouncements = data.filter(item => {
      if (!item.tanggal_mulai) return false;

      const startDate = new Date(item.tanggal_mulai + "T00:00:00");
      const showFrom = new Date(startDate.getTime() - (24 * 60 * 60 * 1000));

      const endRef = item.tanggal_selesai || item.tanggal_mulai;
      const endDate = new Date(endRef + "T00:00:00");
      const hideAfter = new Date(endDate.getTime() + (36 * 60 * 60 * 1000));

      return now >= showFrom && now <= hideAfter;
    });

    if (activeAnnouncements.length === 0) {
      container.style.display = "none";
      container.innerHTML = "";
      return;
    }

    const item = activeAnnouncements[0];

    const [y, m, d] = item.tanggal_mulai.split("-");
    const tglDisplay = `${d}/${m}/${y}`;
    const jamDisplay = item.waktu_kegiatan || "Menyesuaikan";
    const tempatDisplay = item.lokasi || "SMPN 8 Balikpapan";

    container.innerHTML = `
      <div class="urgent-box">
        <div class="police-line-bar">
          <div class="police-line-text">PENGUMUMAN PENTING</div>
        </div>

        <div class="urgent-body">
          <div class="urgent-icon-bell">
            <i data-lucide="bell-ring" style="width: 20px; height: 20px;"></i>
          </div>
          
          <div class="urgent-content">
            <div class="urgent-title">${item.judul}</div>

            ${item.keterangan ? `<div class="urgent-keterangan">${item.keterangan}</div>` : ""}

            <div class="urgent-meta">
              <span><i data-lucide="calendar"></i> ${tglDisplay}</span>
              <span><i data-lucide="clock"></i> ${jamDisplay}</span>
              <span><i data-lucide="map-pin"></i> ${tempatDisplay}</span>
            </div>
          </div>
        </div>
      </div>
    `;

    container.style.display = "block";
    if (window.lucide) lucide.createIcons();
  } catch (err) {
    console.warn("Gagal memuat pengumuman penting:", err);
    container.style.display = "none";
  }
};

/* --------------------------------------------------------------------------
   2. JUMLAH ANGGOTA: AKTIF, ALUMNI, PENGAJUAN (1 BARIS MERATA)
-------------------------------------------------------------------------- */
window.loadDashboardMemberCounts = async function() {
  const aktifEl = document.getElementById("stat-count-aktif");
  const alumniEl = document.getElementById("stat-count-alumni");
  const pengajuanEl = document.getElementById("stat-count-pengajuan");

  try {
    const { data: members, error } = await window.db
      .from("users_profile")
      .select("jabatan, keterangan_jabatan");

    if (error) throw error;

    let cntAktif = 0;
    let cntAlumni = 0;
    let cntPengajuan = 0;

    (members || []).forEach(u => {
      const jab = (u.jabatan || "").toLowerCase();
      const ket = u.keterangan_jabatan || "";

      if (jab === "non-aktif" || ket === "Non-Aktif") {
        cntPengajuan++;
      } else if (ket === "Alumni") {
        cntAlumni++;
      } else {
        cntAktif++;
      }
    });

    if (aktifEl) aktifEl.textContent = cntAktif;
    if (alumniEl) alumniEl.textContent = cntAlumni;
    if (pengajuanEl) pengajuanEl.textContent = cntPengajuan;
  } catch (err) {
    console.warn("Gagal membaca hitungan anggota:", err);
  }
};

/* --------------------------------------------------------------------------
   3. KALENDER MINI DENGAN PENANDA KEGIATAN BULAN DEPAN
-------------------------------------------------------------------------- */
window.loadDashboardAgendasAndCalendar = async function() {
  try {
    const { data, error } = await window.db
      .from("agenda_kegiatan")
      .select("*")
      .order("tanggal_mulai", { ascending: true });

    if (error) throw error;
    window.dashAllAgendas = data || [];
    window.renderDashboardMiniCalendar();
    window.renderUpcomingAgendaList();
  } catch (err) {
    console.warn("Gagal memuat agenda kalender:", err);
  }
};

window.changeMiniCalMonth = function(delta) {
  window.dashCurrentCalDate.setMonth(window.dashCurrentCalDate.getMonth() + delta);
  window.renderDashboardMiniCalendar();
};

window.renderDashboardMiniCalendar = function() {
  const monthTitle = document.getElementById("mini-cal-month-year");
  const gridBox = document.getElementById("mini-cal-days-box");
  const nextBadge = document.getElementById("mini-cal-next-month-badge");
  const nextInfoBox = document.getElementById("mini-cal-next-month-info");
  if (!monthTitle || !gridBox) return;

  const year = window.dashCurrentCalDate.getFullYear();
  const month = window.dashCurrentCalDate.getMonth();

  const namaBulan = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
  ];
  monthTitle.textContent = `${namaBulan[month]} ${year}`;

  const firstDayIndex = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();

  const eventDays = new Set();
  window.dashAllAgendas.forEach(ag => {
    if (ag.tanggal_mulai) {
      const [tY, tM, tD] = ag.tanggal_mulai.split("-").map(Number);
      if (tY === year && (tM - 1) === month) {
        eventDays.add(tD);
      }
    }
  });

  const nextMonthDate = new Date(year, month + 1, 1);
  const nextYear = nextMonthDate.getFullYear();
  const nextMonth = nextMonthDate.getMonth();

  let nextMonthEventCount = 0;
  window.dashAllAgendas.forEach(ag => {
    if (ag.tanggal_mulai) {
      const [tY, tM] = ag.tanggal_mulai.split("-").map(Number);
      if (tY === nextYear && (tM - 1) === nextMonth) {
        nextMonthEventCount++;
      }
    }
  });

  if (nextBadge) {
    if (nextMonthEventCount > 0) {
      nextBadge.textContent = nextMonthEventCount > 99 ? "99+" : nextMonthEventCount;
      nextBadge.style.display = "inline-flex";
    } else {
      nextBadge.style.display = "none";
    }
  }

  if (nextInfoBox) {
    if (nextMonthEventCount > 0) {
      nextInfoBox.innerHTML = `
        <div style="display:flex; align-items:center; gap:6px;">
          <i data-lucide="bell" style="width:12px; height:12px; color:#d97706;"></i>
          <span>${namaBulan[nextMonth]}: <b>${nextMonthEventCount} kegiatan</b> terjadwal</span>
        </div>
        <span class="btn-peek-next" onclick="window.changeMiniCalMonth(1)">Lihat &rarr;</span>
      `;
      nextInfoBox.style.display = "flex";
      if (window.lucide) lucide.createIcons();
    } else {
      nextInfoBox.style.display = "none";
    }
  }

  let html = "";
  for (let i = 0; i < firstDayIndex; i++) {
    html += `<div class="cal-day-cell empty"></div>`;
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const dayOfWeek = (firstDayIndex + d - 1) % 7;
    const isSunday = dayOfWeek === 0;
    const isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === d;
    const hasEvent = eventDays.has(d);
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

    html += `
      <div class="cal-day-cell ${isToday ? 'today' : ''} ${isSunday ? 'is-sun' : ''}" onclick="window.selectMiniCalDate('${dateStr}', this)">
        <span>${d}</span>
        ${hasEvent ? '<div class="cal-event-dot"></div>' : ''}
      </div>
    `;
  }

  gridBox.innerHTML = html;
};

window.selectMiniCalDate = function(dateStr, el) {
  document.querySelectorAll(".cal-day-cell").forEach(c => c.classList.remove("selected"));
  if (el) el.classList.add("selected");

  const [y, m, d] = dateStr.split("-");
  const labelEl = document.getElementById("cal-agenda-selected-label");
  if (labelEl) labelEl.textContent = `Agenda: ${d}/${m}/${y}`;

  const matching = window.dashAllAgendas.filter(a => a.tanggal_mulai === dateStr);
  window.renderAgendaItemsIntoBox(matching, "Tidak ada kegiatan di tanggal ini.");
};

window.renderUpcomingAgendaList = function() {
  document.querySelectorAll(".cal-day-cell").forEach(c => c.classList.remove("selected"));
  const todayStr = new Date().toISOString().split("T")[0];
  const upcoming = window.dashAllAgendas
    .filter(a => a.tanggal_mulai >= todayStr)
    .slice(0, 3);

  const labelEl = document.getElementById("cal-agenda-selected-label");
  if (labelEl) labelEl.textContent = "Agenda Mendatang";

  window.renderAgendaItemsIntoBox(upcoming, "Tidak ada agenda kegiatan terdekat.");
};

window.renderAgendaItemsIntoBox = function(list, emptyMsg) {
  const container = document.getElementById("dash-agenda-list");
  if (!container) return;

  if (list.length === 0) {
    container.innerHTML = `<div style="text-align:center; padding:12px; font-size:11px; color:#94a3b8;">${emptyMsg}</div>`;
    return;
  }

  const namaBulanSingkat = ["JAN", "FEB", "MAR", "APR", "MEI", "JUN", "JUL", "AGU", "SEP", "OKT", "NOV", "DES"];

  container.innerHTML = list.map(item => {
    const tgl = new Date(item.tanggal_mulai);
    const d = tgl.getDate();
    const m = namaBulanSingkat[tgl.getMonth()];
    const waktu = item.waktu_kegiatan ? `• ${item.waktu_kegiatan}` : "";

    return `
      <div class="dash-agenda-item">
        <div class="dash-agenda-date">
          <div class="d">${d}</div>
          <div class="m">${m}</div>
        </div>
        <div class="dash-agenda-info">
          <div class="t">${item.judul}</div>
          <div class="sub">
            <span style="color:#be123c; font-weight:800;">${item.kategori}</span>
            ${waktu}
          </div>
        </div>
      </div>
    `;
  }).join("");
};

/* --------------------------------------------------------------------------
   4. STATISTIK KEHADIRAN FLEKSIBEL (UNIT PMR)
-------------------------------------------------------------------------- */
window.updatePresencePeriod = async function(period) {
  const rateEl = document.getElementById("dash-unit-rate");
  const hEl = document.getElementById("cnt-h");
  const sEl = document.getElementById("cnt-s");
  const iEl = document.getElementById("cnt-i");
  const aEl = document.getElementById("cnt-a");
  const labelEl = document.getElementById("presence-period-label");

  if (!window.db) return;

  try {
    let query = window.db.from("presensi").select("status_kehadiran, tanggal_kegiatan");
    const now = new Date();

    if (period === "bulan") {
      const y = now.getFullYear();
      const m = String(now.getMonth() + 1).padStart(2, "0");
      const startMonth = `${y}-${m}-01`;
      query = query.gte("tanggal_kegiatan", startMonth);
      if (labelEl) labelEl.textContent = `Menghitung sesi bulan berjalan (${m}/${y})`;
    } else if (period === "minggu") {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(now.getDate() - 7);
      const startWeek = sevenDaysAgo.toISOString().split("T")[0];
      query = query.gte("tanggal_kegiatan", startWeek);
      if (labelEl) labelEl.textContent = "Menghitung sesi dalam 7 hari terakhir";
    } else if (period === "terakhir") {
      const { data: latestRow } = await window.db
        .from("presensi")
        .select("tanggal_kegiatan")
        .order("tanggal_kegiatan", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (latestRow && latestRow.tanggal_kegiatan) {
        query = query.eq("tanggal_kegiatan", latestRow.tanggal_kegiatan);
        const [lY, lM, lD] = latestRow.tanggal_kegiatan.split("-");
        if (labelEl) labelEl.textContent = `Sesi Terakhir: Tanggal ${lD}/${lM}/${lY}`;
      }
    } else {
      if (labelEl) labelEl.textContent = "Menghitung seluruh sesi yang tercatat";
    }

    const { data: rows, error } = await query;
    if (error) throw error;

    let h = 0, s = 0, i = 0, a = 0;
    (rows || []).forEach(r => {
      const st = r.status_kehadiran;
      if (st === "Hadir") h++;
      else if (st === "Sakit") s++;
      else if (st === "Izin") i++;
      else if (st === "Alpa") a++;
    });

    const totalValid = h + s + i + a;
    const rate = totalValid > 0 ? Math.round((h / totalValid) * 100) : 0;

    if (rateEl) rateEl.textContent = `${rate}%`;
    if (hEl) hEl.textContent = h;
    if (sEl) sEl.textContent = s;
    if (iEl) iEl.textContent = i;
    if (aEl) aEl.textContent = a;
  } catch (err) {
    console.warn("Gagal menghitung presensi unit:", err);
  }
};

/* --------------------------------------------------------------------------
   5. SLIDESHOW OTOMATIS: CROSSFADE & GAUSSIAN BLUR HALUS (SMOOTH TRANSITION)
-------------------------------------------------------------------------- */
window.loadDashboardPhotoSlideshowSilent = async function() {
  const cardGallery = document.getElementById("dash-gallery-card");
  const imgFront = document.getElementById("slide-img-front");
  const indicatorBox = document.getElementById("slide-indicators-box");

  let rawList = [];

  try {
    const { data: presensiData } = await window.db
      .from("presensi")
      .select("nama_kegiatan, tempat_kegiatan, tanggal_kegiatan, foto_dokumentasi_url")
      .not("foto_dokumentasi_url", "is", null)
      .neq("foto_dokumentasi_url", "")
      .order("created_at", { ascending: false })
      .limit(30);

    (presensiData || []).forEach(item => {
      if (item.foto_dokumentasi_url && item.foto_dokumentasi_url.startsWith("http")) {
        rawList.push({
          url: item.foto_dokumentasi_url,
          nama_kegiatan: item.nama_kegiatan || "Kegiatan PMR SPADAN",
          tanggal: item.tanggal_kegiatan || null,
          tempat: item.tempat_kegiatan || ""
        });
      }
    });
  } catch (e) {
    console.warn("Pemeriksaan tabel presensi dilewati:", e);
  }

  if (rawList.length < 5) {
    try {
      const { data: storageFiles } = await window.db.storage
        .from("dokumentasi_kegiatan")
        .list("", { limit: 30 });

      (storageFiles || []).forEach(file => {
        if (file.name && file.name.match(/\.(jpg|jpeg|png|webp)$/i)) {
          const { data: pubData } = window.db.storage.from("dokumentasi_kegiatan").getPublicUrl(file.name);
          if (pubData?.publicUrl) {
            rawList.push({
              url: pubData.publicUrl,
              nama_kegiatan: file.name.replace(/[_-]/g, " ").replace(/\.[^/.]+$/, ""),
              tanggal: null,
              tempat: "SMPN 8 Balikpapan"
            });
          }
        }
      });
    } catch (errStorage) {
      console.warn("Storage fallback error:", errStorage);
    }
  }

  if (rawList.length === 0) return;

  window.dashPhotosList = rawList.sort(() => Math.random() - 0.5);

  const firstPhoto = window.dashPhotosList[0];
  const preloadImg = new Image();
  preloadImg.src = firstPhoto.url;

  preloadImg.onload = () => {
    if (!cardGallery || !imgFront) return;

    imgFront.src = firstPhoto.url;
    imgFront.style.opacity = "1";
    imgFront.style.filter = "blur(0px)";

    window.updateSlideTextInfo(firstPhoto);

    if (indicatorBox) {
      const totalDots = Math.min(window.dashPhotosList.length, 6);
      indicatorBox.innerHTML = Array.from({ length: totalDots })
        .map((_, idx) => `<div class="slide-dot ${idx === 0 ? 'active' : ''}" id="dot-${idx}"></div>`)
        .join("");
    }

    cardGallery.style.display = "block";
    if (window.lucide) lucide.createIcons();

    if (window.dashSlideTimer) clearInterval(window.dashSlideTimer);
    window.dashSlideTimer = setInterval(window.nextSlidePhotoSmooth, 4500);
  };
};

window.updateSlideTextInfo = function(cur) {
  const titleEl = document.getElementById("slide-title");
  const dateEl = document.getElementById("slide-date-text");

  if (titleEl) titleEl.textContent = cur.nama_kegiatan;

  if (dateEl) {
    if (cur.tanggal) {
      const [y, m, d] = cur.tanggal.split("-");
      dateEl.textContent = `${d}/${m}/${y} ${cur.tempat ? '• ' + cur.tempat : ''}`;
    } else {
      dateEl.textContent = cur.tempat || "SMP Negeri 8 Balikpapan";
    }
  }
};

window.nextSlidePhotoSmooth = function() {
  if (window.dashPhotosList.length <= 1) return;

  window.dashSlideIndex = (window.dashSlideIndex + 1) % window.dashPhotosList.length;
  const nextItem = window.dashPhotosList[window.dashSlideIndex];

  const imgFront = document.getElementById("slide-img-front");
  const imgBack = document.getElementById("slide-img-back");
  if (!imgFront || !imgBack) return;

  const tempImg = new Image();
  tempImg.src = nextItem.url;
  tempImg.onload = () => {
    window.updateSlideTextInfo(nextItem);

    const totalDots = Math.min(window.dashPhotosList.length, 6);
    for (let i = 0; i < totalDots; i++) {
      const dot = document.getElementById(`dot-${i}`);
      if (dot) dot.classList.toggle("active", i === (window.dashSlideIndex % totalDots));
    }

    if (window.dashActiveSlideLayer === "front") {
      imgBack.src = nextItem.url;
      imgBack.style.zIndex = "2";
      imgFront.style.zIndex = "1";

      imgBack.style.opacity = "1";
      imgBack.style.filter = "blur(0px)";

      imgFront.style.opacity = "0";
      imgFront.style.filter = "blur(12px)";

      window.dashActiveSlideLayer = "back";
    } else {
      imgFront.src = nextItem.url;
      imgFront.style.zIndex = "2";
      imgBack.style.zIndex = "1";

      imgFront.style.opacity = "1";
      imgFront.style.filter = "blur(0px)";

      imgBack.style.opacity = "0";
      imgBack.style.filter = "blur(12px)";

      window.dashActiveSlideLayer = "front";
    }
  };
};

/* --------------------------------------------------------------------------
   6. STRUKTUR HIRARKI UTAMA ORGANISASI PMR SPADAN
-------------------------------------------------------------------------- */
window.loadDashboardOrganizationStructure = async function() {
  const adultBox = document.getElementById("org-adult-leaders");
  const studentBox = document.getElementById("org-student-officers");
  if (!adultBox || !studentBox || !window.db) return;

  try {
    const { data: members, error } = await window.db
      .from("users_profile")
      .select("nama_lengkap, nama_panggilan, keterangan_jabatan, jabatan, foto_profil_url, kelas")
      .neq("jabatan", "non-aktif")
      .neq("keterangan_jabatan", "Non-Aktif")
      .order("created_at", { ascending: true });

    if (error) throw error;

    const adultRoles = ["Kepala Sekolah", "Pembina 1", "Pembina 2", "Pelatih"];
    const officerRoles = ["Ketua", "Wakil", "Sekretaris", "Bendahara", "Seksi"];

    const adults = [];
    const officers = [];

    (members || []).forEach(m => {
      const role = m.keterangan_jabatan || "";
      if (adultRoles.includes(role)) {
        adults.push(m);
      } else if (officerRoles.includes(role) || m.jabatan === "pengurus") {
        officers.push(m);
      }
    });

    adults.sort((a, b) => {
      return adultRoles.indexOf(a.keterangan_jabatan) - adultRoles.indexOf(b.keterangan_jabatan);
    });

    officers.sort((a, b) => {
      return officerRoles.indexOf(a.keterangan_jabatan) - officerRoles.indexOf(b.keterangan_jabatan);
    });

    if (adults.length === 0) {
      adultBox.innerHTML = `<div class="org-empty-placeholder">Pembina & Pelatih belum diatur di profil.</div>`;
    } else {
      adultBox.innerHTML = adults.map(p => {
        const initial = (p.nama_panggilan || p.nama_lengkap || "?").charAt(0).toUpperCase();
        const avatarHtml = p.foto_profil_url
          ? `<img src="${p.foto_profil_url}" alt="${p.nama_lengkap}" />`
          : initial;

        return `
          <div class="org-person-card">
            <div class="org-person-avatar">${avatarHtml}</div>
            <div class="org-person-info">
              <div class="org-person-name" title="${p.nama_lengkap}">${p.nama_lengkap}</div>
              <span class="org-role-badge role-dewasa">${p.keterangan_jabatan}</span>
            </div>
          </div>
        `;
      }).join("");
    }

    if (officers.length === 0) {
      studentBox.innerHTML = `<div class="org-empty-placeholder">Pengurus inti siswa belum diatur di profil.</div>`;
    } else {
      studentBox.innerHTML = officers.map(p => {
        const initial = (p.nama_panggilan || p.nama_lengkap || "?").charAt(0).toUpperCase();
        const avatarHtml = p.foto_profil_url
          ? `<img src="${p.foto_profil_url}" alt="${p.nama_lengkap}" />`
          : initial;

        const isSeksi = (p.keterangan_jabatan || "").toLowerCase().includes("seksi");
        const badgeClass = isSeksi ? "role-seksi" : "role-inti";

        return `
          <div class="org-person-card">
            <div class="org-person-avatar">${avatarHtml}</div>
            <div class="org-person-info">
              <div class="org-person-name" title="${p.nama_lengkap}">${p.nama_lengkap}</div>
              <span class="org-role-badge ${badgeClass}">${p.keterangan_jabatan}${p.kelas ? ` • ${p.kelas}` : ''}</span>
            </div>
          </div>
        `;
      }).join("");
    }

    if (window.lucide) lucide.createIcons();
  } catch (err) {
    console.warn("Gagal memuat struktur organisasi:", err);
    adultBox.innerHTML = `<div class="org-empty-placeholder">Gagal memuat pembina.</div>`;
    studentBox.innerHTML = `<div class="org-empty-placeholder">Gagal memuat pengurus.</div>`;
  }
};

/* --------------------------------------------------------------------------
   7. PINTASAN APLIKASI MANDIRI
-------------------------------------------------------------------------- */
window.openQuickModule = function(moduleUrl) {
  window.open(moduleUrl, "_blank", "noopener,noreferrer");
};