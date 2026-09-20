/**
 * ==============================================================================
 * [CONTROLLER] MODUL UTILITY & ALAT OPERASIONAL - PMR SPADAN
 * ==============================================================================
 */

window.ACTIVE_UTILITY_KEY = null;
window.ACTIVE_UTILITY_URL = null;

window.CORE_TOOL_ICONS = {
  inventaris: "https://ndahxwqshyukqpnjkniw.supabase.co/storage/v1/object/public/utilitas_ikon/logo%20inventaris%20barang.png",
  kalender: "https://ndahxwqshyukqpnjkniw.supabase.co/storage/v1/object/public/utilitas_ikon/kalender%20dan%20agenda.png",
  kta: "https://ndahxwqshyukqpnjkniw.supabase.co/storage/v1/object/public/utilitas_ikon/logo%20KTA%20PMR.png",
  materi: "https://ndahxwqshyukqpnjkniw.supabase.co/storage/v1/object/public/utilitas_ikon/logo%20pustaka%20materi.png",
  pelaporan: "https://ndahxwqshyukqpnjkniw.supabase.co/storage/v1/object/public/utilitas_ikon/logo%20laporan%20kegaitan.png"
};

// [ROUTING] Konfigurasi Nama File sesuai Penyesuaian Baru Anda
window.CORE_UTILITY_MODULES = {
  inventaris: {
    title: "Modul Inventaris & UKS",
    url: "modules/inventaris/inventaris.html",
    type: "iframe",
    akses: "guest"
  },
  kalender: {
    title: "Modul Kalender & Agenda Tahunan",
    url: "modules/kalender/kalender.html",
    script: "modules/kalender/kalender.js",
    initFn: "initKalenderModule",
    type: "inline",
    akses: "guest"
  },
  kta: {
    title: "Modul Cetak Kartu Tanda Anggota (KTA)",
    url: "modules/kta/kta.html",
    type: "iframe",
    akses: "anggota"
  },
  materi: {
    title: "Pustaka Materi & Dokumen Belajar",
    url: "modules/materi/materi.html",
    script: "modules/materi/materi.js",
    initFn: "initMateriModule",
    type: "inline",
    akses: "guest"
  },
  pelaporan: {
    title: "Modul Pelaporan Administrasi Resmi",
    url: "modules/pelaporan/laporan.html",
    type: "iframe",
    akses: "anggota"
  }
};

window.DYNAMIC_UTILITY_LINKS = [];

window.renderUtilitasGrid = async function() {
  const btnTambah = document.getElementById("btn-tambah-link-app");
  const userRole = (window.activeUserProfile?.jabatan || "").toLowerCase();
  const ket = (window.activeUserProfile?.keterangan_jabatan || "").toLowerCase();
  const isAdmin = userRole === "admin" || ket.includes("pembina");

  if (btnTambah) {
    btnTambah.style.display = isAdmin ? "inline-flex" : "none";
  }

  window.tutupModulUtility();
  window.loadCoreToolIconsSilent();
  await window.loadDynamicUtilityLinks();
  if (window.lucide) lucide.createIcons();
};

window.loadCoreToolIconsSilent = function() {
  Object.keys(window.CORE_TOOL_ICONS).forEach((key) => {
    const iconUrl = window.CORE_TOOL_ICONS[key];
    const wrapper = document.getElementById(`wrap-icon-${key}`);
    if (!wrapper) return;

    const img = new Image();
    img.src = iconUrl;
    img.onload = () => {
      wrapper.innerHTML = `<img src="${iconUrl}" alt="Ikon ${key}" class="tool-squircle-img" />`;
      wrapper.style.backgroundColor = "transparent";
      wrapper.style.border = "none";
    };
  });
};

window.bukaModulUtility = async function(modulKey) {
  const headerCard = document.getElementById("utilitas-header-panel");
  const mainGrid = document.getElementById("utilitas-main-grid");
  const viewer = document.getElementById("utilitas-inapp-viewer");
  const titleEl = document.getElementById("inapp-viewer-title");
  const contentEl = document.getElementById("inapp-viewer-content");

  if (!viewer || !contentEl) return;

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

  if (headerCard) headerCard.style.display = "none";
  if (mainGrid) mainGrid.style.display = "none";

  if (titleEl) titleEl.textContent = target.title;
  viewer.style.display = "flex";

  contentEl.innerHTML = `
    <div class="inapp-loading">
      <i data-lucide="loader-2" class="spin-anim"></i>
      <span>Memuat ${target.title}...</span>
    </div>
  `;
  if (window.lucide) lucide.createIcons();

  if (target.type === "inline") {
    try {
      const res = await fetch(target.url);
      if (!res.ok) throw new Error(`Berkas tidak ditemukan (${res.status} ${res.statusText})`);
      contentEl.innerHTML = await res.text();

      if (target.script) {
        await window.loadUtilityScriptOnce(target.script);
      }
      if (target.initFn && typeof window[target.initFn] === "function") {
        await window[target.initFn]();
      }
      if (window.lucide) lucide.createIcons();
    } catch (err) {
      contentEl.innerHTML = `
        <div style="color:#b91c1c; font-size:12.5px; padding:30px; text-align:center;">
          <b>Gagal memuat modul:</b> ${err.message}<br>
          <small style="color:#64748b;">Pastikan file HTML ada di: ${target.url}</small>
        </div>
      `;
    }
  } else {
    contentEl.innerHTML = `
      <iframe src="${target.url}" class="inapp-iframe" title="${target.title}"></iframe>
    `;
  }
  window.scrollTo({ top: 0, behavior: "smooth" });
};

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
    script.onerror = () => resolve();
    document.body.appendChild(script);
  });
};

window.loadDynamicUtilityLinks = async function() {
  const grid = document.getElementById("utilitas-main-grid");
  if (!grid || !window.db) return;

  const userRole = (window.activeUserProfile?.jabatan || "").toLowerCase();
  const ket = (window.activeUserProfile?.keterangan_jabatan || "").toLowerCase();
  const isAdmin = userRole === "admin" || ket.includes("pembina");

  try {
    const { data: extApps, error } = await window.db.from("utilitas_eksternal").select("*");
    if (error) throw error;

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