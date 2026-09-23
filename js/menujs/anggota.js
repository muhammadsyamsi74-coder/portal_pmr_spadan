/**
 * ==============================================================================
 * LOGIKA MODUL ANGGOTA - PORTAL PMR SPADAN
 * ==============================================================================
 */
window.rawAnggotaList = [];
window.aktifViewMode = "table";

window.checkIsAdminOrPengurus = function() {
  if (!window.activeUserProfile) return false;
  const role = (window.activeUserProfile.jabatan || "").toLowerCase();
  const ket = (window.activeUserProfile.keterangan_jabatan || "").toLowerCase();
  const isAdmin = role === "admin" || ket.includes("pembina");
  const isPengurus = role === "pengurus" ||
                      ket.includes("pelatih") ||
                      ket.includes("ketua") ||
                      ket.includes("wakil") ||
                      ket.includes("sekretaris") ||
                      ket.includes("bendahara");
  return (isAdmin || isPengurus) && ket !== "alumni" && ket !== "non-aktif";
};

window.compressMemberImage = function(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const MAX_SIZE = 400;
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > MAX_SIZE) {
            height = Math.round((height * MAX_SIZE) / width);
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width = Math.round((width * MAX_SIZE) / height);
            height = MAX_SIZE;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob((blob) => {
          resolve(blob);
        }, "image/jpeg", 0.70);
      };
    };
  });
};

window.initAnggotaMenu = async function() {
  const canManage = window.checkIsAdminOrPengurus();
  const role = window.activeUserProfile ? (window.activeUserProfile.jabatan || "").toLowerCase() : "guest";
  const btnTambah = document.getElementById("btn-tambah-anggota");
  if (btnTambah) {
    btnTambah.style.display = (role === "admin") ? "inline-flex" : "none";
  }
  const optNonaktif = document.getElementById("opt-filter-nonaktif");
  if (optNonaktif) {
    optNonaktif.style.display = canManage ? "block" : "none";
  }
  await window.fetchAnggotaData();
};

window.setAktifViewMode = function(mode) {
  window.aktifViewMode = mode;
  const btnTable = document.getElementById("btn-view-table");
  const btnStructure = document.getElementById("btn-view-structure");
  const tableContainer = document.getElementById("container-aktif-table");
  const structureContainer = document.getElementById("container-aktif-structure");
  
  if (mode === "structure") {
    btnTable?.classList.remove("active");
    btnStructure?.classList.add("active");
    if (tableContainer) tableContainer.style.display = "none";
    if (structureContainer) structureContainer.style.display = "flex";
  } else {
    btnStructure?.classList.remove("active");
    btnTable?.classList.add("active");
    if (structureContainer) structureContainer.style.display = "none";
    if (tableContainer) tableContainer.style.display = "block";
  }
};

window.fetchAnggotaData = async function() {
  if (!window.db) return;
  try {
    const { data, error } = await window.db
      .from("users_profile")
      .select("*")
      .order("nama_lengkap", { ascending: true });
    if (error) throw error;
    
    window.rawAnggotaList = data || [];
    window.renderAnggotaSections(window.rawAnggotaList);
  } catch (err) {
    console.error("Gagal memuat:", err);
    document.getElementById("tbody-aktif").innerHTML = `<tr><td colspan="6" style="text-align: center; color: #c62828;">Gagal memuat: ${err.message}</td></tr>`;
  }
};

