/**
 * ==============================================================================
 * [CONTROLLER] MODUL KALENDER & AGENDA KEGIATAN - PMR SPADAN
 * ==============================================================================
 */

window.moduleCalCurrentDate = new Date();
window.agendaKegiatanList = [];
window.selectedModuleCalDate = null;

window.initKalenderModule = async function() {
  const btnTambah = document.getElementById("btn-tambah-agenda");
  window.moduleCalCurrentDate = new Date();
  window.selectedModuleCalDate = null;

  // Gunakan data profil utama yang sudah di-load di app.js
  const userProfile = window.activeUserProfile;
  const userRole = (userProfile?.jabatan || "").toLowerCase();
  const ket = (userProfile?.keterangan_jabatan || "").toLowerCase();
  const canManageAgenda = userRole === "admin" || userRole === "pengurus" || ket.includes("pembina");

  if (btnTambah) {
    btnTambah.style.display = canManageAgenda ? "inline-flex" : "none";
  }

  await window.loadAgendaData();
};

window.loadAgendaData = async function() {
  const container = document.getElementById("agenda-items-container");
  if (!container) return;

  // Gunakan langsung window.db yang terjamin ada karena modul bersifat Inline HTML
  if (!window.db) {
    container.innerHTML = `<div style="color:#dc2626; font-size:12px; padding:20px; text-align:center;">Koneksi basis data belum siap. Silakan muat ulang halaman.</div>`;
    return;
  }

  container.innerHTML = `<div style="text-align: center; color: #64748b; padding: 25px 10px; font-size: 12px; font-weight: 600;">Memuat jadwal agenda kegiatan...</div>`;

  try {
    const { data, error } = await window.db
      .from("agenda_kegiatan")
      .select("*")
      .order("tanggal_mulai", { ascending: true });

    if (error) throw error;

    window.agendaKegiatanList = data || [];
    window.renderModuleVisualCalendar();
    window.resetAgendaToUpcoming();
  } catch (err) {
    console.error("[Kalender] Gagal load agenda:", err);
    container.innerHTML = `<div style="color:#dc2626; font-size:12px; padding:20px; text-align:center;">Gagal memuat agenda: ${err.message}</div>`;
  }
};

window.changeModuleCalMonth = function(delta) {
  window.moduleCalCurrentDate.setMonth(window.moduleCalCurrentDate.getMonth() + delta);
  window.renderModuleVisualCalendar();
};

window.renderModuleVisualCalendar = function() {
  const monthTitle = document.getElementById("cal-module-month-year");
  const gridBox = document.getElementById("cal-module-days-box");
  if (!monthTitle || !gridBox) return;

  const year = window.moduleCalCurrentDate.getFullYear();
  const month = window.moduleCalCurrentDate.getMonth();

  const namaBulan = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
  ];
  monthTitle.textContent = `${namaBulan[month]} ${year}`;

  const firstDayIndex = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();

  const eventsByDay = {};
  window.agendaKegiatanList.forEach(ag => {
    if (ag.tanggal_mulai) {
      const [tY, tM, tD] = ag.tanggal_mulai.split("-").map(Number);
      if (tY === year && (tM - 1) === month) {
        if (!eventsByDay[tD]) eventsByDay[tD] = [];
        eventsByDay[tD].push(ag);
      }
    }
  });

  let html = "";
  for (let i = 0; i < firstDayIndex; i++) {
    html += `<div class="cal-cell empty"></div>`;
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const dayOfWeek = (firstDayIndex + d - 1) % 7;
    const isSunday = dayOfWeek === 0;
    const isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === d;
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const isSelected = window.selectedModuleCalDate === dateStr;

    const eventList = eventsByDay[d] || [];
    let eventTagHtml = "";
    if (eventList.length > 0) {
      const firstJudul = eventList[0].judul || "Agenda";
      const extraCount = eventList.length > 1 ? ` (+${eventList.length - 1})` : "";
      eventTagHtml = `<div class="cal-tag-event" title="${firstJudul}">${firstJudul}${extraCount}</div>`;
    }

    html += `
      <div class="cal-cell ${isToday ? 'today' : ''} ${isSunday ? 'is-sun' : ''} ${isSelected ? 'selected' : ''}" onclick="window.selectModuleCalDate('${dateStr}', this)">
        <span>${d}</span>
        ${eventTagHtml}
      </div>
    `;
  }

  gridBox.innerHTML = html;
};

window.selectModuleCalDate = function(dateStr, cellEl) {
  document.querySelectorAll(".cal-cell").forEach(c => c.classList.remove("selected"));
  if (cellEl) cellEl.classList.add("selected");
  window.selectedModuleCalDate = dateStr;

  const [y, m, d] = dateStr.split("-");
  const headingEl = document.getElementById("agenda-view-heading");
  const resetBtn = document.getElementById("btn-reset-agenda-view");

  if (headingEl) headingEl.textContent = `Agenda Tanggal: ${d}/${m}/${y}`;
  if (resetBtn) resetBtn.style.display = "inline-block";

  const matching = window.agendaKegiatanList.filter(a => a.tanggal_mulai === dateStr);
  window.renderAgendaCardsIntoBox(matching, `Tidak ada kegiatan pada tanggal ${d}/${m}/${y}.`);
};

window.resetAgendaToUpcoming = function() {
  window.selectedModuleCalDate = null;
  document.querySelectorAll(".cal-cell").forEach(c => c.classList.remove("selected"));

  const headingEl = document.getElementById("agenda-view-heading");
  const resetBtn = document.getElementById("btn-reset-agenda-view");

  if (headingEl) headingEl.textContent = "Agenda yang Akan Dihadapi";
  if (resetBtn) resetBtn.style.display = "none";

  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  const upcomingAgendas = window.agendaKegiatanList.filter(item => {
    if (!item.tanggal_mulai) return false;
    const endRef = item.tanggal_selesai || item.tanggal_mulai;
    return endRef >= todayStr;
  });

  const displayItems = upcomingAgendas.length > 0 ? upcomingAgendas : window.agendaKegiatanList;
  window.renderAgendaCardsIntoBox(displayItems, "Belum ada agenda kegiatan yang tercatat.");
};

