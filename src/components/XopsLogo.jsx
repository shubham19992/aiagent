import React from 'react';

/**
 * xOps brand logo.
 *
 * A self-contained SVG so there's no image asset to ship/cache. The mark is a
 * tapered yellow swoosh above an "EY" wordmark on a transparent background.
 * `variant="full"` adds the "xOps" wordmark next to it (header lockup);
 * `variant="mark"` renders the mark alone (card badge).
 */
const XopsLogo = ({ height = 40, variant = 'full', style, className }) => {
  const tile = Math.round(height);

  const mark = (
    <svg
      width={tile}
      height={tile}
      viewBox="0 0 320 320"
      role="img"
      aria-label="xOps logo"
      style={{ display: 'block', flex: '0 0 auto' }}
    >
      {/* full tapered yellow swoosh (as supplied) */}
      <polygon points="12,118 305,8 305,98" fill="#F4E215" />
      {/* EY wordmark */}
      <text
        x="160"
        y="258"
        textAnchor="middle"
        fontFamily="'Plus Jakarta Sans', 'Inter', system-ui, sans-serif"
        fontWeight="800"
        fontSize="150"
        letterSpacing="-4"
        fill="currentColor"
      >
        EY
      </text>
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
        <span style={{ color: '#f15a24' }}>x</span>
        <span style={{ color: 'currentColor' }}>Ops</span>
      </span>
    </span>
  );
};

export default XopsLogo;
