import React, { useEffect, useState } from 'react';
import { useParams, useLocation, useOutletContext, Link } from 'react-router-dom';
import {
  FiCheckCircle, FiAlertTriangle, FiArrowLeft, FiCpu, FiDatabase, FiHardDrive,
  FiShare2, FiBox, FiActivity, FiZap,
} from 'react-icons/fi';
import { PageHeader, Spinner } from './_parts';
import { runDiscovery, parseInsights } from '../../api/discovery';

const ENV_NAME = { aws: 'AWS', azure: 'Azure', gcp: 'GCP' };
const CLOUD = { aws: 'AWS', azure: 'AZURE', gcp: 'GCP' };

const fmtDateTime = (d) => {
  if (!d) return '—';
  try { return new Date(d).toLocaleString(undefined, { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }); }
  catch { return d; }
};

function StatGroup({ icon, title, stats }) {
  return (
    <div className="xd-disc-group">
      <div className="xd-disc-group-head">{icon}<span>{title}</span></div>
      <div className="xd-stat-grid">
        {stats.map((s) => (
          <div className="xd-stat" key={s.label}>
            <div className="xd-stat-val">{s.value}</div>
            <div className="xd-stat-label">{s.label}</div>
          </div>
        ))}
      </div>
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

  useEffect(() => {
    let alive = true;
    setLoading(true);
    runDiscovery({ cloudProvider: CLOUD[envCode] || (envCode || '').toUpperCase() })
      .then((res) => { if (alive) { setResult(res); setLoading(false); } })
      .catch((err) => { if (alive) { setError(err?.message || 'Discovery failed.'); setLoading(false); } });
    return () => { alive = false; };
  }, [envCode]);

  const ok = result?.status === 'COMPLETED';

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
          <Spinner label="Running discovery…" />
        ) : error ? (
          <div className="xd-empty"><FiAlertTriangle /><p>{error}</p></div>
        ) : result ? (
          <>
            {/* run meta */}
            <div className="xd-card xd-disc-head">
              <span className={`xd-status ${ok ? 'xd-status-active' : 'xd-status-onhold'} xd-disc-status`}>
                {ok ? <FiCheckCircle /> : <FiAlertTriangle />} {result.status}
              </span>
              <div className="xd-disc-meta">
                <span className="xd-disc-meta-item">Cloud <b>{result.cloudProvider}</b></span>
                <span className="xd-disc-meta-item">Executed <b>{fmtDateTime(result.executionTime)}</b></span>
                <span className="xd-disc-meta-item">Request <b>{result.requestId}</b></span>
              </div>
            </div>

            {/* agent summary */}
            <h3 className="xd-subhead">Agents</h3>
            <div className="xd-stat-grid xd-disc-summary">
              <div className="xd-stat"><div className="xd-stat-val">{result.summary?.totalAgentsRequested ?? 0}</div><div className="xd-stat-label">Requested</div></div>
              <div className="xd-stat"><div className="xd-stat-val">{result.summary?.totalAgentsExecuted ?? 0}</div><div className="xd-stat-label">Executed</div></div>
              <div className="xd-stat xd-stat-ok"><div className="xd-stat-val">{result.summary?.successfulAgents ?? 0}</div><div className="xd-stat-label">Successful</div></div>
              <div className="xd-stat xd-stat-bad"><div className="xd-stat-val">{result.summary?.failedAgents ?? 0}</div><div className="xd-stat-label">Failed</div></div>
            </div>

            {/* per-agent → per-subscription */}
            {(result.results || []).map((agent) => {
              const subs = agent.data?.recommendations?.subscriptions || [];
              return (
                <div key={agent.agentId}>
                  <h3 className="xd-subhead">
                    <FiZap /> {agent.agentId}
                    <span className={`xd-status ${agent.status === 'SUCCESS' ? 'xd-status-active' : 'xd-status-onhold'} xd-disc-agent-status`}>{agent.status}</span>
                  </h3>

                  {subs.map((sub) => {
                    const insights = parseInsights(sub.insights);
                    return (
                      <div className="xd-card xd-disc-sub" key={sub.subscriptionId}>
                        <div className="xd-disc-sub-head">
                          <div>
                            <div className="xd-disc-sub-name">{sub.subscriptionName}</div>
                            <div className="xd-disc-sub-id">{sub.subscriptionId}</div>
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
                            { label: 'Linux VMs', value: sub.compute?.linuxVMs ?? 0 },
                            { label: 'Windows VMs', value: sub.compute?.windowsVMs ?? 0 },
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
                            { label: 'Healthy', value: sub.health?.healthyResources ?? 0 },
                            { label: 'Unhealthy', value: sub.health?.unhealthyResources ?? 0 },
                          ]} />
                        </div>

                        {insights.length > 0 && (
                          <>
                            <div className="xd-disc-group-head xd-disc-insights-head"><FiActivity /><span>Insights & Recommendations</span></div>
                            <ul className="xd-disc-insights">
                              {insights.map((t, i) => <li key={i}>{t}</li>)}
                            </ul>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </>
        ) : null}
      </main>
    </>
  );
}
