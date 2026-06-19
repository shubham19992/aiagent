// ============================================================
// metrics.js — tiny Prometheus text-format parser + view model.
// Turns a /metrics exposition dump into structured numbers the
// dashboard can render. No external deps.
// ============================================================

/** Parse one label block: key="value",key2="value2" -> { key: value } */
function parseLabels(raw) {
  const labels = {};
  if (!raw) return labels;
  // match key="value" pairs (values may contain commas/spaces)
  const re = /([a-zA-Z_][a-zA-Z0-9_]*)="((?:[^"\\]|\\.)*)"/g;
  let m;
  while ((m = re.exec(raw)) !== null) {
    labels[m[1]] = m[2];
  }
  return labels;
}

/**
 * Parse Prometheus exposition text into a flat list of samples.
 * @returns {Array<{name:string, labels:object, value:number}>}
 */
export function parsePrometheus(text) {
  const samples = [];
  const lines = String(text).split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    // name{labels} value   |   name value
    const brace = trimmed.indexOf('{');
    let name, labels, rest;
    if (brace !== -1) {
      name = trimmed.slice(0, brace);
      const close = trimmed.indexOf('}', brace);
      labels = parseLabels(trimmed.slice(brace + 1, close));
      rest = trimmed.slice(close + 1).trim();
    } else {
      const sp = trimmed.indexOf(' ');
      name = trimmed.slice(0, sp);
      labels = {};
      rest = trimmed.slice(sp + 1).trim();
    }
    const value = Number(rest.split(/\s+/)[0]);
    if (Number.isNaN(value)) continue;
    samples.push({ name, labels, value });
  }
  return samples;
}

const all = (s, name) => s.filter((x) => x.name === name);
const one = (s, name, pred = () => true) => {
  const hit = s.find((x) => x.name === name && pred(x.labels));
  return hit ? hit.value : undefined;
};
const sameSeries = (a, b) =>
  a.apiEndpoint === b.apiEndpoint &&
  a.method === b.method &&
  a.statusCode === b.statusCode &&
  (a.tenantID || '') === (b.tenantID || '');

/**
 * Build a friendly view model from parsed samples.
 */
export function buildMetricsModel(samples) {
  // ── Azure API requests ──────────────────────────────────────
  const counts = all(samples, 'azurerm_api_request_count');
  const sums = all(samples, 'azurerm_api_request_sum');
  const apiRequests = counts.map((c) => {
    const sum = sums.find((s) => sameSeries(s.labels, c.labels));
    const count = c.value;
    const totalSec = sum ? sum.value : 0;
    return {
      endpoint: c.labels.apiEndpoint || '—',
      method: (c.labels.method || '').toUpperCase(),
      statusCode: c.labels.statusCode || '—',
      tenantID: c.labels.tenantID || '',
      count,
      avgMs: count ? (totalSec / count) * 1000 : 0,
    };
  });

  const totalRequests = apiRequests.reduce((a, r) => a + r.count, 0);
  const okRequests = apiRequests
    .filter((r) => /^2\d\d$/.test(r.statusCode))
    .reduce((a, r) => a + r.count, 0);
  const successRate = totalRequests ? (okRequests / totalRequests) * 100 : 0;

  const byEndpoint = {};
  const byMethod = {};
  for (const r of apiRequests) {
    byEndpoint[r.endpoint] = (byEndpoint[r.endpoint] || 0) + r.count;
    byMethod[r.method] = (byMethod[r.method] || 0) + r.count;
  }
  const tenants = [...new Set(apiRequests.map((r) => r.tenantID).filter(Boolean))];

  // ── Go runtime ──────────────────────────────────────────────
  const go = {
    version: one(samples, 'go_info', () => true) !== undefined
      ? (samples.find((x) => x.name === 'go_info')?.labels.version || '—')
      : '—',
    goroutines: one(samples, 'go_goroutines'),
    threads: one(samples, 'go_threads'),
    gomaxprocs: one(samples, 'go_sched_gomaxprocs_threads'),
    heapAlloc: one(samples, 'go_memstats_heap_alloc_bytes'),
    heapSys: one(samples, 'go_memstats_heap_sys_bytes'),
    heapInuse: one(samples, 'go_memstats_heap_inuse_bytes'),
    nextGc: one(samples, 'go_memstats_next_gc_bytes'),
    gcCount: one(samples, 'go_gc_duration_seconds_count'),
    gcP50: one(samples, 'go_gc_duration_seconds', (l) => l.quantile === '0.5'),
    gcMax: one(samples, 'go_gc_duration_seconds', (l) => l.quantile === '1'),
  };

  // ── Process ─────────────────────────────────────────────────
  const startTime = one(samples, 'process_start_time_seconds');
  const lastGc = one(samples, 'go_memstats_last_gc_time_seconds');
  const proc = {
    cpuSeconds: one(samples, 'process_cpu_seconds_total'),
    openFds: one(samples, 'process_open_fds'),
    maxFds: one(samples, 'process_max_fds'),
    netRx: one(samples, 'process_network_receive_bytes_total'),
    netTx: one(samples, 'process_network_transmit_bytes_total'),
    residentMem: one(samples, 'process_resident_memory_bytes'),
    virtualMem: one(samples, 'process_virtual_memory_bytes'),
    startTime,
    // uptime: prefer wall clock; fall back to last-GC timestamp
    uptimeSec: startTime
      ? Math.max(0, (Date.now() / 1000) - startTime)
      : undefined,
    lastGcUptimeSec: startTime && lastGc ? Math.max(0, lastGc - startTime) : undefined,
  };

  // ── Scrape meta ─────────────────────────────────────────────
  const scrape = {
    ok: one(samples, 'promhttp_metric_handler_requests_total', (l) => l.code === '200'),
    err5xx:
      (one(samples, 'promhttp_metric_handler_requests_total', (l) => l.code === '500') || 0) +
      (one(samples, 'promhttp_metric_handler_requests_total', (l) => l.code === '503') || 0),
    inFlight: one(samples, 'promhttp_metric_handler_requests_in_flight'),
  };

  return {
    apiRequests,
    totalRequests,
    okRequests,
    successRate,
    byEndpoint,
    byMethod,
    tenants,
    go,
    proc,
    scrape,
    serviceUp: scrape.ok !== undefined, // scrapeable => alive
  };
}

// ── formatting helpers ────────────────────────────────────────
export const fmtBytes = (n) => {
  if (n == null) return '—';
  const u = ['B', 'KB', 'MB', 'GB', 'TB'];
  let i = 0;
  let v = n;
  while (v >= 1024 && i < u.length - 1) { v /= 1024; i++; }
  return `${v.toFixed(v >= 100 || i === 0 ? 0 : 1)} ${u[i]}`;
};

export const fmtMs = (ms) => {
  if (ms == null) return '—';
  if (ms < 1) return `${(ms * 1000).toFixed(0)} µs`;
  if (ms < 1000) return `${ms.toFixed(ms < 10 ? 1 : 0)} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
};

export const fmtDuration = (sec) => {
  if (sec == null) return '—';
  const s = Math.floor(sec);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d) return `${d}d ${h}h`;
  if (h) return `${h}h ${m}m`;
  if (m) return `${m}m ${s % 60}s`;
  return `${s}s`;
};
