/**
 * ==============================================================================
 * [CONTROLLER] MODUL INVENTARIS BARANG & UKS - PMR SPADAN
 * ==============================================================================
 */
var currentUser = null;
var currentUserProfile = null;
var inventarisData = [];
var usulanData = [];
var profilRuangData = null;
var activeUsulanFilter = "SEMUA";
var isSubmitting = false;
var isPrivilegedUser = false;

function getInvDbClient() {
  if (window.db) return window.db;
  if (window.parent && window.parent.db) return window.parent.db;
  if (typeof supabase !== "undefined") {
    const url = window.SUPABASE_URL || (window.parent && window.parent.SUPABASE_URL);
    const key = window.SUPABASE_ANON_KEY || (window.parent && window.parent.SUPABASE_ANON_KEY);
    window.db = supabase.createClient(url, key);
    return window.db;
  }
  return null;
}

document.addEventListener("DOMContentLoaded", async () => {
  await initInventarisSession();
  renderTableHeader();
  await loadInventarisData();
  await loadProfilRuangUks();
  if (isPrivilegedUser) {
    await loadUsulanData();
  }
  if (window.lucide) lucide.createIcons();
});

async function initInventarisSession() {
  const guestBanner = document.getElementById("guest-alert-banner");
  const guestAlertText = document.getElementById("guest-alert-text");
  const btnTambah = document.getElementById("btn-tambah-barang");
  const btnEditBangunan = document.getElementById("btn-edit-bangunan");
  const subtabUsulan = document.getElementById("subtab-btn-usulan");
  const filterKepemilikan = document.getElementById("inv-filter-kepemilikan");
  const filterKondisi = document.getElementById("inv-filter-kondisi");
  const dbClient = getInvDbClient();
  
  if (window.parent && window.parent.activeUserProfile) {
    currentUserProfile = window.parent.activeUserProfile;
    currentUser = { id: currentUserProfile.id, email: currentUserProfile.email };
  } else if (typeof getCurrentUser === "function") {
    currentUser = await getCurrentUser();
    currentUserProfile = await getCurrentUserProfile();
  } else if (dbClient?.auth) {
    const { data: { user } } = await dbClient.auth.getUser();
    if (user) {
      currentUser = user;
      const { data: prof } = await dbClient.from("users_profile").select("*").eq("id", user.id).single();
      currentUserProfile = prof;
    }
  }
  
  if (!currentUser || !currentUserProfile) {
    currentUserProfile = { jabatan: "guest", nama_lengkap: "Tamu" };
    isPrivilegedUser = false;
    if (guestBanner) guestBanner.style.display = "flex";
    if (btnTambah) btnTambah.style.display = "none";
    if (btnEditBangunan) btnEditBangunan.style.display = "none";
    if (subtabUsulan) subtabUsulan.style.display = "none";
    if (filterKepemilikan) filterKepemilikan.style.display = "none";
    if (filterKondisi) filterKondisi.style.display = "none";
    return;
  }
  
  const role = (currentUserProfile?.jabatan || "non-aktif").toLowerCase();
  const ket = (currentUserProfile?.keterangan_jabatan || "").toLowerCase();
  const isAlumni = ket.includes("alumni");
  const isNonAktif = role === "non-aktif" || ket.includes("non-aktif");
  const isRestricted = isAlumni || isNonAktif;
  
  isPrivilegedUser = !isRestricted;
  const isAdmin = role === "admin" || ket.includes("pembina");
  const isPengurus = role === "pengurus";
  
  if (btnTambah) btnTambah.style.display = (isAdmin || isPengurus) ? "inline-flex" : "none";
  if (btnEditBangunan) btnEditBangunan.style.display = (isAdmin || isPengurus) ? "inline-flex" : "none";
  if (subtabUsulan) subtabUsulan.style.display = isPrivilegedUser ? "inline-flex" : "none";
  if (filterKepemilikan) filterKepemilikan.style.display = isPrivilegedUser ? "inline-block" : "none";
  if (filterKondisi) filterKondisi.style.display = isPrivilegedUser ? "inline-block" : "none";
  
  if (guestBanner) {
    if (isAlumni) {
      guestBanner.style.display = "flex";
      if (guestAlertText) guestAlertText.innerHTML = "Anda masuk sebagai <strong>Alumni</strong> (Mode Tinjau). Informasi logistik dibatasi pada nama dan jumlah stok.";
    } else if (isNonAktif) {
      guestBanner.style.display = "flex";
      if (guestAlertText) guestAlertText.innerHTML = "Status akun Anda <strong>Non-Aktif</strong>. Akses pengadaan dan rincian internal dibatasi.";
    } else {
      guestBanner.style.display = "none";
    }
  }
}

