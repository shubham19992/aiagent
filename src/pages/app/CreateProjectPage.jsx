import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiCheck, FiUser } from 'react-icons/fi';
import { PageHeader, Spinner } from './_parts';
import { listOps, listUsers } from '../../api/observability';
import { addProject } from '../../store/projectsStore';

// Display name from whatever fields the users API returns.
const userName = (u) =>
  u.name || u.full_name || u.fullName || u.username || u.email || String(u.id ?? '');

const STATUSES = ['Planning', 'Active', 'On Hold', 'Completed'];

export default function CreateProjectPage() {
  const navigate = useNavigate();
  const currentUser = sessionStorage.getItem('uidai_user') || 'You';

  const [ops, setOps] = useState([]);
  const [source, setSource] = useState('api');
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('Planning');
  const [owner, setOwner] = useState(currentUser);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selected, setSelected] = useState([]);
  const [assignments, setAssignments] = useState({});
  const [users, setUsers] = useState([]);
  const [error, setError] = useState('');

  // Members = the logged-in user first, then users fetched from the API.
  const memberOptions = useMemo(() => {
    const me = { id: 'me', name: currentUser, role: 'You', you: true };
    const others = users
      .map((u, i) => ({ id: u.id ?? `u${i}`, name: userName(u) }))
      .filter((u) => u.name && u.name !== currentUser);
    return [me, ...others];
  }, [currentUser, users]);

  useEffect(() => {
    let alive = true;
    Promise.all([listOps(), listUsers()]).then(([opsRes, usersRes]) => {
      if (!alive) return;
      setOps(opsRes.items); setSource(opsRes.source);
      setUsers(usersRes.items);
      setLoading(false);
    });
    return () => { alive = false; };
  }, []);

  const toggleOp = (code) => {
    setSelected((s) => (s.includes(code) ? s.filter((c) => c !== code) : [...s, code]));
    setAssignments((a) => {
      if (a[code]) { const { [code]: _d, ...rest } = a; return rest; }
      return { ...a, [code]: [] };
    });
    setError('');
  };
  const toggleMember = (code, m) => setAssignments((a) => {
    const cur = a[code] || [];
    return { ...a, [code]: cur.includes(m) ? cur.filter((x) => x !== m) : [...cur, m] };
  });

  const onSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return setError('Project name is required.');
    if (!startDate || !endDate) return setError('Start and end date are required.');
    if (endDate < startDate) return setError('End date cannot be before start date.');
    if (selected.length === 0) return setError('Select at least one observability to observe.');

    const chosenOps = selected.map((code) => {
      const op = ops.find((o) => o.code === code);
      return { code, name: op?.name || code };
    });

    addProject({
      name: name.trim(), description: description.trim(),
      status, owner,
      startDate, endDate, observabilities: chosenOps, assignments, createdBy: currentUser,
    });
    navigate('/dashboard/projects');
  };

  return (
    <>
      <PageHeader
        crumbs={[{ label: 'Manage Project', to: '/dashboard/projects' }, { label: 'Create Project' }]}
        source={source}
      />
      <main className="xd-main">
        <div className="xd-pagelead">
          <h1>Create Project</h1>
        </div>

        {loading ? (
          <Spinner label="Loading observabilities…" />
        ) : (
          <form className="xd-proj-form xd-card" onSubmit={onSubmit}>
            <div className="xd-form-body">
            <div className="xd-create-cols">
              {/* ── Column 1: project details ── */}
              <section className="xd-create-col">
                <h3 className="xd-col-title">Project Details</h3>

                <div className="xd-conn-field">
                  <label className="xd-conn-label">Project Name<span className="xd-req">*</span></label>
                  <input className="xd-conn-input" value={name} placeholder="e.g. Cloud Migration FY26"
                    onChange={(e) => { setName(e.target.value); setError(''); }} />
                </div>

                <div className="xd-conn-field">
                  <label className="xd-conn-label">Description</label>
                  <textarea className="xd-conn-input xd-textarea" rows={3} value={description}
                    placeholder="What is this project about?"
                    onChange={(e) => setDescription(e.target.value)} />
                </div>

                <div className="xd-conn-field">
                  <label className="xd-conn-label">Status</label>
                  <select className="xd-conn-input" value={status} onChange={(e) => setStatus(e.target.value)}>
                    {STATUSES.map((s) => <option key={s}>{s}</option>)}
                  </select>
                </div>

                <div className="xd-conn-field">
                  <label className="xd-conn-label">Project Owner</label>
                  <select className="xd-conn-input" value={owner} onChange={(e) => setOwner(e.target.value)}>
                    {memberOptions.map((m) => <option key={m.id} value={m.name}>{m.name}{m.you ? ' (you)' : ''}</option>)}
                  </select>
                </div>

                <div className="xd-field-row2">
                  <div className="xd-conn-field">
                    <label className="xd-conn-label">Start Date<span className="xd-req">*</span></label>
                    <input className="xd-conn-input" type="date" value={startDate}
                      onChange={(e) => { setStartDate(e.target.value); setError(''); }} />
                  </div>
                  <div className="xd-conn-field">
                    <label className="xd-conn-label">End Date<span className="xd-req">*</span></label>
                    <input className="xd-conn-input" type="date" value={endDate}
                      onChange={(e) => { setEndDate(e.target.value); setError(''); }} />
                  </div>
                </div>
              </section>

              {/* ── Column 2: what to observe ── */}
              <section className="xd-create-col">
                <h3 className="xd-col-title">What do you want to observe?<span className="xd-req">*</span></h3>
                <p className="xd-col-hint">Select the observability domains this project will monitor.</p>
                <div className="xd-chip-select xd-chip-stack">
                  {ops.map((op) => {
                    const on = selected.includes(op.code);
                    return (
                      <button key={op.code} type="button" className={`xd-chip-opt ${on ? 'on' : ''}`}
                        onClick={() => toggleOp(op.code)}>
                        {on && <FiCheck />} {op.name}
                      </button>
                    );
                  })}
                </div>
              </section>

              {/* ── Column 3: assign members ── */}
              <section className="xd-create-col">
                <h3 className="xd-col-title">Assign Members</h3>
                <p className="xd-col-hint">Assign members to each selected observability.</p>
                {selected.length === 0 ? (
                  <div className="xd-assign-empty">Select an observability first to assign members.</div>
                ) : (
                  <div className="xd-assign-list">
                    {selected.map((code) => {
                      const op = ops.find((o) => o.code === code);
                      return (
                        <div className="xd-assign-row" key={code}>
                          <div className="xd-assign-op">{op?.name || code}</div>
                          <div className="xd-chip-select">
                            {memberOptions.map((m) => {
                              const on = (assignments[code] || []).includes(m.name);
                              return (
                                <button key={m.id} type="button"
                                  className={`xd-chip-opt member ${on ? 'on' : ''}`}
                                  onClick={() => toggleMember(code, m.name)}>
                                  <FiUser /> {m.name}{m.you ? ' (you)' : ''}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            </div>
            </div>

            <div className="xd-form-footer">
              {error && <div className="xd-form-error">{error}</div>}
              <div className="xd-conn-actions">
                <button type="button" className="xd-btn-ghost" onClick={() => navigate('/dashboard/projects')}>Cancel</button>
                <button type="submit" className="xd-btn">Create Project</button>
              </div>
            </div>
          </form>
        )}
      </main>
    </>
  );
}
