import React from 'react';
import { Countdown } from './Countdown';
import { FolderDown, Power, PanelRightClose, PanelRightOpen, Terminal, BookOpen } from 'lucide-react';
import { LabInfo } from '../types';

interface TopBarProps {
  labInfo: LabInfo;
  expiresAt: string;
  isPanelOpen: boolean;
  onTogglePanel: () => void;
  onOpenFiles: () => void;
  onTriggerEnd: () => void;
  onExpire: () => void;
  onWarnTenMin: () => void;
  onWarnTwoMin: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  labInfo,
  expiresAt,
  isPanelOpen,
  onTogglePanel,
  onOpenFiles,
  onTriggerEnd,
  onExpire,
  onWarnTenMin,
  onWarnTwoMin,
}) => {
  const isJupyter = labInfo.interface === 'jupyter';

  return (
    <header
      style={{
        height: 'var(--topbar-height)',
        background: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        zIndex: 50,
      }}
    >
      {/* Left section: Logo, Title, Countdown & End Lab */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '6px',
              background: 'linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 10px rgba(56, 189, 248, 0.3)',
            }}
          >
            {isJupyter ? <BookOpen size={16} color="#fff" /> : <Terminal size={16} color="#fff" />}
          </div>
          <span style={{ fontWeight: 700, fontSize: '0.95rem', letterSpacing: '0.05em', color: '#f8fafc' }}>
            TEAL
          </span>
          <span
            style={{
              fontSize: '0.75rem',
              color: '#94a3b8',
              background: 'rgba(30, 41, 59, 0.6)',
              padding: '2px 8px',
              borderRadius: '9999px',
              border: '1px solid var(--border-subtle)',
            }}
          >
            {labInfo.name || 'Cloud Lab'}
          </span>
        </div>

        <div style={{ height: '16px', width: '1px', background: 'var(--border-subtle)' }} />

        <Countdown
          expiresAt={expiresAt}
          onExpire={onExpire}
          onWarnTenMin={onWarnTenMin}
          onWarnTwoMin={onWarnTwoMin}
        />

        <button
          className="btn btn-danger"
          onClick={onTriggerEnd}
          title="End this lab session"
          id="btn-end-lab"
        >
          <Power size={14} />
          <span>End Lab</span>
        </button>
      </div>

      {/* Right section: Files & Panel toggle */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <button
          className="btn btn-secondary"
          onClick={onOpenFiles}
          title="Browse and download files from /home/student"
          id="btn-files"
        >
          <FolderDown size={15} style={{ color: '#38bdf8' }} />
          <span>Files</span>
        </button>

        <button
          className="btn btn-secondary"
          onClick={onTogglePanel}
          title={isPanelOpen ? 'Collapse lab details panel' : 'Expand lab details panel'}
          style={{ padding: '0.45rem' }}
          id="btn-toggle-panel"
        >
          {isPanelOpen ? <PanelRightClose size={16} /> : <PanelRightOpen size={16} />}
        </button>
      </div>
    </header>
  );
};
