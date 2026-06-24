import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiCheck, FiCheckCircle, FiChevronDown, FiX, FiUsers, FiShield, FiFolder, FiEye, FiPlus } from 'react-icons/fi';
import { PageHeader, Spinner } from './_parts';
import { listUsers } from '../../api/users';
import { getProject } from '../../api/projects';
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

// ── Custom-role access model ──────────────────────────────────────────
// A custom role grants a per-module access level. Modules an admin can
// scope; levels go from no access up to full management.
const ACCESS_MODULES = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'connections', label: 'Connections' },
  { key: 'alerts', label: 'Alerts' },
  { key: 'billing', label: 'Billing' },
  { key: 'members', label: 'Members' },
  { key: 'reports', label: 'Reports' },
];
const ACCESS_LEVELS = [
  { value: 'none', label: 'None' },
  { value: 'view', label: 'View' },
  { value: 'manage', label: 'Manage' },
];
const emptyAccess = () => Object.fromEntries(ACCESS_MODULES.map((m) => [m.key, 'none']));

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

/** Small summary of the modules a custom role can access. */
function RoleAccessTags({ access }) {
  const granted = ACCESS_MODULES.filter((m) => access?.[m.key] && access[m.key] !== 'none');
  if (granted.length === 0) return <span className="xd-am-access-none">no access</span>;
  return (
    <span className="xd-am-access-tags">
      {granted.map((m) => (
        <span key={m.key} className={`xd-am-access-tag ${access[m.key]}`}>
          {m.label} · {access[m.key]}
        </span>
      ))}
    </span>
  );
}

