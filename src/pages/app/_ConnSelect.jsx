import React, { useEffect, useRef, useState } from 'react';
import { FiCheck, FiChevronDown, FiX } from 'react-icons/fi';

/**
 * Optional multi-select of records (e.g. connections or projects). Reuses
 * the shared `xd-ms` dropdown styling and lists the selected records as
 * removable chips below the dropdown.
 *   options : [{ id, name, env_code? }]
 *   selected: [id, ...]
 *   onToggle: (id) => void
 */
export default function ConnectionsSelect({
  options, selected, onToggle, readOnly = false,
  placeholder = '— Select connections —',
  emptyText = 'No connections available.',
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  if (options.length === 0) return <div className="xd-muted">{emptyText}</div>;

  const chosen = selected.map((id) => options.find((o) => o.id === id)).filter(Boolean);

  // Read-only: show just the selected chips (no dropdown, no remove).
  if (readOnly) {
    if (chosen.length === 0) return <div className="xd-muted">None</div>;
    return (
      <div className="xd-ms-chips">
        {chosen.map((o) => (
          <span className="xd-ms-chip" key={o.id}>
            {o.name}
            {o.env_code && <span className="xd-ms-chip-env">{String(o.env_code).toUpperCase()}</span>}
          </span>
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="xd-ms" ref={ref}>
        <button type="button" className="xd-conn-input xd-ms-toggle" onClick={() => setOpen((o) => !o)}>
          <span className={selected.length ? '' : 'xd-ms-ph'}>
            {selected.length ? `${selected.length} selected` : placeholder}
          </span>
          <FiChevronDown />
        </button>
        {open && (
          <div className="xd-ms-menu">
            {options.map((c) => {
              const on = selected.includes(c.id);
              return (
                <label key={c.id} className="xd-ms-opt">
                  <input type="checkbox" checked={on} onChange={() => onToggle(c.id)} />
                  <span>{c.name}{c.env_code ? ` · ${String(c.env_code).toUpperCase()}` : ''}</span>
                  {on && <FiCheck className="xd-ms-tick" />}
                </label>
              );
            })}
          </div>
        )}
      </div>

      {chosen.length > 0 && (
        <div className="xd-ms-chips">
          {chosen.map((o) => (
            <span className="xd-ms-chip" key={o.id}>
              {o.name}
              {o.env_code && <span className="xd-ms-chip-env">{String(o.env_code).toUpperCase()}</span>}
              <button type="button" className="xd-ms-chip-x" title="Remove" onClick={() => onToggle(o.id)}>
                <FiX />
              </button>
            </span>
          ))}
        </div>
      )}
    </>
  );
}
