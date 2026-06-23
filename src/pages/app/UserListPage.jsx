import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiSearch, FiUserPlus, FiUsers } from 'react-icons/fi';
import { PageHeader, Spinner } from './_parts';
import { listUsers } from '../../api/users';

// Defensive field accessors — the users API may use snake_case or camelCase.
const uName = (u) => u.full_name || u.fullName || u.name || u.login || u.email || '—';
const uLogin = (u) => u.login || u.username || '—';
const uEmail = (u) => u.email || '—';
const uRole = (u) => u.org_role || u.orgRole || u.role || (u.admin ? 'Admin' : '') || '—';
const uAdmin = (u) => u.admin === true;
const u2fa = (u) => (u.two_factor_enabled ?? u.twoFactorEnabled) === true;
const uActive = (u) => (u.active ?? u.is_active) !== false;

export default function UserListPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [version, setVersion] = useState(0);

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
            <button className="xd-btn xd-btn-sm" type="button" onClick={() => setVersion((v) => v + 1)}>Retry</button>
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </>
  );
}
