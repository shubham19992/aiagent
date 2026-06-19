import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiActivity, FiCheckCircle, FiClock, FiServer, FiCpu, FiHardDrive,
  FiWifi, FiLayers, FiShield, FiZap, FiDatabase, FiLogOut, FiTrendingUp,
  FiChevronDown, FiGrid, FiList,
} from 'react-icons/fi';
import '../assets/css/Dashboard.css';
import XopsLogo from '../components/XopsLogo';
import { tokenStore } from '../api/client';
import { SAMPLE_METRICS_TEXT } from '../data/sampleMetrics';
import {
  parsePrometheus, buildMetricsModel, fmtBytes, fmtMs, fmtDuration,
} from '../lib/metrics';

const CHART_COLORS = ['#059669', '#0d9488', '#34d399', '#14b8a6', '#5eead4', '#047857'];

/* Roles control which nav items are visible. */
const ROLES = {
  user: { label: 'User', blurb: 'Business view — service health & API activity' },
  devops: { label: 'DevOps Engineer', blurb: 'Operational view — runtime, resources & GC' },
  admin: { label: 'Admin', blurb: 'Full view — everything incl. scrape & governance' },
};

/* Sidebar navigation. Each item lists the roles allowed to see it. */
const NAV = [
  {
    id: 'observability',
    label: 'Observability',
    icon: <FiActivity />,
    items: [
      { id: 'overview', label: 'Overview', icon: <FiGrid />, roles: ['user', 'devops', 'admin'] },
      { id: 'api', label: 'API Requests', icon: <FiTrendingUp />, roles: ['user', 'devops', 'admin'] },
      { id: 'tenant', label: 'Tenants', icon: <FiShield />, roles: ['user', 'devops', 'admin'] },
      { id: 'runtime', label: 'Runtime', icon: <FiZap />, roles: ['devops', 'admin'] },
      { id: 'process', label: 'Resources', icon: <FiHardDrive />, roles: ['devops', 'admin'] },
      { id: 'gc', label: 'Garbage Collection', icon: <FiClock />, roles: ['devops', 'admin'] },
      { id: 'scrape', label: 'Scrape Health', icon: <FiActivity />, roles: ['admin'] },
    ],
  },
  {
    id: 'governance',
    label: 'Governance',
    icon: <FiShield />,
    items: [
      { id: 'summary', label: 'Summary', icon: <FiList />, roles: ['admin'] },
    ],
  },
];

/* ── small presentational helpers ─────────────────────────── */
function Kpi({ icon, label, value, sub, tone = 'brand' }) {
  return (
    <div className={`xd-kpi xd-tone-${tone}`}>
      <div className="xd-kpi-icon">{icon}</div>
      <div className="xd-kpi-body">
        <div className="xd-kpi-value">{value}</div>
        <div className="xd-kpi-label">{label}</div>
        {sub && <div className="xd-kpi-sub">{sub}</div>}
      </div>
    </div>
  );
}

