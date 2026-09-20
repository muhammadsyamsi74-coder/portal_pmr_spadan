/**
 * ==============================================================================
 * [CONTROLLER] MODUL CETAK KTA - PORTAL PMR SPADAN
 * ==============================================================================
 * Deskripsi:
 * Mengelola penarikan profil anggota dari Supabase, generator QR Code ID,
 * dan perenderan kartu identitas dua sisi standar CR-80 untuk dicetak.
 * ==============================================================================
 */

// [STATE]
window.ktaAnggotaList = [];
window.currentUserProfile = null;

/**
 * [HELPER] Resolver Klien Database
 * Mengambil objek database dari scope global, window.parent (iframe),
 * atau membuat koneksi mandiri sebagai cadangan terakhir.
 */
function getKtaDbClient() {
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

/**
 * [INISIALISASI] Memuat Data setelah DOM Siap
 */
document.addEventListener("DOMContentLoaded", async () => {
  await window.initKtaEngine();
});

window.initKtaEngine = async function() {
  await window.fetchActiveUser();
  const isAuthorized = window.validateKtaAccess();
  if (!isAuthorized) return;
  
  await window.fetchKtaData();
};

/**
 * [AUTH] Mengambil Data Pengguna yang Sedang Login
 */
window.fetchActiveUser = async function() {
  try {
    if (window.parent && window.parent.activeUserProfile) {
      window.currentUserProfile = window.parent.activeUserProfile;
      return;
    }
    
    // Jika ada fungsi global dari parent
    if (typeof getCurrentUserProfile === "function") {
      window.currentUserProfile = await getCurrentUserProfile();
    } else {
      // Fallback request ke Supabase mandiri
      const dbClient = getKtaDbClient();
      if (dbClient?.auth) {
        const { data: { user } } = await dbClient.auth.getUser();
        if (user) {
          const { data } = await dbClient.from("users_profile").select("*").eq("id", user.id).single();
          window.currentUserProfile = data;
        }
      }
    }
  } catch (e) {
    console.warn("[KTA] Gagal membaca profil aktif:", e);
  }
};

/**
 * [KONTROL] Validasi Hak Akses Modul
 */
window.validateKtaAccess = function() {
  const container = document.getElementById("kta-grid-list");
  const toolbar = document.querySelector(".kta-toolbar-clean");

  if (!window.currentUserProfile) {
    if (toolbar) toolbar.style.display = "none";
    if (container) {
      container.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 50px 20px; background: #fff; border-radius: 18px; border-top: 5px solid #be123c; box-shadow: 0 6px 20px rgba(0,0,0,0.04);">
          <div style="display: flex; justify-content: center; margin-bottom: 14px;">
            <i data-lucide="lock" style="width: 48px; height: 48px; color: #be123c;"></i>
          </div>
          <h3 style="font-size: 18px; font-weight: 900; color: #be123c; margin-bottom: 6px;">Akses Terbatas</h3>
          <p style="font-size: 12.5px; color: #64748b; max-width: 420px; margin: 0 auto;">Silakan masuk menggunakan akun PMR terdaftar untuk melihat dan mencetak Kartu Tanda Anggota (KTA).</p>
        </div>
      `;
      if (window.lucide) lucide.createIcons();
    }
    return false;
  }

  const role = (window.currentUserProfile.jabatan || "").toLowerCase();
  const ket = (window.currentUserProfile.keterangan_jabatan || "").toLowerCase();

  if (role === "non-aktif" || ket === "non-aktif") {
    if (toolbar) toolbar.style.display = "none";
    if (container) {
      container.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 50px 20px; background: #fff; border-radius: 18px; border-top: 5px solid #dc2626; box-shadow: 0 6px 20px rgba(0,0,0,0.04);">
          <div style="display: flex; justify-content: center; margin-bottom: 14px;">
            <i data-lucide="shield-alert" style="width: 48px; height: 48px; color: #dc2626;"></i>
          </div>
          <h3 style="font-size: 18px; font-weight: 900; color: #dc2626; margin-bottom: 6px;">Akun Belum Aktif</h3>
          <p style="font-size: 12.5px; color: #64748b; max-width: 420px; margin: 0 auto;">Status akun Anda masih menunggu persetujuan Pembina PMR SPADAN.</p>
        </div>
      `;
      if (window.lucide) lucide.createIcons();
    }
    return false;
  }
  return true;
};

/**
 * [DATA] Tarik Data Anggota dari Basis Data
 */
window.fetchKtaData = async function() {
  const container = document.getElementById("kta-grid-list");
  const dbClient = getKtaDbClient();

  if (!container) return;
  if (!dbClient) {
    container.innerHTML = `<div style="grid-column: 1 / -1; text-align: center; color: #dc2626; padding: 30px; font-weight: 700;">Koneksi Supabase tidak tersedia.</div>`;
    return;
  }

  try {
    const { data, error } = await dbClient
      .from("users_profile")
      .select("*")
      .order("nama_lengkap", { ascending: true });

    if (error) throw error;

    // Filter anggota valid
    const validMembers = (data || []).filter(u => {
      const ket = (u.keterangan_jabatan || "").toLowerCase();
      const jab = (u.jabatan || "").toLowerCase();
      return ket !== "non-aktif" && jab !== "non-aktif";
    });

    const userRole = (window.currentUserProfile?.jabatan || "").toLowerCase();
    const userKet = (window.currentUserProfile?.keterangan_jabatan || "").toLowerCase();
    const isAdmin = userRole === "admin" || userKet.includes("pembina");

    // Guest/Anggota biasa hanya bisa melihat KTA miliknya sendiri
    if (!isAdmin && window.currentUserProfile) {
      window.ktaAnggotaList = validMembers.filter(u => u.id === window.currentUserProfile.id);
      const filterWrapper = document.getElementById("kta-filter-wrapper");
      if (filterWrapper) filterWrapper.style.display = "none";
    } else {
      window.ktaAnggotaList = validMembers;
    }

    window.checkMissingPhotos();
    window.renderKtaCards(window.ktaAnggotaList);
  } catch (err) {
    console.error("[KTA] Gagal memuat data:", err);
    container.innerHTML = `<div style="grid-column: 1 / -1; text-align: center; color: #dc2626; padding: 30px; font-weight: 700;">Gagal memuat data: ${err.message}</div>`;
  }
};

/**
 * [UI] Periksa Ketersediaan Foto Profil Aktif
 */
window.checkMissingPhotos = function() {
  const alertContainer = document.getElementById("alert-photo-container");
  if (!alertContainer) return;

  const myData = window.ktaAnggotaList.find(u => u.id === window.currentUserProfile?.id);
  if (myData && !myData.foto_profil_url) {
    alertContainer.innerHTML = `
      <div class="alert-upload-photo">
        <i data-lucide="sparkles" style="width: 20px; height: 20px; flex-shrink: 0; color: #d97706;"></i>
        <span>Pas foto Anda belum diunggah. Silakan lengkapi melalui menu <b>Edit Profil</b> agar pas foto resmi Anda muncul di kartu identitas!</span>
      </div>
    `;
    if (window.lucide) lucide.createIcons();
  } else {
    alertContainer.innerHTML = "";
  }
};

/**
 * [FILTER] Pencarian KTA (Nama/Alumni/Aktif)
 */
window.filterKtaData = function() {
  const q = (document.getElementById("kta-search")?.value || "").toLowerCase();
  const katVal = document.getElementById("filter-kta-kategori")?.value || "";

  const filtered = window.ktaAnggotaList.filter(u => {
    const matchNama = (u.nama_lengkap || "").toLowerCase().includes(q) || (u.nama_panggilan || "").toLowerCase().includes(q);
    const ket = (u.keterangan_jabatan || "").toLowerCase();
    
    let matchKat = true;
    if (katVal === "alumni") {
      matchKat = ket.includes("alumni");
    } else if (katVal === "aktif") {
      matchKat = !ket.includes("alumni");
    }

    return matchNama && matchKat;
  });

  window.renderKtaCards(filtered);
};

window.formatTanggalLahir = function(tglStr) {
  if (!tglStr) return "-";
  const d = new Date(tglStr);
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
};

/**
 * [RENDER] Buat Elemen DOM Kartu Identitas
 */
window.renderKtaCards = function(list) {
  const container = document.getElementById("kta-grid-list");
  if (!container) return;

  if (list.length === 0) {
    container.innerHTML = `<div style="grid-column: 1 / -1; text-align: center; color: #94a3b8; padding: 40px; font-weight: 700;">Tidak ada kartu anggota yang ditemukan.</div>`;
    return;
  }

  const logoPmiUrl = "https://ndahxwqshyukqpnjkniw.supabase.co/storage/v1/object/public/profil-anggota/LOGO%20PMI%20untuk%20aplikasi.png";
  const logoSmpn8Url = "https://ndahxwqshyukqpnjkniw.supabase.co/storage/v1/object/public/utilitas_ikon/LOGO%20SMP%20NEGERI%208%20BALIKPAPAN%20-%20untuk%20website.png";

  container.innerHTML = list.map(user => {
    const ket = (user.keterangan_jabatan || "").toLowerCase();
    const isAlumni = ket.includes("alumni");
    const hasPhoto = Boolean(user.foto_profil_url && user.foto_profil_url.trim() !== "");

    const photoElement = hasPhoto 
      ? `<img src="${user.foto_profil_url}" class="front-photo" alt="Foto ${user.nama_lengkap}" />`
      : `
        <div class="photo-placeholder-box">
          <i data-lucide="user-x"></i>
          <span>Belum Ada Foto</span>
        </div>
      `;

    // Format Golongan Darah
    const hasBlood = Boolean(user.golongan_darah && user.golongan_darah.trim() !== "");
    const rhesusSymbol = user.rhesus_darah === 'Positif' ? '+' : (user.rhesus_darah === 'Negatif' ? '-' : '');
    const bloodDisplay = hasBlood ? `${user.golongan_darah}${rhesusSymbol}` : "-";

    const bloodBadgeHtml = hasBlood 
      ? `
        <div class="blood-badge-floating">
          <small>GOL</small>
          <b>${bloodDisplay}</b>
        </div>
      ` : "";

    // Badge Kartu
    const roleBadgeHtml = isAlumni 
      ? `<span class="alumni-banner-badge">ALUMNI PMR</span>`
      : `<span class="front-role-badge">${user.keterangan_jabatan || user.jabatan || 'Anggota'}</span>`;

    // QR Code Generation Content
    const statusTeks = isAlumni ? "ALUMNI RESMI" : "AKTIF";
    const qrTextContent = `KARTU IDENTITAS PMR SPADAN\n----------------------------\nNama: ${user.nama_lengkap}\nGolongan Darah: ${bloodDisplay}\nTanggal Lahir: ${window.formatTanggalLahir(user.tanggal_lahir)}\nID: ${user.id.substring(0, 8).toUpperCase()}\nTahun Bergabung: ${user.tahun_bergabung || '-'}\nKategori: ${isAlumni ? 'ALUMNI' : (user.keterangan_jabatan || user.jabatan || 'Anggota')}\nStatus: ${statusTeks}\n----------------------------\nSMP Negeri 8 Balikpapan`;
    const qrCodeApi = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=2&data=${encodeURIComponent(qrTextContent)}`;

    const cardCustomClass = isAlumni ? "alumni-card" : "";
    const watermarkHtml = isAlumni ? `<div class="alumni-watermark">ALUMNI</div>` : "";
    const headerTitle = isAlumni ? "KARTU TANDA ALUMNI" : "KARTU TANDA ANGGOTA";
    const headerSub = isAlumni ? "KORPS ALUMNI PMR SPADAN" : "SMP NEGERI 8 BALIKPAPAN";
    const btnPrintClass = isAlumni ? "btn-alumni" : "";

    return `
      <div class="kta-item-card">
        <div class="card-preview-pair">
          <!-- KARTU SISI DEPAN -->
          <div class="id-card id-card-front ${cardCustomClass}" id="card-front-${user.id}">
            ${watermarkHtml}
            <div class="front-header">
              <div class="header-logos-row">
                <img src="${logoPmiUrl}" class="header-logo-box" alt="Logo PMI" />
                <img src="${logoSmpn8Url}" class="header-logo-box" alt="Logo SMPN 8 Balikpapan" />
              </div>
              <h3>${headerTitle}</h3>
              <p>${headerSub}</p>
            </div>
            <div class="front-body">
              ${bloodBadgeHtml}
              ${photoElement}
              <div class="front-name">${user.nama_lengkap}</div>
              ${roleBadgeHtml}
            </div>
            <div class="front-footer">
              <img src="${qrCodeApi}" class="front-qr" alt="QR Code Anggota" title="Pindai untuk verifikasi status anggota" />
              <div class="front-id-col">
                <span>NOMOR IDENTITAS</span>
                <b>${user.id.substring(0, 8).toUpperCase()}</b>
                <span>TH. GABUNG: ${user.tahun_bergabung || '-'}</span>
              </div>
            </div>
          </div>

          <!-- KARTU SISI BELAKANG -->
          <div class="id-card id-card-back ${cardCustomClass}" id="card-back-${user.id}">
            <div class="back-header">
              <div class="header-logos-row">
                <img src="${logoPmiUrl}" class="header-logo-box" style="width: 20px; height: 20px;" alt="Logo PMI" />
                <img src="${logoSmpn8Url}" class="header-logo-box" style="width: 20px; height: 20px;" alt="Logo SMPN 8 Balikpapan" />
              </div>
              <h4>TRI BAKTI PMR</h4>
            </div>
            <div class="back-body">
              <div class="tri-bakti-box">
                <h4>TRI BAKTI PALANG MERAH REMAJA</h4>
                <ol>
                  <li>Meningkatkan keterampilan hidup sehat.</li>
                  <li>Berkarya dan berbakti di masyarakat.</li>
                  <li>Mempererat persahabatan nasional dan internasional.</li>
                </ol>
              </div>
              <div class="prinsip-title">7 PRINSIP DASAR KEPALANGMERAHAN</div>
              <div class="prinsip-grid">
                <span>Kemanusiaan</span>
                <span>Kesamaan</span>
                <span>Kenetralan</span>
                <span>Kemandirian</span>
                <span>Kesukarelaan</span>
                <span>Kesatuan</span>
                <span>Kesemestaan</span>
              </div>
            </div>
            <div class="back-footer">
              <p>${isAlumni ? 'Koordinator Korps Alumni' : 'Pembina PMR Madya'}</p>
              <b style="display:block; margin-top: 10px; text-decoration: underline;">SMP NEGERI 8 BALIKPAPAN</b>
            </div>
          </div>
        </div>

        <div class="card-actions">
          <button class="btn-print-kta ${btnPrintClass}" onclick="window.printKtaPair('${user.id}')">
            <i data-lucide="printer" style="width: 15px; height: 15px;"></i>
            <span>Cetak Kartu Bolak-Balik</span>
          </button>
        </div>
      </div>
    `;
  }).join("");

  if (window.lucide) lucide.createIcons();
};

/**
 * [AKSI CETAK] Memindahkan konten kartu ke Area Print
 */
window.printKtaPair = function(userId) {
  const frontHtml = document.getElementById(`card-front-${userId}`)?.outerHTML;
  const backHtml = document.getElementById(`card-back-${userId}`)?.outerHTML;

  if (!frontHtml || !backHtml) return;

  const printArea = document.getElementById("print-area");
  printArea.innerHTML = frontHtml + backHtml;
  
  window.print();
  
  printArea.innerHTML = "";
};