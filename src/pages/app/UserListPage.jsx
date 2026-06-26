import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiSearch, FiUserPlus, FiUsers, FiEdit2, FiTrash2, FiX } from 'react-icons/fi';
import { PageHeader, Spinner } from './_parts';
import { listUsers, deleteUser } from '../../api/users';
import { uiStore } from '../../store/project/uiStore';
import { useAccess } from '../../lib/access';

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
const uActive = (u) => {
  if (typeof u.status === 'string') return u.status.toLowerCase() === 'active';
  return (u.active ?? u.is_active) !== false;
};

export default function UserListPage() {
  const navigate = useNavigate();
  const access = useAccess();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [version, setVersion] = useState(0);

  // Delete confirm state.
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [busy, setBusy] = useState(false);

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
            {access.canManage && (
              <Link to="/dashboard/users/new" className="xd-btn xd-btn-sm"><FiUserPlus /> New User</Link>
            )}
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
              : (access.canManage && <Link to="/dashboard/users/new" className="xd-btn xd-btn-sm"><FiUserPlus /> Create your first user</Link>)}
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
                    <td>
                      <span className={`xd-status ${uActive(u) ? 'xd-status-active' : 'xd-status-onhold'}`}>
                        {uActive(u) ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      {access.canManage ? (
                        <div className="xd-row-actions">
                          <button type="button" className="xd-icon-btn" title="Edit"
                            onClick={() => navigate(`/dashboard/users/${u.id}/edit`)}><FiEdit2 /></button>
                          <button type="button" className="xd-icon-btn xd-icon-btn-danger" title="Delete"
                            onClick={() => setDeleteTarget(u)}><FiTrash2 /></button>
                        </div>
                      ) : <span className="xd-muted">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

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
