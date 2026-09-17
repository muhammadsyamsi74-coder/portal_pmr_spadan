/**
 * ==============================================================================
 * CONTROLLER MODUL MATERI PMR - PORTAL PMR SPADAN
 * Pengambilan data, filter pencarian, sistem pin teratas, dan otorisasi pengurus
 * ==============================================================================
 */

window.materiPmrList = [];

window.canManageMateri = function() {
  const profile = window.activeUserProfile;
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
  if (!container || !window.db) return;

  try {
    const { data, error } = await window.db
      .from("materi_pmr")
      .select("*")
      .order("is_pinned", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) throw error;
    window.materiPmrList = data || [];
    window.renderMateriList();
  } catch (err) {
    container.innerHTML = `<div style="color:red; font-size:11px; padding:15px; text-align:center;">Gagal memuat materi: ${err.message}</div>`;
  }
};

window.renderMateriList = function() {
  const container = document.getElementById("materi-items-container");
  const searchVal = document.getElementById("filter-materi-search")?.value.toLowerCase().trim() || "";
  if (!container) return;

  let filtered = window.materiPmrList;
  if (searchVal) {
    filtered = filtered.filter(m => 
      m.judul_materi.toLowerCase().includes(searchVal) || 
      (m.deskripsi_singkat && m.deskripsi_singkat.toLowerCase().includes(searchVal))
    );
  }

  if (filtered.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; color: #94a3b8; padding: 25px 10px; font-size: 11.5px;">
        Belum ada materi pembelajaran yang tersedia.
      </div>
    `;
    return;
  }

  const canManage = window.canManageMateri();

  container.innerHTML = filtered.map(item => {
    const isPinned = Boolean(item.is_pinned);
    const pinBadge = isPinned 
      ? `<span style="font-size: 8.5px; font-weight: 800; background: #fef3c7; color: #b45309; border: 1px solid #fde68a; padding: 2px 6px; border-radius: 4px; display: inline-flex; align-items: center; gap: 3px;"><i data-lucide="pin" style="width:10px; height:10px;"></i> TERSEMAT</span>`
      : "";

    const pinActionBtn = canManage ? `
      <button onclick="window.togglePinMateri('${item.id}', ${isPinned})" title="${isPinned ? 'Lepas Sematan' : 'Sematkan ke Atas'}" style="background:none; border:none; color:${isPinned ? '#b45309' : '#94a3b8'}; cursor:pointer; padding:4px;">
        <i data-lucide="pin" style="width:14px; height:14px;"></i>
      </button>
    ` : "";

    const deleteBtn = canManage ? `
      <button onclick="window.hapusMateri('${item.id}')" title="Hapus Materi" style="background:none; border:none; color:#ef4444; cursor:pointer; padding:4px;">
        <i data-lucide="trash-2" style="width:14px; height:14px;"></i>
      </button>
    ` : "";

    return `
      <div class="agenda-item-row" style="${isPinned ? 'border-color: #fde68a; background: #fffdf5;' : ''}">
        <div style="width: 36px; height: 36px; border-radius: 8px; background: #e0f2fe; color: #0284c7; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
          <i data-lucide="file-text" style="width: 18px; height: 18px;"></i>
        </div>

        <div class="agenda-item-info">
          <div style="display:flex; align-items:center; gap:6px; flex-wrap:wrap;">
            ${pinBadge}
            <div class="title" style="font-size: 12.5px;">${item.judul_materi}</div>
          </div>
          ${item.deskripsi_singkat ? `<div style="font-size:11px; color:#64748b; margin-top:2px; line-height:1.3;">${item.deskripsi_singkat}</div>` : ""}
        </div>

        <div style="display:flex; align-items:center; gap:6px;">
          <a href="${item.url_materi}" target="_blank" rel="noopener,noreferrer" style="background: var(--maroon); color: #fff; padding: 6px 12px; border-radius: 8px; font-size: 11px; font-weight: 700; text-decoration: none; display: inline-flex; align-items: center; gap: 4px;">
            <i data-lucide="external-link" style="width: 12px; height: 12px;"></i> Buka
          </a>
          ${pinActionBtn}
          ${deleteBtn}
        </div>
      </div>
    `;
  }).join("");

  if (window.lucide) lucide.createIcons();
};

window.openTambahMateriModal = function() {
  document.getElementById("form-tambah-materi")?.reset();
  document.getElementById("modal-tambah-materi").style.display = "flex";
};

window.closeTambahMateriModal = function() {
  document.getElementById("modal-tambah-materi").style.display = "none";
};

window.handleTambahMateriSubmit = async function(event) {
  event.preventDefault();
  const btn = document.getElementById("btn-save-materi");
  btn.disabled = true;
  btn.textContent = "Menyimpan...";

  try {
    const payload = {
      judul_materi: document.getElementById("materi-judul").value.trim(),
      url_materi: document.getElementById("materi-url").value.trim(),
      deskripsi_singkat: document.getElementById("materi-deskripsi").value.trim() || null,
      is_pinned: document.getElementById("materi-pin").checked,
      created_by: window.activeUserProfile?.id || null
    };

    const { error } = await window.db.from("materi_pmr").insert(payload);
    if (error) throw error;

    alert("Materi berhasil ditambahkan!");
    window.closeTambahMateriModal();
    await window.loadMateriData();
  } catch (err) {
    alert("Gagal menambahkan materi: " + err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = "Simpan Materi";
  }
};

window.togglePinMateri = async function(materiId, currentPinnedState) {
  try {
    const { error } = await window.db
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
  try {
    const { error } = await window.db.from("materi_pmr").delete().eq("id", materiId);
    if (error) throw error;
    await window.loadMateriData();
  } catch (err) {
    alert("Gagal menghapus materi: " + err.message);
  }
};