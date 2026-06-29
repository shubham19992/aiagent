import React, { useEffect, useState } from 'react';
import { useParams, useLocation, useNavigate, Link } from 'react-router-dom';
import {
  FiArrowLeft, FiAlertTriangle, FiClock, FiRefreshCw, FiGrid, FiBarChart2,
  FiCpu, FiHardDrive, FiDatabase, FiShare2, FiBox, FiActivity, FiServer, FiLoader, FiLayers,
  FiSliders, FiX, FiMoreVertical, FiMaximize2, FiChevronRight, FiCheck,
} from 'react-icons/fi';
import { FaAws } from 'react-icons/fa';
import { VscAzure } from 'react-icons/vsc';
import { SiGooglecloud } from 'react-icons/si';
import {
  ResponsiveContainer, LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  RadialBarChart, RadialBar, PolarAngleAxis, PieChart, Pie, Cell,
} from 'recharts';
import { PageHeader } from './_parts';
import { queryMetrics } from '../../api/metrics';

const ENV_NAME = { aws: 'AWS', azure: 'Azure', gcp: 'GCP' };
const CLOUD_ICON = { aws: <FaAws />, azure: <VscAzure />, gcp: <SiGooglecloud /> };

// Grafana-ish categorical palette.
const COLORS = ['#7eb26d', '#eab839', '#6ed0e0', '#ef843c', '#e24d42', '#1f78c1', '#ba43a9', '#705da0', '#508642', '#cca300'];

// Chart types the user can switch between for the (time-series) metrics.
const CHART_TYPES = [
  { id: 'line', label: 'Line' },
  { id: 'smooth', label: 'Smooth Line' },
  { id: 'step', label: 'Stepped Line' },
  { id: 'dashed', label: 'Dashed Line' },
  { id: 'points', label: 'Points' },
  { id: 'area', label: 'Area' },
  { id: 'steparea', label: 'Stepped Area' },
  { id: 'stacked', label: 'Stacked Area' },
  { id: 'bar', label: 'Bar' },
  { id: 'stackedbar', label: 'Stacked Bar' },
  { id: 'gauge', label: 'Gauge' },
  { id: 'pie', label: 'Pie' },
];
const ALL_TYPE_IDS = CHART_TYPES.map((c) => c.id);

/**
 * Chart types that make sense for a given metric, ordered best-first:
 *  • status (0/1 state)  → stepped/bar
 *  • errors / counts     → bar/line
 *  • bytes (io, capacity)→ area/stacked (good for receive+transmit)
 *  • utilization (%)     → line/area
 */
function allowedCharts(name) {
  const multi = name.includes('.io'); // metrics that commonly have >1 series
  if (name.includes('status')) return ['gauge', 'step', 'bar', 'line', 'points'];
  if (name.includes('errors')) return ['bar', 'line', 'step', 'points'];
  if (name.includes('.io') || name.includes('capacity')) {
    return multi
      ? ['area', 'stacked', 'steparea', 'line', 'smooth', 'dashed', 'bar', 'stackedbar', 'points', 'pie']
      : ['area', 'steparea', 'line', 'smooth', 'dashed', 'bar', 'points'];
  }
  if (name.includes('utilization')) return ['line', 'smooth', 'area', 'steparea', 'bar', 'step', 'dashed', 'points', 'gauge'];
  return ['line', 'smooth', 'area', 'steparea', 'bar', 'step', 'dashed', 'points'];
}

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

// Local datetime <-> unix-seconds helpers for the time filter inputs.
const pad2 = (n) => String(n).padStart(2, '0');
const toLocalInput = (ts) => {
  if (ts == null) return '';
  const d = new Date(ts * 1000);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
};
const fromLocalInput = (v) => (v ? Math.floor(new Date(v).getTime() / 1000) : null);

/** Build merged {time, <seriesKey>: value} rows, optionally filtered to a
 *  [from, to] window (unix seconds). */
