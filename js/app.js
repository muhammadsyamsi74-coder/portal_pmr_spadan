/**
 * ==============================================================================
 * [CONTROLLER] MESIN UTAMA (ROUTER & AUTH) - PORTAL PMR SPADAN
 * ==============================================================================
 */
window.activeUserProfile = null;

// [KEAMANAN] FUNGSI SANITASI GLOBAL (MENCEGAH XSS INJECTION)
window.sanitizeHTML = function(str) {
  if (str === null || str === undefined) return "";
  const div = document.createElement('div');
  div.textContent = String(str);
  return div.innerHTML;
};

// [ROUTING] Konfigurasi Rute Menu Aplikasi
window.MENU_ROUTES = {
  dashboard: { html: "html/dashboard.html", script: "js/menujs/dashboard.js", title: "DASHBOARD", initFn: "initDashboardMenu" },
  anggota: { html: "html/anggota.html", script: "js/menujs/anggota.js", title: "DATA ANGGOTA", initFn: "initAnggotaMenu" },
  presensi: { html: "html/presensi.html", script: "js/menujs/presensi.js", title: "PRESENSI KEGIATAN", initFn: "initPresensiMenu" },
  "pmr-tools": { html: "html/utilitas.html", script: "js/menujs/utilitas.js", title: "UTILITY", initFn: "renderUtilitasGrid" }
};

window.compressProfileImage = function(file) {
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

document.addEventListener("DOMContentLoaded", async () => {
  if (window.db && window.db.auth) {
    window.db.auth.onAuthStateChange(async (event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        window.openSetNewPasswordModal();
      }
    });
  }
  const urlParams = new URLSearchParams(window.location.search);
  const verifyId = urlParams.get("verify_id");
  if (verifyId && window.db) {
    await window.tampilkanModalVerifikasiKTA(verifyId);
  }
  await window.verifySessionAndLoadUser();
  window.navigateMenu("dashboard");
});

