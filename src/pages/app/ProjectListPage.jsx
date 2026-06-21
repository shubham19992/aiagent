import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiCalendar, FiTrash2, FiPlus, FiFolder, FiBarChart2, FiSearch } from 'react-icons/fi';
import { PageHeader } from './_parts';
import { listProjects, myProjects, removeProject, projectMembers, isDemoProject } from '../../store/projectsStore';

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
  const currentUser = sessionStorage.getItem('uidai_user') || 'You';
  const [scope, setScope] = useState('all');     // 'mine' | 'all'
  const [version, setVersion] = useState(0);     // bump to re-read after delete
  const [query, setQuery] = useState('');

  const allProjects = useMemo(
    () => (scope === 'mine' ? myProjects(currentUser) : listProjects()),
    [scope, currentUser, version],
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

  const del = (id) => {
    removeProject(id);
    setVersion((v) => v + 1);
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
            <Link to="/dashboard/projects/new" className="xd-btn xd-btn-sm"><FiPlus /> New Project</Link>
          </div>
        </div>

        {projects.length === 0 ? (
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
              <Link to="/dashboard/projects/new" className="xd-btn xd-btn-sm"><FiPlus /> Create your first project</Link>
            </div>
          )
        ) : (
          <div className="xd-proj-grid">
            {projects.map((p) => {
              const members = projectMembers(p);
              const obs = p.observabilities || [];
              return (
                <div className="xd-pcard" key={p.id}>
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
