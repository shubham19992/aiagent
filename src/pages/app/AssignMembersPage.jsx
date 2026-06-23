import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiCheck, FiCheckCircle, FiChevronDown, FiX, FiUsers, FiUserPlus, FiShield, FiLink } from 'react-icons/fi';
import { PageHeader, Spinner } from './_parts';
import { listAssignableUsers } from '../../api/authz';
import { getProject } from '../../api/projects';
import { listCredentials } from '../../api/credentials';
import { getMembers, saveMembers } from '../../api/members';
import { setMembership } from '../../store/projectsStore';
import { tokenStore } from '../../api/client';

// Short two-letter badge from an op name (AIOps -> "AI").
const opBadge = (name) => name.replace(/Ops$/i, '').slice(0, 2).toUpperCase();

// Project-level roles a member can hold (API role codes).
const ROLE_OPTIONS = [
  { value: 'project_admin', label: 'Project Admin' },
];

/**
 * Assign members to a project. Flow: pick an observability the project
 * watches, then pick a connection (Create Connect credential) for that op,
 * then assign Project Admins / Members. Stored / sent as:
 *   { [credentialId]: { [opCode]: [{ userId, userName, role }] } }
 * Existing assignments are prefilled from the members GET API.
 */
export default function AssignMembersPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const me = tokenStore.getUser() || {};
  const myId = me.id || me.user_id || me.uuid || 'me';

  const [project, setProject] = useState(null);
  const [notFound, setNotFound] = useState(false);

  const [creds, setCreds] = useState([]);           // all credentials
  const [adminUsers, setAdminUsers] = useState([]); // assignable as project_admin
  const [memberUsers, setMemberUsers] = useState([]); // assignable as project_member
  const [source, setSource] = useState('api');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // { [credId]: { [opCode]: [{ userId, userName, role }] } }
  const [assignments, setAssignments] = useState({});
  const [activeOp, setActiveOp] = useState('');     // selected observability code
  const [activeCred, setActiveCred] = useState(''); // selected connection id
  const [openRole, setOpenRole] = useState(null);    // null | role value
  const msRef = useRef(null);

  const obs = project?.observabilities || [];
  const credById = useMemo(() => Object.fromEntries(creds.map((c) => [c.id, c])), [creds]);
  const credsForOp = useMemo(() => creds.filter((c) => c.op_code === activeOp), [creds, activeOp]);
  const opName = (code) => obs.find((o) => o.code === code)?.name || code;

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
    Promise.all([
      getProject(projectId),
      listCredentials().catch(() => []),
      listAssignableUsers('project_admin').catch(() => ({ items: [] })),
      listAssignableUsers('project_member').catch(() => ({ items: [] })),
      getMembers(projectId).catch(() => ({})),
    ]).then(([proj, credItems, adminRes, memberRes, existing]) => {
      if (!alive) return;
      setProject(proj);
      setCreds(credItems);
      setActiveOp(proj?.observabilities?.[0]?.code || '');
      setAdminUsers(adminRes.items);
      setMemberUsers(memberRes.items);
      setAssignments(existing && typeof existing === 'object' ? existing : {});
      setSource('api');
      setLoading(false);
    }).catch(() => {
      if (!alive) return;
      setNotFound(true);
      setLoading(false);
    });
    return () => { alive = false; };
  }, [projectId]);

  // Keep the selected connection valid for the chosen observability.
  useEffect(() => {
    if (!credsForOp.some((c) => c.id === activeCred)) {
      setActiveCred(credsForOp[0]?.id || '');
    }
  }, [activeOp, creds]); // eslint-disable-line react-hooks/exhaustive-deps

  const withYou = (list) => list.map((u) => ({ ...u, you: u.id === myId }));
  const optionsFor = (role) => withYou(role === 'project_admin' ? adminUsers : memberUsers);

  const listFor = (credId, op) => (credId && op && assignments[credId]?.[op]) || [];
  const roleOfUser = (credId, op, userId) => listFor(credId, op).find((u) => u.userId === userId)?.role;
  const isOn = (credId, op, userId, role) => listFor(credId, op).some((u) => u.userId === userId && u.role === role);
  const isAssigned = (credId, op, userId) => listFor(credId, op).some((u) => u.userId === userId);
  const roleCount = (credId, op, role) => listFor(credId, op).filter((u) => u.role === role).length;

  // Toggle a user under a role for the active connection + op. Picking the
  // same role again removes them; the other role switches them over.
  const pickRole = (credId, op, user, role) => {
    if (!credId || !op) return;
    setAssignments((prev) => {
      const credMap = { ...(prev[credId] || {}) };
      const list = [...(credMap[op] || [])];
      const idx = list.findIndex((u) => u.userId === user.id);
      if (idx >= 0) {
        if (list[idx].role === role) list.splice(idx, 1);
        else list[idx] = { ...list[idx], role };
      } else {
        list.push({ userId: user.id, userName: user.name, role });
      }
      credMap[op] = list;
      return { ...prev, [credId]: credMap };
    });
    setError('');
  };

  const removeUser = (credId, op, userId) => {
    setAssignments((prev) => {
      const credMap = { ...(prev[credId] || {}) };
      credMap[op] = (credMap[op] || []).filter((u) => u.userId !== userId);
      return { ...prev, [credId]: credMap };
    });
  };

  // Flatten assignments for the summary panel (only non-empty groups).
  const summaryRows = useMemo(() => {
    const rows = [];
    Object.entries(assignments).forEach(([credId, opMap]) => {
      Object.entries(opMap || {}).forEach(([op, users]) => {
        if (users && users.length) rows.push({ credId, op, users });
      });
    });
    return rows;
  }, [assignments]);

  const save = async () => {
    setSaving(true);
    setError('');
    try {
      await saveMembers(projectId, assignments);
      // Mirror to the local overlay so list/overview avatars stay in sync.
      const ovA = {}; const ovR = {};
      Object.values(assignments).forEach((opMap) => {
        Object.entries(opMap || {}).forEach(([op, users]) => {
          ovA[op] = ovA[op] || [];
          users.forEach((u) => {
            if (!ovA[op].includes(u.userName)) ovA[op].push(u.userName);
            ovR[u.userName] = u.role;
          });
        });
      });
      setMembership(projectId, { assignments: ovA, roles: ovR });
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

  const activeCredObj = credById[activeCred];

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
          <p>Pick an observability, then a connection for it, and assign Project Admins / Members.</p>
        </div>

        {loading ? (
          <Spinner label="Loading members…" />
        ) : obs.length === 0 ? (
          <div className="xd-empty">
            <p>This project has no observabilities selected.</p>
            <button className="xd-btn xd-btn-sm" onClick={() => navigate('/dashboard/projects')}>Back to projects</button>
          </div>
        ) : (
          <>
            <div className="xd-card xd-am-card">
            <div className="xd-am-2col">
              {/* ── Left: select members (form) ── */}
              <div className="xd-am-panel">
                <div className="xd-am-head"><FiUserPlus /><h3>Select members</h3></div>

                <label className="xd-conn-label">Observability</label>
                <div className="xd-am-ops">
                  {obs.map((o) => (
                    <button key={o.code} type="button"
                      className={`xd-am-op ${activeOp === o.code ? 'on' : ''}`}
                      onClick={() => setActiveOp(o.code)}>
                      {o.name}
                    </button>
                  ))}
                </div>

                <label className="xd-conn-label">Connection</label>
                {credsForOp.length === 0 ? (
                  <div className="xd-muted xd-am-none">
                    <FiLink /> No connection for {opName(activeOp)}. Create one via Create Connect first.
                  </div>
                ) : (
                  <div className="xd-am-ops">
                    {credsForOp.map((c) => {
                      const count = listFor(c.id, activeOp).length;
                      return (
                        <button key={c.id} type="button"
                          className={`xd-am-op ${activeCred === c.id ? 'on' : ''}`}
                          onClick={() => setActiveCred(c.id)}>
                          {c.name}
                          {count > 0 && <span className="xd-am-op-count">{count}</span>}
                        </button>
                      );
                    })}
                  </div>
                )}

                {activeCredObj && (
                  <>
                    <label className="xd-conn-label">
                      Members for {activeCredObj.name}
                      <span className="xd-am-opcode"> · {opName(activeOp)}</span>
                    </label>
                    <div className="xd-am-table" ref={msRef}>
                      <div className="xd-am-trow xd-am-thead">
                        <span>Role</span>
                        <span>Users</span>
                      </div>
                      {ROLE_OPTIONS.map((role) => {
                        const open = openRole === role.value;
                        const count = roleCount(activeCred, activeOp, role.value);
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
                                  {optionsFor(role.value).length === 0 && (
                                    <div className="xd-ms-empty xd-muted">No assignable users</div>
                                  )}
                                  {optionsFor(role.value).map((m) => {
                                    const on = isOn(activeCred, activeOp, m.id, role.value);
                                    const otherRole = isAssigned(activeCred, activeOp, m.id) && roleOfUser(activeCred, activeOp, m.id) !== role.value;
                                    return (
                                      <label key={m.id} className={`xd-ms-opt ${on ? 'on' : ''}`}
                                        role="option" aria-selected={on}>
                                        <input type="checkbox" checked={on}
                                          onChange={() => pickRole(activeCred, activeOp, m, role.value)} />
                                        <span className="xd-am-ava">{m.name.charAt(0).toUpperCase()}</span>
                                        <span className="xd-ms-opt-name">
                                          {m.name}{m.you ? ' (you)' : ''}
                                          {otherRole && <span className="xd-am-othertag">already {roleOfUser(activeCred, activeOp, m.id) === 'project_admin' ? 'admin' : 'member'}</span>}
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
                  </>
                )}
              </div>

              {/* ── Right: selected / assigned ── */}
              <div className="xd-am-panel">
                <div className="xd-am-head"><FiUsers /><h3>Assigned members</h3></div>

                <div className="xd-am-summary">
                  {summaryRows.length === 0 ? (
                    <span className="xd-muted xd-am-none"><FiUsers /> No members assigned yet</span>
                  ) : summaryRows.map(({ credId, op, users }) => (
                    <div className="xd-am-srow" key={`${credId}/${op}`}>
                      <div className="xd-am-shead">
                        <span className="xd-am-badge">{opBadge(opName(op))}</span>
                        <span className="xd-am-sname">{credById[credId]?.name || credId} · {opName(op)}</span>
                      </div>
                      <div className="xd-am-pills">
                        {users.map((u) => (
                          <span className="xd-member-pill" key={u.userId}>
                            <span className="xd-member-ava">{(u.userName || '?').charAt(0).toUpperCase()}</span>{u.userName}
                            <span className={`xd-am-roletag ${u.role === 'project_admin' ? 'admin' : ''}`}>
                              {u.role === 'project_admin' ? 'Admin' : 'Member'}
                            </span>
                            <button type="button" className="xd-am-remove" title="Remove"
                              onClick={() => removeUser(credId, op, u.userId)}><FiX /></button>
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
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
