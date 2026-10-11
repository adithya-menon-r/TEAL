import React from 'react';
import { Countdown } from './Countdown';
import { LogoMark } from './LogoMark';
import { Power, PanelRightOpen, PanelRightClose } from 'lucide-react';
import { LabInfo } from '../types';

interface TopBarProps {
  labInfo: LabInfo;
  expiresAt: string;
  onTriggerEnd: () => void;
  sidebarOpen: boolean;
  hasSidebar: boolean;
  isNarrow: boolean;
  onToggleSidebar: () => void;
  onExpire: () => void;
  onWarnTenMin: () => void;
  onWarnTwoMin: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  labInfo,
  expiresAt,
  onTriggerEnd,
  sidebarOpen,
  hasSidebar,
  isNarrow,
  onToggleSidebar,
  onExpire,
  onWarnTenMin,
  onWarnTwoMin,
}) => {
  return (
    <header
      className="lab-topbar"
      style={{
        height: 'var(--topbar-height)',
        background: 'var(--card)',
        borderBottom: '1px solid var(--border)',
        display: 'grid',
        gridTemplateColumns: '1fr auto 1fr',
        alignItems: 'center',
        
        zIndex: 50,
        boxShadow: '0 1px 0 0 rgb(23 43 42 / 0.03)',
      }}
    >
      {/* Left: Brand Logo & Wordmark */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '9px',
          justifySelf: 'start',
          minWidth: 0,
        }}
        title={labInfo.name ? `${labInfo.name} · TEAL` : 'Lab Environment · TEAL'}
      >
        <LogoMark style={{ width: '26px', height: '26px' }} />
        <span
          className="topbar-wordmark"
          style={{
            fontFamily: 'var(--font-heading)',
            fontWeight: 800,
            fontSize: '0.95rem',
            letterSpacing: '0.14em',
            color: 'var(--foreground)',
            lineHeight: 1,
            transform: 'translateY(1px)',
            userSelect: 'none',
          }}
        >
          TEAL
        </span>
      </div>

      {/* Center: Live Countdown (Centered & Prominent) */}
      <div style={{ justifySelf: 'center' }}>
        <Countdown
          expiresAt={expiresAt}
          onExpire={onExpire}
          onWarnTenMin={onWarnTenMin}
          onWarnTwoMin={onWarnTwoMin}
        />
      </div>

      {/* Right: End Lab (desktop), sidebar toggle (phone), or icon-only End Lab (phone, no sidebar) */}
      <div style={{ justifySelf: 'end' }}>
        {!isNarrow ? (
          <button
            className="btn btn-destructive-outline"
            onClick={onTriggerEnd}
            title="End this lab session"
            id="btn-end-lab"
            style={{
              height: '34px',
              padding: '0 14px',
              fontSize: '0.8125rem',
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '7px',
            }}
          >
            <Power size={14} />
            <span>End Lab</span>
          </button>
        ) : hasSidebar ? (
          <button
            className="btn btn-outline"
            onClick={onToggleSidebar}
            id="btn-toggle-sidebar"
            aria-label={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
            aria-expanded={sidebarOpen}
            aria-controls="lab-sidebar"
            title={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
            style={{ width: '34px', height: '34px', padding: 0, flexShrink: 0 }}
          >
            {sidebarOpen ? <PanelRightClose size={17} /> : <PanelRightOpen size={17} />}
          </button>
        ) : (
          <button
            className="btn btn-destructive-outline"
            onClick={onTriggerEnd}
            id="btn-end-lab"
            aria-label="End lab"
            title="End this lab session"
            style={{ width: '34px', height: '34px', padding: 0, flexShrink: 0 }}
          >
            <Power size={16} />
          </button>
        )}
      </div>
    </header>
  );
};
