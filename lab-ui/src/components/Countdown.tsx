import React, { useEffect, useState, useRef } from 'react';
import { Clock } from 'lucide-react';

interface CountdownProps {
  expiresAt: string;
  onExpire: () => void;
  onWarnTenMin: () => void;
  onWarnTwoMin: () => void;
}

export const Countdown: React.FC<CountdownProps> = ({
  expiresAt,
  onExpire,
  onWarnTenMin,
  onWarnTwoMin,
}) => {
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const warnedTenMinRef = useRef(false);
  const warnedTwoMinRef = useRef(false);

  useEffect(() => {
    if (!expiresAt) return;

    const calculateRemaining = () => {
      const cleaned = expiresAt.replace('Z', '+00:00');
      const targetTime = new Date(cleaned).getTime();
      const now = Date.now();
      const diffSec = Math.max(0, Math.floor((targetTime - now) / 1000));
      return diffSec;
    };

    const initial = calculateRemaining();
    setSecondsLeft(initial);

    // Initial check in case lab was re-opened with < 10 or < 2 min left
    if (initial <= 600 && !warnedTenMinRef.current) {
      warnedTenMinRef.current = true;
      onWarnTenMin();
    }
    if (initial <= 120 && !warnedTwoMinRef.current) {
      warnedTwoMinRef.current = true;
      onWarnTwoMin();
    }
    if (initial === 0) {
      onExpire();
    }

    const interval = setInterval(() => {
      const remaining = calculateRemaining();
      setSecondsLeft(remaining);

      if (remaining <= 600 && !warnedTenMinRef.current) {
        warnedTenMinRef.current = true;
        onWarnTenMin();
      }

      if (remaining <= 120 && !warnedTwoMinRef.current) {
        warnedTwoMinRef.current = true;
        onWarnTwoMin();
      }

      if (remaining <= 0) {
        clearInterval(interval);
        onExpire();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [expiresAt, onExpire, onWarnTenMin, onWarnTwoMin]);

  if (secondsLeft === null) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b', fontSize: '0.85rem' }}>
        <Clock size={15} />
        <span>--:--</span>
      </div>
    );
  }

  const hours = Math.floor(secondsLeft / 3600);
  const minutes = Math.floor((secondsLeft % 3600) / 60);
  const seconds = secondsLeft % 60;

  const formattedTime =
    hours > 0
      ? `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
      : `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  // Amber at <= 10 min (600s), Red at <= 2 min (120s)
  const isRed = secondsLeft <= 120;
  const isAmber = !isRed && secondsLeft <= 600;

  const color = isRed ? '#ef4444' : isAmber ? '#f59e0b' : '#38bdf8';
  const bgColor = isRed
    ? 'rgba(239, 68, 68, 0.12)'
    : isAmber
    ? 'rgba(245, 158, 11, 0.12)'
    : 'rgba(56, 189, 248, 0.1)';
  const borderColor = isRed
    ? 'rgba(239, 68, 68, 0.35)'
    : isAmber
    ? 'rgba(245, 158, 11, 0.35)'
    : 'rgba(56, 189, 248, 0.25)';

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '0.35rem 0.75rem',
        borderRadius: '6px',
        background: bgColor,
        border: `1px solid ${borderColor}`,
        color: color,
        fontWeight: 600,
        fontFamily: 'var(--font-mono)',
        fontSize: '0.85rem',
        letterSpacing: '0.04em',
        transition: 'all 0.3s ease',
      }}
      title={`Time remaining: ${formattedTime}`}
    >
      <Clock size={14} className={isRed ? 'animate-pulse-glow' : undefined} />
      <span>{formattedTime}</span>
    </div>
  );
};