window.renderAnggotaSections = function(list) {
  let totalAktif = 0, totalUsulan = 0, totalAlumni = 0;
  window.rawAnggotaList.forEach(item => {
    const jab = (item.jabatan || "").toLowerCase();
    const ket = (item.keterangan_jabatan || "").toLowerCase();
    
    if (ket === "alumni") totalAlumni++;
    else if (ket === "non-aktif") { /* Skip */ }
    else if (jab === "non-aktif") totalUsulan++;
    else totalAktif++;
  });
  
  const elAktif = document.getElementById("count-aktif");
  const elUsulan = document.getElementById("count-usulan");
  const elAlumni = document.getElementById("count-alumni");
  if(elAktif) elAktif.textContent = totalAktif;
  if(elUsulan) elUsulan.textContent = totalUsulan;
  if(elAlumni) elAlumni.textContent = totalAlumni;
  
  const canManage = window.checkIsAdminOrPengurus();
  const aktif = [], usulan = [], alumni = [], nonaktif = [];
  list.forEach(item => {
    const jab = (item.jabatan || "").toLowerCase();
    const ket = (item.keterangan_jabatan || "").toLowerCase();
    
    if (ket === "alumni") {
      alumni.push(item);
    } else if (ket === "non-aktif") {
      if (canManage) nonaktif.push(item);
    } else if (jab === "non-aktif") {
      usulan.push(item);
    } else {
      aktif.push(item);
    }
  });

  const currentUser = window.activeUserProfile;
  const currentUserId = currentUser ? currentUser.id : null;
  const isAdmin = currentUser && currentUser.jabatan === "admin";
  
  const generateRows = (arr) => {
    return arr.map(item => {
      const amanNama = window.sanitizeHTML(item.nama_lengkap);
      const amanPanggilan = window.sanitizeHTML(item.nama_panggilan);
      const amanNisn = window.sanitizeHTML(item.nisn);
      const amanKelas = window.sanitizeHTML(item.kelas);
      const amanKetJabatan = window.sanitizeHTML(item.keterangan_jabatan);
      const amanTahun = window.sanitizeHTML(item.tahun_bergabung);

      let badgeClass = "badge-anggota";
      let badgeLabel = item.jabatan || "anggota";
      if (item.jabatan === "admin") badgeClass = "badge-admin";
      else if (item.jabatan === "pengurus") badgeClass = "badge-pengurus";
      else if (item.jabatan === "non-aktif") { badgeClass = "badge-nonaktif"; badgeLabel = "Non-Aktif"; }
      
      const canEdit = isAdmin || (currentUserId === item.id && currentUserId !== null);
      
      let goldarText = "-";
      if (item.golongan_darah) {
        goldarText = `${window.sanitizeHTML(item.golongan_darah)} ${item.rhesus_darah ? (item.rhesus_darah === 'Positif' ? '(+)' : '(-)') : ''}`;
      }
      
      const avatarImg = item.foto_profil_url
        ? `<img src="${window.sanitizeHTML(item.foto_profil_url)}" style="width: 36px; height: 36px; border-radius: 50%; object-fit: cover; object-position: top; border: 1px solid #ddd; margin: 0 auto; display: block; cursor: zoom-in;" onclick="window.showEnlargedPhoto('${window.sanitizeHTML(item.foto_profil_url)}')" title="Lihat Foto" />`
        : `<div style="width: 36px; height: 36px; border-radius: 50%; background: #e2e8f0; display: flex; align-items: center; justify-content: center; margin: 0 auto;"><i data-lucide="user" style="color: #64748b; width: 18px; height: 18px;"></i></div>`;
      
      const jkLabel = item.jenis_kelamin ? ` | ${item.jenis_kelamin === 'Laki-laki' ? 'L' : 'P'}` : '';

      return `
        <tr>
          <td style="text-align: center; vertical-align: middle;">${avatarImg}</td>
          <td>
            <div style="font-weight: 700; color: #222;">${amanNama} <span style="font-weight: 500; color: #666;">(${amanPanggilan || "-"})</span></div>
            <div style="font-size: 11px; color: #888; margin-top: 2px;">NISN: ${amanNisn || "-"} ${jkLabel}</div>
          </td>
          <td>
            <div style="font-weight: 700; color: #333;">${amanKelas || "-"}</div>
            <div style="font-size: 11px; color: #777; margin-top: 2px;">Th. Bergabung: ${amanTahun || "-"}</div>
          </td>
          <td>
            <div style="font-weight: 700; color: #333;">${amanKetJabatan || "-"}</div>
            <span class="badge-role ${badgeClass}">${window.sanitizeHTML(badgeLabel)}</span>
          </td>
          <td style="text-align: center;"><span class="badge-blood">${goldarText}</span></td>
          <td style="text-align: center; white-space: nowrap;">
            ${canEdit ? `<button class="btn-icon-action" type="button" title="Edit Profil" onclick="window.editAnggota('${item.id}')"><i data-lucide="edit-3"></i></button>` : `<span style="font-size: 10px; color: #aaa; font-weight: 600;">Hanya Lihat</span>`}
            ${(isAdmin && currentUserId !== item.id) ? `<button class="btn-icon-action" type="button" title="Hapus Anggota" onclick="window.deleteAnggota('${item.id}', '${amanNama}')"><i data-lucide="trash-2" style="color: #c62828;"></i></button>` : ""}
          </td>
        </tr>
      `;
    }).join("");
  };

  const tbAktif = document.getElementById("tbody-aktif");
  const tbUsulan = document.getElementById("tbody-usulan");
  const tbAlumni = document.getElementById("tbody-alumni");
  const tbNonaktif = document.getElementById("tbody-nonaktif");
  
  if(tbAktif) tbAktif.innerHTML = generateRows(aktif);
  if(tbUsulan) tbUsulan.innerHTML = generateRows(usulan);
  if(tbAlumni) tbAlumni.innerHTML = generateRows(alumni);
  if(tbNonaktif) tbNonaktif.innerHTML = generateRows(nonaktif);
  
  const bAktif = document.getElementById("badge-count-aktif");
  const bUsulan = document.getElementById("badge-count-usulan");
  const bAlumni = document.getElementById("badge-count-alumni");
  const bNonaktif = document.getElementById("badge-count-nonaktif");
  if(bAktif) bAktif.textContent = aktif.length;
  if(bUsulan) bUsulan.textContent = usulan.length;
  if(bAlumni) bAlumni.textContent = alumni.length;
  if(bNonaktif) bNonaktif.textContent = nonaktif.length;

  const cardAktif = document.getElementById("card-section-aktif");
  const cardUsulan = document.getElementById("card-section-usulan");
  const cardAlumni = document.getElementById("card-section-alumni");
  const cardNonaktif = document.getElementById("card-section-nonaktif");
  
  const statusFilterVal = document.getElementById("filter-status")?.value || "";
  
  if(cardAktif) {
    const show = aktif.length > 0 && (statusFilterVal === "" || statusFilterVal === "aktif");
    cardAktif.style.display = show ? "flex" : "none";
  }
  if(cardUsulan) {
    const show = usulan.length > 0 && (statusFilterVal === "" || statusFilterVal === "usulan");
    cardUsulan.style.display = show ? "flex" : "none";
  }
  if(cardAlumni) {
    const show = alumni.length > 0 && (statusFilterVal === "" || statusFilterVal === "alumni");
    cardAlumni.style.display = show ? "flex" : "none";
  }
  if(cardNonaktif) {
    const show = canManage && nonaktif.length > 0 && (statusFilterVal === "" || statusFilterVal === "nonaktif");
    cardNonaktif.style.display = show ? "flex" : "none";
  }

  window.renderStructureGrid(aktif);
  if (window.lucide) lucide.createIcons();
};