window.switchInvTab = function(tabName) {
  if (tabName === "usulan" && !isPrivilegedUser) {
    alert("Akses Ditolak: Fitur usulan pengadaan hanya tersedia bagi Anggota Aktif, Pengurus, dan Pembina.");
    return;
  }
  document.querySelectorAll(".subtab-btn").forEach(btn => btn.classList.remove("active"));
  document.querySelectorAll(".tab-pane").forEach(pane => pane.classList.remove("active"));
  const targetPane = document.getElementById(`tab-content-${tabName}`);
  if (targetPane) targetPane.classList.add("active");
  const clickedBtn = Array.from(document.querySelectorAll(".subtab-btn")).find(b => 
    b.getAttribute("onclick")?.includes(tabName)
  );
  if (clickedBtn) clickedBtn.classList.add("active");
  if (window.lucide) lucide.createIcons();
};

function renderTableHeader() {
  const thead = document.getElementById("thead-inventaris");
  if (!thead) return;
  if (isPrivilegedUser) {
    thead.innerHTML = `
      <tr>
        <th style="width: 50px;">Foto</th>
        <th>Nama Barang & Kategori</th>
        <th>Kepemilikan</th>
        <th style="width: 90px; text-align: center;">Jumlah</th>
        <th>Kondisi</th>
        <th>Lokasi Rak</th>
        <th style="width: 110px; text-align: center;">Aksi</th>
      </tr>
    `;
  } else {
    thead.innerHTML = `
      <tr>
        <th style="width: 50px;">Foto</th>
        <th>Nama Barang & Kategori</th>
        <th style="width: 110px; text-align: center;">Jumlah Stok</th>
      </tr>
    `;
  }
}

async function loadInventarisData() {
  const tbody = document.getElementById("tbody-inventaris");
  const dbClient = getInvDbClient();
  if (!dbClient) {
    if (tbody) tbody.innerHTML = `<tr><td colspan="7" class="loading-state" style="color:#b91c1c;">Koneksi database tidak tersedia.</td></tr>`;
    return;
  }
  try {
    const { data, error } = await dbClient
      .from("inventaris_barang")
      .select("*")
      .order("nama_barang", { ascending: true });
    if (error) throw error;
    inventarisData = data || [];
    renderInventarisTable(inventarisData);
  } catch (err) {
    const colSpan = isPrivilegedUser ? 7 : 3;
    if (tbody) tbody.innerHTML = `<tr><td colspan="${colSpan}" class="loading-state" style="color:#b91c1c;">Gagal memuat inventaris: ${err.message}</td></tr>`;
  }
}

