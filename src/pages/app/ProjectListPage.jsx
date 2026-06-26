import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiCalendar, FiTrash2, FiPlus, FiFolder, FiBarChart2, FiSearch, FiMoreVertical, FiUserPlus, FiEdit2, FiEye } from 'react-icons/fi';
import { PageHeader, Spinner } from './_parts';
import { listProjects, deleteProject } from '../../api/projects';
import { getRoleAssignments } from '../../api/rbac';
import { projectMembers, isDemoProject, isMine, clearMembership } from '../../store/projectsStore';
import { useAccess } from '../../lib/access';

// Unique assigned member names across both scopes of a role-assignments payload.
function membersFromAssignments(data) {
  const names = new Set();
  const collect = (list) => (list || []).forEach((u) => u.userName && names.add(u.userName));
  Object.values(data?.project || {}).forEach(collect);
  Object.values(data?.observability || {}).forEach((roleMap) =>
    Object.values(roleMap || {}).forEach(collect));
  return [...names];
}

const fmtDate = (d) => {
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' }); }
  catch { return d; }
};

// Deterministic cover gradient from the project name (used when no image).
const coverGradient = (seed = '') => {
  let h = 0;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) % 360;
  return `linear-gradient(135deg, hsl(${h} 52% 42%), hsl(${(h + 38) % 360} 54% 28%))`;
};

