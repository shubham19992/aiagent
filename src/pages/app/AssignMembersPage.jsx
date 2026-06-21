import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiCheckCircle, FiX, FiUsers, FiUserPlus } from 'react-icons/fi';
import { PageHeader, Spinner } from './_parts';
import { listUsers } from '../../api/observability';
import { getProject, updateProject } from '../../store/projectsStore';

// Display name from whatever fields the users API returns.
const userName = (u) =>
  u.name || u.full_name || u.fullName || u.username || u.email || String(u.id ?? '');

// Short two-letter badge from an op name (AIOps -> "AI").
const opBadge = (name) => name.replace(/Ops$/i, '').slice(0, 2).toUpperCase();

// Project-level roles a member can hold.
const ROLE_OPTIONS = [
  { value: 'member', label: 'Project Member' },
  { value: 'admin', label: 'Project Admin' },
];

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
  const [roles, setRoles] = useState(project?.roles || {});
  const [activeOp, setActiveOp] = useState(project?.observabilities?.[0]?.code || '');

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

  const roleOf = (m) => roles[m] || 'member';
  const isOn = (code, m) => (assignments[code] || []).includes(m);

  // Remove a member from an observability entirely.
  const removeMember = (code, m) => setAssignments((a) => ({
    ...a, [code]: (a[code] || []).filter((x) => x !== m),
  }));

  // Set a user's role for the given observability. An empty role unassigns
  // them; otherwise they're added to the op and their project role is set.
  const setUserRole = (code, m, role) => {
    if (!role) {
      removeMember(code, m);
      return;
    }
    setAssignments((a) => {
      const cur = a[code] || [];
      return { ...a, [code]: cur.includes(m) ? cur : [...cur, m] };
    });
    setRoles((r) => ({ ...r, [m]: role }));
  };

  // Unique members assigned across every observability, for the roles panel.
  const assignedMembers = useMemo(() => {
    const all = Object.values(assignments).flat();
    return [...new Set(all)];
  }, [assignments]);

  const save = () => {
    // Drop roles for members no longer assigned anywhere.
    const cleanRoles = assignedMembers.reduce((acc, m) => {
      acc[m] = roles[m] || 'member';
      return acc;
    }, {});
    updateProject(projectId, { assignments, roles: cleanRoles });
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
      <main className="xd-main xd-am-main">
        <div className="xd-pagelead">
          <h1>Assign Members</h1>
          <p>Pick an observability, then set each user's role — assignments appear on the right.</p>
        </div>

        {loading ? (
          <Spinner label="Loading members…" />
        ) : (
          <>
            <div className="xd-card xd-am-card">
            <div className="xd-am-2col">
              {/* ── Left: select members (form) ── */}
              <div className="xd-am-panel">
                <div className="xd-am-head"><FiUserPlus /><h3>Select members</h3></div>

                <label className="xd-conn-label">Observability</label>
                <div className="xd-am-ops">
                  {obs.map((o) => {
                    const count = (assignments[o.code] || []).length;
                    return (
                      <button key={o.code} type="button"
                        className={`xd-am-op ${activeOp === o.code ? 'on' : ''}`}
                        onClick={() => setActiveOp(o.code)}>
                        {o.name}
                        {count > 0 && <span className="xd-am-op-count">{count}</span>}
                      </button>
                    );
                  })}
                </div>

                <label className="xd-conn-label">
                  Members for {obs.find((o) => o.code === activeOp)?.name || '—'}
                </label>
                <div className="xd-am-table">
                  <div className="xd-am-trow xd-am-thead">
                    <span>User</span>
                    <span>Role</span>
                  </div>
                  {memberOptions.map((m) => {
                    const on = isOn(activeOp, m.name);
                    return (
                      <div className={`xd-am-trow ${on ? 'on' : ''}`} key={m.id}>
                        <span className="xd-am-tuser">
                          <span className="xd-am-ava">{m.name.charAt(0).toUpperCase()}</span>
                          <span className="xd-am-tname">{m.name}{m.you ? ' (you)' : ''}</span>
                        </span>
                        <select className="xd-conn-input xd-am-trole"
                          value={on ? roleOf(m.name) : ''}
                          onChange={(e) => setUserRole(activeOp, m.name, e.target.value)}>
                          <option value="">Unassigned</option>
                          {ROLE_OPTIONS.map((r) => (
                            <option key={r.value} value={r.value}>{r.label}</option>
                          ))}
                        </select>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ── Right: selected / assigned ── */}
              <div className="xd-am-panel">
                <div className="xd-am-head"><FiUsers /><h3>Assigned members</h3></div>

                <div className="xd-am-summary">
                  {obs.map((o) => {
                    const picked = assignments[o.code] || [];
                    return (
                      <div className="xd-am-srow" key={o.code}>
                        <div className="xd-am-shead">
                          <span className="xd-am-badge">{opBadge(o.name)}</span>
                          <span className="xd-am-sname">{o.name}</span>
                        </div>
                        {picked.length === 0 ? (
                          <span className="xd-muted xd-am-none"><FiUsers /> No members yet</span>
                        ) : (
                          <div className="xd-am-pills">
                            {picked.map((m) => (
                              <span className="xd-member-pill" key={m}>
                                <span className="xd-member-ava">{m.charAt(0).toUpperCase()}</span>{m}
                                <span className={`xd-am-roletag ${roles[m] === 'admin' ? 'admin' : ''}`}>
                                  {roles[m] === 'admin' ? 'Admin' : 'Member'}
                                </span>
                                <button type="button" className="xd-am-remove" title="Remove"
                                  onClick={() => removeMember(o.code, m)}><FiX /></button>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            </div>

            <div className="xd-assign-bar">
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
