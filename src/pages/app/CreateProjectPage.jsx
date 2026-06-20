import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiCheck, FiUser } from 'react-icons/fi';
import { PageHeader, Spinner } from './_parts';
import { listOps } from '../../api/observability';
import { addProject } from '../../store/projectsStore';
import { DEMO_USERS } from '../../data/demoUsers';

export default function CreateProjectPage() {
  const navigate = useNavigate();
  const currentUser = sessionStorage.getItem('uidai_user') || 'You';

  const [ops, setOps] = useState([]);
  const [source, setSource] = useState('api');
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selected, setSelected] = useState([]);            // [opCode]
  const [assignments, setAssignments] = useState({});      // { opCode: [memberName] }
  const [error, setError] = useState('');

  // Member options: the logged-in user first, then the demo roster.
  const memberOptions = useMemo(() => {
    const me = { id: 'me', name: currentUser, role: 'You', you: true };
    return [me, ...DEMO_USERS];
  }, [currentUser]);

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

  const toggleOp = (code) => {
    setSelected((s) => (s.includes(code) ? s.filter((c) => c !== code) : [...s, code]));
    setAssignments((a) => {
      if (a[code]) { const { [code]: _drop, ...rest } = a; return rest; }
      return { ...a, [code]: [] };
    });
    setError('');
  };

  const toggleMember = (code, memberName) => {
    setAssignments((a) => {
      const cur = a[code] || [];
      const next = cur.includes(memberName)
        ? cur.filter((m) => m !== memberName)
        : [...cur, memberName];
      return { ...a, [code]: next };
    });
  };

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
      name: name.trim(),
      startDate,
      endDate,
      observabilities: chosenOps,
      assignments,
      createdBy: currentUser,
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
          <p>Define a project, pick the observabilities to monitor, and assign members to each.</p>
        </div>

        {loading ? (
          <Spinner label="Loading observabilities…" />
        ) : (
          <form className="xd-card xd-proj-form" onSubmit={onSubmit}>
            {/* Basic details */}
            <div className="xd-conn-grid">
              <div className="xd-conn-field">
                <label className="xd-conn-label">Project Name<span className="xd-req">*</span></label>
                <input className="xd-conn-input" value={name} placeholder="e.g. Cloud Migration FY26"
                  onChange={(e) => { setName(e.target.value); setError(''); }} />
              </div>
              <div className="xd-conn-field" />
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

            {/* Observability multiselect */}
            <h3 className="xd-subhead">What do you want to observe?</h3>
            <div className="xd-chip-select">
              {ops.map((op) => {
                const on = selected.includes(op.code);
                return (
                  <button key={op.code} type="button"
                    className={`xd-chip-opt ${on ? 'on' : ''}`}
                    onClick={() => toggleOp(op.code)}>
                    {on && <FiCheck />} {op.name}
                  </button>
                );
              })}
            </div>

            {/* Per-observability member assignment */}
            {selected.length > 0 && (
              <>
                <h3 className="xd-subhead">Assign members per observability</h3>
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
              </>
            )}

            {error && <div className="xd-form-error">{error}</div>}

            <div className="xd-conn-actions">
              <button type="button" className="xd-btn-ghost" onClick={() => navigate('/dashboard/projects')}>Cancel</button>
              <button type="submit" className="xd-btn">Create Project</button>
            </div>
          </form>
        )}
      </main>
    </>
  );
}
