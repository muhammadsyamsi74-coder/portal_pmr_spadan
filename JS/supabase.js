/**
 * ==============================================================================
 * KONFIGURASI KONEKSI SUPABASE (PORTAL PMR SPADAN)
 * Menggunakan kredensial database proyek Supabase SPADAN
 * ==============================================================================
 */

// Kredensial resmi proyek Supabase Anda
var SUPABASE_URL = "https://ndahxwqshyukqpnjkniw.supabase.co";
var SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5kYWh4d3FzaHl1a3Fwbmprbml3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkxNjEzODUsImV4cCI6MjEwNDczNzM4NX0.lkxXa2M16275nkjNKnWN3KE5NT7J1BVoyEO7xVAxJt8";

// Deklarasi variabel database global
var db = null;

// Inisialisasi koneksi Supabase
try {
  if (typeof supabase !== "undefined") {
    // Memasang instance Supabase ke objek window global browser
    window.db = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    db = window.db;
  } else {
    console.error("Pustaka CDN Supabase belum termuat di index.html");
  }
} catch (error) {
  console.error("Gagal menginisialisasi Supabase:", error.message);
}

/**
 * Mendapatkan data akun pengguna yang sedang aktif/login
 * @returns {Promise<Object|null>} Objek user atau null jika belum login
 */
async function getCurrentUser() {
  if (!db) {
    console.warn("Koneksi Supabase belum siap.");
    return null;
  }

  try {
    const { data: { user }, error } = await db.auth.getUser();
    if (error || !user) return null;
    return user;
  } catch (err) {
    console.error("Gagal memeriksa status login:", err.message);
    return null;
  }
}

/**
 * Mengambil informasi detail profil anggota dari tabel 'users_profile'
 * @returns {Promise<Object|null>} Data baris profil anggota
 */
async function getCurrentUserProfile() {
  const user = await getCurrentUser();
  if (!user || !db) return null;

  try {
    const { data, error } = await db
      .from("users_profile")
      .select("*")
      .eq("id", user.id)
      .single();

    if (error) {
      console.warn("Data profil belum tersedia di tabel users_profile:", error.message);
      return null;
    }
    return data;
  } catch (err) {
    console.error("Gagal mengambil data users_profile:", err.message);
    return null;
  }
}

/**
 * Keluar dari akun pengguna dan memuat ulang halaman
 */
async function logoutUser() {
  if (!db) return;

  const konfirmasi = confirm("Apakah Anda yakin ingin keluar dari sistem?");
  if (!konfirmasi) return;

  try {
    const { error } = await db.auth.signOut();
    if (error) throw error;
    window.location.reload();
  } catch (err) {
    alert("Gagal keluar: " + err.message);
  }
}