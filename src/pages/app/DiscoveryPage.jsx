import React, { useEffect, useState } from 'react';
import { useParams, useLocation, useOutletContext, useNavigate, Link } from 'react-router-dom';
import {
  FiAlertTriangle, FiArrowLeft, FiCpu, FiDatabase, FiHardDrive,
  FiShare2, FiBox, FiActivity, FiZap, FiCloud, FiLoader,
  FiChevronRight, FiChevronDown, FiClock, FiFolder, FiServer, FiMapPin,
  FiChevronsRight, FiChevronsLeft, FiBarChart2,
} from 'react-icons/fi';
import { FaAws } from 'react-icons/fa';
import { VscAzure } from 'react-icons/vsc';
import { SiGooglecloud } from 'react-icons/si';
import { PageHeader } from './_parts';
import { runDiscovery, parseInsights } from '../../api/discovery';
import { tokenStore } from '../../api/client';

const ENV_NAME = { aws: 'AWS', azure: 'Azure', gcp: 'GCP' };
const CLOUD = { aws: 'AWS', azure: 'AZURE', gcp: 'GCP' };
const CLOUD_ICON = { aws: <FaAws />, azure: <VscAzure />, gcp: <SiGooglecloud /> };
// Icon per discovery category id (compute/storage/database/network/...).
const CAT_ICON = {
  compute: <FiCpu />, storage: <FiHardDrive />, database: <FiDatabase />,
  network: <FiShare2 />, containers: <FiBox />, other: <FiBox />,
};

const fmtDateTime = (d) => {
  if (!d) return '—';
  try { return new Date(d).toLocaleString(undefined, { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }); }
  catch { return d; }
};

// Reassuring messages cycled while the (slow) discovery API runs.
const DISCOVERY_TIPS = [
  'Connecting to your cloud provider…',
  'Scanning subscriptions and resource groups…',
  'Collecting compute, storage and networking inventory…',
  'Analysing resource health and generating insights…',
  'Almost there — compiling the discovery report…',
];

/** Loader shown while discovery runs; cycles a status message so the
 *  user knows it's still working during the longer API wait. */
export function DiscoveryLoading() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setI((n) => (n + 1) % DISCOVERY_TIPS.length), 2500);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="xd-disc-loading">
      <FiLoader className="xd-spin xd-disc-loading-ico" />
      <div className="xd-disc-loading-title">Running discovery…</div>
      <div className="xd-disc-loading-msg">{DISCOVERY_TIPS[i]}</div>
      <div className="xd-disc-loading-hint">
        This can take a minute or two as we scan your cloud resources. Please keep this page open.
      </div>
    </div>
  );
}

