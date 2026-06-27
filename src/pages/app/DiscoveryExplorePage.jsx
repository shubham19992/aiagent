import React from 'react';
import { useParams, useLocation, useNavigate, Link } from 'react-router-dom';
import {
  FiArrowLeft, FiAlertTriangle, FiClock, FiMapPin, FiLayers, FiActivity, FiBox,
  FiRefreshCw, FiGrid,
} from 'react-icons/fi';
import { PageHeader } from './_parts';

const ENV_NAME = { aws: 'AWS', azure: 'Azure', gcp: 'GCP' };

const fmtDateTime = (d) => {
  if (!d) return '—';
  try { return new Date(d).toLocaleString(undefined, { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }); }
  catch { return d; }
};

// Grafana-ish categorical palette.
const COLORS = ['#7eb26d', '#eab839', '#6ed0e0', '#ef843c', '#e24d42', '#1f78c1', '#ba43a9', '#705da0', '#508642', '#cca300'];

/** Panel shell — Grafana panel: header + body. */
function Panel({ title, icon, className = '', children }) {
  return (
    <div className={`xg-panel ${className}`}>
      <div className="xg-panel-head">{icon}<span>{title}</span></div>
      <div className="xg-panel-body">{children}</div>
    </div>
  );
}

function StatPanel({ label, value, tone }) {
  return (
    <div className={`xg-panel xg-stat${tone ? ` xg-stat-${tone}` : ''}`}>
      <div className="xg-stat-val">{value}</div>
      <div className="xg-stat-label">{label}</div>
    </div>
  );
}

/** Horizontal bar-gauge list (Grafana "Bar gauge"). */
function BarGauge({ data, unit = '' }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  if (!data.length) return <div className="xg-empty">No data</div>;
  return (
    <div className="xg-bars">
      {data.map((d, i) => (
        <div className="xg-bar-row" key={d.name}>
          <span className="xg-bar-label" title={d.name}>{d.name}</span>
          <span className="xg-bar-track">
            <span className="xg-bar-fill" style={{ width: `${(d.count / max) * 100}%`, background: COLORS[i % COLORS.length] }} />
          </span>
          <span className="xg-bar-val">{d.count}{unit}</span>
        </div>
      ))}
    </div>
  );
}

/** SVG area/line chart (Grafana "Time series" look) over a categorical axis. */
function AreaChart({ data }) {
  if (!data.length) return <div className="xg-empty">No data</div>;
  const W = 100, H = 42, pad = 4;
  const max = Math.max(1, ...data.map((d) => d.count));
  const n = data.length;
  const x = (i) => (n === 1 ? W / 2 : pad + (i / (n - 1)) * (W - pad * 2));
  const y = (v) => H - pad - (v / max) * (H - pad * 2);
  const pts = data.map((d, i) => `${x(i)},${y(d.count)}`);
  const line = `M ${pts.join(' L ')}`;
  const area = `M ${x(0)},${H - pad} L ${pts.join(' L ')} L ${x(n - 1)},${H - pad} Z`;
  return (
    <div className="xg-area">
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="xg-area-svg">
        <defs>
          <linearGradient id="xgArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6ed0e0" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#6ed0e0" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((g) => (
          <line key={g} x1="0" x2={W} y1={H * g} y2={H * g} stroke="#23272e" strokeWidth="0.3" />
        ))}
        <path d={area} fill="url(#xgArea)" />
        <path d={line} fill="none" stroke="#6ed0e0" strokeWidth="0.7" vectorEffect="non-scaling-stroke" />
        {data.map((d, i) => <circle key={d.name} cx={x(i)} cy={y(d.count)} r="0.8" fill="#6ed0e0" />)}
      </svg>
      <div className="xg-area-labels">
        {data.map((d) => <span key={d.name} title={`${d.name}: ${d.count}`}>{d.name}</span>)}
      </div>
    </div>
  );
}

/** SVG-free pie via conic-gradient (Grafana "Pie chart"). */
function PieChart({ data }) {
  const total = data.reduce((n, d) => n + d.count, 0);
  if (!total) return <div className="xg-empty">No data</div>;
  let acc = 0;
  const stops = data.map((d, i) => {
    const start = (acc / total) * 360;
    acc += d.count;
    const end = (acc / total) * 360;
    return `${COLORS[i % COLORS.length]} ${start}deg ${end}deg`;
  }).join(', ');
  return (
    <div className="xg-pie-wrap">
      <div className="xg-pie" style={{ background: `conic-gradient(${stops})` }} />
      <div className="xg-pie-legend">
        {data.map((d, i) => (
          <span key={d.name}>
            <i className="xg-dot" style={{ background: COLORS[i % COLORS.length] }} />
            <span className="xg-pie-name" title={d.name}>{d.name}</span>
            <b>{Math.round((d.count / total) * 100)}%</b>
          </span>
        ))}
      </div>
    </div>
  );
}

