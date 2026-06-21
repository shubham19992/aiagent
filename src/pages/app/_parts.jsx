import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiLoader, FiChevronRight, FiChevronDown, FiCheck, FiDroplet, FiMenu } from 'react-icons/fi';
import { THEMES, useTheme } from '../../lib/theme';
import { useSidebar } from '../../lib/sidebar';

/** Dropdown theme picker shown in the top header. Lets you preview the
 *  available color themes and switch live — the choice persists in
 *  localStorage and applies across the whole dashboard shell. */
export function ThemePicker() {
  const [theme, setTheme] = useTheme();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const current = THEMES.find((t) => t.id === theme) || THEMES[0];

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return;
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
    <div className="xd-theme" ref={ref}>
      <button
        type="button"
        className="xd-theme-btn"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        title="Change theme"
      >
        <FiDroplet />
        <span className="xd-theme-swatch" style={{ background: current.swatch }} />
        {current.name}
        <FiChevronDown className={`xd-theme-caret ${open ? 'open' : ''}`} />
      </button>

      {open && (
        <div className="xd-theme-menu" role="listbox">
          {THEMES.map((t) => (
            <button
              key={t.id}
              type="button"
              role="option"
              aria-selected={t.id === theme}
              className={`xd-theme-opt ${t.id === theme ? 'active' : ''}`}
              onClick={() => { setTheme(t.id); setOpen(false); }}
            >
              <span
                className="xd-theme-opt-swatch"
                style={{ background: `linear-gradient(135deg, ${t.swatch}, ${t.bg})` }}
              />
              <span className="xd-theme-opt-name">{t.name}</span>
              {t.id === theme && <FiCheck className="xd-theme-opt-check" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Sticky topbar with a breadcrumb trail + optional demo-data badge.
 *  crumbs: array of { label, to? } — the last one renders as current. */
export function PageHeader({ crumbs = [], source }) {
  const [collapsed, toggleSidebar] = useSidebar();
  return (
    <header className="xd-topbar">
      <button
        type="button"
        className="xd-hamburger"
        onClick={toggleSidebar}
        aria-label={collapsed ? 'Open sidebar' : 'Close sidebar'}
        aria-pressed={!collapsed}
        title={collapsed ? 'Open sidebar' : 'Close sidebar'}
      >
        <FiMenu />
      </button>
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
      <div className="xd-topbar-right">
        {source === 'dummy' && (
          <span className="xd-demo-badge" title="Live API unreachable — showing demo data">
            ● Demo data · API offline
          </span>
        )}
        <ThemePicker />
      </div>
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
