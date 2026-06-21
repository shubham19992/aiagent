import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiCheck, FiCheckCircle, FiChevronDown, FiX, FiUsers } from 'react-icons/fi';
import { PageHeader, Spinner } from './_parts';
import { listUsers } from '../../api/observability';
import { getProject, updateProject } from '../../store/projectsStore';

// Display name from whatever fields the users API returns.
const userName = (u) =>
  u.name || u.full_name || u.fullName || u.username || u.email || String(u.id ?? '');

// Short two-letter badge from an op name (AIOps -> "AI").
const opBadge = (name) => name.replace(/Ops$/i, '').slice(0, 2).toUpperCase();

/**
 * Second step of project creation: assign members to each observability the
 * project monitors. Reached after Create Project; loads the just-created
 * project and persists assignments back to the store.
 */
export default function AssignMembersPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const currentUser = sessionStorage.getItem('uidai_user') || 'You';

  const project = getProject(projectId);

  const [users, setUsers] = useState([]);
  const [source, setSource] = useState('api');
  const [loading, setLoading] = useState(true);
  const [assignments, setAssignments] = useState(project?.assignments || {});
  const [activeOp, setActiveOp] = useState(project?.observabilities?.[0]?.code || '');
  const [memberOpen, setMemberOpen] = useState(false);
  const msRef = useRef(null);

  // Close the member dropdown on outside click / Escape.
  useEffect(() => {
    if (!memberOpen) return undefined;
    const onDown = (e) => { if (msRef.current && !msRef.current.contains(e.target)) setMemberOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setMemberOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [memberOpen]);

  useEffect(() => {
    let alive = true;
    listUsers().then((res) => {
      if (!alive) return;
      setUsers(res.items);
      setSource(res.source);
      setLoading(false);
    });
    return () => { alive = false; };
  }, []);

  // Members = the logged-in user first, then users fetched from the API.
  const memberOptions = useMemo(() => {
    const me = { id: 'me', name: currentUser, you: true };
    const others = users
      .map((u, i) => ({ id: u.id ?? `u${i}`, name: userName(u) }))
      .filter((u) => u.name && u.name !== currentUser);
    return [me, ...others];
  }, [currentUser, users]);

  const toggleMember = (code, m) => setAssignments((a) => {
    const cur = a[code] || [];
    return { ...a, [code]: cur.includes(m) ? cur.filter((x) => x !== m) : [...cur, m] };
  });

  const save = () => {
    updateProject(projectId, { assignments });
    navigate('/dashboard/projects');
  };

  if (!project) {
    return (
      <>
        <PageHeader crumbs={[{ label: 'Manage Project', to: '/dashboard/projects' }, { label: 'Assign Members' }]} />
        <main className="xd-main">
          <div className="xd-empty">
            <p>Project not found.</p>
            <button className="xd-btn xd-btn-sm" onClick={() => navigate('/dashboard/projects')}>Back to projects</button>
          </div>
        </main>
      </>
    );
  }

  const obs = project.observabilities || [];

  return (
    <>
      <PageHeader
        crumbs={[
          { label: 'Manage Project', to: '/dashboard/projects' },
          { label: project.name, to: `/dashboard/projects/${project.id}` },
          { label: 'Assign Members' },
        ]}
        source={source}
      />
      <main className="xd-main">
        <div className="xd-pagelead">
          <h1>Assign Members</h1>
          <p>Pick an observability and select members on the left — assignments appear on the right.</p>
        </div>

        {loading ? (
          <Spinner label="Loading members…" />
        ) : (
          <>
            <div className="xd-am-2col">
              {/* ── Left: select members (form) ── */}
              <div className="xd-card xd-am-panel">
                <h3 className="xd-col-title">Select members</h3>

                <label className="xd-conn-label">Observability</label>
                <div className="xd-am-ops">
                  {obs.map((o) => {
                    const count = (assignments[o.code] || []).length;
                    return (
                      <button key={o.code} type="button"
                        className={`xd-am-op ${activeOp === o.code ? 'on' : ''}`}
                        onClick={() => setActiveOp(o.code)}>
                        {o.name}
                        {count > 0 && <span className="xd-am-op-count">{count}</span>}
                      </button>
                    );
                  })}
                </div>

                <label className="xd-conn-label">
                  Members for {obs.find((o) => o.code === activeOp)?.name || '—'}
                </label>
                <div className="xd-ms" ref={msRef}>
                  <button type="button" className="xd-ms-btn"
                    onClick={() => setMemberOpen((v) => !v)}
                    aria-haspopup="listbox" aria-expanded={memberOpen}>
                    <span className="xd-ms-btn-label">
                      {(assignments[activeOp] || []).length
                        ? `${(assignments[activeOp] || []).length} member(s) selected`
                        : 'Select members…'}
                    </span>
                    <FiChevronDown className={`xd-ms-caret ${memberOpen ? 'open' : ''}`} />
                  </button>
                  {memberOpen && (
                    <div className="xd-ms-menu" role="listbox" aria-multiselectable="true">
                      {memberOptions.map((m) => {
                        const on = (assignments[activeOp] || []).includes(m.name);
                        return (
                          <label key={m.id} className={`xd-ms-opt ${on ? 'on' : ''}`} role="option" aria-selected={on}>
                            <input type="checkbox" checked={on}
                              onChange={() => toggleMember(activeOp, m.name)} />
                            <span className="xd-am-ava">{m.name.charAt(0).toUpperCase()}</span>
                            <span className="xd-ms-opt-name">{m.name}{m.you ? ' (you)' : ''}</span>
                            {on && <FiCheck className="xd-ms-opt-check" />}
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* ── Right: selected / assigned ── */}
              <div className="xd-card xd-am-panel">
                <h3 className="xd-col-title">Assigned members</h3>
                <div className="xd-am-summary">
                  {obs.map((o) => {
                    const picked = assignments[o.code] || [];
                    return (
                      <div className="xd-am-srow" key={o.code}>
                        <div className="xd-am-shead">
                          <span className="xd-am-badge">{opBadge(o.name)}</span>
                          <span className="xd-am-sname">{o.name}</span>
                        </div>
                        {picked.length === 0 ? (
                          <span className="xd-muted xd-am-none"><FiUsers /> No members yet</span>
                        ) : (
                          <div className="xd-am-pills">
                            {picked.map((m) => (
                              <span className="xd-member-pill" key={m}>
                                <span className="xd-member-ava">{m.charAt(0).toUpperCase()}</span>{m}
                                <button type="button" className="xd-am-remove" title="Remove"
                                  onClick={() => toggleMember(o.code, m)}><FiX /></button>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="xd-assign-bar">
              <div className="xd-assign-bar-actions">
                <button type="button" className="xd-btn-ghost" onClick={() => navigate('/dashboard/projects')}>
                  Skip for now
                </button>
                <button type="button" className="xd-btn" onClick={save}>
                  <FiCheckCircle /> Save Assignments
                </button>
              </div>
            </div>
          </>
        )}
      </main>
    </>
  );
}
