import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PageHeader, Spinner } from './_parts';
import { getUser, updateUser } from '../../api/users';
import { listRoles } from '../../api/rbac';

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

  const [loading, setLoading] = useState(true);
  // Roles for the Role select — full list loaded from the roles API.
  const [roles, setRoles] = useState([]);

  const [form, setForm] = useState({
    login: '', email: '', fullName: '', phoneNumber: '', orgRole: '',
    // Carried through unchanged — no UI (matches Create form).
    admin: false, twoFactorEnabled: false, status: 'active',
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const set = (k, v) => { setForm((f) => ({ ...f, [k]: v })); setError(''); };

  // Options from the API (value = role code). Include the user's current role
  // even if it's outside the catalog so the prefilled value still shows.
  const roleOptions = (() => {
    const opts = roles.map((r) => ({ value: r.code, label: r.name.replace(/_/g, ' ') }));
    if (form.orgRole && !opts.some((o) => o.value === form.orgRole)) {
      opts.unshift({ value: form.orgRole, label: String(form.orgRole).replace(/_/g, ' ') });
    }
    return opts;
  })();

  useEffect(() => {
    let alive = true;
    listRoles()
      .then((r) => { if (alive) setRoles(r); })
      .catch(() => { if (alive) setRoles([]); });
    return () => { alive = false; };
  }, []);

  // The loaded org_role may be a role *name*; normalise it to the role code
  // so the dropdown matches and the saved payload carries the code.
  useEffect(() => {
    if (!roles.length || !form.orgRole) return;
    if (roles.some((r) => r.code === form.orgRole)) return;
    const byName = roles.find((r) => r.name === form.orgRole);
    if (byName) setForm((f) => ({ ...f, orgRole: byName.code }));
  }, [roles, form.orgRole]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    getUser(userId)
      .then((u) => {
        if (!alive) return;
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
                    <label className="xd-conn-label">Role</label>
                    <select className="xd-conn-input" value={form.orgRole} onChange={(e) => set('orgRole', e.target.value)}>
                      <option value="">— None —</option>
                      {roleOptions.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
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
                <button type="submit" className="xd-btn" disabled={saving}>{saving ? 'Saving…' : 'Save Changes'}</button>
              </div>
            </div>
          </form>
        )}
      </main>
    </>
  );
}
