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

// Project-level roles a member can hold (API role codes).
const ROLE_OPTIONS = [
  { value: 'project_admin', label: 'Project Admin' },
  { value: 'project_member', label: 'Project Member' },
];

/**
 * Assign members to a project. Assignments are organised by the connection
 * (Create Connect credential) first, then per role under it:
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

  const [creds, setCreds] = useState([]);          // credentials relevant to this project
  const [adminUsers, setAdminUsers] = useState([]); // assignable as project_admin
  const [memberUsers, setMemberUsers] = useState([]); // assignable as project_member
  const [source, setSource] = useState('api');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // { [credId]: { [opCode]: [{ userId, userName, role }] } }
  const [assignments, setAssignments] = useState({});
  const [activeCred, setActiveCred] = useState('');
  const [openRole, setOpenRole] = useState(null); // null | role value
  const msRef = useRef(null);

  const credById = useMemo(() => Object.fromEntries(creds.map((c) => [c.id, c])), [creds]);

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
      const opCodes = new Set((proj?.observabilities || []).map((o) => o.code));
      const projectCreds = credItems.filter((c) => opCodes.has(c.op_code));
      setCreds(projectCreds);
      setActiveCred(projectCreds[0]?.id || '');
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

  const withYou = (list) => list.map((u) => ({ ...u, you: u.id === myId }));
  const optionsFor = (role) => withYou(role === 'project_admin' ? adminUsers : memberUsers);

  // Users assigned under a credential (its op_code is the nesting key).
  const listFor = (credId) => {
    const op = credById[credId]?.op_code;
    return (op && assignments[credId]?.[op]) || [];
  };
  const roleOfUser = (credId, userId) => listFor(credId).find((u) => u.userId === userId)?.role;
  const isOn = (credId, userId, role) => listFor(credId).some((u) => u.userId === userId && u.role === role);
  const isAssigned = (credId, userId) => listFor(credId).some((u) => u.userId === userId);
  const roleCount = (credId, role) => listFor(credId).filter((u) => u.role === role).length;

  // Toggle a user under a role for the active credential. Picking the same
  // role again removes them; the other role switches them over.
  const pickRole = (credId, user, role) => {
    const cred = credById[credId];
    if (!cred) return;
    const op = cred.op_code;
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

  const removeUser = (credId, userId) => {
    const op = credById[credId]?.op_code;
    if (!op) return;
    setAssignments((prev) => {
      const credMap = { ...(prev[credId] || {}) };
      credMap[op] = (credMap[op] || []).filter((u) => u.userId !== userId);
      return { ...prev, [credId]: credMap };
    });
  };

  const save = async () => {
    setSaving(true);
    setError('');
    try {
      await saveMembers(projectId, assignments);
      // Mirror to the local overlay so list/overview avatars stay in sync.
      const ovA = {}; const ovR = {};
      Object.values(assignments).forEach((opMap) => {
        Object.entries(opMap).forEach(([op, users]) => {
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
          <p>Pick a connection, then assign Project Admins and Project Members for it.</p>
        </div>

        {loading ? (
          <Spinner label="Loading members…" />
        ) : creds.length === 0 ? (
          <div className="xd-empty">
            <FiLink />
            <p>No connections yet. Create a connection (Create Connect) for this project's observabilities first.</p>
            <button className="xd-btn xd-btn-sm" onClick={() => navigate('/dashboard/projects')}>Back to projects</button>
          </div>
        ) : (
          <>
            <div className="xd-card xd-am-card">
            <div className="xd-am-2col">
              {/* ── Left: select members (form) ── */}
              <div className="xd-am-panel">
                <div className="xd-am-head"><FiUserPlus /><h3>Select members</h3></div>

                <label className="xd-conn-label">Connection</label>
                <div className="xd-am-ops">
                  {creds.map((c) => {
                    const count = listFor(c.id).length;
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

                <label className="xd-conn-label">
                  Members for {activeCredObj?.name || '—'}
                  {activeCredObj?.op_code && <span className="xd-am-opcode"> · {activeCredObj.op_code}</span>}
                </label>
                <div className="xd-am-table" ref={msRef}>
                  <div className="xd-am-trow xd-am-thead">
                    <span>Role</span>
                    <span>Users</span>
                  </div>
                  {ROLE_OPTIONS.map((role) => {
                    const open = openRole === role.value;
                    const count = roleCount(activeCred, role.value);
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
                                const on = isOn(activeCred, m.id, role.value);
                                const otherRole = isAssigned(activeCred, m.id) && roleOfUser(activeCred, m.id) !== role.value;
                                return (
                                  <label key={m.id} className={`xd-ms-opt ${on ? 'on' : ''}`}
                                    role="option" aria-selected={on}>
                                    <input type="checkbox" checked={on}
                                      onChange={() => pickRole(activeCred, m, role.value)} />
                                    <span className="xd-am-ava">{m.name.charAt(0).toUpperCase()}</span>
                                    <span className="xd-ms-opt-name">
                                      {m.name}{m.you ? ' (you)' : ''}
                                      {otherRole && <span className="xd-am-othertag">already {roleOfUser(activeCred, m.id) === 'project_admin' ? 'admin' : 'member'}</span>}
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
                  {creds.map((c) => {
                    const picked = listFor(c.id);
                    return (
                      <div className="xd-am-srow" key={c.id}>
                        <div className="xd-am-shead">
                          <span className="xd-am-badge"><FiLink /></span>
                          <span className="xd-am-sname">{c.name}</span>
                        </div>
                        {picked.length === 0 ? (
                          <span className="xd-muted xd-am-none"><FiUsers /> No members yet</span>
                        ) : (
                          <div className="xd-am-pills">
                            {picked.map((u) => (
                              <span className="xd-member-pill" key={u.userId}>
                                <span className="xd-member-ava">{(u.userName || '?').charAt(0).toUpperCase()}</span>{u.userName}
                                <span className={`xd-am-roletag ${u.role === 'project_admin' ? 'admin' : ''}`}>
                                  {u.role === 'project_admin' ? 'Admin' : 'Member'}
                                </span>
                                <button type="button" className="xd-am-remove" title="Remove"
                                  onClick={() => removeUser(c.id, u.userId)}><FiX /></button>
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
