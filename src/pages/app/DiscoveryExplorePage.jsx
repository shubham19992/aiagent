import React from 'react';
import { useParams, useLocation, useNavigate, Link } from 'react-router-dom';
import { FiArrowLeft, FiAlertTriangle, FiClock, FiMapPin, FiLayers, FiActivity, FiBox } from 'react-icons/fi';
import { PageHeader } from './_parts';

const ENV_NAME = { aws: 'AWS', azure: 'Azure', gcp: 'GCP' };

const fmtDateTime = (d) => {
  if (!d) return '—';
  try { return new Date(d).toLocaleString(undefined, { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }); }
  catch { return d; }
};

// Palette cycled across bar rows, Grafana-ish.
const COLORS = ['#7eb26d', '#eab839', '#6ed0e0', '#ef843c', '#e24d42', '#1f78c1', '#ba43a9', '#705da0', '#508642', '#cca300'];

/** Horizontal bar list (one of the Grafana-style panels). */
function BarPanel({ title, icon, data, unit = '' }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  return (
    <div className="xg-panel">
      <div className="xg-panel-head">{icon}<span>{title}</span></div>
      <div className="xg-bars">
        {data.length === 0 ? (
          <div className="xg-empty">No data</div>
        ) : data.map((d, i) => (
          <div className="xg-bar-row" key={d.name}>
            <span className="xg-bar-label" title={d.name}>{d.name}</span>
            <span className="xg-bar-track">
              <span className="xg-bar-fill" style={{ width: `${(d.count / max) * 100}%`, background: COLORS[i % COLORS.length] }} />
            </span>
            <span className="xg-bar-val">{d.count}{unit}</span>
          </div>
        ))}
      </div>
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

/** Grafana-style dashboard for a discovery run. Opened via the Explore button
 *  on the discovery page; the discovery payload comes through nav state. */
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
  const byType = tally(allResources, (r) => r.resourceType).slice(0, 10);

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
        <div className="xd-pagelead xd-pagelead-row">
          <div>
            <h1>Explore · {discovery?.cloudProvider || envName}</h1>
            <p>{totalResources} resources discovered{discovery?.executionTime ? <> · <FiClock className="xd-disc-inline-ico" /> {fmtDateTime(discovery.executionTime)}</> : null}</p>
          </div>
          <button type="button" className="xd-btn-ghost xd-btn-sm" onClick={() => navigate(-1)}>
            <FiArrowLeft /> Back
          </button>
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
            <StatPanel label="Resource Types" value={byType.length ? tally(allResources, (r) => r.resourceType).length : 0} />
            <StatPanel label="Healthy" value={healthy} tone="ok" />
            <StatPanel label="Unhealthy" value={unhealthy} tone={unhealthy ? 'bad' : undefined} />

            <div className="xg-w2">
              <div className="xg-panel xg-gauge-panel">
                <div className="xg-panel-head"><FiActivity /><span>Health</span></div>
                <div className="xg-gauge-wrap">
                  <div className="xg-donut" style={{ '--p': `${healthPct}%` }}>
                    <div className="xg-donut-hole"><span className="xg-donut-pct">{healthPct}%</span><span className="xg-donut-sub">healthy</span></div>
                  </div>
                  <div className="xg-gauge-legend">
                    <span><i className="xg-dot xg-dot-ok" /> Healthy {healthy}</span>
                    <span><i className="xg-dot xg-dot-bad" /> Unhealthy {unhealthy}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="xg-w4"><BarPanel title="Resources by Category" icon={<FiBox />} data={byCategory} /></div>
            <div className="xg-w3"><BarPanel title="Resources by Region" icon={<FiMapPin />} data={byRegion} /></div>
            <div className="xg-w3"><BarPanel title="Top Resource Types" icon={<FiLayers />} data={byType} /></div>
          </div>
        )}
      </main>
    </>
  );
}
