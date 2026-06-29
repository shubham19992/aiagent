// ============================================================
// metrics.js — fetches time-series metrics for the discovery Explore
// dashboard. Expects a Prometheus-style range query returning a matrix
// ({ data: { resultType: 'matrix', result: [...] } }). Point at a real
// backend with VITE_METRICS_BASE_URL; until then it serves the sample.
// ============================================================
import { serviceFetch } from './client';
import { METRICS_SAMPLE } from './metricsSample';

const RAW = import.meta.env.VITE_METRICS_BASE_URL || '';
export const METRICS_BASE = RAW.replace(/\/+$/, '');

// Returns the matrix payload: { resultType, result: [{ metric, values }] }.
export async function queryMetrics({ resourceId } = {}) {
  // No endpoint configured yet → serve the sample so Explore renders.
  if (!METRICS_BASE) return METRICS_SAMPLE.data;
  try {
    const qs = resourceId ? `?resource.id=${encodeURIComponent(resourceId)}` : '';
    const res = await serviceFetch(`${METRICS_BASE}/api/v1/query_range${qs}`, {
      headers: { accept: 'application/json' },
      skipGlobalLoader: true,
    });
    const json = await res.json();
    return json?.data || METRICS_SAMPLE.data;
  } catch {
    // Fall back to the sample if the metrics service is unreachable.
    return METRICS_SAMPLE.data;
  }
}
