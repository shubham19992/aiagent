import React, { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { FiActivity, FiChevronDown, FiLogOut, FiLoader, FiFolder, FiPlusCircle, FiList } from 'react-icons/fi';
import '../../assets/css/Dashboard.css';
import XopsLogo from '../../components/XopsLogo';
import { tokenStore } from '../../api/client';
import { listOps } from '../../api/observability';

/**
 * Persistent app shell shown after login. The left sidebar lists the
 * observability "ops" (AIOps, InfraOps, …) loaded from the API (or dummy
 * data on failure). Each op routes to a drill-down page; the active page
 * renders in <Outlet>. Ops are shared with child routes via outlet context.
 */
export default function AppLayout() {
  const navigate = useNavigate();
  const userName = sessionStorage.getItem('uidai_user') || 'User';
  const [ops, setOps] = useState([]);
  const [source, setSource] = useState('api');
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState({ observability: true, project: true });
  const toggle = (k) => setOpen((s) => ({ ...s, [k]: !s[k] }));

  useEffect(() => {
    let alive = true;
    listOps().then(({ items, source: src }) => {
      if (!alive) return;
      setOps(items);
      setSource(src);
      setLoading(false);
    });
    return () => { alive = false; };
  }, []);

  const logout = () => {
    tokenStore.clear();
    sessionStorage.removeItem('uidai_loggedIn');
    sessionStorage.removeItem('uidai_user');
    navigate('/login');
  };

  return (
    <div className="xd-shell">
      <aside className="xd-sidebar">
        <div className="xd-side-logo"><XopsLogo height={34} /></div>

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
                {!loading && ops.map((op) => (
                  <li key={op.code}>
                    <NavLink
                      to={`/dashboard/observability/${op.code}`}
                      className={({ isActive }) => `xd-nav-item ${isActive ? 'active' : ''}`}
                    >
                      <span className="xd-op-badge">{op.name.replace(/Ops$/i, '').slice(0, 2)}</span>
                      {op.name}
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
                    <span className="xd-nav-item-icon"><FiPlusCircle /></span> Create Project
                  </NavLink>
                </li>
                <li>
                  <NavLink to="/dashboard/projects" end
                    className={({ isActive }) => `xd-nav-item ${isActive ? 'active' : ''}`}>
                    <span className="xd-nav-item-icon"><FiList /></span> Project List
                  </NavLink>
                </li>
              </ul>
            )}
          </div>
        </nav>

        <div className="xd-side-foot">
          <div className="xd-user">
            <span className="xd-avatar">{userName.charAt(0).toUpperCase()}</span>
            <span className="xd-user-name">{userName}</span>
          </div>
          <button className="xd-logout" onClick={logout} type="button" title="Log out">
            <FiLogOut />
          </button>
        </div>
      </aside>

      <div className="xd-content-wrap">
        <Outlet context={{ ops, source, loading }} />
      </div>
    </div>
  );
}
