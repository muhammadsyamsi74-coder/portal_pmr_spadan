/**
 * ==============================================================================
 * CONTROLLER MODUL MATERI PMR - PORTAL PMR SPADAN
 * Diperbarui:
 * - 5 Tombol Aksi Berbasis Ikon (Buka, Salin Tautan, Pin, Edit, Hapus)
 * - Tampilan responsif & ramah layar ponsel tanpa sesak teks
 * - Dukungan Tambah & Edit Materi terpadu
 * ==============================================================================
 */

window.materiPmrList = [];

function getMateriDbClient() {
  if (window.db) return window.db;
  if (window.parent && window.parent.db) return window.parent.db;
  if (typeof supabase !== "undefined" && window.SUPABASE_URL && window.SUPABASE_ANON_KEY) {
    window.db = supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
    return window.db;
  }
  return null;
}

window.canManageMateri = function() {
  const profile = window.activeUserProfile || (window.parent && window.parent.activeUserProfile);
  if (!profile) return false;

  const role = (profile.jabatan || "").toLowerCase();
  const ket = (profile.keterangan_jabatan || "").toLowerCase();

  const isRoleAdmin = role === "admin";
  const isRolePengurus = role === "pengurus";
  const isKetua = ket.includes("ketua");
  const isWakil = ket.includes("wakil");
  const isSekretaris = ket.includes("sekretaris");
  const isBendahara = ket.includes("bendahara");
  const isPelatih = ket.includes("pelatih") || ket.includes("pembina");

  return isRoleAdmin || (isRolePengurus && (isKetua || isWakil || isSekretaris || isBendahara || isPelatih)) || isPelatih;
};

window.initMateriModule = async function() {
  const btnTambah = document.getElementById("btn-tambah-materi");
  if (btnTambah) {
    btnTambah.style.display = window.canManageMateri() ? "inline-flex" : "none";
  }

  await window.loadMateriData();
};

window.loadMateriData = async function() {
  const container = document.getElementById("materi-items-container");
  const dbClient = getMateriDbClient();

  if (!container) return;
  if (!dbClient) {
    container.innerHTML = `<div style="color:#dc2626; font-size:12px; padding:20px; text-align:center;">Koneksi basis data belum siap. Silakan muat ulang.</div>`;
    return;
  }

  try {
    const { data, error } = await dbClient
      .from("materi_pmr")
      .select("*")
      .order("is_pinned", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) throw error;
    window.materiPmrList = data || [];
    window.renderMateriList();
  } catch (err) {
    console.error("Gagal load materi:", err);
    container.innerHTML = `<div style="color:#dc2626; font-size:12px; padding:20px; text-align:center;">Gagal memuat materi: ${err.message}</div>`;
  }
};

