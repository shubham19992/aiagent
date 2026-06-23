import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiCheck, FiCheckCircle, FiChevronDown, FiX, FiUsers, FiShield, FiLink, FiFolder, FiEye } from 'react-icons/fi';
import { PageHeader, Spinner } from './_parts';
import { listUsers } from '../../api/users';
import { getProject } from '../../api/projects';
import { listCredentials } from '../../api/credentials';
import { getMembers, saveMembers } from '../../api/members';
import { setMembership } from '../../store/projectsStore';
import { tokenStore } from '../../api/client';

// Short two-letter badge from an op name (AIOps -> "AI").
const opBadge = (name) => name.replace(/Ops$/i, '').slice(0, 2).toUpperCase();

// Display name from whatever fields the users API returns.
const userName = (u) =>
  u.name || u.full_name || u.fullName || u.username || u.email || String(u.id ?? '');

// Project-level roles (apply across the whole project).
const PROJECT_ROLES = [
  { value: 'Project_Admin', label: 'Project Admin' },
  { value: 'Project_Member', label: 'Project Member' },
  { value: 'Project_Observe', label: 'Project Observe' },
];

// Human label for any role value (e.g. InfraOps_Observe_Cost -> "InfraOps Observe Cost").
const prettyRole = (value) => String(value || '').replace(/_/g, ' ');
const isAdminRole = (value) => /(_|^)admin$/i.test(String(value || ''));

// Observability-level roles, templated per op (e.g. InfraOps_Admin).
const opRoles = (opName) => [
  { value: `${opName}_Admin`, label: `${opName} Admin` },
  { value: `${opName}_Observe`, label: `${opName} Observe` },
  { value: `${opName}_Member`, label: `${opName} Member` },
  { value: `${opName}_Observe_Basic`, label: `${opName} Observe · Basic` },
  { value: `${opName}_Observe_Cost`, label: `${opName} Observe · Cost` },
];

// Toggle a user under a role within a flat [{userId,userName,role}] list.
// Same role again removes; a different role switches the user over.
const togglePick = (list, user, role) => {
  const next = [...list];
  const idx = next.findIndex((u) => u.userId === user.id);
  if (idx >= 0) {
    if (next[idx].role === role) next.splice(idx, 1);
    else next[idx] = { ...next[idx], role };
  } else {
    next.push({ userId: user.id, userName: user.name, role });
  }
  return next;
};

