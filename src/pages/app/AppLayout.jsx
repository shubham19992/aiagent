import React, { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { FiActivity, FiChevronDown, FiLogOut, FiLoader, FiFolder, FiPlusCircle, FiList, FiMenu, FiUsers, FiUserPlus, FiX } from 'react-icons/fi';
import '../../assets/css/Dashboard.css';
import XopsLogo from '../../components/XopsLogo';
import * as auth from '../../api/auth';
import { listMenu } from '../../api/observability';
import { useTheme } from '../../lib/theme';
import { useSidebar } from '../../lib/sidebar';

/**
 * Persistent app shell shown after login. The left sidebar lists the
 * observability "ops" (AIOps, InfraOps, …) loaded from the API (or dummy
 * data on failure). Each op routes to a drill-down page; the active page
 * renders in <Outlet>. Ops are shared with child routes via outlet context.
 */
export default function AppLayout() {
  const navigate = useNavigate();
  const [theme] = useTheme();
  const [collapsed, toggleSidebar] = useSidebar();
  const userName = sessionStorage.getItem('uidai_user') || 'User';
  const [ops, setOps] = useState([]);
  const [source, setSource] = useState('api');
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState({ observability: true, project: true, users: true });
  const toggle = (k) => setOpen((s) => ({ ...s, [k]: !s[k] }));
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    let alive = true;
    listMenu().then(({ items, source: src }) => {
      if (!alive) return;
      setOps(items);
      setSource(src);
      setLoading(false);
    }).catch(() => {
      if (!alive) return;
      setOps([]);
      setLoading(false);
    });
    return () => { alive = false; };
  }, []);

  const doLogout = async () => {
    // Call the backend logout API; auth.logout() clears all tokens/session
    // in its finally block even if the request fails.
    setLoggingOut(true);
    try {
      await auth.logout();
    } finally {
      navigate('/login');
    }
  };

  return (
    <div className={`xd-shell ${collapsed ? 'is-collapsed' : ''}`} data-theme={theme}>
      <aside className="xd-sidebar">
        <div className="xd-side-logo">
          <div className="xd-side-logo-row">
            {!collapsed && <XopsLogo height={30} />}
            <button
              className="xd-side-toggle"
              type="button"
              onClick={toggleSidebar}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              <FiMenu />
            </button>
          </div>
        </div>

        <nav className="xd-nav">
          {/* Observability — ops loaded from the API */}
          <div className="xd-nav-group">
            <button
              className="xd-nav-group-head"
              onClick={() => toggle('observability')}
              type="button"
              aria-expanded={open.observability}
            >
              <span className="xd-nav-group-icon"><FiActivity /></span>
              <span className="xd-nav-group-label">Observability</span>
              {source === 'dummy' && <span className="xd-demo-dot" title="Showing demo data (API offline)" />}
              <FiChevronDown className={`xd-nav-caret ${open.observability ? 'open' : ''}`} />
            </button>

            {open.observability && (
              <ul className="xd-nav-items">
                {loading && (
                  <li className="xd-nav-loading"><FiLoader className="xd-spin" /> Loading…</li>
                )}
                {!loading && ops.length === 0 && (
                  <li className="xd-nav-loading">No data · API unreachable</li>
                )}
                {!loading && ops.map((op) => (
                  <li key={op.code}>
                    <NavLink
                      to={op.url ? `/${op.url.replace(/^\/+/, '')}` : `/dashboard/observability/${op.code}`}
                      className={({ isActive }) => `xd-nav-item ${isActive ? 'active' : ''}`}
                    >
                      <span className="xd-op-badge">{op.name.replace(/Ops$/i, '').slice(0, 2)}</span>
                      <span className="xd-nav-item-text">{op.name}</span>
                    </NavLink>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Manage Project */}
          <div className="xd-nav-group">
            <button
              className="xd-nav-group-head"
              onClick={() => toggle('project')}
              type="button"
              aria-expanded={open.project}
            >
              <span className="xd-nav-group-icon"><FiFolder /></span>
              <span className="xd-nav-group-label">Manage Project</span>
              <FiChevronDown className={`xd-nav-caret ${open.project ? 'open' : ''}`} />
            </button>

            {open.project && (
              <ul className="xd-nav-items">
                <li>
                  <NavLink to="/dashboard/projects/new"
                    className={({ isActive }) => `xd-nav-item ${isActive ? 'active' : ''}`}>
                    <span className="xd-nav-item-icon"><FiPlusCircle /></span>
                    <span className="xd-nav-item-text">Create Project</span>
                  </NavLink>
                </li>
                <li>
                  <NavLink to="/dashboard/projects" end
                    className={({ isActive }) => `xd-nav-item ${isActive ? 'active' : ''}`}>
                    <span className="xd-nav-item-icon"><FiList /></span>
                    <span className="xd-nav-item-text">Project List</span>
                  </NavLink>
                </li>
              </ul>
            )}
          </div>

          {/* User Management */}
          <div className="xd-nav-group">
            <button
              className="xd-nav-group-head"
              onClick={() => toggle('users')}
              type="button"
              aria-expanded={open.users}
            >
              <span className="xd-nav-group-icon"><FiUsers /></span>
              <span className="xd-nav-group-label">User Management</span>
              <FiChevronDown className={`xd-nav-caret ${open.users ? 'open' : ''}`} />
            </button>

            {open.users && (
              <ul className="xd-nav-items">
                <li>
                  <NavLink to="/dashboard/users/new"
                    className={({ isActive }) => `xd-nav-item ${isActive ? 'active' : ''}`}>
                    <span className="xd-nav-item-icon"><FiUserPlus /></span>
                    <span className="xd-nav-item-text">Create User</span>
                  </NavLink>
                </li>
                <li>
                  <NavLink to="/dashboard/users" end
                    className={({ isActive }) => `xd-nav-item ${isActive ? 'active' : ''}`}>
                    <span className="xd-nav-item-icon"><FiList /></span>
                    <span className="xd-nav-item-text">User List</span>
                  </NavLink>
                </li>
              </ul>
            )}
          </div>
        </nav>

        <div className="xd-side-foot">
          <div className="xd-user">
            <span className="xd-avatar">{userName.charAt(0).toUpperCase()}</span>
            <span className="xd-user-meta">
              <span className="xd-user-name">{userName}</span>
              <span className="xd-user-role">Online</span>
            </span>
          </div>
          <button className="xd-logout" onClick={() => setConfirmLogout(true)} type="button" title="Log out">
            <FiLogOut />
          </button>
        </div>
      </aside>

      <div className="xd-content-wrap">
        <Outlet context={{ ops, source, loading }} />
      </div>

      {/* ── Logout confirm ── */}
      {confirmLogout && (
        <div className="xd-modal-overlay" onMouseDown={() => !loggingOut && setConfirmLogout(false)}>
          <div className="xd-modal xd-modal-sm" onMouseDown={(e) => e.stopPropagation()}>
            <div className="xd-modal-head">
              <h3>Log out</h3>
              <button type="button" className="xd-icon-btn" onClick={() => setConfirmLogout(false)} disabled={loggingOut}><FiX /></button>
            </div>
            <div className="xd-modal-body">
              <p>Are you sure you want to log out of your account?</p>
            </div>
            <div className="xd-modal-foot">
              <button type="button" className="xd-btn-ghost" onClick={() => setConfirmLogout(false)} disabled={loggingOut}>Cancel</button>
              <button type="button" className="xd-btn xd-btn-danger" onClick={doLogout} disabled={loggingOut}>
                {loggingOut ? 'Logging out…' : 'Log out'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
