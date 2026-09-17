/**
 * ==============================================================================
 * LOGIKA MODUL PRESENSI - PORTAL PMR SPADAN
 * Diperbarui:
 * - Struktur Presensi 1 Baris Sejajar
 * - Filter Riwayat 2 Baris + Limit 12 kartu
 * - Statistik Bersebelahan (H: 0  I: 0  S: 0  A: 0)
 * - Pratinjau foto tersimpan saat edit & hapus otomatis dari storage
 * ==============================================================================
 */

window.presensiAnggotaOptions = [];
window.allPresensiSessions = [];
window.filteredPresensiSessions = [];
window.historyDisplayLimit = 12;
window.currentPhotos = [];
window.photosPendingDelete = [];

window.initPresensiMenu = async function() {
  const formCard = document.getElementById("card-form-presensi");
  const historySec = document.getElementById("section-history-presensi");
  const guestMsg = document.getElementById("guest-presensi-message");

  if (!window.activeUserProfile) {
    if (formCard) formCard.style.display = "none";
    if (historySec) historySec.style.display = "none";
    if (guestMsg) guestMsg.style.display = "block";
    if (window.lucide) lucide.createIcons();
    return;
  }

  if (guestMsg) guestMsg.style.display = "none";
  if (historySec) historySec.style.display = "flex";

  const role = (window.activeUserProfile.jabatan || "").toLowerCase();
  const ketJabatan = (window.activeUserProfile.keterangan_jabatan || "").toLowerCase();
  const canManagePresensi = (role === "admin" || role === "pengurus") && ketJabatan !== "alumni" && ketJabatan !== "non-aktif";

  if (formCard) {
    formCard.style.display = canManagePresensi ? "flex" : "none";
  }

  const tglInput = document.getElementById("presensi-tanggal");
  if (tglInput && !tglInput.value) {
    tglInput.value = new Date().toISOString().split("T")[0];
  }

  window.currentPhotos = [];
  window.photosPendingDelete = [];
  window.renderPhotoPreviews();

  if (canManagePresensi) {
    await window.loadPresensiMembers();
  }

  await window.fetchPresensiHistory();
};

window.compressImage = function(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const maxWidth = 1280;
        const maxHeight = 1280;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            resolve({ blob: blob, dataUrl: canvas.toDataURL("image/jpeg", 0.75) });
          },
          "image/jpeg",
          0.75
        );
      };
    };
  });
};

window.handlePhotoSelection = async function(event) {
  const files = Array.from(event.target.files);
  if (!files.length) return;

  const availableSlots = 4 - window.currentPhotos.length;
  if (availableSlots <= 0) {
    alert("Batas maksimal adalah 4 foto dokumentasi.");
    event.target.value = "";
    return;
  }

  const selectedFiles = files.slice(0, availableSlots);
  for (const file of selectedFiles) {
    const compressed = await window.compressImage(file);
    window.currentPhotos.push({
      type: "new",
      blob: compressed.blob,
      dataUrl: compressed.dataUrl
    });
  }

  if (files.length > availableSlots) {
    alert(`Hanya ${availableSlots} foto yang ditambahkan karena batas maksimal 4 foto.`);
  }

  event.target.value = "";
  window.renderPhotoPreviews();
};

function getStorageFileName(url) {
  try {
    const marker = `/dokumentasi_kegiatan/`;
    const idx = url.indexOf(marker);
    if (idx !== -1) {
      return decodeURIComponent(url.substring(idx + marker.length).split("?")[0]);
    }
    const parts = url.split("/");
    return decodeURIComponent(parts[parts.length - 1].split("?")[0]);
  } catch (e) {
    return null;
  }
}

window.removePhoto = function(index) {
  const removed = window.currentPhotos.splice(index, 1)[0];
  if (removed && removed.type === "existing" && removed.url) {
    window.photosPendingDelete.push(removed.url);
  }
  window.renderPhotoPreviews();
};

window.renderPhotoPreviews = function() {
  const container = document.getElementById("photo-preview-container");
  if (!container) return;

  if (window.currentPhotos.length === 0) {
    container.innerHTML = `<span style="font-size: 11px; color: #aaa; grid-column: 1 / -1;">Belum ada foto dipilih.</span>`;
    return;
  }

  container.innerHTML = window.currentPhotos.map((item, idx) => `
    <div class="preview-slot">
      <img src="${item.dataUrl || item.url}" alt="Preview ${idx + 1}" />
      <button type="button" class="btn-remove-photo" title="Hapus foto ini" onclick="window.removePhoto(${idx})">&times;</button>
    </div>
  `).join("");
};

