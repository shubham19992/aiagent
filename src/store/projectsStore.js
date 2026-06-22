// ============================================================
// projectsStore.js — local (localStorage) overlay for project MEMBER
// assignments.
//
// Project data itself (name, dates, observabilities, …) now lives on the
// backend — see src/api/projects.js. There is no confirmed members API
// yet, so per-observability assignments and per-member roles are kept in
// the browser, keyed by the project's backend id.
// ============================================================

const KEY = 'xops_project_members';

function readAll() {
  try {
    const raw = localStorage.getItem(KEY);
    const obj = raw ? JSON.parse(raw) : {};
    return obj && typeof obj === 'object' ? obj : {};
  } catch {
    return {};
  }
}

function writeAll(obj) {
  try {
    localStorage.setItem(KEY, JSON.stringify(obj));
  } catch {
    /* quota exceeded — ignore */
  }
}

/** Membership overlay for a project: { assignments, roles }. */
export function getMembership(id) {
  const m = readAll()[id];
  return {
    assignments: (m && m.assignments) || {},   // { opCode: [memberName, ...] }
    roles: (m && m.roles) || {},                // { memberName: 'member' | 'admin' }
  };
}

/** Persist the membership overlay for a project. */
export function setMembership(id, { assignments, roles } = {}) {
  const all = readAll();
  all[id] = { assignments: assignments || {}, roles: roles || {} };
  writeAll(all);
  return all[id];
}

/** Drop the overlay for a deleted project. */
export function clearMembership(id) {
  const all = readAll();
  if (all[id]) { delete all[id]; writeAll(all); }
}

/** Merge a backend project with its local membership overlay. */
export function withMembership(project) {
  if (!project || !project.id) return project;
  const { assignments, roles } = getMembership(project.id);
  return { ...project, assignments, roles };
}

/** Unique list of all members assigned across a project's observabilities. */
export function projectMembers(project) {
  const assignments = (project && Object.keys(project.assignments || {}).length)
    ? project.assignments
    : getMembership(project?.id).assignments;
  const all = Object.values(assignments || {}).flat();
  return [...new Set(all)];
}

/** Whether a project is relevant to a given logged-in user: they own it,
 *  created it, or are assigned to one of its observabilities. */
export function isMine(project, username) {
  const u = (username || '').trim().toLowerCase();
  if (!u || !project) return false;
  if ((project.owner || '').trim().toLowerCase() === u) return true;
  if ((project.createdBy || '').trim().toLowerCase() === u) return true;
  return projectMembers(project).some((m) => (m || '').trim().toLowerCase() === u);
}

/** No demo/sample projects anymore — kept so existing callers stay valid. */
export const isDemoProject = () => false;
