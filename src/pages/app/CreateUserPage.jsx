import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from './_parts';
import { createUser } from '../../api/users';

// Org-level roles (Product tier) for the orgRole select.
const ORG_ROLES = ['SuperAdmin', 'Product_Admin', 'Product_Support'];

export default function CreateUserPage() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    login: '', email: '', password: '', fullName: '', phoneNumber: '',
    orgRole: '', admin: false, twoFactorEnabled: false,
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const set = (k, v) => { setForm((f) => ({ ...f, [k]: v })); setError(''); };

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
      </main>
    </>
  );
}
