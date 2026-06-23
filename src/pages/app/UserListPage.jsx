import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiSearch, FiUserPlus, FiUsers, FiEdit2, FiTrash2, FiX, FiCheck, FiChevronDown } from 'react-icons/fi';
import { PageHeader, Spinner } from './_parts';
import { listUsers, updateUser, deleteUser } from '../../api/users';
import { listProjects } from '../../api/projects';
import { uiStore } from '../../store/project/uiStore';

// Org-level roles (Product tier) for the orgRole select.
const ORG_ROLES = ['SuperAdmin', 'Product_Admin', 'Product_Support'];

// Defensive field accessors — the users API may use snake_case or camelCase.
const uName = (u) => u.full_name || u.fullName || u.name || u.login || u.email || '—';
const uLogin = (u) => u.login || u.username || '—';
const uEmail = (u) => u.email || '—';
const uAdmin = (u) => u.is_admin === true || u.admin === true;
// org_role can be a string, or an array of { role_name } objects.
const roleNames = (u) => {
  const r = u.org_role ?? u.orgRole ?? u.role;
  if (Array.isArray(r)) {
    return r.map((x) => (typeof x === 'string' ? x : x?.role_name)).filter(Boolean);
  }
  return typeof r === 'string' && r.trim() ? [r] : [];
};
const uRole = (u) => {
  const names = roleNames(u).map((n) => n.replace(/_/g, ' '));
  if (names.length) return names.join(', ');
  return uAdmin(u) ? 'Admin' : '—';
};
const u2fa = (u) => (u.two_factor_enabled ?? u.twoFactorEnabled) === true;
const uActive = (u) => {
  if (typeof u.status === 'string') return u.status.toLowerCase() === 'active';
  return (u.active ?? u.is_active) !== false;
};