window.renderStructureGrid = function(aktifList) {
  const tier1 = [], tier2 = [], tier3 = [], tier4 = [];
  aktifList.forEach(item => {
    const ket = (item.keterangan_jabatan || "").toLowerCase();
    if (ket.includes("kepala sekolah") || ket.includes("pembina") || ket.includes("pelatih")) {
      tier1.push(item);
    } else if (ket.includes("ketua") || ket.includes("wakil") || ket.includes("sekretaris") || ket.includes("bendahara")) {
      tier2.push(item);
    } else if (ket.includes("seksi")) {
      tier3.push(item);
    } else {
      tier4.push(item);
    }
  });

  const renderCard = (u) => {
    const amanNama = window.sanitizeHTML(u.nama_lengkap);
    const amanPanggilan = window.sanitizeHTML(u.nama_panggilan);
    const amanKelas = window.sanitizeHTML(u.kelas);
    const amanKetJabatan = window.sanitizeHTML(u.keterangan_jabatan);
    const amanTahun = window.sanitizeHTML(u.tahun_bergabung);

    const photoEl = u.foto_profil_url
      ? `<img src="${window.sanitizeHTML(u.foto_profil_url)}" class="org-card-photo" alt="${amanPanggilan || amanNama}" onclick="window.showEnlargedPhoto('${window.sanitizeHTML(u.foto_profil_url)}')" title="Lihat Foto" />`
      : `<div class="org-card-avatar">${(amanPanggilan || amanNama || "?").charAt(0).toUpperCase()}</div>`;
    
    return `
      <div class="org-card">
        ${photoEl}
        <div class="org-card-name">${amanNama}</div>
        <div class="org-card-sub">Panggilan: ${amanPanggilan || "-"} | Kelas ${amanKelas || "-"}</div>
        <div class="org-card-role">${amanKetJabatan || "Anggota"}</div>
        <div class="org-card-year">Th. Bergabung: ${amanTahun || "-"}</div>
      </div>
    `;
  };

  const emptyMsg = `<div style="font-size: 11px; color: #999; padding: 6px 0; text-align: center; width: 100%;">Belum ada anggota pada tingkatan ini.</div>`;
  const elT1 = document.getElementById("structure-tier-1");
  const elT2 = document.getElementById("structure-tier-2");
  const elT3 = document.getElementById("structure-tier-3");
  const elT4 = document.getElementById("structure-tier-4");
  if (elT1) elT1.innerHTML = tier1.length > 0 ? tier1.map(renderCard).join("") : emptyMsg;
  if (elT2) elT2.innerHTML = tier2.length > 0 ? tier2.map(renderCard).join("") : emptyMsg;
  if (elT3) elT3.innerHTML = tier3.length > 0 ? tier3.map(renderCard).join("") : emptyMsg;
  if (elT4) elT4.innerHTML = tier4.length > 0 ? tier4.map(renderCard).join("") : emptyMsg;
};

