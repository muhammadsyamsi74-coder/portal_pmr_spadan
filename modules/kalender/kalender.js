/**
 * ==============================================================================
 * CONTROLLER MODUL KALENDER & AGENDA KEGIATAN - PMR SPADAN
 * Perbaikan Vercel & Supabase:
 * - Mengambil instance database secara berlapis (window.db / parent.db / createClient langsung)
 * - Penyesuaian kolom 'tampilkan_di_das' sesuai schema Supabase
 * - Default menampilkan seluruh agenda mendatang
 * ==============================================================================
 */

window.moduleCalCurrentDate = new Date();
window.agendaKegiatanList = [];
window.selectedModuleCalDate = null;

function getSupabaseClient() {
  if (window.db) return window.db;
  if (window.parent && window.parent.db) return window.parent.db;
  if (typeof supabase !== "undefined") {
    const url = window.SUPABASE_URL || (window.parent && window.parent.SUPABASE_URL) || "https://ndahxwqshyukqpnjkniw.supabase.co";
    const key = window.SUPABASE_ANON_KEY || (window.parent && window.parent.SUPABASE_ANON_KEY) || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5kYWh4d3FzaHl1a3Fwbmprbml3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkxNjEzODUsImV4cCI6MjEwNDczNzM4NX0.lkxXa2M16275nkjNKnWN3KE5NT7J1BVoyEO7xVAxJt8";
    window.db = supabase.createClient(url, key);
    return window.db;
  }
  return null;
}

window.initKalenderModule = async function() {
  const btnTambah = document.getElementById("btn-tambah-agenda");
  window.moduleCalCurrentDate = new Date();
  window.selectedModuleCalDate = null;

  const userProfile = window.activeUserProfile || (window.parent && window.parent.activeUserProfile);
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
  const dbClient = getSupabaseClient();

  if (!container) return;
  if (!dbClient) {
    container.innerHTML = `<div style="color:#dc2626; font-size:12px; padding:20px; text-align:center;">Koneksi basis data belum siap. Silakan muat ulang halaman.</div>`;
    return;
  }

  container.innerHTML = `<div style="text-align: center; color: #64748b; padding: 25px 10px; font-size: 12px; font-weight: 600;">Memuat jadwal agenda kegiatan...</div>`;

  try {
    const { data, error } = await dbClient
      .from("agenda_kegiatan")
      .select("*")
      .order("tanggal_mulai", { ascending: true });

    if (error) throw error;

    window.agendaKegiatanList = data || [];
    window.renderModuleVisualCalendar();
    window.resetAgendaToUpcoming();
  } catch (err) {
    console.error("Gagal load agenda:", err);
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
  if (window.lucide) lucide.createIcons();
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
  window.renderAgendaCardsIntoBox(matching, `Tidak ada kegiatan yang dijadwalkan pada tanggal ${d}/${m}/${y}.`);
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

  // Jika tidak ada agenda di masa depan, tampilkan semua agenda yang tercatat
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

  const userProfile = window.activeUserProfile || (window.parent && window.parent.activeUserProfile);
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
    if (prio === "penting") prioClass = "prio-penting";
    else if (prio === "sangat penting") prioClass = "prio-sangat-penting";
    else if (prio === "wajib") prioClass = "prio-wajib";

    const deleteBtn = canManage
      ? `<button class="btn-del-agenda" onclick="window.hapusAgendaKegiatan('${item.id}')" title="Hapus Agenda"><i data-lucide="trash-2"></i></button>`
      : "";

    const lokasiHtml = item.lokasi ? `<span><i data-lucide="map-pin"></i>${item.lokasi}</span>` : "";
    const waktuHtml = item.waktu_kegiatan ? `<span><i data-lucide="clock"></i>${item.waktu_kegiatan}</span>` : "";

    return `
      <div class="agenda-card-item">
        <div class="agenda-badge-calendar-box">
          <div class="day-num">${day}</div>
          <div class="month-str">${month}</div>
        </div>
        <div class="agenda-info-col">
          <div class="agenda-row-badges">
            <span class="prio-pill ${prioClass}">${item.prioritas || 'Normal'}</span>
            <span class="kat-pill">${item.kategori || 'Kegiatan'}</span>
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
  if (window.lucide) lucide.createIcons();
};

window.closeTambahAgendaModal = function() {
  const modal = document.getElementById("modal-tambah-agenda");
  if (modal) modal.style.display = "none";
};

window.handleTambahAgendaSubmit = async function(event) {
  event.preventDefault();
  const btn = document.getElementById("btn-save-agenda");
  const dbClient = getSupabaseClient();
  const userProfile = window.activeUserProfile || (window.parent && window.parent.activeUserProfile);

  if (!dbClient) {
    alert("Koneksi database tidak tersedia.");
    return;
  }

  btn.disabled = true;
  btn.textContent = "Menyimpan...";

  try {
    const isTampilDashboard = document.getElementById("agenda-tampilkan-dashboard").checked;

    const payload = {
      judul: document.getElementById("agenda-judul").value.trim(),
      kategori: document.getElementById("agenda-kategori").value,
      prioritas: document.getElementById("agenda-prioritas").value,
      tanggal_mulai: document.getElementById("agenda-tgl-mulai").value,
      tanggal_selesai: document.getElementById("agenda-tgl-selesai").value || null,
      waktu_kegiatan: document.getElementById("agenda-waktu").value.trim() || null,
      lokasi: document.getElementById("agenda-lokasi").value.trim() || null,
      keterangan: document.getElementById("agenda-keterangan").value.trim() || null,
      tampilkan_di_das: isTampilDashboard,
      created_by: userProfile?.id || null
    };

    const { error } = await dbClient.from("agenda_kegiatan").insert(payload);
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
  const dbClient = getSupabaseClient();
  if (!dbClient) return;

  try {
    const { error } = await dbClient.from("agenda_kegiatan").delete().eq("id", agendaId);
    if (error) throw error;
    await window.loadAgendaData();
  } catch (err) {
    alert("Gagal menghapus agenda: " + err.message);
  }
};