function Donut({ data, total }) {
  const r = 56;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div className="xd-donut">
      <svg viewBox="0 0 140 140" width="150" height="150">
        <circle cx="70" cy="70" r={r} fill="none" stroke="#eef4f1" strokeWidth="16" />
        {data.map((d, i) => {
          const frac = total ? d.value / total : 0;
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
        <text x="70" y="66" textAnchor="middle" className="xd-donut-num">{total}</text>
        <text x="70" y="86" textAnchor="middle" className="xd-donut-cap">requests</text>
      </svg>
      <ul className="xd-legend">
        {data.map((d, i) => (
          <li key={d.label}>
            <span className="xd-dot" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
            <span className="xd-legend-label">{d.label}</span>
            <span className="xd-legend-val">{d.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function BarList({ items }) {
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

function Meter({ label, value, max, display }) {
  const pct = max ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="xd-meter">
      <div className="xd-meter-head">
        <span>{label}</span>
        <strong>{display}</strong>
      </div>
      <div className="xd-meter-track">
        <div className="xd-meter-fill" style={{ width: `${Math.max(2, pct)}%` }} />
      </div>
    </div>
  );
}

function Section({ title, icon, desc, children }) {
  return (
    <section className="xd-section">
      <div className="xd-section-head">
        <span className="xd-section-icon">{icon}</span>
        <div>
          <h2>{title}</h2>
          {desc && <p>{desc}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

/* ── page ─────────────────────────────────────────────────── */
export default function Dashboard() {
  const navigate = useNavigate();
  const userName = sessionStorage.getItem('uidai_user') || 'User';
  const cloudName = sessionStorage.getItem('xops_cloud_name') || 'Azure';
  const [role, setRole] = useState(sessionStorage.getItem('xops_role') || 'user');
  const [active, setActive] = useState('overview');
  const [openGroups, setOpenGroups] = useState({ observability: true, governance: true });

  const model = useMemo(
    () => buildMetricsModel(parsePrometheus(SAMPLE_METRICS_TEXT)),
    [],
  );

  // Visible nav groups/items for the current role.
  const visibleNav = NAV
    .map((g) => ({ ...g, items: g.items.filter((it) => it.roles.includes(role)) }))
    .filter((g) => g.items.length > 0);

  const allItems = visibleNav.flatMap((g) => g.items);
  const activeItem = allItems.find((i) => i.id === active) || allItems[0];
  const activeId = activeItem ? activeItem.id : 'overview';

  const chooseRole = (r) => {
    setRole(r);
    sessionStorage.setItem('xops_role', r);
    // if current view isn't allowed for the new role, fall back to overview
    const stillVisible = NAV.flatMap((g) => g.items).find((i) => i.id === active && i.roles.includes(r));
    if (!stillVisible) setActive('overview');
  };

  const toggleGroup = (id) => setOpenGroups((s) => ({ ...s, [id]: !s[id] }));

  const reset = () => {
    tokenStore.clear(); // drop the real auth token so the dashboard is locked again
    sessionStorage.removeItem('uidai_loggedIn');
    sessionStorage.removeItem('uidai_user');
    sessionStorage.removeItem('xops_cloud');
    sessionStorage.removeItem('xops_cloud_name');
  };
  const logout = () => { reset(); navigate('/login'); };

  const endpointData = Object.entries(model.byEndpoint).map(([label, value]) => ({ label, value }));
  const methodItems = Object.entries(model.byMethod).map(([label, value]) => ({ label, value }));
  const avgLatency = model.totalRequests
    ? model.apiRequests.reduce((a, r) => a + r.avgMs * r.count, 0) / model.totalRequests
    : 0;

  /* ── content per nav item ── */
  const renderView = () => {
    switch (activeId) {
      case 'overview':
        return (
          <>
            <div className="xd-kpi-row">
              <Kpi icon={<FiActivity />} tone="brand" label="Total API Requests" value={model.totalRequests} sub={`${cloudName} ARM calls`} />
              <Kpi icon={<FiCheckCircle />} tone="green" label="Success Rate" value={`${model.successRate.toFixed(0)}%`} sub={`${model.okRequests}/${model.totalRequests} returned 2xx`} />
              <Kpi icon={<FiClock />} tone="teal" label="Avg Response Time" value={fmtMs(avgLatency)} sub="weighted across endpoints" />
              <Kpi icon={<FiServer />} tone="slate" label="Uptime" value={fmtDuration(model.proc.uptimeSec)} sub="since process start" />
            </div>
            <div className="xd-grid-2">
              <div className="xd-card">
                <h3>Requests by Endpoint</h3>
                <Donut data={endpointData} total={model.totalRequests} />
              </div>
              <div className="xd-card">
                <h3>Requests by Method</h3>
                <BarList items={methodItems} />
              </div>
            </div>
          </>
        );
      case 'api':
        return (
          <Section title="Azure API Activity" icon={<FiTrendingUp />} desc="Requests, status and latency to Azure endpoints">
            <div className="xd-grid-2">
              <div className="xd-card">
                <h3>Requests by Endpoint</h3>
                <Donut data={endpointData} total={model.totalRequests} />
              </div>
              <div className="xd-card">
                <h3>Requests by Method</h3>
                <BarList items={methodItems} />
                <div className="xd-table-wrap">
                  <table className="xd-table">
                    <thead>
                      <tr><th>Endpoint</th><th>Method</th><th>Status</th><th>Count</th><th>Avg</th></tr>
                    </thead>
                    <tbody>
                      {model.apiRequests.map((r, i) => (
                        <tr key={i}>
                          <td className="xd-ep">{r.endpoint}</td>
                          <td><span className="xd-chip">{r.method}</span></td>
                          <td><span className="xd-chip xd-chip-ok">{r.statusCode}</span></td>
                          <td>{r.count}</td>
                          <td>{fmtMs(r.avgMs)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </Section>
        );
      case 'tenant':
        return (
          <Section title="Connected Tenant" icon={<FiShield />} desc="Azure AD tenants seen in API traffic">
            <div className="xd-tenant-row">
              {model.tenants.length === 0 && <div className="xd-muted">No tenant-scoped calls.</div>}
              {model.tenants.map((t) => (
                <div className="xd-tenant" key={t}>
                  <FiShield />
                  <div>
                    <div className="xd-tenant-label">Tenant ID</div>
                    <code>{t}</code>
                  </div>
                </div>
              ))}
            </div>
          </Section>
        );
      case 'runtime':
        return (
          <Section title="Go Runtime" icon={<FiZap />} desc="Internal runtime of the exporter process">
            <div className="xd-kpi-row">
              <Kpi icon={<FiLayers />} tone="teal" label="Goroutines" value={model.go.goroutines} />
              <Kpi icon={<FiCpu />} tone="slate" label="OS Threads" value={model.go.threads} sub={`GOMAXPROCS ${model.go.gomaxprocs}`} />
              <Kpi icon={<FiDatabase />} tone="brand" label="Heap In-Use" value={fmtBytes(model.go.heapInuse)} sub={`of ${fmtBytes(model.go.heapSys)} reserved`} />
              <Kpi icon={<FiServer />} tone="green" label="Go Version" value={model.go.version} />
            </div>
            <div className="xd-card">
              <Meter label="Heap allocated vs next-GC target" value={model.go.heapAlloc} max={model.go.nextGc}
                display={`${fmtBytes(model.go.heapAlloc)} / ${fmtBytes(model.go.nextGc)}`} />
            </div>
          </Section>
        );
      case 'process':
        return (
          <Section title="Process Resources" icon={<FiHardDrive />} desc="CPU, memory, network and file descriptors">
            <div className="xd-kpi-row">
              <Kpi icon={<FiCpu />} tone="brand" label="CPU Time" value={`${model.proc.cpuSeconds}s`} sub="user+system total" />
              <Kpi icon={<FiHardDrive />} tone="teal" label="Resident Memory" value={fmtBytes(model.proc.residentMem)} sub={`virtual ${fmtBytes(model.proc.virtualMem)}`} />
              <Kpi icon={<FiWifi />} tone="green" label="Network In / Out" value={`${fmtBytes(model.proc.netRx)} / ${fmtBytes(model.proc.netTx)}`} />
              <Kpi icon={<FiServer />} tone="slate" label="Open File Descriptors" value={`${model.proc.openFds}`} sub={`max ${model.proc.maxFds}`} />
            </div>
            <div className="xd-card">
              <Meter label="File descriptors in use" value={model.proc.openFds} max={model.proc.maxFds}
                display={`${model.proc.openFds} / ${model.proc.maxFds}`} />
            </div>
          </Section>
        );
      case 'gc':
        return (
          <Section title="Garbage Collection" icon={<FiClock />} desc="Stop-the-world pause behaviour">
            <div className="xd-kpi-row">
              <Kpi icon={<FiClock />} tone="teal" label="GC Pause (p50)" value={fmtMs(model.go.gcP50 * 1000)} />
              <Kpi icon={<FiClock />} tone="brand" label="GC Pause (max)" value={fmtMs(model.go.gcMax * 1000)} />
              <Kpi icon={<FiActivity />} tone="green" label="GC Cycles" value={model.go.gcCount} sub="since start" />
            </div>
          </Section>
        );
      case 'scrape':
        return (
          <Section title="Scrape Health" icon={<FiActivity />} desc="Prometheus /metrics handler stats">
            <div className="xd-kpi-row">
              <Kpi icon={<FiCheckCircle />} tone="green" label="Successful Scrapes" value={model.scrape.ok} sub="HTTP 200" />
              <Kpi icon={<FiActivity />} tone="brand" label="Failed Scrapes" value={model.scrape.err5xx} sub="5xx responses" />
              <Kpi icon={<FiZap />} tone="slate" label="Scrapes In-Flight" value={model.scrape.inFlight} />
            </div>
          </Section>
        );
      case 'summary':
        return (
          <Section title="Governance Summary" icon={<FiShield />} desc="Admin overview of monitored scope">
            <div className="xd-grid-3">
              <div className="xd-card xd-stat">
                <span className="xd-stat-num">{model.tenants.length}</span>
                <span className="xd-stat-cap">Tenant(s) monitored</span>
              </div>
              <div className="xd-card xd-stat">
                <span className="xd-stat-num">{Object.keys(model.byEndpoint).length}</span>
                <span className="xd-stat-cap">Azure endpoints</span>
              </div>
              <div className="xd-card xd-stat">
                <span className="xd-stat-num">{model.successRate.toFixed(0)}%</span>
                <span className="xd-stat-cap">Overall success rate</span>
              </div>
            </div>
          </Section>
        );
      default:
        return null;
    }
  };

  return (
    <div className="xd-shell">
      {/* ── sidebar ── */}
      <aside className="xd-sidebar">
        <div className="xd-side-logo">
          <XopsLogo height={34} />
        </div>
        <span className="xd-cloud-chip xd-cloud-static">{cloudName}</span>

        <nav className="xd-nav">
          {visibleNav.map((group) => (
            <div className="xd-nav-group" key={group.id}>
              <button
                className="xd-nav-group-head"
                onClick={() => toggleGroup(group.id)}
                type="button"
                aria-expanded={!!openGroups[group.id]}
              >
                <span className="xd-nav-group-icon">{group.icon}</span>
                <span className="xd-nav-group-label">{group.label}</span>
                <FiChevronDown className={`xd-nav-caret ${openGroups[group.id] ? 'open' : ''}`} />
              </button>
              {openGroups[group.id] && (
                <ul className="xd-nav-items">
                  {group.items.map((it) => (
                    <li key={it.id}>
                      <button
                        className={`xd-nav-item ${activeId === it.id ? 'active' : ''}`}
                        onClick={() => setActive(it.id)}
                        type="button"
                      >
                        <span className="xd-nav-item-icon">{it.icon}</span>
                        {it.label}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </nav>

        <div className="xd-side-foot">
          <div className="xd-user">
            <span className="xd-avatar">{userName.charAt(0).toUpperCase()}</span>
            <span className="xd-user-name">{userName}</span>
          </div>
          <button className="xd-logout" onClick={logout} type="button" title="Log out">
            <FiLogOut />
          </button>
        </div>
      </aside>

      {/* ── content ── */}
      <div className="xd-content-wrap">
        <header className="xd-topbar">
          <div>
            <h1 className="xd-topbar-title">{activeItem ? activeItem.label : 'Overview'}</h1>
            <p className="xd-topbar-sub">{cloudName} · {ROLES[role].label}</p>
          </div>
          <div className="xd-topbar-right">
            <div className="xd-role-switch" role="group" aria-label="Switch role">
              {Object.entries(ROLES).map(([key, r]) => (
                <button
                  key={key}
                  className={`xd-role-btn ${role === key ? 'active' : ''}`}
                  onClick={() => chooseRole(key)}
                  type="button"
                >
                  {r.label}
                </button>
              ))}
            </div>
            <div className={`xd-status-pill ${model.serviceUp ? 'up' : 'down'}`}>
              <span className="xd-pulse" />
              {model.serviceUp ? 'Operational' : 'Down'}
            </div>
          </div>
        </header>

        <main className="xd-main">
          {renderView()}
          <footer className="xd-footer">© 2026 xOps · Automation Tool · Internal Use Only</footer>
        </main>
      </div>
    </div>
  );
}
