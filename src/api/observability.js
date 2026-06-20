// ============================================================
// observability.js — client for the /api/v3/observability/* API.
// Returns { items, source } where source is 'api' | 'error'.
// No dummy fallback — on failure the UI shows empty/error states.
// ============================================================

const RAW = import.meta.env.VITE_OBS_API_BASE_URL || 'http://127.0.0.1:8005';
export const OBS_BASE = RAW.replace(/\/+$/, '');

const enc = encodeURIComponent;

async function getElements(path) {
  const res = await fetch(`${OBS_BASE}${path}`, {
    headers: { accept: 'application/json' },
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
    return { items: [], source: 'error' };
  }
}

export async function listEnvs(opCode, { includeInactive = false } = {}) {
  try {
    const items = await getElements(`/api/v3/observability/${enc(opCode)}/envs?include_inactive=${includeInactive}`);
    return { items, source: 'api' };
  } catch {
    return { items: [], source: 'error' };
  }
}

export async function listMeasures(opCode, env, { includeInactive = false } = {}) {
  const q = env ? `&env=${enc(env)}` : '';
  try {
    const items = await getElements(`/api/v3/observability/${enc(opCode)}/measures?include_inactive=${includeInactive}${q}`);
    return { items, source: 'api' };
  } catch {
    return { items: [], source: 'error' };
  }
}

export async function listUsers() {
  try {
    const items = await getElements('/api/v3/users');
    return { items, source: 'api' };
  } catch {
    return { items: [], source: 'error' };
  }
}

export async function listConnectionParams(opCode, env, { includeInactive = false } = {}) {
  try {
    const items = await getElements(`/api/v3/observability/${enc(opCode)}/connection-params?env=${enc(env)}&include_inactive=${includeInactive}`);
    return { items, source: 'api' };
  } catch {
    return { items: [], source: 'error' };
  }
}
