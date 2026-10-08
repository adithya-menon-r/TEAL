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
    <div style={{
      position: 'fixed',
      top: '70px',
      right: '24px',
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      maxWidth: '380px',
      width: '100%',
      pointerEvents: 'none',
    }}>
      {toasts.map((toast) => {
        const isDanger = toast.type === 'danger';
        const isWarning = toast.type === 'warning';

        const borderColor = isDanger ? 'rgba(239, 68, 68, 0.4)' : isWarning ? 'rgba(245, 158, 11, 0.4)' : 'rgba(56, 189, 248, 0.4)';
        const bgColor = isDanger ? 'rgba(30, 15, 20, 0.95)' : isWarning ? 'rgba(30, 25, 15, 0.95)' : 'rgba(15, 25, 35, 0.95)';
        const iconColor = isDanger ? '#ef4444' : isWarning ? '#f59e0b' : '#38bdf8';

        return (
          <div
            key={toast.id}
            style={{
              pointerEvents: 'auto',
              background: bgColor,
              border: `1px solid ${borderColor}`,
              borderRadius: '8px',
              padding: '12px 14px',
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.6)',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
              animation: 'slideDown 0.25s ease-out',
              backdropFilter: 'blur(8px)',
            }}
          >
            <div style={{ color: iconColor, marginTop: '2px', flexShrink: 0 }}>
              {isDanger ? <AlertCircle size={18} /> : isWarning ? <AlertTriangle size={18} /> : <Info size={18} />}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#f8fafc', marginBottom: '2px' }}>
                {toast.title}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#cbd5e1', lineHeight: '1.35' }}>
                {toast.message}
              </div>
            </div>
            <button
              onClick={() => onDismiss(toast.id)}
              style={{
                background: 'none',
                border: 'none',
                color: '#64748b',
                cursor: 'pointer',
                padding: '2px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              aria-label="Dismiss toast"
            >
              <X size={15} />
            </button>
          </div>
        );
      })}
    </div>
  );
};
