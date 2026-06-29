import React, { useEffect, useState } from 'react';
import { useParams, useLocation, useNavigate, Link } from 'react-router-dom';
import {
  FiArrowLeft, FiAlertTriangle, FiClock, FiRefreshCw, FiGrid,
  FiCpu, FiHardDrive, FiDatabase, FiShare2, FiBox, FiActivity, FiServer, FiLoader, FiLayers,
} from 'react-icons/fi';
import { FaAws } from 'react-icons/fa';
import { VscAzure } from 'react-icons/vsc';
import { SiGooglecloud } from 'react-icons/si';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';
import { PageHeader } from './_parts';
import { queryMetrics } from '../../api/metrics';

const ENV_NAME = { aws: 'AWS', azure: 'Azure', gcp: 'GCP' };
const CLOUD_ICON = { aws: <FaAws />, azure: <VscAzure />, gcp: <SiGooglecloud /> };

// Grafana-ish categorical palette.
const COLORS = ['#7eb26d', '#eab839', '#6ed0e0', '#ef843c', '#e24d42', '#1f78c1', '#ba43a9', '#705da0', '#508642', '#cca300'];

const TT = {
  contentStyle: { background: '#181b1f', border: '1px solid #2e3338', borderRadius: 6, color: '#d8d9da', fontSize: 12 },
  itemStyle: { color: '#d8d9da' },
  labelStyle: { color: '#9fa7b3' },
};