function StatGroup({ icon, title, stats, onClick }) {
  return (
    <div
      className={`xd-disc-group${onClick ? ' xd-disc-group-click' : ''}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } } : undefined}
    >
      <div className="xd-disc-group-head">{icon}<span>{title}</span></div>
      <div className="xd-stat-grid">
        {stats.map((s) => (
          <div className={`xd-stat ${s.tone ? `xd-stat-${s.tone}` : ''}`} key={s.label}>
            <div className="xd-stat-val">{s.value}</div>
            <div className="xd-stat-label">{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** One expandable row in the resource-explorer tree. Drills down through
 *  account → category → resource → properties; leaves have no chevron. */
function TreeRow({ icon, label, sub, count, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen);
  const hasChildren = React.Children.count(children) > 0;
  return (
    <div className="xd-tree-node">
      <button
        type="button"
        className={`xd-tree-row${hasChildren ? '' : ' xd-tree-row-leaf'}`}
        onClick={() => hasChildren && setOpen((o) => !o)}
        disabled={!hasChildren}
      >
        <span className="xd-tree-caret">
          {hasChildren ? (open ? <FiChevronDown /> : <FiChevronRight />) : null}
        </span>
        {icon && <span className="xd-tree-ico">{icon}</span>}
        <span className="xd-tree-label" title={label}>{label}</span>
        {sub && <span className="xd-tree-sub" title={sub}>{sub}</span>}
        {count != null && <span className="xd-tree-count">{count}</span>}
      </button>
      {open && hasChildren && <div className="xd-tree-children">{children}</div>}
    </div>
  );
}

/** Drill-down tree for the discovery response:
 *  agent → account → category → resource → properties. */
function DiscoveryTree({ result, cloudIcon }) {
  const accounts = [];
  (result.results || []).forEach((agent) => {
    if (agent.status !== 'SUCCESS') return;
    (agent.data?.recommendations?.accounts || []).forEach((a) => accounts.push(a));
  });

  if (accounts.length === 0) {
    return <div className="xd-tree-empty">No resources discovered.</div>;
  }

  return (
    <div className="xd-tree">
      {accounts.map((acc, ai) => (
        <TreeRow
          key={acc.id || ai}
          icon={cloudIcon}
          label={acc.name || acc.id}
          sub={acc.type}
          count={acc.summary?.totalResources}
          defaultOpen={accounts.length === 1}
        >
          {(acc.categories || []).map((cat) => (
            <TreeRow
              key={cat.id}
              icon={<FiFolder />}
              label={cat.name || cat.id}
              count={cat.count ?? (cat.resources || []).length}
            >
              {(cat.resources || []).map((r, ri) => (
                <TreeRow
                  key={r.id || ri}
                  icon={<FiServer />}
                  label={r.name}
                  sub={r.resourceType}
                >
                  {Object.entries(r.properties || {})
                    .filter(([, v]) => v !== '' && v != null)
                    .map(([k, v]) => (
                      <TreeRow
                        key={k}
                        icon={k === 'region' ? <FiMapPin /> : null}
                        label={k}
                        sub={String(v)}
                      />
                    ))}
                </TreeRow>
              ))}
            </TreeRow>
          ))}
        </TreeRow>
      ))}
    </div>
  );
}

/** Cloud discovery result — shown after Save & Connect and from the
 *  connections list "Connect" action. */
export default function DiscoveryPage() {
  const { opCode, envCode } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { ops } = useOutletContext();
  const connection = location.state?.connection || null;
  // Save & Connect already ran discovery in one call and passes the result
  // here, so we render it directly instead of calling agents/execute again.
  const preloaded = location.state?.discovery || null;

  const op = ops.find((o) => o.code === opCode);
  const opName = op?.name || opCode;
  const envName = ENV_NAME[envCode] || (envCode || '').toUpperCase();
  const envPath = `/dashboard/observability/${opCode}/${envCode}`;
  const opPath = `/dashboard/observability/${opCode}`;

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  // Resource Explorer is a collapsible right-side drawer.
  const [treeOpen, setTreeOpen] = useState(true);

  useEffect(() => {
    let alive = true;
    setError('');

    // Discovery already came back with the connect call — render it directly.
    if (preloaded) {
      setResult(preloaded);
      setLoading(false);
      return () => { alive = false; };
    }

    setLoading(true);
    const me = tokenStore.getUser() || {};
    runDiscovery({
      agentNames: [`${envCode}_discovery`],
      cloudProvider: CLOUD[envCode] || (envCode || '').toUpperCase(),
      userId: me.id || me.user_id || me.uuid || '',
      projectId: connection?.id || '',
    })
      .then((res) => { if (alive) { setResult(res || {}); setLoading(false); } })
      .catch((err) => { if (alive) { setError(err?.message || 'Discovery failed.'); setLoading(false); } });
    return () => { alive = false; };
  }, [envCode, connection, preloaded]);

  // What to render.
  const view = result || {};

  // Open a resource-list detail page for a category (or all resources of an
  // account). The resources are carried in nav state — no refetch needed.
  const openResources = (slug, title, resources) => {
    navigate(`/dashboard/observability/${opCode}/${envCode}/discovery/${slug}`, {
      state: { title, resources, cloudProvider: view.cloudProvider, executionTime: view.executionTime, envCode },
    });
  };

  return (
    <>
      <PageHeader
        crumbs={[
          { label: 'Observability', to: '/dashboard' },
          { label: opName, to: opPath },
          { label: envName, to: envPath },
          { label: 'Discovery' },
        ]}
      />
      <main className="xd-main">
        <div className="xd-pagelead xd-pagelead-row">
          <div>
            <h1>Cloud Discovery</h1>
            <p>{connection ? `${connection.name} · ` : ''}{opName} · {envName}</p>
          </div>
          <div className="xd-disc-lead-actions">
            {result && !loading && !error && (
              <button
                type="button"
                className="xd-btn xd-btn-sm"
                onClick={() => navigate(`/dashboard/observability/${opCode}/${envCode}/discovery/explore`, { state: { discovery: view, envCode } })}
              >
                <FiBarChart2 /> Explore
              </button>
            )}
            <Link to={opPath} className="xd-btn-ghost xd-btn-sm"><FiArrowLeft /> Back</Link>
          </div>
        </div>

        {loading ? (
          <DiscoveryLoading />
        ) : error ? (
          <div className="xd-empty"><FiAlertTriangle /><p>{error}</p></div>
        ) : result ? (
          <>
            <div className={`xd-disc-layout${treeOpen ? '' : ' xd-disc-layout-collapsed'}`}>
            <div className="xd-disc-main-col">
            {/* per-agent → per-account */}
            {(view.results || []).filter((a) => a.status === 'SUCCESS').map((agent) => {
              const accounts = agent.data?.recommendations?.accounts || [];
              return (
                <div key={agent.agentId}>
                  {accounts.map((acc) => {
                    const cats = acc.categories || [];
                    const insights = parseInsights(acc.insights);
                    const unhealthy = acc.health?.unhealthy ?? 0;
                    return (
                      <div className="xd-card xd-disc-sub" key={acc.id}>
                        <div className="xd-disc-top">
                          <div className="xd-disc-top-cloud">
                            <span className="xd-disc-cloud-badge">{CLOUD_ICON[envCode] || <FiCloud />}</span>
                            <div>
                              <div className="xd-disc-cloud-name">{view.cloudProvider}</div>
                              <div className="xd-disc-cloud-date"><FiClock /> {fmtDateTime(view.executionTime)}</div>
                            </div>
                          </div>
                          <span className="xd-disc-agent-pill"><FiZap /> {agent.agentId}</span>
                        </div>
                        <div className="xd-disc-sub-head">
                          <div className="xd-disc-sub-head-l">
                            <div>
                              <div className="xd-disc-sub-name">{acc.name}</div>
                              <div className="xd-disc-sub-id">{acc.id}</div>
                            </div>
                          </div>
                          {acc.type && <span className="xd-status xd-status-active">{acc.type}</span>}
                        </div>

                        <StatGroup
                          icon={<FiBox />}
                          title="Overview"
                          onClick={() => openResources('all', `${acc.name} · All Resources`, cats.flatMap((c) => c.resources || []))}
                          stats={[
                            { label: 'Total Resources', value: acc.summary?.totalResources ?? 0 },
                            { label: 'Resource Groups', value: acc.summary?.resourceGroups ?? 0 },
                            { label: 'Regions', value: acc.summary?.regions ?? 0 },
                          ]}
                        />

                        <div className="xd-disc-cols">
                          {cats.map((c) => (
                            <StatGroup
                              key={c.id}
                              icon={CAT_ICON[c.id] || <FiBox />}
                              title={c.name}
                              onClick={() => openResources(c.id, `${acc.name} · ${c.name}`, c.resources || [])}
                              stats={[
                                { label: 'Resources', value: c.count ?? (c.resources || []).length },
                              ]}
                            />
                          ))}
                          <StatGroup icon={<FiActivity />} title="Health" stats={[
                            { label: 'Healthy', value: acc.health?.healthy ?? 0, tone: 'ok' },
                            { label: 'Unhealthy', value: unhealthy, tone: unhealthy ? 'bad' : undefined },
                          ]} />
                        </div>

                        {insights.length > 0 && (
                          <div className="xd-disc-insights-wrap">
                            <div className="xd-disc-group-head"><FiZap /><span>Insights &amp; Recommendations</span></div>
                            <div className="xd-disc-insights">
                              {insights.map((t, i) => (
                                <div className="xd-disc-insight" key={i}>
                                  <span className="xd-disc-insight-no">{i + 1}</span>
                                  <span className="xd-disc-insight-text">{t}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
            </div>

            {/* right-side drill-down resource explorer (collapsible drawer) */}
            {treeOpen ? (
              <aside className="xd-disc-tree-col">
                <div className="xd-disc-tree-panel xd-card">
                  <div className="xd-disc-tree-head">
                    <span className="xd-disc-tree-title"><FiShare2 /> Resource Explorer</span>
                    <button
                      type="button"
                      className="xd-disc-tree-toggle"
                      onClick={() => setTreeOpen(false)}
                      title="Collapse"
                      aria-label="Collapse Resource Explorer"
                    >
                      <FiChevronsRight />
                    </button>
                  </div>
                  <div className="xd-disc-tree-date"><FiClock /> {fmtDateTime(view.executionTime)}</div>
                  <DiscoveryTree result={view} cloudIcon={CLOUD_ICON[envCode] || <FiCloud />} />
                </div>
              </aside>
            ) : (
              <button
                type="button"
                className="xd-disc-tree-reopen"
                onClick={() => setTreeOpen(true)}
                title="Open Resource Explorer"
                aria-label="Open Resource Explorer"
              >
                <FiChevronsLeft /><FiShare2 />
              </button>
            )}
            </div>
          </>
        ) : null}
      </main>
    </>
  );
}
