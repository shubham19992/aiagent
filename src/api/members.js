// ============================================================
// members.js — client for project member assignments
// /api/v3/projects/{id}/members. Served by the projects service
// (VITE_PROJECTS_BASE_URL, 8083).
//
// Assignments are nested: credentialId -> opCode -> [{ userId, role }]
// (the GET / POST response also echoes userName per entry). role is
// 'project_admin' | 'project_member'.
// ============================================================
import { serviceFetch } from './client';

const RAW = import.meta.env.VITE_PROJECTS_BASE_URL || 'http://10.1.151.228:8083';
export const MEMBERS_BASE = RAW.replace(/\/+$/, '');

const enc = encodeURIComponent;

async function call(path, { method = 'GET', body } = {}) {
  // serviceFetch injects the token and auto-logs-out on a persistent 401.
  const res = await serviceFetch(`${MEMBERS_BASE}${path}`, {
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

// Returns the assignments map: { [credentialId]: { [opCode]: [{userId,userName,role}] } }
export async function getMembers(projectId) {
  const json = await call(`/api/v3/projects/${enc(projectId)}/members`);
  return json?.data?.assignments || {};
}

// assignments: { [credentialId]: { [opCode]: [{userId, role}] } }
export async function saveMembers(projectId, assignments) {
  const json = await call(`/api/v3/projects/${enc(projectId)}/members`, {
    method: 'POST',
    body: { assignments: assignments || {} },
  });
  return json?.data?.assignments || {};
}
