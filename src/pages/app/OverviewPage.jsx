import React from 'react';
import { Link, useNavigate, useOutletContext } from 'react-router-dom';
import { FiArrowRight, FiCalendar, FiPlus } from 'react-icons/fi';
import { PageHeader, Spinner } from './_parts';
import { myProjects, projectMembers } from '../../store/projectsStore';

/** Landing page: the user's projects + grid of all observability ops. */
export default function OverviewPage() {
  const { ops, source, loading } = useOutletContext();
  const navigate = useNavigate();
  const currentUser = sessionStorage.getItem('uidai_user') || 'You';
  const mine = myProjects(currentUser);

  return (
    <>
      <PageHeader crumbs={[{ label: 'Observability' }]} source={source} />
      <main className="xd-main">
        {/* My projects — what this user is observing */}
        <div className="xd-pagelead xd-pagelead-row">
          <div>
            <h1>Welcome, {currentUser}</h1>
            <p>Your projects and the observabilities assigned to you.</p>
          </div>
          <Link to="/dashboard/projects/new" className="xd-btn xd-btn-sm"><FiPlus /> New Project</Link>
        </div>

        {mine.length === 0 ? (
          <div className="xd-card xd-muted" style={{ marginBottom: 8 }}>
            No projects assigned to you yet. <Link to="/dashboard/projects/new" className="xd-inline-link">Create one →</Link>
          </div>
        ) : (
          <div className="xd-proj-grid">
            {mine.map((p) => (
              <Link to="/dashboard/projects" className="xd-proj-card xd-proj-card-link" key={p.id}>
                <h3>{p.name}</h3>
                <div className="xd-proj-meta"><FiCalendar /> {p.startDate || '—'} → {p.endDate || '—'}</div>
                <div className="xd-proj-label">Observing</div>
                <div className="xd-proj-chips">
                  {p.observabilities.map((o) => <span className="xd-tag" key={o.code}>{o.name}</span>)}
                </div>
                <div className="xd-proj-foot">{projectMembers(p).length} member(s) · by {p.createdBy}</div>
              </Link>
            ))}
          </div>
        )}

        <div className="xd-pagelead" style={{ marginTop: 28 }}>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>Observability</h2>
          <p>Select an operations domain to explore its environments, measures and connection setup.</p>
        </div>

        {loading ? (
          <Spinner label="Loading ops…" />
        ) : (
          <div className="xd-ops-grid">
            {ops.map((op) => (
              <button
                key={op.code}
                type="button"
                className="xd-op-card"
                onClick={() => navigate(`/dashboard/observability/${op.code}`)}
              >
                <span className="xd-op-card-badge">{op.name.replace(/Ops$/i, '').slice(0, 2)}</span>
                <span className="xd-op-card-name">{op.name}</span>
                <span className="xd-op-card-desc">{op.description}</span>
                <span className="xd-op-card-cta">Explore <FiArrowRight /></span>
              </button>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
