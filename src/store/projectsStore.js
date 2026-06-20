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

/** One-time demo seed so the Project List isn't empty on first run.
 *  Some projects are owned by / assigned to the current user (show under
 *  "Mine"); others are owned by demo users (only under "All"). */
export function seedDemoProjects(username) {
  if (localStorage.getItem('xops_projects_seeded')) return;
  const me = username || 'You';
  const samples = [
    {
      name: 'Cloud Migration FY26', key: 'CMF',
      description: 'Lift-and-shift core workloads to a multi-cloud setup.',
      priority: 'High', status: 'Active', owner: me,
      environments: ['aws', 'azure'], tags: ['migration', 'q3'],
      startDate: '2026-04-01', endDate: '2026-09-30',
      observabilities: [{ code: 'infraops', name: 'InfraOps' }, { code: 'cloudops', name: 'CloudOps' }, { code: 'finops', name: 'FinOps' }],
      assignments: { infraops: [me, 'Rahul Mehta'], cloudops: [me], finops: ['Kavya Iyer'] },
      createdBy: me,
    },
    {
      name: 'Realtime Fraud Detection', key: 'RFD',
      description: 'Streaming ML pipeline for transaction fraud scoring.',
      priority: 'Critical', status: 'Planning', owner: 'Ananya Rao',
      environments: ['gcp'], tags: ['ml', 'streaming'],
      startDate: '2026-05-15', endDate: '2026-12-01',
      observabilities: [{ code: 'aiops', name: 'AIOps' }, { code: 'mlops', name: 'MLOps' }, { code: 'dataops', name: 'DataOps' }],
      assignments: { aiops: ['Ananya Rao'], mlops: ['Rohan Verma', me], dataops: ['Neha Gupta'] },
      createdBy: 'Ananya Rao',
    },
    {
      name: 'Security Hardening', key: 'SEC',
      description: 'Shift-left security controls across delivery pipelines.',
      priority: 'High', status: 'On Hold', owner: 'Vikram Nair',
      environments: ['aws', 'azure', 'gcp'], tags: ['security'],
      startDate: '2026-03-01', endDate: '2026-08-31',
      observabilities: [{ code: 'secops', name: 'SecOps' }, { code: 'devsecops', name: 'DevSecOps' }],
      assignments: { secops: ['Vikram Nair'], devsecops: ['Vikram Nair', 'Rahul Mehta'] },
      createdBy: 'Vikram Nair',
    },
    {
      name: 'LLM Platform Rollout', key: 'LLM',
      description: 'Internal LLM serving and evaluation platform.',
      priority: 'Medium', status: 'Active', owner: 'Rohan Verma',
      environments: ['azure'], tags: ['llm', 'platform'],
      startDate: '2026-06-01', endDate: '2026-11-30',
      observabilities: [{ code: 'llmops', name: 'LLMOps' }, { code: 'platformops', name: 'PlatformOps' }, { code: 'gitops', name: 'GitOps' }],
      assignments: { llmops: ['Rohan Verma'], platformops: ['Arjun Das'], gitops: ['Priya Singh'] },
      createdBy: 'Rohan Verma',
    },
  ];
  const list = read();
  samples.forEach((s, i) => list.push({ id: `p_seed_${i}`, createdAt: s.startDate, ...s }));
  write(list);
  localStorage.setItem('xops_projects_seeded', '1');
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
