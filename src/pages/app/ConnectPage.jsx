import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useOutletContext, useNavigate, useLocation, Link } from 'react-router-dom';
import { FiArrowLeft } from 'react-icons/fi';
import { PageHeader, Spinner } from './_parts';
import { listConnectionParams } from '../../api/observability';
import { createCredential, patchCredential } from '../../api/credentials';

const ENV_NAME = { aws: 'AWS', azure: 'Azure', gcp: 'GCP' };
const isSecretParam = (p) => p.is_secret || p.data_type === 'secret';

/**
 * Connection-parameters page for an op + env. Reached from the env page's
 * "Create Connect" button (create) or the connections table edit icon
 * (edit). On submit it creates / updates a credential.
 */
export default function ConnectPage() {
  const { opCode, envCode } = useParams();
  const { ops } = useOutletContext();
  const op = ops.find((o) => o.code === opCode);

  const location = useLocation();
  const editCred = location.state?.credential || null;
  const editing = !!editCred;

  const [params, setParams] = useState([]);
  const [source, setSource] = useState('api');
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();
  const [form, setForm] = useState({});
  const [reveal, setReveal] = useState({});
  const [connName, setConnName] = useState(editCred?.name || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    setLoading(true);
    listConnectionParams(opCode, envCode).then((p) => {
      if (!alive) return;
      setParams(p.items);
      setSource('api');
      // In edit mode, prefill all fields from the credential. Secrets come
      // back masked ("••••••"); we keep that masked value as-is and only
      // resend a secret if the user actually changes it (see onSubmit).
      setForm(Object.fromEntries(p.items.map((x) => {
        if (editCred) return [x.param_key, editCred.values?.[x.param_key] ?? ''];
        return [x.param_key, x.default_value || ''];
      })));
      setLoading(false);
    }).catch(() => {
      if (!alive) return;
      setParams([]);
      setForm({});
      setLoading(false);
    });
    return () => { alive = false; };
  }, [opCode, envCode, editCred]);

  const envName = ENV_NAME[envCode] || envCode.toUpperCase();
  const opName = op?.name || opCode;
  const envPath = `/dashboard/observability/${opCode}/${envCode}`;

  // Secrets are optional in edit mode (blank keeps the stored value).
  const missingRequired = useMemo(
    () => params.some((p) => {
      if (!p.is_mandatory) return false;
      if (editing && isSecretParam(p)) return false;
      return !String(form[p.param_key] || '').trim();
    }),
    [params, form, editing],
  );

  const setField = (k, v) => { setForm((f) => ({ ...f, [k]: v })); setError(''); };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (missingRequired) return;

    const secretKeys = params.filter(isSecretParam).map((p) => p.param_key);

    setSaving(true);
    setError('');
    try {
      if (editing) {
        // Send non-secret values always; secret values only when the user
        // changed them from the prefilled masked value, so we never
        // overwrite a stored secret with its own mask.
        const values = {};
        params.forEach((p) => {
          const val = String(form[p.param_key] ?? '');
          if (isSecretParam(p)) {
            // Only send a secret when the user typed a new non-empty value
            // (not the prefilled mask, not a cleared-but-untouched field).
            const orig = String(editCred.values?.[p.param_key] ?? '');
            if (val.trim() && val !== orig) values[p.param_key] = val;
          } else {
            values[p.param_key] = val;
          }
        });
        await patchCredential(editCred.id, {
          name: connName.trim() || editCred.name,
          values,
          secret_keys: secretKeys,
        });
      } else {
        const values = {};
        params.forEach((p) => { values[p.param_key] = String(form[p.param_key] ?? ''); });
        await createCredential({
          name: connName.trim() || `${opName} · ${envName}`,
          op_code: opCode,
          env_code: envCode,
          env_id: params[0]?.env_id ?? null,
          values,
          secret_keys: secretKeys,
        });
      }
      // Land on the op page (opened from the side menu) where the
      // credential shows up in the Connections table.
      navigate(`/dashboard/observability/${opCode}`);
    } catch (err) {
      setError(err?.message || (editing ? 'Failed to update connection.' : 'Failed to create connection.'));
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader
        crumbs={[
          { label: 'Observability', to: '/dashboard' },
          { label: opName, to: `/dashboard/observability/${opCode}` },
          { label: envName, to: envPath },
          { label: editing ? 'Edit Connection' : 'Create Connect' },
        ]}
        source={source}
      />
      <main className="xd-main">
        <div className="xd-pagelead">
          <h1>{editing ? 'Edit Connection' : 'Create Connect'} · {opName} · {envName}</h1>
          <p>Provide the parameters needed to connect this environment and start collecting measures.</p>
        </div>

        {loading ? (
          <Spinner label="Loading parameters…" />
        ) : (
          <form className="xd-card xd-conn-form" onSubmit={onSubmit}>
            <div className="xd-conn-grid">
              <div className="xd-conn-field">
                <label className="xd-conn-label">Connection Name</label>
                <input
                  className="xd-conn-input"
                  value={connName}
                  placeholder={`e.g. ${envName} production`}
                  onChange={(e) => setConnName(e.target.value)}
                />
              </div>
              {params.map((p) => {
                const isSecret = p.is_secret || p.data_type === 'secret';
                const type = isSecret && !reveal[p.param_key] ? 'password' : 'text';
                return (
                  <div className="xd-conn-field" key={p.param_key}>
                    <label className="xd-conn-label">
                      {p.label}
                      {p.is_mandatory && <span className="xd-req">*</span>}
                    </label>
                    <div className="xd-conn-input-wrap">
                      <input
                        className="xd-conn-input"
                        type={type}
                        value={form[p.param_key] ?? ''}
                        placeholder={editing && isSecret ? 'Enter new secret to change' : (p.help_text || p.param_key)}
                        pattern={p.validation_regex || undefined}
                        onFocus={() => {
                          // Clear the prefilled masked secret on first focus so the
                          // user can type a fresh value and Show/Hide works on it.
                          if (editing && isSecret && (form[p.param_key] ?? '') === (editCred.values?.[p.param_key] ?? '')) {
                            setField(p.param_key, '');
                          }
                        }}
                        onChange={(e) => setField(p.param_key, e.target.value)}
                      />
                      {isSecret && (
                        <button
                          type="button"
                          className="xd-conn-eye"
                          onClick={() => setReveal((r) => ({ ...r, [p.param_key]: !r[p.param_key] }))}
                        >
                          {reveal[p.param_key] ? 'Hide' : 'Show'}
                        </button>
                      )}
                    </div>
                    {p.help_text && <div className="xd-conn-help">{p.help_text}</div>}
                  </div>
                );
              })}
            </div>

            <div className="xd-conn-actions">
              <Link to={envPath} className="xd-btn-ghost xd-btn-sm xd-conn-back">
                <FiArrowLeft /> Back
              </Link>
              {error && <span className="xd-form-error">{error}</span>}
              <button type="submit" className="xd-btn" disabled={missingRequired || saving}>
                {saving ? 'Saving…' : (editing ? 'Save Changes' : 'Save & Connect')}
              </button>
            </div>
          </form>
        )}
      </main>
    </>
  );
}
