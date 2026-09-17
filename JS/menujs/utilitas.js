// 3 Aplikasi Mandiri (Buka di Tab Baru)
window.UTILITAS_TAB_BARU = [
  {
    id: "inventaris-uks",
    nama: "Inventaris Barang",
    kategori: "tab-baru",
    ikon: "boxes",
    warnaAksen: "#b91c1c",
    warnaBg: "#fef2f2",
    targetUrl: "modules/inventaris/index.html",
    aksesMinimal: "guest"
  },
  {
    id: "pelaporan-kegiatan",
    nama: "Pelaporan Kegiatan",
    kategori: "tab-baru",
    ikon: "file-text",
    warnaAksen: "#2563eb",
    warnaBg: "#eff6ff",
    targetUrl: "modules/pelaporan/index.html",
    aksesMinimal: "guest"
  },
  {
    id: "cetak-kta",
    nama: "Cetak KTA",
    kategori: "tab-baru",
    ikon: "id-card",
    warnaAksen: "#7c3aed",
    warnaBg: "#f5f3ff",
    targetUrl: "modules/kta/index.html",
    aksesMinimal: "anggota"
  }
];

window.UTILITAS_REGISTRY = [];
window.isKalenderLoaded = false;
window.isMateriLoaded = false;

/* ==============================================================================
   1. INISIALISASI MENU UTILITAS
   ============================================================================== */
window.renderUtilitasGrid = async function() {
  await window.renderAplikasiTabBaruGrid();
};

window.switchUtilitasSection = function(sectionKey) {
  document.querySelectorAll(".util-tab-btn").forEach(btn => btn.classList.remove("active"));
  document.querySelectorAll(".util-pane").forEach(pane => pane.classList.remove("active"));

  if (sectionKey === "internal") {
    document.getElementById("section-util-internal")?.classList.add("active");
  } else {
    document.getElementById("section-util-tab-baru")?.classList.add("active");
  }

  const activeBtn = Array.from(document.querySelectorAll(".util-tab-btn")).find(b => 
    b.getAttribute("onclick")?.includes(sectionKey)
  );
  if (activeBtn) activeBtn.classList.add("active");
  if (window.lucide) lucide.createIcons();
};

/* ==============================================================================
   2. LOADER DINAMIS MODUL KALENDER
   ============================================================================== */
window.toggleAgendaViewer = async function() {
  // Tutup materi viewer jika sedang terbuka agar fokus
  window.tutupMateriViewer();

  const viewer = document.getElementById("agenda-viewer-wrapper");
  if (!viewer) return;

  if (viewer.style.display === "none" || viewer.innerHTML.trim() === "") {
    if (!window.isKalenderLoaded) {
      viewer.innerHTML = `<div style="text-align:center; padding:20px; font-size:12px; color:#64748b;">Memuat modul kalender...</div>`;
      try {
        const res = await fetch("modules/kalender/kalender.html");
        if (!res.ok) throw new Error("Gagal mengambil template kalender.");
        viewer.innerHTML = await res.text();

        await window.loadScriptOnce("modules/kalender/kalender.js");
        window.isKalenderLoaded = true;
      } catch (err) {
        viewer.innerHTML = `<div style="color:red; font-size:12px; padding:15px; text-align:center;">Gagal memuat modul kalender: ${err.message}</div>`;
        viewer.style.display = "block";
        return;
      }
    }

    viewer.style.display = "block";
    if (typeof window.initKalenderModule === "function") {
      await window.initKalenderModule();
    }
    viewer.scrollIntoView({ behavior: "smooth", block: "start" });
  } else {
    viewer.style.display = "none";
  }

  if (window.lucide) lucide.createIcons();
};

window.tutupAgendaViewer = function() {
  const viewer = document.getElementById("agenda-viewer-wrapper");
  if (viewer) viewer.style.display = "none";
};

/* ==============================================================================
   3. LOADER DINAMIS MODUL MATERI PMR
   ============================================================================== */
window.toggleMateriViewer = async function() {
  // Tutup agenda viewer jika sedang terbuka
  window.tutupAgendaViewer();

  const viewer = document.getElementById("materi-viewer-wrapper");
  if (!viewer) return;

  if (viewer.style.display === "none" || viewer.innerHTML.trim() === "") {
    if (!window.isMateriLoaded) {
      viewer.innerHTML = `<div style="text-align:center; padding:20px; font-size:12px; color:#64748b;">Memuat pustaka materi...</div>`;
      try {
        const res = await fetch("modules/materi/materi.html");
        if (!res.ok) throw new Error("Gagal mengambil template materi.");
        viewer.innerHTML = await res.text();

        await window.loadScriptOnce("modules/materi/materi.js");
        window.isMateriLoaded = true;
      } catch (err) {
        viewer.innerHTML = `<div style="color:red; font-size:12px; padding:15px; text-align:center;">Gagal memuat modul materi: ${err.message}</div>`;
        viewer.style.display = "block";
        return;
      }
    }

    viewer.style.display = "block";
    if (typeof window.initMateriModule === "function") {
      await window.initMateriModule();
    }
    viewer.scrollIntoView({ behavior: "smooth", block: "start" });
  } else {
    viewer.style.display = "none";
  }

  if (window.lucide) lucide.createIcons();
};

window.tutupMateriViewer = function() {
  const viewer = document.getElementById("materi-viewer-wrapper");
  if (viewer) viewer.style.display = "none";
};

