import React, { useEffect, useState, useRef } from 'react';
import { Timer } from 'lucide-react';

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
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          color: 'var(--muted-foreground)',
          fontSize: '0.8rem',
          padding: '3px 10px',
          borderRadius: '9999px',
          border: '1px solid var(--border)',
          background: 'var(--card)',
        }}
      >
        <Timer size={13} />
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

  // Normal, Amber (<= 10 min / 600s), Red (<= 2 min / 120s)
  const isRed = secondsLeft <= 120;
  const isAmber = !isRed && secondsLeft <= 600;

  const color = isRed
    ? 'var(--danger)'
    : isAmber
    ? 'var(--warning)'
    : 'var(--foreground)';

  const bgColor = isRed
    ? 'var(--danger-soft)'
    : isAmber
    ? 'var(--warning-soft)'
    : 'var(--card)';

  const borderColor = isRed
    ? 'rgba(180, 35, 24, 0.35)'
    : isAmber
    ? 'rgba(161, 78, 6, 0.35)'
    : 'var(--border)';

  return (
    <div
      role="timer"
      aria-live="off"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '7px',
        padding: '4px 14px',
        height: '32px',
        borderRadius: '9999px',
        background: bgColor,
        border: `1px solid ${borderColor}`,
        color: color,
        fontWeight: 600,
        fontSize: '0.875rem',
        letterSpacing: '0.01em',
        transition: 'all 0.25s ease-out',
        userSelect: 'none',
        boxShadow: '0 1px 3px 0 rgb(23 43 42 / 0.07)',
      }}
      title={`Time remaining: ${formattedTime}`}
    >
      <Timer size={15} className={isRed ? 'animate-pulse-glow' : undefined} style={{ flexShrink: 0, opacity: 0.9 }} />
      <span style={{ fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
        {formattedTime}
      </span>
      <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.78rem', fontWeight: 500, opacity: 0.85 }}>
        left
      </span>
    </div>
  );
};