export default function UserListPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [version, setVersion] = useState(0);

  // Edit modal + delete confirm state.
  const [editUser, setEditUser] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [busy, setBusy] = useState(false);

  // Projects multi-select (mirrors the Create User form).
  const [projects, setProjects] = useState([]);
  const [projectIds, setProjectIds] = useState([]);
  const [projOpen, setProjOpen] = useState(false);
  const projRef = useRef(null);

  useEffect(() => {
    listProjects().then((items) => setProjects(items)).catch(() => setProjects([]));
  }, []);

  useEffect(() => {
    const onDoc = (e) => { if (projRef.current && !projRef.current.contains(e.target)) setProjOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const toggleProject = (id) =>
    setProjectIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));

  useEffect(() => {
    let alive = true;
    setLoading(true);
    listUsers().then(({ items }) => {
      if (!alive) return;
      setUsers(items);
      setError('');
      setLoading(false);
    }).catch((err) => {
      if (!alive) return;
      setUsers([]);
      setError(err?.message || 'Failed to load users.');
      setLoading(false);
    });
    return () => { alive = false; };
  }, [version]);

  const refresh = () => setVersion((v) => v + 1);

  const openEdit = (u) => {
    setEditUser(u);
    setEditForm({
      login: uLogin(u) === '—' ? '' : uLogin(u),
      email: uEmail(u) === '—' ? '' : uEmail(u),
      fullName: u.full_name || u.fullName || '',
      phoneNumber: u.phone_number || u.phoneNumber || '',
      orgRole: roleNames(u)[0] || '',
      // Carried through unchanged — no UI in edit (matches Create form).
      admin: uAdmin(u),
      twoFactorEnabled: u2fa(u),
      status: uActive(u) ? 'active' : 'inactive',
    });
    const ids = u.project_ids ?? u.projectIds ?? (Array.isArray(u.projects) ? u.projects.map((p) => p.id) : []);
    setProjectIds(Array.isArray(ids) ? ids : []);
    setProjOpen(false);
  };

  const closeEdit = () => { setEditUser(null); setEditForm(null); setProjectIds([]); setProjOpen(false); };

  const setF = (k, v) => setEditForm((f) => ({ ...f, [k]: v }));

  const saveEdit = async (e) => {
    e.preventDefault();
    if (!editForm.email.trim()) { uiStore.showError('Email is required'); return; }
    setBusy(true);
    try {
      await updateUser(editUser.id, {
        email: editForm.email.trim(),
        fullName: editForm.fullName.trim(),
        phoneNumber: editForm.phoneNumber.trim(),
        orgRole: editForm.orgRole,
        admin: editForm.admin,
        twoFactorEnabled: editForm.twoFactorEnabled,
        status: editForm.status,
        projectIds,
      });
      closeEdit();
      refresh();
    } catch (err) {
      uiStore.showError(err?.message || 'Failed to update user');
    } finally {
      setBusy(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setBusy(true);
    try {
      await deleteUser(deleteTarget.id);
      setDeleteTarget(null);
      refresh();
    } catch (err) {
      uiStore.showError(err?.message || 'Failed to delete user');
    } finally {
      setBusy(false);
    }
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) =>
      [uName(u), uLogin(u), uEmail(u), uRole(u)].join(' ').toLowerCase().includes(q));
  }, [users, query]);

  return (
    <>
      <PageHeader crumbs={[{ label: 'User Management' }, { label: 'User List' }]} />
      <main className="xd-main">
        <div className="xd-pagelead xd-pagelead-row">
          <div>
            <h1>Users</h1>
            <p>All users in the system.</p>
          </div>
          <div className="xd-list-actions">
            <div className="xd-search">
              <FiSearch className="xd-search-icon" />
              <input
                className="xd-search-input"
                type="search"
                placeholder="Search users…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <Link to="/dashboard/users/new" className="xd-btn xd-btn-sm"><FiUserPlus /> New User</Link>
          </div>
        </div>

        {loading ? (
          <Spinner label="Loading users…" />
        ) : error ? (
          <div className="xd-empty">
            <FiUsers />
            <p>{error}</p>
            <button className="xd-btn xd-btn-sm" type="button" onClick={refresh}>Retry</button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="xd-empty">
            <FiUsers />
            <p>{query.trim() ? `No users match “${query.trim()}”.` : 'No users yet.'}</p>
            {query.trim()
              ? <button className="xd-btn xd-btn-sm" type="button" onClick={() => setQuery('')}>Clear search</button>
              : <Link to="/dashboard/users/new" className="xd-btn xd-btn-sm"><FiUserPlus /> Create your first user</Link>}
          </div>
        ) : (
          <div className="xd-card xd-conn-table-card">
            <table className="xd-conn-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Login</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>2FA</th>
                  <th>Status</th>
                  <th className="xd-col-actions">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u, i) => (
                  <tr key={u.id ?? i}>
                    <td className="xd-conn-cell-name">
                      <span className="xd-u-cell">
                        <span className="xd-pcard-ava">{uName(u).charAt(0).toUpperCase()}</span>
                        {uName(u)}
                        {uAdmin(u) && <span className="xd-tag xd-u-admin">Admin</span>}
                      </span>
                    </td>
                    <td>{uLogin(u)}</td>
                    <td>{uEmail(u)}</td>
                    <td>{uRole(u)}</td>
                    <td>{u2fa(u) ? 'On' : 'Off'}</td>
                    <td>
                      <span className={`xd-status ${uActive(u) ? 'xd-status-active' : 'xd-status-onhold'}`}>
                        {uActive(u) ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <div className="xd-row-actions">
                        <button type="button" className="xd-icon-btn" title="Edit"
                          onClick={() => openEdit(u)}><FiEdit2 /></button>
                        <button type="button" className="xd-icon-btn xd-icon-btn-danger" title="Delete"
                          onClick={() => setDeleteTarget(u)}><FiTrash2 /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {/* ── Edit user modal ── */}
      {editForm && (
        <div className="xd-modal-overlay" onMouseDown={closeEdit}>
          <div className="xd-modal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="xd-modal-head">
              <h3>Edit User</h3>
              <button type="button" className="xd-icon-btn" onClick={closeEdit}><FiX /></button>
            </div>
            <form onSubmit={saveEdit}>
              <div className="xd-modal-body">
                <div className="xd-field-row3">
                  <div className="xd-conn-field">
                    <label className="xd-conn-label">Full Name</label>
                    <input className="xd-conn-input" value={editForm.fullName}
                      placeholder="e.g. John Doe" onChange={(e) => setF('fullName', e.target.value)} />
                  </div>
                  <div className="xd-conn-field">
                    <label className="xd-conn-label">Login</label>
                    <input className="xd-conn-input" value={editForm.login} disabled readOnly />
                  </div>
                  <div className="xd-conn-field">
                    <label className="xd-conn-label">Email<span className="xd-req">*</span></label>
                    <input className="xd-conn-input" type="email" value={editForm.email}
                      placeholder="user@example.com" onChange={(e) => setF('email', e.target.value)} />
                  </div>
                </div>

                <div className="xd-field-row3">
                  <div className="xd-conn-field">
                    <label className="xd-conn-label">Org Role</label>
                    <select className="xd-conn-input" value={editForm.orgRole}
                      onChange={(e) => setF('orgRole', e.target.value)}>
                      <option value="">— None —</option>
                      {ORG_ROLES.map((r) => <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>)}
                    </select>
                  </div>
                  <div className="xd-conn-field">
                    <label className="xd-conn-label">Phone Number</label>
                    <input className="xd-conn-input" value={editForm.phoneNumber}
                      placeholder="optional" onChange={(e) => setF('phoneNumber', e.target.value)} />
                  </div>
                  <div className="xd-conn-field">
                    <label className="xd-conn-label">Projects</label>
                    {projects.length === 0 ? (
                      <div className="xd-muted">No projects available.</div>
                    ) : (
                      <div className="xd-ms" ref={projRef}>
                        <button type="button" className="xd-conn-input xd-ms-toggle"
                          onClick={() => setProjOpen((o) => !o)}>
                          <span className={projectIds.length ? '' : 'xd-ms-ph'}>
                            {projectIds.length ? `${projectIds.length} selected` : '— Select projects —'}
                          </span>
                          <FiChevronDown />
                        </button>
                        {projOpen && (
                          <div className="xd-ms-menu">
                            {projects.map((p) => {
                              const on = projectIds.includes(p.id);
                              return (
                                <label key={p.id} className="xd-ms-opt">
                                  <input type="checkbox" checked={on} onChange={() => toggleProject(p.id)} />
                                  <span>{p.name}</span>
                                  {on && <FiCheck className="xd-ms-tick" />}
                                </label>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="xd-modal-foot">
                <button type="button" className="xd-btn-ghost" onClick={closeEdit} disabled={busy}>Cancel</button>
                <button type="submit" className="xd-btn" disabled={busy}>{busy ? 'Saving…' : 'Save Changes'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Delete confirm ── */}
      {deleteTarget && (
        <div className="xd-modal-overlay" onMouseDown={() => !busy && setDeleteTarget(null)}>
          <div className="xd-modal xd-modal-sm" onMouseDown={(e) => e.stopPropagation()}>
            <div className="xd-modal-head">
              <h3>Delete User</h3>
              <button type="button" className="xd-icon-btn" onClick={() => setDeleteTarget(null)} disabled={busy}><FiX /></button>
            </div>
            <div className="xd-modal-body">
              <p>Are you sure you want to delete <strong>{uName(deleteTarget)}</strong>? This action cannot be undone.</p>
            </div>
            <div className="xd-modal-foot">
              <button type="button" className="xd-btn-ghost" onClick={() => setDeleteTarget(null)} disabled={busy}>Cancel</button>
              <button type="button" className="xd-btn xd-btn-danger" onClick={confirmDelete} disabled={busy}>
                {busy ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
