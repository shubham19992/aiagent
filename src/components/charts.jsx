// ============================================================
// charts.jsx — small, dependency-free presentational chart
// primitives shared across observability views. Styling lives in
// Dashboard.css (xd-kpi, xd-donut, xd-bars, xd-meter, …).
// ============================================================
import React from 'react';

// Grafana classic palette (purples swapped for neutral teal/slate)
export const CHART_COLORS = ['#73bf69', '#5794f2', '#fade2a', '#ff9830', '#f2495c', '#2dd4bf', '#94a3b8', '#37872d'];

/** A single headline metric tile. */
export function Kpi({ icon, label, value, sub, tone = 'brand', delta }) {
  return (
    <div className={`xd-kpi xd-tone-${tone}`}>
      <div className="xd-kpi-icon">{icon}</div>
      <div className="xd-kpi-body">
        <div className="xd-kpi-value">
          {value}
          {delta != null && (
            <span className={`xd-kpi-delta ${delta >= 0 ? 'up' : 'down'}`}>
              {delta >= 0 ? '▲' : '▼'} {Math.abs(delta).toFixed(1)}%
            </span>
          )}
        </div>
        <div className="xd-kpi-label">{label}</div>
        {sub && <div className="xd-kpi-sub">{sub}</div>}
      </div>
    </div>
  );
}

/** Donut + legend. data: [{label, value}]. */
export function Donut({ data, total, unit = '', centerCap = 'total' }) {
  const r = 56;
  const c = 2 * Math.PI * r;
  const sum = total ?? data.reduce((a, d) => a + d.value, 0);
  let offset = 0;
  return (
    <div className="xd-donut">
      <svg viewBox="0 0 140 140" width="150" height="150">
        <circle cx="70" cy="70" r={r} fill="none" stroke="#2c3235" strokeWidth="16" />
        {data.map((d, i) => {
          const frac = sum ? d.value / sum : 0;
          const dash = frac * c;
          const seg = (
            <circle
              key={d.label}
              cx="70" cy="70" r={r} fill="none"
              stroke={CHART_COLORS[i % CHART_COLORS.length]}
              strokeWidth="16"
              strokeDasharray={`${dash} ${c - dash}`}
              strokeDashoffset={-offset}
              transform="rotate(-90 70 70)"
              strokeLinecap="butt"
            />
          );
          offset += dash;
          return seg;
        })}
        <text x="70" y="66" textAnchor="middle" className="xd-donut-num">
          {unit === '$' ? `$${Math.round(sum).toLocaleString()}` : Math.round(sum).toLocaleString()}
        </text>
        <text x="70" y="86" textAnchor="middle" className="xd-donut-cap">{centerCap}</text>
      </svg>
      <ul className="xd-legend">
        {data.map((d, i) => (
          <li key={d.label}>
            <span className="xd-dot" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
            <span className="xd-legend-label">{d.label}</span>
            <span className="xd-legend-val">{unit === '$' ? `$${Math.round(d.value).toLocaleString()}` : `${d.value}${unit}`}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Horizontal bar list. items: [{label, value, suffix?}]. */
export function BarList({ items }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <div className="xd-bars">
      {items.map((it, i) => (
        <div className="xd-bar-row" key={it.label}>
          <span className="xd-bar-label">{it.label}</span>
          <div className="xd-bar-track">
            <div
              className="xd-bar-fill"
              style={{ width: `${(it.value / max) * 100}%`, background: CHART_COLORS[i % CHART_COLORS.length] }}
            />
          </div>
          <span className="xd-bar-val">{it.value}{it.suffix || ''}</span>
        </div>
      ))}
    </div>
  );
}

/** Labelled progress meter. */
export function Meter({ label, value, max, display, tone }) {
  const pct = max ? Math.min(100, (value / max) * 100) : 0;
  const color = tone === 'warn' ? '#d97706' : tone === 'bad' ? '#dc2626' : undefined;
  return (
    <div className="xd-meter">
      <div className="xd-meter-head">
        <span>{label}</span>
        <strong>{display}</strong>
      </div>
      <div className="xd-meter-track">
        <div className="xd-meter-fill" style={{ width: `${Math.max(2, pct)}%`, ...(color ? { background: color } : {}) }} />
      </div>
    </div>
  );
}

/** Titled section wrapper. */
export function Section({ title, icon, desc, children, actions }) {
  return (
    <section className="xd-section">
      <div className="xd-section-head">
        <span className="xd-section-icon">{icon}</span>
        <div className="xd-section-head-text">
          <h2>{title}</h2>
          {desc && <p>{desc}</p>}
        </div>
        {actions && <div className="xd-section-actions">{actions}</div>}
      </div>
      {children}
    </section>
  );
}

/**
 * Filled area sparkline / trend line. values: number[].
 * Renders a smooth-ish polyline with a soft gradient fill + x labels.
 */
export function Sparkline({ values = [], labels = [], unit = '', color = '#73bf69', height = 120 }) {
  const w = 520;
  const h = height;
  const padX = 6;
  const padY = 12;
  if (values.length === 0) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const stepX = (w - padX * 2) / Math.max(1, values.length - 1);
  const pts = values.map((v, i) => {
    const x = padX + i * stepX;
    const y = padY + (1 - (v - min) / span) * (h - padY * 2);
    return [x, y];
  });
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  const area = `${line} L${pts[pts.length - 1][0].toFixed(1)},${h - padY} L${pts[0][0].toFixed(1)},${h - padY} Z`;
  const id = `spark-${color.replace('#', '')}`;
  return (
    <div className="xd-spark">
      <svg viewBox={`0 0 ${w} ${h + 16}`} width="100%" height={h + 16} preserveAspectRatio="none">
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.28" />
            <stop offset="100%" stopColor={color} stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <path d={area} fill={`url(#${id})`} />
        <path d={line} fill="none" stroke={color} strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" />
        {pts.map((p, i) => (
          <circle key={i} cx={p[0]} cy={p[1]} r="2.6" fill={color} />
        ))}
        {labels.map((lb, i) => (
          <text
            key={i}
            x={padX + i * stepX}
            y={h + 12}
            textAnchor="middle"
            className="xd-spark-x"
          >
            {lb}
          </text>
        ))}
      </svg>
      <div className="xd-spark-range">
        <span>min {unit}{Math.round(min).toLocaleString()}</span>
        <span>max {unit}{Math.round(max).toLocaleString()}</span>
      </div>
    </div>
  );
}
