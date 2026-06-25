import React, { useId } from 'react';

const FONT = "'Plus Jakarta Sans', 'Inter', system-ui, sans-serif";

/**
 * EY xOps brand logo.
 *
 * A self-contained SVG (no image asset to ship/cache): an "EY" badge on the
 * brand saffron rounded tile, followed by the "xOps" wordmark. `variant="mark"`
 * renders the badge alone (card badge); `variant="full"` is the full lockup.
 * "Ops" uses currentColor so the wordmark reads on light and dark surfaces.
 *
 * The gradient id is unique per instance (useId) so multiple logos on one page
 * don't collide and lose their fill.
 */
const XopsLogo = ({ height = 40, variant = 'full', style, className }) => {
  const uid = useId().replace(/[:]/g, '');
  const gradId = `xops-grad-${uid}`;
  const tile = Math.round(height);

  const badge = (
    <svg
      width={tile}
      height={tile}
      viewBox="0 0 100 100"
      role="img"
      aria-label="EY xOps logo"
      style={{ display: 'block', flex: '0 0 auto' }}
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#f15a24" />
          <stop offset="100%" stopColor="#fb9a19" />
        </linearGradient>
      </defs>
      <rect x="1" y="1" width="98" height="98" rx="22" fill={`url(#${gradId})`} />
      <text
        x="50" y="70" textAnchor="middle"
        fontFamily={FONT} fontWeight="900" fontSize="52" letterSpacing="-3"
        fill="#ffffff"
      >
        EY
      </text>
    </svg>
  );

  if (variant === 'mark') {
    return (
      <span className={className} style={{ display: 'inline-flex', ...style }}>
        {badge}
      </span>
    );
  }

  return (
    <span
      className={className}
      style={{ display: 'inline-flex', alignItems: 'center', gap: Math.round(height * 0.26), ...style }}
    >
      {badge}
      <span
        style={{
          fontFamily: FONT,
          fontWeight: 800,
          fontSize: Math.round(height * 0.64),
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
