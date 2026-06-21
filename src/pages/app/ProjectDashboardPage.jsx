import React, { useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  FiDollarSign, FiWifi, FiCpu, FiDatabase, FiShield, FiActivity,
  FiTrendingUp, FiTrendingDown, FiAlertTriangle, FiCheckCircle, FiClock,
  FiArrowLeft, FiGrid, FiZap, FiHardDrive, FiServer,
} from 'react-icons/fi';
import { PageHeader } from './_parts';
import { Kpi, Donut, BarList, Meter, Section, Sparkline } from '../../components/charts';
import { getProject } from '../../store/projectsStore';
import { buildProjectMetrics, fmtUSD, fmtGB, fmtNum } from '../../lib/projectMetrics';

const TABS = [
  { id: 'overview', label: 'Overview', icon: <FiGrid /> },
  { id: 'cost', label: 'Cost', icon: <FiDollarSign /> },
  { id: 'network', label: 'Network', icon: <FiWifi /> },
  { id: 'compute', label: 'Compute', icon: <FiCpu /> },
  { id: 'storage', label: 'Storage', icon: <FiDatabase /> },
  { id: 'security', label: 'Security', icon: <FiShield /> },
  { id: 'reliability', label: 'Reliability', icon: <FiActivity /> },
];

const utilTone = (pct) => (pct >= 85 ? 'bad' : pct >= 70 ? 'warn' : undefined);

