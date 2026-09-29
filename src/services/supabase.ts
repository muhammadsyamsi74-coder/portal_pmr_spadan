import { createClient } from '@supabase/supabase-js';

/**
 * ============================================================================
 * KONFIGURASI KONEKSI DATABASE & STORAGE SUPABASE
 * ============================================================================
 * Berkas ini bertanggung jawab menginisialisasi client Supabase untuk:
 * 1. Autentikasi Pengguna (Login, Register, Password Recovery, Sesi Auth)
 * 2. Operasi Database PostgreSQL (Tabel users_profile, presensi_sesi, presensi_kehadiran, agenda, uks, dll.)
 * 3. Supabase Storage (Unggah & Unduh Foto Profil, Foto Dokumentasi Presensi)
 *
 * Catatan Penggunaan Environment Variable:
 * - Mengambil nilai dari .env melalui `VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY`
 * - Memiliki nilai fallback default jika environment variable belum dikonfigurasi
 */

// URL endpoint server API Supabase proyek PMR SPADAN
export const SUPABASE_URL = 
  (import.meta as any)?.env?.VITE_SUPABASE_URL || "https://ndahxwqshyukqpnjkniw.supabase.co";

// Kunci publik anonim (Anon Key) untuk akses client-side yang aman
export const SUPABASE_ANON_KEY = 
  (import.meta as any)?.env?.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5kYWh4d3FzaHl1a3Fwbmprbml3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkxNjEzODUsImV4cCI6MjEwNDczNzM4NX0.lkxXa2M16275nkjNKnWN3KE5NT7J1BVoyEO7xVAxJt8";

// Inisialisasi instance client Supabase yang digunakan di seluruh aplikasi
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