window.loadPresensiMembers = async function() {
  const memberListEl = document.getElementById("presensi-member-list");
  if (!memberListEl || !window.db) return;

  try {
    const { data, error } = await window.db
      .from("users_profile")
      .select("id, nama_lengkap, nama_panggilan, kelas, keterangan_jabatan, jabatan");

    if (error) throw error;

    const filteredMembers = (data || []).filter((u) => {
      const role = (u.jabatan || "").toLowerCase();
      const ket = (u.keterangan_jabatan || "").toLowerCase();

      const isValidRole = role === "pengurus" || role === "anggota";
      const isNotExcluded = ket !== "alumni" && ket !== "non-aktif";

      return isValidRole && isNotExcluded;
    });

    filteredMembers.sort((a, b) => {
      const namaA = (a.nama_lengkap || "").trim();
      const namaB = (b.nama_lengkap || "").trim();
      return namaA.localeCompare(namaB, "id", { sensitivity: "base" });
    });

    window.presensiAnggotaOptions = filteredMembers;

    if (window.presensiAnggotaOptions.length === 0) {
      memberListEl.innerHTML = `<div style="text-align: center; color: #888; padding: 20px;">Belum ada anggota atau pengurus aktif yang terdaftar.</div>`;
      return;
    }

    window.renderMemberListHTML();
  } catch (err) {
    console.error("Gagal memuat anggota:", err.message);
    memberListEl.innerHTML = `<div style="color: #c62828; text-align: center; padding: 15px;">Gagal memuat anggota: ${err.message}</div>`;
  }
};

window.renderMemberListHTML = function(existingStatusMap = {}) {
  const memberListEl = document.getElementById("presensi-member-list");
  if (!memberListEl) return;

  memberListEl.innerHTML = window.presensiAnggotaOptions.map((user, index) => {
    const currentStatus = existingStatusMap[user.id] || "Hadir";

    return `
      <div class="member-item">
        <div class="member-left">
          <div class="member-number">${index + 1}.</div>
          <div class="member-meta">
            <div class="nama" title="${user.nama_lengkap}">${user.nama_lengkap}</div>
            <div class="subtext">Kls: ${user.kelas || "-"} • ${user.keterangan_jabatan}</div>
          </div>
        </div>
        <div class="status-options">
          <label class="opt-hadir" title="Hadir">
            <input type="radio" name="status_${user.id}" value="Hadir" ${currentStatus === "Hadir" ? "checked" : ""} />
            <span class="radio-box">H</span>
          </label>
          <label class="opt-izin" title="Izin">
            <input type="radio" name="status_${user.id}" value="Izin" ${currentStatus === "Izin" ? "checked" : ""} />
            <span class="radio-box">I</span>
          </label>
          <label class="opt-sakit" title="Sakit">
            <input type="radio" name="status_${user.id}" value="Sakit" ${currentStatus === "Sakit" ? "checked" : ""} />
            <span class="radio-box">S</span>
          </label>
          <label class="opt-alpa" title="Alpa">
            <input type="radio" name="status_${user.id}" value="Alpa" ${currentStatus === "Alpa" ? "checked" : ""} />
            <span class="radio-box">A</span>
          </label>
          <label class="opt-td" title="Tidak Ditugaskan">
            <input type="radio" name="status_${user.id}" value="Tidak Ditugaskan" ${currentStatus === "Tidak Ditugaskan" ? "checked" : ""} />
            <span class="radio-box">-</span>
          </label>
        </div>
      </div>
    `;
  }).join("");
};

