// ============================================================
// authz.js — client for the authorization endpoints on the main API
// gateway (VITE_API_BASE_URL, 8081). Backs the role-scoped people
// pickers: Create/Edit project OWNER, and the Assign Members admin /
// member dropdowns.
// ============================================================
import { api } from './client';

const enc = encodeURIComponent;

const displayName = (u) =>
  u.full_name || u.fullName || u.login || u.email || String(u.id ?? '');

// GET /api/v3/authz/projects/assignable-users/{role}
// role: 'project_owner' | 'project_admin' | 'project_member'
// Returns { items, source } with items as { id, name, login, email, roles }.
export async function listAssignableUsers(role) {
  const json = await api.get(`/api/v3/authz/projects/assignable-users/${enc(role)}`);
  const els = json?.data?._embedded?.elements;
  const items = Array.isArray(els)
    ? els.map((u, i) => ({
        id: u.id ?? `u${i}`,
        name: displayName(u),
        login: u.login || '',
        email: u.email || '',
        roles: Array.isArray(u.roles) ? u.roles : [],
      }))
    : [];
  return { items, source: 'api' };
}
