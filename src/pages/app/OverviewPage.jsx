import React from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { FiArrowRight } from 'react-icons/fi';
import { PageHeader, Spinner } from './_parts';

/** Landing page: grid of all observability ops. Click → op drill-down. */
export default function OverviewPage() {
  const { ops, source, loading } = useOutletContext();
  const navigate = useNavigate();

  return (
    <>
      <PageHeader crumbs={[{ label: 'Observability' }]} source={source} />
      <main className="xd-main">
        <div className="xd-pagelead">
          <h1>Observability</h1>
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
