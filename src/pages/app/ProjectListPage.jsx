import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiCalendar, FiUsers, FiUser, FiTrash2, FiPlus, FiFolder, FiTag } from 'react-icons/fi';
import { PageHeader } from './_parts';
import { listProjects, myProjects, removeProject, projectMembers } from '../../store/projectsStore';

const fmtDate = (d) => {
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' }); }
  catch { return d; }
};

export default function ProjectListPage() {
  const currentUser = sessionStorage.getItem('uidai_user') || 'You';
  const [scope, setScope] = useState('mine');   // 'mine' | 'all'
  const [version, setVersion] = useState(0);     // bump to re-read after delete

  const projects = useMemo(
    () => (scope === 'mine' ? myProjects(currentUser) : listProjects()),
    [scope, currentUser, version],
  );

  const del = (id) => {
    removeProject(id);
    setVersion((v) => v + 1);
  };

  return (
    <>
      <PageHeader crumbs={[{ label: 'Manage Project' }, { label: 'Project List' }]} />
      <main className="xd-main">
        <div className="xd-pagelead xd-pagelead-row">
          <div>
            <h1>Projects</h1>
            <p>{scope === 'mine' ? `Projects related to ${currentUser}.` : 'All projects.'}</p>
          </div>
          <div className="xd-list-actions">
            <div className="xd-role-switch">
              <button className={`xd-role-btn ${scope === 'mine' ? 'active' : ''}`} onClick={() => setScope('mine')} type="button">Mine</button>
              <button className={`xd-role-btn ${scope === 'all' ? 'active' : ''}`} onClick={() => setScope('all')} type="button">All</button>
            </div>
            <Link to="/dashboard/projects/new" className="xd-btn xd-btn-sm"><FiPlus /> New Project</Link>
          </div>
        </div>

        {projects.length === 0 ? (
          <div className="xd-empty">
            <FiFolder />
            <p>{scope === 'mine' ? 'No projects assigned to you yet.' : 'No projects created yet.'}</p>
            <Link to="/dashboard/projects/new" className="xd-btn xd-btn-sm"><FiPlus /> Create your first project</Link>
          </div>
        ) : (
          <div className="xd-proj-grid">
            {projects.map((p) => {
              const members = projectMembers(p);
              return (
                <div className="xd-proj-card" key={p.id}>
                  <div className="xd-proj-card-head">
                    <div>
                      <h3>{p.name} {p.key && <span className="xd-proj-key">{p.key}</span>}</h3>
                      <div className="xd-proj-badges">
                        <span className={`xd-status xd-status-${(p.status || 'Planning').toLowerCase().replace(/\s/g, '')}`}>{p.status || 'Planning'}</span>
                        <span className={`xd-prio xd-prio-${(p.priority || 'Medium').toLowerCase()}`}>{p.priority || 'Medium'}</span>
                      </div>
                    </div>
                    <button className="xd-proj-del" title="Delete project" onClick={() => del(p.id)}><FiTrash2 /></button>
                  </div>

                  {p.description && <div className="xd-proj-desc">{p.description}</div>}
                  <div className="xd-proj-meta"><FiCalendar /> {fmtDate(p.startDate)} → {fmtDate(p.endDate)}</div>
                  {p.owner && <div className="xd-proj-meta"><FiUser /> Owner: {p.owner}</div>}

                  {(p.environments?.length > 0) && (
                    <>
                      <div className="xd-proj-label">Environments</div>
                      <div className="xd-proj-chips">
                        {p.environments.map((e) => <span className="xd-tag xd-tag-env" key={e}>{e.toUpperCase()}</span>)}
                      </div>
                    </>
                  )}

                  <div className="xd-proj-label">Observing</div>
                  <div className="xd-proj-chips">
                    {p.observabilities.map((o) => (
                      <span className="xd-tag" key={o.code}>{o.name}</span>
                    ))}
                  </div>

                  <div className="xd-proj-label"><FiUsers /> Members ({members.length})</div>
                  <div className="xd-proj-members">
                    {members.length === 0 && <span className="xd-muted">None assigned</span>}
                    {members.map((m) => (
                      <span className="xd-member-pill" key={m}>
                        <span className="xd-member-ava">{m.charAt(0).toUpperCase()}</span>{m}
                      </span>
                    ))}
                  </div>

                  {(p.tags?.length > 0) && (
                    <div className="xd-proj-tags"><FiTag />{p.tags.map((t) => <span className="xd-tag-soft" key={t}>{t}</span>)}</div>
                  )}

                  <div className="xd-proj-foot">Created by {p.createdBy}</div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </>
  );
}
