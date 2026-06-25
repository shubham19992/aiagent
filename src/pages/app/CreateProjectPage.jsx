import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiCheck, FiX, FiImage } from 'react-icons/fi';
import { PageHeader, Spinner } from './_parts';
import { listMenu } from '../../api/observability';
import { createProject } from '../../api/projects';
import { tokenStore } from '../../api/client';

const STATUSES = ['Planning', 'Active', 'On Hold', 'Completed'];

// Short two-letter badge from an op name (AIOps -> "AI").
const opBadge = (name) => name.replace(/Ops$/i, '').slice(0, 2).toUpperCase();

// Deterministic cover gradient from a name (same look as the project cards).
const coverGradient = (seed = '') => {
  let h = 0;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) % 360;
  return `linear-gradient(135deg, hsl(${h} 52% 42%), hsl(${(h + 38) % 360} 54% 28%))`;
};

export default function CreateProjectPage() {
  const navigate = useNavigate();
  const currentUser = sessionStorage.getItem('uidai_user') || 'You';
  const me = tokenStore.getUser() || {};
  const myId = me.id || me.user_id || me.uuid || 'me';

  const [ops, setOps] = useState([]);
  const [source, setSource] = useState('api');
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('Planning');
  const [image, setImage] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selected, setSelected] = useState([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const onPickImage = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';                       // allow re-picking the same file
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setError('Image is too large (max 2 MB).');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => { setImage(String(reader.result)); setError(''); };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    let alive = true;
    listMenu().then((opsRes) => {
      if (!alive) return;
      setOps(opsRes.items); setSource(opsRes.source);
      setLoading(false);
    }).catch(() => {
      if (!alive) return;
      setLoading(false);
    });
    return () => { alive = false; };
  }, []);

  const toggleOp = (code) => {
    setSelected((s) => (s.includes(code) ? s.filter((c) => c !== code) : [...s, code]));
    setError('');
  };

  const selectedOps = selected
    .map((code) => ops.find((o) => o.code === code))
    .filter(Boolean);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return setError('Project name is required.');
    if (!startDate || !endDate) return setError('Start and end date are required.');
    if (endDate < startDate) return setError('End date cannot be before start date.');
    if (selected.length === 0) return setError('Select at least one observability to observe.');

    const chosenOps = selectedOps.map((op) => ({ code: op.code, name: op.name }));

    setSaving(true);
    setError('');
    try {
      // Create the project on the backend, then go assign members.
      // Owner defaults to the creating user (no owner picker in the form).
      const project = await createProject({
        name: name.trim(), description: description.trim(),
        status, owner: currentUser, ownerUserId: myId, image,
        startDate, endDate, observabilities: chosenOps,
      });
      navigate(`/dashboard/projects/${project.id}/assign`);
    } catch (err) {
      setError(err?.message || 'Failed to create project.');
      setSaving(false);
    }
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
            <div className="xd-create-cols xd-create-cols-2">
              {/* ── Column 1: project details ── */}
              <section className="xd-create-col">
                <h3 className="xd-col-title">Project Details</h3>

                <div className="xd-conn-field">
                  <label className="xd-conn-label">Project Name<span className="xd-req">*</span></label>
                  <input className="xd-conn-input" value={name} placeholder="e.g. Cloud Migration FY26"
                    onChange={(e) => { setName(e.target.value); setError(''); }} />
                </div>

                <div className="xd-conn-field">
                  <label className="xd-conn-label">Project Image</label>
                  {image ? (
                    <div className="xd-img-preview" style={{ backgroundImage: `url(${image})` }}>
                      <button type="button" className="xd-img-remove" title="Remove image"
                        onClick={() => setImage('')}><FiX /></button>
                    </div>
                  ) : (
                    <label className="xd-img-drop">
                      <FiImage />
                      <span>Click to upload a cover image</span>
                      <small>PNG/JPG · up to 2 MB</small>
                      <input type="file" accept="image/*" hidden onChange={onPickImage} />
                    </label>
                  )}
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
                <div className="xd-obs-grid">
                  {ops.map((op) => {
                    const on = selected.includes(op.code);
                    return (
                      <button key={op.code} type="button"
                        className={`xd-obs-card ${on ? 'on' : ''}`}
                        onClick={() => toggleOp(op.code)}>
                        <span className="xd-obs-cover" style={{ background: coverGradient(op.name) }}>
                          <span className="xd-obs-mark">{opBadge(op.name)}</span>
                          {on && <span className="xd-obs-check"><FiCheck /></span>}
                        </span>
                        <span className="xd-obs-body">
                          <span className="xd-obs-name">{op.name}</span>
                          <span className="xd-obs-desc">{op.description}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </section>
            </div>
            </div>

            <div className="xd-form-footer">
              {error && <div className="xd-form-error">{error}</div>}
              <div className="xd-conn-actions">
                <button type="button" className="xd-btn-ghost" onClick={() => navigate('/dashboard/projects')} disabled={saving}>Cancel</button>
                <button type="submit" className="xd-btn" disabled={saving}>{saving ? 'Creating…' : 'Create Project'}</button>
              </div>
            </div>
          </form>
        )}
      </main>
    </>
  );
}
