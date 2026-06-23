// ============================================================
// projects.js — client for the projects service /api/v3/projects/*.
// The projects service runs on its own host/port (8083), separate from
// the main API gateway (8081) and the observability service (8085).
// Override with VITE_PROJECTS_BASE_URL.
//
// All functions return / accept the UI-shaped project object; mapping
// to and from the backend's snake_case payload is done here so the
// pages never deal with the wire format.
// ============================================================
import { tokenStore } from './client';

const RAW = import.meta.env.VITE_PROJECTS_BASE_URL || 'http://10.1.151.228:8083';
export const PROJECTS_BASE = RAW.replace(/\/+$/, '');

const enc = encodeURIComponent;

async function call(path, { method = 'GET', body } = {}) {
  const token = tokenStore.get();
  const res = await fetch(`${PROJECTS_BASE}${path}`, {
    method,
    headers: {
      accept: 'application/json',
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
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

// ── status mapping ──────────────────────────────────────────
// Backend stores lowercase ("planning"); the UI shows Title Case.
const STATUS_LABEL = {
  planning: 'Planning', active: 'Active',
  'on hold': 'On Hold', on_hold: 'On Hold', onhold: 'On Hold',
  completed: 'Completed',
};
const titleCase = (s = '') =>
  s.replace(/[_-]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
const statusLabel = (s) => (s ? (STATUS_LABEL[String(s).toLowerCase()] || titleCase(s)) : 'Planning');
const statusApi = (s) => String(s || 'planning').toLowerCase();

// ── date mapping ────────────────────────────────────────────
// API uses ISO datetimes; the <input type="date"> uses YYYY-MM-DD.
const dateOnly = (d) => (d ? String(d).slice(0, 10) : '');
const toIso = (d) => {
  if (!d) return null;
  const t = new Date(d);
  return Number.isNaN(t.getTime()) ? null : t.toISOString();
};

// Wire payload → UI project.
function normalize(p = {}) {
  return {
    id: p.id,
    code: p.project_code || '',
    name: p.name || '',
    description: p.description || '',
    status: statusLabel(p.status),
    owner: p.owner_name || '',
    ownerUserId: p.owner_user_id || '',
    startDate: dateOnly(p.start_date),
    endDate: dateOnly(p.end_date),
    observabilities: Array.isArray(p.observabilities) ? p.observabilities : [],
    image: p.has_image ? (p.image_url || '') : '',
    imageUrl: p.image_url || '',
    hasImage: !!p.has_image,
    memberCount: p.member_count || 0,
    active: p.active !== false,
    createdBy: p.created_by || '',
    createdAt: p.created_at || '',
    updatedAt: p.updated_at || '',
  };
}

// UI project → wire payload. `image` is only sent when the caller
// includes it (a base64 data URL to set, or '' to clear) so an
// unchanged cover isn't overwritten with its own read-back URL.
function serialize(d = {}) {
  const body = {
    name: d.name,
    description: d.description || '',
    status: statusApi(d.status),
    owner_user_id: d.ownerUserId || '',
    owner_name: d.owner || '',
    start_date: toIso(d.startDate),
    end_date: toIso(d.endDate),
    observabilities: (d.observabilities || []).map((o) => ({ code: o.code, name: o.name })),
  };
  if (Object.prototype.hasOwnProperty.call(d, 'image')) body.image = d.image || '';
  return body;
}

export async function listProjects({ includeInactive = false, offset = 0, limit = 100 } = {}) {
  const json = await call(
    `/api/v3/projects?include_inactive=${includeInactive}&offset=${offset}&limit=${limit}`,
  );
  const els = json?.data?._embedded?.elements;
  return Array.isArray(els) ? els.map(normalize) : [];
}

export async function getProject(id) {
  const json = await call(`/api/v3/projects/${enc(id)}`);
  return normalize(json?.data || {});
}

export async function createProject(data) {
  const json = await call('/api/v3/projects/create', { method: 'POST', body: serialize(data) });
  return normalize(json?.data || {});
}

// Full update (PUT).
export async function updateProject(id, data) {
  const json = await call(`/api/v3/projects/${enc(id)}`, { method: 'PUT', body: serialize(data) });
  return normalize(json?.data || {});
}

// Partial update (PATCH) — e.g. just { status }.
export async function patchProject(id, partial) {
  const json = await call(`/api/v3/projects/${enc(id)}`, { method: 'PATCH', body: serialize(partial) });
  return normalize(json?.data || {});
}

export async function deleteProject(id) {
  await call(`/api/v3/projects/${enc(id)}`, { method: 'DELETE' });
}

// Replace a project's member assignments.
// members: [{ user_id, user_name, role: 'member'|'admin', observabilities: [opCode] }]
export async function setMembers(projectId, members) {
  const json = await call(`/api/v3/projects/${enc(projectId)}/members`, {
    method: 'PUT',
    body: { members: members || [] },
  });
  return json?.data || null;
}