window.submitPresensiData = async function(event) {
  event.preventDefault();

  if (window.presensiAnggotaOptions.length === 0) {
    alert("Daftar anggota kehadiran belum tersedia.");
    return;
  }

  const submitBtn = document.getElementById("btn-submit-presensi");
  const editSessionId = document.getElementById("edit-session-id").value;
  const isEditMode = Boolean(editSessionId);

  submitBtn.disabled = true;
  submitBtn.innerHTML = isEditMode ? "Memperbarui..." : "Menyimpan...";

  const namaKegiatan = document.getElementById("presensi-nama").value.trim();
  const jenisKegiatan = document.getElementById("presensi-jenis").value;
  const tanggalKegiatan = document.getElementById("presensi-tanggal").value;
  const tempatKegiatan = document.getElementById("presensi-tempat").value.trim();
  const deskripsiKegiatan = document.getElementById("presensi-deskripsi").value.trim() || null;

  try {
    if (window.photosPendingDelete.length > 0) {
      const delFiles = window.photosPendingDelete.map(getStorageFileName).filter(Boolean);
      if (delFiles.length > 0) {
        await window.db.storage.from("dokumentasi_kegiatan").remove(delFiles);
      }
      window.photosPendingDelete = [];
    }

    const uploadedUrls = [];
    for (const item of window.currentPhotos) {
      if (item.type === "existing") {
        uploadedUrls.push(item.url);
      } else if (item.type === "new" && item.blob) {
        const fileName = `kegiatan_${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
        const { error: uploadErr } = await window.db.storage
          .from("dokumentasi_kegiatan")
          .upload(fileName, item.blob, { contentType: "image/jpeg", upsert: true });

        if (uploadErr) throw uploadErr;

        const { data: publicUrlData } = window.db.storage
          .from("dokumentasi_kegiatan")
          .getPublicUrl(fileName);
        uploadedUrls.push(publicUrlData.publicUrl);
      }
    }

    const fotoPayloadString = uploadedUrls.length > 0 ? JSON.stringify(uploadedUrls) : null;
    const sessionId = isEditMode ? editSessionId : crypto.randomUUID();

    if (isEditMode) {
      const { error: delErr } = await window.db.from("presensi").delete().eq("sesi_id", sessionId);
      if (delErr) throw delErr;
    }

    const payloadPresensi = window.presensiAnggotaOptions.map((user) => {
      const checkedRadio = document.querySelector(`input[name="status_${user.id}"]:checked`);
      const status = checkedRadio ? checkedRadio.value : "Hadir";

      return {
        sesi_id: sessionId,
        user_id: user.id,
        nama_kegiatan: namaKegiatan,
        jenis_kegiatan: jenisKegiatan,
        tempat_kegiatan: tempatKegiatan,
        deskripsi_kegiatan: deskripsiKegiatan,
        foto_dokumentasi_url: fotoPayloadString,
        status_kehadiran: status,
        tanggal_kegiatan: tanggalKegiatan
      };
    });

    const { error: insertErr } = await window.db.from("presensi").insert(payloadPresensi);
    if (insertErr) throw insertErr;

    alert(isEditMode ? "Presensi kegiatan berhasil diperbarui!" : "Presensi kegiatan berhasil disimpan!");
    window.cancelEditPresensi();
    await window.fetchPresensiHistory();
  } catch (err) {
    console.error("Gagal simpan presensi:", err);
    alert(`Terjadi kesalahan: ${err.message}`);
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = `<i data-lucide="check-circle-2" style="width: 16px; height: 16px;"></i><span>${document.getElementById("btn-submit-text").textContent}</span>`;
    if (window.lucide) lucide.createIcons();
  }
};

window.editPresensiSession = async function(sessionId) {
  const records = window.allPresensiSessions.find((s) => s.sesi_id === sessionId)?.records || [];
  if (records.length === 0) return;

  const sesi = records[0];

  document.getElementById("edit-session-id").value = sesi.sesi_id;
  document.getElementById("presensi-nama").value = sesi.nama_kegiatan || "";
  document.getElementById("presensi-jenis").value = sesi.jenis_kegiatan || "Latihan Rutin";
  document.getElementById("presensi-tanggal").value = sesi.tanggal_kegiatan || "";
  document.getElementById("presensi-tempat").value = sesi.tempat_kegiatan || "";
  document.getElementById("presensi-deskripsi").value = sesi.deskripsi_kegiatan || "";

  window.currentPhotos = [];
  window.photosPendingDelete = [];

  if (sesi.foto_dokumentasi_url) {
    try {
      const parsed = JSON.parse(sesi.foto_dokumentasi_url);
      if (Array.isArray(parsed)) {
        parsed.forEach((url) => { window.currentPhotos.push({ type: "existing", url: url, dataUrl: url }); });
      } else if (typeof parsed === "string") {
        window.currentPhotos.push({ type: "existing", url: parsed, dataUrl: parsed });
      }
    } catch {
      window.currentPhotos.push({ type: "existing", url: sesi.foto_dokumentasi_url, dataUrl: sesi.foto_dokumentasi_url });
    }
  }
  window.renderPhotoPreviews();

  if (window.presensiAnggotaOptions.length === 0) {
    await window.loadPresensiMembers();
  }

  const statusMap = {};
  records.forEach((r) => { statusMap[r.user_id] = r.status_kehadiran; });
  window.renderMemberListHTML(statusMap);

  document.getElementById("presensi-form-title").textContent = "Edit Presensi Kegiatan";
  document.getElementById("presensi-form-desc").textContent = "Perbarui rincian kegiatan, foto dokumentasi, atau status kehadiran.";
  document.getElementById("badge-edit-mode").style.display = "inline-block";
  document.getElementById("btn-cancel-edit").style.display = "inline-block";
  document.getElementById("btn-submit-text").textContent = "Perbarui Presensi";

  document.getElementById("card-form-presensi")?.scrollIntoView({ behavior: "smooth" });
  if (window.lucide) lucide.createIcons();
};

window.cancelEditPresensi = function() {
  document.getElementById("form-presensi").reset();
  document.getElementById("edit-session-id").value = "";
  document.getElementById("presensi-tanggal").value = new Date().toISOString().split("T")[0];

  window.currentPhotos = [];
  window.photosPendingDelete = [];
  window.renderPhotoPreviews();
  window.renderMemberListHTML();

  document.getElementById("presensi-form-title").textContent = "Formulir Presensi Kegiatan";
  document.getElementById("presensi-form-desc").textContent = "Isi rincian agenda dan tentukan status kehadiran anggota PMR.";
  document.getElementById("badge-edit-mode").style.display = "none";
  document.getElementById("btn-cancel-edit").style.display = "none";
  document.getElementById("btn-submit-text").textContent = "Simpan Presensi";
  if (window.lucide) lucide.createIcons();
};

/* --------------------------------------------------------------------------
   LOGIKA FILTER & PAGINATION RIWAYAT
-------------------------------------------------------------------------- */
window.fetchPresensiHistory = async function() {
  const container = document.getElementById("sesi-list-container");
  if (!container || !window.db) return;

  try {
    const { data, error } = await window.db
      .from("presensi")
      .select(`*, users_profile:user_id ( id, nama_lengkap, nama_panggilan, kelas )`)
      .order("tanggal_kegiatan", { ascending: false });

    if (error) throw error;
    
    const sessionMap = {};
    (data || []).forEach((row) => {
      if (!sessionMap[row.sesi_id]) {
        sessionMap[row.sesi_id] = {
          sesi_id: row.sesi_id,
          nama_kegiatan: row.nama_kegiatan,
          jenis_kegiatan: row.jenis_kegiatan,
          tempat_kegiatan: row.tempat_kegiatan,
          tanggal_kegiatan: row.tanggal_kegiatan,
          deskripsi_kegiatan: row.deskripsi_kegiatan,
          foto_dokumentasi_url: row.foto_dokumentasi_url,
          hadir: 0, izin: 0, sakit: 0, alpa: 0, td: 0,
          records: []
        };
      }
      const st = (row.status_kehadiran || "");
      if (st === "Hadir") sessionMap[row.sesi_id].hadir++;
      else if (st === "Izin") sessionMap[row.sesi_id].izin++;
      else if (st === "Sakit") sessionMap[row.sesi_id].sakit++;
      else if (st === "Alpa") sessionMap[row.sesi_id].alpa++;
      else if (st === "Tidak Ditugaskan") sessionMap[row.sesi_id].td++;
      
      sessionMap[row.sesi_id].records.push(row);
    });

    window.allPresensiSessions = Object.values(sessionMap).sort((a,b) => new Date(b.tanggal_kegiatan) - new Date(a.tanggal_kegiatan));
    window.handleHistoryFilter();
  } catch (err) {
    console.error("Gagal mengambil riwayat:", err.message);
    container.innerHTML = `<div style="grid-column: 1 / -1; text-align: center; color: #c62828; padding: 20px;">Gagal memuat: ${err.message}</div>`;
  }
};

window.handleHistoryFilter = function() {
  const tglMulai = document.getElementById("filter-tgl-mulai")?.value;
  const tglAkhir = document.getElementById("filter-tgl-akhir")?.value;
  const jenis = document.getElementById("filter-jenis-history")?.value;

  let filtered = window.allPresensiSessions || [];

  if (jenis) {
    filtered = filtered.filter(s => s.jenis_kegiatan === jenis);
  }
  if (tglMulai) {
    filtered = filtered.filter(s => s.tanggal_kegiatan >= tglMulai);
  }
  if (tglAkhir) {
    filtered = filtered.filter(s => s.tanggal_kegiatan <= tglAkhir);
  }

  window.filteredPresensiSessions = filtered;
  window.historyDisplayLimit = 12;
  window.renderPresensiSessions();
};

window.resetHistoryFilter = function() {
  document.getElementById("filter-tgl-mulai").value = "";
  document.getElementById("filter-tgl-akhir").value = "";
  document.getElementById("filter-jenis-history").value = "";
  window.handleHistoryFilter();
};

window.loadMoreHistory = function() {
  window.historyDisplayLimit += 12;
  window.renderPresensiSessions();
};

window.renderPresensiSessions = function() {
  const container = document.getElementById("sesi-list-container");
  if (!container) return;

  const filtered = window.filteredPresensiSessions || [];

  if (filtered.length === 0) {
    container.innerHTML = `<div style="grid-column: 1 / -1; text-align: center; color: #888; padding: 30px;">Tidak ada riwayat presensi yang sesuai filter.</div>`;
    return;
  }

  const userRole = window.activeUserProfile ? (window.activeUserProfile.jabatan || "").toLowerCase() : "guest";
  const userKet = window.activeUserProfile ? (window.activeUserProfile.keterangan_jabatan || "").toLowerCase() : "";
  const canManage = (userRole === "admin" || userRole === "pengurus") && userKet !== "alumni" && userKet !== "non-aktif";

  const displayed = filtered.slice(0, window.historyDisplayLimit);

  const html = displayed.map((sesi) => `
    <div class="sesi-card">
      <div class="sesi-card-header">
        <div class="sesi-title">${sesi.nama_kegiatan}</div>
        <span class="sesi-badge">${sesi.jenis_kegiatan}</span>
      </div>

      <div class="sesi-meta-row">
        <div class="sesi-meta-item">
          <i data-lucide="calendar"></i>
          <span>${window.formatTanggalIndo(sesi.tanggal_kegiatan)}</span>
        </div>
        <div class="sesi-meta-item">
          <i data-lucide="map-pin"></i>
          <span>${sesi.tempat_kegiatan}</span>
        </div>
      </div>

      <div class="sesi-stats-inline">
        <div class="stat-badge stat-hadir"><small>H:</small> ${sesi.hadir}</div>
        <div class="stat-badge stat-izin"><small>I:</small> ${sesi.izin}</div>
        <div class="stat-badge stat-sakit"><small>S:</small> ${sesi.sakit}</div>
        <div class="stat-badge stat-alpa"><small>A:</small> ${sesi.alpa}</div>
      </div>

      <div class="sesi-actions">
        <button class="btn-sm-action btn-detail" onclick="window.openDetailPresensiModal('${sesi.sesi_id}')">
          <i data-lucide="eye" style="width: 11px; height: 11px;"></i> Detail
        </button>
        ${
          canManage
            ? `<button class="btn-sm-action btn-edit" onclick="window.editPresensiSession('${sesi.sesi_id}')">
                 <i data-lucide="edit-2" style="width: 11px; height: 11px;"></i> Edit
               </button>`
            : ""
        }
        ${
          userRole === "admin"
            ? `<button class="btn-sm-action btn-hapus" onclick="window.deletePresensiSession('${sesi.sesi_id}')">
                 <i data-lucide="trash-2" style="width: 11px; height: 11px;"></i> Hapus
               </button>`
            : ""
        }
      </div>
    </div>
  `).join("");

  let loadMoreBtnHtml = "";
  if (filtered.length > window.historyDisplayLimit) {
    loadMoreBtnHtml = `
      <button class="btn-load-more" onclick="window.loadMoreHistory()">
        Tampilkan Lebih Banyak (${filtered.length - window.historyDisplayLimit} sesi tersisa)
      </button>`;
  }

  container.innerHTML = html + loadMoreBtnHtml;
  if (window.lucide) lucide.createIcons();
};

window.openDetailPresensiModal = function(sessionId) {
  const records = window.allPresensiSessions.find((s) => s.sesi_id === sessionId)?.records || [];
  if (records.length === 0) return;

  const sesi = records[0];
  const modal = document.getElementById("modal-detail-presensi");
  const title = document.getElementById("detail-modal-title");
  const body = document.getElementById("detail-modal-body");

  title.textContent = `Detail: ${sesi.nama_kegiatan}`;

  let photos = [];
  if (sesi.foto_dokumentasi_url) {
    try {
      const parsed = JSON.parse(sesi.foto_dokumentasi_url);
      photos = Array.isArray(parsed) ? parsed : [sesi.foto_dokumentasi_url];
    } catch {
      photos = [sesi.foto_dokumentasi_url];
    }
  }

  const photosHtml = photos.length > 0
    ? `
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 8px; margin: 10px 0;">
        ${photos.map(url => `
          <a href="${url}" target="_blank" style="display: block; border-radius: 6px; overflow: hidden; border: 1px solid #ddd; aspect-ratio: 4/3;">
            <img src="${url}" alt="Dokumentasi" style="width: 100%; height: 100%; object-fit: cover;" />
          </a>
        `).join("")}
      </div>
    `
    : "";

  records.sort((a, b) => {
    const namaA = a.users_profile ? (a.users_profile.nama_lengkap || "").trim() : "";
    const namaB = b.users_profile ? (b.users_profile.nama_lengkap || "").trim() : "";
    return namaA.localeCompare(namaB, "id", { sensitivity: "base" });
  });

  const rowsHtml = records.map((r, i) => {
    const nama = r.users_profile ? r.users_profile.nama_lengkap : "Nama Tidak Ditemukan";
    const kelas = r.users_profile ? r.users_profile.kelas : "-";

    let colorStyle = "color: #16a34a;";
    if (r.status_kehadiran === "Izin") colorStyle = "color: #0288d1;";
    else if (r.status_kehadiran === "Sakit") colorStyle = "color: #f59e0b;";
    else if (r.status_kehadiran === "Alpa") colorStyle = "color: #dc2626;";
    else if (r.status_kehadiran === "Tidak Ditugaskan") colorStyle = "color: #64748b;";

    return `
      <div style="display: flex; justify-content: space-between; padding: 8px 10px; border-bottom: 1px solid #eee; font-size: 13px;">
        <div style="display: flex; gap: 8px;">
          <div style="color:#64748b; font-weight:700;">${i+1}.</div>
          <div>
            <strong>${nama}</strong>
            <div style="font-size: 11px; color: #777;">Kelas: ${kelas}</div>
          </div>
        </div>
        <span style="font-weight: 700; ${colorStyle}">${r.status_kehadiran}</span>
      </div>
    `;
  }).join("");

  body.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 10px;">
      <div style="font-size: 12px; color: #444; background: #fdfdfd; padding: 10px; border-radius: 6px; border: 1px solid #eee;">
        <p><strong>Jenis Kegiatan:</strong> ${sesi.jenis_kegiatan}</p>
        <p><strong>Tanggal:</strong> ${window.formatTanggalIndo(sesi.tanggal_kegiatan)}</p>
        <p><strong>Tempat:</strong> ${sesi.tempat_kegiatan}</p>
        ${sesi.deskripsi_kegiatan ? `<p><strong>Deskripsi:</strong> ${sesi.deskripsi_kegiatan}</p>` : ""}
      </div>

      ${photosHtml}

      <div>
        <h4 style="font-size: 13px; margin-bottom: 6px; color: #333;">Daftar Hadir Anggota:</h4>
        <div style="max-height: 220px; overflow-y: auto; border: 1px solid #eee; border-radius: 6px;">
          ${rowsHtml}
        </div>
      </div>
    </div>
  `;

  if (modal) modal.classList.add("active");
};

window.closeDetailPresensiModal = function() {
  document.getElementById("modal-detail-presensi")?.classList.remove("active");
};

window.deletePresensiSession = async function(sessionId) {
  if (!confirm("Apakah Anda yakin ingin menghapus seluruh rekaman kegiatan ini?")) return;

  try {
    const records = window.allPresensiSessions.find((s) => s.sesi_id === sessionId)?.records || [];
    if (records.length > 0 && records[0].foto_dokumentasi_url) {
      try {
        let photos = JSON.parse(records[0].foto_dokumentasi_url);
        if (!Array.isArray(photos)) photos = [photos];
        const filesToDelete = photos.map(getStorageFileName).filter(Boolean);
        if (filesToDelete.length > 0) {
          await window.db.storage.from("dokumentasi_kegiatan").remove(filesToDelete);
        }
      } catch (e) {
        console.warn("Gagal menghapus file gambar sesi:", e);
      }
    }

    const { error } = await window.db.from("presensi").delete().eq("sesi_id", sessionId);
    if (error) throw error;

    alert("Presensi kegiatan berhasil dihapus.");
    await window.fetchPresensiHistory();
  } catch (err) {
    alert(`Gagal menghapus: ${err.message}`);
  }
};

window.formatTanggalIndo = function(tglStr) {
  if (!tglStr) return "-";
  const date = new Date(tglStr);
  return date.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
};