window.renderMateriList = function() {
  const container = document.getElementById("materi-items-container");
  const searchVal = document.getElementById("filter-materi-search")?.value.toLowerCase().trim() || "";
  if (!container) return;

  let filtered = window.materiPmrList;
  if (searchVal) {
    filtered = filtered.filter(m =>
      (m.judul_materi || "").toLowerCase().includes(searchVal) ||
      (m.deskripsi_singkat && m.deskripsi_singkat.toLowerCase().includes(searchVal))
    );
  }

  if (filtered.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; color: #94a3b8; padding: 35px 10px; font-size: 12px; font-weight: 600;">
        Belum ada materi pembelajaran yang ditemukan.
      </div>
    `;
    return;
  }

  const canManage = window.canManageMateri();

  container.innerHTML = filtered.map(item => {
    const isPinned = Boolean(item.is_pinned);
    const pinBadge = isPinned
      ? `<span class="pin-badge"><i data-lucide="pin"></i> TERSEMAT</span>`
      : "";

    // 1. Tombol Buka Tautan (Ikon Saja)
    const openBtn = `
      <a href="${item.url_materi}" target="_blank" rel="noopener,noreferrer" class="btn-icon-materi btn-icon-open" title="Buka Materi di Tab Baru">
        <i data-lucide="external-link"></i>
      </a>
    `;

    // 2. Tombol Salin Tautan (Ikon Saja)
    const copyBtn = `
      <button class="btn-icon-materi btn-icon-copy" id="btn-copy-${item.id}" onclick="window.salinTautanMateri('${item.id}', '${encodeURIComponent(item.url_materi)}')" title="Salin Tautan Materi">
        <i data-lucide="copy"></i>
      </button>
    `;

    // 3. Tombol Pin (Ikon Saja - Khusus Pengurus/Admin)
    const pinActionBtn = canManage ? `
      <button class="btn-icon-materi btn-icon-pin ${isPinned ? 'active-pinned' : ''}" onclick="window.togglePinMateri('${item.id}', ${isPinned})" title="${isPinned ? 'Lepas Sematan' : 'Sematkan ke Atas'}">
        <i data-lucide="pin"></i>
      </button>
    ` : "";

    // 4. Tombol Edit (Ikon Saja - Khusus Pengurus/Admin)
    const editBtn = canManage ? `
      <button class="btn-icon-materi btn-icon-edit" onclick="window.editMateri('${item.id}')" title="Edit Materi">
        <i data-lucide="edit-3"></i>
      </button>
    ` : "";

    // 5. Tombol Hapus (Ikon Saja - Khusus Pengurus/Admin)
    const deleteBtn = canManage ? `
      <button class="btn-icon-materi btn-icon-del" onclick="window.hapusMateri('${item.id}')" title="Hapus Materi">
        <i data-lucide="trash-2"></i>
      </button>
    ` : "";

    return `
      <div class="materi-item-card ${isPinned ? 'is-pinned-card' : ''}">
        <div style="display: flex; align-items: flex-start; gap: 12px; flex: 1; min-width: 0;">
          <div class="materi-icon-type">
            <i data-lucide="file-text"></i>
          </div>
          <div class="materi-info-col">
            <div class="materi-badges-row">
              ${pinBadge}
            </div>
            <div class="materi-card-title">${item.judul_materi}</div>
            ${item.deskripsi_singkat ? `<div class="materi-card-desc">${item.deskripsi_singkat}</div>` : ""}
          </div>
        </div>

        <div class="materi-actions-row">
          ${openBtn}
          ${copyBtn}
          ${pinActionBtn}
          ${editBtn}
          ${deleteBtn}
        </div>
      </div>
    `;
  }).join("");

  if (window.lucide) lucide.createIcons();
};

/* SALIN TAUTAN DENGAN FEEDBACK VISUAL */
window.salinTautanMateri = function(materiId, encodedUrl) {
  const url = decodeURIComponent(encodedUrl);
  navigator.clipboard.writeText(url).then(() => {
    const btn = document.getElementById(`btn-copy-${materiId}`);
    if (btn) {
      btn.classList.add("copied");
      btn.innerHTML = `<i data-lucide="check"></i>`;
      btn.title = "Tautan Berhasil Disalin!";
      if (window.lucide) lucide.createIcons();

      setTimeout(() => {
        btn.classList.remove("copied");
        btn.innerHTML = `<i data-lucide="copy"></i>`;
        btn.title = "Salin Tautan Materi";
        if (window.lucide) lucide.createIcons();
      }, 1500);
    }
  }).catch(() => {
    alert("Gagal menyalin tautan. Periksa izin clipboard browser Anda.");
  });
};

/* MODAL TAMBAH & EDIT */
window.openTambahMateriModal = function() {
  document.getElementById("form-tambah-materi")?.reset();
  document.getElementById("materi-id").value = "";
  document.getElementById("modal-materi-title").innerHTML = `
    <i data-lucide="book-plus" style="width: 17px; height: 17px;"></i>
    <span>Tambah Pustaka Materi Baru</span>
  `;
  document.getElementById("btn-save-materi").textContent = "Simpan Materi";

  const modal = document.getElementById("modal-tambah-materi");
  if (modal) modal.style.display = "flex";
  if (window.lucide) lucide.createIcons();
};

window.editMateri = function(materiId) {
  const target = window.materiPmrList.find(m => m.id === materiId);
  if (!target) return;

  document.getElementById("form-tambah-materi")?.reset();
  document.getElementById("materi-id").value = target.id;
  document.getElementById("materi-judul").value = target.judul_materi || "";
  document.getElementById("materi-url").value = target.url_materi || "";
  document.getElementById("materi-deskripsi").value = target.deskripsi_singkat || "";
  document.getElementById("materi-pin").checked = Boolean(target.is_pinned);

  document.getElementById("modal-materi-title").innerHTML = `
    <i data-lucide="edit-3" style="width: 17px; height: 17px;"></i>
    <span>Edit Materi Pembelajaran</span>
  `;
  document.getElementById("btn-save-materi").textContent = "Perbarui Materi";

  const modal = document.getElementById("modal-tambah-materi");
  if (modal) modal.style.display = "flex";
  if (window.lucide) lucide.createIcons();
};

window.closeTambahMateriModal = function() {
  const modal = document.getElementById("modal-tambah-materi");
  if (modal) modal.style.display = "none";
};

window.handleTambahMateriSubmit = async function(event) {
  event.preventDefault();
  const btn = document.getElementById("btn-save-materi");
  const materiId = document.getElementById("materi-id").value;
  const isEditing = Boolean(materiId);
  const dbClient = getMateriDbClient();
  const userProfile = window.activeUserProfile || (window.parent && window.parent.activeUserProfile);

  if (!dbClient) {
    alert("Koneksi database tidak tersedia.");
    return;
  }

  btn.disabled = true;
  btn.textContent = isEditing ? "Memperbarui..." : "Menyimpan...";

  try {
    const payload = {
      judul_materi: document.getElementById("materi-judul").value.trim(),
      url_materi: document.getElementById("materi-url").value.trim(),
      deskripsi_singkat: document.getElementById("materi-deskripsi").value.trim() || null,
      is_pinned: document.getElementById("materi-pin").checked
    };

    if (isEditing) {
      const { error } = await dbClient
        .from("materi_pmr")
        .update(payload)
        .eq("id", materiId);

      if (error) throw error;
      alert("Materi berhasil diperbarui!");
    } else {
      payload.created_by = userProfile?.id || null;
      const { error } = await dbClient.from("materi_pmr").insert(payload);
      if (error) throw error;
      alert("Materi berhasil ditambahkan!");
    }

    window.closeTambahMateriModal();
    await window.loadMateriData();
  } catch (err) {
    alert("Gagal menyimpan materi: " + err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = isEditing ? "Perbarui Materi" : "Simpan Materi";
  }
};

window.togglePinMateri = async function(materiId, currentPinnedState) {
  const dbClient = getMateriDbClient();
  if (!dbClient) return;

  try {
    const { error } = await dbClient
      .from("materi_pmr")
      .update({ is_pinned: !currentPinnedState })
      .eq("id", materiId);

    if (error) throw error;
    await window.loadMateriData();
  } catch (err) {
    alert("Gagal mengubah status pin: " + err.message);
  }
};

window.hapusMateri = async function(materiId) {
  if (!confirm("Apakah Anda yakin ingin menghapus materi ini?")) return;
  const dbClient = getMateriDbClient();
  if (!dbClient) return;

  try {
    const { error } = await dbClient.from("materi_pmr").delete().eq("id", materiId);
    if (error) throw error;
    await window.loadMateriData();
  } catch (err) {
    alert("Gagal menghapus materi: " + err.message);
  }
};