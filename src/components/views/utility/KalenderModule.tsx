import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { supabase } from '../../../services/supabase';
import { AgendaKegiatan } from '../../../types';
import {
  CalendarDays,
  CalendarPlus,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Sparkles,
  MapPin,
  Clock,
  Trash2,
  X,
  AlertTriangle,
  Loader2
} from 'lucide-react';
import { canManageAgenda, sanitizeText } from '../../../utils/security';

interface KalenderModuleProps {
  onClose?: () => void;
}

export const KalenderModule: React.FC<KalenderModuleProps> = () => {
  const { profile } = useAuth();
  const [agendas, setAgendas] = useState<AgendaKegiatan[]>([]);
  const [loading, setLoading] = useState(true);
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [selectedDateStr, setSelectedDateStr] = useState<string | null>(null);

  // Delete Confirmation Modal State
  const [agendaToDelete, setAgendaToDelete] = useState<AgendaKegiatan | null>(null);
  const [isDeletingAgenda, setIsDeletingAgenda] = useState(false);

  // Toast State
  const [toastMsg, setToastMsg] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToastMsg({ message, type });
    setTimeout(() => setToastMsg(null), 4000);
  };

  // Add Agenda Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [judul, setJudul] = useState('');
  const [kategori, setKategori] = useState('Latihan Rutin');
  const [prioritas, setPrioritas] = useState('Normal');
  const [tanggalMulai, setTanggalMulai] = useState(new Date().toISOString().split('T')[0]);
  const [tanggalSelesai, setTanggalSelesai] = useState('');
  const [waktuKegiatan, setWaktuKegiatan] = useState('');
  const [lokasi, setLokasi] = useState('');
  const [keterangan, setKeterangan] = useState('');
  const [tampilkanDashboard, setTampilkanDashboard] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const canManage = canManageAgenda(profile);

  const loadAgendas = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('agenda_kegiatan')
        .select('*')
        .order('tanggal_mulai', { ascending: true });

      if (error) throw error;
      setAgendas((data as AgendaKegiatan[]) || []);
    } catch (err: any) {
      console.error('Error loading agendas:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAgendas();
  }, []);

  const changeMonth = (delta: number) => {
    setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() + delta, 1));
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { error } = await supabase.from('agenda_kegiatan').insert({
        judul: sanitizeText(judul),
        kategori,
        prioritas,
        tanggal_mulai: tanggalMulai,
        tanggal_selesai: tanggalSelesai || null,
        waktu_kegiatan: sanitizeText(waktuKegiatan) || null,
        lokasi: sanitizeText(lokasi) || null,
        keterangan: sanitizeText(keterangan) || null,
        tampilkan_di_dashboard: tampilkanDashboard
      });

      if (error) throw error;

      showToast('Agenda kegiatan berhasil ditambahkan!', 'success');
      setIsAddModalOpen(false);
      setJudul('');
      setKeterangan('');
      setWaktuKegiatan('');
      setLokasi('');
      setTampilkanDashboard(false);
      await loadAgendas();
    } catch (err: any) {
      showToast('Gagal menambahkan agenda: ' + err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmDeleteAgenda = async () => {
    if (!agendaToDelete) return;
    if (!canManage) return;

    setIsDeletingAgenda(true);
    try {
      const { error } = await supabase.from('agenda_kegiatan').delete().eq('id', agendaToDelete.id);
      if (error) throw error;
      showToast('Agenda kegiatan berhasil dihapus.', 'success');
      setAgendaToDelete(null);
      await loadAgendas();
    } catch (err: any) {
      showToast('Gagal menghapus agenda: ' + err.message, 'error');
    } finally {
      setIsDeletingAgenda(false);
    }
  };

  const year = calendarDate.getFullYear();
  const month = calendarDate.getMonth();
  const namaBulan = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  const namaBulanSingkat = ['JAN', 'FEB', 'MAR', 'APR', 'MEI', 'JUN', 'JUL', 'AGU', 'SEP', 'OKT', 'NOV', 'DES'];
  const namaHariSingkat = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

  const getCategoryColor = (kategori: string) => {
    const kat = (kategori || '').toLowerCase();
    if (kat.includes('latihan')) return '#f97316'; // orange
    if (kat.includes('upacara')) return '#e11d48'; // red
    if (kat.includes('pengumuman')) return '#8b5cf6'; // purple
    if (kat.includes('sosial') || kat.includes('baksos')) return '#10b981'; // emerald
    if (kat.includes('lomba')) return '#0284c7'; // blue
    if (kat.includes('diklat') || kat.includes('pelatihan')) return '#0d9488'; // teal
    if (kat.includes('rapat')) return '#6366f1'; // indigo
    return '#f43f5e';
  };

  const getCategoryBadge = (kategori: string) => {
    const kat = (kategori || '').toLowerCase();
    if (kat.includes('latihan')) return { bg: '#fff7ed', color: '#c2410c', border: '#fed7aa', emoji: '🏃', label: 'Latihan Rutin' };
    if (kat.includes('upacara')) return { bg: '#fff1f2', color: '#be123c', border: '#fecdd3', emoji: '🇮🇩', label: 'Tugas Upacara' };
    if (kat.includes('pengumuman')) return { bg: '#f5f3ff', color: '#6d28d9', border: '#ddd6fe', emoji: '📢', label: 'Pengumuman' };
    if (kat.includes('sosial') || kat.includes('baksos')) return { bg: '#ecfdf5', color: '#047857', border: '#a7f3d0', emoji: '🤝', label: 'Bakti Sosial' };
    if (kat.includes('lomba')) return { bg: '#f0f9ff', color: '#0369a1', border: '#bae6fd', emoji: '🏆', label: 'Lomba PMR' };
    if (kat.includes('diklat') || kat.includes('pelatihan')) return { bg: '#f0fdfa', color: '#0f766e', border: '#99f6e4', emoji: '🎓', label: 'Diklat / Pelatihan' };
    if (kat.includes('rapat')) return { bg: '#eef2ff', color: '#4338ca', border: '#c7d2fe', emoji: '👥', label: 'Rapat Organisasi' };
    return { bg: '#f8fafc', color: '#475569', border: '#e2e8f0', emoji: '📌', label: kategori || 'Agenda' };
  };

  const firstDayIndex = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();

  const eventsByDay: Record<number, AgendaKegiatan[]> = {};
  agendas.forEach(ag => {
    if (ag.tanggal_mulai) {
      const [tY, tM, tD] = ag.tanggal_mulai.split('-').map(Number);
      if (tY === year && tM - 1 === month) {
        if (!eventsByDay[tD]) eventsByDay[tD] = [];
        eventsByDay[tD].push(ag);
      }
    }
  });

  const todayStr = new Date().toISOString().split('T')[0];
  const displayedItems = selectedDateStr
    ? agendas.filter(a => a.tanggal_mulai === selectedDateStr)
    : agendas.filter(a => (a.tanggal_mulai >= todayStr || (a.tanggal_selesai && a.tanggal_selesai >= todayStr)));

  return (
    <div className="agenda-module-wrapper">
      <div className="agenda-top-bar">
        <div className="agenda-top-title">
          <div className="agenda-icon-cube">
            <CalendarDays style={{ width: 22, height: 22 }} />
          </div>
          <div>
            <h3>Kalender & Agenda Kegiatan</h3>
            <p>Jadwal latihan, tugas upacara, pengumuman resmi, dan aksi kemanusiaan PMR SPADAN.</p>
          </div>
        </div>

        {canManage && (
          <button
            type="button"
            className="btn-agenda-add"
            onClick={() => setIsAddModalOpen(true)}
          >
            <CalendarPlus style={{ width: 16, height: 16 }} /> Tambah Agenda
          </button>
        )}
      </div>

      {toastMsg && (
        <div className={`presensi-toast-banner ${toastMsg.type}`}>
          <span>{toastMsg.message}</span>
          <button
            type="button"
            onClick={() => setToastMsg(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontWeight: 800 }}
          >
            ✕
          </button>
        </div>
      )}

      <div className="agenda-main-layout">
        {/* KALENDER VISUAL */}
        <div className="cal-board-card">
          <div className="cal-nav-bar">
            <button
              type="button"
              className="cal-nav-btn"
              onClick={() => changeMonth(-1)}
              title="Bulan Sebelumnya"
            >
              <ChevronLeft style={{ width: 16, height: 16 }} />
            </button>
            <div className="cal-month-center-group">
              <div className="cal-month-indicator">
                <Calendar style={{ width: 16, height: 16, color: '#059669' }} />
                <span>{namaBulan[month]} {year}</span>
              </div>
              <button
                type="button"
                className="btn-jump-today"
                onClick={() => {
                  setCalendarDate(new Date());
                  setSelectedDateStr(null);
                }}
                title="Lompat ke Bulan & Hari Ini"
              >
                <Sparkles style={{ width: 13, height: 13 }} /> Hari Ini
              </button>
            </div>
            <button
              type="button"
              className="cal-nav-btn"
              onClick={() => changeMonth(1)}
              title="Bulan Berikutnya"
            >
              <ChevronRight style={{ width: 16, height: 16 }} />
            </button>
          </div>

          <div className="cal-grid-frame">
            <div className="cal-weekdays-row">
              <span className="sun">Min</span>
              <span>Sen</span>
              <span>Sel</span>
              <span>Rab</span>
              <span>Kam</span>
              <span>Jum</span>
              <span className="sat">Sab</span>
            </div>

            <div className="cal-days-grid">
              {Array.from({ length: firstDayIndex }).map((_, i) => (
                <div key={`empty-${i}`} className="cal-cell empty" />
              ))}

              {Array.from({ length: daysInMonth }).map((_, i) => {
                const d = i + 1;
                const dayOfWeek = (firstDayIndex + d - 1) % 7;
                const isSunday = dayOfWeek === 0;
                const isSaturday = dayOfWeek === 6;
                const isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === d;
                const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                const isSelected = selectedDateStr === dateStr;
                const dayEvents = eventsByDay[d] || [];
                const hasEvents = dayEvents.length > 0;

                return (
                  <div
                    key={`day-${d}`}
                    className={`cal-cell ${isToday ? 'today' : ''} ${isSunday ? 'is-sun' : ''} ${isSaturday ? 'is-sat' : ''} ${hasEvents ? 'has-event' : ''} ${isSelected ? 'selected' : ''}`}
                    onClick={() => setSelectedDateStr(dateStr)}
                    title={hasEvents ? `${d} ${namaBulan[month]}: ${dayEvents.length} kegiatan` : undefined}
                  >
                    <div className="cal-cell-header">
                      <span className="cal-cell-num">{d}</span>
                      {isToday && <span className="cal-today-dot" title="Hari Ini" />}
                    </div>

                    {hasEvents && (
                      <div className="cal-dots-container">
                        {dayEvents.slice(0, 3).map((ev, idx) => (
                          <span
                            key={idx}
                            className="cal-event-dot"
                            style={{ backgroundColor: getCategoryColor(ev.kategori) }}
                            title={ev.judul}
                          />
                        ))}
                        {dayEvents.length > 3 && (
                          <span className="cal-dots-count">+{dayEvents.length - 3}</span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="cal-legend-footer">
            <div className="cal-legend-items">
              <div>
                <span className="leg-box" style={{ background: '#fef3c7', border: '1.5px solid #f59e0b' }} /> Hari Ini
              </div>
              <div>
                <span className="cal-event-dot" style={{ backgroundColor: '#e11d48', width: 8, height: 8 }} /> Ada Kegiatan
              </div>
            </div>
            <div className="cal-legend-hint">
              💡 Ketuk tanggal untuk rincian
            </div>
          </div>
        </div>

        {/* DAFTAR AGENDA */}
        <div className="agenda-list-panel">
          <div className="agenda-panel-header">
            <div className="agenda-panel-header-top">
              <div className="agenda-panel-title">
                <Sparkles style={{ width: 16, height: 16, color: '#059669' }} />
                <span>Agenda Kegiatan</span>
              </div>
              <span className="agenda-count-badge">
                {displayedItems.length} Agenda
              </span>
            </div>

            {selectedDateStr && (
              <div className="agenda-filter-active-strip">
                <span>
                  📅 Tanggal: {selectedDateStr.split('-').reverse().join('/')} ({displayedItems.length} Kegiatan)
                </span>
                <button
                  type="button"
                  className="btn-clear-date-filter"
                  onClick={() => setSelectedDateStr(null)}
                >
                  ✕ Lihat Semua
                </button>
              </div>
            )}
          </div>

          <div className="agenda-cards-container">
            {loading ? (
              <div style={{ textAlign: 'center', color: '#94a3b8', padding: '35px 10px', fontSize: '12px' }}>
                Memeriksa jadwal kegiatan...
              </div>
            ) : displayedItems.length === 0 ? (
              <div className="agenda-empty-card">
                <div className="agenda-empty-icon">
                  <Calendar style={{ width: 22, height: 22 }} />
                </div>
                <div className="agenda-empty-title">
                  {selectedDateStr ? 'Tidak ada agenda di tanggal ini' : 'Belum ada agenda kegiatan'}
                </div>
                <div className="agenda-empty-sub">
                  {selectedDateStr
                    ? 'Pilih tanggal lain atau klik "Lihat Semua" untuk melihat agenda mendatang.'
                    : 'Gunakan tombol "+ Tambah Agenda" di atas untuk menambahkan jadwal kegiatan PMR baru.'}
                </div>
              </div>
            ) : (
              displayedItems.map(item => {
                let day = '-';
                let mon = '-';
                let weekday = '';
                if (item.tanggal_mulai) {
                  const parts = item.tanggal_mulai.split('-');
                  if (parts.length === 3) {
                    day = String(parseInt(parts[2], 10));
                    mon = namaBulanSingkat[parseInt(parts[1], 10) - 1] || '-';
                    const dt = new Date(`${item.tanggal_mulai}T00:00:00`);
                    weekday = namaHariSingkat[dt.getDay()] || '';
                  }
                }

                const catBadge = getCategoryBadge(item.kategori);

                let prioStyle = { background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1' };
                const prio = (item.prioritas || 'Normal').toLowerCase();
                if (prio === 'penting') prioStyle = { background: '#fef3c7', color: '#b45309', border: '1px solid #fde68a' };
                else if (prio === 'sangat penting') prioStyle = { background: '#fee2e2', color: '#b91c1c', border: '1px solid #fecaca' };
                else if (prio === 'wajib') prioStyle = { background: '#991b1b', color: '#ffffff', border: 'none' };

                return (
                  <div key={item.id} className="agenda-card-item">
                    <div className="agenda-ticket-date">
                      <div className="agenda-ticket-month">{mon}</div>
                      <div className="agenda-ticket-day">{day}</div>
                      {weekday && <div className="agenda-ticket-weekday">{weekday}</div>}
                    </div>

                    <div className="agenda-info-col">
                      <div className="agenda-badge-row">
                        <span
                          className="agenda-cat-badge"
                          style={{
                            background: catBadge.bg,
                            color: catBadge.color,
                            border: `1px solid ${catBadge.border}`
                          }}
                        >
                          <span>{catBadge.emoji}</span>
                          <span>{catBadge.label}</span>
                        </span>
                        <span className="agenda-prio-badge" style={prioStyle}>
                          {item.prioritas || 'Normal'}
                        </span>
                      </div>

                      <div className="agenda-item-title">{item.judul}</div>

                      {(item.waktu_kegiatan || item.lokasi) && (
                        <div className="agenda-meta-details">
                          {item.waktu_kegiatan && (
                            <span className="agenda-meta-item">
                              <Clock style={{ width: 12, height: 12, color: '#059669' }} /> {item.waktu_kegiatan}
                            </span>
                          )}
                          {item.lokasi && (
                            <span className="agenda-meta-item">
                              <MapPin style={{ width: 12, height: 12, color: '#e11d48' }} /> {item.lokasi}
                            </span>
                          )}
                        </div>
                      )}

                      {item.keterangan && (
                        <div className="agenda-desc-text">{item.keterangan}</div>
                      )}
                    </div>

                    {canManage && (
                      <button
                        type="button"
                        onClick={() => setAgendaToDelete(item)}
                        title="Hapus Agenda"
                        className="btn-agenda-delete"
                      >
                        <Trash2 style={{ width: 14, height: 14 }} />
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* MODAL TAMBAH AGENDA */}
      {isAddModalOpen && (
        <div className="agenda-modal-backdrop" style={{ display: 'flex' }}>
          <div className="agenda-modal-card">
            <div className="agenda-modal-header">
              <h3 style={{ margin: 0, fontSize: 14, fontWeight: 800 }}>Tambah Agenda Baru</h3>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                style={{ background: 'none', border: 'none', color: '#fff', fontSize: 20, cursor: 'pointer' }}
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleAddSubmit}>
              <div className="agenda-modal-body">
                <div className="agenda-form-group">
                  <label>Judul Kegiatan / Pengumuman *</label>
                  <input
                    type="text"
                    value={judul}
                    onChange={(e) => setJudul(e.target.value)}
                    placeholder="Contoh: Latihan Rutin Pertolongan Pertama"
                    required
                  />
                </div>

                <div className="agenda-form-grid">
                  <div className="agenda-form-group">
                    <label>Kategori *</label>
                    <select
                      value={kategori}
                      onChange={(e) => setKategori(e.target.value)}
                      required
                    >
                      <option value="Pengumuman">Pengumuman</option>
                      <option value="Latihan Rutin">Latihan Rutin</option>
                      <option value="Tugas Upacara">Tugas Upacara</option>
                      <option value="Bakti Sosial">Bakti Sosial</option>
                      <option value="Lomba PMR">Lomba PMR</option>
                      <option value="Diklat / Pelatihan">Diklat / Pelatihan</option>
                      <option value="Rapat Organisasi">Rapat Organisasi</option>
                      <option value="Lainnya">Lainnya</option>
                    </select>
                  </div>

                  <div className="agenda-form-group">
                    <label>Prioritas *</label>
                    <select
                      value={prioritas}
                      onChange={(e) => setPrioritas(e.target.value)}
                      required
                    >
                      <option value="Normal">Normal</option>
                      <option value="Penting">Penting</option>
                      <option value="Sangat Penting">Sangat Penting</option>
                      <option value="Wajib">Wajib</option>
                    </select>
                  </div>
                </div>

                <div className="agenda-form-grid">
                  <div className="agenda-form-group">
                    <label>Tanggal Mulai *</label>
                    <input
                      type="date"
                      value={tanggalMulai}
                      onChange={(e) => setTanggalMulai(e.target.value)}
                      required
                    />
                  </div>
                  <div className="agenda-form-group">
                    <label>Tanggal Selesai (Opsional)</label>
                    <input
                      type="date"
                      value={tanggalSelesai}
                      onChange={(e) => setTanggalSelesai(e.target.value)}
                    />
                  </div>
                </div>

                <div className="agenda-form-grid">
                  <div className="agenda-form-group">
                    <label>Waktu (Jam)</label>
                    <input
                      type="text"
                      value={waktuKegiatan}
                      onChange={(e) => setWaktuKegiatan(e.target.value)}
                      placeholder="Contoh: 08:00 - 11:30 WITA"
                    />
                  </div>
                  <div className="agenda-form-group">
                    <label>Lokasi / Tempat</label>
                    <input
                      type="text"
                      value={lokasi}
                      onChange={(e) => setLokasi(e.target.value)}
                      placeholder="Contoh: Lapangan Utama / UKS"
                    />
                  </div>
                </div>

                <div className="agenda-form-group">
                  <label>Keterangan / Perlengkapan</label>
                  <textarea
                    value={keterangan}
                    onChange={(e) => setKeterangan(e.target.value)}
                    rows={2}
                    placeholder="Catatan tugas, pakaian seragam, atau hal penting..."
                  />
                </div>

                <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: 10, border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input
                    type="checkbox"
                    id="chk-dashboard"
                    checked={tampilkanDashboard}
                    onChange={(e) => setTampilkanDashboard(e.target.checked)}
                    style={{ width: 16, height: 16, cursor: 'pointer' }}
                  />
                  <label htmlFor="chk-dashboard" style={{ fontSize: '11.5px', fontWeight: 700, color: '#334155', cursor: 'pointer' }}>
                    Tampilkan di banner Dashboard utama
                  </label>
                </div>
              </div>

              <div className="agenda-modal-footer">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  style={{ background: '#e2e8f0', color: '#333', border: 'none', padding: '8px 16px', borderRadius: 8, fontWeight: 700, cursor: 'pointer' }}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{ background: '#059669', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: 8, fontWeight: 800, cursor: 'pointer' }}
                >
                  {submitting ? 'Menyimpan...' : 'Simpan Agenda'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE AGENDA CONFIRMATION MODAL */}
      {agendaToDelete && (
        <div className="agenda-modal-backdrop" style={{ display: 'flex', zIndex: 99999 }}>
          <div className="agenda-modal-card" style={{ maxWidth: 440 }}>
            <div className="agenda-modal-header" style={{ background: '#7f1d1d', color: '#ffffff' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <AlertTriangle style={{ width: 18, height: 18, color: '#fca5a5' }} />
                <h3 style={{ margin: 0, fontSize: 14, fontWeight: 800 }}>Konfirmasi Hapus Agenda</h3>
              </div>
              <button
                type="button"
                onClick={() => !isDeletingAgenda && setAgendaToDelete(null)}
                style={{ background: 'none', border: 'none', color: '#ffffff', cursor: 'pointer' }}
              >
                <X style={{ width: 18, height: 18 }} />
              </button>
            </div>

            <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <p style={{ margin: 0, fontSize: 13, color: '#334155', lineHeight: 1.5 }}>
                Apakah Anda yakin ingin menghapus agenda kegiatan berikut?
              </p>

              <div style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: 12, padding: '12px 14px', fontSize: 12, display: 'flex', flexDirection: 'column', gap: 5 }}>
                <div><b style={{ color: '#0f172a', fontSize: 13 }}>{agendaToDelete.judul}</b></div>
                <div style={{ color: '#64748b' }}>📅 {agendaToDelete.tanggal_mulai} {agendaToDelete.waktu_kegiatan ? `· ⏰ ${agendaToDelete.waktu_kegiatan}` : ''}</div>
                {agendaToDelete.lokasi && <div style={{ color: '#64748b' }}>📍 {agendaToDelete.lokasi}</div>}
              </div>
            </div>

            <div className="agenda-modal-footer">
              <button
                type="button"
                onClick={() => setAgendaToDelete(null)}
                disabled={isDeletingAgenda}
                style={{ background: '#e2e8f0', color: '#333', border: 'none', padding: '8px 16px', borderRadius: 8, fontWeight: 700, cursor: 'pointer' }}
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteAgenda}
                disabled={isDeletingAgenda}
                style={{ background: '#dc2626', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: 8, fontWeight: 800, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                {isDeletingAgenda ? (
                  <>
                    <Loader2 className="spin-anim" style={{ width: 14, height: 14 }} /> Menghapus...
                  </>
                ) : (
                  <>
                    <Trash2 style={{ width: 14, height: 14 }} /> Ya, Hapus Agenda
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
