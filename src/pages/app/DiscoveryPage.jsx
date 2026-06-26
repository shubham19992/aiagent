import React, { useEffect, useState } from 'react';
import { useParams, useLocation, useOutletContext, Link } from 'react-router-dom';
import {
  FiAlertTriangle, FiArrowLeft, FiCpu, FiDatabase, FiHardDrive,
  FiShare2, FiBox, FiActivity, FiZap, FiCloud, FiLoader,
  FiChevronRight, FiChevronDown, FiClock, FiFolder, FiServer, FiMapPin,
} from 'react-icons/fi';
import { FaAws } from 'react-icons/fa';
import { VscAzure } from 'react-icons/vsc';
import { SiGooglecloud } from 'react-icons/si';
import { PageHeader } from './_parts';
import { runDiscovery, parseInsights } from '../../api/discovery';
import { DISCOVERY_SAMPLE } from '../../api/discoverySample';
import { tokenStore } from '../../api/client';

const ENV_NAME = { aws: 'AWS', azure: 'Azure', gcp: 'GCP' };
const CLOUD = { aws: 'AWS', azure: 'AZURE', gcp: 'GCP' };
const CLOUD_ICON = { aws: <FaAws />, azure: <VscAzure />, gcp: <SiGooglecloud /> };

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
function DiscoveryLoading() {
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

function StatGroup({ icon, title, stats }) {
  return (
    <div className="xd-disc-group">
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
  const { ops } = useOutletContext();
  const connection = location.state?.connection || null;

  const op = ops.find((o) => o.code === opCode);
  const opName = op?.name || opCode;
  const envName = ENV_NAME[envCode] || (envCode || '').toUpperCase();
  const envPath = `/dashboard/observability/${opCode}/${envCode}`;
  const opPath = `/dashboard/observability/${opCode}`;

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [usingSample, setUsingSample] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError('');
    setUsingSample(false);
    const me = tokenStore.getUser() || {};
    runDiscovery({
      agentNames: [`${envCode}_discovery`],
      cloudProvider: CLOUD[envCode] || (envCode || '').toUpperCase(),
      userId: me.id || me.user_id || me.uuid || '',
      projectId: connection?.id || '',
    })
      .then((res) => {
        if (!alive) return;
        // Treat the response as real only if it actually carries discovered
        // accounts; otherwise preview the sample so the tree is never blank.
        const hasAccounts =
          res && Array.isArray(res.results) &&
          res.results.some((a) => (a?.data?.recommendations?.accounts || []).length > 0);
        setResult(hasAccounts ? res : DISCOVERY_SAMPLE);
        setUsingSample(!hasAccounts);
        setLoading(false);
      })
      .catch(() => {
        // Fall back to the sample payload so the discovery layout is still
        // previewable when the agents service is unreachable.
        if (!alive) return;
        setResult(DISCOVERY_SAMPLE);
        setUsingSample(true);
        setLoading(false);
      });
    return () => { alive = false; };
  }, [envCode, connection]);

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
          <Link to={opPath} className="xd-btn-ghost xd-btn-sm"><FiArrowLeft /> Back</Link>
        </div>

        {loading ? (
          <DiscoveryLoading />
        ) : error ? (
          <div className="xd-empty"><FiAlertTriangle /><p>{error}</p></div>
        ) : result ? (
          <>
            {/* hero */}
            <div className="xd-card xd-disc-hero">
              <span className="xd-disc-hero-cloud">{CLOUD_ICON[envCode] || <FiCloud />}</span>
              <div className="xd-disc-hero-main">
                <div className="xd-disc-hero-top">
                  <span className="xd-disc-hero-cloudname">{result.cloudProvider}</span>
                </div>
                <div className="xd-disc-meta">
                  <span className="xd-disc-meta-item">Executed<b>{fmtDateTime(result.executionTime)}</b></span>
                </div>
              </div>
            </div>

            {usingSample && (
              <div className="xd-disc-sample-note">
                <FiAlertTriangle /> Showing sample discovery data — the live agents service returned no results.
              </div>
            )}

            <div className="xd-disc-layout">
            <div className="xd-disc-main-col">
            {/* per-agent → per-subscription */}
            {(result.results || []).map((agent) => {
              const subs = agent.data?.recommendations?.subscriptions || [];
              return (
                <div key={agent.agentId}>
                  <h3 className="xd-subhead xd-disc-agenthead">
                    <FiZap /> {agent.agentId}
                  </h3>

                  {subs.map((sub) => {
                    const insights = parseInsights(sub.insights);
                    const unhealthy = sub.health?.unhealthyResources ?? 0;
                    return (
                      <div className="xd-card xd-disc-sub" key={sub.subscriptionId}>
                        <div className="xd-disc-sub-head">
                          <div className="xd-disc-sub-head-l">
                            <span className="xd-disc-sub-icon">{CLOUD_ICON[envCode] || <FiCloud />}</span>
                            <div>
                              <div className="xd-disc-sub-name">{sub.subscriptionName}</div>
                              <div className="xd-disc-sub-id">{sub.subscriptionId}</div>
                            </div>
                          </div>
                          <span className={`xd-status ${sub.state === 'Enabled' ? 'xd-status-active' : 'xd-status-onhold'}`}>{sub.state}</span>
                        </div>

                        <StatGroup icon={<FiBox />} title="Overview" stats={[
                          { label: 'Total Resources', value: sub.summary?.totalResources ?? 0 },
                          { label: 'Resource Groups', value: sub.summary?.resourceGroups ?? 0 },
                          { label: 'Regions Used', value: sub.summary?.regionsUsed ?? 0 },
                          { label: 'Resource Types', value: sub.summary?.resourceTypes ?? 0 },
                        ]} />

                        <div className="xd-disc-cols">
                          <StatGroup icon={<FiCpu />} title="Compute" stats={[
                            { label: 'Total VMs', value: sub.compute?.totalVMs ?? 0 },
                            { label: 'Linux', value: sub.compute?.linuxVMs ?? 0 },
                            { label: 'Windows', value: sub.compute?.windowsVMs ?? 0 },
                          ]} />
                          <StatGroup icon={<FiHardDrive />} title="Storage" stats={[
                            { label: 'Storage Accounts', value: sub.storage?.storageAccounts ?? 0 },
                          ]} />
                          <StatGroup icon={<FiDatabase />} title="Databases" stats={[
                            { label: 'SQL', value: sub.databases?.sqlDatabases ?? 0 },
                            { label: 'MySQL', value: sub.databases?.mysqlServers ?? 0 },
                            { label: 'Postgres', value: sub.databases?.postgresServers ?? 0 },
                          ]} />
                          <StatGroup icon={<FiShare2 />} title="Networking" stats={[
                            { label: 'VNets', value: sub.networking?.vnets ?? 0 },
                            { label: 'Public IPs', value: sub.networking?.publicIps ?? 0 },
                            { label: 'NSGs', value: sub.networking?.nsgs ?? 0 },
                            { label: 'Load Balancers', value: sub.networking?.loadBalancers ?? 0 },
                          ]} />
                          <StatGroup icon={<FiBox />} title="Containers" stats={[
                            { label: 'AKS Clusters', value: sub.containers?.aksClusters ?? 0 },
                          ]} />
                          <StatGroup icon={<FiActivity />} title="Health" stats={[
                            { label: 'Healthy', value: sub.health?.healthyResources ?? 0, tone: 'ok' },
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

            {/* right-side drill-down resource explorer */}
            <aside className="xd-disc-tree-panel xd-card">
              <div className="xd-disc-tree-head">
                <span className="xd-disc-tree-title"><FiShare2 /> Resource Explorer</span>
                <span className="xd-disc-tree-date"><FiClock /> {fmtDateTime(result.executionTime)}</span>
              </div>
              <DiscoveryTree result={result} cloudIcon={CLOUD_ICON[envCode] || <FiCloud />} />
            </aside>
            </div>
          </>
        ) : null}
      </main>
    </>
  );
}
