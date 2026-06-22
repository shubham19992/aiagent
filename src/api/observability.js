// ============================================================
// observability.js — client for the /api/v3/observability/* API.
// Returns { items, source } where source is 'api' | 'dummy'.
// On any failure it falls back to bundled dummy data so the UI
// keeps working when the backend is unreachable.
// ============================================================
import { tokenStore } from './client';
import {
  DUMMY_OPS, dummyEnvs, dummyMeasures, dummyParams,
} from '../data/observabilityDummy';
import { DEMO_USERS } from '../data/demoUsers';

// Every API shares one base URL (VITE_API_BASE_URL).
const RAW = import.meta.env.VITE_API_BASE_URL || 'http://10.1.151.228:8081';
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
  try {
    const items = await getElements(`/api/v3/observability/ops?include_inactive=${includeInactive}`);
    return { items, source: 'api' };
  } catch {
    return { items: DUMMY_OPS, source: 'dummy' };
  }
}

// Observability side-menu entries. Same shape as listOps() but each item
// also carries a `url` (e.g. "dashboard/observability/aiops") the sidebar
// links to directly. Falls back to dummy ops (url derived from code).
export async function listMenu({ includeInactive = false } = {}) {
  try {
    const items = await getElements(`/api/v3/observability/menu?include_inactive=${includeInactive}`);
    return { items, source: 'api' };
  } catch {
    const items = DUMMY_OPS.map((op) => ({
      ...op,
      url: `dashboard/observability/${op.code}`,
    }));
    return { items, source: 'dummy' };
  }
}

export async function listEnvs(opCode, { includeInactive = false } = {}) {
  try {
    const items = await getElements(`/api/v3/observability/${enc(opCode)}/envs?include_inactive=${includeInactive}`);
    return { items, source: 'api' };
  } catch {
    return { items: dummyEnvs(opCode), source: 'dummy' };
  }
}

export async function listMeasures(opCode, env, { includeInactive = false } = {}) {
  const q = env ? `&env=${enc(env)}` : '';
  try {
    const items = await getElements(`/api/v3/observability/${enc(opCode)}/measures?include_inactive=${includeInactive}${q}`);
    return { items, source: 'api' };
  } catch {
    return { items: dummyMeasures(opCode), source: 'dummy' };
  }
}

export async function listUsers() {
  try {
    const items = await getElements('/api/v3/users');
    return { items, source: 'api' };
  } catch {
    return { items: DEMO_USERS, source: 'dummy' };
  }
}

export async function listConnectionParams(opCode, env, { includeInactive = false } = {}) {
  try {
    const items = await getElements(`/api/v3/observability/${enc(opCode)}/connection-params?env=${enc(env)}&include_inactive=${includeInactive}`);
    return { items, source: 'api' };
  } catch {
    return { items: dummyParams(opCode, env), source: 'dummy' };
  }
}