export default function ProjectListPage() {
  const access = useAccess();
  const currentUser = sessionStorage.getItem('uidai_user') || 'You';
  const [scope, setScope] = useState('all');     // 'mine' | 'all'
  const [version, setVersion] = useState(0);     // bump to re-read after delete
  const [query, setQuery] = useState('');
  const [openMenu, setOpenMenu] = useState(null); // project id of the open ⋯ menu
  const [all, setAll] = useState([]);            // all projects from the API
  const [membersByProject, setMembersByProject] = useState({}); // id -> [names]
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Load projects from the backend (re-runs after a delete).
  useEffect(() => {
    let alive = true;
    setLoading(true);
    listProjects().then((items) => {
      if (!alive) return;
      setAll(items);
      setError('');
      setLoading(false);
    }).catch((err) => {
      if (!alive) return;
      setAll([]);
      setError(err?.message || 'Failed to load projects.');
      setLoading(false);
    });
    return () => { alive = false; };
  }, [version]);

  // Fetch assigned members per real project (role-assignments API) so the
  // cards show who's assigned — the local overlay is no longer written.
  useEffect(() => {
    let alive = true;
    const real = all.filter((p) => !isDemoProject(p));
    if (real.length === 0) { setMembersByProject({}); return undefined; }
    Promise.all(real.map((p) =>
      getRoleAssignments(p.id)
        .then((d) => [p.id, membersFromAssignments(d)])
        .catch(() => [p.id, []]),
    )).then((entries) => {
      if (alive) setMembersByProject(Object.fromEntries(entries));
    });
    return () => { alive = false; };
  }, [all]);

  // Close the open card menu on outside click / Escape.
  useEffect(() => {
    if (!openMenu) return undefined;
    const onDown = (e) => { if (!e.target.closest('[data-pcard-menu]')) setOpenMenu(null); };
    const onKey = (e) => { if (e.key === 'Escape') setOpenMenu(null); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [openMenu]);

  const allProjects = useMemo(
    () => (scope === 'mine' ? all.filter((p) => isMine(p, currentUser)) : all),
    [scope, currentUser, all],
  );

  // Filter by name, owner, description or any observability name.
  const projects = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allProjects;
    return allProjects.filter((p) => {
      const hay = [
        p.name, p.owner, p.description,
        ...(p.observabilities || []).map((o) => o.name),
      ].join(' ').toLowerCase();
      return hay.includes(q);
    });
  }, [allProjects, query]);

  const hasDemo = useMemo(() => projects.some(isDemoProject), [projects]);

  const del = async (id) => {
    if (!window.confirm('Delete this project? This cannot be undone.')) return;
    try {
      await deleteProject(id);
      clearMembership(id);
      setVersion((v) => v + 1);
    } catch (err) {
      setError(err?.message || 'Failed to delete project.');
    }
  };

  return (
    <>
      <PageHeader crumbs={[{ label: 'Manage Project' }, { label: 'Project List' }]} source={hasDemo ? 'dummy' : 'api'} />
      <main className="xd-main">
        <div className="xd-pagelead xd-pagelead-row">
          <div>
            <h1>Projects</h1>
            <p>{scope === 'mine' ? `Projects related to ${currentUser}.` : 'All projects.'}</p>
          </div>
          <div className="xd-list-actions">
            <div className="xd-search">
              <FiSearch className="xd-search-icon" />
              <input
                className="xd-search-input"
                type="search"
                placeholder="Search projects…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <div className="xd-role-switch">
              <button className={`xd-role-btn ${scope === 'mine' ? 'active' : ''}`} onClick={() => setScope('mine')} type="button">Mine</button>
              <button className={`xd-role-btn ${scope === 'all' ? 'active' : ''}`} onClick={() => setScope('all')} type="button">All</button>
            </div>
            {access.canManage && (
              <Link to="/dashboard/projects/new" className="xd-btn xd-btn-sm"><FiPlus /> New Project</Link>
            )}
          </div>
        </div>

        {loading ? (
          <Spinner label="Loading projects…" />
        ) : error ? (
          <div className="xd-empty">
            <FiFolder />
            <p>{error}</p>
            <button className="xd-btn xd-btn-sm" type="button" onClick={() => setVersion((v) => v + 1)}>Retry</button>
          </div>
        ) : projects.length === 0 ? (
          query.trim() ? (
            <div className="xd-empty">
              <FiSearch />
              <p>No projects match “{query.trim()}”.</p>
              <button className="xd-btn xd-btn-sm" type="button" onClick={() => setQuery('')}>Clear search</button>
            </div>
          ) : (
            <div className="xd-empty">
              <FiFolder />
              <p>{scope === 'mine' ? 'No projects assigned to you yet.' : 'No projects created yet.'}</p>
              {access.canManage && (
                <Link to="/dashboard/projects/new" className="xd-btn xd-btn-sm"><FiPlus /> Create your first project</Link>
              )}
            </div>
          )
        ) : (
          <div className="xd-proj-grid">
            {projects.map((p) => {
              const members = membersByProject[p.id] ?? projectMembers(p);
              const obs = p.observabilities || [];
              return (
                <div className="xd-pcard" key={p.id}>
                  {/* top-right: management ⋯ menu for admins, else a view icon */}
                  <div className="xd-pcard-menu" data-pcard-menu>
                    {access.canManage ? (
                      <>
                        <button type="button" className="xd-pcard-menu-btn" title="More actions"
                          aria-haspopup="menu" aria-expanded={openMenu === p.id}
                          onClick={() => setOpenMenu((id) => (id === p.id ? null : p.id))}>
                          <FiMoreVertical />
                        </button>
                        {openMenu === p.id && (
                          <div className="xd-pcard-menu-list" role="menu">
                            <Link to={`/dashboard/projects/${p.id}/assign`} className="xd-pcard-menu-item" role="menuitem"
                              onClick={() => setOpenMenu(null)}>
                              <FiUserPlus /> Manage Users
                            </Link>
                            {!isDemoProject(p) && (
                              <Link to={`/dashboard/projects/${p.id}/edit`} className="xd-pcard-menu-item" role="menuitem"
                                onClick={() => setOpenMenu(null)}>
                                <FiEdit2 /> Edit Project
                              </Link>
                            )}
                          </div>
                        )}
                      </>
                    ) : (
                      !isDemoProject(p) && (
                        <Link to={`/dashboard/projects/${p.id}/edit?view=1`} className="xd-pcard-menu-btn"
                          title="View project details">
                          <FiEye />
                        </Link>
                      )
                    )}
                  </div>

                  {/* cover: uploaded image or a generated gradient with the initial */}
                  <Link to={`/dashboard/projects/${p.id}`} className="xd-pcard-cover"
                    style={p.image
                      ? { backgroundImage: `url(${p.image})` }
                      : { background: coverGradient(p.name) }}>
                    {!p.image && <span className="xd-pcard-mark">{p.name.charAt(0).toUpperCase()}</span>}
                    <span className={`xd-status xd-status-${(p.status || 'Planning').toLowerCase().replace(/\s/g, '')} xd-pcard-status`}>
                      {p.status || 'Planning'}
                    </span>
                    {isDemoProject(p) && <span className="xd-pcard-demo">Demo</span>}
                  </Link>

                  <div className="xd-pcard-body">
                    <h3 className="xd-pcard-title">
                      <Link to={`/dashboard/projects/${p.id}`} className="xd-proj-title-link">{p.name}</Link>
                    </h3>

                    <div className="xd-pcard-meta"><FiCalendar /> {fmtDate(p.startDate)} → {fmtDate(p.endDate)}</div>

                    {obs.length > 0 && (
                      <div className="xd-pcard-chips">
                        {obs.slice(0, 3).map((o) => <span className="xd-tag" key={o.code}>{o.name}</span>)}
                        {obs.length > 3 && <span className="xd-tag xd-tag-more">+{obs.length - 3}</span>}
                      </div>
                    )}

                    <div className="xd-pcard-foot">
                      <div className="xd-pcard-avatars">
                        {members.length === 0 && <span className="xd-muted">No members</span>}
                        {members.slice(0, 4).map((m) => (
                          <span className="xd-pcard-ava" key={m} title={m}>{m.charAt(0).toUpperCase()}</span>
                        ))}
                        {members.length > 4 && <span className="xd-pcard-ava more">+{members.length - 4}</span>}
                      </div>
                      <div className="xd-pcard-actions">
                        <Link to={`/dashboard/projects/${p.id}`} className="xd-proj-open"><FiBarChart2 /> Open</Link>
                        {!isDemoProject(p) && (
                          <button className="xd-proj-del" title="Delete project" onClick={() => del(p.id)}><FiTrash2 /></button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </>
  );
}
