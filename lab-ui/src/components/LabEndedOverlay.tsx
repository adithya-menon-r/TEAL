import React from 'react';
import { CheckCircle2, ArrowRight } from 'lucide-react';

interface LabEndedOverlayProps {
  reason: 'user' | 'expired' | 'disconnected';
  costUsd: number | null;
  dashboardUrl: string;
  labName?: string;
}

export const LabEndedOverlay: React.FC<LabEndedOverlayProps> = ({
  reason,
  costUsd,
  dashboardUrl,
  labName,
}) => {
  const getReasonTitle = () => {
    switch (reason) {
      case 'user':
        return 'Lab Session Ended';
      case 'expired':
        return 'Session Duration Expired';
      case 'disconnected':
        return 'Lab Container Terminated';
    }
  };

  const getReasonDescription = () => {
    switch (reason) {
      case 'user':
        return 'You have successfully ended this lab session. All container resources have been torn down.';
      case 'expired':
        return 'Your 60-minute lab allocation reached its cutoff time and was automatically terminated.';
      case 'disconnected':
        return 'The lab service was deleted or is no longer reachable. If you ended it from the dashboard, this is normal.';
    }
  };

  const formattedCost = costUsd !== null ? `$${costUsd.toFixed(4)}` : '$0.0000';
  const returnUrl = dashboardUrl || '/';

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 200,
        background: 'rgba(9, 13, 22, 0.94)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}
    >
      <div
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-card)',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '520px',
          padding: '36px 32px',
          textAlign: 'center',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8)',
          animation: 'fadeIn 0.25s ease-out',
        }}
      >
        <div
          style={{
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            background: 'rgba(56, 189, 248, 0.1)',
            border: '1px solid rgba(56, 189, 248, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px auto',
            color: '#38bdf8',
          }}
        >
          <CheckCircle2 size={32} />
        </div>

        <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#f8fafc', marginBottom: '8px' }}>
          {getReasonTitle()}
        </h2>

        <p style={{ fontSize: '0.875rem', color: '#94a3b8', lineHeight: 1.5, marginBottom: '28px' }}>
          {getReasonDescription()}
        </p>

        {/* Cost & Summary Card (§4.4) */}
        <div
          style={{
            background: 'rgba(30, 41, 59, 0.5)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '10px',
            padding: '16px 20px',
            display: 'flex',
            justifyContent: 'space-around',
            alignItems: 'center',
            marginBottom: '28px',
          }}
        >
          <div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>
              Environment
            </div>
            <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#f8fafc' }}>
              {labName || 'Linux Lab'}
            </div>
          </div>

          <div style={{ height: '32px', width: '1px', background: 'var(--border-subtle)' }} />

          <div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>
              Session Cost
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#10b981', fontFamily: 'var(--font-mono)' }}>
              {formattedCost}
            </div>
          </div>
        </div>

        <a
          href={returnUrl}
          className="btn btn-primary"
          style={{
            display: 'inline-flex',
            padding: '0.75rem 1.75rem',
            fontSize: '0.925rem',
            textDecoration: 'none',
            justifyContent: 'center',
            width: '100%',
          }}
          id="btn-return-dashboard"
        >
          <span>Return to Dashboard</span>
          <ArrowRight size={16} />
        </a>
      </div>
    </div>
  );
};
