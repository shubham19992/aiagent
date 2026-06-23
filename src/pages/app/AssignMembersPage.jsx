import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiCheck, FiCheckCircle, FiChevronDown, FiX, FiUsers, FiUserPlus, FiShield } from 'react-icons/fi';
import { PageHeader, Spinner } from './_parts';
import { listUsers } from '../../api/users';
import { getProject, setMembers } from '../../api/projects';
import { getMembership, setMembership } from '../../store/projectsStore';
import { tokenStore } from '../../api/client';

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
  const me = tokenStore.getUser() || {};
  const myId = me.id || me.user_id || me.uuid || 'me';

  const [project, setProject] = useState(null);
  const [notFound, setNotFound] = useState(false);

  const [users, setUsers] = useState([]);
  const [source, setSource] = useState('api');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const membership = getMembership(projectId);
  const [assignments, setAssignments] = useState(membership.assignments);
  const [roles, setRoles] = useState(membership.roles);
  const [activeOp, setActiveOp] = useState('');
  const [openRole, setOpenRole] = useState(null); // null | 'member' | 'admin'
  const msRef = useRef(null);

  // Close the open user dropdown on outside click / Escape.
  useEffect(() => {
    if (!openRole) return undefined;
    const onDown = (e) => { if (msRef.current && !msRef.current.contains(e.target)) setOpenRole(null); };
    const onKey = (e) => { if (e.key === 'Escape') setOpenRole(null); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [openRole]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    Promise.all([getProject(projectId), listUsers()]).then(([proj, res]) => {
      if (!alive) return;
      setProject(proj);
      setActiveOp(proj?.observabilities?.[0]?.code || '');
      setUsers(res.items);
      setSource(res.source);
      setLoading(false);
    }).catch(() => {
      if (!alive) return;
      setNotFound(true);
      setLoading(false);
    });
    return () => { alive = false; };
  }, [projectId]);

  // Members = the logged-in user first, then users fetched from the API.
  const memberOptions = useMemo(() => {
    const meOpt = { id: myId, name: currentUser, you: true };
    const others = users
      .map((u, i) => ({ id: u.id ?? `u${i}`, name: userName(u) }))
      .filter((u) => u.name && u.name !== currentUser);
    return [meOpt, ...others];
  }, [currentUser, myId, users]);

  const roleOf = (m) => roles[m] || 'member';
  const isOn = (code, m) => (assignments[code] || []).includes(m);

  // Remove a member from an observability entirely.
  const removeMember = (code, m) => setAssignments((a) => ({
    ...a, [code]: (a[code] || []).filter((x) => x !== m),
  }));

  // Toggle a user under a specific role for the given observability.
  // Picking a user already on that role removes them; a user on the other
  // role switches over to this one.
  const pickRole = (code, m, role) => {
    if (isOn(code, m) && roleOf(m) === role) {
      removeMember(code, m);
      return;
    }
    setAssignments((a) => {
      const cur = a[code] || [];
      return { ...a, [code]: cur.includes(m) ? cur : [...cur, m] };
    });
    setRoles((r) => ({ ...r, [m]: role }));
  };

  // Count of members assigned to an op under a given role.
  const roleCount = (code, role) =>
    (assignments[code] || []).filter((m) => roleOf(m) === role).length;

  // Unique members assigned across every observability, for the roles panel.
  const assignedMembers = useMemo(() => {
    const all = Object.values(assignments).flat();
    return [...new Set(all)];
  }, [assignments]);

  const save = async () => {
    // Drop roles for members no longer assigned anywhere.
    const cleanRoles = assignedMembers.reduce((acc, m) => {
      acc[m] = roles[m] || 'member';
      return acc;
    }, {});

    // Build the API payload: one entry per member, listing the
    // observability codes they're assigned to plus their role.
    const idByName = Object.fromEntries(memberOptions.map((o) => [o.name, o.id]));
    const members = assignedMembers.map((name) => ({
      user_id: idByName[name] || name,
      user_name: name,
      role: cleanRoles[name] || 'member',
      observabilities: Object.entries(assignments)
        .filter(([, names]) => names.includes(name))
        .map(([code]) => code),
    }));

    setSaving(true);
    setError('');
    try {
      await setMembers(projectId, members);
      // Mirror the assignments locally so the cards/avatars stay in sync
      // (no GET members endpoint to re-read from yet).
      setMembership(projectId, { assignments, roles: cleanRoles });
      navigate('/dashboard/projects');
    } catch (err) {
      setError(err?.message || 'Failed to save assignments.');
      setSaving(false);
    }
  };

  if (notFound) {
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

  const obs = project?.observabilities || [];

  return (
    <>
      <PageHeader
        crumbs={[
          { label: 'Manage Project', to: '/dashboard/projects' },
          ...(project ? [{ label: project.name, to: `/dashboard/projects/${project.id}` }] : []),
          { label: 'Assign Members' },
        ]}
        source={source}
      />
      <main className="xd-main xd-am-main">
        <div className="xd-pagelead">
          <h1>Assign Members</h1>
          <p>Pick an observability, then select users for each role — assignments appear on the right.</p>
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
                <div className="xd-am-table" ref={msRef}>
                  <div className="xd-am-trow xd-am-thead">
                    <span>Role</span>
                    <span>Users</span>
                  </div>
                  {ROLE_OPTIONS.map((role) => {
                    const open = openRole === role.value;
                    const count = roleCount(activeOp, role.value);
                    return (
                      <div className="xd-am-trow" key={role.value}>
                        <span className="xd-am-trole-label"><FiShield /> {role.label}</span>
                        <div className="xd-ms">
                          <button type="button" className="xd-ms-btn"
                            onClick={() => setOpenRole(open ? null : role.value)}
                            aria-haspopup="listbox" aria-expanded={open}>
                            <span className="xd-ms-btn-label">
                              {count ? `${count} selected` : 'Select users…'}
                            </span>
                            <FiChevronDown className={`xd-ms-caret ${open ? 'open' : ''}`} />
                          </button>
                          {open && (
                            <div className="xd-ms-menu" role="listbox" aria-multiselectable="true">
                              {memberOptions.map((m) => {
                                const on = isOn(activeOp, m.name) && roleOf(m.name) === role.value;
                                const otherRole = isOn(activeOp, m.name) && roleOf(m.name) !== role.value;
                                return (
                                  <label key={m.id} className={`xd-ms-opt ${on ? 'on' : ''}`}
                                    role="option" aria-selected={on}>
                                    <input type="checkbox" checked={on}
                                      onChange={() => pickRole(activeOp, m.name, role.value)} />
                                    <span className="xd-am-ava">{m.name.charAt(0).toUpperCase()}</span>
                                    <span className="xd-ms-opt-name">
                                      {m.name}{m.you ? ' (you)' : ''}
                                      {otherRole && <span className="xd-am-othertag">already {roleOf(m.name)}</span>}
                                    </span>
                                    {on && <FiCheck className="xd-ms-opt-check" />}
                                  </label>
                                );
                              })}
                            </div>
                          )}
                        </div>
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
              {error && <div className="xd-form-error">{error}</div>}
              <div className="xd-assign-bar-actions">
                <button type="button" className="xd-btn-ghost" onClick={() => navigate('/dashboard/projects')} disabled={saving}>
                  Skip for now
                </button>
                <button type="button" className="xd-btn" onClick={save} disabled={saving}>
                  <FiCheckCircle /> {saving ? 'Saving…' : 'Save Assignments'}
                </button>
              </div>
            </div>
          </>
        )}
      </main>
    </>
  );
}