/** Side panel to add a custom role with per-module access (checkboxes). */
function AddRoleForm({ onAdd }) {
  const [name, setName] = useState('');
  const [access, setAccess] = useState(emptyAccess);

  const reset = () => { setName(''); setAccess(emptyAccess()); };
  // Checking a level sets it; checking the active level again clears to none.
  const setLevel = (key, level) =>
    setAccess((a) => ({ ...a, [key]: a[key] === level ? 'none' : level }));
  const submit = () => {
    const label = name.trim();
    if (!label) return;
    onAdd({ value: label.replace(/\s+/g, '_'), label, access: { ...access }, custom: true });
    reset();
  };

  const hasAccess = ACCESS_MODULES.some((m) => access[m.key] !== 'none');

  return (
    <div className="xd-am-addrole">
      <div className="xd-am-addrole-head">
        <span className="xd-am-addrole-ico"><FiPlus /></span>
        <span className="xd-am-addrole-htext">
          <span className="xd-am-addrole-title">Add Role</span>
          <span className="xd-am-addrole-sub">Name it and pick its access</span>
        </span>
      </div>
      <div className="xd-am-addrole-body">
        <label className="xd-conn-label">Role name</label>
        <input
          className="xd-conn-input"
          placeholder="e.g. Cost Reviewer"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
        />
        <label className="xd-conn-label">Access — what this role can do</label>
        <div className="xd-am-access-list">
          {ACCESS_MODULES.map((m) => (
            <div className="xd-am-access-cell" key={m.key}>
              <span className="xd-am-access-mod">{m.label}</span>
              <div className="xd-am-access-checks">
                {ACCESS_LEVELS.filter((l) => l.value !== 'none').map((l) => (
                  <label className={`xd-am-check ${l.value}`} key={l.value}>
                    <input
                      type="checkbox"
                      checked={access[m.key] === l.value}
                      onChange={() => setLevel(m.key, l.value)}
                    />
                    {l.label}
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="xd-am-addrole-actions">
          <button type="button" className="xd-btn xd-btn-sm" onClick={submit} disabled={!name.trim()}>
            <FiPlus /> Add Role
          </button>
        </div>
        {name.trim() && !hasAccess && (
          <p className="xd-am-addrole-hint">No access selected — this role will see nothing.</p>
        )}
      </div>
    </div>
  );
}

/** A role → users table (left) beside the Add Role form (right). */
function RoleAssigner({ roles, list, setList, userOptions, onAddRole, onRemoveRole }) {
  const isOn = (userId, role) => list.some((u) => u.userId === userId && u.role === role);
  const roleOf = (userId) => list.find((u) => u.userId === userId)?.role;
  const count = (role) => list.filter((u) => u.role === role).length;

  return (
    <div className="xd-am-rolewrap">
      <div className="xd-am-table">
        <div className="xd-am-trow xd-am-thead"><span>Role</span><span>Users</span></div>
        {roles.map((role) => (
          <div className="xd-am-trow" key={role.value}>
            <span className="xd-am-trole-label">
              <FiShield /> {role.label}
              {role.custom && onRemoveRole && (
                <button type="button" className="xd-am-roledel" title="Remove role"
                  onClick={() => onRemoveRole(role)}><FiX /></button>
              )}
              {role.access && <RoleAccessTags access={role.access} />}
            </span>
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
      {onAddRole && (
        <div className="xd-am-roleform-col">
          <AddRoleForm onAdd={onAddRole} />
        </div>
      )}
    </div>
  );
}

/**
 * Assign members to a project at two scopes (stacked sections):
 *   1. Project       — users across the whole project (project roles)
 *   2. Observability — users per observability (op roles)
 * Both scopes support custom roles with per-module access. Assignments
 * are kept in local UI state and persisted to the project membership
 * overlay on save (backend wiring for the new scopes is TBD).
 */
export default function AssignMembersPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const me = tokenStore.getUser() || {};
  const myId = me.id || me.user_id || me.uuid || 'me';

  const [project, setProject] = useState(null);
  const [notFound, setNotFound] = useState(false);

  const [users, setUsers] = useState([]);
  const [source, setSource] = useState('api');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Scope 1 — project-level: members + the roles they can take.
  const [projectMembers, setProjectMembers] = useState([]); // [{ userId, userName, role }]
  const [projectRoles, setProjectRoles] = useState(PROJECT_ROLES);
  // Scope 2 — observability-level, keyed by op code.
  const [obsMembers, setObsMembers] = useState({});   // { [opCode]: [{ userId, userName, role }] }
  const [obsRolesMap, setObsRolesMap] = useState({}); // { [opCode]: [extra custom roles] }

  const [obsOp, setObsOp] = useState(''); // selected op for the Observability section

  const obs = project?.observabilities || [];
  const opName = (code) => obs.find((o) => o.code === code)?.name || code;

  useEffect(() => {
    let alive = true;
    setLoading(true);
    Promise.all([
      getProject(projectId),
      listUsers().catch(() => ({ items: [] })),
    ]).then(([proj, usersRes]) => {
      if (!alive) return;
      setProject(proj);
      setObsOp(proj?.observabilities?.[0]?.code || '');
      setUsers(usersRes.items);
      setSource('api');
      setLoading(false);
    }).catch(() => {
      if (!alive) return;
      setNotFound(true);
      setLoading(false);
    });
    return () => { alive = false; };
  }, [projectId]);

  const userOptions = useMemo(
    () => users.map((u, i) => ({ id: u.id ?? `u${i}`, name: userName(u), you: (u.id ?? `u${i}`) === myId })),
    [users, myId],
  );

  // ── Project scope role management ──
  const addProjectRole = (role) => setProjectRoles((r) => [...r, role]);
  const removeProjectRole = (role) => {
    setProjectRoles((r) => r.filter((x) => x.value !== role.value));
    setProjectMembers((m) => m.filter((u) => u.role !== role.value));
  };

  // ── Observability scope helpers (operate on the selected op) ──
  const obsList = obsMembers[obsOp] || [];
  const setObsList = (updater) => setObsMembers((prev) => {
    const cur = prev[obsOp] || [];
    const next = typeof updater === 'function' ? updater(cur) : updater;
    return { ...prev, [obsOp]: next };
  });
  const obsRoles = useMemo(
    () => [...opRoles(opName(obsOp)), ...(obsRolesMap[obsOp] || [])],
    [obsOp, obsRolesMap, obs], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const addObsRole = (role) =>
    setObsRolesMap((m) => ({ ...m, [obsOp]: [...(m[obsOp] || []), role] }));
  const removeObsRole = (role) => {
    setObsRolesMap((m) => ({ ...m, [obsOp]: (m[obsOp] || []).filter((x) => x.value !== role.value) }));
    setObsList((prev) => prev.filter((u) => u.role !== role.value));
  };

  const save = async () => {
    setSaving(true);
    setError('');
    try {
      // Build the membership overlay (op -> [names], name -> role) from
      // both scopes. Project-scope members live under a 'PROJECT' bucket.
      const ovA = {}; const ovR = {};
      const collect = (op, list) => {
        ovA[op] = ovA[op] || [];
        (list || []).forEach((u) => {
          if (!ovA[op].includes(u.userName)) ovA[op].push(u.userName);
          ovR[u.userName] = u.role;
        });
      };
      collect('PROJECT', projectMembers);
      Object.entries(obsMembers).forEach(([op, list]) => collect(op, list));
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
        <PageHeader crumbs={[{ label: 'Manage Project', to: '/dashboard/projects' }, { label: 'Manage Users' }]} />
        <main className="xd-main">
          <div className="xd-empty">
            <p>Project not found.</p>
            <button className="xd-btn xd-btn-sm" onClick={() => navigate('/dashboard/projects')}>Back to projects</button>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <PageHeader
        crumbs={[
          { label: 'Manage Project', to: '/dashboard/projects' },
          ...(project ? [{ label: project.name, to: `/dashboard/projects/${project.id}` }] : []),
          { label: 'Manage Users' },
        ]}
        source={source}
      />
      <main className="xd-main xd-am-main">
        <div className="xd-pagelead">
          <h1>Manage Users</h1>
          <p>Assign users across the whole project or a single observability. Add custom roles and choose what each role can access.</p>
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
              <RoleAssigner
                roles={projectRoles}
                list={projectMembers}
                setList={setProjectMembers}
                userOptions={userOptions}
                onAddRole={addProjectRole}
                onRemoveRole={removeProjectRole}
              />
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
              <RoleAssigner
                roles={obsRoles}
                list={obsList}
                setList={setObsList}
                userOptions={userOptions}
                onAddRole={addObsRole}
                onRemoveRole={removeObsRole}
              />
              <div className="xd-am-summary">
                <MemberPills list={obsList} onRemove={(id) => setObsList((p) => p.filter((u) => u.userId !== id))} />
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