window.renderAgendaCardsIntoBox = function(items, emptyMsg) {
  const container = document.getElementById("agenda-items-container");
  if (!container) return;

  if (items.length === 0) {
    container.innerHTML = `<div style="text-align: center; color: #94a3b8; padding: 35px 10px; font-size: 12px; font-weight: 600;">${emptyMsg}</div>`;
    return;
  }

  const userProfile = window.activeUserProfile;
  const userRole = (userProfile?.jabatan || "").toLowerCase();
  const ket = (userProfile?.keterangan_jabatan || "").toLowerCase();
  const canManage = userRole === "admin" || userRole === "pengurus" || ket.includes("pembina");

  const namaBulanSingkat = ["JAN", "FEB", "MAR", "APR", "MEI", "JUN", "JUL", "AGU", "SEP", "OKT", "NOV", "DES"];

  container.innerHTML = items.map(item => {
    let day = "-";
    let month = "-";
    if (item.tanggal_mulai) {
      const parts = item.tanggal_mulai.split("-");
      if (parts.length === 3) {
        day = parseInt(parts[2], 10);
        month = namaBulanSingkat[parseInt(parts[1], 10) - 1] || "-";
      }
    }

    let prioClass = "prio-normal";
    const prio = (item.prioritas || "Normal").toLowerCase();
    if (prio === "penting") prioClass = "background:#fef3c7; color:#b45309; border:1px solid #fde68a;";
    else if (prio === "sangat penting") prioClass = "background:#fee2e2; color:#b91c1c; border:1px solid #fecaca;";
    else if (prio === "wajib") prioClass = "background:#991b1b; color:#ffffff;";
    else prioClass = "background:#f1f5f9; color:#475569; border:1px solid #cbd5e1;";

    const deleteBtn = canManage
      ? `<button onclick="window.hapusAgendaKegiatan('${item.id}')" title="Hapus Agenda" style="background:none; border:1px solid #fee2e2; border-radius:8px; width:30px; height:30px; display:flex; align-items:center; justify-content:center; color:#ef4444; cursor:pointer; flex-shrink:0;">&times;</button>`
      : "";

    const lokasiHtml = item.lokasi ? `<span style="display:inline-flex; align-items:center; gap:4px;"><i data-lucide="map-pin" style="width:12px;height:12px;"></i>${item.lokasi}</span>` : "";
    const waktuHtml = item.waktu_kegiatan ? `<span style="display:inline-flex; align-items:center; gap:4px;"><i data-lucide="clock" style="width:12px;height:12px;"></i>${item.waktu_kegiatan}</span>` : "";

    return `
      <div class="agenda-card-item">
        <div class="agenda-badge-calendar-box">
          <div class="day-num">${day}</div>
          <div class="month-str">${month}</div>
        </div>
        <div class="agenda-info-col">
          <div class="agenda-row-badges">
            <span class="prio-pill" style="${prioClass}">${item.prioritas || 'Normal'}</span>
            <span class="prio-pill" style="background:#ecfdf5; color:#059669; border:1px solid #a7f3d0;">${item.kategori || 'Kegiatan'}</span>
            <div class="agenda-item-title" title="${item.judul}">${item.judul || '-'}</div>
          </div>
          <div class="agenda-meta-details">
            ${waktuHtml}
            ${lokasiHtml}
          </div>
          ${item.keterangan ? `<div class="agenda-desc-text">${item.keterangan}</div>` : ""}
        </div>
        ${deleteBtn}
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

  const modal = document.getElementById("modal-tambah-agenda");
  if (modal) modal.style.display = "flex";
};

window.closeTambahAgendaModal = function() {
  const modal = document.getElementById("modal-tambah-agenda");
  if (modal) modal.style.display = "none";
};

window.handleTambahAgendaSubmit = async function(event) {
  event.preventDefault();
  const btn = document.getElementById("btn-save-agenda");
  
  if (!window.db) {
    alert("Koneksi database tidak tersedia.");
    return;
  }

  const userProfile = window.activeUserProfile;
  btn.disabled = true;
  btn.textContent = "Menyimpan...";

  try {
    const isTampilDashboard = document.getElementById("agenda-tampilkan-dashboard").checked;

    // Pastikan nama kolom 'tampilkan_di_dashboard' sama persis dengan yang ada di Supabase.
    const payload = {
      judul: document.getElementById("agenda-judul").value.trim(),
      kategori: document.getElementById("agenda-kategori").value,
      prioritas: document.getElementById("agenda-prioritas").value,
      tanggal_mulai: document.getElementById("agenda-tgl-mulai").value,
      tanggal_selesai: document.getElementById("agenda-tgl-selesai").value || null,
      waktu_kegiatan: document.getElementById("agenda-waktu").value.trim() || null,
      lokasi: document.getElementById("agenda-lokasi").value.trim() || null,
      keterangan: document.getElementById("agenda-keterangan").value.trim() || null,
      tampilkan_di_dashboard: isTampilDashboard,
      created_by: userProfile?.id || null
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
  if (!window.db) return;

  try {
    const { error } = await window.db.from("agenda_kegiatan").delete().eq("id", agendaId);
    if (error) throw error;
    await window.loadAgendaData();
  } catch (err) {
    alert("Gagal menghapus agenda: " + err.message);
  }
};