function buildSeries(seriesList, range) {
  const keys = [];
  const byTs = {};
  seriesList.forEach((s) => {
    const k = seriesKey(s.metric);
    if (!keys.includes(k)) keys.push(k);
    (s.values || []).forEach(([ts, v]) => {
      if (range && (ts < range.from || ts > range.to)) return;
      byTs[ts] = byTs[ts] || { ts };
      byTs[ts][k] = Number(v);
    });
  });
  const data = Object.values(byTs).sort((a, b) => a.ts - b.ts).map((d) => ({ ...d, time: fmtTime(d.ts) }));
  return { data, keys };
}

function Panel({ title, subtitle, icon, action, children }) {
  return (
    <div className="xg-panel">
      <div className="xg-panel-head">
        {icon}<span>{title}</span>
        {subtitle ? <span className="xg-panel-sub">{subtitle}</span> : null}
        {action}
      </div>
      <div className="xg-panel-body">{children}</div>
    </div>
  );
}

/** Per-graph kebab menu: View (fullscreen) + a chart-type submenu. */
function PanelMenu({ allowed, current, onSelectType, onView }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => { if (!e.target.closest('[data-xg-menu]')) setOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open]);
  return (
    <div className="xg-pmenu" data-xg-menu>
      <button type="button" className="xg-pmenu-btn" title="Options" aria-haspopup="menu" aria-expanded={open}
        onClick={() => setOpen((o) => !o)}>
        <FiMoreVertical />
      </button>
      {open && (
        <div className="xg-pmenu-list" role="menu">
          <button type="button" className="xg-pmenu-item" role="menuitem"
            onClick={() => { setOpen(false); onView(); }}>
            <FiMaximize2 /> View
          </button>
          <div className="xg-pmenu-sub">
            <div className="xg-pmenu-item xg-pmenu-item-parent">
              <span><FiBarChart2 /> Graph</span><FiChevronRight className="xg-pmenu-arrow" />
            </div>
            <div className="xg-pmenu-flyout" role="menu">
              {allowed.map((c) => (
                <button type="button" key={c.id} role="menuitemradio" aria-checked={c.id === current}
                  className={`xg-pmenu-item${c.id === current ? ' active' : ''}`}
                  onClick={() => { setOpen(false); onSelectType(c.id); }}>
                  {c.label}{c.id === current ? <FiCheck className="xg-pmenu-check" /> : null}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
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

/** Renders the chosen chart type for a metric's merged series. */
function MetricChart({ data, keys, unit, type }) {
  const grid = <CartesianGrid strokeDasharray="3 3" stroke="#23272e" />;
  const xAxis = <XAxis dataKey="time" tick={{ fill: '#9fa7b3', fontSize: 10 }} stroke="#3a3f44" minTickGap={24} />;
  const yAxis = <YAxis tick={{ fill: '#9fa7b3', fontSize: 10 }} stroke="#3a3f44" width={46} tickFormatter={compact} />;
  const tip = <Tooltip {...TT} formatter={(v, n) => [`${compact(v)}${unit}`, n]} cursor={type === 'bar' ? { fill: 'rgba(255,255,255,0.04)' } : { stroke: '#3a3f44' }} />;
  const legend = keys.length > 1 ? <Legend wrapperStyle={{ fontSize: 11, color: '#c7ccd1' }} /> : null;
  const margin = { top: 8, right: 16, left: -6, bottom: 0 };
  const color = (i) => COLORS[i % COLORS.length];

  if (type === 'bar' || type === 'stackedbar') {
    return (
      <BarChart data={data} margin={margin}>
        {grid}{xAxis}{yAxis}{tip}{legend}
        {keys.map((k, i) => (
          <Bar key={k} dataKey={k} name={k} fill={color(i)} maxBarSize={26}
            stackId={type === 'stackedbar' ? '1' : undefined} isAnimationActive={false} />
        ))}
      </BarChart>
    );
  }
  if (type === 'area' || type === 'stacked' || type === 'steparea') {
    const areaType = type === 'steparea' ? 'step' : 'monotone';
    return (
      <AreaChart data={data} margin={margin}>
        <defs>
          {keys.map((k, i) => (
            <linearGradient key={k} id={`xgg-${k}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color(i)} stopOpacity={0.5} />
              <stop offset="95%" stopColor={color(i)} stopOpacity={0.05} />
            </linearGradient>
          ))}
        </defs>
        {grid}{xAxis}{yAxis}{tip}{legend}
        {keys.map((k, i) => (
          <Area key={k} type={areaType} dataKey={k} name={k} stackId={type === 'stacked' ? '1' : undefined}
            stroke={color(i)} strokeWidth={2} fill={`url(#xgg-${k})`} isAnimationActive={false} />
        ))}
      </AreaChart>
    );
  }
  // line family — line, smooth (monotone), step, dashed, points (dots only)
  const lineType = type === 'step' ? 'step' : type === 'line' || type === 'dashed' || type === 'points' ? 'linear' : 'monotone';
  const isPoints = type === 'points';
  return (
    <LineChart data={data} margin={margin}>
      {grid}{xAxis}{yAxis}{tip}{legend}
      {keys.map((k, i) => (
        <Line key={k} type={lineType} dataKey={k} name={k} stroke={color(i)}
          strokeWidth={isPoints ? 0 : 2}
          strokeDasharray={type === 'dashed' ? '5 4' : undefined}
          dot={isPoints ? { r: 2.5, fill: color(i) } : false}
          isAnimationActive={false} />
      ))}
    </LineChart>
  );
}

/** Snapshot gauge of the latest value vs a max (RadialBar). */
function Gauge({ value, max, unit, color, size = 170 }) {
  const pct = max ? Math.round((value / max) * 100) : 0;
  return (
    <div className="xg-gauge-wrap" style={{ justifyContent: 'center' }}>
      <div className="xg-donut-rc" style={{ width: size, height: size * 0.88 }}>
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart innerRadius="66%" outerRadius="100%" data={[{ value }]} startAngle={210} endAngle={-30}>
            <PolarAngleAxis type="number" domain={[0, max]} angleAxisId={0} tick={false} />
            <RadialBar background={{ fill: '#23272e' }} dataKey="value" cornerRadius={8} fill={color} angleAxisId={0} isAnimationActive={false} />
          </RadialBarChart>
        </ResponsiveContainer>
        <div className="xg-donut-center">
          <span className="xg-donut-pct">{compact(value)}{unit}</span>
          <span className="xg-donut-sub">{pct}% of {compact(max)}{unit}</span>
        </div>
      </div>
    </div>
  );
}

/** Snapshot pie of the latest value share across series. */
function PieSnapshot({ data, unit, height = 200 }) {
  const outer = Math.min(140, Math.max(70, height * 0.36));
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" innerRadius={outer * 0.58} outerRadius={outer} paddingAngle={1} stroke="#181b1f">
          {data.map((d, i) => <Cell key={d.name} fill={COLORS[i % COLORS.length]} />)}
        </Pie>
        <Tooltip {...TT} formatter={(v, n) => [`${compact(v)}${unit}`, n]} />
        <Legend wrapperStyle={{ fontSize: 11, color: '#c7ccd1' }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

/** Renders a metric's body for the chosen type — time-series, gauge, or pie. */
function MetricBody({ name, seriesList, type, range, height = 200 }) {
  const { data, keys } = buildSeries(seriesList, range);
  const unit = unitFor(name);
  const last = data[data.length - 1] || {};

  if (type === 'gauge') {
    const value = Number(last[keys[0]] ?? 0);
    const max = unit === '%' ? 100 : name.includes('status') ? 1 : Math.max(1, ...data.map((d) => Number(d[keys[0]]) || 0));
    return <Gauge value={value} max={max} unit={unit} color={COLORS[0]} size={height >= 300 ? 240 : 170} />;
  }
  if (type === 'pie') {
    const pieData = keys.map((k) => ({ name: k, value: Number(last[k] ?? 0) }));
    return <PieSnapshot data={pieData} unit={unit} height={height} />;
  }
  return (
    <ResponsiveContainer width="100%" height={height}>
      <MetricChart data={data} keys={keys} unit={unit} type={type} />
    </ResponsiveContainer>
  );
}

/** One chart panel for a metric, with a kebab menu (View + Graph type). */
function MetricPanel({ name, seriesList, type, allowed, range, onSelectType, onView }) {
  return (
    <Panel
      title={prettyName(name)}
      subtitle={contextOf(seriesList[0]?.metric || {})}
      icon={iconFor(name)}
      action={<PanelMenu allowed={allowed} current={type} onSelectType={onSelectType} onView={onView} />}
    >
      <MetricBody name={name} seriesList={seriesList} type={type} range={range} />
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
  const [chartType, setChartType] = useState('line');
  const [metric, setMetric] = useState('all');
  const [from, setFrom] = useState(null);
  const [to, setTo] = useState(null);
  const [controlsOpen, setControlsOpen] = useState(true);
  const [typeOverrides, setTypeOverrides] = useState({}); // per-metric chart type
  const [viewMetric, setViewMetric] = useState(null);     // fullscreen metric name

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

  // Time window covered by the data.
  const allTs = result.flatMap((s) => (s.values || []).map((v) => v[0]));
  const tMin = allTs.length ? Math.min(...allTs) : null;
  const tMax = allTs.length ? Math.max(...allTs) : null;

  // Default the From/To filter to the full data window once it loads.
  useEffect(() => {
    if (tMin != null) setFrom((f) => (f == null ? tMin : f));
    if (tMax != null) setTo((t) => (t == null ? tMax : t));
  }, [tMin, tMax]);

  // Active filter window passed to the charts (null = no filtering).
  const range = from != null && to != null ? { from: Math.min(from, to), to: Math.max(from, to) } : null;

  // Chart types available for the selected metric (all when "All" is chosen).
  const allowedIds = metric === 'all' ? ALL_TYPE_IDS : allowedCharts(metric);
  const typeOptions = allowedIds.map((id) => CHART_TYPES.find((c) => c.id === id)).filter(Boolean);

  // Keep the chosen chart type valid for the selected metric.
  useEffect(() => {
    if (!allowedIds.includes(chartType)) setChartType(allowedIds[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [metric]);

  // The chart type for a given metric: per-graph override → global → a valid
  // fallback for that metric. Each graph also exposes its own allowed list.
  const allowedFor = (name) => allowedCharts(name).map((id) => CHART_TYPES.find((c) => c.id === id)).filter(Boolean);
  const effectiveType = (name) => {
    const allow = allowedCharts(name);
    const base = typeOverrides[name] || chartType;
    return allow.includes(base) ? base : allow[0];
  };
  const setMetricType = (name, id) => setTypeOverrides((o) => ({ ...o, [name]: id }));

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
          <button type="button" className="xg-toolbar-btn xg-back" onClick={() => navigate(-1)}>
            <FiArrowLeft /> Back
          </button>
        </div>

        {/* KPI stat row — full width, above the charts/controls */}
        {!loading && !error && names.length > 0 && stats.length > 0 && (
          <div className="xg-grid xg-stats-row">
            {stats.map((s) => (
              <StatPanel key={s.name} label={s.label} value={compact(s.value)} unit={s.unit}
                tone={s.unit === '%' && s.value >= 80 ? 'bad' : s.unit === '%' && s.value >= 60 ? 'warn' : undefined} />
            ))}
          </div>
        )}

        <div className={`xg-body${controlsOpen ? '' : ' xg-body-collapsed'}`}>
          {/* left — charts (aligned with the controls card) */}
          <div className="xg-charts">
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
                {(metric === 'all' ? names : names.filter((n) => n === metric)).map((name) => (
                  <div className={metric === 'all' ? 'xg-w3' : 'xg-w6'} key={name}>
                    <MetricPanel
                      name={name}
                      seriesList={groups[name]}
                      type={effectiveType(name)}
                      allowed={allowedFor(name)}
                      range={range}
                      onSelectType={(id) => setMetricType(name, id)}
                      onView={() => setViewMetric(name)}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* right — controls (collapsible) */}
          {controlsOpen ? (
            <aside className="xg-controls">
              <div className="xg-controls-head">
                <span className="xg-controls-title"><FiSliders /> Controls</span>
                <div className="xg-controls-head-actions">
                  <button type="button" className="xg-controls-icon" onClick={() => navigate(0)} title="Refresh" aria-label="Refresh">
                    <FiRefreshCw />
                  </button>
                  <button type="button" className="xg-controls-close" onClick={() => setControlsOpen(false)} title="Close" aria-label="Close controls">
                    <FiX />
                  </button>
                </div>
              </div>

              {tMin != null && (
                <div className="xg-ctl">
                  <span className="xg-ctl-label"><FiClock /> Time range</span>
                  <div className="xg-timefilter">
                    <label className="xg-time-field">
                      <span>From</span>
                      <input type="datetime-local" className="xg-time-input"
                        value={toLocalInput(from)} min={toLocalInput(tMin)} max={toLocalInput(tMax)}
                        onChange={(e) => setFrom(fromLocalInput(e.target.value) ?? tMin)} />
                    </label>
                    <label className="xg-time-field">
                      <span>To</span>
                      <input type="datetime-local" className="xg-time-input"
                        value={toLocalInput(to)} min={toLocalInput(tMin)} max={toLocalInput(tMax)}
                        onChange={(e) => setTo(fromLocalInput(e.target.value) ?? tMax)} />
                    </label>
                  </div>
                </div>
              )}
              <div className="xg-ctl">
                <span className="xg-ctl-label"><FiGrid /> Metric</span>
                <label className="xg-select-wrap">
                  <select className="xg-select" value={metric} onChange={(e) => setMetric(e.target.value)}>
                    <option value="all">All metrics</option>
                    {names.map((n) => <option key={n} value={n}>{prettyName(n)}</option>)}
                  </select>
                </label>
              </div>
              <div className="xg-ctl">
                <span className="xg-ctl-label"><FiBarChart2 /> Chart type</span>
                <label className="xg-select-wrap">
                  <select className="xg-select" value={chartType} onChange={(e) => setChartType(e.target.value)}>
                    {typeOptions.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
                  </select>
                </label>
              </div>
            </aside>
          ) : (
            <button type="button" className="xg-controls-reopen" onClick={() => setControlsOpen(true)} title="Show controls" aria-label="Show controls">
              <FiSliders />
              <span className="xg-reopen-text">Controls</span>
              <FiChevronRight className="xg-reopen-caret" />
            </button>
          )}
        </div>

        {/* fullscreen view of a single graph */}
        {viewMetric && groups[viewMetric] && (
          <div className="xg-modal" onClick={() => setViewMetric(null)}>
            <div className="xg-modal-card" onClick={(e) => e.stopPropagation()}>
              <div className="xg-modal-head">
                <span className="xg-modal-title">{iconFor(viewMetric)} {prettyName(viewMetric)}
                  <span className="xg-modal-sub">{contextOf(groups[viewMetric][0]?.metric || {})}</span>
                </span>
                <button type="button" className="xg-controls-close" onClick={() => setViewMetric(null)} title="Close" aria-label="Close">
                  <FiX />
                </button>
              </div>
              <div className="xg-modal-body">
                <MetricBody name={viewMetric} seriesList={groups[viewMetric]} type={effectiveType(viewMetric)} range={range} height={460} />
              </div>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