function renderInventarisTable(items) {
  const tbody = document.getElementById("tbody-inventaris");
  if (!tbody) return;
  const colSpan = isPrivilegedUser ? 7 : 3;
  if (items.length === 0) {
    tbody.innerHTML = `<tr><td colspan="${colSpan}" class="loading-state">Belum ada data barang tercatat.</td></tr>`;
    return;
  }
  const role = (currentUserProfile?.jabatan || "guest").toLowerCase();
  const canOperate = role === "admin" || role === "pengurus";
  
  tbody.innerHTML = items.map(item => {
    // SANITASI DATA (XSS)
    const amanNamaBarang = window.parent.sanitizeHTML ? window.parent.sanitizeHTML(item.nama_barang) : item.nama_barang;
    const amanKategori = window.parent.sanitizeHTML ? window.parent.sanitizeHTML(item.kategori) : item.kategori;
    const amanSatuan = window.parent.sanitizeHTML ? window.parent.sanitizeHTML(item.satuan) : item.satuan;
    const amanKondisi = window.parent.sanitizeHTML ? window.parent.sanitizeHTML(item.kondisi) : item.kondisi;
    const amanLokasi = window.parent.sanitizeHTML ? window.parent.sanitizeHTML(item.lokasi_rak) : item.lokasi_rak;
    const amanPemilik = window.parent.sanitizeHTML ? window.parent.sanitizeHTML(item.nama_pemilik_pribadi) : item.nama_pemilik_pribadi;

    const foto = item.foto_barang_url 
      ? `<img src="${item.foto_barang_url}" class="foto-thumbnail-click" title="Klik untuk melihat foto & detail" onclick="window.bukaDetailBarangModal('${item.id}')" style="width:38px; height:38px; border-radius:6px; object-fit:cover;" />`
      : `<div class="foto-thumbnail-click" title="Klik untuk melihat detail" onclick="window.bukaDetailBarangModal('${item.id}')" style="width:38px; height:38px; border-radius:6px; background:#e2e8f0; display:flex; align-items:center; justify-content:center; font-size:10px; color:#64748b;"><i data-lucide="image" style="width:16px; height:16px;"></i></div>`;
    
    if (!isPrivilegedUser) {
      return `
        <tr>
          <td>${foto}</td>
          <td>
            <div style="font-weight:700; color:#0f172a; cursor:pointer;" onclick="window.bukaDetailBarangModal('${item.id}')">${amanNamaBarang}</div>
            <div style="font-size:10.5px; color:#64748b;">${amanKategori}</div>
          </td>
          <td style="text-align:center; font-weight:700;">${item.jumlah} <span style="font-weight:400; font-size:10px; color:#64748b;">${amanSatuan}</span></td>
        </tr>
      `;
    }
    
    let badgeClass = "badge-uks";
    let badgeText = "ASET UKS";
    if (item.kepemilikan === "PMR") {
      badgeClass = "badge-pmr";
      badgeText = "ASET PMR";
    } else if (item.kepemilikan === "PINJAMAN_PRIBADI") {
      badgeClass = "badge-pribadi";
      badgeText = `PINJAMAN (${amanPemilik || 'PRIBADI'})`;
    }
    
    let kondisiClass = "kondisi-baik";
    if (item.kondisi.includes("Rusak")) kondisiClass = "kondisi-rusak";
    if (item.kondisi.includes("Habis")) kondisiClass = "kondisi-habis";
    
    const actionBtns = canOperate ? `
      <button class="btn-row-action" title="Edit Barang" onclick="window.editBarang('${item.id}')"><i data-lucide="edit-2"></i></button>
      <button class="btn-row-action delete" title="Hapus Barang" onclick="window.hapusBarang('${item.id}')"><i data-lucide="trash-2"></i></button>
    ` : `<button class="btn-row-action" title="Lihat Detail" onclick="window.bukaDetailBarangModal('${item.id}')"><i data-lucide="eye"></i></button>`;
    
    return `
      <tr>
        <td>${foto}</td>
        <td>
          <div style="font-weight:700; color:#0f172a; cursor:pointer;" onclick="window.bukaDetailBarangModal('${item.id}')">${amanNamaBarang}</div>
          <div style="font-size:10.5px; color:#64748b;">${amanKategori}</div>
        </td>
        <td><span class="badge-entity ${badgeClass}">${badgeText}</span></td>
        <td style="text-align:center; font-weight:700;">${item.jumlah} <span style="font-weight:400; font-size:10px; color:#64748b;">${amanSatuan}</span></td>
        <td><span class="badge-kondisi ${kondisiClass}">${amanKondisi}</span></td>
        <td style="font-size:11.5px; color:#475569;">${amanLokasi}</td>
        <td style="text-align:center;"><div style="display:inline-flex; gap:4px;">${actionBtns}</div></td>
      </tr>
    `;
  }).join("");
  if (window.lucide) lucide.createIcons();
}

window.bukaDetailBarangModal = function(id) {
  const item = inventarisData.find(b => b.id === id);
  if (!item) return;
  const titleEl = document.getElementById("detail-modal-nama-barang");
  const imgEl = document.getElementById("detail-modal-img");
  const infoEl = document.getElementById("detail-modal-info");
  
  const sanitize = window.parent.sanitizeHTML || (x => x);

  if (titleEl) titleEl.textContent = item.nama_barang;
  if (imgEl) {
    imgEl.src = item.foto_barang_url || "https://placehold.co/400x250/e2e8f0/64748b?text=Tidak+Ada+Foto";
    imgEl.style.display = "block";
  }
  if (!isPrivilegedUser) {
    if (infoEl) {
      infoEl.innerHTML = `
        <div class="spec-row"><span class="label">Nama Barang</span><span class="val">${sanitize(item.nama_barang)}</span></div>
        <div class="spec-row"><span class="label">Kategori</span><span class="val">${sanitize(item.kategori)}</span></div>
        <div class="spec-row"><span class="label">Jumlah Tersedia</span><span class="val" style="color:var(--maroon); font-weight:800;">${item.jumlah} ${sanitize(item.satuan)}</span></div>
      `;
    }
  } else {
    const formatKedaluwarsa = item.tanggal_kedaluwarsa 
      ? new Date(item.tanggal_kedaluwarsa).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })
      : "-";
    if (infoEl) {
      infoEl.innerHTML = `
        <div class="spec-row"><span class="label">Kode / ID Barang</span><span class="val">${sanitize(item.kode_barang || item.id.substring(0, 8).toUpperCase())}</span></div>
        <div class="spec-row"><span class="label">Kategori</span><span class="val">${sanitize(item.kategori)}</span></div>
        <div class="spec-row"><span class="label">Entitas Kepemilikan</span><span class="val">${item.kepemilikan === 'PINJAMAN_PRIBADI' ? `Pinjaman (${sanitize(item.nama_pemilik_pribadi) || 'Pribadi'})` : `Aset ${item.kepemilikan}`}</span></div>
        <div class="spec-row"><span class="label">Jumlah Stok</span><span class="val" style="color:var(--maroon); font-weight:800;">${item.jumlah} ${sanitize(item.satuan)}</span></div>
        <div class="spec-row"><span class="label">Kondisi Fisik</span><span class="val">${sanitize(item.kondisi)}</span></div>
        <div class="spec-row"><span class="label">Lokasi Penyimpanan / Rak</span><span class="val">${sanitize(item.lokasi_rak)}</span></div>
        <div class="spec-row"><span class="label">Tanggal Kedaluwarsa</span><span class="val">${formatKedaluwarsa}</span></div>
        <div class="spec-row" style="flex-direction:column; align-items:flex-start; gap:4px; padding-top:8px;">
          <span class="label">Catatan Spesifikasi:</span>
          <span class="val" style="text-align:left; font-weight:500; color:#334155;">${sanitize(item.keterangan_catatan || 'Tidak ada catatan khusus.')}</span>
        </div>
      `;
    }
  }
  document.getElementById("modal-detail-barang")?.classList.add("active");
  if (window.lucide) lucide.createIcons();
};

