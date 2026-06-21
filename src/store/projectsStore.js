// ============================================================
// projectsStore.js — local (localStorage) store for projects.
// No backend endpoint for projects yet, so we persist them in the
// browser. A project records which observabilities it watches and
// which members are assigned per observability.
// ============================================================

import { DUMMY_PROJECTS } from '../data/projectsDummy';

const KEY = 'xops_projects';

function read() {
  try {
    const raw = localStorage.getItem(KEY);
    const list = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(list)) return [];
    // Drop any previously-seeded demo projects — no dummy data anymore.
    return list.filter((p) => !String(p.id || '').startsWith('p_seed_'));
  } catch {
    return [];
  }
}

function write(list) {
  localStorage.setItem(KEY, JSON.stringify(list));
}

/** A demo/sample project (not stored, can't be deleted). */
export const isDemoProject = (p) => String(p?.id || '').startsWith('p_demo_');

/** Whether any demo projects are currently shown (always true for now). */
export function usingDummyProjects() {
  return DUMMY_PROJECTS.length > 0;
}

/** Real projects first, then the demo set so the list is never sparse. */
export function listProjects() {
  return [...read(), ...DUMMY_PROJECTS];
}

export function getProject(id) {
  return (
    read().find((p) => p.id === id) ||
    DUMMY_PROJECTS.find((p) => p.id === id) ||
    null
  );
}

export function addProject({
  name, key, description, priority, status, owner, environments,
  tags, startDate, endDate, observabilities, assignments, createdBy,
}) {
  const list = read();
  const project = {
    id: `p_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    name,
    key: key || '',
    description: description || '',
    priority: priority || 'Medium',
    status: status || 'Planning',
    owner: owner || '',
    environments: environments || [],            // ['aws','azure',...]
    tags: tags || [],                            // ['migration', ...]
    startDate,
    endDate,
    observabilities: observabilities || [],      // [{ code, name }]
    assignments: assignments || {},              // { opCode: [memberName, ...] }
    createdBy: createdBy || 'Unknown',
    createdAt: new Date().toISOString(),
  };
  list.push(project);
  write(list);
  return project;
}

export function removeProject(id) {
  write(read().filter((p) => p.id !== id));
}

/** Patch a stored project (e.g. set member assignments). Returns the
 *  updated project, or null if it isn't a stored (real) project. */
export function updateProject(id, patch) {
  const list = read();
  const idx = list.findIndex((p) => p.id === id);
  if (idx === -1) return null;
  list[idx] = { ...list[idx], ...patch };
  write(list);
  return list[idx];
}

/** Unique list of all members assigned across a project's observabilities. */
export function projectMembers(project) {
  const all = Object.values(project.assignments || {}).flat();
  return [...new Set(all)];
}

/** Projects relevant to a given logged-in user: created by them OR where
 *  they're assigned to any observability. Used for the "My Projects" view. */
export function myProjects(username) {
  const u = (username || '').trim().toLowerCase();
  const mine = u
    ? read().filter((p) => {
        if ((p.createdBy || '').trim().toLowerCase() === u) return true;
        return projectMembers(p).some((m) => (m || '').trim().toLowerCase() === u);
      })
    : [];
  // Always append the demo set so the overview / "Mine" view stays populated.
  return [...mine, ...DUMMY_PROJECTS];
}
