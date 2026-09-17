/**
 * ==============================================================================
 * CONTROLLER MODUL KALENDER & AGENDA KEGIATAN - PMR SPADAN
 * Berkas mandiri terpisah untuk pengelolaan agenda dan pengumuman
 * ==============================================================================
 */

window.agendaKegiatanList = [];
window.activeAgendaKategori = "SEMUA";

window.initKalenderModule = async function() {
  const btnTambah = document.getElementById("btn-tambah-agenda");
  const monthPicker = document.getElementById("filter-agenda-bulan");

  if (monthPicker && !monthPicker.value) {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, "0");
    monthPicker.value = `${y}-${m}`;
  }

  const userRole = (window.activeUserProfile?.jabatan || "").toLowerCase();
  const ket = (window.activeUserProfile?.keterangan_jabatan || "").toLowerCase();
  const canManageAgenda = userRole === "admin" || userRole === "pengurus" || ket.includes("pembina");

  if (btnTambah) {
    btnTambah.style.display = canManageAgenda ? "inline-flex" : "none";
  }

  await window.loadAgendaData();
};

window.loadAgendaData = async function() {
  const container = document.getElementById("agenda-items-container");
  if (!container || !window.db) return;

  try {
    const { data, error } = await window.db
      .from("agenda_kegiatan")
      .select("*")
      .order("tanggal_mulai", { ascending: true });

    if (error) throw error;
    window.agendaKegiatanList = data || [];
    window.renderAgendaList();
  } catch (err) {
    container.innerHTML = `<div style="color:red; font-size:11px; padding:15px; text-align:center;">Gagal memuat agenda: ${err.message}</div>`;
  }
};

window.filterAgendaKategori = function(kat) {
  window.activeAgendaKategori = kat;
  document.querySelectorAll(".chip-filter").forEach(btn => {
    btn.classList.toggle("active", btn.textContent.trim().toUpperCase() === kat.toUpperCase());
  });
  window.renderAgendaList();
};

window.renderAgendaList = function() {
  const container = document.getElementById("agenda-items-container");
  const monthVal = document.getElementById("filter-agenda-bulan")?.value || "";
  if (!container) return;

  let filtered = window.agendaKegiatanList;

  if (window.activeAgendaKategori !== "SEMUA") {
    filtered = filtered.filter(a => a.kategori === window.activeAgendaKategori);
  }

  if (monthVal) {
    filtered = filtered.filter(a => a.tanggal_mulai && a.tanggal_mulai.startsWith(monthVal));
  }

  if (filtered.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; color: #94a3b8; padding: 25px 10px; font-size: 11.5px;">
        Tidak ada agenda kegiatan atau pengumuman pada periode ini.
      </div>
    `;
    return;
  }

  const userRole = (window.activeUserProfile?.jabatan || "").toLowerCase();
  const ket = (window.activeUserProfile?.keterangan_jabatan || "").toLowerCase();
  const canManage = userRole === "admin" || userRole === "pengurus" || ket.includes("pembina");

  const namaBulan = ["JAN", "FEB", "MAR", "APR", "MEI", "JUN", "JUL", "AGU", "SEP", "OKT", "NOV", "DES"];

  container.innerHTML = filtered.map(item => {
    const tgl = new Date(item.tanggal_mulai);
    const day = tgl.getDate();
    const month = namaBulan[tgl.getMonth()];

    let prioClass = "prio-normal";
    if (item.prioritas === "Penting") prioClass = "prio-penting";
    if (item.prioritas === "Sangat Penting") prioClass = "prio-sangat-penting";
    if (item.prioritas === "Wajib") prioClass = "prio-wajib";

    const deleteBtn = canManage
      ? `<button onclick="window.hapusAgendaKegiatan('${item.id}')" title="Hapus Agenda" style="background:none; border:none; color:#ef4444; cursor:pointer; padding:4px;"><i data-lucide="trash-2" style="width:14px; height:14px;"></i></button>`
      : "";

    const lokasiHtml = item.lokasi ? `<span><i data-lucide="map-pin" style="width:11px; height:11px;"></i>${item.lokasi}</span>` : "";
    const waktuHtml = item.waktu_kegiatan ? `<span><i data-lucide="clock" style="width:11px; height:11px;"></i>${item.waktu_kegiatan}</span>` : "";

    return `
      <div class="agenda-item-row">
        <div class="agenda-date-badge">
          <div class="day">${day}</div>
          <div class="month">${month}</div>
        </div>
        <div class="agenda-item-info">
          <div style="display:flex; align-items:center; gap:6px; flex-wrap:wrap;">
            <span class="badge-prio ${prioClass}">${item.prioritas}</span>
            <span style="font-size:9.5px; font-weight:700; color:var(--maroon); background:#fee2e2; padding:1px 6px; border-radius:4px;">${item.kategori}</span>
            <div class="title">${item.judul}</div>
          </div>
          <div class="meta" style="margin-top: 3px;">
            ${waktuHtml}
            ${lokasiHtml}
          </div>
          ${item.keterangan ? `<div style="font-size:11px; color:#475569; margin-top:4px; line-height:1.3;">${item.keterangan}</div>` : ""}
        </div>
        <div>
          ${deleteBtn}
        </div>
      </div>
    `;
  }).join("");

  if (window.lucide) lucide.createIcons();
};

window.openTambahAgendaModal = function() {
  document.getElementById("form-tambah-agenda")?.reset();
  const today = new Date().toISOString().split("T")[0];
  const tglInput = document.getElementById("agenda-tgl-mulai");
  if (tglInput) tglInput.value = today;
  document.getElementById("modal-tambah-agenda").style.display = "flex";
};

window.closeTambahAgendaModal = function() {
  document.getElementById("modal-tambah-agenda").style.display = "none";
};

window.handleTambahAgendaSubmit = async function(event) {
  event.preventDefault();
  const btn = document.getElementById("btn-save-agenda");
  btn.disabled = true;
  btn.textContent = "Menyimpan...";

  try {
    const payload = {
      judul: document.getElementById("agenda-judul").value.trim(),
      kategori: document.getElementById("agenda-kategori").value,
      prioritas: document.getElementById("agenda-prioritas").value,
      tanggal_mulai: document.getElementById("agenda-tgl-mulai").value,
      tanggal_selesai: document.getElementById("agenda-tgl-selesai").value || null,
      waktu_kegiatan: document.getElementById("agenda-waktu").value.trim() || null,
      lokasi: document.getElementById("agenda-lokasi").value.trim() || null,
      keterangan: document.getElementById("agenda-keterangan").value.trim() || null,
      tampilkan_di_dashboard: document.getElementById("agenda-tampilkan-dashboard").checked,
      created_by: window.activeUserProfile?.id || null
    };

    const { error } = await window.db.from("agenda_kegiatan").insert(payload);
    if (error) throw error;

    alert("Agenda kegiatan berhasil ditambahkan!");
    window.closeTambahAgendaModal();
    await window.loadAgendaData();
  } catch (err) {
    alert("Gagal menambahkan agenda: " + err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = "Simpan Agenda";
  }
};

window.hapusAgendaKegiatan = async function(agendaId) {
  if (!confirm("Apakah Anda yakin ingin menghapus agenda ini?")) return;
  try {
    const { error } = await window.db.from("agenda_kegiatan").delete().eq("id", agendaId);
    if (error) throw error;
    await window.loadAgendaData();
  } catch (err) {
    alert("Gagal menghapus agenda: " + err.message);
  }
};