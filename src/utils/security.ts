import { UserProfile } from '../types';

/**
 * Sanitasi string untuk mencegah script injection
 */
export function sanitizeText(input: unknown): string {
  if (input === null || input === undefined) return '';
  const str = String(input);
  return str
    .replace(/[<>]/g, '') // Strip < and > to prevent tag injection
    .trim();
}

/**
 * Validasi URL agar hanya mengizinkan protokol http/https
 */
export function isSafeUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url, window.location.origin);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Validasi File Gambar (MIME, Extension, Size)
 */
export const ALLOWED_IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export function validateImageFile(file: File): { valid: boolean; error?: string } {
  if (!file) {
    return { valid: false, error: 'Berkas tidak ditemukan.' };
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return { valid: false, error: 'Ukuran berkas melebihi batas maksimal 5 MB.' };
  }

  if (!ALLOWED_IMAGE_MIME_TYPES.includes(file.type)) {
    return { valid: false, error: 'Format berkas tidak diizinkan. Hanya menerima gambar (JPG, PNG, WebP).' };
  }

  const extension = file.name.split('.').pop()?.toLowerCase();
  const validExtensions = ['jpg', 'jpeg', 'png', 'webp'];
  if (!extension || !validExtensions.includes(extension)) {
    return { valid: false, error: 'Ekstensi berkas tidak valid.' };
  }

  return { valid: true };
}

/**
 * Kompresi Gambar menggunakan Canvas HTML5
 * Membersihkan metadata EXIF berbahaya dan mereduksi ukuran piksel
 */
export function compressImage(
  file: File,
  maxDimension: number = 400,
  quality: number = 0.75
): Promise<{ blob: Blob; dataUrl: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Gagal membaca berkas gambar.'));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Format berkas gambar rusak atau tidak terbaca.'));
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxDimension) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          }
        } else {
          if (height > maxDimension) {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return reject(new Error('Gagal menginisialisasi canvas grafis.'));
        }

        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              return reject(new Error('Gagal mengompresi gambar.'));
            }
            resolve({ blob, dataUrl: canvas.toDataURL('image/jpeg', quality) });
          },
          'image/jpeg',
          quality
        );
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Format tanggal Indonesia
 */
export function formatTanggalIndo(tglStr: string | null | undefined, includeDay: boolean = true): string {
  if (!tglStr) return '-';
  try {
    const date = new Date(tglStr);
    if (isNaN(date.getTime())) return tglStr;
    const options: Intl.DateTimeFormatOptions = {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    };
    if (includeDay) options.weekday = 'long';
    return date.toLocaleDateString('id-ID', options);
  } catch {
    return tglStr;
  }
}

/**
 * Format tanggal ringkas (DD/MM/YYYY)
 */
export function formatTanggalSimple(tglStr: string | null | undefined): string {
  if (!tglStr) return '-';
  try {
    const parts = tglStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    const d = new Date(tglStr);
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  } catch {
    return tglStr;
  }
}

/* ==============================================================================
   HAK AKSES / RBAC (ROLE-BASED ACCESS CONTROL)
   ============================================================================== */

export function isNonAktif(profile: UserProfile | null): boolean {
  if (!profile) return false;
  const role = (profile.jabatan || '').toLowerCase();
  const ket = (profile.keterangan_jabatan || '').toLowerCase();
  return role === 'non-aktif' || ket === 'non-aktif';
}

export function isAdmin(profile: UserProfile | null): boolean {
  if (!profile || isNonAktif(profile)) return false;
  const role = (profile.jabatan || '').toLowerCase();
  const ket = (profile.keterangan_jabatan || '').toLowerCase();
  return role === 'admin' || ket.includes('pembina');
}

export function isPengurus(profile: UserProfile | null): boolean {
  if (!profile || isNonAktif(profile)) return false;
  const role = (profile.jabatan || '').toLowerCase();
  const ket = (profile.keterangan_jabatan || '').toLowerCase();
  return (
    isAdmin(profile) ||
    role === 'pengurus' ||
    ket.includes('pelatih') ||
    ket.includes('ketua') ||
    ket.includes('wakil') ||
    ket.includes('sekretaris') ||
    ket.includes('bendahara')
  );
}

export function isAlumni(profile: UserProfile | null): boolean {
  if (!profile) return false;
  const role = (profile.jabatan || '').toLowerCase();
  const ket = (profile.keterangan_jabatan || '').toLowerCase();
  return ket.includes('alumni') || role.includes('alumni');
}

export function canManageMembers(profile: UserProfile | null): boolean {
  if (!profile) return false;
  if (isAlumni(profile) || isNonAktif(profile)) return false;
  return isPengurus(profile);
}

export function canManagePresensi(profile: UserProfile | null): boolean {
  if (!profile) return false;
  if (isAlumni(profile) || isNonAktif(profile)) return false;
  return isPengurus(profile);
}

export function canManageAgenda(profile: UserProfile | null): boolean {
  if (!profile) return false;
  if (isAlumni(profile) || isNonAktif(profile)) return false;
  return isPengurus(profile);
}

export function canManageMateri(profile: UserProfile | null): boolean {
  if (!profile) return false;
  if (isAlumni(profile) || isNonAktif(profile)) return false;
  return isPengurus(profile);
}

export function canAccessReporting(profile: UserProfile | null): boolean {
  if (!profile) return false;
  if (isAlumni(profile) || isNonAktif(profile)) return false;
  return true; // Anggota aktif, pengurus, dan admin boleh akses
}

export function canAccessKTA(profile: UserProfile | null): boolean {
  if (!profile) return false;
  return !isNonAktif(profile); // Alumni dan anggota aktif boleh cetak KTA
}
