// ============================================================
// access.js — derives the logged-in user's PRODUCT-level role and the
// capability flags the UI gates on. The product role is what the user
// carries at login (SuperAdmin / Product_Admin / Product_Support);
// project- and ops-level roles are per-project assignments, handled
// separately inside a project's screens.
// ============================================================
import { useEffect, useState } from 'react';
import { tokenStore } from '../api/client';

// Decode a JWT payload (no verification — purely to read role claims).
function decodeJwt(token) {
  try {
    const part = (token || '').split('.')[1];
    if (!part) return {};
    const json = atob(part.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(decodeURIComponent(escape(json)));
  } catch {
    return {};
  }
}

const norm = (v) => String(v || '').trim().toLowerCase();

/**
 * Current user's product role + capabilities.
 *   isSuperAdmin       — full control of everything
 *   isProductAdmin     — full control but cannot create a SuperAdmin
 *   isProductSupport   — view-only across the product
 *   canManage          — may create / edit / delete (admins only)
 *   canCreateSuperAdmin— only a SuperAdmin may mint another SuperAdmin
 */
export function getAccess() {
  const claims = decodeJwt(tokenStore.get());
  const user = tokenStore.getUser() || {};
  const role = norm(user.org_role || user.orgRole || user.role || claims.role);

  const isSuperAdmin =
    claims.is_super_admin === true || user.is_super_admin === true ||
    role === 'superadmin' || role === 'super_admin';

  const isProductAdmin =
    !isSuperAdmin &&
    (claims.is_admin === true || user.is_admin === true || role === 'product_admin');

  const isProductSupport =
    !isSuperAdmin && !isProductAdmin && role === 'product_support';

  const canManage = isSuperAdmin || isProductAdmin;

  return {
    role,
    isSuperAdmin,
    isProductAdmin,
    isProductSupport,
    canManage,
    canCreateSuperAdmin: isSuperAdmin,
  };
}

/** Current logged-in user's id (matches the userId in role-assignments). */
export function currentUserId() {
  const claims = decodeJwt(tokenStore.get());
  const user = tokenStore.getUser() || {};
  return user.id || user.user_id || user.uuid || claims.user_id || claims.sub || null;
}

/**
 * Is the given user a project-level admin in a role-assignments payload?
 * Shape: { project: { project_admin: [{ userId, ... }], ... }, ... }.
 */
export function isProjectAdminAssignment(assignments, userId = currentUserId()) {
  if (!assignments || userId == null) return false;
  const list = assignments.project?.project_admin;
  return Array.isArray(list) && list.some((u) => String(u.userId) === String(userId));
}

/** Reactive variant — recomputes when the stored user changes. */
export function useAccess() {
  const [access, setAccess] = useState(getAccess);
  useEffect(() => {
    const update = () => setAccess(getAccess());
    window.addEventListener('pmis:user-changed', update);
    window.addEventListener('pmis:session-reset', update);
    return () => {
      window.removeEventListener('pmis:user-changed', update);
      window.removeEventListener('pmis:session-reset', update);
    };
  }, []);
  return access;
}
