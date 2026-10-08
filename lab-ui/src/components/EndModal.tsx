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
        background: 'rgba(23, 43, 42, 0.45)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
      onClick={!isEnding ? onCancel : undefined}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="end-modal-title"
        style={{
          background: 'var(--card)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          width: '100%',
          maxWidth: '440px',
          padding: '24px',
          boxShadow: 'var(--shadow-lg)',
          animation: 'fadeIn 0.15s ease-out',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            marginBottom: '16px',
          }}
        >
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '8px',
              background: 'var(--danger-soft)',
              border: '1px solid rgba(180, 35, 24, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--danger)',
            }}
          >
            <AlertTriangle size={20} />
          </div>
          {!isEnding && (
            <button
              onClick={onCancel}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--muted-foreground)',
                cursor: 'pointer',
                padding: '4px',
                borderRadius: '4px',
              }}
              aria-label="Close dialog"
            >
              <X size={18} />
            </button>
          )}
        </div>

        <h3
          id="end-modal-title"
          style={{
            fontSize: '1.125rem',
            fontWeight: 700,
            color: 'var(--foreground)',
            marginBottom: '8px',
            fontFamily: 'var(--font-heading)',
          }}
        >
          End Lab Session?
        </h3>

        <p
          style={{
            fontSize: '0.875rem',
            color: 'var(--muted-foreground)',
            lineHeight: 1.5,
            marginBottom: '24px',
          }}
        >
          All active processes will be terminated and your files will be permanently deleted.
        </p>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button
            className="btn btn-outline"
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
            <Power size={13} />
            <span>{isEnding ? 'Ending Lab...' : 'End Lab'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
