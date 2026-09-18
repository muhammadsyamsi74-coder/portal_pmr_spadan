/**
 * ==============================================================================
 * CONTROLLER MODUL UTILITY - PORTAL PMR SPADAN
 * Lengkap:
 * - 5 Modul Utama dengan Ikon Gambar Resmi Supabase (Squircle Android Style)
 * - Pemuatan Latar Belakang (Preload) & Fallback ke Lucide Icon jika gagal
 * - Mode Penampil Eksklusif Dalam Aplikasi (In-App Viewport)
 * ==============================================================================
 */

window.ACTIVE_UTILITY_KEY = null;
window.ACTIVE_UTILITY_URL = null;

// Konfigurasi Ikon Gambar 5 Tools Resmi Supabase
window.CORE_TOOL_ICONS = {
  inventaris: "https://ndahxwqshyukqpnjkniw.supabase.co/storage/v1/object/public/utilitas_ikon/logo%20inventaris%20barang.png",
  kalender: "https://ndahxwqshyukqpnjkniw.supabase.co/storage/v1/object/public/utilitas_ikon/kalender%20dan%20agenda.png",
  kta: "https://ndahxwqshyukqpnjkniw.supabase.co/storage/v1/object/public/utilitas_ikon/logo%20KTA%20PMR.png",
  materi: "https://ndahxwqshyukqpnjkniw.supabase.co/storage/v1/object/public/utilitas_ikon/logo%20pustaka%20materi.png",
  pelaporan: "https://ndahxwqshyukqpnjkniw.supabase.co/storage/v1/object/public/utilitas_ikon/logo%20laporan%20kegaitan.png"
};

// Peta URL & Konfigurasi 5 Modul Utama
window.CORE_UTILITY_MODULES = {
  inventaris: {
    title: "Modul Inventaris & UKS",
    url: "MODULES/inventaris/index.html",
    type: "iframe",
    akses: "guest"
  },
  kalender: {
    title: "Modul Kalender & Agenda Tahunan",
    url: "MODULES/kalender/kalender.html",
    script: "modules/kalender/kalender.js",
    initFn: "initKalenderModule",
    type: "inline",
    akses: "guest"
  },
  kta: {
    title: "Modul Cetak Kartu Tanda Anggota (KTA)",
    url: "MODULES/kta/kta.html",
    type: "iframe",
    akses: "anggota"
  },
  materi: {
    title: "Pustaka Materi & Dokumen Belajar",
    url: "MODULES/materi/materi.html",
    script: "modules/materi/materi.js",
    initFn: "initMateriModule",
    type: "inline",
    akses: "guest"
  },
  pelaporan: {
    title: "Modul Pelaporan Administrasi Resmi",
    url: "MODULES/pelaporan/pelaporan.html",
    type: "iframe",
    akses: "anggota"
  }
};

window.DYNAMIC_UTILITY_LINKS = [];

/* ==============================================================================
   1. INISIALISASI MENU UTILITY & PEMUATAN IKON LATAR BELAKANG
   ============================================================================== */
window.renderUtilitasGrid = async function() {
  const btnTambah = document.getElementById("btn-tambah-link-app");
  const userRole = (window.activeUserProfile?.jabatan || "").toLowerCase();
  const ket = (window.activeUserProfile?.keterangan_jabatan || "").toLowerCase();
  const isAdmin = userRole === "admin" || ket.includes("pembina");

  if (btnTambah) {
    btnTambah.style.display = isAdmin ? "inline-flex" : "none";
  }

  // Pastikan kondisi awal kembali menampilkan daftar alat
  window.tutupModulUtility();

  // Memuat 5 Ikon PNG Baru di latar belakang secara halus
  window.loadCoreToolIconsSilent();

  await window.loadDynamicUtilityLinks();
  if (window.lucide) lucide.createIcons();
};

/* FUNGSI PRELOAD IKON RESMI DENGAN FALLBACK AMAN */
window.loadCoreToolIconsSilent = function() {
  Object.keys(window.CORE_TOOL_ICONS).forEach((key) => {
    const iconUrl = window.CORE_TOOL_ICONS[key];
    const wrapper = document.getElementById(`wrap-icon-${key}`);
    if (!wrapper) return;

    const img = new Image();
    img.src = iconUrl;
    img.onload = () => {
      // Jika berhasil dimuat di latar belakang, gantikan ikon SVG Lucide
      wrapper.innerHTML = `<img src="${iconUrl}" alt="Ikon ${key}" class="tool-squircle-img" />`;
      wrapper.style.backgroundColor = "transparent";
      wrapper.style.border = "none";
    };
    img.onerror = () => {
      // Jika gagal/offline, biarkan fallback ikon Lucide tetap aktif
      console.warn(`Ikon ${key} gagal dimuat dari Supabase, mempertahankan ikon bawaan.`);
    };
  });
};