window.handleAnggotaFilter = function() {
  const q = (document.getElementById("filter-search").value || "").toLowerCase();
  const statusEl = document.getElementById("filter-status");
  let statusVal = statusEl ? statusEl.value : "";
  
  const canManage = window.checkIsAdminOrPengurus();
  if (statusVal === "nonaktif" && !canManage) {
    statusVal = "";
    if (statusEl) statusEl.value = "";
  }
  
  const filtered = window.rawAnggotaList.filter((item) => {
    const ket = (item.keterangan_jabatan || "").toLowerCase();
    if (ket === "non-aktif" && !canManage) {
      return false;
    }
    const matchSearch = item.nama_lengkap.toLowerCase().includes(q) ||
                         (item.nisn && item.nisn.includes(q)) ||
                         item.nama_panggilan.toLowerCase().includes(q) ||
                         item.kelas.toLowerCase().includes(q);
    return matchSearch;
  });
  window.renderAnggotaSections(filtered);
};

window.showEnlargedPhoto = function(url) {
  const viewer = document.getElementById("modal-photo-viewer");
  const img = document.getElementById("enlarged-photo");
  if (viewer && img) {
    img.src = url;
    viewer.classList.add("active");
  }
};

window.closePhotoViewer = function() {
  const viewer = document.getElementById("modal-photo-viewer");
  const img = document.getElementById("enlarged-photo");
  if (viewer) viewer.classList.remove("active");
  if (img) img.src = "";
};

window.openAnggotaModal = function() {
  const form = document.getElementById("form-anggota");
  if (form) form.reset();
  document.getElementById("form-user-id").value = "";
  document.getElementById("modal-anggota-title").textContent = "Tambah Anggota Baru";
  document.getElementById("row-auth-credentials").style.display = "grid";
  document.getElementById("form-email").required = true;
  document.getElementById("form-password").required = true;
  const jkEl = document.getElementById("form-jenis-kelamin");
  if (jkEl) jkEl.value = "";
  document.getElementById("form-jabatan").disabled = false;
  document.getElementById("form-keterangan-jabatan").disabled = false;
  document.getElementById("modal-anggota").classList.add("active");
};

window.closeAnggotaModal = function() {
  document.getElementById("modal-anggota")?.classList.remove("active");
};

window.editAnggota = function(userId) {
  try {
    const target = window.rawAnggotaList.find((u) => u.id === userId);
    if (!target) return alert("Data tidak ditemukan.");
    const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val; };
    
    document.getElementById("modal-anggota-title").textContent = `Edit Profil: ${target.nama_panggilan}`;
    document.getElementById("row-auth-credentials").style.display = "none";
    document.getElementById("form-email").required = false;
    document.getElementById("form-password").required = false;
    
    setVal("form-user-id", target.id);
    setVal("form-nama-lengkap", target.nama_lengkap || "");
    setVal("form-nama-panggilan", target.nama_panggilan || "");
    setVal("form-jenis-kelamin", target.jenis_kelamin || "");
    setVal("form-tanggal-lahir", target.tanggal_lahir || "");
    setVal("form-kelas", target.kelas || "");
    setVal("form-tahun-bergabung", target.tahun_bergabung || "");
    setVal("form-nisn", target.nisn || "");
    setVal("form-jabatan", target.jabatan || "non-aktif");
    setVal("form-keterangan-jabatan", target.keterangan_jabatan || "Anggota");
    setVal("form-golongan-darah", target.golongan_darah || "");
    setVal("form-rhesus-darah", target.rhesus_darah || "");
    setVal("form-riwayat-penyakit", target.riwayat_penyakit || "");
    setVal("form-wa-pribadi", target.no_wa_pribadi || "");
    setVal("form-wa-ortu", target.no_wa_ortu || "");
    
    const isAdmin = window.activeUserProfile && window.activeUserProfile.jabatan === "admin";
    const jSelect = document.getElementById("form-jabatan");
    const kSelect = document.getElementById("form-keterangan-jabatan");
    if (jSelect) { jSelect.disabled = !isAdmin; jSelect.title = isAdmin ? "Pilih wewenang" : "Khusus Admin"; }
    if (kSelect) { kSelect.disabled = !isAdmin; kSelect.title = isAdmin ? "Pilih jabatan" : "Khusus Admin"; }
    
    document.getElementById("modal-anggota").classList.add("active");
  } catch (err) {
    console.error("Crash saat membuka form edit:", err);
    alert("Sistem gagal memuat form: " + err.message);
  }
};

