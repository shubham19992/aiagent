// ============================================================
// users.js — client for the user directory on the main API gateway
// (VITE_API_BASE_URL, 8081), NOT the observability service (8085).
// Backs the owner / member dropdowns on the project pages.
// ============================================================
import { api } from './client';
import { ENDPOINTS } from './endpoint';

// GET /api/v3/users?offset=&include_deleted=
// Returns { items, source } to match the shape the pages already expect.
export async function listUsers({ offset = 1, includeDeleted = false } = {}) {
  const json = await api.get(ENDPOINTS.users.list, {
    query: { offset, include_deleted: includeDeleted },
  });
  const els = json?.data?._embedded?.elements;
  return { items: Array.isArray(els) ? els : [], source: 'api' };
}

// POST /api/v3/users/create
// data: { login, email, password, fullName, phoneNumber, orgRole,
//         admin, twoFactorEnabled, projectIds }
export async function createUser(data) {
  const json = await api.post(ENDPOINTS.users.create, data);
  return json?.data || json || null;
}

// GET /api/v3/users/{id}
export async function getUser(id) {
  const json = await api.get(ENDPOINTS.users.get(id));
  return json?.data || json || null;
}

// PATCH /api/v3/users/{id}
// data: { email, fullName, phoneNumber, orgRole, admin,
//         twoFactorEnabled, status, projectIds }
export async function updateUser(id, data) {
  const json = await api.patch(ENDPOINTS.users.update(id), data);
  return json?.data || json || null;
}

// DELETE /api/v3/users/{id}
export async function deleteUser(id) {
  const json = await api.del(ENDPOINTS.users.remove(id));
  return json?.data || json || null;
}