/* ==============================================================================
   2. MEMBUKA MODUL SECARA EKSKLUSIF (SEMBUNYIKAN SEMUA ALAT LAINNYA)
   ============================================================================== */
window.bukaModulUtility = async function(modulKey) {
  const headerCard = document.getElementById("utilitas-header-panel");
  const mainGrid = document.getElementById("utilitas-main-grid");
  const viewer = document.getElementById("utilitas-inapp-viewer");
  const titleEl = document.getElementById("inapp-viewer-title");
  const contentEl = document.getElementById("inapp-viewer-content");

  if (!viewer || !contentEl) return;

  // Evaluasi Hak Akses Modul
  const target = window.CORE_UTILITY_MODULES[modulKey];
  if (!target) return;

  const userRole = (window.activeUserProfile?.jabatan || "guest").toLowerCase();
  const ket = (window.activeUserProfile?.keterangan_jabatan || "").toLowerCase();
  const roleLevel = { "guest": 0, "non-aktif": 0, "alumni": 1, "anggota": 2, "pengurus": 3, "admin": 4 };

  let currentLevel = roleLevel[userRole] || 0;
  if (ket.includes("alumni")) currentLevel = Math.max(currentLevel, 1);
  if (ket.includes("pembina")) currentLevel = 4;

  const requiredLevel = roleLevel[target.akses] || 0;
  if (currentLevel < requiredLevel) {
    alert(`Akses Ditolak: Modul ini memerlukan hak akses minimal '${target.akses.toUpperCase()}'.`);
    return;
  }

  window.ACTIVE_UTILITY_KEY = modulKey;
  window.ACTIVE_UTILITY_URL = target.url;

  // 1. Sembunyikan Header dan Kisi Menu
  if (headerCard) headerCard.style.display = "none";
  if (mainGrid) mainGrid.style.display = "none";

  // 2. Munculkan Penampil Modul
  if (titleEl) titleEl.textContent = target.title;
  viewer.style.display = "flex";

  // Indikator Memuat
  contentEl.innerHTML = `
    <div class="inapp-loading">
      <i data-lucide="loader-2" class="spin-anim"></i>
      <span>Memuat ${target.title}...</span>
    </div>
  `;
  if (window.lucide) lucide.createIcons();

  // Mode 1: Modul Inline (Kalender & Pustaka Materi)
  if (target.type === "inline") {
    try {
      const res = await fetch(target.url);
      if (!res.ok) throw new Error("Gagal mengambil template modul.");
      contentEl.innerHTML = await res.text();

      if (target.script) {
        await window.loadUtilityScriptOnce(target.script);
      }
      if (target.initFn && typeof window[target.initFn] === "function") {
        await window[target.initFn]();
      }
      if (window.lucide) lucide.createIcons();
    } catch (err) {
      contentEl.innerHTML = `<div style="color:#b91c1c; font-size:12.5px; padding:30px; text-align:center;">Gagal memuat modul: ${err.message}</div>`;
    }
  } 
  // Mode 2: Modul Mandiri (Inventaris, KTA, Pelaporan)
  else {
    contentEl.innerHTML = `
      <iframe src="${target.url}" class="inapp-iframe" title="${target.title}"></iframe>
    `;
  }

  window.scrollTo({ top: 0, behavior: "smooth" });
};

/* ==============================================================================
   3. MENUTUP MODUL & MENGEMBALIKAN TAMPILAN SEMUA ALAT
   ============================================================================== */
window.tutupModulUtility = function() {
  const headerCard = document.getElementById("utilitas-header-panel");
  const mainGrid = document.getElementById("utilitas-main-grid");
  const viewer = document.getElementById("utilitas-inapp-viewer");
  const contentEl = document.getElementById("inapp-viewer-content");

  if (viewer) viewer.style.display = "none";
  if (contentEl) contentEl.innerHTML = "";

  if (headerCard) headerCard.style.display = "flex";
  if (mainGrid) mainGrid.style.display = "grid";

  window.ACTIVE_UTILITY_KEY = null;
  window.ACTIVE_UTILITY_URL = null;

  window.scrollTo({ top: 0, behavior: "smooth" });
  if (window.lucide) lucide.createIcons();
};

window.bukaModulTabTerpisah = function() {
  if (window.ACTIVE_UTILITY_URL) {
    window.open(window.ACTIVE_UTILITY_URL, "_blank", "noopener,noreferrer");
  }
};

