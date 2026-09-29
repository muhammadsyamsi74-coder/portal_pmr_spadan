import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { supabase } from '../../../services/supabase';
import { MateriPmr } from '../../../types';
import {
  BookOpen,
  Search,
  Plus,
  ExternalLink,
  Copy,
  Check,
  Pin,
  Edit3,
  Trash2,
  FileText
} from 'lucide-react';
import { canManageMateri, isSafeUrl, sanitizeText } from '../../../utils/security';

export const MateriModule: React.FC = () => {
  const { profile } = useAuth();
  const [materiList, setMateriList] = useState<MateriPmr[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchVal, setSearchVal] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Modal Add / Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [judulMateri, setJudulMateri] = useState('');
  const [urlMateri, setUrlMateri] = useState('');
  const [deskripsiSingkat, setDeskripsiSingkat] = useState('');
  const [isPinned, setIsPinned] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const canManage = canManageMateri(profile);

  const loadMateri = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('materi_pmr')
        .select('*')
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMateriList((data as MateriPmr[]) || []);
    } catch (err: any) {
      console.error('Error loading materi:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMateri();
  }, []);

  const handleCopyLink = (item: MateriPmr) => {
    navigator.clipboard.writeText(item.url_materi).then(() => {
      setCopiedId(item.id);
      setTimeout(() => setCopiedId(null), 1500);
    }).catch(() => {
      alert('Gagal menyalin tautan. Periksa izin clipboard peramban Anda.');
    });
  };

  const handleTogglePin = async (item: MateriPmr) => {
    if (!canManage) return;
    try {
      const { error } = await supabase
        .from('materi_pmr')
        .update({ is_pinned: !item.is_pinned })
        .eq('id', item.id);

      if (error) throw error;
      await loadMateri();
    } catch (err: any) {
      alert('Gagal mengubah sematan: ' + err.message);
    }
  };

  const handleDeleteMateri = async (id: string) => {
    if (!canManage) return;
    if (!window.confirm('Apakah Anda yakin ingin menghapus materi ini?')) return;

    try {
      const { error } = await supabase.from('materi_pmr').delete().eq('id', id);
      if (error) throw error;
      await loadMateri();
    } catch (err: any) {
      alert('Gagal menghapus: ' + err.message);
    }
  };

  const handleOpenAdd = () => {
    setEditingId(null);
    setJudulMateri('');
    setUrlMateri('');
    setDeskripsiSingkat('');
    setIsPinned(false);
    setModalError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: MateriPmr) => {
    setEditingId(item.id);
    setJudulMateri(item.judul_materi);
    setUrlMateri(item.url_materi);
    setDeskripsiSingkat(item.deskripsi_singkat || '');
    setIsPinned(Boolean(item.is_pinned));
    setModalError(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);

    const safe = isSafeUrl(urlMateri.trim());
    if (!safe) {
      setModalError('URL tidak valid. Harus diawali dengan http:// atau https://');
      return;
    }

    setSubmitting(true);
    try {
      const payload: Partial<MateriPmr> = {
        judul_materi: sanitizeText(judulMateri),
        url_materi: urlMateri.trim(),
        deskripsi_singkat: sanitizeText(deskripsiSingkat) || null,
        is_pinned: isPinned
      };

      if (editingId) {
        const { error } = await supabase
          .from('materi_pmr')
          .update(payload)
          .eq('id', editingId);

        if (error) throw error;
        alert('Materi berhasil diperbarui!');
      } else {
        payload.created_by = profile?.id || null;
        const { error } = await supabase.from('materi_pmr').insert(payload);
        if (error) throw error;
        alert('Materi berhasil ditambahkan!');
      }

      setIsModalOpen(false);
      await loadMateri();
    } catch (err: any) {
      setModalError(err.message || 'Terjadi kesalahan sistem.');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredMateri = materiList.filter(item => {
    if (!searchVal) return true;
    const q = searchVal.toLowerCase();
    return (
      item.judul_materi.toLowerCase().includes(q) ||
      (item.deskripsi_singkat && item.deskripsi_singkat.toLowerCase().includes(q))
    );
  });

  return (
    <div className="materi-module-wrapper" style={{ width: '100%', padding: '16px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* HEADER BAR */}
      <div className="agenda-top-bar">
        <div className="agenda-top-title">
          <div className="agenda-icon-cube" style={{ background: '#eff6ff', borderColor: '#bfdbfe', color: '#2563eb' }}>
            <BookOpen style={{ width: 22, height: 22 }} />
          </div>
          <div>
            <h3>Pustaka Materi & Panduan Belajar</h3>
            <p>Kumpulan dokumen, modul diklat, materi pertolongan pertama, dan pedoman PMR.</p>
          </div>
        </div>

        {canManage && (
          <button
            type="button"
            className="btn-agenda-add"
            style={{ background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)' }}
            onClick={handleOpenAdd}
          >
            <Plus style={{ width: 16, height: 16 }} /> Tambah Materi
          </button>
        )}
      </div>

      {/* SEARCH TOOLBAR */}
      <div className="anggota-toolbar-card" style={{ padding: '10px 14px' }}>
        <div className="toolbar-search-box" style={{ maxWidth: '100%' }}>
          <Search style={{ width: 16, height: 16, color: '#94a3b8' }} />
          <input
            type="text"
            placeholder="Cari judul materi atau kata kunci bahasan..."
            value={searchVal}
            onChange={(e) => setSearchVal(e.target.value)}
          />
        </div>
      </div>

      {/* LIST MATERI */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
            Memuat materi pembelajaran...
          </div>
        ) : filteredMateri.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#94a3b8', padding: '40px', background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0' }}>
            Belum ada materi pembelajaran yang ditemukan.
          </div>
        ) : (
          filteredMateri.map(item => {
            const isCopied = copiedId === item.id;
            return (
              <div
                key={item.id}
                className={`materi-item-card ${item.is_pinned ? 'is-pinned-card' : ''}`}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, flex: 1, minWidth: 0 }}>
                  <div className="materi-icon-type">
                    <FileText style={{ width: 20, height: 20 }} />
                  </div>
                  <div className="materi-info-col">
                    <div className="materi-badges-row">
                      {item.is_pinned && (
                        <span className="pin-badge">
                          <Pin style={{ width: 10, height: 10 }} /> TERSEMAT
                        </span>
                      )}
                    </div>
                    <div className="materi-card-title">{item.judul_materi}</div>
                    {item.deskripsi_singkat && (
                      <div className="materi-card-desc">{item.deskripsi_singkat}</div>
                    )}
                  </div>
                </div>

                <div className="materi-actions-row">
                  {/* BUKA TAUTAN */}
                  <a
                    href={item.url_materi}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-icon-materi btn-icon-open"
                    title="Buka Materi di Tab Baru"
                  >
                    <ExternalLink style={{ width: 14, height: 14 }} />
                  </a>

                  {/* SALIN TAUTAN */}
                  <button
                    type="button"
                    className={`btn-icon-materi btn-icon-copy ${isCopied ? 'copied' : ''}`}
                    onClick={() => handleCopyLink(item)}
                    title={isCopied ? 'Tautan Disalin!' : 'Salin Tautan Materi'}
                  >
                    {isCopied ? (
                      <Check style={{ width: 14, height: 14, color: '#16a34a' }} />
                    ) : (
                      <Copy style={{ width: 14, height: 14 }} />
                    )}
                  </button>

                  {/* PIN (PENGURUS / ADMIN) */}
                  {canManage && (
                    <button
                      type="button"
                      className={`btn-icon-materi btn-icon-pin ${item.is_pinned ? 'active-pinned' : ''}`}
                      onClick={() => handleTogglePin(item)}
                      title={item.is_pinned ? 'Lepas Sematan' : 'Sematkan ke Atas'}
                    >
                      <Pin style={{ width: 14, height: 14 }} />
                    </button>
                  )}

                  {/* EDIT */}
                  {canManage && (
                    <button
                      type="button"
                      className="btn-icon-materi btn-icon-edit"
                      onClick={() => handleOpenEdit(item)}
                      title="Edit Materi"
                    >
                      <Edit3 style={{ width: 14, height: 14 }} />
                    </button>
                  )}

                  {/* HAPUS */}
                  {canManage && (
                    <button
                      type="button"
                      className="btn-icon-materi btn-icon-del"
                      onClick={() => handleDeleteMateri(item.id)}
                      title="Hapus Materi"
                    >
                      <Trash2 style={{ width: 14, height: 14 }} />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* MODAL TAMBAH / EDIT MATERI */}
      {isModalOpen && (
        <div className="agenda-modal-backdrop" style={{ display: 'flex' }}>
          <div className="agenda-modal-card">
            <div className="agenda-modal-header" style={{ background: '#2563eb' }}>
              <h3 style={{ margin: 0, fontSize: 14, fontWeight: 800 }}>
                {editingId ? 'Edit Materi Pembelajaran' : 'Tambah Pustaka Materi Baru'}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                style={{ background: 'none', border: 'none', color: '#fff', fontSize: 20, cursor: 'pointer' }}
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="agenda-modal-body">
                {modalError && (
                  <div style={{ background: '#fee2e2', color: '#b91c1c', padding: '10px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 600 }}>
                    {modalError}
                  </div>
                )}

                <div className="agenda-form-group">
                  <label>Judul Materi *</label>
                  <input
                    type="text"
                    value={judulMateri}
                    onChange={(e) => setJudulMateri(e.target.value)}
                    placeholder="Contoh: Modul Pertolongan Pertama PMR Madya"
                    required
                  />
                </div>

                <div className="agenda-form-group">
                  <label>Tautan URL Dokumen / Materi (Google Drive / Canva / Web) *</label>
                  <input
                    type="url"
                    value={urlMateri}
                    onChange={(e) => setUrlMateri(e.target.value)}
                    placeholder="https://drive.google.com/..."
                    required
                  />
                </div>

                <div className="agenda-form-group">
                  <label>Deskripsi Singkat (Opsional)</label>
                  <textarea
                    value={deskripsiSingkat}
                    onChange={(e) => setDeskripsiSingkat(e.target.value)}
                    rows={2}
                    placeholder="Ringkasan poin pembahasan materi..."
                  />
                </div>

                <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: 10, border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input
                    type="checkbox"
                    id="chk-pin"
                    checked={isPinned}
                    onChange={(e) => setIsPinned(e.target.checked)}
                    style={{ width: 16, height: 16, cursor: 'pointer' }}
                  />
                  <label htmlFor="chk-pin" style={{ fontSize: '11.5px', fontWeight: 700, color: '#334155', cursor: 'pointer' }}>
                    Sematkan di bagian paling atas (Pinned)
                  </label>
                </div>
              </div>

              <div className="agenda-modal-footer">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  style={{ background: '#e2e8f0', color: '#333', border: 'none', padding: '8px 16px', borderRadius: 8, fontWeight: 700, cursor: 'pointer' }}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{ background: '#2563eb', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: 8, fontWeight: 800, cursor: 'pointer' }}
                >
                  {submitting ? 'Menyimpan...' : (editingId ? 'Perbarui Materi' : 'Simpan Materi')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
