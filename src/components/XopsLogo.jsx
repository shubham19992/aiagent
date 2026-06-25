import React, { useId } from 'react';

/**
 * xOps brand logo.
 *
 * A self-contained SVG so there's no image asset to ship/cache. The mark is a
 * tapered yellow swoosh on the brand orange→amber rounded tile (so it stays
 * visible on light and dark backgrounds). `variant="full"` adds the "xOps"
 * wordmark next to it (header lockup); `variant="mark"` renders the tile alone.
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
      viewBox="0 0 320 320"
      role="img"
      aria-label="xOps logo"
      style={{ display: 'block', flex: '0 0 auto' }}
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#f15a24" />
          <stop offset="100%" stopColor="#fba919" />
        </linearGradient>
      </defs>
      {/* brand tile background */}
      <rect x="0" y="0" width="320" height="320" rx="80" fill={`url(#${gradId})`} />
      {/* full tapered yellow swoosh (as supplied) */}
      <polygon points="12,118 305,8 305,98" fill="#F4E215" />
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
