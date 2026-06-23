import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useOutletContext, useNavigate, Link } from 'react-router-dom';
import { FiArrowLeft } from 'react-icons/fi';
import { PageHeader, Spinner } from './_parts';
import { listConnectionParams } from '../../api/observability';
import { createCredential } from '../../api/credentials';

const ENV_NAME = { aws: 'AWS', azure: 'Azure', gcp: 'GCP' };

/**
 * Connection-parameters page for an op + env. Reached from the env page's
 * "Connect" button. Renders the credential form needed to link the
 * environment; on submit it acknowledges locally (no write endpoint yet).
 */
export default function ConnectPage() {
  const { opCode, envCode } = useParams();
  const { ops } = useOutletContext();
  const op = ops.find((o) => o.code === opCode);

  const [params, setParams] = useState([]);
  const [source, setSource] = useState('api');
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();
  const [form, setForm] = useState({});
  const [reveal, setReveal] = useState({});
  const [connName, setConnName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    setLoading(true);
    listConnectionParams(opCode, envCode).then((p) => {
      if (!alive) return;
      setParams(p.items);
      setSource('api');
      setForm(Object.fromEntries(p.items.map((x) => [x.param_key, x.default_value || ''])));
      setLoading(false);
    }).catch(() => {
      if (!alive) return;
      setParams([]);
      setForm({});
      setLoading(false);
    });
    return () => { alive = false; };
  }, [opCode, envCode]);

  const envName = ENV_NAME[envCode] || envCode.toUpperCase();
  const opName = op?.name || opCode;
  const envPath = `/dashboard/observability/${opCode}/${envCode}`;

  const missingRequired = useMemo(
    () => params.some((p) => p.is_mandatory && !String(form[p.param_key] || '').trim()),
    [params, form],
  );

  const setField = (k, v) => { setForm((f) => ({ ...f, [k]: v })); setError(''); };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (missingRequired) return;

    const values = {};
    const secretKeys = [];
    params.forEach((p) => {
      values[p.param_key] = String(form[p.param_key] ?? '');
      if (p.is_secret || p.data_type === 'secret') secretKeys.push(p.param_key);
    });

    setSaving(true);
    setError('');
    try {
      await createCredential({
        name: connName.trim() || `${opName} · ${envName}`,
        op_code: opCode,
        env_code: envCode,
        env_id: params[0]?.env_id ?? null,
        values,
        secret_keys: secretKeys,
      });
      // Land on the op page (opened from the side menu) where the new
      // credential shows up in the Connections table.
      navigate(`/dashboard/observability/${opCode}`);
    } catch (err) {
      setError(err?.message || 'Failed to create connection.');
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
          { label: 'Create Connect' },
        ]}
        source={source}
      />
      <main className="xd-main">
        <div className="xd-pagelead">
          <h1>Create Connect · {opName} · {envName}</h1>
          <p>Provide the parameters needed to connect this environment and start collecting measures.</p>
        </div>

        {loading ? (
          <Spinner label="Loading parameters…" />
        ) : (
          <form className="xd-card xd-conn-form" onSubmit={onSubmit}>
            <div className="xd-conn-field xd-conn-name">
              <label className="xd-conn-label">Connection Name</label>
              <input
                className="xd-conn-input"
                value={connName}
                placeholder={`e.g. ${envName} production`}
                onChange={(e) => setConnName(e.target.value)}
              />
            </div>
            <div className="xd-conn-grid">
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
                        placeholder={p.help_text || p.param_key}
                        pattern={p.validation_regex || undefined}
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
                {saving ? 'Saving…' : 'Save & Connect'}
              </button>
            </div>
          </form>
        )}
      </main>
    </>
  );
}
