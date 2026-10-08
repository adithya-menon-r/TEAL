import React from 'react';
import { ToastMessage } from '../types';
import { AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

interface ToastContainerProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: '60px',
        right: '20px',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        maxWidth: '360px',
        width: '100%',
        pointerEvents: 'none',
      }}
    >
      {toasts.map((toast) => {
        const isDanger = toast.type === 'danger';
        const isWarning = toast.type === 'warning';

        const borderColor = isDanger
          ? 'rgba(180, 35, 24, 0.35)'
          : isWarning
          ? 'rgba(161, 78, 6, 0.35)'
          : 'var(--border)';

        const bgColor = isDanger
          ? 'var(--danger-soft)'
          : isWarning
          ? 'var(--warning-soft)'
          : 'var(--card)';

        const titleColor = isDanger
          ? 'var(--danger)'
          : isWarning
          ? 'var(--warning)'
          : 'var(--foreground)';

        const iconColor = isDanger
          ? 'var(--danger)'
          : isWarning
          ? 'var(--warning)'
          : 'var(--primary)';

        return (
          <div
            key={toast.id}
            role="status"
            style={{
              pointerEvents: 'auto',
              background: bgColor,
              border: `1px solid ${borderColor}`,
              borderRadius: '8px',
              padding: '12px 14px',
              boxShadow: 'var(--shadow-md)',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
              animation: 'slideDown 0.2s ease-out',
            }}
          >
            <div style={{ color: iconColor, marginTop: '2px', flexShrink: 0 }}>
              {isDanger ? (
                <AlertCircle size={16} />
              ) : isWarning ? (
                <AlertTriangle size={16} />
              ) : (
                <Info size={16} />
              )}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: '0.8125rem',
                  fontWeight: 700,
                  color: titleColor,
                  marginBottom: '2px',
                  fontFamily: 'var(--font-heading)',
                }}
              >
                {toast.title}
              </div>
              <div
                style={{
                  fontSize: '0.78rem',
                  color: 'var(--foreground)',
                  opacity: 0.9,
                  lineHeight: '1.35',
                }}
              >
                {toast.message}
              </div>
            </div>
            <button
              onClick={() => onDismiss(toast.id)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--muted-foreground)',
                cursor: 'pointer',
                padding: '2px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              aria-label="Dismiss toast"
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
};
