import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useOutletContext, useNavigate, useLocation, Link } from 'react-router-dom';
import { FiArrowLeft } from 'react-icons/fi';
import { PageHeader, Spinner } from './_parts';
import ConnectionsSelect from './_ConnSelect';
import { listConnectionParams } from '../../api/observability';
import { createCredential, patchCredential, getCredential } from '../../api/credentials';
import { listProjects } from '../../api/projects';

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
  const stateCred = location.state?.credential || null;
  const editId = stateCred?.id || location.state?.credentialId || null;
  const editing = !!editId;

  const [params, setParams] = useState([]);
  const [projects, setProjects] = useState([]);
  const [source, setSource] = useState('api');
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();
  const [form, setForm] = useState({});
  const [reveal, setReveal] = useState({});
  // Authoritative credential being edited — starts from nav state, then is
  // refreshed from GET /credentials/{id} so the prefill reflects the backend.
  const [cred, setCred] = useState(stateCred);
  const [connName, setConnName] = useState(stateCred?.name || '');
  const [assocProjects, setAssocProjects] = useState(
    stateCred?.project_ids || (stateCred?.project_id ? [stateCred.project_id] : []),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const toggleAssoc = (id) =>
    setAssocProjects((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));

  useEffect(() => {
    let alive = true;
    setLoading(true);
    Promise.all([
      listConnectionParams(opCode, envCode),
      listProjects().catch(() => []),
      // Fetch the credential fresh by id so edit prefills from the API.
      editId ? getCredential(editId).catch(() => stateCred) : Promise.resolve(null),
    ]).then(([p, projs, fresh]) => {
      if (!alive) return;
      const c = fresh || stateCred;
      setParams(p.items);
      setProjects(Array.isArray(projs) ? projs : []);
      setSource('api');
      if (c) {
        setCred(c);
        setConnName(c.name || '');
        // Associations come back as `projects: [{ project_id, project_name }]`;
        // fall back to a flat project_ids list for older payloads.
        const projIds = Array.isArray(c.projects)
          ? c.projects.map((x) => x.project_id).filter(Boolean)
          : (c.project_ids || (c.project_id ? [c.project_id] : []));
        setAssocProjects(projIds);
      }
      // In edit mode, prefill all fields from the credential. Secrets come
      // back masked ("••••••"); we keep that masked value as-is and only
      // resend a secret if the user actually changes it (see onSubmit).
      setForm(Object.fromEntries(p.items.map((x) => {
        if (c) return [x.param_key, c.values?.[x.param_key] ?? ''];
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
  }, [opCode, envCode, editId]); // eslint-disable-line react-hooks/exhaustive-deps

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
            const orig = String(cred?.values?.[p.param_key] ?? '');
            if (val.trim() && val !== orig) values[p.param_key] = val;
          } else {
            values[p.param_key] = val;
          }
        });
        await patchCredential(cred.id, {
          name: connName.trim() || cred.name,
          values,
          secret_keys: secretKeys,
          project_ids: assocProjects,
        });
        // After updating, return to the op page connections table.
        navigate(`/dashboard/observability/${opCode}`);
      } else {
        const values = {};
        params.forEach((p) => { values[p.param_key] = String(form[p.param_key] ?? ''); });
        const created = await createCredential({
          name: connName.trim() || `${opName} · ${envName}`,
          op_code: opCode,
          env_code: envCode,
          env_id: params[0]?.env_id ?? null,
          values,
          secret_keys: secretKeys,
          ...(assocProjects.length ? { project_ids: assocProjects } : {}),
        });
        // Save & Connect kicks off discovery — show the result screen.
        navigate(`/dashboard/observability/${opCode}/${envCode}/discovery`, { state: { connection: created } });
      }
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
              <div className="xd-conn-field">
                <label className="xd-conn-label">Associate with projects <span className="xd-muted">(optional)</span></label>
                <ConnectionsSelect
                  options={projects}
                  selected={assocProjects}
                  onToggle={toggleAssoc}
                  placeholder="— Select projects —"
                  emptyText="No projects available."
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
                          if (editing && isSecret && (form[p.param_key] ?? '') === (cred?.values?.[p.param_key] ?? '')) {
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
