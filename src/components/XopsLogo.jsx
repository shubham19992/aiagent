import React from 'react';

const FONT = "'Plus Jakarta Sans', 'Inter', system-ui, sans-serif";
const EY_YELLOW = '#FFE600';

/**
 * EY · xOps brand logo.
 *
 * A self-contained SVG so there's no image asset to ship/cache. The mark is the
 * EY beam over a bold "EY", followed by the "xOps" wordmark with a thin
 * divider. `variant="full"` is the full lockup; `variant="mark"` is the EY
 * mark alone (card badge). The mark uses currentColor for "EY" so it reads on
 * both light and dark surfaces (dark EY on light, light EY on dark).
 */
const XopsLogo = ({ height = 40, variant = 'full', style, className }) => {
  const tile = Math.round(height);

  const mark = (
    <svg
      width={tile}
      height={tile}
      viewBox="0 0 120 120"
      role="img"
      aria-label="EY xOps logo"
      style={{ display: 'block', flex: '0 0 auto' }}
    >
      {/* EY beam */}
      <polygon points="4,52 118,6 118,33 4,60" fill={EY_YELLOW} />
      {/* EY wordmark */}
      <text
        x="61"
        y="108"
        textAnchor="middle"
        fontFamily={FONT}
        fontWeight="900"
        fontSize="62"
        letterSpacing="-3"
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
      style={{ display: 'inline-flex', alignItems: 'center', gap: Math.round(height * 0.22), ...style }}
    >
      {mark}
      {/* divider */}
      <span
        aria-hidden
        style={{
          width: Math.max(1, Math.round(height * 0.04)),
          height: Math.round(height * 0.58),
          background: 'currentColor',
          opacity: 0.22,
          borderRadius: 2,
        }}
      />
      <span
        style={{
          fontFamily: FONT,
          fontWeight: 800,
          fontSize: Math.round(height * 0.62),
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
