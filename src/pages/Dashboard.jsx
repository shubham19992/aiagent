import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiActivity, FiCheckCircle, FiClock, FiServer, FiCpu, FiHardDrive,
  FiWifi, FiLayers, FiShield, FiZap, FiDatabase, FiLogOut, FiTrendingUp,
} from 'react-icons/fi';
import '../assets/css/Dashboard.css';
import XopsLogo from '../components/XopsLogo';
import { SAMPLE_METRICS_TEXT } from '../data/sampleMetrics';
import {
  parsePrometheus, buildMetricsModel, fmtBytes, fmtMs, fmtDuration,
} from '../lib/metrics';

const CHART_COLORS = ['#059669', '#0d9488', '#34d399', '#14b8a6', '#5eead4', '#047857'];

/* Which dashboard sections each role is allowed to see. */
const ROLES = {
  user: {
    label: 'User',
    blurb: 'Business view — service health & API activity',
    sections: ['kpi', 'api', 'tenant'],
  },
  devops: {
    label: 'DevOps Engineer',
    blurb: 'Operational view — runtime, resources & GC',
    sections: ['kpi', 'api', 'tenant', 'runtime', 'process', 'gc'],
  },
  admin: {
    label: 'Admin',
    blurb: 'Full view — everything incl. scrape & governance',
    sections: ['kpi', 'api', 'tenant', 'runtime', 'process', 'gc', 'scrape', 'governance'],
  },
};

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
  const [role, setRole] = useState(sessionStorage.getItem('xops_role') || 'user');

  const model = useMemo(
    () => buildMetricsModel(parsePrometheus(SAMPLE_METRICS_TEXT)),
    [],
  );

  const allowed = ROLES[role].sections;
  const can = (s) => allowed.includes(s);

  const chooseRole = (r) => {
    setRole(r);
    sessionStorage.setItem('xops_role', r);
  };

  const logout = () => {
    sessionStorage.removeItem('uidai_loggedIn');
    sessionStorage.removeItem('uidai_user');
    navigate('/login');
  };

  const endpointData = Object.entries(model.byEndpoint).map(([label, value]) => ({ label, value }));
  const methodItems = Object.entries(model.byMethod).map(([label, value]) => ({ label, value }));
  const avgLatency = model.totalRequests
    ? model.apiRequests.reduce((a, r) => a + r.avgMs * r.count, 0) / model.totalRequests
    : 0;

  return (
    <div className="xd-page">
      {/* top bar */}
      <header className="xd-topbar">
        <XopsLogo height={36} />
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
          <div className="xd-user">
            <span className="xd-avatar">{userName.charAt(0).toUpperCase()}</span>
            <span className="xd-user-name">{userName}</span>
          </div>
          <button className="xd-logout" onClick={logout} type="button" title="Log out">
            <FiLogOut />
          </button>
        </div>
      </header>

      <main className="xd-main">
        <div className="xd-pagehead">
          <div>
            <h1>Azure Monitoring Dashboard</h1>
            <p>{ROLES[role].label} · {ROLES[role].blurb}</p>
          </div>
          <div className={`xd-status-pill ${model.serviceUp ? 'up' : 'down'}`}>
            <span className="xd-pulse" />
            {model.serviceUp ? 'All systems operational' : 'Service down'}
          </div>
        </div>

        {/* KPI ROW — everyone */}
        {can('kpi') && (
          <div className="xd-kpi-row">
            <Kpi icon={<FiActivity />} tone="brand" label="Total API Requests" value={model.totalRequests} sub="Azure ARM calls" />
            <Kpi icon={<FiCheckCircle />} tone="green" label="Success Rate" value={`${model.successRate.toFixed(0)}%`} sub={`${model.okRequests}/${model.totalRequests} returned 2xx`} />
            <Kpi icon={<FiClock />} tone="teal" label="Avg Response Time" value={fmtMs(avgLatency)} sub="weighted across endpoints" />
            <Kpi icon={<FiServer />} tone="slate" label="Uptime" value={fmtDuration(model.proc.uptimeSec)} sub="since process start" />
          </div>
        )}

        {/* API ACTIVITY — everyone */}
        {can('api') && (
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
        )}

        {/* TENANT — everyone */}
        {can('tenant') && (
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
        )}

        {/* RUNTIME — devops + admin */}
        {can('runtime') && (
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
        )}

        {/* PROCESS — devops + admin */}
        {can('process') && (
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
        )}

        {/* GC — devops + admin */}
        {can('gc') && (
          <Section title="Garbage Collection" icon={<FiClock />} desc="Stop-the-world pause behaviour">
            <div className="xd-kpi-row">
              <Kpi icon={<FiClock />} tone="teal" label="GC Pause (p50)" value={fmtMs(model.go.gcP50 * 1000)} />
              <Kpi icon={<FiClock />} tone="brand" label="GC Pause (max)" value={fmtMs(model.go.gcMax * 1000)} />
              <Kpi icon={<FiActivity />} tone="green" label="GC Cycles" value={model.go.gcCount} sub="since start" />
            </div>
          </Section>
        )}

        {/* SCRAPE — admin */}
        {can('scrape') && (
          <Section title="Scrape Health" icon={<FiActivity />} desc="Prometheus /metrics handler stats">
            <div className="xd-kpi-row">
              <Kpi icon={<FiCheckCircle />} tone="green" label="Successful Scrapes" value={model.scrape.ok} sub="HTTP 200" />
              <Kpi icon={<FiActivity />} tone="brand" label="Failed Scrapes" value={model.scrape.err5xx} sub="5xx responses" />
              <Kpi icon={<FiZap />} tone="slate" label="Scrapes In-Flight" value={model.scrape.inFlight} />
            </div>
          </Section>
        )}

        {/* GOVERNANCE — admin */}
        {can('governance') && (
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
        )}

        <footer className="xd-footer">© 2026 xOps · Automation Tool · Internal Use Only</footer>
      </main>
    </div>
  );
}