export default function ProjectDashboardPage() {
  const { projectId } = useParams();
  const [tab, setTab] = useState('overview');
  const project = useMemo(() => getProject(projectId), [projectId]);
  const m = useMemo(() => (project ? buildProjectMetrics(project) : null), [project]);

  if (!project) {
    return (
      <>
        <PageHeader crumbs={[{ label: 'Manage Project', to: '/dashboard/projects' }, { label: 'Not found' }]} />
        <main className="xd-main">
          <div className="xd-empty">
            <FiAlertTriangle />
            <p>Project not found. It may have been deleted.</p>
            <Link to="/dashboard/projects" className="xd-btn xd-btn-sm"><FiArrowLeft /> Back to projects</Link>
          </div>
        </main>
      </>
    );
  }

  const { cost, network, compute, storage, security, reliability, months } = m;

  return (
    <>
      <PageHeader
        crumbs={[
          { label: 'Manage Project', to: '/dashboard/projects' },
          { label: project.name },
        ]}
        source="dummy"
      />
      <main className="xd-main">
        {/* lead */}
        <div className="xd-pagelead xd-pagelead-row">
          <div>
            <h1>
              {project.name} {project.key && <span className="xd-proj-key">{project.key}</span>}
            </h1>
            <p>
              Observability across {m.envs.join(', ') || 'no cloud'} ·{' '}
              {project.observabilities?.map((o) => o.name).join(', ') || 'no domains'}
            </p>
          </div>
          <div className="xd-proj-badges">
            <span className={`xd-status xd-status-${(project.status || 'Planning').toLowerCase().replace(/\s/g, '')}`}>{project.status || 'Planning'}</span>
            <span className={`xd-prio xd-prio-${(project.priority || 'Medium').toLowerCase()}`}>{project.priority || 'Medium'}</span>
          </div>
        </div>

        {/* tabs */}
        <div className="xd-tabs">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`xd-tab ${tab === t.id ? 'active' : ''}`}
              onClick={() => setTab(t.id)}
            >
              <span className="xd-tab-icon">{t.icon}</span> {t.label}
            </button>
          ))}
        </div>

        {/* ── Overview ── */}
        {tab === 'overview' && (
          <>
            <div className="xd-kpi-row">
              <Kpi icon={<FiDollarSign />} tone="brand" label="Monthly Cost" value={fmtUSD(cost.monthly)}
                sub={`projected ${fmtUSD(cost.projected)}`} delta={cost.deltaPct} />
              <Kpi icon={<FiWifi />} tone="teal" label="Network Transfer" value={fmtGB(network.totalGB)}
                sub={`${fmtGB(network.egressGB)} egress`} />
              <Kpi icon={<FiCpu />} tone="green" label="Compute" value={`${compute.instances} inst`}
                sub={`${compute.cpuPct}% CPU · ${compute.memPct}% mem`} />
              <Kpi icon={<FiDatabase />} tone="slate" label="Storage Used" value={fmtGB(storage.usedGB)}
                sub={`of ${fmtGB(storage.provisionedGB)}`} />
            </div>
            <div className="xd-kpi-row">
              <Kpi icon={<FiShield />} tone="brand" label="Security Score" value={`${security.score}/100`}
                sub={`${security.openVulns} open findings`} />
              <Kpi icon={<FiCheckCircle />} tone="green" label="Uptime" value={`${reliability.uptimePct}%`}
                sub={`SLO ${reliability.sloPct}%`} />
              <Kpi icon={<FiAlertTriangle />} tone={security.critical ? 'slate' : 'green'} label="Critical Issues"
                value={security.critical + security.high} sub={`${security.critical} critical · ${security.high} high`} />
              <Kpi icon={<FiTrendingDown />} tone="teal" label="Savings Opportunity" value={fmtUSD(cost.savings)}
                sub="idle / rightsizing" />
            </div>

            <div className="xd-grid-2">
              <div className="xd-card">
                <h3>Cost by Service</h3>
                <Donut data={cost.byService} unit="$" centerCap="monthly" />
              </div>
              <div className="xd-card">
                <h3>Spend Trend (12 mo)</h3>
                <Sparkline values={cost.trend} labels={months} unit="$" />
              </div>
            </div>

            {m.envs.length > 0 && (
              <div className="xd-card">
                <h3>Cost by Cloud</h3>
                <BarList items={cost.byEnv.map((e) => ({ label: e.label, value: e.value, suffix: ' $' }))} />
              </div>
            )}
          </>
        )}

        {/* ── Cost ── */}
        {tab === 'cost' && (
          <Section title="Cost & FinOps" icon={<FiDollarSign />} desc="Spend, forecast and optimization">
            <div className="xd-kpi-row">
              <Kpi icon={<FiDollarSign />} tone="brand" label="Month to Date" value={fmtUSD(cost.mtd)} />
              <Kpi icon={<FiTrendingUp />} tone="teal" label="Projected" value={fmtUSD(cost.projected)}
                sub={`budget ${fmtUSD(cost.budget)}`} />
              <Kpi icon={<FiActivity />} tone="slate" label="vs Last Month" value={fmtUSD(cost.monthly)} delta={cost.deltaPct} />
              <Kpi icon={<FiTrendingDown />} tone="green" label="Savings" value={fmtUSD(cost.savings)} sub="rightsizing + idle" />
            </div>
            <div className="xd-card">
              <Meter label="Projected vs Budget" value={cost.projected} max={cost.budget}
                display={`${fmtUSD(cost.projected)} / ${fmtUSD(cost.budget)}`}
                tone={cost.budgetPct >= 100 ? 'bad' : cost.budgetPct >= 85 ? 'warn' : undefined} />
            </div>
            <div className="xd-grid-2">
              <div className="xd-card">
                <h3>Cost by Service</h3>
                <Donut data={cost.byService} unit="$" centerCap="monthly" />
              </div>
              <div className="xd-card">
                <h3>Spend Trend (12 mo)</h3>
                <Sparkline values={cost.trend} labels={months} unit="$" />
                <BarList items={cost.byEnv.map((e) => ({ label: e.label, value: e.value, suffix: ' $' }))} />
              </div>
            </div>
          </Section>
        )}

        {/* ── Network ── */}
        {tab === 'network' && (
          <Section title="Network" icon={<FiWifi />} desc="Traffic, throughput and latency">
            <div className="xd-kpi-row">
              <Kpi icon={<FiTrendingDown />} tone="brand" label="Ingress" value={fmtGB(network.ingressGB)} />
              <Kpi icon={<FiTrendingUp />} tone="teal" label="Egress" value={fmtGB(network.egressGB)}
                sub={`${fmtUSD(network.transferCostUSD)} transfer cost`} />
              <Kpi icon={<FiZap />} tone="green" label="Throughput" value={`${fmtNum(network.throughputMbps)} Mbps`} />
              <Kpi icon={<FiActivity />} tone="slate" label="Requests" value={`${network.requestsM}M`}
                sub={`${network.errorRatePct}% errors`} />
            </div>
            <div className="xd-grid-2">
              <div className="xd-card">
                <h3>Latency Percentiles</h3>
                <BarList items={[
                  { label: 'p50', value: network.latencyP50, suffix: ' ms' },
                  { label: 'p95', value: network.latencyP95, suffix: ' ms' },
                  { label: 'p99', value: network.latencyP99, suffix: ' ms' },
                ]} />
                <Meter label="Error rate" value={network.errorRatePct} max={5}
                  display={`${network.errorRatePct}%`} tone={network.errorRatePct >= 2 ? 'warn' : undefined} />
              </div>
              <div className="xd-card">
                <h3>Data Transfer Trend (12 mo)</h3>
                <Sparkline values={network.trend} labels={months} unit="" color="#5794f2" />
                <Donut data={network.byEnv} unit=" GB" centerCap="GB total" />
              </div>
            </div>
          </Section>
        )}

        {/* ── Compute ── */}
        {tab === 'compute' && (
          <Section title="Compute" icon={<FiCpu />} desc="Utilization, capacity and autoscaling">
            <div className="xd-kpi-row">
              <Kpi icon={<FiServer />} tone="brand" label="Instances" value={compute.instances}
                sub={`${compute.vcpu} vCPU`} />
              <Kpi icon={<FiCpu />} tone="teal" label="vCPU Hours" value={fmtNum(compute.vcpuHours)} sub="this month" />
              <Kpi icon={<FiTrendingDown />} tone={compute.idleInstances ? 'slate' : 'green'} label="Idle Instances"
                value={compute.idleInstances} sub="candidates to stop" />
              <Kpi icon={<FiZap />} tone="green" label="Autoscale Events" value={compute.autoscaleEvents} sub="last 30 days" />
            </div>
            <div className="xd-grid-2">
              <div className="xd-card">
                <h3>Utilization</h3>
                <Meter label="CPU utilization" value={compute.cpuPct} max={100}
                  display={`${compute.cpuPct}%`} tone={utilTone(compute.cpuPct)} />
                <Meter label="Memory utilization" value={compute.memPct} max={100}
                  display={`${compute.memPct}%`} tone={utilTone(compute.memPct)} />
              </div>
              <div className="xd-card">
                <h3>Instances Trend (12 mo)</h3>
                <Sparkline values={compute.trend} labels={months} color="#73bf69" />
                <Donut data={compute.byEnv} unit="" centerCap="instances" />
              </div>
            </div>
          </Section>
        )}

        {/* ── Storage ── */}
        {tab === 'storage' && (
          <Section title="Storage" icon={<FiDatabase />} desc="Capacity, types and growth">
            <div className="xd-kpi-row">
              <Kpi icon={<FiHardDrive />} tone="brand" label="Used" value={fmtGB(storage.usedGB)}
                sub={`of ${fmtGB(storage.provisionedGB)}`} />
              <Kpi icon={<FiDatabase />} tone="teal" label="Provisioned" value={fmtGB(storage.provisionedGB)} />
              <Kpi icon={<FiZap />} tone="green" label="IOPS" value={fmtNum(storage.iops)} />
              <Kpi icon={<FiTrendingUp />} tone="slate" label="Growth" value={`${storage.growthPctMoM}%`} sub="month over month" />
            </div>
            <div className="xd-card">
              <Meter label="Used vs Provisioned" value={storage.usedGB} max={storage.provisionedGB}
                display={`${fmtGB(storage.usedGB)} / ${fmtGB(storage.provisionedGB)}`} tone={utilTone(storage.usedPct)} />
            </div>
            <div className="xd-grid-2">
              <div className="xd-card">
                <h3>Storage by Type</h3>
                <Donut data={storage.byType} unit=" GB" centerCap="GB used" />
              </div>
              <div className="xd-card">
                <h3>Growth Trend (12 mo)</h3>
                <Sparkline values={storage.trend} labels={months} color="#ff9830" />
              </div>
            </div>
          </Section>
        )}

        {/* ── Security ── */}
        {tab === 'security' && (
          <Section title="Security" icon={<FiShield />} desc="Posture, findings and compliance">
            <div className="xd-kpi-row">
              <Kpi icon={<FiShield />} tone="brand" label="Posture Score" value={`${security.score}/100`} />
              <Kpi icon={<FiAlertTriangle />} tone={security.critical ? 'slate' : 'green'} label="Critical / High"
                value={`${security.critical} / ${security.high}`} sub={`${security.openVulns} total findings`} />
              <Kpi icon={<FiCheckCircle />} tone="green" label="Compliance" value={`${security.compliancePct}%`} />
              <Kpi icon={<FiActivity />} tone="slate" label="Failed Logins" value={fmtNum(security.failedLogins)}
                sub={`${security.exposedResources} exposed resources`} />
            </div>
            <div className="xd-grid-2">
              <div className="xd-card">
                <h3>Findings by Severity</h3>
                <BarList items={security.bySeverity} />
              </div>
              <div className="xd-card">
                <h3>Posture Score Trend (12 mo)</h3>
                <Sparkline values={security.trend} labels={months} color="#b877d9" />
                <Meter label="Compliance" value={security.compliancePct} max={100}
                  display={`${security.compliancePct}%`} tone={security.compliancePct < 80 ? 'warn' : undefined} />
              </div>
            </div>
          </Section>
        )}

        {/* ── Reliability ── */}
        {tab === 'reliability' && (
          <Section title="Reliability" icon={<FiActivity />} desc="Availability, incidents and delivery">
            <div className="xd-kpi-row">
              <Kpi icon={<FiCheckCircle />} tone="green" label="Uptime" value={`${reliability.uptimePct}%`} />
              <Kpi icon={<FiActivity />} tone="brand" label="SLO Compliance" value={`${reliability.sloPct}%`} />
              <Kpi icon={<FiAlertTriangle />} tone="slate" label="Incidents" value={reliability.incidents} sub="last 30 days" />
              <Kpi icon={<FiClock />} tone="teal" label="MTTR" value={`${reliability.mttrMin}m`} sub="mean time to resolve" />
            </div>
            <div className="xd-grid-2">
              <div className="xd-card">
                <h3>Uptime Trend (12 mo)</h3>
                <Sparkline values={reliability.trend} labels={months} color="#73bf69" />
              </div>
              <div className="xd-card">
                <h3>Delivery</h3>
                <Kpi icon={<FiZap />} tone="green" label="Deployments" value={reliability.deployFreq} sub="last 30 days" />
                <Meter label="SLO compliance" value={reliability.sloPct} max={100}
                  display={`${reliability.sloPct}%`} tone={reliability.sloPct < 99 ? 'warn' : undefined} />
              </div>
            </div>
          </Section>
        )}
      </main>
    </>
  );
}
