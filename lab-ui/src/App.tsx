import React, { useEffect, useState, useCallback, useRef } from 'react';
import { GatewayInfo, ToastMessage } from './types';
import { TopBar } from './components/TopBar';
import { RightPanel } from './components/RightPanel';
import { EndModal } from './components/EndModal';
import { LabEndedOverlay } from './components/LabEndedOverlay';
import { ToastContainer } from './components/ToastContainer';
import { LogoMark } from './components/LogoMark';
import { Loader2 } from 'lucide-react';
import { usePageTitle } from './hooks/usePageTitle';

export const App: React.FC = () => {
  const [gatewayInfo, setGatewayInfo] = useState<GatewayInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [isEndModalOpen, setIsEndModalOpen] = useState(false);
  const [isEnding, setIsEnding] = useState(false);
  const [endedState, setEndedState] = useState<{
    ended: boolean;
    reason: 'user' | 'expired' | 'disconnected';
  }>({
    ended: false,
    reason: 'user',
  });

  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const endedRef = useRef(false);

  // Set document title matching the TEAL site style: "Lab Environment · TEAL"
  const labTitle = gatewayInfo?.lab?.name && gatewayInfo.lab.name !== 'Your course lab'
    ? `${gatewayInfo.lab.name} · TEAL`
    : 'Lab Environment · TEAL';
  usePageTitle(labTitle);

  const addToast = (type: 'info' | 'warning' | 'danger', title: string, message: string) => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, type, title, message }]);

    // Auto dismiss after 8s
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 8000);
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const isDevFallbackRef = useRef(false);

  // 1. Fetch lab metadata
  useEffect(() => {
    fetch('/__teal/info')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data: GatewayInfo) => {
        setGatewayInfo(data);
        setLoading(false);
      })
      .catch((err) => {
        console.warn('Unable to load /__teal/info (dev fallback)', err);
        isDevFallbackRef.current = true;
        // Fallback matching design specs
        setGatewayInfo({
          sessionId: 'session-live',
          expiresAt: new Date(Date.now() + 59 * 60 * 1000 + 11 * 1000).toISOString(),
          lab: {
            name: 'Your course lab',
            description: 'Course tools, preinstalled.',
            interface: 'terminal',
            tools: ['GHC 9.x', 'GHCi', 'cabal', 'stack', 'vim', 'nano', 'git'],
            cpu: '1',
            memory: '2Gi',
          },
          dashboardUrl: '/dashboard',
        });
        setLoading(false);
      });
  }, []);

  // 2. Health check polling (§4.4: every 15s to notice if deleted)
  useEffect(() => {
    const checkHealth = async () => {
      if (endedRef.current || isDevFallbackRef.current) return;
      try {
        const res = await fetch('/__teal/healthz');
        if (!res.ok) {
          endedRef.current = true;
          setEndedState({
            ended: true,
            reason: res.status === 410 ? 'expired' : 'disconnected',
          });
        }
      } catch {
        if (!endedRef.current && !isDevFallbackRef.current) {
          endedRef.current = true;
          setEndedState({
            ended: true,
            reason: 'disconnected',
          });
        }
      }
    };

    const interval = setInterval(checkHealth, 15000);
    return () => clearInterval(interval);
  }, []);

  // Handlers for countdown warnings
  const handleWarnTenMin = useCallback(() => {
    addToast(
      'warning',
      '10 Minutes Remaining',
      'Your lab allocation will expire in 10 minutes. Download any required files before shutdown.'
    );
  }, []);

  const handleWarnTwoMin = useCallback(() => {
    addToast(
      'danger',
      '2 Minutes Remaining',
      'Lab cutoff imminent! All unsaved work will be lost. Use the Files tab now.'
    );
  }, []);

  const handleExpire = useCallback(() => {
    if (endedRef.current) return;
    endedRef.current = true;
    setEndedState({
      ended: true,
      reason: 'expired',
    });
    fetch('/__teal/end', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: 'expired' }),
    }).catch(() => {
      // Ignore network errors; backend JIT expiry / reaper will handle cleanup
    });
  }, []);

  // Handler for End Lab execution
  const handleConfirmEnd = async () => {
    setIsEnding(true);
    endedRef.current = true;
    try {
      await fetch('/__teal/end', {
        method: 'POST',
      });
      setEndedState({
        ended: true,
        reason: 'user',
      });
    } catch {
      setEndedState({
        ended: true,
        reason: 'user',
      });
    } finally {
      setIsEnding(false);
      setIsEndModalOpen(false);
    }
  };

  if (loading || !gatewayInfo) {
    return (
      <div
        role="status"
        aria-live="polite"
        style={{
          height: '100vh',
          width: '100vw',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--card)',
          gap: '16px',
        }}
      >
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <LogoMark style={{ width: '42px', height: '42px' }} className="animate-pulse-glow" />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
          <span
            className="mono-label"
            style={{
              fontSize: '0.75rem',
              letterSpacing: '0.12em',
              color: 'var(--foreground)',
              fontWeight: 600,
            }}
          >
            Initializing Environment
          </span>
          <span
            style={{
              fontSize: '0.8125rem',
              color: 'var(--muted-foreground)',
              fontFamily: 'var(--font-sans)',
            }}
          >
            Setting up your secure container...
          </span>
        </div>
      </div>
    );
  }

  // Upstream interface iframe URL: /jupyter/lab, /vscode/ or /terminal/
  const iframeSrc =
    gatewayInfo.lab.interface === 'jupyter' ? '/jupyter/lab' : 
    gatewayInfo.lab.interface === 'vscode' ? '/vscode/?folder=/home/student/work' : '/terminal/';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', background: 'var(--background)' }}>
      <TopBar
        labInfo={gatewayInfo.lab}
        expiresAt={gatewayInfo.expiresAt}
        onTriggerEnd={() => setIsEndModalOpen(true)}
        onExpire={handleExpire}
        onWarnTenMin={handleWarnTenMin}
        onWarnTwoMin={handleWarnTwoMin}
      />

      <div style={{ display: 'flex', flex: 1, minHeight: 0, position: 'relative' }}>
        {/* Main Interface Area (Terminal / Jupyter) */}
        <main
          style={{
            flex: 1,
            height: '100%',
            background: '#000000',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Centered spinner while connecting to the lab */}
          {!iframeLoaded && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
                color: '#94a3b8',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.85rem',
                zIndex: 10,
                background: '#000000',
              }}
            >
              <Loader2 size={24} className="animate-spin" style={{ color: '#94a3b8' }} />
              <span>Establishing connection...</span>
            </div>
          )}

          <iframe
            src={iframeSrc}
            title="Lab Interface"
            id="lab-iframe"
            onLoad={() => setIframeLoaded(true)}
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
              display: 'block',
              background: 'transparent',
              position: 'relative',
              zIndex: 2,
              opacity: iframeLoaded ? 1 : 0,
              transition: 'opacity 0.2s ease',
            }}
          />
        </main>

        {/* Right Details Panel (File Explorer) - hidden for vscode lab where it is redundant */}
        {gatewayInfo.lab.interface !== 'vscode' && (
          <RightPanel labInfo={gatewayInfo.lab} />
        )}
      </div>

      {/* End Lab Confirmation Modal */}
      <EndModal
        isOpen={isEndModalOpen}
        isEnding={isEnding}
        onConfirm={handleConfirmEnd}
        onCancel={() => setIsEndModalOpen(false)}
      />

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* Session Ended Overlay */}
      {endedState.ended && (
        <LabEndedOverlay
          reason={endedState.reason}
          dashboardUrl={gatewayInfo.dashboardUrl}
        />
      )}
    </div>
  );
};