/** Self-contained user multi-select dropdown (closes on outside click / Esc). */
function UserMultiSelect({ placeholder = 'Select users…', userOptions, isSelected, onToggle, count, tagFor }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="xd-ms" ref={ref}>
      <button type="button" className="xd-ms-btn" onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox" aria-expanded={open}>
        <span className="xd-ms-btn-label">{count ? `${count} selected` : placeholder}</span>
        <FiChevronDown className={`xd-ms-caret ${open ? 'open' : ''}`} />
      </button>
      {open && (
        <div className="xd-ms-menu" role="listbox" aria-multiselectable="true">
          {userOptions.length === 0 && <div className="xd-ms-empty xd-muted">No users</div>}
          {userOptions.map((m) => {
            const on = isSelected(m.id);
            return (
              <label key={m.id} className={`xd-ms-opt ${on ? 'on' : ''}`} role="option" aria-selected={on}>
                <input type="checkbox" checked={on} onChange={() => onToggle(m)} />
                <span className="xd-am-ava">{m.name.charAt(0).toUpperCase()}</span>
                <span className="xd-ms-opt-name">
                  {m.name}{m.you ? ' (you)' : ''}
                  {tagFor && tagFor(m)}
                </span>
                {on && <FiCheck className="xd-ms-opt-check" />}
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** Pills of assigned members with a remove button. */
function MemberPills({ list, onRemove, empty = 'No members assigned yet' }) {
  if (!list || list.length === 0) {
    return <span className="xd-muted xd-am-none"><FiUsers /> {empty}</span>;
  }
  return (
    <div className="xd-am-pills">
      {list.map((u) => (
        <span className="xd-member-pill" key={u.userId}>
          <span className="xd-member-ava">{(u.userName || '?').charAt(0).toUpperCase()}</span>{u.userName}
          <span className={`xd-am-roletag ${isAdminRole(u.role) ? 'admin' : ''}`}>{prettyRole(u.role)}</span>
          <button type="button" className="xd-am-remove" title="Remove" onClick={() => onRemove(u.userId)}><FiX /></button>
        </span>
      ))}
    </div>
  );
}

/** A role → users table (one multi-select per role). Used by Project + Observability. */
function RoleAssigner({ roles, list, setList, userOptions }) {
  const isOn = (userId, role) => list.some((u) => u.userId === userId && u.role === role);
  const roleOf = (userId) => list.find((u) => u.userId === userId)?.role;
  const count = (role) => list.filter((u) => u.role === role).length;

  return (
    <div className="xd-am-table">
      <div className="xd-am-trow xd-am-thead"><span>Role</span><span>Users</span></div>
      {roles.map((role) => (
        <div className="xd-am-trow" key={role.value}>
          <span className="xd-am-trole-label"><FiShield /> {role.label}</span>
          <UserMultiSelect
            userOptions={userOptions}
            count={count(role.value)}
            isSelected={(id) => isOn(id, role.value)}
            onToggle={(user) => setList((prev) => togglePick(prev, user, role.value))}
            tagFor={(m) => {
              const r = roleOf(m.id);
              return r && r !== role.value
                ? <span className="xd-am-othertag">already {prettyRole(r)}</span>
                : null;
            }}
          />
        </div>
      ))}
    </div>
  );
}

/**
 * Assign members to a project at three scopes (stacked sections):
 *   1. Project   — users across the whole project (project roles)
 *   2. Observability — users per observability (op roles)
 *   3. Connection — simple user list per connection (saved to backend)
 * NOTE: only the Connection scope is persisted right now; Project and
 * Observability assignments are local UI state (save wiring TBD).
 */
export default function AssignMembersPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const me = tokenStore.getUser() || {};
  const myId = me.id || me.user_id || me.uuid || 'me';

  const [project, setProject] = useState(null);
  const [notFound, setNotFound] = useState(false);

  const [creds, setCreds] = useState([]);
  const [users, setUsers] = useState([]);
  const [source, setSource] = useState('api');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Scope 1 — project-level (local only): [{ userId, userName, role }]
  const [projectMembers, setProjectMembers] = useState([]);
  // Scope 2 — observability-level (local only): { [opCode]: [{ userId, userName, role }] }
  const [obsMembers, setObsMembers] = useState({});
  // Scope 3 — connection-level (saved): { [credId]: { [opCode]: [{ userId, userName, role }] } }
  const [assignments, setAssignments] = useState({});

  const [obsOp, setObsOp] = useState('');           // selected op for the Observability section
  const [activeOp, setActiveOp] = useState('');     // selected op for the Connection section
  const [activeCred, setActiveCred] = useState(''); // selected connection id

  const obs = project?.observabilities || [];
  const credById = useMemo(() => Object.fromEntries(creds.map((c) => [c.id, c])), [creds]);
  const credsForOp = useMemo(() => creds.filter((c) => c.op_code === activeOp), [creds, activeOp]);
  const opName = (code) => obs.find((o) => o.code === code)?.name || code;

  useEffect(() => {
    let alive = true;
    setLoading(true);
    Promise.all([
      getProject(projectId),
      listCredentials().catch(() => []),
      listUsers().catch(() => ({ items: [] })),
      getMembers(projectId).catch(() => ({})),
    ]).then(([proj, credItems, usersRes, existing]) => {
      if (!alive) return;
      setProject(proj);
      setCreds(credItems);
      const firstOp = proj?.observabilities?.[0]?.code || '';
      setObsOp(firstOp);
      setActiveOp(firstOp);
      setUsers(usersRes.items);
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

  const userOptions = useMemo(
    () => users.map((u, i) => ({ id: u.id ?? `u${i}`, name: userName(u), you: (u.id ?? `u${i}`) === myId })),
    [users, myId],
  );

  // ── Observability scope helpers (operate on the selected op's list) ──
  const obsList = obsMembers[obsOp] || [];
  const setObsList = (updater) => setObsMembers((prev) => {
    const cur = prev[obsOp] || [];
    const next = typeof updater === 'function' ? updater(cur) : updater;
    return { ...prev, [obsOp]: next };
  });

  // ── Connection scope (simple list per connection + op) ──
  const credList = (activeCred && activeOp && assignments[activeCred]?.[activeOp]) || [];
  const isCredUserOn = (userId) => credList.some((u) => u.userId === userId);
  const toggleCredUser = (user) => {
    if (!activeCred || !activeOp) return;
    setAssignments((prev) => {
      const credMap = { ...(prev[activeCred] || {}) };
      const list = [...(credMap[activeOp] || [])];
      const idx = list.findIndex((u) => u.userId === user.id);
      if (idx >= 0) list.splice(idx, 1);
      else list.push({ userId: user.id, userName: user.name, role: 'Project_Member' });
      credMap[activeOp] = list;
      return { ...prev, [activeCred]: credMap };
    });
    setError('');
  };
  const removeCredUser = (userId) => setAssignments((prev) => {
    const credMap = { ...(prev[activeCred] || {}) };
    credMap[activeOp] = (credMap[activeOp] || []).filter((u) => u.userId !== userId);
    return { ...prev, [activeCred]: credMap };
  });

  const save = async () => {
    setSaving(true);
    setError('');
    try {
      await saveMembers(projectId, assignments);
      const ovA = {}; const ovR = {};
      Object.values(assignments).forEach((opMap) => {
        Object.entries(opMap || {}).forEach(([op, list]) => {
          ovA[op] = ovA[op] || [];
          list.forEach((u) => {
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
          <p>Assign users at three scopes: the whole project, a single observability, or a specific connection.</p>
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
            {/* ── Scope 1: Project-level members ── */}
            <div className="xd-card xd-am-card">
              <div className="xd-am-head"><FiFolder /><h3>Project members</h3>
                <span className="xd-am-scope-hint">Assigned across the whole project</span>
              </div>
              <RoleAssigner roles={PROJECT_ROLES} list={projectMembers} setList={setProjectMembers} userOptions={userOptions} />
              <div className="xd-am-summary">
                <MemberPills list={projectMembers} onRemove={(id) => setProjectMembers((p) => p.filter((u) => u.userId !== id))} />
              </div>
            </div>

            {/* ── Scope 2: Observability-level members ── */}
            <div className="xd-card xd-am-card">
              <div className="xd-am-head"><FiEye /><h3>Observability members</h3>
                <span className="xd-am-scope-hint">Assigned per observability</span>
              </div>
              <label className="xd-conn-label">Observability</label>
              <div className="xd-am-ops">
                {obs.map((o) => {
                  const c = (obsMembers[o.code] || []).length;
                  return (
                    <button key={o.code} type="button"
                      className={`xd-am-op ${obsOp === o.code ? 'on' : ''}`}
                      onClick={() => setObsOp(o.code)}>
                      {o.name}{c > 0 && <span className="xd-am-op-count">{c}</span>}
                    </button>
                  );
                })}
              </div>
              <label className="xd-conn-label">Members for {opName(obsOp)}</label>
              <RoleAssigner roles={opRoles(opName(obsOp))} list={obsList} setList={setObsList} userOptions={userOptions} />
              <div className="xd-am-summary">
                <MemberPills list={obsList} onRemove={(id) => setObsList((p) => p.filter((u) => u.userId !== id))} />
              </div>
            </div>

            {/* ── Scope 3: Connection-level members (saved) ── */}
            <div className="xd-card xd-am-card">
              <div className="xd-am-head"><FiLink /><h3>Connection members</h3>
                <span className="xd-am-scope-hint">Simple user list per connection · saved</span>
              </div>
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
                    const count = ((assignments[c.id]?.[activeOp]) || []).length;
                    return (
                      <button key={c.id} type="button"
                        className={`xd-am-op ${activeCred === c.id ? 'on' : ''}`}
                        onClick={() => setActiveCred(c.id)}>
                        {c.name}{count > 0 && <span className="xd-am-op-count">{count}</span>}
                      </button>
                    );
                  })}
                </div>
              )}

              {activeCredObj && (
                <>
                  <label className="xd-conn-label">
                    Users for {activeCredObj.name}
                    <span className="xd-am-opcode"> · {opName(activeOp)}</span>
                  </label>
                  <UserMultiSelect
                    userOptions={userOptions}
                    count={credList.length}
                    isSelected={isCredUserOn}
                    onToggle={toggleCredUser}
                  />
                  <div className="xd-am-summary">
                    <MemberPills list={credList} onRemove={removeCredUser} empty="No users on this connection yet" />
                  </div>
                </>
              )}
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
