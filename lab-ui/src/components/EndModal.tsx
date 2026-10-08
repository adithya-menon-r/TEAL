import React from 'react';
import { AlertTriangle, Power, X } from 'lucide-react';

interface EndModalProps {
  isOpen: boolean;
  isEnding: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const EndModal: React.FC<EndModalProps> = ({
  isOpen,
  isEnding,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 110,
        background: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
      onClick={!isEnding ? onCancel : undefined}
    >
      <div
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-card)',
          borderRadius: '12px',
          width: '100%',
          maxWidth: '460px',
          padding: '24px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
          animation: 'fadeIn 0.15s ease-out',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '8px',
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ef4444',
            }}
          >
            <AlertTriangle size={22} />
          </div>
          {!isEnding && (
            <button
              onClick={onCancel}
              style={{
                background: 'none',
                border: 'none',
                color: '#64748b',
                cursor: 'pointer',
                padding: '4px',
              }}
            >
              <X size={18} />
            </button>
          )}
        </div>

        <h3 style={{ fontSize: '1.15rem', fontWeight: 600, color: '#f8fafc', marginBottom: '8px' }}>
          End Lab Session?
        </h3>

        <p style={{ fontSize: '0.875rem', color: '#94a3b8', lineHeight: 1.5, marginBottom: '20px' }}>
          All active processes will be terminated and your ephemeral files in <code>/home/student</code> will be permanently deleted.
        </p>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button
            className="btn btn-secondary"
            onClick={onCancel}
            disabled={isEnding}
            id="btn-cancel-end"
          >
            Keep Working
          </button>
          <button
            className="btn btn-danger"
            onClick={onConfirm}
            disabled={isEnding}
            id="btn-confirm-end"
          >
            <Power size={14} />
            <span>{isEnding ? 'Ending Lab...' : 'End Lab Now'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
