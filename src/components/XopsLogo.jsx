import React from 'react';

const FONT = "'Plus Jakarta Sans', 'Inter', system-ui, sans-serif";
const YELLOW = '#F4E215';

/**
 * EY xOps brand logo — a single combined lockup.
 *
 * A self-contained SVG (no image asset to ship/cache): a tapered yellow swoosh
 * sweeps over the "EY xOps" wordmark, mixing the two into one mark. "EY" and
 * "Ops" use currentColor so the logo reads on light and dark surfaces; the "x"
 * carries the brand accent. `variant="mark"` renders a compact square badge
 * (swoosh over "EY"); `variant="full"` is the full wordmark lockup.
 */
const XopsLogo = ({ height = 40, variant = 'full', style, className }) => {
  const h = Math.round(height);

  if (variant === 'mark') {
    return (
      <span className={className} style={{ display: 'inline-flex', ...style }}>
        <svg
          width={h}
          height={h}
          viewBox="0 0 120 120"
          role="img"
          aria-label="EY xOps logo"
          style={{ display: 'block', flex: '0 0 auto' }}
        >
          <polygon points="6,58 116,8 116,34" fill={YELLOW} />
          <text
            x="60" y="106" textAnchor="middle"
            fontFamily={FONT} fontWeight="900" fontSize="60" letterSpacing="-3"
            fill="currentColor"
          >
            EY
          </text>
        </svg>
      </span>
    );
  }

  // Full lockup: swoosh over the combined "EY xOps" wordmark, in one SVG.
  const vw = 372;
  const vh = 132;
  const w = Math.round(height * (vw / vh));
  return (
    <span className={className} style={{ display: 'inline-flex', alignItems: 'center', ...style }}>
      <svg
        width={w}
        height={h}
        viewBox={`0 0 ${vw} ${vh}`}
        role="img"
        aria-label="EY xOps logo"
        style={{ display: 'block', flex: '0 0 auto' }}
      >
        {/* tapered yellow swoosh sweeping across the top */}
        <polygon points="8,74 364,10 364,44" fill={YELLOW} />
        {/* combined EY xOps wordmark */}
        <text
          x="186" y="118" textAnchor="middle"
          fontFamily={FONT} fontSize="66" letterSpacing="-2"
        >
          <tspan fontWeight="900" fill="currentColor">EY</tspan>
          <tspan fontWeight="800" fill="#f15a24"> x</tspan>
          <tspan fontWeight="800" fill="currentColor">Ops</tspan>
        </text>
      </svg>
    </span>
  );
};

export default XopsLogo;
