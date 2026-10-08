import React from 'react';
import { LabInfo } from '../types';
import { AlertCircle, Cpu, HardDrive, PackageCheck, Info, Clock, ShieldCheck } from 'lucide-react';

interface RightPanelProps {
  labInfo: LabInfo;
  sessionId: string;
  expiresAt: string;
  isOpen: boolean;
}

export const RightPanel: React.FC<RightPanelProps> = ({
  labInfo,
  sessionId,
  expiresAt,
  isOpen,
}) => {
  if (!isOpen) return null;

  const formattedExpiry = expiresAt
    ? new Date(expiresAt.replace('Z', '+00:00')).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      })
    : '--:--';

  return (
    <aside
      style={{
        width: 'var(--sidebar-width)',
        height: 'calc(100vh - var(--topbar-height))',
        background: 'var(--bg-surface)',
        borderLeft: '1px solid var(--border-subtle)',
        display: 'flex',
        flexDirection: 'column',
        overflowY: 'auto',
        flexShrink: 0,
        zIndex: 40,
      }}
    >
      {/* Lab Overview */}
      <div style={{ padding: '20px', borderBottom: '1px solid var(--border-subtle)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <Info size={16} style={{ color: '#38bdf8' }} />
          <h2 style={{ fontSize: '1rem', fontWeight: 600, color: '#f8fafc' }}>
            {labInfo.name || 'Lab Environment'}
          </h2>
        </div>
        <p style={{ fontSize: '0.825rem', color: '#94a3b8', lineHeight: 1.5 }}>
          {labInfo.description || 'Dedicated container session running on Google Cloud Run.'}
        </p>
      </div>

      {/* Ephemeral Warning Card (Fixed Reminder §4.4) */}
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)' }}>
        <div
          style={{
            background: 'rgba(239, 68, 68, 0.08)',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            borderRadius: '8px',
            padding: '12px 14px',
            display: 'flex',
            gap: '10px',
            alignItems: 'flex-start',
          }}
        >
          <AlertCircle size={18} style={{ color: '#ef4444', flexShrink: 0, marginTop: '2px' }} />
          <div>
            <div style={{ fontSize: '0.825rem', fontWeight: 600, color: '#fca5a5', marginBottom: '2px' }}>
              Files are deleted when the lab ends
            </div>
            <div style={{ fontSize: '0.775rem', color: '#f87171', lineHeight: 1.4 }}>
              This environment is ephemeral. Use the <strong>Files</strong> tab to download your work before closing.
            </div>
          </div>
        </div>
      </div>

      {/* Specifications & Resources */}
      <div style={{ padding: '20px', borderBottom: '1px solid var(--border-subtle)' }}>
        <h3 style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>
          Resources & Session
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <div style={{ background: 'rgba(30, 41, 59, 0.5)', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#94a3b8', fontSize: '0.75rem', marginBottom: '4px' }}>
              <Cpu size={14} style={{ color: '#38bdf8' }} />
              <span>vCPU</span>
            </div>
            <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#f8fafc' }}>
              {labInfo.cpu || '1'} Core
            </div>
          </div>

          <div style={{ background: 'rgba(30, 41, 59, 0.5)', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#94a3b8', fontSize: '0.75rem', marginBottom: '4px' }}>
              <HardDrive size={14} style={{ color: '#38bdf8' }} />
              <span>Memory</span>
            </div>
            <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#f8fafc' }}>
              {labInfo.memory || '1Gi'} RAM
            </div>
          </div>

          <div style={{ background: 'rgba(30, 41, 59, 0.5)', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#94a3b8', fontSize: '0.75rem', marginBottom: '4px' }}>
              <Clock size={14} style={{ color: '#38bdf8' }} />
              <span>Hard Cutoff</span>
            </div>
            <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#f8fafc' }}>
              {formattedExpiry}
            </div>
          </div>

          <div style={{ background: 'rgba(30, 41, 59, 0.5)', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#94a3b8', fontSize: '0.75rem', marginBottom: '4px' }}>
              <ShieldCheck size={14} style={{ color: '#10b981' }} />
              <span>User</span>
            </div>
            <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#f8fafc' }}>
              student
            </div>
          </div>
        </div>

        <div style={{ marginTop: '12px', fontSize: '0.75rem', color: '#64748b' }}>
          Session ID: <code style={{ color: '#94a3b8', fontFamily: 'var(--font-mono)' }}>{sessionId}</code>
        </div>
      </div>

      {/* Installed Tools (§4.4) */}
      <div style={{ padding: '20px', flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <PackageCheck size={16} style={{ color: '#10b981' }} />
          <h3 style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Installed Tools
          </h3>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {(labInfo.tools || ['bash', 'tmux', 'git', 'vim', 'curl']).map((tool, idx) => (
            <span
              key={idx}
              style={{
                fontSize: '0.75rem',
                background: 'rgba(30, 41, 59, 0.8)',
                color: '#cbd5e1',
                padding: '4px 10px',
                borderRadius: '6px',
                border: '1px solid var(--border-subtle)',
                fontFamily: 'var(--font-mono)',
              }}
            >
              {tool}
            </span>
          ))}
        </div>
      </div>
    </aside>
  );
};
