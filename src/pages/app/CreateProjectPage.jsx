import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiCheck, FiUser, FiX } from 'react-icons/fi';
import { PageHeader, Spinner } from './_parts';
import { listOps } from '../../api/observability';
import { addProject } from '../../store/projectsStore';
import { DEMO_USERS } from '../../data/demoUsers';

const PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];
const STATUSES = ['Planning', 'Active', 'On Hold', 'Completed'];
const ENVIRONMENTS = [
  { code: 'aws', name: 'AWS' },
  { code: 'azure', name: 'Azure' },
  { code: 'gcp', name: 'GCP' },
];

// Derive a short key like "Cloud Migration FY26" → "CMF".
const deriveKey = (name) =>
  name.trim().split(/\s+/).map((w) => w[0]).join('').toUpperCase().slice(0, 6);

export default function CreateProjectPage() {
  const navigate = useNavigate();
  const currentUser = sessionStorage.getItem('uidai_user') || 'You';

  const [ops, setOps] = useState([]);
  const [source, setSource] = useState('api');
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState('');
  const [keyTouched, setKeyTouched] = useState(false);
  const [key, setKey] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('Medium');
  const [status, setStatus] = useState('Planning');
  const [owner, setOwner] = useState(currentUser);
  const [environments, setEnvironments] = useState([]);
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selected, setSelected] = useState([]);
  const [assignments, setAssignments] = useState({});
  const [error, setError] = useState('');

  const memberOptions = useMemo(() => {
    const me = { id: 'me', name: currentUser, role: 'You', you: true };
    return [me, ...DEMO_USERS];
  }, [currentUser]);

  useEffect(() => {
    let alive = true;
    listOps().then(({ items, source: src }) => {
      if (!alive) return;
      setOps(items); setSource(src); setLoading(false);
    });
    return () => { alive = false; };
  }, []);

  // Auto-fill key from name until the user edits it manually.
  useEffect(() => {
    if (!keyTouched) setKey(deriveKey(name));
  }, [name, keyTouched]);

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
  const toggleEnv = (code) => setEnvironments((e) => (e.includes(code) ? e.filter((c) => c !== code) : [...e, code]));

  const addTag = () => {
    const t = tagInput.trim();
    if (t && !tags.includes(t)) setTags((x) => [...x, t]);
    setTagInput('');
  };
  const onTagKey = (e) => {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(); }
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
      name: name.trim(), key: key.trim(), description: description.trim(),
      priority, status, owner, environments, tags,
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
          <p>Define a project, pick the observabilities to monitor, and assign members to each.</p>
        </div>

        {loading ? (
          <Spinner label="Loading observabilities…" />
        ) : (
          <form className="xd-card xd-proj-form" onSubmit={onSubmit}>
            <div className="xd-conn-grid">
              <div className="xd-conn-field">
                <label className="xd-conn-label">Project Name<span className="xd-req">*</span></label>
                <input className="xd-conn-input" value={name} placeholder="e.g. Cloud Migration FY26"
                  onChange={(e) => { setName(e.target.value); setError(''); }} />
              </div>
              <div className="xd-conn-field">
                <label className="xd-conn-label">Project Key</label>
                <input className="xd-conn-input" value={key} placeholder="e.g. CMF"
                  onChange={(e) => { setKey(e.target.value.toUpperCase()); setKeyTouched(true); }} />
              </div>

              <div className="xd-conn-field xd-col-span-2">
                <label className="xd-conn-label">Description</label>
                <textarea className="xd-conn-input xd-textarea" rows={3} value={description}
                  placeholder="What is this project about?"
                  onChange={(e) => setDescription(e.target.value)} />
              </div>

              <div className="xd-conn-field">
                <label className="xd-conn-label">Priority</label>
                <select className="xd-conn-input" value={priority} onChange={(e) => setPriority(e.target.value)}>
                  {PRIORITIES.map((p) => <option key={p}>{p}</option>)}
                </select>
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

            {/* Target environments */}
            <h3 className="xd-subhead">Target Environments</h3>
            <div className="xd-chip-select">
              {ENVIRONMENTS.map((env) => {
                const on = environments.includes(env.code);
                return (
                  <button key={env.code} type="button" className={`xd-chip-opt ${on ? 'on' : ''}`}
                    onClick={() => toggleEnv(env.code)}>
                    {on && <FiCheck />} {env.name}
                  </button>
                );
              })}
            </div>

            {/* Tags */}
            <h3 className="xd-subhead">Tags</h3>
            <div className="xd-tag-input-wrap">
              {tags.map((t) => (
                <span className="xd-tag xd-tag-removable" key={t}>
                  {t}<button type="button" onClick={() => setTags((x) => x.filter((y) => y !== t))}><FiX /></button>
                </span>
              ))}
              <input className="xd-tag-input" value={tagInput} placeholder="Add tag + Enter"
                onChange={(e) => setTagInput(e.target.value)} onKeyDown={onTagKey} onBlur={addTag} />
            </div>

            {/* Observability multiselect */}
            <h3 className="xd-subhead">What do you want to observe?</h3>
            <div className="xd-chip-select">
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
