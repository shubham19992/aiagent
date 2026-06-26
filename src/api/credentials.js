// ============================================================
// credentials.js — client for the credentials service /api/v3/credentials/*
// (the "Create Connect" backend). Runs on its own host/port (8084);
// override with VITE_CREDENTIALS_BASE_URL.
//
// A credential carries { id, name, op_code, env_code, env_id, values,
// secret_keys, is_active, created_by, created_at, updated_at }. Secret
// values come back masked ("••••••") from the server.
// ============================================================
import { serviceFetch } from './client';

const RAW = import.meta.env.VITE_CREDENTIALS_BASE_URL || 'http://10.1.151.228:8084';
export const CREDENTIALS_BASE = RAW.replace(/\/+$/, '');

const enc = encodeURIComponent;

async function call(path, { method = 'GET', body } = {}) {
  // serviceFetch injects the token and auto-logs-out on a persistent 401.
  const res = await serviceFetch(`${CREDENTIALS_BASE}${path}`, {
    method,
    headers: {
      accept: 'application/json',
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  if (text) { try { json = JSON.parse(text); } catch { json = text; } }
  if (!res.ok) {
    const msg =
      (json && typeof json === 'object' && json.error && json.error.message) ||
      (json && typeof json === 'object' && json.message) ||
      (typeof json === 'string' && json) ||
      `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return json;
}

// GET /api/v3/credentials/{id} — full credential (secret values masked).
export async function getCredential(id) {
  const json = await call(`/api/v3/credentials/${enc(id)}`);
  return json?.data || null;
}

export async function listCredentials({ includeInactive = false, offset = 0, limit = 100 } = {}) {
  const json = await call(
    `/api/v3/credentials?include_inactive=${includeInactive}&offset=${offset}&limit=${limit}`,
  );
  const els = json?.data?._embedded?.elements;
  return Array.isArray(els) ? els : [];
}

// data: { name, op_code, env_code, env_id, values, secret_keys }
export async function createCredential(data) {
  const json = await call('/api/v3/credentials/create', { method: 'POST', body: data });
  return json?.data || null;
}

export async function patchCredential(id, partial) {
  const json = await call(`/api/v3/credentials/${enc(id)}`, { method: 'PATCH', body: partial });
  return json?.data || null;
}

export async function deleteCredential(id) {
  await call(`/api/v3/credentials/${enc(id)}`, { method: 'DELETE' });
}
