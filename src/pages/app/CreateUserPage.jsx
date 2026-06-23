import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiCheck, FiChevronDown } from 'react-icons/fi';
import { PageHeader, Spinner } from './_parts';
import { createUser } from '../../api/users';
import { listProjects } from '../../api/projects';

// Org-level roles (Product tier) for the orgRole select.
const ORG_ROLES = ['SuperAdmin', 'Product_Admin', 'Product_Support'];

export default function CreateUserPage() {
  const navigate = useNavigate();

  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({
    login: '', email: '', password: '', fullName: '', phoneNumber: '',
    orgRole: '', admin: false, twoFactorEnabled: false,
  });
  const [projectIds, setProjectIds] = useState([]);
  const [projOpen, setProjOpen] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const projRef = useRef(null);

  useEffect(() => {
    const onDoc = (e) => { if (projRef.current && !projRef.current.contains(e.target)) setProjOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const set = (k, v) => { setForm((f) => ({ ...f, [k]: v })); setError(''); };

  const toggleProject = (id) =>
    setProjectIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));

  useEffect(() => {
    let alive = true;
    listProjects().then((items) => {
      if (!alive) return;
      setProjects(items);
      setLoading(false);
    }).catch(() => { if (alive) { setProjects([]); setLoading(false); } });
    return () => { alive = false; };
  }, []);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!form.login.trim()) return setError('Login is required.');
    if (!form.email.trim()) return setError('Email is required.');
    if (form.password.length < 8) return setError('Password must be at least 8 characters.');

    setSaving(true);
    setError('');
    try {
      await createUser({
        login: form.login.trim(),
        email: form.email.trim(),
        password: form.password,
        fullName: form.fullName.trim(),
        phoneNumber: form.phoneNumber.trim(),
        orgRole: form.orgRole,
        admin: form.admin,
        twoFactorEnabled: form.twoFactorEnabled,
        projectIds,
      });
      navigate('/dashboard/users');
    } catch (err) {
      setError(err?.message || 'Failed to create user.');
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader
        crumbs={[{ label: 'User Management', to: '/dashboard/users' }, { label: 'Create User' }]}
      />
      <main className="xd-main">
        <div className="xd-pagelead">
          <h1>Create User</h1>
        </div>

        {loading ? (
          <Spinner label="Loading…" />
        ) : (
          <form className="xd-proj-form xd-card" onSubmit={onSubmit}>
            <div className="xd-form-body">
              <section className="xd-create-col">
                <div className="xd-field-row3">
                  <div className="xd-conn-field">
                    <label className="xd-conn-label">Full Name</label>
                    <input className="xd-conn-input" value={form.fullName}
                      placeholder="e.g. John Doe" onChange={(e) => set('fullName', e.target.value)} />
                  </div>

                  <div className="xd-conn-field">
                    <label className="xd-conn-label">Login<span className="xd-req">*</span></label>
                    <input className="xd-conn-input" value={form.login}
                      placeholder="unique login id" onChange={(e) => set('login', e.target.value)} />
                  </div>

                  <div className="xd-conn-field">
                    <label className="xd-conn-label">Email<span className="xd-req">*</span></label>
                    <input className="xd-conn-input" type="email" value={form.email}
                      placeholder="user@example.com" onChange={(e) => set('email', e.target.value)} />
                  </div>
                </div>

                <div className="xd-field-row3">
                  <div className="xd-conn-field">
                    <label className="xd-conn-label">Password<span className="xd-req">*</span></label>
                    <input className="xd-conn-input" type="password" value={form.password}
                      placeholder="at least 8 characters" onChange={(e) => set('password', e.target.value)} />
                  </div>

                  <div className="xd-conn-field">
                    <label className="xd-conn-label">Org Role</label>
                    <select className="xd-conn-input" value={form.orgRole} onChange={(e) => set('orgRole', e.target.value)}>
                      <option value="">— None —</option>
                      {ORG_ROLES.map((r) => <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>)}
                    </select>
                  </div>

                  <div className="xd-conn-field">
                    <label className="xd-conn-label">Phone Number</label>
                    <input className="xd-conn-input" value={form.phoneNumber}
                      placeholder="optional" onChange={(e) => set('phoneNumber', e.target.value)} />
                  </div>
                </div>

                <div className="xd-field-row3">
                  <div className="xd-conn-field">
                    <label className="xd-conn-label">Projects</label>
                    {projects.length === 0 ? (
                      <div className="xd-muted">No projects available.</div>
                    ) : (
                      <div className="xd-ms" ref={projRef}>
                        <button type="button" className="xd-conn-input xd-ms-toggle"
                          onClick={() => setProjOpen((o) => !o)}>
                          <span className={projectIds.length ? '' : 'xd-ms-ph'}>
                            {projectIds.length ? `${projectIds.length} selected` : '— Select projects —'}
                          </span>
                          <FiChevronDown />
                        </button>
                        {projOpen && (
                          <div className="xd-ms-menu">
                            {projects.map((p) => {
                              const on = projectIds.includes(p.id);
                              return (
                                <label key={p.id} className="xd-ms-opt">
                                  <input type="checkbox" checked={on} onChange={() => toggleProject(p.id)} />
                                  <span>{p.name}</span>
                                  {on && <FiCheck className="xd-ms-tick" />}
                                </label>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </section>
            </div>

            <div className="xd-form-footer">
              {error && <div className="xd-form-error">{error}</div>}
              <div className="xd-conn-actions">
                <button type="button" className="xd-btn-ghost" onClick={() => navigate('/dashboard/users')} disabled={saving}>Cancel</button>
                <button type="submit" className="xd-btn" disabled={saving}>{saving ? 'Creating…' : 'Create User'}</button>
              </div>
            </div>
          </form>
        )}
      </main>
    </>
  );
}
