import React from 'react';

const FONT = "'Plus Jakarta Sans', 'Inter', system-ui, sans-serif";
const EY_YELLOW = '#FFE600';
const EY_DARK = '#2E2E38';

/**
 * EY xOps brand logo.
 *
 * A self-contained SVG (no image asset to ship/cache): an "EY" badge on the EY
 * yellow rounded tile, followed by the "xOps" wordmark. `variant="mark"`
 * renders the badge alone (card badge); `variant="full"` is the full lockup.
 * "Ops" uses currentColor so the wordmark reads on light and dark surfaces.
 */
const XopsLogo = ({ height = 40, variant = 'full', style, className }) => {
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
      <rect x="1" y="1" width="98" height="98" rx="22" fill={EY_YELLOW} />
      <text
        x="50" y="70" textAnchor="middle"
        fontFamily={FONT} fontWeight="900" fontSize="52" letterSpacing="-3"
        fill={EY_DARK}
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
