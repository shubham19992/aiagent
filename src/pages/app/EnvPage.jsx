import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useOutletContext } from 'react-router-dom';
import {
  FiDollarSign, FiWifi, FiCpu, FiDatabase, FiShield, FiActivity, FiCheckCircle,
} from 'react-icons/fi';
import { PageHeader, Spinner } from './_parts';
import { listMeasures, listConnectionParams } from '../../api/observability';

const MEASURE_ICON = {
  cost: <FiDollarSign />,
  network: <FiWifi />,
  compute: <FiCpu />,
  storage: <FiDatabase />,
  security: <FiShield />,
};
const ENV_NAME = { aws: 'AWS', azure: 'Azure', gcp: 'GCP' };

/** Env drill-down: measures + connection-parameter form for an op + env. */
export default function EnvPage() {
  const { opCode, envCode } = useParams();
  const { ops } = useOutletContext();
  const op = ops.find((o) => o.code === opCode);

  const [measures, setMeasures] = useState([]);
  const [params, setParams] = useState([]);
  const [source, setSource] = useState('api');
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({});
  const [reveal, setReveal] = useState({});
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setSaved(false);
    Promise.all([
      listMeasures(opCode, envCode),
      listConnectionParams(opCode, envCode),
    ]).then(([m, p]) => {
      if (!alive) return;
      setMeasures(m.items);
      setParams(p.items);
      setSource(m.source === 'dummy' || p.source === 'dummy' ? 'dummy' : 'api');
      setForm(Object.fromEntries(p.items.map((x) => [x.param_key, x.default_value || ''])));
      setLoading(false);
    });
    return () => { alive = false; };
  }, [opCode, envCode]);

  const envName = ENV_NAME[envCode] || envCode.toUpperCase();
  const opName = op?.name || opCode;

  const missingRequired = useMemo(
    () => params.some((p) => p.is_mandatory && !String(form[p.param_key] || '').trim()),
    [params, form],
  );

  const setField = (k, v) => { setForm((f) => ({ ...f, [k]: v })); setSaved(false); };

  const onSubmit = (e) => {
    e.preventDefault();
    if (missingRequired) return;
    // No write endpoint provided — demo: acknowledge locally.
    setSaved(true);
  };

  return (
    <>
      <PageHeader
        crumbs={[
          { label: 'Observability', to: '/dashboard' },
          { label: opName, to: `/dashboard/observability/${opCode}` },
          { label: envName },
        ]}
        source={source}
      />
      <main className="xd-main">
        <div className="xd-pagelead">
          <h1>{opName} · {envName}</h1>
          <p>Measures available for this environment and the parameters needed to connect.</p>
        </div>

        {loading ? (
          <Spinner label="Loading environment…" />
        ) : (
          <>
            {/* Measures */}
            <h3 className="xd-subhead">Measures</h3>
            <div className="xd-measure-grid">
              {measures.map((m) => (
                <div className="xd-measure-card" key={m.code}>
                  <span className="xd-measure-icon">{MEASURE_ICON[m.code] || <FiActivity />}</span>
                  <div>
                    <div className="xd-measure-name">{m.name}</div>
                    <div className="xd-measure-desc">{m.description}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Connection parameters */}
            <h3 className="xd-subhead">Connection Parameters</h3>
            <form className="xd-card xd-conn-form" onSubmit={onSubmit}>
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
                {saved && (
                  <span className="xd-conn-saved"><FiCheckCircle /> Connection saved (demo)</span>
                )}
                <button type="submit" className="xd-btn" disabled={missingRequired}>
                  Save &amp; Connect
                </button>
              </div>
            </form>
          </>
        )}
      </main>
    </>
  );
}