window.loadScriptOnce = function(scriptSrc) {
  return new Promise((resolve) => {
    if (document.querySelector(`script[src="${scriptSrc}"]`)) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = scriptSrc;
    script.onload = () => resolve();
    script.onerror = () => {
      console.warn("Gagal memuat skrip:", scriptSrc);
      resolve();
    };
    document.body.appendChild(script);
  });
};

/* ==============================================================================
   4. LOGIKA KISI APLIKASI TAB BARU
   ============================================================================== */
window.renderAplikasiTabBaruGrid = async function() {
  const grid = document.getElementById("utilitas-app-grid");
  const btnTambah = document.getElementById("btn-tambah-link-app");
  if (!grid) return;

  const userRole = (window.activeUserProfile?.jabatan || "").toLowerCase();
  const ket = (window.activeUserProfile?.keterangan_jabatan || "").toLowerCase();
  const isAdmin = userRole === "admin" || ket.includes("pembina");

  if (isAdmin && btnTambah) btnTambah.style.display = "inline-flex";

  try {
    const { data: extApps, error } = await window.db.from("utilitas_eksternal").select("*");
    if (error) throw error;

    const dynamicApps = (extApps || []).map(app => ({
      id: app.id,
      nama: app.nama,
      kategori: "eksternal",
      ikon_url: app.ikon_url,
      warnaAksen: app.warna_aksen || "#059669",
      warnaBg: app.warna_bg || "#ecfdf5",
      targetUrl: app.target_url,
      aksesMinimal: app.akses_minimal
    }));

    window.UTILITAS_REGISTRY = [...window.UTILITAS_TAB_BARU, ...dynamicApps];

    grid.innerHTML = window.UTILITAS_REGISTRY.map(app => {
      const isInternal = app.kategori === 'tab-baru';
      const badgeClass = isInternal ? 'badge-internal' : 'badge-external';
      const badgeText = isInternal ? 'MODUL' : 'LINK';
      
      const renderIkon = app.ikon_url 
        ? `<img src="${app.ikon_url}" style="width: 100%; height: 100%; object-fit: cover;" />`
        : `<i data-lucide="${app.ikon}"></i>`;

      const deleteBtn = (!isInternal && isAdmin) 
        ? `<div class="btn-delete-app" onclick="event.stopPropagation(); window.hapusAplikasiLink('${app.id}')"><i data-lucide="x" style="width:14px; height:14px;"></i></div>`
        : '';
      
      return `
        <div class="app-card" onclick="window.bukaAplikasiUtilitas('${app.id}')">
          ${deleteBtn}
          <div class="app-icon-wrapper" style="background-color: ${app.warnaBg}; color: ${app.warnaAksen};">
            ${renderIkon}
          </div>
          <div class="app-title">${app.nama}</div>
          <div class="app-badge ${badgeClass}">${badgeText}</div>
        </div>
      `;
    }).join('');

    if (window.lucide) lucide.createIcons();
  } catch (err) {
    grid.innerHTML = `<div style="color:red; font-size:12px;">Gagal memuat aplikasi: ${err.message}</div>`;
  }
};

window.bukaAplikasiUtilitas = function(appId) {
  const app = window.UTILITAS_REGISTRY.find(item => item.id === appId);
  if (!app) return;

  const userRole = (window.activeUserProfile?.jabatan || "guest").toLowerCase();
  const roleLevel = { "guest": 0, "non-aktif": 0, "alumni": 1, "anggota": 2, "pengurus": 3, "admin": 4 };
  
  if (roleLevel[userRole] < roleLevel[app.aksesMinimal]) {
    return alert(`Akses Ditolak: Aplikasi ini memerlukan tingkat akses minimal ${app.aksesMinimal.toUpperCase()}.`);
  }

  window.open(app.targetUrl, "_blank", "noopener,noreferrer");
};

window.openTambahLinkModal = function() {
  document.getElementById("form-tambah-link").reset();
  document.getElementById("modal-tambah-link").style.display = "flex";
};

window.closeTambahLinkModal = function() {
  document.getElementById("modal-tambah-link").style.display = "none";
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
      const compressedBlob = await window.compressProfileImage(fileInput.files[0]);
      const fileName = `app_icon_${Date.now()}.jpg`;
      
      const { error: uploadErr } = await window.db.storage.from("utilitas_ikon").upload(fileName, compressedBlob, { contentType: "image/jpeg" });
      if (uploadErr) throw uploadErr;
      
      const { data: publicUrlData } = window.db.storage.from("utilitas_ikon").getPublicUrl(fileName);
      fotoUrl = publicUrlData.publicUrl;
    }

    if (!fotoUrl) throw new Error("Ikon wajib diunggah.");

    const payload = {
      nama: document.getElementById("link-nama").value.trim(),
      target_url: document.getElementById("link-url").value.trim(),
      akses_minimal: document.getElementById("link-akses").value,
      ikon_url: fotoUrl
    };

    const { error } = await window.db.from("utilitas_eksternal").insert(payload);
    if (error) throw error;

    alert("Aplikasi tautan berhasil ditambahkan!");
    window.closeTambahLinkModal();
    await window.renderAplikasiTabBaruGrid();
  } catch (err) {
    alert("Gagal menyimpan aplikasi: " + err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = "Simpan";
  }
};

window.hapusAplikasiLink = async function(appId) {
  if (!confirm("Hapus tautan aplikasi ini?")) return;
  try {
    const { error } = await window.db.from("utilitas_eksternal").delete().eq("id", appId);
    if (error) throw error;
    await window.renderAplikasiTabBaruGrid();
  } catch (err) {
    alert("Gagal menghapus: " + err.message);
  }
};

setTimeout(window.renderUtilitasGrid, 100);