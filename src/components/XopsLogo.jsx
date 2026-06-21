import React, { useId } from 'react';

/**
 * xOps brand logo.
 *
 * A self-contained SVG so there's no image asset to ship/cache. The mark is a
 * DevOps-style infinity loop in the brand indigo→violet gradient, set inside a
 * rounded tile. `variant="full"` adds the "xOps" wordmark next to it (header
 * lockup); `variant="mark"` renders the tile alone (centered card badge).
 *
 * Gradient ids are made unique per instance (useId) so multiple logos on one
 * page don't collide and lose their fill.
 */
const XopsLogo = ({ height = 40, variant = 'full', style, className }) => {
  const uid = useId().replace(/[:]/g, '');
  const gradId = `xops-grad-${uid}`;
  const tile = Math.round(height);

  const mark = (
    <svg
      width={tile}
      height={tile}
      viewBox="0 0 44 44"
      role="img"
      aria-label="xOps logo"
      style={{ display: 'block', flex: '0 0 auto' }}
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#7c5cff" />
          <stop offset="100%" stopColor="#5b3fd6" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="44" height="44" rx="11" fill={`url(#${gradId})`} />
      {/* DevOps infinity loop */}
      <path
        d="M12 22 C12 16 16 16 22 22 C28 28 32 28 32 22 C32 16 28 16 22 22 C16 28 12 28 12 22 Z"
        fill="none"
        stroke="#ffffff"
        strokeWidth="3.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );

  if (variant === 'mark') {
    return (
      <span className={className} style={{ display: 'inline-flex', ...style }}>
        {mark}
      </span>
    );
  }

  return (
    <span
      className={className}
      style={{ display: 'inline-flex', alignItems: 'center', gap: Math.round(height * 0.28), ...style }}
    >
      {mark}
      <span
        style={{
          fontFamily: "'Plus Jakarta Sans', 'Inter', system-ui, sans-serif",
          fontWeight: 800,
          fontSize: Math.round(height * 0.66),
          letterSpacing: '-0.5px',
          lineHeight: 1,
        }}
      >
        <span style={{ color: '#7c5cff' }}>x</span>
        <span style={{ color: 'currentColor' }}>Ops</span>
      </span>
    </span>
  );
};

export default XopsLogo;