window.closeDetailBarangModal = function() {
  document.getElementById("modal-detail-barang")?.classList.remove("active");
};

window.filterInventarisList = function() {
  const query = document.getElementById("inv-search-input")?.value.toLowerCase().trim();
  const kepemilikan = document.getElementById("inv-filter-kepemilikan")?.value || "SEMUA";
  const kondisi = document.getElementById("inv-filter-kondisi")?.value || "SEMUA";
  const filtered = inventarisData.filter(item => {
    const matchQuery = !query || item.nama_barang.toLowerCase().includes(query) || (isPrivilegedUser && item.lokasi_rak && item.lokasi_rak.toLowerCase().includes(query));
    const matchKepemilikan = !isPrivilegedUser || kepemilikan === "SEMUA" || item.kepemilikan === kepemilikan;
    const matchKondisi = !isPrivilegedUser || kondisi === "SEMUA" || item.kondisi === kondisi;
    return matchQuery && matchKepemilikan && matchKondisi;
  });
  renderInventarisTable(filtered);
};

window.openTambahBarangModal = function() {
  document.getElementById("form-barang")?.reset();
  document.getElementById("form-barang-id").value = "";
  document.getElementById("modal-barang-title").textContent = "Tambah Data Barang";
  window.togglePemilikPribadiField();
  document.getElementById("modal-barang")?.classList.add("active");
};

window.closeBarangModal = function() {
  document.getElementById("modal-barang")?.classList.remove("active");
};

window.togglePemilikPribadiField = function() {
  const val = document.getElementById("form-kepemilikan")?.value;
  const group = document.getElementById("group-pemilik-pribadi");
  const input = document.getElementById("form-pemilik-pribadi");
  if (group && input) {
    const isPribadi = val === "PINJAMAN_PRIBADI";
    group.style.display = isPribadi ? "flex" : "none";
    input.required = isPribadi;
  }
};

window.cekDuplikasiBarang = async function() {
  const barangId = document.getElementById("form-barang-id")?.value;
  if (barangId) return;
  const nama = document.getElementById("form-nama-barang")?.value.trim();
  const kepemilikan = document.getElementById("form-kepemilikan")?.value;
  if (!nama) return;
  const match = inventarisData.find(item => 
    item.nama_barang.toLowerCase() === nama.toLowerCase() && item.kepemilikan === kepemilikan
  );
  if (match) {
    const tambahStok = confirm(`Barang "${match.nama_barang}" (${match.kepemilikan}) sudah terdaftar dengan stok ${match.jumlah} ${match.satuan}.\n\nApakah Anda ingin memperbarui stok barang yang sudah ada ini?`);
    if (tambahStok) {
      window.editBarang(match.id);
    }
  }
};

