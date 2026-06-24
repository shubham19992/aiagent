import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiCheck, FiCheckCircle, FiChevronDown, FiX, FiUsers, FiShield, FiFolder, FiEye, FiPlus } from 'react-icons/fi';
import { PageHeader, Spinner } from './_parts';
import { listUsers } from '../../api/users';
import { getProject } from '../../api/projects';
import {
  listRoles, listCustomRoles, listPermissions, createCustomRole,
  getRoleAssignments, saveRoleAssignments,
} from '../../api/rbac';
import { tokenStore } from '../../api/client';

// Display name from whatever fields the users API returns.
const userName = (u) =>
  u.name || u.full_name || u.fullName || u.username || u.email || String(u.id ?? '');

// Human label for a role value (e.g. infraops_observe_cost -> "infraops observe cost").
const prettyRole = (value) => String(value || '').replace(/_/g, ' ');
const isAdminRole = (value) => /(_|^)admin$/i.test(String(value || ''));

// Normalise a roles/custom-roles API element to the UI role shape.
const normRole = (r) => ({
  value: r.code,
  label: r.name || r.code,
  description: r.description || '',
  custom: !!r.is_custom,
});

// Split the role-assignments GET payload into the two flat UI lists.
function splitAssignments(data) {
  const pm = [];
  Object.entries(data?.project || {}).forEach(([role, users]) => {
    (users || []).forEach((u) => pm.push({ userId: u.userId, userName: u.userName, role }));
  });
  const om = {};
  Object.entries(data?.observability || {}).forEach(([opCode, roleMap]) => {
    om[opCode] = om[opCode] || [];
    Object.entries(roleMap || {}).forEach(([role, users]) => {
      (users || []).forEach((u) => om[opCode].push({ userId: u.userId, userName: u.userName, role }));
    });
  });
  return { pm, om };
}

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
function MemberPills({ list, onRemove, labelOf, empty = 'No members assigned yet' }) {
  if (!list || list.length === 0) {
    return <span className="xd-muted xd-am-none"><FiUsers /> {empty}</span>;
  }
  return (
    <div className="xd-am-pills">
      {list.map((u) => (
        <span className="xd-member-pill" key={u.userId}>
          <span className="xd-member-ava">{(u.userName || '?').charAt(0).toUpperCase()}</span>{u.userName}
          <span className={`xd-am-roletag ${isAdminRole(u.role) ? 'admin' : ''}`}>{labelOf(u.role)}</span>
          <button type="button" className="xd-am-remove" title="Remove" onClick={() => onRemove(u.userId)}><FiX /></button>
        </span>
      ))}
    </div>
  );
}