const fmtTime = (ts) => {
  try { return new Date(ts * 1000).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' }); }
  catch { return String(ts); }
};

// Compact numbers for axes/tooltips (bytes, counts, etc.).
const compact = (v) => {
  const n = Number(v);
  if (!isFinite(n)) return v;
  const a = Math.abs(n);
  if (a >= 1e9) return `${(n / 1e9).toFixed(1)}G`;
  if (a >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (a >= 1e3) return `${(n / 1e3).toFixed(1)}k`;
  return `${Math.round(n * 100) / 100}`;
};

const ACRONYMS = { cpu: 'CPU', io: 'IO', db: 'DB', k8s: 'K8s', os: 'OS' };
const prettyName = (s) => s.split(/[._]/).map((w) => ACRONYMS[w] || (w.charAt(0).toUpperCase() + w.slice(1))).join(' ');

const unitFor = (name) => (name.includes('utilization') ? '%' : name.includes('.io') || name.includes('capacity') ? ' B' : '');

const iconFor = (name) => {
  if (name.includes('cpu')) return <FiCpu />;
  if (name.includes('memory')) return <FiActivity />;
  if (name.includes('disk') || name.includes('storage')) return <FiHardDrive />;
  if (name.includes('network') || name.includes('loadbalancer')) return <FiShare2 />;
  if (name.startsWith('db')) return <FiDatabase />;
  if (name.includes('k8s') || name.includes('container')) return <FiBox />;
  return <FiServer />;
};

// Label that distinguishes multiple series within one metric chart.
const seriesKey = (m) =>
  m.direction || m.device || m['k8s.pod.name'] || m['k8s.node.name'] ||
  m['container.name'] || m['db.name'] || m['host.name'] || m['resource.id'] || 'value';

// Most specific resource context for the panel subtitle.
const contextOf = (m) =>
  m['resource.id'] || m['host.name'] || m['k8s.pod.name'] || m['k8s.node.name'] ||
  m['container.name'] || m['storage.account'] || m['loadbalancer.name'] || m['db.name'] || '';

/** Build merged {time, <seriesKey>: value} rows for a metric's series list. */
function buildSeries(seriesList) {
  const keys = [];
  const byTs = {};
  seriesList.forEach((s) => {
    const k = seriesKey(s.metric);
    if (!keys.includes(k)) keys.push(k);
    (s.values || []).forEach(([ts, v]) => {
      byTs[ts] = byTs[ts] || { ts };
      byTs[ts][k] = Number(v);
    });
  });
  const data = Object.values(byTs).sort((a, b) => a.ts - b.ts).map((d) => ({ ...d, time: fmtTime(d.ts) }));
  return { data, keys };
}

function Panel({ title, subtitle, icon, children }) {
  return (
    <div className="xg-panel">
      <div className="xg-panel-head">
        {icon}<span>{title}</span>
        {subtitle ? <span className="xg-panel-sub">{subtitle}</span> : null}
      </div>
      <div className="xg-panel-body">{children}</div>
    </div>
  );
}

function StatPanel({ label, value, unit, tone }) {
  return (
    <div className={`xg-panel xg-stat${tone ? ` xg-stat-${tone}` : ''}`}>
      <div className="xg-stat-val">{value}<span className="xg-stat-unit">{unit}</span></div>
      <div className="xg-stat-label">{label}</div>
    </div>
  );
}

/** One time-series line chart for a metric (one or more series). */
function MetricPanel({ name, seriesList }) {
  const { data, keys } = buildSeries(seriesList);
  const unit = unitFor(name);
  return (
    <Panel title={prettyName(name)} subtitle={contextOf(seriesList[0]?.metric || {})} icon={iconFor(name)}>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data} margin={{ top: 8, right: 16, left: -6, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#23272e" />
          <XAxis dataKey="time" tick={{ fill: '#9fa7b3', fontSize: 10 }} stroke="#3a3f44" minTickGap={24} />
          <YAxis tick={{ fill: '#9fa7b3', fontSize: 10 }} stroke="#3a3f44" width={46} tickFormatter={compact} />
          <Tooltip {...TT} formatter={(v, n) => [`${compact(v)}${unit}`, n]} />
          {keys.length > 1 && <Legend wrapperStyle={{ fontSize: 11, color: '#c7ccd1' }} />}
          {keys.map((k, i) => (
            <Line key={k} type="monotone" dataKey={k} name={k} stroke={COLORS[i % COLORS.length]} strokeWidth={2} dot={false} isAnimationActive={false} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </Panel>
  );
}

const lastVal = (groups, name) => {
  const s = groups[name]?.[0];
  const vals = s?.values || [];
  return vals.length ? Number(vals[vals.length - 1][1]) : null;
};

/** Grafana-style time-series dashboard for discovery metrics. */
export default function DiscoveryExplorePage() {
  const { opCode, envCode } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const discovery = location.state?.discovery || null;
  const envName = ENV_NAME[envCode] || (envCode || '').toUpperCase();
  const discoveryPath = `/dashboard/observability/${opCode}/${envCode}/discovery`;
  const opPath = `/dashboard/observability/${opCode}`;

  const [matrix, setMatrix] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError('');
    queryMetrics({ resourceId: discovery?.projectId })
      .then((d) => { if (alive) { setMatrix(d); setLoading(false); } })
      .catch((e) => { if (alive) { setError(e?.message || 'Failed to load metrics.'); setLoading(false); } });
    return () => { alive = false; };
  }, [discovery]);

  const result = matrix?.result || [];
  // Group series by metric name (so e.g. network receive+transmit share a chart).
  const groups = {};
  result.forEach((s) => {
    const n = s.metric?.__name__ || 'unknown';
    (groups[n] = groups[n] || []).push(s);
  });
  const names = Object.keys(groups);

  // Time window covered by the data (for the toolbar range pill).
  const allTs = result.flatMap((s) => (s.values || []).map((v) => v[0]));
  const tMin = allTs.length ? Math.min(...allTs) : null;
  const tMax = allTs.length ? Math.max(...allTs) : null;
  const rangeLabel = tMin ? `${fmtTime(tMin)} – ${fmtTime(tMax)}` : '';

  const cloud = discovery?.cloudProvider || result[0]?.metric?.['cloud.provider']?.toUpperCase() || envName;
  const stats = [
    { name: 'system.cpu.utilization', label: 'CPU', unit: '%', tone: 'warnHigh' },
    { name: 'system.memory.utilization', label: 'Memory', unit: '%', tone: 'warnHigh' },
    { name: 'system.disk.utilization', label: 'Disk', unit: '%', tone: 'warnHigh' },
    { name: 'db.client.connections.usage', label: 'DB Connections', unit: '' },
  ].map((s) => ({ ...s, value: lastVal(groups, s.name) }))
    .filter((s) => s.value != null);

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
        <div className="xg-toolbar">
          <div className="xg-toolbar-l">
            <span className="xg-cloud-badge">{CLOUD_ICON[envCode] || <FiGrid />}</span>
            <div className="xg-toolbar-info">
              <div className="xg-toolbar-title">
                {cloud} Metrics
                {!loading && !error && names.length > 0 && (
                  <span className="xg-live"><i /> live</span>
                )}
              </div>
              <div className="xg-toolbar-tags">
                <span className="xg-tag"><FiServer /> {opCode}</span>
                <span className="xg-tag">{envName}</span>
                <span className="xg-tag"><FiGrid /> {names.length} metrics</span>
                <span className="xg-tag"><FiLayers /> {result.length} series</span>
              </div>
            </div>
          </div>
          <div className="xg-toolbar-r">
            {rangeLabel && <span className="xg-range"><FiClock /> {rangeLabel}</span>}
            <button type="button" className="xg-toolbar-btn" onClick={() => navigate(0)} title="Refresh"><FiRefreshCw /></button>
            <button type="button" className="xg-toolbar-btn xg-toolbar-back" onClick={() => navigate(-1)}><FiArrowLeft /> Back</button>
          </div>
        </div>

        {loading ? (
          <div className="xg-loading"><FiLoader className="xd-spin" /> Loading metrics…</div>
        ) : error ? (
          <div className="xd-empty"><FiAlertTriangle /><p>{error}</p></div>
        ) : names.length === 0 ? (
          <div className="xd-empty">
            <FiAlertTriangle /><p>No metrics returned.</p>
            <Link to={discoveryPath} className="xd-btn xd-btn-sm">Back to Discovery</Link>
          </div>
        ) : (
          <div className="xg-grid">
            {stats.map((s) => (
              <StatPanel key={s.name} label={s.label} value={compact(s.value)} unit={s.unit}
                tone={s.unit === '%' && s.value >= 80 ? 'bad' : s.unit === '%' && s.value >= 60 ? 'warn' : undefined} />
            ))}
            {names.map((name) => (
              <div className="xg-w3" key={name}><MetricPanel name={name} seriesList={groups[name]} /></div>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