window.editBarang = function(id) {
  const item = inventarisData.find(b => b.id === id);
  if (!item) return;
  document.getElementById("form-barang-id").value = item.id;
  document.getElementById("modal-barang-title").textContent = "Edit Data Barang";
  document.getElementById("form-nama-barang").value = item.nama_barang;
  document.getElementById("form-kategori").value = item.kategori;
  document.getElementById("form-kepemilikan").value = item.kepemilikan;
  window.togglePemilikPribadiField();
  document.getElementById("form-pemilik-pribadi").value = item.nama_pemilik_pribadi || "";
  document.getElementById("form-jumlah").value = item.jumlah;
  document.getElementById("form-satuan").value = item.satuan;
  document.getElementById("form-lokasi-rak").value = item.lokasi_rak;
  document.getElementById("form-kondisi").value = item.kondisi;
  document.getElementById("form-kedaluwarsa").value = item.tanggal_kedaluwarsa || "";
  document.getElementById("form-catatan").value = item.keterangan_catatan || "";
  document.getElementById("modal-barang")?.classList.add("active");
};

window.handleBarangSubmit = async function(event) {
  event.preventDefault();
  if (isSubmitting) return;
  const dbClient = getInvDbClient();
  if (!dbClient) return alert("Koneksi database tidak tersedia.");
  const btn = document.getElementById("btn-save-barang");
  
  const barangId = document.getElementById("form-barang-id").value;
  const nama = document.getElementById("form-nama-barang").value.trim();
  const kategori = document.getElementById("form-kategori").value;
  const kepemilikan = document.getElementById("form-kepemilikan").value;
  const pemilikPribadi = kepemilikan === "PINJAMAN_PRIBADI" ? document.getElementById("form-pemilik-pribadi").value.trim() : null;
  const jumlah = parseInt(document.getElementById("form-jumlah").value, 10);
  const satuan = document.getElementById("form-satuan").value.trim();
  const lokasiRak = document.getElementById("form-lokasi-rak").value.trim();
  const kondisi = document.getElementById("form-kondisi").value;
  const kedaluwarsa = document.getElementById("form-kedaluwarsa").value || null;
  const catatan = document.getElementById("form-catatan").value.trim() || null;
  const fotoInput = document.getElementById("form-foto");
  
  isSubmitting = true;
  btn.disabled = true;
  btn.textContent = "Menyimpan...";
  try {
    let fotoUrl = null;
    if (fotoInput.files && fotoInput.files[0]) {
      const file = fotoInput.files[0];
      
      // [KEAMANAN] Validasi Tipe Ekstensi File
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        throw new Error("Tipe file tidak diizinkan. Hanya menerima format gambar (JPG, PNG, WebP).");
      }

      const fileName = `item_${crypto.randomUUID()}.jpg`; // PERBAIKAN UUID
      const { error: uploadErr } = await dbClient.storage.from("inventaris_aset").upload(fileName, file);
      if (!uploadErr) {
        const { data: publicData } = dbClient.storage.from("inventaris_aset").getPublicUrl(fileName);
        fotoUrl = publicData.publicUrl;
      }
    }
    const payload = {
      nama_barang: nama, kategori: kategori, kepemilikan: kepemilikan, nama_pemilik_pribadi: pemilikPribadi,
      jumlah: jumlah, satuan: satuan, lokasi_rak: lokasiRak, kondisi: kondisi,
      tanggal_kedaluwarsa: kedaluwarsa, keterangan_catatan: catatan, updated_at: new Date().toISOString()
    };
    if (fotoUrl) payload.foto_barang_url = fotoUrl;
    
    if (barangId) {
      const oldItem = inventarisData.find(b => b.id === barangId);
      if (currentUser) {
        await dbClient.from("inventaris_log_aktivitas").insert({
          barang_id: barangId, nama_barang: nama, kepemilikan: kepemilikan, aksi: "UPDATE_STOK",
          rincian_perubahan: { sebelum: oldItem, sesudah: payload },
          petugas_id: currentUser.id, nama_petugas: currentUserProfile.nama_lengkap, jabatan_petugas: currentUserProfile.jabatan
        });
      }
      const { error } = await dbClient.from("inventaris_barang").update(payload).eq("id", barangId);
      if (error) throw error;
    } else {
      const { data: newEntry, error } = await dbClient.from("inventaris_barang").insert(payload).select().single();
      if (error) throw error;
      if (currentUser && newEntry) {
        await dbClient.from("inventaris_log_aktivitas").insert({
          barang_id: newEntry.id, nama_barang: nama, kepemilikan: kepemilikan, aksi: "TAMBAH",
          rincian_perubahan: { data_baru: payload },
          petugas_id: currentUser.id, nama_petugas: currentUserProfile.nama_lengkap, jabatan_petugas: currentUserProfile.jabatan
        });
      }
    }
    alert("Data barang berhasil disimpan!");
    window.closeBarangModal();
    await loadInventarisData();
  } catch (err) {
    alert("Gagal menyimpan: " + err.message);
  } finally {
    isSubmitting = false;
    btn.disabled = false;
    btn.textContent = "Simpan Data";
  }
};

