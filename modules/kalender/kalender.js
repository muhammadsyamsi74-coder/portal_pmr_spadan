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
  
  const sanitize = window.parent.sanitizeHTML || (x => x);
  const year = window.moduleCalCurrentDate.getFullYear();
  const month = window.moduleCalCurrentDate.getMonth();
  const namaBulan = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
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
      // SANITASI JUDUL AGENDA
      const firstJudul = sanitize(eventList[0].judul || "Agenda");
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
  const sanitize = window.parent.sanitizeHTML || (x => x);

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
    
    // SANITASI SELURUH INPUT KLIEN SEBELUM DITAMPILKAN
    const amanJudul = sanitize(item.judul);
    const amanKategori = sanitize(item.kategori);
    const amanLokasi = sanitize(item.lokasi);
    const amanKeterangan = sanitize(item.keterangan);
    const amanWaktu = sanitize(item.waktu_kegiatan);
    const amanPrioritas = sanitize(item.prioritas);
    
    const deleteBtn = canManage
      ? `<button onclick="window.hapusAgendaKegiatan('${item.id}')" title="Hapus Agenda" style="background:none; border:1px solid #fee2e2; border-radius:8px; width:30px; height:30px; display:flex; align-items:center; justify-content:center; color:#ef4444; cursor:pointer; flex-shrink:0;">&times;</button>`
      : "";
    const lokasiHtml = amanLokasi ? `<span style="display:inline-flex; align-items:center; gap:4px;"><i data-lucide="map-pin" style="width:12px;height:12px;"></i>${amanLokasi}</span>` : "";
    const waktuHtml = amanWaktu ? `<span style="display:inline-flex; align-items:center; gap:4px;"><i data-lucide="clock" style="width:12px;height:12px;"></i>${amanWaktu}</span>` : "";
    
    return `
      <div class="agenda-card-item">
        <div class="agenda-badge-calendar-box">
          <div class="day-num">${day}</div>
          <div class="month-str">${month}</div>
        </div>
        <div class="agenda-info-col">
          <div class="agenda-row-badges">
            <span class="prio-pill" style="${prioClass}">${amanPrioritas || 'Normal'}</span>
            <span class="prio-pill" style="background:#ecfdf5; color:#059669; border:1px solid #a7f3d0;">${amanKategori || 'Kegiatan'}</span>
            <div class="agenda-item-title" title="${amanJudul}">${amanJudul || '-'}</div>
          </div>
          <div class="agenda-meta-details">
            ${waktuHtml}
            ${lokasiHtml}
          </div>
          ${amanKeterangan ? `<div class="agenda-desc-text">${amanKeterangan}</div>` : ""}
        </div>
        ${deleteBtn}
      </div>
    `;
  }).join("");
  if (window.lucide) lucide.createIcons();
};

window.openTambahAgendaModal = function() { /* ... */ };
window.closeTambahAgendaModal = function() { /* ... */ };
window.handleTambahAgendaSubmit = async function(event) { /* ... */ };
window.hapusAgendaKegiatan = async function(agendaId) { /* ... */ };