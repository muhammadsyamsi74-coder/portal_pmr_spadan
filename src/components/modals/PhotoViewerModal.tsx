import React from 'react';
import { X } from 'lucide-react';

interface PhotoViewerModalProps {
  imageUrl: string | null;
  onClose: () => void;
}

export const PhotoViewerModal: React.FC<PhotoViewerModalProps> = ({ imageUrl, onClose }) => {
  if (!imageUrl) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.85)',
        backdropFilter: 'blur(5px)',
        zIndex: 100000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px'
      }}
      onClick={onClose}
    >
      <div
        style={{
          position: 'relative',
          maxWidth: '90vw',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '-40px',
            right: 0,
            background: 'none',
            border: 'none',
            color: '#fff',
            cursor: 'pointer',
            padding: '4px'
          }}
          aria-label="Tutup Tampilan Foto"
        >
          <X style={{ width: '28px', height: '28px' }} />
        </button>

        <img
          src={imageUrl}
          alt="Foto Diperbesar"
          style={{
            maxWidth: '100%',
            maxHeight: '85vh',
            borderRadius: '12px',
            objectFit: 'contain',
            boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
            border: '2px solid rgba(255,255,255,0.2)'
          }}
        />
      </div>
    </div>
  );
};