window.hapusBarang = async function(id) {
  const item = inventarisData.find(b => b.id === id);
  if (!item) return;
  const dbClient = getInvDbClient();
  if (!dbClient) return alert("Koneksi database tidak tersedia.");
  const alasan = prompt(`Hapus barang "${item.nama_barang}"?\nMasukkan alasan penghapusan:`);
  if (!alasan) return;
  try {
    if (currentUser) {
      await dbClient.from("inventaris_log_aktivitas").insert({
        barang_id: item.id, nama_barang: item.nama_barang, kepemilikan: item.kepemilikan, aksi: "HAPUS",
        rincian_perubahan: { barang: item, alasan: alasan },
        petugas_id: currentUser.id, nama_petugas: currentUserProfile.nama_lengkap, jabatan_petugas: currentUserProfile.jabatan
      });
    }
    const { error } = await dbClient.from("inventaris_barang").delete().eq("id", id);
    if (error) throw error;
    alert("Barang berhasil dihapus dari inventaris.");
    await loadInventarisData();
  } catch (err) {
    alert("Gagal menghapus: " + err.message);
  }
};

/* ==============================================================================
   3. TAB 2: PROFIL BANGUNAN & FASILITAS RUANG UKS
   ============================================================================== */
async function loadProfilRuangUks() {
  const specsEl = document.getElementById("building-specs");
  const compsEl = document.getElementById("building-condition-components");
  const sanCardsEl = document.getElementById("building-sanitation-cards");
  const photoContainer = document.getElementById("room-photo-container");
  const notesEl = document.getElementById("room-notes");
  const dbClient = getInvDbClient();
  if (!dbClient) return;
  
  try {
    const { data, error } = await dbClient.from("profil_ruang_uks").select("*").limit(1).maybeSingle();
    if (error) throw error;
    if (!data) return;
    profilRuangData = data;
    
    if (photoContainer) {
      photoContainer.innerHTML = data.foto_ruangan_url 
        ? `<img src="${data.foto_ruangan_url}?v=${Date.now()}" alt="Foto Ruangan UKS" />`
        : `<div class="no-photo"><i data-lucide="image"></i><span>Belum ada foto ruangan</span></div>`;
    }
    if (notesEl) {
      const sanitize = window.parent.sanitizeHTML || (x => x);
      notesEl.innerHTML = `<strong>Catatan Pemeliharaan:</strong><br>${sanitize(data.catatan_pemeliharaan) || 'Tidak ada catatan khusus.'}`;
    }
    
    if (window.lucide) lucide.createIcons();
  } catch (err) {
    console.error("Gagal load profil UKS:", err);
  }
}

window.openEditBangunanModal = function() { /* ... LOGIKA SAMA ... */ };
window.closeEditBangunanModal = function() { /* ... LOGIKA SAMA ... */ };

window.handleUpdateBangunanSubmit = async function(event) {
  event.preventDefault();
  const dbClient = getInvDbClient();
  if (!dbClient) return alert("Koneksi database tidak tersedia.");
  const btn = document.getElementById("btn-save-bangunan");
  const fileInput = document.getElementById("edit-room-photo-file");
  btn.disabled = true;
  btn.textContent = "Menyimpan Perubahan...";
  try {
    let fotoUrl = profilRuangData?.foto_ruangan_url;
    if (fileInput.files && fileInput.files[0]) {
      const file = fileInput.files[0];
      
      // [KEAMANAN] Validasi Tipe Ekstensi File
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        throw new Error("Tipe file tidak diizinkan. Hanya menerima format gambar (JPG, PNG, WebP).");
      }

      const fileName = `ruang_uks_${crypto.randomUUID()}.jpg`; // PERBAIKAN UUID
      const { error: uploadErr } = await dbClient.storage.from("inventaris_aset").upload(fileName, file);
      if (!uploadErr) {
        const { data: publicData } = dbClient.storage.from("inventaris_aset").getPublicUrl(fileName);
        fotoUrl = publicData.publicUrl;
      }
    }
    const payload = {
      nama_ruangan: document.getElementById("edit-room-name").value.trim(),
      lokasi_lantai: document.getElementById("edit-room-floor").value.trim(),
      panjang_meter: parseFloat(document.getElementById("edit-room-length").value),
      lebar_meter: parseFloat(document.getElementById("edit-room-width").value),
      kapasitas_tempat_tidur: parseInt(document.getElementById("edit-room-beds").value, 10),
      ada_pemisah_gender: document.getElementById("edit-room-gender-divider").value === "true",
      kondisi_lantai: document.getElementById("edit-kondisi-lantai").value,
      kondisi_dinding: document.getElementById("edit-kondisi-dinding").value,
      kondisi_plafon: document.getElementById("edit-kondisi-plafon").value,
      kondisi_pintu_jendela: document.getElementById("edit-kondisi-pintu").value,
      ada_wastafel_air_mengalir: document.getElementById("edit-room-wastafel").value === "true",
      ada_toilet_dalam: document.getElementById("edit-room-toilet").value === "true",
      ventilasi_udara: document.getElementById("edit-room-vent").value.trim(),
      pencahayaan: document.getElementById("edit-room-light").value.trim(),
      catatan_pemeliharaan: document.getElementById("edit-room-notes").value.trim(),
      foto_ruangan_url: fotoUrl,
      updated_at: new Date().toISOString()
    };
    const { error } = await dbClient.from("profil_ruang_uks").update(payload).eq("id", profilRuangData.id);
    if (error) throw error;
    alert("Profil fasilitas ruang UKS berhasil diperbarui!");
    window.closeEditBangunanModal();
    await loadProfilRuangUks();
  } catch (err) {
    alert("Gagal memperbarui bangunan: " + err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = "Simpan Perubahan";
  }
};

