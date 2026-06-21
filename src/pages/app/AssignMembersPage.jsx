import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiCheck, FiCheckCircle, FiUsers, FiLayers, FiUserCheck } from 'react-icons/fi';
import { PageHeader, Spinner } from './_parts';
import { listUsers } from '../../api/observability';
import { getProject, updateProject } from '../../store/projectsStore';

// Display name from whatever fields the users API returns.
const userName = (u) =>
  u.name || u.full_name || u.fullName || u.username || u.email || String(u.id ?? '');

// Short two-letter badge from an op name (AIOps -> "AI").
const opBadge = (name) => name.replace(/Ops$/i, '').slice(0, 2).toUpperCase();

/**
 * Second step of project creation: assign members to each observability the
 * project monitors. Reached after Create Project; loads the just-created
 * project and persists assignments back to the store.
 */
export default function AssignMembersPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const currentUser = sessionStorage.getItem('uidai_user') || 'You';

  const project = getProject(projectId);

  const [users, setUsers] = useState([]);
  const [source, setSource] = useState('api');
  const [loading, setLoading] = useState(true);
  const [assignments, setAssignments] = useState(project?.assignments || {});

  useEffect(() => {
    let alive = true;
    listUsers().then((res) => {
      if (!alive) return;
      setUsers(res.items);
      setSource(res.source);
      setLoading(false);
    });
    return () => { alive = false; };
  }, []);

  // Members = the logged-in user first, then users fetched from the API.
  const memberOptions = useMemo(() => {
    const me = { id: 'me', name: currentUser, you: true };
    const others = users
      .map((u, i) => ({ id: u.id ?? `u${i}`, name: userName(u) }))
      .filter((u) => u.name && u.name !== currentUser);
    return [me, ...others];
  }, [currentUser, users]);

  const toggleMember = (code, m) => setAssignments((a) => {
    const cur = a[code] || [];
    return { ...a, [code]: cur.includes(m) ? cur.filter((x) => x !== m) : [...cur, m] };
  });

  const save = () => {
    updateProject(projectId, { assignments });
    navigate('/dashboard/projects');
  };

  if (!project) {
    return (
      <>
        <PageHeader crumbs={[{ label: 'Manage Project', to: '/dashboard/projects' }, { label: 'Assign Members' }]} />
        <main className="xd-main">
          <div className="xd-empty">
            <p>Project not found.</p>
            <button className="xd-btn xd-btn-sm" onClick={() => navigate('/dashboard/projects')}>Back to projects</button>
          </div>
        </main>
      </>
    );
  }

  const obs = project.observabilities || [];
  const totalAssigned = new Set(Object.values(assignments).flat()).size;
  const coveredOps = obs.filter((o) => (assignments[o.code] || []).length > 0).length;

  return (
    <>
      <PageHeader
        crumbs={[
          { label: 'Manage Project', to: '/dashboard/projects' },
          { label: project.name, to: `/dashboard/projects/${project.id}` },
          { label: 'Assign Members' },
        ]}
        source={source}
      />
      <main className="xd-main">
        <div className="xd-pagelead">
          <h1>Assign Members</h1>
          <p>Assign team members to each observability in <strong>{project.name}</strong>.</p>
        </div>

        {/* summary strip */}
        <div className="xd-assign-summary">
          <div className="xd-assign-stat">
            <span className="xd-assign-stat-icon"><FiLayers /></span>
            <div>
              <div className="xd-assign-stat-num">{obs.length}</div>
              <div className="xd-assign-stat-cap">Observabilities</div>
            </div>
          </div>
          <div className="xd-assign-stat">
            <span className="xd-assign-stat-icon"><FiUserCheck /></span>
            <div>
              <div className="xd-assign-stat-num">{coveredOps}/{obs.length}</div>
              <div className="xd-assign-stat-cap">Covered</div>
            </div>
          </div>
          <div className="xd-assign-stat">
            <span className="xd-assign-stat-icon"><FiUsers /></span>
            <div>
              <div className="xd-assign-stat-num">{totalAssigned}</div>
              <div className="xd-assign-stat-cap">Members</div>
            </div>
          </div>
        </div>

        {loading ? (
          <Spinner label="Loading members…" />
        ) : (
          <>
            <div className="xd-assign-grid">
              {obs.map((o) => {
                const picked = assignments[o.code] || [];
                return (
                  <div className={`xd-assign-card ${picked.length ? 'covered' : ''}`} key={o.code}>
                    <div className="xd-assign-card-head">
                      <span className="xd-sel-badge">{opBadge(o.name)}</span>
                      <div className="xd-assign-card-meta">
                        <div className="xd-assign-card-name">{o.name}</div>
                        <div className="xd-assign-card-count">
                          {picked.length ? `${picked.length} member${picked.length > 1 ? 's' : ''} assigned` : 'No members yet'}
                        </div>
                      </div>
                      {picked.length > 0 && <FiCheckCircle className="xd-assign-card-tick" />}
                    </div>

                    <div className="xd-assign-members">
                      {memberOptions.map((m) => {
                        const on = picked.includes(m.name);
                        return (
                          <button key={m.id} type="button"
                            className={`xd-assign-member ${on ? 'on' : ''}`}
                            onClick={() => toggleMember(o.code, m.name)}>
                            <span className="xd-assign-ava">{m.name.charAt(0).toUpperCase()}</span>
                            <span className="xd-assign-member-name">{m.name}{m.you ? ' (you)' : ''}</span>
                            {on && <FiCheck className="xd-assign-member-check" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="xd-assign-bar">
              <span className="xd-assign-bar-hint">
                {coveredOps === obs.length
                  ? 'All observabilities have members assigned.'
                  : `${obs.length - coveredOps} observability(ies) still need members.`}
              </span>
              <div className="xd-assign-bar-actions">
                <button type="button" className="xd-btn-ghost" onClick={() => navigate('/dashboard/projects')}>
                  Skip for now
                </button>
                <button type="button" className="xd-btn" onClick={save}>
                  <FiCheckCircle /> Save Assignments
                </button>
              </div>
            </div>
          </>
        )}
      </main>
    </>
  );
}