window.tampilkanModalVerifikasiKTA = async function(userId) {
  try {
    const { data: user, error } = await window.db
      .from("users_profile")
      .select("nama_lengkap, golongan_darah, rhesus_darah, tanggal_lahir, id, tahun_bergabung, jabatan, keterangan_jabatan, foto_profil_url")
      .eq("id", userId)
      .single();
    if (error || !user) {
      alert("Status Keanggotaan: Data anggota tidak ditemukan di dalam sistem PMR SPADAN.");
      return;
    }
    const role = (user.jabatan || "").toLowerCase();
    const ket = (user.keterangan_jabatan || "").toLowerCase();
    const isAktif = role !== "non-aktif" && ket !== "non-aktif";
    const statusText = isAktif ? "AKTIF" : "NON-AKTIF";
    const statusColor = isAktif ? "#16a34a" : "#dc2626";
    const rhesus = user.rhesus_darah === 'Positif' ? '+' : (user.rhesus_darah === 'Negatif' ? '-' : '');
    const goldar = user.golongan_darah ? `${window.sanitizeHTML(user.golongan_darah)}${rhesus}` : "-";
    const tglLahir = user.tanggal_lahir
      ? new Date(user.tanggal_lahir).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })
      : "-";
    const modalHtml = `
      <div id="modal-verifikasi-kta" style="position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(15,23,42,0.7); z-index:99999; display:flex; align-items:center; justify-content:center; padding:16px;">
        <div style="background:#fff; width:100%; max-width:380px; border-radius:16px; overflow:hidden; box-shadow:0 10px 40px rgba(0,0,0,0.25); animation:fadeIn 0.2s ease;">
          <div style="background:#7f1d1d; color:#fff; padding:14px 18px; display:flex; justify-content:space-between; align-items:center;">
            <div style="display:flex; align-items:center; gap:8px;">
              <i data-lucide="badge-check" style="width:20px; height:20px;"></i>
              <h3 style="font-size:13px; font-weight:800;">VERIFIKASI ANGGOTA RESMI</h3>
            </div>
            <button onclick="document.getElementById('modal-verifikasi-kta').remove()" style="background:none; border:none; color:#fff; font-size:20px; cursor:pointer;">&times;</button>
          </div>
          <div style="padding:18px; display:flex; flex-direction:column; gap:12px; font-size:12px;">
            <div style="text-align:center; padding-bottom:10px; border-bottom:1px solid #eee;">
              <span style="display:inline-block; background:${isAktif ? '#dcfce7' : '#fee2e2'}; color:${statusColor}; font-weight:800; font-size:11px; padding:4px 12px; border-radius:20px; margin-bottom:8px;">
                STATUS: ${statusText}
              </span>
              <h4 style="font-size:14px; font-weight:800; color:#0f172a;">${window.sanitizeHTML(user.nama_lengkap)}</h4>
              <p style="color:#64748b; font-size:11px; font-weight:600; margin-top:2px;">${window.sanitizeHTML(user.keterangan_jabatan || user.jabatan || 'Anggota')}</p>
            </div>
            <table style="width:100%; font-size:11.5px; border-collapse:collapse;">
              <tr><td style="padding:4px 0; color:#64748b; width:40%;">Gol. Darah</td><td>: <b>${goldar}</b></td></tr>
              <tr><td style="padding:4px 0; color:#64748b;">Tanggal Lahir</td><td>: <b>${tglLahir}</b></td></tr>
              <tr><td style="padding:4px 0; color:#64748b;">ID Anggota</td><td>: <b>${user.id.substring(0, 8).toUpperCase()}</b></td></tr>
              <tr><td style="padding:4px 0; color:#64748b;">Th. Bergabung</td><td>: <b>${window.sanitizeHTML(user.tahun_bergabung || '-')}</b></td></tr>
              <tr><td style="padding:4px 0; color:#64748b;">Unit Sekolah</td><td>: <b>SMPN 8 Balikpapan</b></td></tr>
            </table>
            <button onclick="document.getElementById('modal-verifikasi-kta').remove()" style="background:#7f1d1d; color:#fff; border:none; padding:10px; border-radius:8px; font-weight:700; cursor:pointer; margin-top:6px;">Tutup</button>
          </div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML("beforeend", modalHtml);
    if (window.lucide) lucide.createIcons();
  } catch (err) {
    console.error("Gagal memverifikasi KTA:", err);
  }
};

window.verifySessionAndLoadUser = async function() {
  const userNameEl = document.getElementById("user-name");
  const userRoleEl = document.getElementById("user-role");
  const userInitialEl = document.getElementById("user-initial");
  const mobileAvatarEl = document.getElementById("mobile-user-avatar");
  const guestGroup = document.getElementById("guest-action-group");
  const loggedGroup = document.getElementById("logged-action-group");
  const mobileGuestActions = document.getElementById("mobile-guest-actions");
  const mobileLoggedActions = document.getElementById("mobile-logged-actions");
  
  if (typeof getCurrentUser !== "function") return;
  const user = await getCurrentUser();
  if (!user) {
    window.activeUserProfile = null;
    if (userNameEl) userNameEl.textContent = "Tamu (Belum Login)";
    if (userRoleEl) userRoleEl.textContent = "Guest Mode";
    if (userInitialEl) userInitialEl.textContent = "?";
    if (mobileAvatarEl) mobileAvatarEl.textContent = "?";
    if (guestGroup) guestGroup.style.display = "flex";
    if (loggedGroup) loggedGroup.style.display = "none";
    if (mobileGuestActions) mobileGuestActions.style.display = "flex";
    if (mobileLoggedActions) mobileLoggedActions.style.display = "none";
    return;
  }
  
  window.activeUserProfile = await getCurrentUserProfile();
  if (guestGroup) guestGroup.style.display = "none";
  if (loggedGroup) loggedGroup.style.display = "flex";
  if (mobileGuestActions) mobileGuestActions.style.display = "none";
  if (mobileLoggedActions) mobileLoggedActions.style.display = "flex";
  
  if (window.activeUserProfile) {
    const nama = window.activeUserProfile.nama_lengkap || user.email;
    const role = (window.activeUserProfile.jabatan || "non-aktif").toUpperCase();
    if (userNameEl) userNameEl.textContent = nama;
    if (userRoleEl) userRoleEl.textContent = `${role} (${window.activeUserProfile.keterangan_jabatan || "-"})`;
    const avatarHtml = window.activeUserProfile.foto_profil_url
      ? `<img src="${window.sanitizeHTML(window.activeUserProfile.foto_profil_url)}" style="width:100%; height:100%; object-fit:cover; object-position: top;" />`
      : window.sanitizeHTML((window.activeUserProfile.nama_panggilan || nama).charAt(0).toUpperCase());
    if (userInitialEl) userInitialEl.innerHTML = avatarHtml;
    if (mobileAvatarEl) mobileAvatarEl.innerHTML = avatarHtml;
  } else {
    if (userNameEl) userNameEl.textContent = user.email;
    if (userRoleEl) userRoleEl.textContent = "Profil Belum Lengkap";
  }
  if (window.lucide) lucide.createIcons();
};

window.toggleMobileProfileDropdown = function(event) {
  event.stopPropagation();
  const drop = document.getElementById("mobile-profile-dropdown");
  if (drop) drop.classList.toggle("active");
};

window.closeMobileProfileDropdown = function() {
  const drop = document.getElementById("mobile-profile-dropdown");
  if (drop) drop.classList.remove("active");
};

window.navigateMenu = async function(menuKey) {
  try {
    const route = window.MENU_ROUTES[menuKey];
    const viewport = document.getElementById("app-viewport");
    const mobileTitle = document.getElementById("mobile-page-title");
    if (!route || !viewport) return;
    if (menuKey === "dashboard") {
      document.body.classList.add("hide-mobile-header");
    } else {
      document.body.classList.remove("hide-mobile-header");
    }
    if (mobileTitle) mobileTitle.textContent = `MENU: ${route.title}`;
    window.updateActiveButtons(menuKey);
    viewport.innerHTML = `<div style="text-align: center; padding: 40px; color: #777;"><p style="font-weight: 600;">Memuat ${route.title}...</p></div>`;
    const response = await fetch(route.html);
    if (!response.ok) throw new Error(`Berkas tidak ditemukan (${response.status} ${response.statusText}): ${route.html}`);
    viewport.innerHTML = await response.text();
    await window.loadMenuScript(route.script, route.initFn);
    if (window.lucide) lucide.createIcons();
  } catch (error) {
    console.error("[Router] Crash saat memuat menu:", error);
    const viewport = document.getElementById("app-viewport");
    if (viewport) {
      viewport.innerHTML = `
        <div style="background: #ffebee; border-left: 4px solid #c62828; padding: 16px; border-radius: 6px; margin: 20px;">
          <h4 style="color: #c62828; margin-bottom: 6px; font-weight:800;">Gagal Memuat Halaman</h4>
          <p style="font-size: 13px; color: #555;">${window.sanitizeHTML(error.message)}</p>
        </div>`;
    }
  }
};

window.updateActiveButtons = function(menuKey) {
  const desktopBtns = document.querySelectorAll(".sidebar .nav-item");
  const mobileBtns = document.querySelectorAll(".mobile-bottom-nav .mobile-nav-item");
  const keys = Object.keys(window.MENU_ROUTES);
  const targetIndex = keys.indexOf(menuKey);
  if (targetIndex !== -1) {
    desktopBtns.forEach((btn, idx) => btn.classList.toggle("active", idx === targetIndex));
    mobileBtns.forEach((btn, idx) => btn.classList.toggle("active", idx === targetIndex));
  }
};

window.loadMenuScript = function(scriptSrc, initFunctionName) {
  return new Promise((resolve) => {
    const existingScript = document.querySelector(`script[src="${scriptSrc}"]`);
    const executeInit = async () => {
      try {
         if (initFunctionName && typeof window[initFunctionName] === "function") {
           await window[initFunctionName]();
         }
       } catch (e) {
         console.error(`[Router] Error inisialisasi modul (${initFunctionName}):`, e);
       }
      resolve();
    };
    if (existingScript) {
       executeInit();
       return;
     }
    const scriptEl = document.createElement("script");
    scriptEl.src = scriptSrc;
    scriptEl.onload = executeInit;
    scriptEl.onerror = () => {
       console.warn(`[Router] Skrip pendukung ${scriptSrc} tidak ditemukan.`);
       resolve();
     };
    document.body.appendChild(scriptEl);
  });
};

/* --------------------------------------------------------------------------
   FITUR AUTENTIKASI: LOGIN, LUPA PASSWORD & REGISTER
-------------------------------------------------------------------------- */
window.openLoginModal = function() { document.getElementById("modal-auth-login")?.classList.add("active"); };
window.closeLoginModal = function() { document.getElementById("modal-auth-login")?.classList.remove("active"); };

window.handleLoginSubmit = async function(event) {
  event.preventDefault();
  const btn = document.getElementById("btn-submit-login");
  const email = document.getElementById("login-email").value.trim();
  const password = document.getElementById("login-password").value;
  btn.disabled = true; btn.textContent = "Memproses...";
  try {
    const { error } = await window.db.auth.signInWithPassword({ email, password });
    if (error) throw error;
    alert("Login berhasil!");
    window.closeLoginModal();
    window.location.reload();
  } catch (err) {
    alert("Gagal masuk: " + err.message);
  } finally {
    btn.disabled = false; btn.textContent = "Masuk";
  }
};

window.openForgotPasswordModal = function() {
  window.closeLoginModal();
  document.getElementById("forgot-email").value = "";
  document.getElementById("modal-auth-forgot")?.classList.add("active");
};

window.closeForgotPasswordModal = function() {
  document.getElementById("modal-auth-forgot")?.classList.remove("active");
};

window.handleForgotPasswordSubmit = async function(event) {
  event.preventDefault();
  const btn = document.getElementById("btn-submit-forgot");
  const email = document.getElementById("forgot-email").value.trim();
  btn.disabled = true;
  btn.textContent = "Mengirim...";
  try {
    const redirectUrl = window.location.origin + window.location.pathname;
    const { error } = await window.db.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl
    });
    if (error) throw error;
    alert("Tautan pemulihan kata sandi telah dikirim ke email Anda! Silakan periksa Kotak Masuk atau folder Spam.");
    window.closeForgotPasswordModal();
  } catch (err) {
    alert("Gagal mengirim pemulihan: " + err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = "Kirim Tautan";
  }
};

window.openSetNewPasswordModal = function() {
  document.getElementById("reset-new-password").value = "";
  document.getElementById("reset-confirm-password").value = "";
  document.getElementById("modal-auth-reset-password")?.classList.add("active");
};

window.handleSetNewPasswordSubmit = async function(event) {
  event.preventDefault();
  const btn = document.getElementById("btn-submit-reset");
  const newPassword = document.getElementById("reset-new-password").value;
  const confirmPassword = document.getElementById("reset-confirm-password").value;
  if (newPassword !== confirmPassword) {
    alert("Konfirmasi kata sandi tidak cocok!");
    return;
  }
  btn.disabled = true;
  btn.textContent = "Menyimpan...";
  try {
    const { error } = await window.db.auth.updateUser({ password: newPassword });
    if (error) throw error;
    alert("Kata sandi berhasil diperbarui! Silakan gunakan kata sandi baru untuk masuk.");
    document.getElementById("modal-auth-reset-password")?.classList.remove("active");
    window.location.hash = "";
    window.location.reload();
  } catch (err) {
    alert("Gagal memperbarui kata sandi: " + err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = "Perbarui Sandi";
  }
};

window.logoutUser = async function() {
  if (!confirm("Apakah Anda yakin ingin keluar?")) return;
  if (window.db && window.db.auth) {
    await window.db.auth.signOut();
    window.location.reload();
  }
};

window.openRegisterModal = function() {
  document.getElementById("form-register-full")?.reset();
  document.getElementById("modal-auth-register")?.classList.add("active");
};

window.closeRegisterModal = function() {
   document.getElementById("modal-auth-register")?.classList.remove("active");
};

window.handleRegisterSubmit = async function(event) {
  event.preventDefault();
  const btn = document.getElementById("btn-submit-reg");
  const namaLengkap = document.getElementById("reg-nama-lengkap").value.trim().toUpperCase();
  const namaPanggilan = document.getElementById("reg-nama-panggilan").value.trim();
  const jenisKelamin = document.getElementById("reg-jenis-kelamin").value;
  const tanggalLahir = document.getElementById("reg-tanggal-lahir").value;
  const kelas = document.getElementById("reg-kelas").value.trim();
  const tahunBergabung = document.getElementById("reg-tahun-bergabung").value.trim();
  const nisn = document.getElementById("reg-nisn").value.trim() || null;
  const keteranganJabatan = document.getElementById("reg-keterangan-jabatan").value;
  const golonganDarah = document.getElementById("reg-golongan-darah").value || null;
  const rhesusDarah = document.getElementById("reg-rhesus-darah").value || null;
  const riwayatPenyakit = document.getElementById("reg-riwayat-penyakit").value.trim() || null;
  const noWaPribadi = document.getElementById("reg-wa-pribadi").value.trim() || null;
  const noWaOrtu = document.getElementById("reg-wa-ortu").value.trim() || null;
  const fotoInput = document.getElementById("reg-foto");
  const email = document.getElementById("reg-email").value.trim();
  const password = document.getElementById("reg-password").value;
  
  btn.disabled = true; btn.textContent = "Mendaftarkan Anggota...";
  try {
    const { data: authData, error: authErr } = await window.db.auth.signUp({ email, password });
    if (authErr) throw authErr;
    if (!authData.user) throw new Error("Gagal membuat akun autentikasi.");
    const userId = authData.user.id;
    
    let fotoUrl = null;
    if (fotoInput.files && fotoInput.files[0]) {
      const file = fotoInput.files[0];
      
      // [KEAMANAN] Validasi Tipe Ekstensi File
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        throw new Error("Tipe file tidak diizinkan. Hanya menerima format gambar (JPG, PNG, WebP).");
      }
      
      const compressedBlob = await window.compressProfileImage(file);
      const fileName = `foto_${userId}_${crypto.randomUUID()}.jpg`;
      
      const { error: uploadErr } = await window.db.storage.from("profil-anggota")
        .upload(fileName, compressedBlob, { contentType: "image/jpeg" });
      
      if (!uploadErr) {
        const { data: publicUrlData } = window.db.storage.from("profil-anggota").getPublicUrl(fileName);
        fotoUrl = publicUrlData.publicUrl;
      }
    }
    
    const { error: profErr } = await window.db.from("users_profile").insert({
      id: userId, email: email, nama_lengkap: namaLengkap, nama_panggilan: namaPanggilan,
      jenis_kelamin: jenisKelamin, tanggal_lahir: tanggalLahir, kelas: kelas,
      tahun_bergabung: tahunBergabung, nisn: nisn, jabatan: "non-aktif",
      keterangan_jabatan: keteranganJabatan, golongan_darah: golonganDarah,
      rhesus_darah: rhesusDarah, riwayat_penyakit: riwayatPenyakit,
      no_wa_pribadi: noWaPribadi, no_wa_ortu: noWaOrtu, foto_profil_url: fotoUrl
    });
    
    if (profErr) throw profErr;
    alert("Pendaftaran berhasil! Akun Anda berstatus non-aktif dan menunggu aktivasi wewenang oleh Pembina.");
    window.closeRegisterModal();
    window.openLoginModal();
  } catch (err) {
    console.error(err);
    alert("Pendaftaran gagal: " + err.message);
  } finally {
    btn.disabled = false; btn.textContent = "Kirim Pendaftaran";
  }
};

window.openEditProfileModal = function() {
  if (!window.activeUserProfile) { alert("Silakan masuk terlebih dahulu."); return; }
  document.getElementById("prof-nama-lengkap").value = window.activeUserProfile.nama_lengkap || "";
  document.getElementById("prof-nama-panggilan").value = window.activeUserProfile.nama_panggilan || "";
  document.getElementById("prof-jenis-kelamin").value = window.activeUserProfile.jenis_kelamin || "";
  document.getElementById("prof-tanggal-lahir").value = window.activeUserProfile.tanggal_lahir || "";
  document.getElementById("prof-kelas").value = window.activeUserProfile.kelas || "";
  document.getElementById("prof-tahun-bergabung").value = window.activeUserProfile.tahun_bergabung || "";
  document.getElementById("prof-nisn").value = window.activeUserProfile.nisn || "";
  document.getElementById("prof-golongan-darah").value = window.activeUserProfile.golongan_darah || "";
  document.getElementById("prof-rhesus-darah").value = window.activeUserProfile.rhesus_darah || "";
  document.getElementById("prof-riwayat-penyakit").value = window.activeUserProfile.riwayat_penyakit || "";
  document.getElementById("prof-wa-pribadi").value = window.activeUserProfile.no_wa_pribadi || "";
  document.getElementById("prof-wa-ortu").value = window.activeUserProfile.no_wa_ortu || "";
  const passInput = document.getElementById("prof-new-password");
  if (passInput) passInput.value = "";
  document.getElementById("modal-auth-profile")?.classList.add("active");
};

window.closeEditProfileModal = function() {
   document.getElementById("modal-auth-profile")?.classList.remove("active");
};

window.handleUpdateProfileSubmit = async function(event) {
  event.preventDefault();
  if (!window.activeUserProfile) return;
  const btn = document.getElementById("btn-submit-profile");
  btn.disabled = true; btn.textContent = "Menyimpan...";
  
  const namaLengkap = document.getElementById("prof-nama-lengkap").value.trim().toUpperCase();
  const namaPanggilan = document.getElementById("prof-nama-panggilan").value.trim();
  const jenisKelamin = document.getElementById("prof-jenis-kelamin").value;
  const tanggalLahir = document.getElementById("prof-tanggal-lahir").value;
  const kelas = document.getElementById("prof-kelas").value.trim();
  const tahunBergabung = document.getElementById("prof-tahun-bergabung").value.trim();
  const nisn = document.getElementById("prof-nisn").value.trim() || null;
  const golonganDarah = document.getElementById("prof-golongan-darah").value || null;
  const rhesusDarah = document.getElementById("prof-rhesus-darah").value || null;
  const riwayatPenyakit = document.getElementById("prof-riwayat-penyakit").value.trim() || null;
  const noWaPribadi = document.getElementById("prof-wa-pribadi").value.trim() || null;
  const noWaOrtu = document.getElementById("prof-wa-ortu").value.trim() || null;
  const fotoInput = document.getElementById("prof-foto");
  const newPassword = document.getElementById("prof-new-password")?.value.trim();
  
  try {
    let fotoUrl = window.activeUserProfile.foto_profil_url;
    if (fotoInput.files && fotoInput.files[0]) {
      const file = fotoInput.files[0];
      
      // [KEAMANAN] Validasi Tipe Ekstensi File
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        throw new Error("Tipe file tidak diizinkan. Hanya menerima format gambar (JPG, PNG, WebP).");
      }
      
      const compressedBlob = await window.compressProfileImage(file);
      const fileName = `foto_${window.activeUserProfile.id}_${crypto.randomUUID()}.jpg`;
      
      const { error: uploadErr } = await window.db.storage.from("profil-anggota")
        .upload(fileName, compressedBlob, { contentType: "image/jpeg" });
      
      if (uploadErr) throw new Error(uploadErr.message);
      
      const { data: publicUrlData } = window.db.storage.from("profil-anggota").getPublicUrl(fileName);
      fotoUrl = publicUrlData.publicUrl;
    }
    
    if (newPassword) {
      if (newPassword.length < 6) {
        throw new Error("Kata sandi baru minimal harus 6 karakter.");
      }
      const { error: passErr } = await window.db.auth.updateUser({ password: newPassword });
      if (passErr) throw passErr;
    }
    
    const { error: updateErr } = await window.db.from("users_profile").update({
      nama_lengkap: namaLengkap, nama_panggilan: namaPanggilan, jenis_kelamin: jenisKelamin,
      tanggal_lahir: tanggalLahir, kelas: kelas, tahun_bergabung: tahunBergabung,
      nisn: nisn, golongan_darah: golonganDarah, rhesus_darah: rhesusDarah,
      riwayat_penyakit: riwayatPenyakit, no_wa_pribadi: noWaPribadi, no_wa_ortu: noWaOrtu,
      foto_profil_url: fotoUrl
    }).eq("id", window.activeUserProfile.id);
    
    if (updateErr) throw updateErr;
    
    alert("Profil dan perubahan akun berhasil disimpan!");
    window.closeEditProfileModal();
    await window.verifySessionAndLoadUser();
    window.navigateMenu("dashboard");
  } catch (err) {
    alert("Gagal memperbarui profil: " + err.message);
  } finally {
    btn.disabled = false; btn.textContent = "Simpan Perubahan";
  }
};