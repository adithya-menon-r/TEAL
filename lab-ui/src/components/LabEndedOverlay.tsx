import React from 'react';
import { CheckCircle2, ArrowRight, Clock, AlertCircle } from 'lucide-react';

interface LabEndedOverlayProps {
  reason: 'user' | 'expired' | 'disconnected';
  dashboardUrl: string;
}

export const LabEndedOverlay: React.FC<LabEndedOverlayProps> = ({
  reason,
  dashboardUrl,
}) => {
  const getReasonConfig = () => {
    switch (reason) {
      case 'user':
        return {
          title: 'Lab Session Ended',
          description:
            'You have successfully ended this lab session. All container resources have been torn down.',
          icon: <CheckCircle2 size={28} />,
          iconBg: 'var(--primary-soft)',
          iconColor: 'var(--primary)',
          iconBorder: 'color-mix(in srgb, var(--primary) 30%, transparent)',
        };
      case 'expired':
        return {
          title: 'Session Expired',
          description:
            'Your lab allocation reached its cutoff time and was automatically terminated.',
          icon: <Clock size={28} />,
          iconBg: 'var(--warning-soft)',
          iconColor: 'var(--warning)',
          iconBorder: 'color-mix(in srgb, var(--warning) 30%, transparent)',
        };
      case 'disconnected':
        return {
          title: 'Lab Terminated',
          description:
            'The lab session was terminated and resources have been torn down.',
          icon: <AlertCircle size={28} />,
          iconBg: 'var(--danger-soft)',
          iconColor: 'var(--danger)',
          iconBorder: 'color-mix(in srgb, var(--danger) 30%, transparent)',
        };
    }
  };

  const config = getReasonConfig();
  const returnUrl = dashboardUrl || '/';

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 200,
        background: 'rgba(23, 43, 42, 0.75)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        style={{
          background: 'var(--card)',
          border: '1px solid var(--border)',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '440px',
          padding: '36px 32px',
          textAlign: 'center',
          boxShadow: 'var(--shadow-lg)',
          animation: 'fadeIn 0.22s ease-out',
        }}
      >
        <div
          style={{
            width: '52px',
            height: '52px',
            borderRadius: '50%',
            background: config.iconBg,
            border: `1px solid ${config.iconBorder}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 18px auto',
            color: config.iconColor,
          }}
        >
          {config.icon}
        </div>

        <h2
          style={{
            fontSize: '1.25rem',
            fontWeight: 700,
            color: 'var(--foreground)',
            marginBottom: '8px',
            fontFamily: 'var(--font-heading)',
          }}
        >
          {config.title}
        </h2>

        <p
          style={{
            fontSize: '0.85rem',
            color: 'var(--muted-foreground)',
            lineHeight: 1.5,
            marginBottom: '28px',
          }}
        >
          {config.description}
        </p>

        <a
          href={returnUrl}
          className="btn btn-primary"
          style={{
            display: 'inline-flex',
            padding: '0.75rem 1.5rem',
            fontSize: '0.9rem',
            textDecoration: 'none',
            justifyContent: 'center',
            width: '100%',
            borderRadius: '8px',
          }}
          id="btn-return-dashboard"
        >
          <span>Return to Dashboard</span>
          <ArrowRight size={15} />
        </a>
      </div>
    </div>
  );
};