/** Side panel: name a custom role and pick its permissions (from the API). */
function AddRoleForm({ permissions, onCreate }) {
  const [name, setName] = useState('');
  const [picked, setPicked] = useState({});
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const toggle = (code) => setPicked((p) => ({ ...p, [code]: !p[code] }));
  const submit = async () => {
    const label = name.trim();
    if (!label) return;
    const codes = Object.keys(picked).filter((c) => picked[c]);
    setSaving(true); setErr('');
    try {
      await onCreate(label, codes);
      setName(''); setPicked({});
    } catch (e) {
      setErr(e?.message || 'Failed to create role.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="xd-am-addrole">
      <div className="xd-am-addrole-head">
        <span className="xd-am-addrole-ico"><FiPlus /></span>
        <span className="xd-am-addrole-htext">
          <span className="xd-am-addrole-title">Add Role</span>
          <span className="xd-am-addrole-sub">Name it and pick its permissions</span>
        </span>
      </div>
      <div className="xd-am-addrole-body">
        <label className="xd-conn-label">Role name</label>
        <input
          className="xd-conn-input"
          placeholder="e.g. Cost Reviewer"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <label className="xd-conn-label">Permissions — what this role can do</label>
        {permissions.length === 0 ? (
          <div className="xd-muted xd-am-noperm">No permissions available for this scope.</div>
        ) : (
          <div className="xd-am-perm-list">
            {permissions.map((p) => (
              <label className="xd-am-perm" key={p.code} title={p.description || ''}>
                <input type="checkbox" checked={!!picked[p.code]} onChange={() => toggle(p.code)} />
                <span className="xd-am-perm-text">
                  <span className="xd-am-perm-name">{p.name || p.code}</span>
                  {p.description && <span className="xd-am-perm-desc">{p.description}</span>}
                </span>
              </label>
            ))}
          </div>
        )}
        {err && <div className="xd-form-error xd-am-addrole-err">{err}</div>}
        <div className="xd-am-addrole-actions">
          <button type="button" className="xd-btn xd-btn-sm" onClick={submit} disabled={!name.trim() || saving}>
            {saving ? 'Creating…' : <><FiPlus /> Add Role</>}
          </button>
        </div>
      </div>
    </div>
  );
}

/** A role → users table (left) beside the Add Role form (right). */
function RoleAssigner({ roles, list, setList, userOptions, permissions, onCreateRole }) {
  const isOn = (userId, role) => list.some((u) => u.userId === userId && u.role === role);
  const roleOf = (userId) => list.find((u) => u.userId === userId)?.role;
  const count = (role) => list.filter((u) => u.role === role).length;
  const labelOf = (code) => roles.find((r) => r.value === code)?.label || prettyRole(code);

  return (
    <div className="xd-am-rolewrap">
      <div className="xd-am-table">
        <div className="xd-am-trow xd-am-thead"><span>Role</span><span>Users</span></div>
        {roles.length === 0 && (
          <div className="xd-am-trow"><span className="xd-muted">No roles</span><span /></div>
        )}
        {roles.map((role) => (
          <div className="xd-am-trow" key={role.value}>
            <span className="xd-am-trole-label" title={role.description || ''}>
              <FiShield /> {role.label}
              {role.custom && <span className="xd-am-customtag">custom</span>}
            </span>
            <UserMultiSelect
              userOptions={userOptions}
              count={count(role.value)}
              isSelected={(id) => isOn(id, role.value)}
              onToggle={(user) => setList((prev) => togglePick(prev, user, role.value))}
              tagFor={(m) => {
                const r = roleOf(m.id);
                return r && r !== role.value
                  ? <span className="xd-am-othertag">already {labelOf(r)}</span>
                  : null;
              }}
            />
          </div>
        ))}
      </div>
      {onCreateRole && (
        <div className="xd-am-roleform-col">
          <AddRoleForm permissions={permissions} onCreate={onCreateRole} />
        </div>
      )}
    </div>
  );
}

/**
 * Manage Users — assign users to a project at two scopes:
 *   1. Project       — project-level roles (project_admin, project_member …)
 *   2. Observability — per-op roles (infraops_admin …)
 * Roles and permissions are loaded from the RBAC API; custom roles are
 * created via the API; assignments are read/written through the
 * role-assignments service. Everything here is dynamic.
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

  // Scope 1 — project-level.
  const [projectMembers, setProjectMembers] = useState([]); // [{ userId, userName, role }]
  const [projectRoles, setProjectRoles] = useState([]);     // [{ value, label, custom }]
  const [projectPerms, setProjectPerms] = useState([]);     // [{ code, name, description }]
  // Scope 2 — observability-level, keyed by op code.
  const [obsMembers, setObsMembers] = useState({});   // { [opCode]: [{ userId, userName, role }] }
  const [obsRolesMap, setObsRolesMap] = useState({}); // { [opCode]: [roles] }
  const [obsPermsMap, setObsPermsMap] = useState({}); // { [opCode]: [permissions] }

  const [obsOp, setObsOp] = useState('');

  const obs = project?.observabilities || [];
  const opName = (code) => obs.find((o) => o.code === code)?.name || code;

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError('');
    (async () => {
      try {
        const proj = await getProject(projectId);
        if (!alive) return;
        const ops = proj?.observabilities || [];
        const [usersRes, pRoles, pCustoms, pPerms, assignmentsData, ...opData] = await Promise.all([
          listUsers().catch(() => ({ items: [] })),
          listRoles({ level: 'project' }).catch(() => []),
          listCustomRoles({ level: 'project', projectId }).catch(() => []),
          listPermissions({ level: 'project' }).catch(() => []),
          getRoleAssignments(projectId).catch(() => ({ project: {}, observability: {} })),
          ...ops.flatMap((op) => [
            listRoles({ level: 'ops', opCode: op.code }).catch(() => []),
            listCustomRoles({ level: 'ops', opCode: op.code, projectId }).catch(() => []),
            listPermissions({ level: 'ops', opCode: op.code }).catch(() => []),
          ]),
        ]);
        if (!alive) return;

        const rolesByOp = {};
        const permsByOp = {};
        ops.forEach((op, i) => {
          const base = i * 3;
          rolesByOp[op.code] = [...(opData[base] || []), ...(opData[base + 1] || [])].map(normRole);
          permsByOp[op.code] = opData[base + 2] || [];
        });

        const { pm, om } = splitAssignments(assignmentsData);

        setProject(proj);
        setObsOp(ops[0]?.code || '');
        setUsers(usersRes.items);
        setProjectRoles([...pRoles, ...pCustoms].map(normRole));
        setProjectPerms(pPerms);
        setObsRolesMap(rolesByOp);
        setObsPermsMap(permsByOp);
        setProjectMembers(pm);
        setObsMembers(om);
        setSource('api');
        setLoading(false);
      } catch {
        if (alive) { setNotFound(true); setLoading(false); }
      }
    })();
    return () => { alive = false; };
  }, [projectId]);

  const userOptions = useMemo(
    () => users.map((u, i) => ({ id: u.id ?? `u${i}`, name: userName(u), you: (u.id ?? `u${i}`) === myId })),
    [users, myId],
  );

  // ── Custom-role creation (API) ──
  const addProjectRole = async (name, permissions) => {
    const created = await createCustomRole({ name, level: 'project', projectId, permissions });
    setProjectRoles((r) => [...r, normRole({ ...created, is_custom: true })]);
  };
  const addObsRole = async (name, permissions) => {
    const created = await createCustomRole({ name, level: 'ops', opCode: obsOp, projectId, permissions });
    setObsRolesMap((m) => ({ ...m, [obsOp]: [...(m[obsOp] || []), normRole({ ...created, is_custom: true })] }));
  };

  // ── Observability scope helpers (operate on the selected op) ──
  const obsList = obsMembers[obsOp] || [];
  const setObsList = (updater) => setObsMembers((prev) => {
    const cur = prev[obsOp] || [];
    const next = typeof updater === 'function' ? updater(cur) : updater;
    return { ...prev, [obsOp]: next };
  });
  const obsRoles = obsRolesMap[obsOp] || [];
  const obsPerms = obsPermsMap[obsOp] || [];

  const isCustom = (roleCode, roles) => roles.some((r) => r.value === roleCode && r.custom);

  const save = async () => {
    setSaving(true);
    setError('');
    try {
      const body = {
        project: projectMembers.map((u) => ({
          userId: u.userId,
          role: u.role,
          ...(isCustom(u.role, projectRoles) ? { isCustom: true } : {}),
        })),
        observability: Object.fromEntries(
          Object.entries(obsMembers)
            .filter(([, list]) => (list || []).length > 0)
            .map(([opCode, list]) => [
              opCode,
              list.map((u) => ({
                userId: u.userId,
                role: u.role,
                ...(isCustom(u.role, obsRolesMap[opCode] || []) ? { isCustom: true } : {}),
              })),
            ]),
        ),
      };
      await saveRoleAssignments(projectId, body);
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
          <p>Assign users across the whole project or a single observability. Add custom roles and choose their permissions.</p>
        </div>

        {loading ? (
          <Spinner label="Loading roles & members…" />
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
                permissions={projectPerms}
                onCreateRole={addProjectRole}
              />
              <div className="xd-am-summary">
                <MemberPills
                  list={projectMembers}
                  labelOf={(c) => projectRoles.find((r) => r.value === c)?.label || prettyRole(c)}
                  onRemove={(id) => setProjectMembers((p) => p.filter((u) => u.userId !== id))}
                />
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
                permissions={obsPerms}
                onCreateRole={addObsRole}
              />
              <div className="xd-am-summary">
                <MemberPills
                  list={obsList}
                  labelOf={(c) => obsRoles.find((r) => r.value === c)?.label || prettyRole(c)}
                  onRemove={(id) => setObsList((p) => p.filter((u) => u.userId !== id))}
                />
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
