// ============================================================
// rbac.js — Role-Based Access Control client. These endpoints live on
// services the app already configures, so we reuse their base URLs:
//   • Roles + Permissions (master/default)  → VITE_OBS_BASE_URL (8085)
//   • Custom roles (per project)             → VITE_API_BASE_URL (8081)
//   • Project role assignments               → VITE_PROJECTS_BASE_URL (8083)
// ============================================================
import { serviceFetch } from './client';

const norm = (raw, fallback) => (raw || fallback).replace(/\/+$/, '');
const RBAC_BASE = norm(import.meta.env.VITE_OBS_BASE_URL, 'http://10.1.151.228:8085');
const CUSTOM_ROLES_BASE = norm(import.meta.env.VITE_API_BASE_URL, 'http://10.1.151.228:8081');
const ROLE_ASSIGN_BASE = norm(import.meta.env.VITE_PROJECTS_BASE_URL, 'http://10.1.151.228:8083');

const enc = encodeURIComponent;

async function call(base, path, { method = 'GET', body, query } = {}) {
  const url = new URL(`${base}${path}`);
  if (query) {
    Object.entries(query).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, v);
    });
  }
  // serviceFetch injects the token, refreshes once on 401, and logs the user
  // out (clears session + redirects to /login) if it's still 401.
  const res = await serviceFetch(url, {
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

const elements = (json) => {
  const els = json?.data?._embedded?.elements;
  return Array.isArray(els) ? els : [];
};

// ── Roles (master / default) ──────────────────────────────────────────
// level: 'product' | 'project' | 'ops'; opCode required for ops filtering.
export async function listRoles({ level, opCode, includeInactive = false } = {}) {
  const json = await call(RBAC_BASE, '/api/v3/roles', {
    query: { level, op_code: opCode, include_inactive: includeInactive },
  });
  return elements(json);
}

export async function getRole(code) {
  const json = await call(RBAC_BASE, `/api/v3/roles/${enc(code)}`);
  return json?.data || null;
}

// ── Permissions ───────────────────────────────────────────────────────
export async function listPermissions({ level, opCode, module, action, includeInactive = false } = {}) {
  const json = await call(RBAC_BASE, '/api/v3/permissions', {
    query: { level, op_code: opCode, module, action, include_inactive: includeInactive },
  });
  return elements(json);
}

// ── Custom roles (created by users, scoped to a project) ──────────────
export async function listCustomRoles({ level, opCode, projectId, includeInactive = false } = {}) {
  const json = await call(CUSTOM_ROLES_BASE, '/api/v3/custom-roles', {
    query: { level, op_code: opCode, project_id: projectId, include_inactive: includeInactive },
  });
  return elements(json);
}

// body: { name, level, op_code?, project_id, permissions: [code, ...] }
export async function createCustomRole({ name, level, opCode, projectId, permissions } = {}) {
  const json = await call(CUSTOM_ROLES_BASE, '/api/v3/custom-roles', {
    method: 'POST',
    body: {
      name,
      level,
      ...(opCode ? { op_code: opCode } : {}),
      project_id: projectId,
      permissions: permissions || [],
    },
  });
  return json?.data || null;
}

// ── Project role assignments ──────────────────────────────────────────
// GET shape:
//   { project: { [roleCode]: [{userId,userName,isCustom}] },
//     observability: { [opCode]: { [roleCode]: [{userId,userName,isCustom}] } } }
export async function getRoleAssignments(projectId) {
  const json = await call(ROLE_ASSIGN_BASE, `/api/v3/projects/${enc(projectId)}/role-assignments`);
  return json?.data || { project: {}, observability: {} };
}

// body:
//   { project: [{userId, role, isCustom?}],
//     observability: { [opCode]: [{userId, role, isCustom?}] } }
export async function saveRoleAssignments(projectId, body) {
  const json = await call(ROLE_ASSIGN_BASE, `/api/v3/projects/${enc(projectId)}/role-assignments`, {
    method: 'POST',
    body,
  });
  return json?.data || null;
}
