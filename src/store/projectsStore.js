// ============================================================
// projectsStore.js — local (localStorage) store for projects.
// No backend endpoint for projects yet, so we persist them in the
// browser. A project records which observabilities it watches and
// which members are assigned per observability.
// ============================================================

const KEY = 'xops_projects';

function read() {
  try {
    const raw = localStorage.getItem(KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function write(list) {
  localStorage.setItem(KEY, JSON.stringify(list));
}

export function listProjects() {
  return read();
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

/** Unique list of all members assigned across a project's observabilities. */
export function projectMembers(project) {
  const all = Object.values(project.assignments || {}).flat();
  return [...new Set(all)];
}

/** Projects relevant to a given logged-in user: created by them OR where
 *  they're assigned to any observability. Used for the "My Projects" view. */
export function myProjects(username) {
  const u = (username || '').trim().toLowerCase();
  if (!u) return [];
  return read().filter((p) => {
    if ((p.createdBy || '').trim().toLowerCase() === u) return true;
    return projectMembers(p).some((m) => (m || '').trim().toLowerCase() === u);
  });
}
