import React, { useEffect, useState, useCallback, useRef } from 'react';
import { GatewayInfo, ToastMessage } from './types';
import { TopBar } from './components/TopBar';
import { RightPanel } from './components/RightPanel';
import { FilesModal } from './components/FilesModal';
import { EndModal } from './components/EndModal';
import { LabEndedOverlay } from './components/LabEndedOverlay';
import { ToastContainer } from './components/ToastContainer';

export const App: React.FC = () => {
  const [gatewayInfo, setGatewayInfo] = useState<GatewayInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPanelOpen, setIsPanelOpen] = useState(true);
  const [isFilesOpen, setIsFilesOpen] = useState(false);
  const [isEndModalOpen, setIsEndModalOpen] = useState(false);
  const [isEnding, setIsEnding] = useState(false);
  const [endedState, setEndedState] = useState<{
    ended: boolean;
    reason: 'user' | 'expired' | 'disconnected';
    costUsd: number | null;
  }>({
    ended: false,
    reason: 'user',
    costUsd: null,
  });

  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const endedRef = useRef(false);

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
        // Fallback for standalone preview
        setGatewayInfo({
          sessionId: 'dev-preview',
          expiresAt: new Date(Date.now() + 50 * 60 * 1000).toISOString(),
          lab: {
            name: 'Linux Lab',
            description: 'A clean Ubuntu shell with common command-line and build tools.',
            interface: 'terminal',
            tools: ['Ubuntu 24.04', 'bash', 'gcc', 'python3', 'git', 'tmux', 'curl'],
            cpu: '1',
            memory: '1Gi',
          },
          dashboardUrl: 'https://teal.example.com',
        });
        setLoading(false);
      });
  }, []);

  // 2. Health check polling (§4.4: every 15s to notice if deleted)
  useEffect(() => {
    const checkHealth = async () => {
      if (endedRef.current) return;
      try {
        const res = await fetch('/__teal/healthz');
        if (!res.ok) {
          endedRef.current = true;
          setEndedState({
            ended: true,
            reason: res.status === 410 ? 'expired' : 'disconnected',
            costUsd: null,
          });
        }
      } catch {
        if (!endedRef.current) {
          endedRef.current = true;
          setEndedState({
            ended: true,
            reason: 'disconnected',
            costUsd: null,
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
      costUsd: null,
    });
  }, []);

  // Handler for End Lab execution
  const handleConfirmEnd = async () => {
    setIsEnding(true);
    endedRef.current = true;
    try {
      const res = await fetch('/__teal/end', {
        method: 'POST',
      });
      const data = await res.json();
      setEndedState({
        ended: true,
        reason: 'user',
        costUsd: typeof data.costUsd === 'number' ? data.costUsd : 0,
      });
    } catch {
      setEndedState({
        ended: true,
        reason: 'user',
        costUsd: 0,
      });
    } finally {
      setIsEnding(false);
      setIsEndModalOpen(false);
    }
  };

  if (loading || !gatewayInfo) {
    return (
      <div
        style={{
          height: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--bg-main)',
          color: 'var(--text-muted)',
          fontSize: '0.9rem',
        }}
      >
        Initializing TEAL environment...
      </div>
    );
  }

  // Upstream interface iframe URL: /jupyter/lab or /terminal/
  const iframeSrc =
    gatewayInfo.lab.interface === 'jupyter' ? '/jupyter/lab' : '/terminal/';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw' }}>
      <TopBar
        labInfo={gatewayInfo.lab}
        expiresAt={gatewayInfo.expiresAt}
        isPanelOpen={isPanelOpen}
        onTogglePanel={() => setIsPanelOpen((prev) => !prev)}
        onOpenFiles={() => setIsFilesOpen(true)}
        onTriggerEnd={() => setIsEndModalOpen(true)}
        onExpire={handleExpire}
        onWarnTenMin={handleWarnTenMin}
        onWarnTwoMin={handleWarnTwoMin}
      />

      <div style={{ display: 'flex', flex: 1, minHeight: 0, position: 'relative' }}>
        {/* Main Interface Area (Terminal / Jupyter) */}
        <main style={{ flex: 1, height: '100%', background: '#000', position: 'relative' }}>
          <iframe
            src={iframeSrc}
            title="Lab Interface"
            id="lab-iframe"
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
              display: 'block',
              background: '#090d16',
            }}
          />
        </main>

        {/* Collapsible Details Panel */}
        <RightPanel
          labInfo={gatewayInfo.lab}
          sessionId={gatewayInfo.sessionId}
          expiresAt={gatewayInfo.expiresAt}
          isOpen={isPanelOpen}
        />
      </div>

      {/* Files Browser Modal */}
      <FilesModal isOpen={isFilesOpen} onClose={() => setIsFilesOpen(false)} />

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
          costUsd={endedState.costUsd}
          dashboardUrl={gatewayInfo.dashboardUrl}
          labName={gatewayInfo.lab.name}
        />
      )}
    </div>
  );
};
