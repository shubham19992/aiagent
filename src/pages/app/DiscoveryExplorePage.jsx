import React from 'react';
import { useParams, useLocation, useNavigate, Link } from 'react-router-dom';
import {
  FiArrowLeft, FiAlertTriangle, FiClock, FiMapPin, FiLayers, FiActivity, FiBox,
  FiRefreshCw, FiGrid,
} from 'react-icons/fi';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell,
  AreaChart, Area, PieChart, Pie, Legend,
} from 'recharts';
import { PageHeader } from './_parts';

const ENV_NAME = { aws: 'AWS', azure: 'Azure', gcp: 'GCP' };

const fmtDateTime = (d) => {
  if (!d) return '—';
  try { return new Date(d).toLocaleString(undefined, { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }); }
  catch { return d; }
};

// Grafana-ish categorical palette.
const COLORS = ['#7eb26d', '#eab839', '#6ed0e0', '#ef843c', '#e24d42', '#1f78c1', '#ba43a9', '#705da0', '#508642', '#cca300'];

// Shared dark tooltip styling for all recharts panels.
const TT = {
  contentStyle: { background: '#181b1f', border: '1px solid #2e3338', borderRadius: 6, color: '#d8d9da', fontSize: 12 },
  itemStyle: { color: '#d8d9da' },
  labelStyle: { color: '#9fa7b3' },
};

/** Panel shell — Grafana panel: header + body. */
function Panel({ title, icon, children }) {
  return (
    <div className="xg-panel">
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

const Empty = () => <div className="xg-empty">No data</div>;

/** Horizontal bar chart (recharts). */
function CategoryBars({ data }) {
  if (!data.length) return <Empty />;
  return (
    <ResponsiveContainer width="100%" height={Math.max(170, data.length * 38)}>
      <BarChart layout="vertical" data={data} margin={{ top: 4, right: 18, left: 4, bottom: 4 }}>
        <CartesianGrid horizontal={false} stroke="#23272e" />
        <XAxis type="number" tick={{ fill: '#9fa7b3', fontSize: 11 }} stroke="#3a3f44" allowDecimals={false} />
        <YAxis type="category" dataKey="name" width={120} tick={{ fill: '#c7ccd1', fontSize: 11 }} stroke="#3a3f44" />
        <Tooltip {...TT} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
        <Bar dataKey="count" radius={[0, 3, 3, 0]} maxBarSize={26}>
          {data.map((d, i) => <Cell key={d.name} fill={COLORS[i % COLORS.length]} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Area / time-series chart (recharts). */
function RegionArea({ data }) {
  if (!data.length) return <Empty />;
  return (
    <ResponsiveContainer width="100%" height={180}>
      <AreaChart data={data} margin={{ top: 8, right: 14, left: -14, bottom: 0 }}>
        <defs>
          <linearGradient id="xgArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#6ed0e0" stopOpacity={0.5} />
            <stop offset="95%" stopColor="#6ed0e0" stopOpacity={0.04} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#23272e" />
        <XAxis dataKey="name" tick={{ fill: '#9fa7b3', fontSize: 10 }} stroke="#3a3f44" interval={0} />
        <YAxis tick={{ fill: '#9fa7b3', fontSize: 11 }} stroke="#3a3f44" allowDecimals={false} />
        <Tooltip {...TT} cursor={{ stroke: '#3a3f44' }} />
        <Area type="monotone" dataKey="count" stroke="#6ed0e0" strokeWidth={2} fill="url(#xgArea)" dot={{ r: 2, fill: '#6ed0e0' }} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

/** Donut pie chart (recharts). */
function TypePie({ data }) {
  if (!data.length) return <Empty />;
  return (
    <ResponsiveContainer width="100%" height={210}>
      <PieChart>
        <Pie data={data} dataKey="count" nameKey="name" innerRadius={48} outerRadius={78} paddingAngle={1} stroke="#181b1f">
          {data.map((d, i) => <Cell key={d.name} fill={COLORS[i % COLORS.length]} />)}
        </Pie>
        <Tooltip {...TT} />
        <Legend wrapperStyle={{ fontSize: 11, color: '#c7ccd1' }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

/** Health donut (recharts) with a centered % label. */
function HealthDonut({ healthy, unhealthy, pct }) {
  const data = [{ name: 'Healthy', value: healthy }, { name: 'Unhealthy', value: unhealthy }];
  return (
    <div className="xg-gauge-wrap">
      <div className="xg-donut-rc">
        <ResponsiveContainer width={130} height={130}>
          <PieChart>
            <Pie data={data} dataKey="value" innerRadius={42} outerRadius={62} startAngle={90} endAngle={-270} stroke="none">
              <Cell fill="#73bf69" />
              <Cell fill="#f2495c" />
            </Pie>
            <Tooltip {...TT} />
          </PieChart>
        </ResponsiveContainer>
        <div className="xg-donut-center"><span className="xg-donut-pct">{pct}%</span><span className="xg-donut-sub">healthy</span></div>
      </div>
      <div className="xg-gauge-legend">
        <span><i className="xg-dot xg-dot-ok" /> Healthy {healthy}</span>
        <span><i className="xg-dot xg-dot-bad" /> Unhealthy {unhealthy}</span>
      </div>
    </div>
  );
}

/** Table panel. */
function TablePanel({ rows }) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  if (!rows.length) return <Empty />;
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

            <div className="xg-w2"><Panel title="Health" icon={<FiActivity />}><HealthDonut healthy={healthy} unhealthy={unhealthy} pct={healthPct} /></Panel></div>
            <div className="xg-w4"><Panel title="Resources by Category" icon={<FiBox />}><CategoryBars data={byCategory} /></Panel></div>

            <div className="xg-w3"><Panel title="Resources by Region" icon={<FiMapPin />}><RegionArea data={byRegion} /></Panel></div>
            <div className="xg-w3"><Panel title="Resource Type Distribution" icon={<FiLayers />}><TypePie data={byType} /></Panel></div>

            <div className="xg-w6"><Panel title="Top Resource Types" icon={<FiLayers />}><TablePanel rows={byType} /></Panel></div>
          </div>
        )}
      </main>
    </>
  );
}