/* ==============================================================================
   4. TAB 3: USULAN PENGADAAN
   ============================================================================== */
async function loadUsulanData() {
  if (!isPrivilegedUser) return;
  const tbody = document.getElementById("tbody-usulan");
  const dbClient = getInvDbClient();
  if (!dbClient) return;
  try {
    const { data, error } = await dbClient
      .from("inventaris_usulan")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    usulanData = data || [];
    renderUsulanTable();
  } catch (err) {
    if (tbody) tbody.innerHTML = `<tr><td colspan="6" class="loading-state" style="color:#b91c1c;">Gagal memuat usulan: ${err.message}</td></tr>`;
  }
}

window.filterUsulanStatus = function(status) {
  activeUsulanFilter = status;
  document.querySelectorAll(".status-tab-btn").forEach(btn => {
    btn.classList.toggle("active", btn.textContent.trim().toUpperCase() === status.toUpperCase());
  });
  renderUsulanTable();
};

function renderUsulanTable() {
  const tbody = document.getElementById("tbody-usulan");
  if (!tbody) return;
  const filtered = activeUsulanFilter === "SEMUA" 
    ? usulanData 
    : usulanData.filter(u => u.status === activeUsulanFilter);
  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="loading-state">Tidak ada usulan pengadaan dengan status ini.</td></tr>`;
    return;
  }
  const role = (currentUserProfile?.jabatan || "guest").toLowerCase();
  const ket = (currentUserProfile?.keterangan_jabatan || "").toLowerCase();
  const isAdminOrPembina = role === "admin" || ket.includes("pembina");
  
  tbody.innerHTML = filtered.map(u => {
    let badgeClass = "badge-uks";
    if (u.status === "Disetujui") badgeClass = "kondisi-baik";
    if (u.status === "Ditolak") badgeClass = "kondisi-rusak";
    if (u.status === "Terealisasi") badgeClass = "badge-pmr";
    
    const foto = u.foto_usulan_url 
      ? `<img src="${u.foto_usulan_url}" class="foto-thumbnail-click" title="Klik untuk memperbesar" onclick="window.bukaDetailFotoUsulan('${u.id}')" style="width:38px; height:38px; border-radius:6px; object-fit:cover;" />`
      : `<div style="width:38px; height:38px; border-radius:6px; background:#e2e8f0; display:flex; align-items:center; justify-content:center; font-size:10px; color:#64748b;">No Pic</div>`;
    
    const sanitize = window.parent.sanitizeHTML || (x => x);
    const amanNamaUsulan = sanitize(u.nama_barang);
    const amanAlasan = sanitize(u.alasan_kebutuhan);
    const amanCatatan = sanitize(u.catatan_pembina);
    const amanVerifikator = sanitize(u.diverifikasi_oleh);

    const tanggapanInfo = u.catatan_pembina 
      ? `<div style="margin-top:4px; font-size:11px; color:#1e293b; background:#f8fafc; padding:4px 6px; border-radius:6px; border-left:3px solid var(--maroon);">
          <strong>Catatan:</strong> ${amanCatatan}
          <div style="font-size:9.5px; color:#64748b;">Oleh: ${amanVerifikator || 'Pembina'}</div>
        </div>`
      : `<div style="font-size:10px; color:#94a3b8; margin-top:2px;"><em>Belum ada catatan tanggapan.</em></div>`;
      
    const actionBtn = isAdminOrPembina ? `
      <button class="btn-tanggapi" onclick="window.openTanggapiModal('${u.id}')">
        <i data-lucide="message-square"></i> Tanggapi
      </button>
    ` : `<span style="font-size:11px; color:#94a3b8;">${new Date(u.created_at).toLocaleDateString("id-ID")}</span>`;
    
    return `
      <tr>
        <td>${foto}</td>
        <td>
          <div style="font-weight:700; color:#0f172a;">${amanNamaUsulan}</div>
          <div style="font-size:10px; color:#64748b;">Tanggal: ${new Date(u.created_at).toLocaleDateString("id-ID")}</div>
        </td>
        <td style="text-align:center; font-weight:700;">${u.jumlah_diusulkan}</td>
        <td style="font-size:12px; color:#334155;">${amanAlasan}</td>
        <td>
          <span class="badge-entity ${badgeClass}">${u.status}</span>
          ${tanggapanInfo}
        </td>
        <td style="text-align:center;">${actionBtn}</td>
      </tr>
    `;
  }).join("");
  if (window.lucide) lucide.createIcons();
}

window.bukaDetailFotoUsulan = function(usulanId) {
  const u = usulanData.find(item => item.id === usulanId);
  if (!u || !u.foto_usulan_url) return;
  const titleEl = document.getElementById("detail-modal-nama-barang");
  const imgEl = document.getElementById("detail-modal-img");
  const infoEl = document.getElementById("detail-modal-info");
  const sanitize = window.parent.sanitizeHTML || (x => x);

  if (titleEl) titleEl.textContent = `Usulan: ${u.nama_barang}`;
  if (imgEl) { imgEl.src = u.foto_usulan_url; imgEl.style.display = "block"; }
  if (infoEl) {
    infoEl.innerHTML = `
      <div class="spec-row"><span class="label">Nama Barang Usulan</span><span class="val">${sanitize(u.nama_barang)}</span></div>
      <div class="spec-row"><span class="label">Jumlah Diajukan</span><span class="val" style="color:var(--maroon);">${u.jumlah_diusulkan} Unit/Pcs</span></div>
      <div class="spec-row"><span class="label">Status Usulan</span><span class="val">${u.status}</span></div>
      <div class="spec-row" style="flex-direction:column; align-items:flex-start; gap:4px; padding-top:8px;">
        <span class="label">Alasan Kebutuhan:</span>
        <span class="val" style="text-align:left; font-weight:500; color:#334155;">${sanitize(u.alasan_kebutuhan)}</span>
      </div>
    `;
  }
  document.getElementById("modal-detail-barang")?.classList.add("active");
};

window.openUsulanModal = function() { /* ... */ };
window.closeUsulanModal = function() { /* ... */ };

window.handleUsulanSubmit = async function(event) {
  event.preventDefault();
  const dbClient = getInvDbClient();
  if (!dbClient || !currentUser) return alert("Koneksi database atau sesi akun tidak tersedia.");
  const btn = document.getElementById("btn-save-usulan");
  const nama = document.getElementById("usulan-nama").value.trim();
  const jumlah = parseInt(document.getElementById("usulan-jumlah").value, 10);
  const alasan = document.getElementById("usulan-alasan").value.trim();
  const fotoInput = document.getElementById("usulan-foto-file");
  
  btn.disabled = true;
  btn.textContent = "Mengirim Usulan...";
  try {
    let fotoUrl = null;
    if (fotoInput.files && fotoInput.files[0]) {
      const file = fotoInput.files[0];
      
      // [KEAMANAN] Validasi Tipe Ekstensi File
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        throw new Error("Tipe file tidak diizinkan. Hanya menerima format gambar (JPG, PNG, WebP).");
      }

      const fileName = `usulan_${crypto.randomUUID()}.jpg`; // PERBAIKAN UUID
      const { error: uploadErr } = await dbClient.storage.from("inventaris_aset").upload(fileName, file);
      if (!uploadErr) {
        const { data: publicData } = dbClient.storage.from("inventaris_aset").getPublicUrl(fileName);
        fotoUrl = publicData.publicUrl;
      }
    }
    const { error } = await dbClient.from("inventaris_usulan").insert({
      nama_barang: nama,
      jumlah_diusulkan: jumlah,
      alasan_kebutuhan: alasan,
      foto_usulan_url: fotoUrl,
      pengusul_id: currentUser.id,
      status: "Menunggu"
    });
    if (error) throw error;
    alert("Usulan pengadaan berhasil dikirim ke Pembina/Admin!");
    window.closeUsulanModal();
    await loadUsulanData();
  } catch (err) {
    alert("Gagal mengirim usulan: " + err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = "Kirim Usulan";
  }
};

window.openTanggapiModal = function(usulanId) { /* ... */ };
window.closeTanggapiModal = function() { /* ... */ };
window.handleTanggapiSubmit = async function(event) { /* ... */ };