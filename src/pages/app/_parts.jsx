import React from 'react';
import { Link } from 'react-router-dom';
import { FiLoader, FiChevronRight } from 'react-icons/fi';

/** Sticky topbar with a breadcrumb trail + optional demo-data badge.
 *  crumbs: array of { label, to? } — the last one renders as current. */
export function PageHeader({ crumbs = [], source }) {
  return (
    <header className="xd-topbar">
      <nav className="xd-crumbs" aria-label="Breadcrumb">
        {crumbs.map((c, i) => {
          const last = i === crumbs.length - 1;
          return (
            <span key={i} className="xd-crumb-wrap">
              {c.to && !last ? (
                <Link to={c.to} className="xd-crumb">{c.label}</Link>
              ) : (
                <span className={`xd-crumb ${last ? 'current' : ''}`}>{c.label}</span>
              )}
              {!last && <FiChevronRight className="xd-crumb-sep" />}
            </span>
          );
        })}
      </nav>
      {source === 'error' && (
        <span className="xd-demo-badge" title="Could not reach the observability API">
          ● API unreachable
        </span>
      )}
    </header>
  );
}

export function Spinner({ label = 'Loading…' }) {
  return (
    <div className="xd-loading">
      <FiLoader className="xd-spin" /> {label}
    </div>
  );
}