window.saveAnggotaData = async function(event) {
  event.preventDefault();
  const btn = document.getElementById("btn-submit-anggota");
  const userId = document.getElementById("form-user-id").value;
  const isEditing = Boolean(userId);
  const isAdmin = window.activeUserProfile && window.activeUserProfile.jabatan === "admin";
  btn.disabled = true;
  btn.textContent = "Menyimpan...";
  try {
    let fotoUrl = null;
    const fotoFileInput = document.getElementById("form-foto-profil");
    if (fotoFileInput.files && fotoFileInput.files[0]) {
      const file = fotoFileInput.files[0];
      
      // [KEAMANAN] Validasi Tipe Ekstensi File
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        throw new Error("Tipe file tidak diizinkan. Hanya menerima format gambar (JPG, PNG, WebP).");
      }
      
      const compressedBlob = await window.compressMemberImage(file);
      const fileName = `foto_${crypto.randomUUID()}.jpg`; // PERBAIKAN UUID
      
      const { error: uploadErr } = await window.db.storage.from("profil-anggota")
        .upload(fileName, compressedBlob, { contentType: "image/jpeg" });
      
      if (!uploadErr) {
        const { data: publicUrlData } = window.db.storage.from("profil-anggota").getPublicUrl(fileName);
        fotoUrl = publicUrlData.publicUrl;
      }
    }
    
    const payload = {
      nama_lengkap: document.getElementById("form-nama-lengkap").value.trim().toUpperCase(),
      nama_panggilan: document.getElementById("form-nama-panggilan").value.trim(),
      jenis_kelamin: document.getElementById("form-jenis-kelamin").value,
      tanggal_lahir: document.getElementById("form-tanggal-lahir").value,
      kelas: document.getElementById("form-kelas").value.trim(),
      tahun_bergabung: document.getElementById("form-tahun-bergabung").value.trim(),
      nisn: document.getElementById("form-nisn").value.trim() || null,
      golongan_darah: document.getElementById("form-golongan-darah").value || null,
      rhesus_darah: document.getElementById("form-rhesus-darah").value || null,
      riwayat_penyakit: document.getElementById("form-riwayat-penyakit").value.trim() || null,
      no_wa_pribadi: document.getElementById("form-wa-pribadi").value.trim() || null,
      no_wa_ortu: document.getElementById("form-wa-ortu").value.trim() || null
    };
    if (isAdmin) {
      payload.jabatan = document.getElementById("form-jabatan").value;
      payload.keterangan_jabatan = document.getElementById("form-keterangan-jabatan").value;
    }
    if (fotoUrl) payload.foto_profil_url = fotoUrl;
    
    if (isEditing) {
      const { error } = await window.db.from("users_profile").update(payload).eq("id", userId);
      if (error) throw error;
      alert("Data berhasil diperbarui!");
    } else {
      const email = document.getElementById("form-email").value.trim();
      const password = document.getElementById("form-password").value;
      const { data: authData, error: authErr } = await window.db.auth.signUp({ email, password });
      if (authErr) throw authErr;
      
      payload.id = authData.user.id;
      payload.email = email;
      payload.jabatan = payload.jabatan || "non-aktif";
      payload.keterangan_jabatan = payload.keterangan_jabatan || "Anggota";
      const { error: profileErr } = await window.db.from("users_profile").insert(payload);
      if (profileErr) throw profileErr;
      alert("Anggota baru ditambahkan!");
    }
    window.closeAnggotaModal();
    await window.fetchAnggotaData();
  } catch (err) {
    alert(`Terjadi kesalahan: ${err.message}`);
  } finally {
    btn.disabled = false;
    btn.textContent = "Simpan Data";
  }
};

window.deleteAnggota = async function(userId, nama) {
  if (!confirm(`Hapus anggota: ${nama}?`)) return;
  try {
    const { error } = await window.db.from("users_profile").delete().eq("id", userId);
    if (error) throw error;
    alert("Terhapus.");
    await window.fetchAnggotaData();
  } catch (err) {
    alert(`Gagal: ${err.message}`);
  }
};