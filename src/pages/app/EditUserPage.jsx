import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FiCheck, FiChevronDown } from 'react-icons/fi';
import { PageHeader, Spinner } from './_parts';
import { getUser, updateUser } from '../../api/users';
import { listProjects } from '../../api/projects';

// Org-level roles (Product tier) for the orgRole select.
const ORG_ROLES = ['SuperAdmin', 'Product_Admin', 'Product_Support'];

// org_role can be a string, or an array of { role_name } objects.
const roleNames = (u) => {
  const r = u.org_role ?? u.orgRole ?? u.role;
  if (Array.isArray(r)) {
    return r.map((x) => (typeof x === 'string' ? x : x?.role_name)).filter(Boolean);
  }
  return typeof r === 'string' && r.trim() ? [r] : [];
};

export default function EditUserPage() {
  const navigate = useNavigate();
  const { userId } = useParams();

  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({
    login: '', email: '', fullName: '', phoneNumber: '', orgRole: '',
    // Carried through unchanged — no UI (matches Create form).
    admin: false, twoFactorEnabled: false, status: 'active',
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

  // Include the user's current role even if it's outside the standard catalog
  // (e.g. "super_admin"), so the prefilled value shows in the dropdown.
  const roleOptions = form.orgRole && !ORG_ROLES.includes(form.orgRole)
    ? [form.orgRole, ...ORG_ROLES]
    : ORG_ROLES;

  const toggleProject = (id) =>
    setProjectIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));

  useEffect(() => {
    let alive = true;
    setLoading(true);
    Promise.all([getUser(userId), listProjects().catch(() => [])])
      .then(([u, projs]) => {
        if (!alive) return;
        setProjects(Array.isArray(projs) ? projs : []);
        if (u) {
          const status = typeof u.status === 'string'
            ? u.status
            : ((u.active ?? u.is_active) !== false ? 'active' : 'inactive');
          setForm({
            login: u.login || u.username || '',
            email: u.email || '',
            fullName: u.full_name || u.fullName || '',
            phoneNumber: u.phone_number || u.phoneNumber || '',
            orgRole: roleNames(u)[0] || '',
            admin: u.is_admin === true || u.admin === true,
            twoFactorEnabled: (u.two_factor_enabled ?? u.twoFactorEnabled) === true,
            status,
          });
          const ids = u.project_ids ?? u.projectIds ?? (Array.isArray(u.projects) ? u.projects.map((p) => p.id) : []);
          setProjectIds(Array.isArray(ids) ? ids : []);
        }
        setLoading(false);
      })
      .catch((err) => {
        if (!alive) return;
        setError(err?.message || 'Failed to load user.');
        setLoading(false);
      });
    return () => { alive = false; };
  }, [userId]);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!form.email.trim()) return setError('Email is required.');

    setSaving(true);
    setError('');
    try {
      await updateUser(userId, {
        email: form.email.trim(),
        fullName: form.fullName.trim(),
        phoneNumber: form.phoneNumber.trim(),
        orgRole: form.orgRole,
        admin: form.admin,
        twoFactorEnabled: form.twoFactorEnabled,
        status: form.status,
        projectIds,
      });
      navigate('/dashboard/users');
    } catch (err) {
      setError(err?.message || 'Failed to update user.');
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader
        crumbs={[{ label: 'User Management', to: '/dashboard/users' }, { label: 'Edit User' }]}
      />
      <main className="xd-main">
        <div className="xd-pagelead">
          <h1>Edit User</h1>
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
                    <label className="xd-conn-label">Login</label>
                    <input className="xd-conn-input" value={form.login} disabled readOnly />
                  </div>

                  <div className="xd-conn-field">
                    <label className="xd-conn-label">Email<span className="xd-req">*</span></label>
                    <input className="xd-conn-input" type="email" value={form.email}
                      placeholder="user@example.com" onChange={(e) => set('email', e.target.value)} />
                  </div>
                </div>

                <div className="xd-field-row3">
                  <div className="xd-conn-field">
                    <label className="xd-conn-label">Org Role</label>
                    <select className="xd-conn-input" value={form.orgRole} onChange={(e) => set('orgRole', e.target.value)}>
                      <option value="">— None —</option>
                      {roleOptions.map((r) => <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>)}
                    </select>
                  </div>

                  <div className="xd-conn-field">
                    <label className="xd-conn-label">Phone Number</label>
                    <input className="xd-conn-input" value={form.phoneNumber}
                      placeholder="optional" onChange={(e) => set('phoneNumber', e.target.value)} />
                  </div>

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
                <button type="submit" className="xd-btn" disabled={saving}>{saving ? 'Saving…' : 'Save Changes'}</button>
              </div>
            </div>
          </form>
        )}
      </main>
    </>
  );
}