/** Table panel (Grafana "Table"). */
function TablePanel({ rows }) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  if (!rows.length) return <div className="xg-empty">No data</div>;
  return (
    <table className="xg-table">
      <thead><tr><th>Resource Type</th><th className="xg-table-num">Count</th><th>Share</th></tr></thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={r.name}>
            <td>{r.name}</td>
            <td className="xg-table-num">{r.count}</td>
            <td>
              <span className="xg-table-bar">
                <span style={{ width: `${(r.count / max) * 100}%`, background: COLORS[i % COLORS.length] }} />
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** Grafana-style dashboard for a discovery run. */
export default function DiscoveryExplorePage() {
  const { opCode, envCode } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const discovery = location.state?.discovery || null;
  const envName = ENV_NAME[envCode] || (envCode || '').toUpperCase();
  const discoveryPath = `/dashboard/observability/${opCode}/${envCode}/discovery`;
  const opPath = `/dashboard/observability/${opCode}`;

  const accounts = (discovery?.results || [])
    .filter((a) => a.status === 'SUCCESS')
    .flatMap((a) => a.data?.recommendations?.accounts || []);
  const allResources = accounts.flatMap((a) => (a.categories || []).flatMap((c) => c.resources || []));

  const sum = (fn) => accounts.reduce((n, a) => n + (fn(a) || 0), 0);
  const totalResources = sum((a) => a.summary?.totalResources) || allResources.length;
  const resourceGroups = sum((a) => a.summary?.resourceGroups);
  const regionsCount = sum((a) => a.summary?.regions);
  const healthy = sum((a) => a.health?.healthy);
  const unhealthy = sum((a) => a.health?.unhealthy);
  const healthPct = healthy + unhealthy > 0 ? Math.round((healthy / (healthy + unhealthy)) * 100) : 0;

  const tally = (arr, keyFn) => {
    const m = {};
    arr.forEach((x) => { const k = keyFn(x) || 'unknown'; m[k] = (m[k] || 0) + 1; });
    return Object.entries(m).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
  };

  const catMap = {};
  accounts.forEach((a) => (a.categories || []).forEach((c) => {
    catMap[c.name] = (catMap[c.name] || 0) + (c.count ?? (c.resources || []).length);
  }));
  const byCategory = Object.entries(catMap).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
  const byRegion = tally(allResources, (r) => r.properties?.region);
  const allTypes = tally(allResources, (r) => r.resourceType);
  const byType = allTypes.slice(0, 10);

  return (
    <>
      <PageHeader
        crumbs={[
          { label: 'Observability', to: '/dashboard' },
          { label: opCode, to: opPath },
          { label: envName, to: `/dashboard/observability/${opCode}/${envCode}` },
          { label: 'Discovery', to: discoveryPath },
          { label: 'Explore' },
        ]}
      />
      <main className="xd-main xg-main">
        {/* Grafana-style dashboard toolbar */}
        <div className="xg-toolbar">
          <div className="xg-toolbar-l">
            <FiGrid className="xg-toolbar-ico" />
            <div>
              <div className="xg-toolbar-title">{discovery?.cloudProvider || envName} · Discovery</div>
              <div className="xg-toolbar-tags">
                <span className="xg-tag">{envName}</span>
                <span className="xg-tag">{opCode}</span>
                <span className="xg-tag">{totalResources} resources</span>
              </div>
            </div>
          </div>
          <div className="xg-toolbar-r">
            <span className="xg-toolbar-time"><FiClock /> {fmtDateTime(discovery?.executionTime)}</span>
            <button type="button" className="xg-toolbar-btn" onClick={() => navigate(0)} title="Refresh"><FiRefreshCw /></button>
            <button type="button" className="xg-toolbar-btn xg-toolbar-back" onClick={() => navigate(-1)}><FiArrowLeft /> Back</button>
          </div>
        </div>

        {!discovery ? (
          <div className="xd-empty">
            <FiAlertTriangle />
            <p>No discovery data — open Explore from the discovery page.</p>
            <Link to={discoveryPath} className="xd-btn xd-btn-sm">Go to Discovery</Link>
          </div>
        ) : (
          <div className="xg-grid">
            <StatPanel label="Total Resources" value={totalResources} />
            <StatPanel label="Resource Groups" value={resourceGroups} />
            <StatPanel label="Regions" value={regionsCount} />
            <StatPanel label="Resource Types" value={allTypes.length} />
            <StatPanel label="Healthy" value={healthy} tone="ok" />
            <StatPanel label="Unhealthy" value={unhealthy} tone={unhealthy ? 'bad' : undefined} />

            <div className="xg-w2">
              <Panel title="Health" icon={<FiActivity />}>
                <div className="xg-gauge-wrap">
                  <div className="xg-donut" style={{ '--p': `${healthPct}%` }}>
                    <div className="xg-donut-hole"><span className="xg-donut-pct">{healthPct}%</span><span className="xg-donut-sub">healthy</span></div>
                  </div>
                  <div className="xg-gauge-legend">
                    <span><i className="xg-dot xg-dot-ok" /> Healthy {healthy}</span>
                    <span><i className="xg-dot xg-dot-bad" /> Unhealthy {unhealthy}</span>
                  </div>
                </div>
              </Panel>
            </div>
            <div className="xg-w4"><Panel title="Resources by Category" icon={<FiBox />}><BarGauge data={byCategory} /></Panel></div>

            <div className="xg-w3"><Panel title="Resources by Region" icon={<FiMapPin />}><AreaChart data={byRegion} /></Panel></div>
            <div className="xg-w3"><Panel title="Resource Type Distribution" icon={<FiLayers />}><PieChart data={byType} /></Panel></div>

            <div className="xg-w6"><Panel title="Top Resource Types" icon={<FiLayers />}><TablePanel rows={byType} /></Panel></div>
          </div>
        )}
      </main>
    </>
  );
}