window.loadUtilityScriptOnce = function(scriptSrc) {
  return new Promise((resolve) => {
    if (document.querySelector(`script[src="${scriptSrc}"]`)) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = scriptSrc;
    script.onload = () => resolve();
    script.onerror = () => {
      console.warn("Gagal memuat skrip modul:", scriptSrc);
      resolve();
    };
    document.body.appendChild(script);
  });
};

/* ==============================================================================
   4. TAUTAN EKSTERNAL DINAMIS DARI DATABASE SUPABASE
   ============================================================================== */
window.loadDynamicUtilityLinks = async function() {
  const grid = document.getElementById("utilitas-main-grid");
  if (!grid || !window.db) return;

  const userRole = (window.activeUserProfile?.jabatan || "").toLowerCase();
  const ket = (window.activeUserProfile?.keterangan_jabatan || "").toLowerCase();
  const isAdmin = userRole === "admin" || ket.includes("pembina");

  try {
    const { data: extApps, error } = await window.db.from("utilitas_eksternal").select("*");
    if (error) throw error;

    // Bersihkan elemen dinamis lama agar tidak bertumpuk
    document.querySelectorAll(".util-dynamic-item").forEach(el => el.remove());

    (extApps || []).forEach(app => {
      const deleteBtn = isAdmin
        ? `<div class="btn-del-link" onclick="event.stopPropagation(); window.hapusAplikasiLink('${app.id}')" title="Hapus Tautan"><i data-lucide="x" style="width:12px; height:12px;"></i></div>`
        : "";

      const itemHtml = `
        <div class="util-app-card util-dynamic-item" onclick="window.open('${app.target_url}', '_blank')">
          ${deleteBtn}
          <div class="util-app-icon-wrap" style="background-color: ${app.warna_bg || '#ecfdf5'}; color: ${app.warna_aksen || '#059669'};">
            <img src="${app.ikon_url}" alt="${app.nama}" class="tool-squircle-img" />
          </div>
          <div class="util-app-title">${app.nama}</div>
          <div class="util-app-badge badge-link">LINK</div>
        </div>
      `;
      grid.insertAdjacentHTML("beforeend", itemHtml);
    });

    if (window.lucide) lucide.createIcons();
  } catch (err) {
    console.warn("Gagal memuat tautan dinamis:", err);
  }
};

window.openTambahLinkModal = function() {
  document.getElementById("form-tambah-link")?.reset();
  const modal = document.getElementById("modal-tambah-link");
  if (modal) modal.style.display = "flex";
};

window.closeTambahLinkModal = function() {
  const modal = document.getElementById("modal-tambah-link");
  if (modal) modal.style.display = "none";
};

window.handleTambahLinkSubmit = async function(event) {
  event.preventDefault();
  const btn = document.getElementById("btn-save-link");
  const fileInput = document.getElementById("link-ikon-file");

  btn.disabled = true;
  btn.textContent = "Menyimpan...";

  try {
    let fotoUrl = null;
    if (fileInput.files && fileInput.files[0]) {
      const file = fileInput.files[0];
      const compressedBlob = typeof window.compressProfileImage === "function"
        ? await window.compressProfileImage(file)
        : file;
      const fileName = `app_icon_${Date.now()}.jpg`;

      const { error: uploadErr } = await window.db.storage.from("utilitas_ikon").upload(fileName, compressedBlob, { contentType: "image/jpeg" });
      if (uploadErr) throw uploadErr;

      const { data: publicUrlData } = window.db.storage.from("utilitas_ikon").getPublicUrl(fileName);
      fotoUrl = publicUrlData.publicUrl;
    }

    if (!fotoUrl) throw new Error("Ikon alat wajib diunggah.");

    const payload = {
      nama: document.getElementById("link-nama").value.trim(),
      target_url: document.getElementById("link-url").value.trim(),
      akses_minimal: document.getElementById("link-akses").value,
      ikon_url: fotoUrl
    };

    const { error } = await window.db.from("utilitas_eksternal").insert(payload);
    if (error) throw error;

    alert("Tautan alat baru berhasil ditambahkan!");
    window.closeTambahLinkModal();
    await window.loadDynamicUtilityLinks();
  } catch (err) {
    alert("Gagal menyimpan tautan: " + err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = "Simpan";
  }
};

window.hapusAplikasiLink = async function(appId) {
  if (!confirm("Apakah Anda yakin ingin menghapus tautan alat ini?")) return;
  try {
    const { error } = await window.db.from("utilitas_eksternal").delete().eq("id", appId);
    if (error) throw error;
    await window.loadDynamicUtilityLinks();
  } catch (err) {
    alert("Gagal menghapus: " + err.message);
  }
};