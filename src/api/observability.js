// ============================================================
// observability.js — client for the /api/v3/observability/* API.
// Returns { items, source } where source is always 'api'. There is
// NO dummy/offline fallback: if the backend is unreachable the call
// returns an empty list and `error`, and the UI shows its empty state.
// ============================================================
import { tokenStore } from './client';

// The observability service runs on its own host/port (8085), separate
// from the main API gateway (VITE_API_BASE_URL, 8081). Override with
// VITE_OBS_BASE_URL.
const RAW = import.meta.env.VITE_OBS_BASE_URL || 'http://10.1.151.228:8085';
export const OBS_BASE = RAW.replace(/\/+$/, '');

const enc = encodeURIComponent;

async function getElements(path) {
  const token = tokenStore.get();
  const res = await fetch(`${OBS_BASE}${path}`, {
    headers: {
      accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  const elements = json?.data?._embedded?.elements;
  if (!Array.isArray(elements)) throw new Error('Unexpected response shape');
  return elements;
}

export async function listOps({ includeInactive = false } = {}) {
  const items = await getElements(`/api/v3/observability/ops?include_inactive=${includeInactive}`);
  return { items, source: 'api' };
}

// Observability side-menu entries. Same shape as listOps() but each item
// also carries a `url` (e.g. "dashboard/observability/aiops") the sidebar
// links to directly.
export async function listMenu({ includeInactive = false } = {}) {
  const items = await getElements(`/api/v3/observability/menu?include_inactive=${includeInactive}`);
  return { items, source: 'api' };
}

export async function listEnvs(opCode, { includeInactive = false } = {}) {
  const items = await getElements(`/api/v3/observability/${enc(opCode)}/envs?include_inactive=${includeInactive}`);
  return { items, source: 'api' };
}

export async function listMeasures(opCode, env, { includeInactive = false } = {}) {
  const q = env ? `&env=${enc(env)}` : '';
  const items = await getElements(`/api/v3/observability/${enc(opCode)}/measures?include_inactive=${includeInactive}${q}`);
  return { items, source: 'api' };
}

export async function listConnectionParams(opCode, env, { includeInactive = false } = {}) {
  const items = await getElements(`/api/v3/observability/${enc(opCode)}/connection-params?env=${enc(env)}&include_inactive=${includeInactive}`);
  return { items, source: 'api' };
}
