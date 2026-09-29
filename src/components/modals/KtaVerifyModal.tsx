import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../services/supabase';
import { UserProfile } from '../../types';
import { BadgeCheck, X } from 'lucide-react';
import { formatTanggalIndo } from '../../utils/security';

export const KtaVerifyModal: React.FC = () => {
  const { verifyMemberId, closeVerifyModal } = useAuth();
  const [member, setMember] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!verifyMemberId) {
      setMember(null);
      setNotFound(false);
      return;
    }

    const fetchMember = async () => {
      setLoading(true);
      setNotFound(false);
      try {
        const { data, error } = await supabase
          .from('users_profile')
          .select('nama_lengkap, golongan_darah, rhesus_darah, tanggal_lahir, id, tahun_bergabung, jabatan, keterangan_jabatan, foto_profil_url')
          .eq('id', verifyMemberId)
          .single();
        if (error || !data) {
          setNotFound(true);
        } else {
          setMember(data as UserProfile);
        }
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };

    fetchMember();
  }, [verifyMemberId]);

  if (!verifyMemberId) return null;

  const role = (member?.jabatan || '').toLowerCase();
  const ket = (member?.keterangan_jabatan || '').toLowerCase();
  const isAktif = role !== 'non-aktif' && ket !== 'non-aktif';
  const statusText = isAktif ? 'AKTIF' : 'NON-AKTIF';
  const statusColor = isAktif ? '#16a34a' : '#dc2626';

  const rhesus = member?.rhesus_darah === 'Positif' ? '+' : (member?.rhesus_darah === 'Negatif' ? '-' : '');
  const goldar = member?.golongan_darah ? `${member.golongan_darah}${rhesus}` : '-';

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      background: 'rgba(15,23,42,0.7)',
      zIndex: 99999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px'
    }}>
      <div style={{
        background: '#fff',
        width: '100%',
        maxWidth: '380px',
        borderRadius: '16px',
        overflow: 'hidden',
        boxShadow: '0 10px 40px rgba(0,0,0,0.25)'
      }}>
        <div style={{
          background: '#7f1d1d',
          color: '#fff',
          padding: '14px 18px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BadgeCheck style={{ width: '20px', height: '20px' }} />
            <h3 style={{ fontSize: '13px', fontWeight: 800 }}>VERIFIKASI ANGGOTA RESMI</h3>
          </div>
          <button
            onClick={closeVerifyModal}
            style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}
            aria-label="Tutup"
          >
            <X style={{ width: '20px', height: '20px' }} />
          </button>
        </div>

        <div style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '12px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '24px 0', color: '#64748b' }}>
              Memverifikasi data anggota di sistem PMR SPADAN...
            </div>
          ) : notFound || !member ? (
            <div style={{ textAlign: 'center', padding: '18px 0' }}>
              <div style={{ color: '#dc2626', fontWeight: 800, fontSize: '14px', marginBottom: '6px' }}>
                Data Tidak Ditemukan
              </div>
              <p style={{ color: '#64748b', fontSize: '12px' }}>
                Status Keanggotaan: Data anggota tidak terdaftar di dalam sistem PMR SPADAN.
              </p>
            </div>
          ) : (
            <>
              <div style={{ textAlign: 'center', paddingBottom: '10px', borderBottom: '1px solid #eee' }}>
                <span style={{
                  display: 'inline-block',
                  background: isAktif ? '#dcfce7' : '#fee2e2',
                  color: statusColor,
                  fontWeight: 800,
                  fontSize: '11px',
                  padding: '4px 12px',
                  borderRadius: '20px',
                  marginBottom: '8px'
                }}>
                  STATUS: {statusText}
                </span>
                <h4 style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>
                  {member.nama_lengkap}
                </h4>
                <p style={{ color: '#64748b', fontSize: '11px', fontWeight: 600, marginTop: '2px' }}>
                  {member.keterangan_jabatan || member.jabatan || 'Anggota'}
                </p>
              </div>

              <table style={{ width: '100%', fontSize: '11.5px', borderCollapse: 'collapse' }}>
                <tbody>
                  <tr>
                    <td style={{ padding: '4px 0', color: '#64748b', width: '40%' }}>Gol. Darah</td>
                    <td>: <b>{goldar}</b></td>
                  </tr>
                  <tr>
                    <td style={{ padding: '4px 0', color: '#64748b' }}>Tanggal Lahir</td>
                    <td>: <b>{formatTanggalIndo(member.tanggal_lahir, false)}</b></td>
                  </tr>
                  <tr>
                    <td style={{ padding: '4px 0', color: '#64748b' }}>ID Anggota</td>
                    <td>: <b>{member.id.substring(0, 8).toUpperCase()}</b></td>
                  </tr>
                  <tr>
                    <td style={{ padding: '4px 0', color: '#64748b' }}>Th. Bergabung</td>
                    <td>: <b>{member.tahun_bergabung || '-'}</b></td>
                  </tr>
                  <tr>
                    <td style={{ padding: '4px 0', color: '#64748b' }}>Unit Sekolah</td>
                    <td>: <b>SMPN 8 Balikpapan</b></td>
                  </tr>
                </tbody>
              </table>
            </>
          )}

          <button
            onClick={closeVerifyModal}
            style={{
              background: '#7f1d1d',
              color: '#fff',
              border: 'none',
              padding: '10px',
              borderRadius: '8px',
              fontWeight: 700,
              cursor: 'pointer',
              marginTop: '6px'
            }}
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
