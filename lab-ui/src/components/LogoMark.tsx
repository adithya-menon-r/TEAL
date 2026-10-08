import React from 'react';

export function LogoMark({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      className={className}
      style={{
        display: 'block',
        width: '26px',
        height: '26px',
        flexShrink: 0,
        ...style,
      }}
    >
      <rect width="32" height="32" rx="7" fill="#2F7F7A" />
      <path
        d="M16 7.5a8.5 8.5 0 1 0 8.5 8.5"
        stroke="#EEEAE3"
        strokeWidth="3.2"
        strokeLinecap="round"
      />
      <circle cx="23.2" cy="8.8" r="3" fill="#C48A6D" />
    </svg>
  );
}
