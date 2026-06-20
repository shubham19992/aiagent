// ============================================================
// projectMetrics.js — deterministic synthetic observability data
// for a project. Same project (id) always yields the same numbers,
// scaled by the clouds it targets and its priority/size. There is no
// metrics backend yet, so this stands in for it — swap buildProjectMetrics
// for a fetch() to your exporter/billing API when one exists.
// ============================================================

const MONTHS = ['Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];

// FNV-1a hash → 32-bit seed from any string.
function hashSeed(str) {
  let h = 2166136261;
  for (let i = 0; i < String(str).length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// mulberry32: tiny deterministic PRNG → [0,1).
function makeRng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Generate a `count`-long trend ending near `end`, with `vol` volatility
// and a gentle directional `drift` per step. Always non-negative.
function trend(rng, end, count, vol, drift = 0) {
  const out = [];
  let v = end / (1 + drift * (count - 1));
  for (let i = 0; i < count; i++) {
    const noise = 1 + (rng() - 0.5) * 2 * vol;
    out.push(Math.max(0, v * noise));
    v *= 1 + drift;
  }
  // pin the last point to `end` so the headline number matches the chart
  out[count - 1] = end;
  return out.map((n) => Math.round(n));
}

const ENV_LABEL = { aws: 'AWS', azure: 'Azure', gcp: 'GCP' };

/**
 * Build the full per-project observability model.
 * @param {object} project — a project from projectsStore.
 */
export function buildProjectMetrics(project) {
  const rng = makeRng(hashSeed(project?.id || project?.name || 'demo'));

  // Size multiplier from priority — bigger projects, bigger numbers.
  const prioMul = { Low: 0.6, Medium: 1, High: 1.6, Critical: 2.4 }[project?.priority] || 1;
  const envs = (project?.environments?.length ? project.environments : ['aws']).filter((e) => ENV_LABEL[e]);
  const envCount = envs.length || 1;
  const scale = prioMul * (0.8 + envCount * 0.35);

  // Split a total across the project's clouds with stable random weights.
  const splitByEnv = (total) => {
    const weights = envs.map(() => 0.4 + rng());
    const wsum = weights.reduce((a, b) => a + b, 0);
    return envs.map((e, i) => ({ label: ENV_LABEL[e], value: Math.round((total * weights[i]) / wsum) }));
  };

  // ── Cost / FinOps ──────────────────────────────────────────
  const monthly = Math.round((4200 + rng() * 9000) * scale);
  const mtd = Math.round(monthly * (0.45 + rng() * 0.4));
  const projected = Math.round(mtd * (1.9 + rng() * 0.5));
  const lastMonth = Math.round(monthly * (0.82 + rng() * 0.35));
  const budget = Math.round(monthly * (1.05 + rng() * 0.35));
  const compCost = Math.round(monthly * (0.34 + rng() * 0.1));
  const stoCost = Math.round(monthly * (0.16 + rng() * 0.08));
  const netCost = Math.round(monthly * (0.12 + rng() * 0.06));
  const dbCost = Math.round(monthly * (0.14 + rng() * 0.07));
  const otherCost = Math.max(0, monthly - compCost - stoCost - netCost - dbCost);
  const cost = {
    mtd, monthly, projected, lastMonth, budget,
    deltaPct: ((monthly - lastMonth) / lastMonth) * 100,
    budgetPct: (projected / budget) * 100,
    savings: Math.round(monthly * (0.08 + rng() * 0.12)),
    byService: [
      { label: 'Compute', value: compCost },
      { label: 'Storage', value: stoCost },
      { label: 'Database', value: dbCost },
      { label: 'Network', value: netCost },
      { label: 'Other', value: otherCost },
    ],
    byEnv: splitByEnv(monthly),
    trend: trend(rng, monthly, 12, 0.12, 0.03),
  };

  // ── Network ────────────────────────────────────────────────
  const egressGB = Math.round((900 + rng() * 4000) * scale);
  const ingressGB = Math.round(egressGB * (1.2 + rng() * 1.1));
  const network = {
    ingressGB, egressGB, totalGB: ingressGB + egressGB,
    transferCostUSD: netCost,
    throughputMbps: Math.round((120 + rng() * 700) * Math.sqrt(scale)),
    latencyP50: Math.round(8 + rng() * 18),
    latencyP95: Math.round(40 + rng() * 90),
    latencyP99: Math.round(120 + rng() * 260),
    requestsM: +(2 + rng() * 18).toFixed(1),
    errorRatePct: +(0.1 + rng() * 1.6).toFixed(2),
    byEnv: splitByEnv(ingressGB + egressGB),
    trend: trend(rng, ingressGB + egressGB, 12, 0.18, 0.02),
  };

  // ── Compute ────────────────────────────────────────────────
  const instances = Math.round((6 + rng() * 40) * scale);
  const compute = {
    instances,
    vcpu: instances * (2 + Math.round(rng() * 6)),
    cpuPct: Math.round(28 + rng() * 55),
    memPct: Math.round(35 + rng() * 50),
    vcpuHours: Math.round(instances * 24 * 30 * (0.5 + rng() * 0.5)),
    idleInstances: Math.round(rng() * Math.max(1, instances * 0.18)),
    autoscaleEvents: Math.round(rng() * 60),
    byEnv: splitByEnv(instances),
    trend: trend(rng, instances, 12, 0.1, 0.02),
  };

  // ── Storage ────────────────────────────────────────────────
  const usedGB = Math.round((400 + rng() * 6000) * scale);
  const provisionedGB = Math.round(usedGB * (1.25 + rng() * 0.5));
  const block = Math.round(usedGB * (0.38 + rng() * 0.1));
  const object = Math.round(usedGB * (0.3 + rng() * 0.1));
  const db = Math.round(usedGB * (0.14 + rng() * 0.06));
  const backup = Math.max(0, usedGB - block - object - db);
  const storage = {
    usedGB, provisionedGB,
    usedPct: (usedGB / provisionedGB) * 100,
    iops: Math.round((1500 + rng() * 12000) * Math.sqrt(scale)),
    growthPctMoM: +(1.5 + rng() * 9).toFixed(1),
    byType: [
      { label: 'Block', value: block },
      { label: 'Object', value: object },
      { label: 'Database', value: db },
      { label: 'Backup', value: backup },
    ],
    trend: trend(rng, usedGB, 12, 0.06, 0.04),
  };

  // ── Security ───────────────────────────────────────────────
  const critical = Math.round(rng() * 3 * prioMul);
  const high = Math.round(rng() * 8 * prioMul);
  const medium = Math.round(5 + rng() * 20);
  const low = Math.round(10 + rng() * 40);
  const score = Math.max(40, Math.round(98 - critical * 9 - high * 3 - medium * 0.6));
  const security = {
    score,
    critical, high, medium, low,
    openVulns: critical + high + medium + low,
    compliancePct: Math.round(70 + rng() * 28),
    failedLogins: Math.round(rng() * 240),
    exposedResources: Math.round(rng() * 6),
    bySeverity: [
      { label: 'Critical', value: critical },
      { label: 'High', value: high },
      { label: 'Medium', value: medium },
      { label: 'Low', value: low },
    ],
    trend: trend(rng, score, 12, 0.05, 0).map((n) => Math.min(100, n)),
  };

  // ── Reliability ────────────────────────────────────────────
  const uptimePct = +(99 + rng() * 0.98).toFixed(2);
  const reliability = {
    uptimePct,
    incidents: Math.round(rng() * 6),
    mttrMin: Math.round(12 + rng() * 110),
    sloPct: +(95 + rng() * 4.5).toFixed(1),
    deployFreq: Math.round(2 + rng() * 40),
    trend: trend(rng, Math.round(uptimePct * 10), 12, 0.002, 0).map((n) => +(n / 10).toFixed(2)),
  };

  return { months: MONTHS, envs: envs.map((e) => ENV_LABEL[e]), cost, network, compute, storage, security, reliability };
}

// ── formatting helpers ────────────────────────────────────────
export const fmtUSD = (n) =>
  n == null ? '—' : `$${Math.round(n).toLocaleString()}`;

export const fmtGB = (gb) => {
  if (gb == null) return '—';
  if (gb >= 1024) return `${(gb / 1024).toFixed(2)} TB`;
  return `${Math.round(gb).toLocaleString()} GB`;
};

export const fmtNum = (n) => (n == null ? '—' : Math.round(n).toLocaleString());
